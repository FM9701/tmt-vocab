import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import type { Word } from '../types'
import { useStore } from '../store'
import { speak as ttsSpeak, subscribeTTS, getTTSState } from '../lib/tts'
import { colors } from '../theme/colors'

export type QuestionType = 'en-to-cn' | 'cn-to-en' | 'listening'

interface QuizCardProps {
  word: Word
  questionType: QuestionType
  onAnswer: (isCorrect: boolean, selectedAnswer: string, correctAnswer: string) => void
}

interface Option {
  id: string
  text: string
  isCorrect: boolean
}

export function QuizCard({ word, questionType, onAnswer }: QuizCardProps) {
  const { getAllWords } = useStore()
  const [options, setOptions] = useState<Option[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [ttsState, setTtsState] = useState(getTTSState())

  useEffect(() => {
    return subscribeTTS(setTtsState)
  }, [])

  const speakWord = useCallback(() => {
    ttsSpeak(word.word)
  }, [word.word])

  const speakExample = useCallback(() => {
    ttsSpeak(word.example)
  }, [word.example])

  useEffect(() => {
    const allWords = getAllWords()

    // Build wrong options from same category first, then others
    let wrongPool = allWords.filter((w) => w.id !== word.id && w.category === word.category)
    if (wrongPool.length < 3) {
      const morePool = allWords.filter(
        (w) => w.id !== word.id && w.category !== word.category
      )
      wrongPool = [...wrongPool, ...morePool]
    }

    const shuffledWrong = wrongPool.sort(() => Math.random() - 0.5).slice(0, 3)

    const isEnOption = questionType === 'cn-to-en' || questionType === 'listening'

    const wrongOptions: Option[] = shuffledWrong.map((w) => ({
      id: w.id,
      text: isEnOption ? w.word : w.definitionCn,
      isCorrect: false,
    }))

    const correctOption: Option = {
      id: word.id,
      text: isEnOption ? word.word : word.definitionCn,
      isCorrect: true,
    }

    const allOptions = [...wrongOptions, correctOption].sort(() => Math.random() - 0.5)
    setOptions(allOptions)
    setSelectedId(null)
    setShowResult(false)

    // Auto-speak for en-to-cn and listening
    if (questionType === 'en-to-cn' || questionType === 'listening') {
      const timer = setTimeout(speakWord, 200)
      return () => clearTimeout(timer)
    }
  }, [word, questionType, speakWord, getAllWords])

  const handleSelect = (optionId: string) => {
    if (showResult) return

    setSelectedId(optionId)
    setShowResult(true)

    const selected = options.find((o) => o.id === optionId)
    const isCorrect = selected?.isCorrect ?? false
    const correctOption = options.find((o) => o.isCorrect)

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }

    // Dynamic delay: 0.5s for correct, 1.5s for wrong
    const delay = isCorrect ? 500 : 1500

    setTimeout(() => {
      onAnswer(isCorrect, selected?.text ?? '', correctOption?.text ?? '')
    }, delay)
  }

  const getOptionStyle = (option: Option) => {
    if (!showResult) return styles.optionDefault
    if (option.isCorrect) return styles.optionCorrect
    if (option.id === selectedId && !option.isCorrect) return styles.optionWrong
    return styles.optionDimmed
  }

  const isCorrectAnswer = options.find((o) => o.id === selectedId)?.isCorrect

  // Render question based on type
  const renderQuestion = () => {
    switch (questionType) {
      case 'en-to-cn':
        return (
          <View style={styles.questionCard}>
            <Text style={styles.questionLabel}>选择正确的中文释义</Text>
            <Text style={styles.wordText}>{word.word}</Text>
            <Text style={styles.pronunciationText}>{word.pronunciation}</Text>
            <TouchableOpacity style={styles.speakButton} onPress={speakWord}>
              {ttsState === 'loading' ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Ionicons name="volume-medium" size={18} color={colors.text} />
              )}
              <Text style={styles.speakButtonText}>发音</Text>
            </TouchableOpacity>
          </View>
        )

      case 'cn-to-en':
        return (
          <View style={styles.questionCard}>
            <Text style={styles.questionLabel}>选择正确的英文单词</Text>
            <Text style={styles.cnDefinitionText}>{word.definitionCn}</Text>
            <Text style={styles.partOfSpeechText}>{word.partOfSpeech}</Text>
          </View>
        )

      case 'listening':
        return (
          <View style={styles.questionCard}>
            <Text style={styles.questionLabel}>听发音，选择正确的单词</Text>
            <TouchableOpacity style={styles.listenButton} onPress={speakWord}>
              {ttsState === 'loading' ? (
                <ActivityIndicator size={24} color={colors.primary} />
              ) : (
                <Ionicons name="volume-high" size={32} color={colors.primary} />
              )}
            </TouchableOpacity>
            <Text style={styles.listenHint}>点击播放发音</Text>
          </View>
        )
    }
  }

  return (
    <View style={styles.wrapper}>
      {renderQuestion()}

      {/* Options */}
      <View style={styles.options}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.id}
            onPress={() => handleSelect(option.id)}
            disabled={showResult}
            style={[styles.option, getOptionStyle(option)]}
          >
            <Text style={styles.optionText}>{option.text}</Text>
            {showResult && option.isCorrect && (
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            )}
            {showResult && option.id === selectedId && !option.isCorrect && (
              <Ionicons name="close-circle" size={20} color={colors.danger} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Result feedback */}
      {showResult && (
        <View
          style={[
            styles.feedback,
            { backgroundColor: isCorrectAnswer ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' },
          ]}
        >
          <Text style={styles.feedbackTitle}>{isCorrectAnswer ? '正确！' : '错误'}</Text>
          {!isCorrectAnswer && questionType !== 'en-to-cn' && (
            <Text style={styles.feedbackWord}>{word.word} - {word.definitionCn}</Text>
          )}
          <View style={styles.feedbackExample}>
            <Text style={[styles.feedbackText, { flex: 1 }]}>{word.example}</Text>
            <TouchableOpacity onPress={speakExample} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="volume-medium" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  questionLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
  wordText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  pronunciationText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 16,
  },
  cnDefinitionText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  partOfSpeechText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  speakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  speakButtonText: {
    color: colors.text,
    fontSize: 14,
  },
  listenButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(59,130,246,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  listenHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 8,
  },
  options: {
    gap: 10,
  },
  option: {
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionDefault: {
    backgroundColor: colors.surfaceLight,
  },
  optionCorrect: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderWidth: 2,
    borderColor: colors.success,
  },
  optionWrong: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderWidth: 2,
    borderColor: colors.danger,
  },
  optionDimmed: {
    backgroundColor: colors.surfaceLight,
    opacity: 0.5,
  },
  optionText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  feedback: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
  },
  feedbackTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  feedbackWord: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    fontWeight: '500',
  },
  feedbackExample: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  feedbackText: {
    fontSize: 13,
    color: colors.textMuted,
  },
})
