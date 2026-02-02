import { useState, useEffect, useCallback } from 'react'
import { Volume2, Bookmark, BookmarkCheck } from 'lucide-react'
import type { Word } from '../types'
import { categoryNames, categoryColors } from '../types'
import { useStore } from '../store'

interface FlashCardProps {
  word: Word
  onKnown: () => void
  onUnknown: () => void
}

export function FlashCard({ word, onKnown, onUnknown }: FlashCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const { getProgress, toggleBookmark } = useStore()
  const progress = getProgress(word.id)

  const speak = useCallback(() => {
    // 取消之前的发音
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(word.word)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    speechSynthesis.speak(utterance)
  }, [word.word])

  // 切换单词时自动发音
  useEffect(() => {
    // 短暂延迟确保UI更新后再发音
    const timer = setTimeout(() => {
      speak()
    }, 200)
    return () => clearTimeout(timer)
  }, [word.id, speak])

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleKnown = () => {
    onKnown()
    setIsFlipped(false)
  }

  const handleUnknown = () => {
    onUnknown()
    setIsFlipped(false)
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Card */}
      <div
        className={`flip-card cursor-pointer ${isFlipped ? 'flipped' : ''}`}
        style={{ height: '380px' }}
        onClick={handleFlip}
      >
        <div className="flip-card-inner">
          {/* Front */}
          <div className="flip-card-front card flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: categoryColors[word.category] + '20', color: categoryColors[word.category] }}
              >
                {categoryNames[word.category]}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleBookmark(word.id)
                }}
                className="p-2 -m-2"
              >
                {progress.isBookmarked ? (
                  <BookmarkCheck size={20} className="text-[var(--color-warning)]" />
                ) : (
                  <Bookmark size={20} className="text-[var(--color-text-muted)]" />
                )}
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center text-center">
              <h2 className="text-3xl font-bold mb-2">{word.word}</h2>
              <p className="text-[var(--color-text-muted)] mb-4">{word.pronunciation}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  speak()
                }}
                className="btn btn-secondary"
              >
                <Volume2 size={18} />
                发音
              </button>
            </div>

            <p className="text-center text-sm text-[var(--color-text-muted)]">
              点击卡片查看释义
            </p>
          </div>

          {/* Back */}
          <div className="flip-card-back card flex flex-col overflow-y-auto">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xl font-bold">{word.word}</h3>
                <p className="text-sm text-[var(--color-text-muted)]">{word.partOfSpeech}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  speak()
                }}
                className="p-2"
              >
                <Volume2 size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-3 text-sm">
              <div>
                <p className="text-[var(--color-text-muted)] text-xs mb-1">释义</p>
                <p className="font-medium">{word.definitionCn}</p>
                <p className="text-[var(--color-text-muted)]">{word.definition}</p>
              </div>

              <div>
                <p className="text-[var(--color-text-muted)] text-xs mb-1">例句</p>
                <p className="italic">{word.example}</p>
                <p className="text-[var(--color-text-muted)]">{word.exampleCn}</p>
              </div>

              <div>
                <p className="text-[var(--color-text-muted)] text-xs mb-1">使用场景</p>
                <p className="text-[var(--color-text-muted)]">{word.context}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={handleUnknown}
          className="btn btn-danger flex-1"
        >
          不认识
        </button>
        <button
          onClick={handleKnown}
          className="btn btn-success flex-1"
        >
          认识
        </button>
      </div>
    </div>
  )
}
