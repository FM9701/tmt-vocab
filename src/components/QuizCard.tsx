import { useState, useEffect, useCallback } from 'react'
import { Volume2, Check, X } from 'lucide-react'
import type { Word } from '../types'
import { vocabulary } from '../data/vocabulary'
import { speak as ttsSpeak } from '../lib/tts'

interface QuizCardProps {
  word: Word
  onAnswer: (isCorrect: boolean) => void
}

interface Option {
  id: string
  text: string
  isCorrect: boolean
}

export function QuizCard({ word, onAnswer }: QuizCardProps) {
  const [options, setOptions] = useState<Option[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)

  const speak = useCallback(() => {
    ttsSpeak(word.word)
  }, [word.word])

  const speakExample = useCallback(() => {
    ttsSpeak(word.example)
  }, [word.example])

  useEffect(() => {
    // Generate options
    const wrongOptions = vocabulary
      .filter(w => w.id !== word.id && w.category === word.category)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => ({
        id: w.id,
        text: w.definitionCn,
        isCorrect: false
      }))

    const correctOption = {
      id: word.id,
      text: word.definitionCn,
      isCorrect: true
    }

    const allOptions = [...wrongOptions, correctOption].sort(() => Math.random() - 0.5)
    setOptions(allOptions)
    setSelectedId(null)
    setShowResult(false)

    // 切换单词时自动发音
    const timer = setTimeout(() => {
      speak()
    }, 200)
    return () => clearTimeout(timer)
  }, [word, speak])

  const handleSelect = (optionId: string) => {
    if (showResult) return

    setSelectedId(optionId)
    setShowResult(true)

    const isCorrect = options.find(o => o.id === optionId)?.isCorrect ?? false

    // Delay before moving to next
    setTimeout(() => {
      onAnswer(isCorrect)
    }, 1500)
  }

  const getOptionStyle = (option: Option) => {
    if (!showResult) {
      return 'bg-[var(--color-surface-light)] hover:bg-[#475569]'
    }

    if (option.isCorrect) {
      return 'bg-green-600/30 border-2 border-green-500'
    }

    if (option.id === selectedId && !option.isCorrect) {
      return 'bg-red-600/30 border-2 border-red-500'
    }

    return 'bg-[var(--color-surface-light)] opacity-50'
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Question card */}
      <div className="card mb-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">{word.word}</h2>
          <p className="text-[var(--color-text-muted)] mb-4">{word.pronunciation}</p>
          <button onClick={speak} className="btn btn-secondary">
            <Volume2 size={18} />
            发音
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <p className="text-sm text-[var(--color-text-muted)] mb-2">选择正确的释义：</p>
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            disabled={showResult}
            className={`w-full p-4 rounded-xl text-left transition-all ${getOptionStyle(option)}`}
          >
            <div className="flex items-center justify-between">
              <span>{option.text}</span>
              {showResult && option.isCorrect && (
                <Check className="text-green-500" size={20} />
              )}
              {showResult && option.id === selectedId && !option.isCorrect && (
                <X className="text-red-500" size={20} />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Result feedback */}
      {showResult && (
        <div className="mt-6 animate-fade-in">
          <div className={`p-4 rounded-xl ${
            options.find(o => o.id === selectedId)?.isCorrect
              ? 'bg-green-600/20'
              : 'bg-red-600/20'
          }`}>
            <p className="font-medium mb-2">
              {options.find(o => o.id === selectedId)?.isCorrect ? '正确！' : '错误'}
            </p>
            <div className="flex items-start gap-2">
              <p className="text-sm text-[var(--color-text-muted)] flex-1">{word.example}</p>
              <button
                onClick={speakExample}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-primary-light)] shrink-0"
              >
                <Volume2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
