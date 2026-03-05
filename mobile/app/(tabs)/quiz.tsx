import { useState, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { QuizCard, type QuestionType } from '../../components/QuizCard'
import { useStore } from '../../store'
import type { Word } from '../../types'
import { categoryNames, categoryColors, type Category } from '../../types'
import { speak } from '../../lib/tts'
import { colors } from '../../theme/colors'

interface WrongAnswer {
  word: Word
  questionType: QuestionType
  selectedAnswer: string
  correctAnswer: string
}

const QUESTION_TYPES: QuestionType[] = ['en-to-cn', 'cn-to-en', 'listening']

function pickQuestionType(): QuestionType {
  return QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)]
}

export default function Quiz() {
  const router = useRouter()
  const {
    selectedCategory,
    setSelectedCategory,
    updateProgress,
    recordAnswer,
    startSession,
    getAllWords,
  } = useStore()

  // Quiz states: 'setup' | 'playing' | 'complete'
  const [quizState, setQuizState] = useState<'setup' | 'playing' | 'complete'>('setup')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionWords, setSessionWords] = useState<Word[]>([])
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([])
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 })
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([])

  const categories = Object.entries(categoryNames) as [Category, string][]

  const availableWords = useMemo(() => {
    const allWords = getAllWords()
    return allWords.filter(
      (w) => selectedCategory === 'all' || w.category === selectedCategory
    )
  }, [selectedCategory, getAllWords])

  const startQuiz = () => {
    if (availableWords.length === 0) return
    const shuffled = [...availableWords].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(10, shuffled.length))
    const types = selected.map(() => pickQuestionType())
    setSessionWords(selected)
    setQuestionTypes(types)
    setCurrentIndex(0)
    setSessionStats({ correct: 0, wrong: 0 })
    setWrongAnswers([])
    setQuizState('playing')
    startSession()
  }

  const currentWord = sessionWords[currentIndex]
  const currentQuestionType = questionTypes[currentIndex]
  const progress = sessionWords.length > 0 ? ((currentIndex) / sessionWords.length) * 100 : 0

  const handleAnswer = (isCorrect: boolean, selectedAnswer: string, correctAnswer: string) => {
    if (!currentWord) return

    updateProgress(currentWord.id, isCorrect)
    recordAnswer(isCorrect)

    if (isCorrect) {
      setSessionStats((s) => ({ ...s, correct: s.correct + 1 }))
    } else {
      setSessionStats((s) => ({ ...s, wrong: s.wrong + 1 }))
      setWrongAnswers((prev) => [
        ...prev,
        { word: currentWord, questionType: currentQuestionType, selectedAnswer, correctAnswer },
      ])
    }

    if (currentIndex < sessionWords.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setQuizState('complete')
    }
  }

  // Setup screen
  if (quizState === 'setup') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.setupContent}>
          <View style={styles.setupHeader}>
            <TouchableOpacity onPress={() => router.push('/')}>
              <Ionicons name="arrow-back" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.setupCenter}>
            <View style={styles.setupIcon}>
              <Ionicons name="clipboard" size={40} color={colors.primary} />
            </View>
            <Text style={styles.setupTitle}>挑战测验</Text>
            <Text style={styles.setupSubtitle}>每轮 10 题，混合题型随机出题</Text>
          </View>

          {/* Question types info */}
          <View style={styles.typeInfoRow}>
            <View style={styles.typeInfoItem}>
              <Ionicons name="language" size={18} color={colors.blue} />
              <Text style={styles.typeInfoText}>英译中</Text>
            </View>
            <View style={styles.typeInfoItem}>
              <Ionicons name="swap-horizontal" size={18} color={colors.purple} />
              <Text style={styles.typeInfoText}>中译英</Text>
            </View>
            <View style={styles.typeInfoItem}>
              <Ionicons name="headset" size={18} color={colors.success} />
              <Text style={styles.typeInfoText}>听力</Text>
            </View>
          </View>

          {/* Category selection */}
          <Text style={styles.setupSectionTitle}>选择分类</Text>
          <View style={styles.categoryGrid}>
            <TouchableOpacity
              style={[
                styles.categoryCard,
                selectedCategory === 'all' && styles.categoryCardActive,
              ]}
              onPress={() => setSelectedCategory('all')}
            >
              <Ionicons name="apps" size={20} color={selectedCategory === 'all' ? '#fff' : colors.text} />
              <Text style={[
                styles.categoryCardText,
                selectedCategory === 'all' && styles.categoryCardTextActive,
              ]}>
                全部
              </Text>
              <Text style={[
                styles.categoryCardCount,
                selectedCategory === 'all' && { color: 'rgba(255,255,255,0.7)' },
              ]}>
                {getAllWords().length} 词
              </Text>
            </TouchableOpacity>
            {categories.map(([key, name]) => {
              const count = getAllWords().filter((w) => w.category === key).length
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.categoryCard,
                    selectedCategory === key && [styles.categoryCardActive, { backgroundColor: categoryColors[key] }],
                  ]}
                  onPress={() => setSelectedCategory(key)}
                >
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: selectedCategory === key ? '#fff' : categoryColors[key] },
                    ]}
                  />
                  <Text style={[
                    styles.categoryCardText,
                    selectedCategory === key && styles.categoryCardTextActive,
                  ]}>
                    {name}
                  </Text>
                  <Text style={[
                    styles.categoryCardCount,
                    selectedCategory === key && { color: 'rgba(255,255,255,0.7)' },
                  ]}>
                    {count} 词
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <TouchableOpacity
            style={[styles.startBtn, availableWords.length === 0 && styles.startBtnDisabled]}
            onPress={startQuiz}
            disabled={availableWords.length === 0}
          >
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={styles.startBtnText}>
              开始测验 ({Math.min(10, availableWords.length)} 题)
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Complete screen
  if (quizState === 'complete') {
    const total = sessionStats.correct + sessionStats.wrong
    const accuracy = total > 0 ? Math.round((sessionStats.correct / total) * 100) : 0
    const emoji = accuracy >= 80 ? '🏆' : accuracy >= 60 ? '👍' : '💪'

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.completeContent}>
          <View style={styles.completeTop}>
            <View style={styles.completeIcon}>
              <Text style={{ fontSize: 36 }}>{emoji}</Text>
            </View>
            <Text style={styles.completeTitle}>测验完成！</Text>
            <Text style={styles.completeSubtitle}>正确率 {accuracy}%</Text>

            <View style={styles.resultRow}>
              <View style={styles.resultBox}>
                <Text style={[styles.resultNum, { color: colors.success }]}>
                  {sessionStats.correct}
                </Text>
                <Text style={styles.resultLabel}>正确</Text>
              </View>
              <View style={styles.resultBox}>
                <Text style={[styles.resultNum, { color: colors.danger }]}>
                  {sessionStats.wrong}
                </Text>
                <Text style={styles.resultLabel}>错误</Text>
              </View>
            </View>
          </View>

          {/* Wrong answers review */}
          {wrongAnswers.length > 0 && (
            <View style={styles.wrongSection}>
              <Text style={styles.wrongSectionTitle}>错题回顾</Text>
              {wrongAnswers.map((item, index) => (
                <View key={index} style={styles.wrongCard}>
                  <View style={styles.wrongCardHeader}>
                    <Text style={styles.wrongWordText}>{item.word.word}</Text>
                    <TouchableOpacity onPress={() => speak(item.word.word)}>
                      <Ionicons name="volume-medium" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.wrongDefinition}>{item.word.definitionCn}</Text>
                  <View style={styles.wrongAnswerRow}>
                    <View style={styles.wrongAnswerItem}>
                      <Ionicons name="close-circle" size={14} color={colors.danger} />
                      <Text style={styles.wrongAnswerText}>你的答案: {item.selectedAnswer}</Text>
                    </View>
                    <View style={styles.wrongAnswerItem}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={styles.wrongAnswerText}>正确答案: {item.correctAnswer}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.completeActions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => { setQuizState('setup') }}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>再测一次</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/')}>
              <Text style={styles.secondaryBtnText}>返回首页</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Playing screen
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.playContent}>
        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setQuizState('setup')}>
            <Ionicons name="arrow-back" size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {sessionWords.length}
          </Text>
          <View style={styles.scoreRow}>
            <Text style={{ color: colors.success, fontSize: 14 }}>{sessionStats.correct}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>/</Text>
            <Text style={{ color: colors.danger, fontSize: 14 }}>{sessionStats.wrong}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        {/* Quiz Card */}
        {currentWord && (
          <QuizCard
            key={`${currentWord.id}-${currentIndex}`}
            word={currentWord}
            questionType={currentQuestionType}
            onAnswer={handleAnswer}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Setup styles
  setupContent: {
    padding: 16,
    paddingBottom: 32,
  },
  setupHeader: {
    marginBottom: 16,
  },
  setupCenter: {
    alignItems: 'center',
    marginBottom: 24,
  },
  setupIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(59,130,246,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  setupSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  typeInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 24,
  },
  typeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeInfoText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  setupSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  categoryCardActive: {
    backgroundColor: colors.primary,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  categoryCardTextActive: {
    color: '#fff',
  },
  categoryCardCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  startBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startBtnDisabled: {
    opacity: 0.5,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },

  // Playing styles
  playContent: {
    padding: 16,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 4,
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.surfaceLight,
    borderRadius: 2,
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  // Complete styles
  completeContent: {
    padding: 16,
    paddingBottom: 32,
  },
  completeTop: {
    alignItems: 'center',
    paddingTop: 40,
    marginBottom: 24,
  },
  completeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59,130,246,0.2)',
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
  resultRow: {
    flexDirection: 'row',
    gap: 16,
  },
  resultBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  resultNum: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  resultLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Wrong answers section
  wrongSection: {
    marginBottom: 24,
  },
  wrongSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  wrongCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  wrongCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  wrongWordText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  wrongDefinition: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 10,
  },
  wrongAnswerRow: {
    gap: 6,
  },
  wrongAnswerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wrongAnswerText: {
    fontSize: 12,
    color: colors.textMuted,
  },

  completeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
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
