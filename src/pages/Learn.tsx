import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Shuffle, Loader2 } from 'lucide-react'
import { FlashCard } from '../components/FlashCard'
import { useStore } from '../store'
import type { Word } from '../types'
import { categoryNames, type Category } from '../types'

const BATCH_SIZE = 10

export function Learn() {
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') // 'review' or null

  const {
    selectedCategory,
    setSelectedCategory,
    updateProgress,
    recordAnswer,
    startSession,
    getWordsToReview,
    getAllWords,
    generateMoreWords,
    isGenerating,
  } = useStore()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentBatch, setCurrentBatch] = useState<Word[]>([])
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 })
  const [isComplete, setIsComplete] = useState(false)
  const [isLoadingBatch, setIsLoadingBatch] = useState(false)

  // Persistent across batches within this session
  const seenWordIds = useRef(new Set<string>())
  const retryQueue = useRef<string[]>([])

  const categories = Object.entries(categoryNames) as [Category, string][]

  const getFilteredWords = useCallback(() => {
    if (mode === 'review') {
      const reviewIds = getWordsToReview()
      return getAllWords().filter(w => reviewIds.includes(w.id))
    }
    return getAllWords().filter(
      w => selectedCategory === 'all' || w.category === selectedCategory
    )
  }, [mode, selectedCategory, getWordsToReview, getAllWords])

  const prepareBatch = useCallback(async () => {
    const allFiltered = getFilteredWords()
    const unseen = allFiltered.filter(w => !seenWordIds.current.has(w.id))

    // If no unseen words and no retry queue, try AI generation
    if (unseen.length === 0 && retryQueue.current.length === 0) {
      if (mode === 'review') {
        // Review mode: no AI generation, just mark complete
        setIsComplete(true)
        return
      }

      setIsLoadingBatch(true)
      try {
        const catParam = selectedCategory === 'all' ? undefined : selectedCategory
        const newWords = await generateMoreWords(catParam as Category | undefined)
        if (newWords.length === 0) {
          setIsComplete(true)
          return
        }
        // After generation, getAllWords() will include new words
        // Recurse to build batch from newly available words
        const freshFiltered = getAllWords().filter(
          w => selectedCategory === 'all' || w.category === selectedCategory
        )
        const freshUnseen = freshFiltered.filter(w => !seenWordIds.current.has(w.id))
        buildBatchFromUnseen(freshUnseen, allFiltered)
      } catch {
        setIsComplete(true)
      } finally {
        setIsLoadingBatch(false)
      }
      return
    }

    buildBatchFromUnseen(unseen, allFiltered)
  }, [getFilteredWords, mode, selectedCategory, generateMoreWords, getAllWords])

  const buildBatchFromUnseen = (unseen: Word[], allFiltered: Word[]) => {
    // Shuffle and take up to BATCH_SIZE new words
    const shuffled = [...unseen].sort(() => Math.random() - 0.5)
    const batch = shuffled.slice(0, BATCH_SIZE)

    // Insert 1-2 retry words at random positions
    const retryCount = Math.min(2, retryQueue.current.length)
    if (retryCount > 0) {
      const retryIds = retryQueue.current.splice(0, retryCount)
      for (const retryId of retryIds) {
        const retryWord = allFiltered.find(w => w.id === retryId)
        if (retryWord) {
          const insertPos = Math.floor(Math.random() * (batch.length + 1))
          batch.splice(insertPos, 0, retryWord)
        }
      }
    }

    // Mark all batch words as seen
    for (const w of batch) {
      seenWordIds.current.add(w.id)
    }

    setCurrentBatch(batch)
    setCurrentIndex(0)
  }

  // Initialize session on mount or when filter changes
  useEffect(() => {
    seenWordIds.current.clear()
    retryQueue.current = []
    setSessionStats({ correct: 0, wrong: 0 })
    setIsComplete(false)
    startSession()
    prepareBatch()
  }, [mode, selectedCategory])

  const shuffleCurrentBatch = () => {
    const shuffled = [...currentBatch].sort(() => Math.random() - 0.5)
    setCurrentBatch(shuffled)
    setCurrentIndex(0)
  }

  const currentWord = currentBatch[currentIndex]
  const progress = currentBatch.length > 0
    ? ((currentIndex + 1) / currentBatch.length) * 100
    : 0

  const handleKnown = () => {
    if (!currentWord) return
    updateProgress(currentWord.id, true)
    recordAnswer(true)
    setSessionStats(s => ({ ...s, correct: s.correct + 1 }))
    goNext()
  }

  const handleUnknown = () => {
    if (!currentWord) return
    updateProgress(currentWord.id, false)
    recordAnswer(false)
    setSessionStats(s => ({ ...s, wrong: s.wrong + 1 }))
    // Push to retry queue for later
    retryQueue.current.push(currentWord.id)
    goNext()
  }

  const goNext = () => {
    if (currentIndex < currentBatch.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Current batch finished, prepare next batch
      prepareBatch()
    }
  }

  const handleRestart = () => {
    seenWordIds.current.clear()
    retryQueue.current = []
    setSessionStats({ correct: 0, wrong: 0 })
    setIsComplete(false)
    startSession()
    prepareBatch()
  }

  // Loading state (AI generating or preparing batch)
  if (isLoadingBatch || (isGenerating && currentBatch.length === 0)) {
    return (
      <div className="px-4 py-6">
        <Link to="/" className="flex items-center gap-2 mb-6 text-[var(--color-text-muted)]">
          <ArrowLeft size={20} />
          返回
        </Link>
        <div className="text-center py-12">
          <Loader2 size={40} className="animate-spin mx-auto mb-4 text-[var(--color-primary)]" />
          <p className="text-[var(--color-text-muted)]">
            AI 正在生成新词汇...
          </p>
        </div>
      </div>
    )
  }

  if (currentBatch.length === 0 && !isComplete) {
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
    const total = sessionStats.correct + sessionStats.wrong
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
      <div className="flex items-center justify-between mb-4">
        <Link to="/" className="flex items-center gap-2 text-[var(--color-text-muted)]">
          <ArrowLeft size={20} />
        </Link>
        <span className="text-sm text-[var(--color-text-muted)]">
          {currentIndex + 1} / {currentBatch.length}
          {isGenerating && ' (生成中...)'}
        </span>
        <button onClick={shuffleCurrentBatch} className="p-2">
          <Shuffle size={20} className="text-[var(--color-text-muted)]" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[var(--color-surface-light)] rounded-full mb-6">
        <div
          className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Category filter (only in normal mode) */}
      {mode !== 'review' && (
        <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 mb-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface-light)]'
            }`}
          >
            全部
          </button>
          {categories.map(([key, name]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${
                selectedCategory === key
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-surface-light)]'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

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
