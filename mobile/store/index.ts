import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import { createMMKV } from 'react-native-mmkv'
import type { Word, UserProgress, StudySession, Category, StudyMode } from '../types'
import { calculateNextReview } from '../lib/spaced-repetition'
import { loadProgressFromCloud, saveProgressToCloud, mergeProgress } from '../lib/sync'
import staticVocabulary from '../data/vocabulary.json'

// MMKV storage adapter for Zustand
const mmkv = createMMKV({ id: 'tmt-vocab-storage' })

const mmkvStorage: StateStorage = {
  getItem: (name: string): string | null => {
    return mmkv.getString(name) ?? null
  },
  setItem: (name: string, value: string): void => {
    mmkv.set(name, value)
  },
  removeItem: (name: string): void => {
    mmkv.remove(name)
  },
}

interface User {
  id: string
  email: string
  name: string
  avatar?: string
}

interface AppState {
  // Auth
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void

  // Sync
  isSyncing: boolean
  lastSyncTime: string | null
  syncWithCloud: () => Promise<void>

  // Generated words (AI)
  generatedWords: Word[]
  addGeneratedWords: (words: Word[]) => void
  isGenerating: boolean
  generateMoreWords: (category?: Category | 'all', count?: number) => Promise<Word[]>
  getAllWords: () => Word[]

  // Study progress
  progress: Record<string, UserProgress>
  setProgress: (progress: Record<string, UserProgress>) => void
  updateProgress: (wordId: string, isCorrect: boolean) => void
  addToNotebook: (wordId: string) => void
  removeFromNotebook: (wordId: string) => void
  getProgress: (wordId: string) => UserProgress
  getBookmarkedWords: () => string[]
  getWordsToReview: () => string[]

  // Study session
  currentSession: StudySession | null
  startSession: () => void
  endSession: () => void
  recordAnswer: (isCorrect: boolean) => void

  // UI state
  selectedCategory: Category | 'all'
  setSelectedCategory: (category: Category | 'all') => void
  studyMode: StudyMode
  setStudyMode: (mode: StudyMode) => void

  // Statistics
  getTotalWordsLearned: () => number
  getTotalWordsMastered: () => number
  getTodayWordsLearned: () => number
  getOverallMastery: () => number
  getStreakDays: () => number
}

const initialProgress = (wordId: string): UserProgress => ({
  wordId,
  mastery: 0,
  correctCount: 0,
  wrongCount: 0,
  lastReviewed: new Date().toISOString(),
  nextReview: new Date().toISOString(),
  isBookmarked: false,
})

// 防抖保存
let saveTimeout: ReturnType<typeof setTimeout> | null = null
const debouncedSave = (userId: string, progress: Record<string, UserProgress>) => {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveProgressToCloud(userId, progress)
  }, 2000)
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),

      // Sync
      isSyncing: false,
      lastSyncTime: null,

      syncWithCloud: async () => {
        const state = get()
        if (!state.user) return

        set({ isSyncing: true })

        try {
          const cloudProgress = await loadProgressFromCloud(state.user.id)

          if (cloudProgress) {
            const merged = mergeProgress(state.progress, cloudProgress)
            set({ progress: merged })
            await saveProgressToCloud(state.user.id, merged)
          } else {
            await saveProgressToCloud(state.user.id, state.progress)
          }

          set({ lastSyncTime: new Date().toISOString() })
        } catch (error) {
          console.error('Sync failed:', error)
        } finally {
          set({ isSyncing: false })
        }
      },

      // Generated words
      generatedWords: [],

      addGeneratedWords: (words) => {
        set((state) => ({
          generatedWords: [...state.generatedWords, ...words],
        }))
      },

      isGenerating: false,

      generateMoreWords: async (category?: Category | 'all', count = 5) => {
        const state = get()
        if (state.isGenerating) return []

        set({ isGenerating: true })

        try {
          const allWords = state.getAllWords()
          const existingWords = allWords.map((w) => w.word)

          const response = await fetch('https://tmt.vocab.app/api/generate-words', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              category: category || 'all',
              count,
              existingWords,
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`API error ${response.status}: ${errorText}`)
          }

          const data = (await response.json()) as { words: Word[] }
          const newWords = data.words || []

          if (newWords.length > 0) {
            get().addGeneratedWords(newWords)
          }

          return newWords
        } catch (error) {
          console.error('Generate words error:', error)
          throw error
        } finally {
          set({ isGenerating: false })
        }
      },

      getAllWords: () => {
        const state = get()
        const staticWords = staticVocabulary as Word[]
        const seen = new Set(staticWords.map((w) => w.word.toLowerCase()))
        const uniqueGenerated = state.generatedWords.filter(
          (w) => !seen.has(w.word.toLowerCase())
        )
        return [...staticWords, ...uniqueGenerated]
      },

      // Progress
      progress: {},

      setProgress: (progress) => set({ progress }),

      updateProgress: (wordId, isCorrect) => {
        const state = get()
        const current = state.progress[wordId] || initialProgress(wordId)

        const streak = isCorrect ? current.correctCount + 1 : 0
        const { nextReview, newMastery } = calculateNextReview(
          current.mastery,
          isCorrect,
          streak
        )

        const updated: UserProgress = {
          ...current,
          mastery: newMastery,
          correctCount: isCorrect ? current.correctCount + 1 : current.correctCount,
          wrongCount: isCorrect ? current.wrongCount : current.wrongCount + 1,
          lastReviewed: new Date().toISOString(),
          nextReview: nextReview.toISOString(),
          isMastered: current.isMastered || isCorrect,
        }

        const newProgress = {
          ...state.progress,
          [wordId]: updated,
        }

        set({ progress: newProgress })

        if (state.user) {
          debouncedSave(state.user.id, newProgress)
        }
      },

      addToNotebook: (wordId) => {
        const state = get()
        const current = state.progress[wordId] || initialProgress(wordId)
        if (current.isBookmarked) return

        const newProgress = {
          ...state.progress,
          [wordId]: { ...current, isBookmarked: true },
        }
        set({ progress: newProgress })
        if (state.user) debouncedSave(state.user.id, newProgress)
      },

      removeFromNotebook: (wordId) => {
        const state = get()
        const current = state.progress[wordId] || initialProgress(wordId)
        if (!current.isBookmarked) return

        const newProgress = {
          ...state.progress,
          [wordId]: { ...current, isBookmarked: false, isMastered: true },
        }
        set({ progress: newProgress })
        if (state.user) debouncedSave(state.user.id, newProgress)
      },

      getProgress: (wordId) => {
        const state = get()
        return state.progress[wordId] || initialProgress(wordId)
      },

      getBookmarkedWords: () => {
        const state = get()
        return Object.keys(state.progress).filter(
          (id) => state.progress[id].isBookmarked
        )
      },

      getWordsToReview: () => {
        const state = get()
        const now = new Date()
        return Object.keys(state.progress).filter((id) => {
          const p = state.progress[id]
          return p.mastery > 0 && new Date(p.nextReview) <= now
        })
      },

      // Session
      currentSession: null,

      startSession: () => {
        set({
          currentSession: {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            wordsStudied: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            duration: 0,
          },
        })
      },

      endSession: () => {
        set({ currentSession: null })
      },

      recordAnswer: (isCorrect) => {
        const state = get()
        if (!state.currentSession) return

        set({
          currentSession: {
            ...state.currentSession,
            wordsStudied: state.currentSession.wordsStudied + 1,
            correctAnswers:
              state.currentSession.correctAnswers + (isCorrect ? 1 : 0),
            wrongAnswers:
              state.currentSession.wrongAnswers + (isCorrect ? 0 : 1),
          },
        })
      },

      // UI
      selectedCategory: 'all',
      setSelectedCategory: (category) => set({ selectedCategory: category }),

      studyMode: 'flashcard',
      setStudyMode: (mode) => set({ studyMode: mode }),

      // Statistics
      getTotalWordsLearned: () => {
        const state = get()
        return Object.values(state.progress).filter(
          (p) => p.correctCount + p.wrongCount > 0
        ).length
      },

      getTotalWordsMastered: () => {
        const state = get()
        return Object.values(state.progress).filter((p) => p.isMastered).length
      },

      getTodayWordsLearned: () => {
        const state = get()
        const today = new Date().toDateString()
        return Object.values(state.progress).filter((p) => {
          const reviewDate = new Date(p.lastReviewed).toDateString()
          return reviewDate === today && p.correctCount + p.wrongCount > 0
        }).length
      },

      getOverallMastery: () => {
        const state = get()
        const learnedProgresses = Object.values(state.progress).filter(
          (p) => p.mastery > 0
        )
        if (learnedProgresses.length === 0) return 0
        const total = learnedProgresses.reduce((sum, p) => sum + p.mastery, 0)
        return Math.round(total / learnedProgresses.length)
      },

      getStreakDays: () => {
        const state = get()
        const progresses = Object.values(state.progress)
        if (progresses.length === 0) return 0

        const dates = [
          ...new Set(
            progresses.map((p) => new Date(p.lastReviewed).toDateString())
          ),
        ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

        let streak = 0
        const today = new Date()

        for (let i = 0; i < dates.length; i++) {
          const expectedDate = new Date(today)
          expectedDate.setDate(today.getDate() - i)

          if (dates[i] === expectedDate.toDateString()) {
            streak++
          } else {
            break
          }
        }

        return streak
      },
    }),
    {
      name: 'tmt-vocab-storage',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        progress: state.progress,
        selectedCategory: state.selectedCategory,
        generatedWords: state.generatedWords,
      }),
    }
  )
)
