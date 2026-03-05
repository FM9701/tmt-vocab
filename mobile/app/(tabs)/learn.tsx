import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { FlashCard } from '../../components/FlashCard'
import { useStore } from '../../store'
import type { Word, UserProgress } from '../../types'
import { colors } from '../../theme/colors'

// Module-level state to persist across navigations
let savedWordId: string | null = null
let savedSeenIds: Set<string> = new Set()
let savedStats = { correct: 0, wrong: 0, fuzzy: 0 }
let savedSwipeCount = 0
let savedNotebookTarget = Math.floor(Math.random() * 11) + 10 // 10-20

function getFilteredWords(mode: string | null): Word[] {
  const state = useStore.getState()
  const words = state.getAllWords()
  if (mode === 'review') {
    const reviewIds = state.getWordsToReview()
    return words.filter((w) => reviewIds.includes(w.id))
  }
  if (mode === 'notebook') {
    const bookmarkedIds = state.getBookmarkedWords()
    return words.filter((w) => bookmarkedIds.includes(w.id))
  }
  return words
}

export default function Learn() {
  const { mode } = useLocalSearchParams<{ mode?: string }>()
  const router = useRouter()

  const updateProgress = useStore((s) => s.updateProgress)
  const recordAnswer = useStore((s) => s.recordAnswer)
  const startSession = useStore((s) => s.startSession)
  const isGenerating = useStore((s) => s.isGenerating)
  const progress = useStore((s) => s.progress)

  const [currentWord, setCurrentWord] = useState<Word | null>(null)
  const [sessionStats, setSessionStats] = useState(savedStats)
  const [isComplete, setIsComplete] = useState(false)
  const [isReviewWord, setIsReviewWord] = useState(false)
  const [cardKey, setCardKey] = useState(0) // for entrance animation

  // Undo state
  const [canUndo, setCanUndo] = useState(false)
  const undoRef = useRef<{
    word: Word
    prevProgress: UserProgress | null
    wasReview: boolean
    stats: typeof savedStats
  } | null>(null)

  const seenWordIds = useRef(savedSeenIds)
  const isInitializing = useRef(false)
  const bgGenerationTriggered = useRef(false)
  const lastShownId = useRef<string | null>(null)
  const swipeCount = useRef(savedSwipeCount)
  const notebookTarget = useRef(savedNotebookTarget)

  const triggerBackgroundGeneration = useCallback(() => {
    if (bgGenerationTriggered.current) return
    bgGenerationTriggered.current = true
    const store = useStore.getState()
    if (store.isGenerating) return
    store.generateMoreWords().catch(() => {})
  }, [])

  const allFiltered = getFilteredWords(mode ?? null)
  const remainingCount = allFiltered.filter((w) => !seenWordIds.current.has(w.id)).length

  const pickNext = useCallback((): { word: Word; isReview: boolean } | null => {
    const allFiltered = getFilteredWords(mode ?? null)

    // In notebook mode, don't mix in notebook words (they're all notebook words)
    if (mode !== 'notebook') {
      // Check if it's time to show a notebook word (every 10-20 swipes)
      swipeCount.current++
      savedSwipeCount = swipeCount.current

      if (swipeCount.current >= notebookTarget.current) {
        const bookmarkedIds = useStore.getState().getBookmarkedWords()
        if (bookmarkedIds.length > 0) {
          const candidates = bookmarkedIds.filter((id) => id !== lastShownId.current)
          const pickFrom = candidates.length > 0 ? candidates : bookmarkedIds
          const randomId = pickFrom[Math.floor(Math.random() * pickFrom.length)]
          const word = allFiltered.find((w) => w.id === randomId)
          if (word) {
            swipeCount.current = 0
            savedSwipeCount = 0
            notebookTarget.current = Math.floor(Math.random() * 11) + 10
            savedNotebookTarget = notebookTarget.current
            return { word, isReview: true }
          }
        }
      }
    }

    // Pick a normal unseen word
    const unseen = allFiltered.filter((w) => !seenWordIds.current.has(w.id))
    if (unseen.length > 0) {
      const word = unseen[Math.floor(Math.random() * unseen.length)]
      seenWordIds.current.add(word.id)
      savedSeenIds = seenWordIds.current

      const seenRatio = seenWordIds.current.size / allFiltered.length
      if (seenRatio > 0.1 && mode !== 'review' && mode !== 'notebook') {
        triggerBackgroundGeneration()
      }

      return { word, isReview: false }
    }

    return null
  }, [mode, triggerBackgroundGeneration])

  const goNext = useCallback(() => {
    const next = pickNext()
    if (next) {
      setCurrentWord(next.word)
      setIsReviewWord(next.isReview)
      setCardKey((k) => k + 1)
      savedWordId = next.word.id
      lastShownId.current = next.word.id
    } else {
      setIsComplete(true)
    }
  }, [pickNext])

  useEffect(() => {
    if (isInitializing.current) return
    isInitializing.current = true

    const allFiltered = getFilteredWords(mode ?? null)

    if (savedWordId) {
      const saved = allFiltered.find((w) => w.id === savedWordId)
      if (saved) {
        setCurrentWord(saved)
        lastShownId.current = saved.id
        setSessionStats(savedStats)
        setIsComplete(false)
        isInitializing.current = false
        return
      }
    }

    seenWordIds.current = new Set()
    savedSeenIds = seenWordIds.current
    swipeCount.current = 0
    savedSwipeCount = 0
    notebookTarget.current = Math.floor(Math.random() * 11) + 10
    savedNotebookTarget = notebookTarget.current
    bgGenerationTriggered.current = false
    const freshStats = { correct: 0, wrong: 0, fuzzy: 0 }
    setSessionStats(freshStats)
    savedStats = freshStats
    setIsComplete(false)
    setCanUndo(false)
    undoRef.current = null
    startSession()

    if (allFiltered.length > 0) {
      const first = allFiltered[Math.floor(Math.random() * allFiltered.length)]
      seenWordIds.current.add(first.id)
      savedSeenIds = seenWordIds.current
      setCurrentWord(first)
      savedWordId = first.id
      lastShownId.current = first.id
    } else {
      setCurrentWord(null)
      savedWordId = null
    }

    isInitializing.current = false
  }, [mode])

  const saveUndoState = () => {
    if (!currentWord) return
    const currentProgress = progress[currentWord.id] || null
    undoRef.current = {
      word: currentWord,
      prevProgress: currentProgress ? { ...currentProgress } : null,
      wasReview: isReviewWord,
      stats: { ...sessionStats },
    }
    setCanUndo(true)
  }

  const handleUndo = () => {
    if (!undoRef.current) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    const { word, prevProgress, wasReview, stats } = undoRef.current

    // Restore progress
    const store = useStore.getState()
    if (prevProgress) {
      store.setProgress({ ...store.progress, [word.id]: prevProgress })
    } else {
      // Word had no progress before, remove it
      const newProgress = { ...store.progress }
      delete newProgress[word.id]
      store.setProgress(newProgress)
    }

    // Restore stats
    setSessionStats(stats)
    savedStats = stats

    // Go back to the word
    setCurrentWord(word)
    setIsReviewWord(wasReview)
    setCardKey((k) => k + 1)
    savedWordId = word.id
    lastShownId.current = word.id

    // Clear undo
    undoRef.current = null
    setCanUndo(false)
  }

  const handleKnown = () => {
    if (!currentWord) return
    saveUndoState()
    updateProgress(currentWord.id, true)
    recordAnswer(true)
    const newStats = { ...sessionStats, correct: sessionStats.correct + 1 }
    setSessionStats(newStats)
    savedStats = newStats
    goNext()
  }

  const handleUnknown = () => {
    if (!currentWord) return
    saveUndoState()
    updateProgress(currentWord.id, false)
    recordAnswer(false)
    const newStats = { ...sessionStats, wrong: sessionStats.wrong + 1 }
    setSessionStats(newStats)
    savedStats = newStats
    goNext()
  }

  const handleFuzzy = () => {
    if (!currentWord) return
    saveUndoState()
    updateProgress(currentWord.id, false) // Same logic as unknown
    recordAnswer(false)
    const newStats = { ...sessionStats, fuzzy: sessionStats.fuzzy + 1 }
    setSessionStats(newStats)
    savedStats = newStats
    goNext()
  }

  const handleRestart = () => {
    seenWordIds.current = new Set()
    savedSeenIds = seenWordIds.current
    swipeCount.current = 0
    savedSwipeCount = 0
    notebookTarget.current = Math.floor(Math.random() * 11) + 10
    savedNotebookTarget = notebookTarget.current
    bgGenerationTriggered.current = false
    lastShownId.current = null
    const freshStats = { correct: 0, wrong: 0, fuzzy: 0 }
    setSessionStats(freshStats)
    savedStats = freshStats
    setIsComplete(false)
    setCanUndo(false)
    undoRef.current = null
    startSession()
    const allFiltered = getFilteredWords(mode ?? null)
    if (allFiltered.length > 0) {
      const first = allFiltered[Math.floor(Math.random() * allFiltered.length)]
      seenWordIds.current.add(first.id)
      savedSeenIds = seenWordIds.current
      setCurrentWord(first)
      savedWordId = first.id
      lastShownId.current = first.id
    }
  }

  const total = sessionStats.correct + sessionStats.wrong + sessionStats.fuzzy

  // No words
  if (!currentWord && !isComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.push('/')}>
            <Ionicons name="arrow-back" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {mode === 'review'
              ? '没有需要复习的单词'
              : mode === 'notebook'
              ? '单词本里还没有单词'
              : '暂无单词'}
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/')}>
            <Text style={styles.primaryBtnText}>返回首页</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // Complete
  if (isComplete) {
    const knownRate = total > 0 ? Math.round((sessionStats.correct / total) * 100) : 0

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.completeContainer}>
          <View style={styles.completeIcon}>
            <Text style={{ fontSize: 36 }}>🎉</Text>
          </View>
          <Text style={styles.completeTitle}>全部学完！</Text>
          <Text style={styles.completeSubtitle}>本次学习了 {total} 个单词</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: colors.success }]}>{sessionStats.correct}</Text>
              <Text style={styles.statLabel}>认识</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: colors.warning }]}>{sessionStats.fuzzy}</Text>
              <Text style={styles.statLabel}>模糊</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: colors.danger }]}>{sessionStats.wrong}</Text>
              <Text style={styles.statLabel}>不认识</Text>
            </View>
          </View>

          <View style={styles.completeActions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleRestart}>
              <Text style={styles.primaryBtnText}>再来一轮</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/')}>
              <Text style={styles.secondaryBtnText}>返回首页</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.push('/')}>
            <Ionicons name="arrow-back" size={22} color={colors.textMuted} />
          </TouchableOpacity>

          <Text style={styles.remainingText}>
            {mode === 'notebook' ? '单词本练习' : mode === 'review' ? '复习模式' : ''}
            {isGenerating ? ' · 加载中...' : ''}
          </Text>

          {canUndo ? (
            <TouchableOpacity onPress={handleUndo} style={styles.undoBtn}>
              <Ionicons name="arrow-undo" size={18} color={colors.primary} />
              <Text style={styles.undoBtnText}>撤销</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        {/* Flash Card with entrance animation */}
        {currentWord && (
          <Animated.View key={cardKey} entering={FadeIn.duration(250)}>
            <FlashCard
              word={currentWord}
              onKnown={handleKnown}
              onUnknown={handleUnknown}
              onFuzzy={handleFuzzy}
              isReviewWord={isReviewWord}
            />
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  remainingText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  undoBtnText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
    marginBottom: 16,
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  completeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34,197,94,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  completeSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  completeActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
})
