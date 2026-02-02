import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProgress, StudySession, Category, StudyMode } from '../types'
import { vocabulary } from '../data/vocabulary'
import { calculateNextReview } from '../lib/spaced-repetition'
import { loadProgressFromCloud, saveProgressToCloud, mergeProgress } from '../lib/sync'

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

  // Study progress
  progress: Record<string, UserProgress>
  setProgress: (progress: Record<string, UserProgress>) => void
  updateProgress: (wordId: string, isCorrect: boolean) => void
  toggleBookmark: (wordId: string) => void
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
  isBookmarked: false
})

// 防抖保存
let saveTimeout: ReturnType<typeof setTimeout> | null = null
const debouncedSave = (userId: string, progress: Record<string, UserProgress>) => {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveProgressToCloud(userId, progress)
  }, 2000) // 2秒后保存，避免频繁请求
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
            // 合并本地和云端数据
            const merged = mergeProgress(state.progress, cloudProgress)
            set({ progress: merged })
            // 保存合并后的数据到云端
            await saveProgressToCloud(state.user.id, merged)
          } else {
            // 云端没有数据，上传本地数据
            await saveProgressToCloud(state.user.id, state.progress)
          }

          set({ lastSyncTime: new Date().toISOString() })
        } catch (error) {
          console.error('Sync failed:', error)
        } finally {
          set({ isSyncing: false })
        }
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
          nextReview: nextReview.toISOString()
        }

        const newProgress = {
          ...state.progress,
          [wordId]: updated
        }

        set({ progress: newProgress })

        // 如果已登录，自动同步到云端
        if (state.user) {
          debouncedSave(state.user.id, newProgress)
        }
      },

      toggleBookmark: (wordId) => {
        const state = get()
        const current = state.progress[wordId] || initialProgress(wordId)

        const newProgress = {
          ...state.progress,
          [wordId]: {
            ...current,
            isBookmarked: !current.isBookmarked
          }
        }

        set({ progress: newProgress })

        // 如果已登录，自动同步到云端
        if (state.user) {
          debouncedSave(state.user.id, newProgress)
        }
      },

      getProgress: (wordId) => {
        const state = get()
        return state.progress[wordId] || initialProgress(wordId)
      },

      getBookmarkedWords: () => {
        const state = get()
        return Object.keys(state.progress).filter(
          id => state.progress[id].isBookmarked
        )
      },

      getWordsToReview: () => {
        const state = get()
        const now = new Date()
        return Object.keys(state.progress).filter(id => {
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
            duration: 0
          }
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
            correctAnswers: state.currentSession.correctAnswers + (isCorrect ? 1 : 0),
            wrongAnswers: state.currentSession.wrongAnswers + (isCorrect ? 0 : 1)
          }
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
        return Object.values(state.progress).filter(p => p.mastery > 0).length
      },

      getTodayWordsLearned: () => {
        const state = get()
        const today = new Date().toDateString()
        return Object.values(state.progress).filter(p => {
          const reviewDate = new Date(p.lastReviewed).toDateString()
          return reviewDate === today && p.mastery > 0
        }).length
      },

      getOverallMastery: () => {
        const state = get()
        const progresses = Object.values(state.progress)
        if (progresses.length === 0) return 0
        const total = progresses.reduce((sum, p) => sum + p.mastery, 0)
        return Math.round(total / vocabulary.length)
      },

      getStreakDays: () => {
        // 简化实现：检查连续学习天数
        const state = get()
        const progresses = Object.values(state.progress)
        if (progresses.length === 0) return 0

        const dates = [...new Set(
          progresses.map(p => new Date(p.lastReviewed).toDateString())
        )].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

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
      }
    }),
    {
      name: 'tmt-vocab-storage',
      partialize: (state) => ({
        progress: state.progress,
        selectedCategory: state.selectedCategory
      })
    }
  )
)
