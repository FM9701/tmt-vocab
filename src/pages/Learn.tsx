import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Shuffle } from 'lucide-react'
import { FlashCard } from '../components/FlashCard'
import { useStore } from '../store'
import { vocabulary } from '../data/vocabulary'
import type { Word } from '../types'
import { categoryNames, type Category } from '../types'

export function Learn() {
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') // 'review' or null

  const {
    selectedCategory,
    setSelectedCategory,
    updateProgress,
    recordAnswer,
    startSession,
    getWordsToReview
  } = useStore()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionWords, setSessionWords] = useState<Word[]>([])
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 })
  const [isComplete, setIsComplete] = useState(false)

  const categories = Object.entries(categoryNames) as [Category, string][]

  // Get words based on mode
  const availableWords = useMemo(() => {
    if (mode === 'review') {
      const reviewIds = getWordsToReview()
      return vocabulary.filter(w => reviewIds.includes(w.id))
    }

    return vocabulary.filter(
      w => selectedCategory === 'all' || w.category === selectedCategory
    )
  }, [mode, selectedCategory, getWordsToReview])

  // Initialize session
  useEffect(() => {
    shuffleAndStart()
  }, [availableWords])

  const shuffleAndStart = () => {
    const shuffled = [...availableWords].sort(() => Math.random() - 0.5)
    setSessionWords(shuffled)
    setCurrentIndex(0)
    setSessionStats({ correct: 0, wrong: 0 })
    setIsComplete(false)
    startSession()
  }

  const currentWord = sessionWords[currentIndex]
  const progress = currentIndex / sessionWords.length * 100

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
    goNext()
  }

  const goNext = () => {
    if (currentIndex < sessionWords.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setIsComplete(true)
    }
  }

  if (sessionWords.length === 0) {
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
          <h2 className="text-2xl font-bold mb-2">学习完成！</h2>
          <p className="text-[var(--color-text-muted)] mb-6">
            本轮学习了 {total} 个单词
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
            <button onClick={shuffleAndStart} className="btn btn-primary flex-1">
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
          {currentIndex + 1} / {sessionWords.length}
        </span>
        <button onClick={shuffleAndStart} className="p-2">
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
