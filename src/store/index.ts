import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProgress, StudySession, Category, StudyMode } from '../types'
import { vocabulary } from '../data/vocabulary'
import { calculateNextReview } from '../lib/spaced-repetition'

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

  // Study progress
  progress: Record<string, UserProgress>
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

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),

      // Progress
      progress: {},

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

        set({
          progress: {
            ...state.progress,
            [wordId]: updated
          }
        })
      },

      toggleBookmark: (wordId) => {
        const state = get()
        const current = state.progress[wordId] || initialProgress(wordId)

        set({
          progress: {
            ...state.progress,
            [wordId]: {
              ...current,
              isBookmarked: !current.isBookmarked
            }
          }
        })
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
