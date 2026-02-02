import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { QuizCard } from '../components/QuizCard'
import { useStore } from '../store'
import { vocabulary } from '../data/vocabulary'
import type { Word } from '../types'
import { categoryNames, type Category } from '../types'

export function Quiz() {
  const {
    selectedCategory,
    setSelectedCategory,
    updateProgress,
    recordAnswer,
    startSession
  } = useStore()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionWords, setSessionWords] = useState<Word[]>([])
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 })
  const [isComplete, setIsComplete] = useState(false)

  const categories = Object.entries(categoryNames) as [Category, string][]

  const availableWords = useMemo(() => {
    return vocabulary.filter(
      w => selectedCategory === 'all' || w.category === selectedCategory
    )
  }, [selectedCategory])

  useEffect(() => {
    startQuiz()
  }, [availableWords])

  const startQuiz = () => {
    // Select 10 random words for quiz
    const shuffled = [...availableWords].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(10, shuffled.length))
    setSessionWords(selected)
    setCurrentIndex(0)
    setSessionStats({ correct: 0, wrong: 0 })
    setIsComplete(false)
    startSession()
  }

  const currentWord = sessionWords[currentIndex]
  const progress = currentIndex / sessionWords.length * 100

  const handleAnswer = (isCorrect: boolean) => {
    if (!currentWord) return

    updateProgress(currentWord.id, isCorrect)
    recordAnswer(isCorrect)

    if (isCorrect) {
      setSessionStats(s => ({ ...s, correct: s.correct + 1 }))
    } else {
      setSessionStats(s => ({ ...s, wrong: s.wrong + 1 }))
    }

    // Move to next after delay (handled in QuizCard)
    setTimeout(() => {
      if (currentIndex < sessionWords.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        setIsComplete(true)
      }
    }, 100)
  }

  if (sessionWords.length === 0) {
    return (
      <div className="px-4 py-6">
        <Link to="/" className="flex items-center gap-2 mb-6 text-[var(--color-text-muted)]">
          <ArrowLeft size={20} />
          返回
        </Link>
        <div className="text-center py-12">
          <p className="text-[var(--color-text-muted)]">该分类暂无单词</p>
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
    const emoji = accuracy >= 80 ? '🏆' : accuracy >= 60 ? '👍' : '💪'

    return (
      <div className="px-4 py-6">
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">{emoji}</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">测验完成！</h2>
          <p className="text-[var(--color-text-muted)] mb-6">
            正确率 {accuracy}%
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="card text-center">
              <p className="text-3xl font-bold text-green-500">{sessionStats.correct}</p>
              <p className="text-sm text-[var(--color-text-muted)]">正确</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-red-500">{sessionStats.wrong}</p>
              <p className="text-sm text-[var(--color-text-muted)]">错误</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={startQuiz} className="btn btn-primary flex-1">
              <RotateCcw size={18} />
              再测一次
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
        <div className="flex gap-2 text-sm">
          <span className="text-green-500">{sessionStats.correct}</span>
          <span>/</span>
          <span className="text-red-500">{sessionStats.wrong}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[var(--color-surface-light)] rounded-full mb-6">
        <div
          className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Category filter */}
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

      {/* Quiz Card */}
      {currentWord && (
        <QuizCard
          key={currentWord.id}
          word={currentWord}
          onAnswer={handleAnswer}
        />
      )}
    </div>
  )
}
