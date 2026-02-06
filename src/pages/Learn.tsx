import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { FlashCard } from '../components/FlashCard'
import { useStore } from '../store'
import type { Word } from '../types'

// Module-level state to persist current word across navigations
let savedWordId: string | null = null
let savedSeenIds: Set<string> = new Set()
let savedRetryQueue: string[] = []
let savedStats = { correct: 0, wrong: 0 }

function getFilteredWords(mode: string | null): Word[] {
  const words = useStore.getState().getAllWords()
  if (mode === 'review') {
    const reviewIds = useStore.getState().getWordsToReview()
    return words.filter(w => reviewIds.includes(w.id))
  }
  return words
}

export function Learn() {
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode')

  const updateProgress = useStore(s => s.updateProgress)
  const recordAnswer = useStore(s => s.recordAnswer)
  const startSession = useStore(s => s.startSession)
  const isGenerating = useStore(s => s.isGenerating)

  const [currentWord, setCurrentWord] = useState<Word | null>(null)
  const [sessionStats, setSessionStats] = useState(savedStats)
  const [isComplete, setIsComplete] = useState(false)

  const seenWordIds = useRef(savedSeenIds)
  const retryQueue = useRef(savedRetryQueue)
  const isInitializing = useRef(false)
  const bgGenerationTriggered = useRef(false)

  // Background AI generation
  const triggerBackgroundGeneration = useCallback(() => {
    if (bgGenerationTriggered.current) return
    bgGenerationTriggered.current = true
    const store = useStore.getState()
    if (store.isGenerating) return
    store.generateMoreWords().catch(() => {})
  }, [])

  const pickNext = useCallback((): Word | null => {
    const allFiltered = getFilteredWords(mode)

    // 30% chance to retry a missed word
    if (retryQueue.current.length > 0 && Math.random() < 0.3) {
      const retryId = retryQueue.current.shift()!
      const word = allFiltered.find(w => w.id === retryId)
      if (word) return word
    }

    // Pick an unseen word
    const unseen = allFiltered.filter(w => !seenWordIds.current.has(w.id))
    if (unseen.length > 0) {
      const word = unseen[Math.floor(Math.random() * unseen.length)]
      seenWordIds.current.add(word.id)
      savedSeenIds = seenWordIds.current

      // Trigger background generation early (10%)
      const seenRatio = seenWordIds.current.size / allFiltered.length
      if (seenRatio > 0.1 && mode !== 'review') {
        triggerBackgroundGeneration()
      }

      return word
    }

    // Drain remaining retry queue
    if (retryQueue.current.length > 0) {
      const retryId = retryQueue.current.shift()!
      const word = allFiltered.find(w => w.id === retryId)
      if (word) return word
    }

    return null
  }, [mode, triggerBackgroundGeneration])

  const goNext = useCallback(() => {
    const next = pickNext()
    if (next) {
      setCurrentWord(next)
      savedWordId = next.id
    } else {
      setIsComplete(true)
    }
  }, [pickNext])

  // Initialize session - restore saved word or pick new one
  useEffect(() => {
    if (isInitializing.current) return
    isInitializing.current = true

    const allFiltered = getFilteredWords(mode)

    // Try to restore saved word
    if (savedWordId) {
      const saved = allFiltered.find(w => w.id === savedWordId)
      if (saved) {
        setCurrentWord(saved)
        setSessionStats(savedStats)
        setIsComplete(false)
        isInitializing.current = false
        return
      }
    }

    // No saved word - start fresh
    seenWordIds.current = new Set()
    savedSeenIds = seenWordIds.current
    retryQueue.current = []
    savedRetryQueue = retryQueue.current
    bgGenerationTriggered.current = false
    const freshStats = { correct: 0, wrong: 0 }
    setSessionStats(freshStats)
    savedStats = freshStats
    setIsComplete(false)
    startSession()

    if (allFiltered.length > 0) {
      const first = allFiltered[Math.floor(Math.random() * allFiltered.length)]
      seenWordIds.current.add(first.id)
      savedSeenIds = seenWordIds.current
      setCurrentWord(first)
      savedWordId = first.id
    } else {
      setCurrentWord(null)
      savedWordId = null
    }

    isInitializing.current = false
  }, [mode])

  const handleKnown = () => {
    if (!currentWord) return
    updateProgress(currentWord.id, true)
    recordAnswer(true)
    const newStats = { ...sessionStats, correct: sessionStats.correct + 1 }
    setSessionStats(newStats)
    savedStats = newStats
    savedRetryQueue = retryQueue.current
    goNext()
  }

  const handleUnknown = () => {
    if (!currentWord) return
    updateProgress(currentWord.id, false)
    recordAnswer(false)
    const newStats = { ...sessionStats, wrong: sessionStats.wrong + 1 }
    setSessionStats(newStats)
    savedStats = newStats
    retryQueue.current.push(currentWord.id)
    savedRetryQueue = retryQueue.current
    goNext()
  }

  const handleRestart = () => {
    seenWordIds.current = new Set()
    savedSeenIds = seenWordIds.current
    retryQueue.current = []
    savedRetryQueue = []
    bgGenerationTriggered.current = false
    const freshStats = { correct: 0, wrong: 0 }
    setSessionStats(freshStats)
    savedStats = freshStats
    setIsComplete(false)
    startSession()
    const allFiltered = getFilteredWords(mode)
    if (allFiltered.length > 0) {
      const first = allFiltered[Math.floor(Math.random() * allFiltered.length)]
      seenWordIds.current.add(first.id)
      savedSeenIds = seenWordIds.current
      setCurrentWord(first)
      savedWordId = first.id
    }
  }

  const total = sessionStats.correct + sessionStats.wrong

  // No words available
  if (!currentWord && !isComplete) {
    return (
      <div className="px-4 py-6">
        <Link to="/" className="flex items-center gap-2 mb-6 text-[var(--color-text-muted)]">
          <ArrowLeft size={20} />
          返回
        </Link>
        <div className="text-center py-12">
          <p className="text-[var(--color-text-muted)]">
            {mode === 'review' ? '没有需要复习的单词' : '该分类暂无单词'}
          </p>
          <Link to="/" className="btn btn-primary mt-4">
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  if (isComplete) {
    const accuracy = total > 0 ? Math.round(sessionStats.correct / total * 100) : 0

    return (
      <div className="px-4 py-6">
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎉</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">全部学完！</h2>
          <p className="text-[var(--color-text-muted)] mb-6">
            本次学习了 {total} 个单词
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="card text-center">
              <p className="text-2xl font-bold text-green-500">{sessionStats.correct}</p>
              <p className="text-xs text-[var(--color-text-muted)]">认识</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-red-500">{sessionStats.wrong}</p>
              <p className="text-xs text-[var(--color-text-muted)]">不认识</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-blue-500">{accuracy}%</p>
              <p className="text-xs text-[var(--color-text-muted)]">正确率</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={handleRestart} className="btn btn-primary flex-1">
              再来一轮
            </button>
            <Link to="/" className="btn btn-secondary flex-1">
              返回首页
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/" className="flex items-center gap-2 text-[var(--color-text-muted)]">
          <ArrowLeft size={20} />
        </Link>
        <span className="text-sm text-[var(--color-text-muted)]">
          已学 {total} 个
          {isGenerating && ' · 加载新词中...'}
        </span>
      </div>

      {/* Flash Card */}
      {currentWord && (
        <FlashCard
          key={currentWord.id}
          word={currentWord}
          onKnown={handleKnown}
          onUnknown={handleUnknown}
        />
      )}
    </div>
  )
}
