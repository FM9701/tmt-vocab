import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import type { Word } from '../types'
import { categoryNames, categoryColors } from '../types'
import { useStore } from '../store'
import { speak as ttsSpeak, stopSpeaking, subscribeTTS, getTTSState } from '../lib/tts'
import { colors } from '../theme/colors'

interface FlashCardProps {
  word: Word
  onKnown: () => void
  onUnknown: () => void
  onFuzzy: () => void
  isReviewWord?: boolean
}

const SWIPE_THRESHOLD = 120

export function FlashCard({ word, onKnown, onUnknown, onFuzzy, isReviewWord }: FlashCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [ttsState, setTtsState] = useState(getTTSState())
  const { addToNotebook } = useStore()
  const rotation = useSharedValue(0)
  const translateX = useSharedValue(0)
  const cardRotateZ = useSharedValue(0)
  const cardOpacity = useSharedValue(1)

  useEffect(() => {
    return subscribeTTS(setTtsState)
  }, [])

  const speakWord = useCallback(() => {
    ttsSpeak(word.word)
  }, [word.word])

  const speakExample = useCallback(() => {
    ttsSpeak(word.example)
  }, [word.example])

  // Auto-speak on word change
  useEffect(() => {
    const timer = setTimeout(speakWord, 200)
    return () => clearTimeout(timer)
  }, [word.id, speakWord])

  const handleFlip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const newFlipped = !isFlipped
    setIsFlipped(newFlipped)
    rotation.value = withTiming(newFlipped ? 180 : 0, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    })
  }

  const triggerAction = useCallback((action: 'known' | 'unknown' | 'fuzzy') => {
    stopSpeaking()
    if (action === 'known') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onKnown()
    } else if (action === 'unknown') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      addToNotebook(word.id)
      onUnknown()
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      addToNotebook(word.id)
      onFuzzy()
    }
  }, [onKnown, onUnknown, onFuzzy, word.id, addToNotebook])

  const handleKnown = () => triggerAction('known')
  const handleUnknown = () => triggerAction('unknown')
  const handleFuzzy = () => triggerAction('fuzzy')

  // Swipe gesture
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX
      cardRotateZ.value = interpolate(e.translationX, [-200, 0, 200], [-10, 0, 10])
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        // Swipe right = known
        translateX.value = withTiming(400, { duration: 200 })
        cardOpacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(triggerAction)('known')
        })
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        // Swipe left = unknown
        translateX.value = withTiming(-400, { duration: 200 })
        cardOpacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(triggerAction)('unknown')
        })
      } else {
        // Snap back
        translateX.value = withSpring(0, { damping: 15 })
        cardRotateZ.value = withSpring(0, { damping: 15 })
      }
    })

  const swipeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotateZ: `${cardRotateZ.value}deg` },
    ],
    opacity: cardOpacity.value,
  }))

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(rotation.value, [0, 180], [0, 180])}deg` },
    ],
    backfaceVisibility: 'hidden' as const,
  }))

  const backAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(rotation.value, [0, 180], [180, 360])}deg` },
    ],
    backfaceVisibility: 'hidden' as const,
  }))

  // Swipe hint indicators
  const leftHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], 'clamp'),
  }))

  const rightHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp'),
  }))

  const renderSpeakButton = (onPress: () => void, size: number = 18) => (
    <TouchableOpacity onPress={onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      {ttsState === 'loading' ? (
        <ActivityIndicator size="small" color={colors.textMuted} />
      ) : ttsState === 'error' ? (
        <Ionicons name="alert-circle" size={size} color={colors.danger} />
      ) : (
        <Ionicons name="volume-medium" size={size} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  )

  return (
    <View style={styles.wrapper}>
      {/* Swipe hint overlays */}
      <Animated.View style={[styles.swipeHint, styles.swipeHintLeft, leftHintStyle]} pointerEvents="none">
        <Text style={[styles.swipeHintText, { color: colors.danger }]}>不认识</Text>
      </Animated.View>
      <Animated.View style={[styles.swipeHint, styles.swipeHintRight, rightHintStyle]} pointerEvents="none">
        <Text style={[styles.swipeHintText, { color: colors.success }]}>认识</Text>
      </Animated.View>

      {/* Card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={swipeAnimatedStyle}>
          <TouchableOpacity activeOpacity={0.9} onPress={handleFlip} style={styles.cardContainer}>
            {/* Review badge */}
            {isReviewWord && (
              <View style={styles.reviewBadge}>
                <Ionicons name="refresh" size={12} color={colors.warning} />
                <Text style={styles.reviewBadgeText}>复习</Text>
              </View>
            )}

            {/* Front */}
            <Animated.View style={[styles.card, styles.cardFront, frontAnimatedStyle]}>
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.categoryTag,
                    { backgroundColor: categoryColors[word.category] + '33' },
                  ]}
                >
                  <Text style={[styles.categoryTagText, { color: categoryColors[word.category] }]}>
                    {categoryNames[word.category]}
                  </Text>
                </View>
              </View>

              <View style={styles.cardCenter}>
                <Text style={styles.wordText}>{word.word}</Text>
                <Text style={styles.pronunciationText}>{word.pronunciation}</Text>
                <TouchableOpacity style={styles.speakButton} onPress={speakWord}>
                  {ttsState === 'loading' ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : ttsState === 'error' ? (
                    <Ionicons name="alert-circle" size={18} color={colors.danger} />
                  ) : (
                    <Ionicons name="volume-medium" size={18} color={colors.text} />
                  )}
                  <Text style={styles.speakButtonText}>
                    {ttsState === 'loading' ? '加载中' : ttsState === 'error' ? '失败' : '发音'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.flipHint}>点击卡片查看释义 | 左右滑动作答</Text>
            </Animated.View>

            {/* Back */}
            <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.backContent}>
                <View style={styles.backHeader}>
                  <View>
                    <Text style={styles.backWord}>{word.word}</Text>
                    <Text style={styles.backPOS}>{word.partOfSpeech}</Text>
                  </View>
                  {renderSpeakButton(speakWord, 20)}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>释义</Text>
                  <Text style={styles.definitionCn}>{word.definitionCn}</Text>
                  <Text style={styles.definitionEn}>{word.definition}</Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>例句</Text>
                  <View style={styles.exampleRow}>
                    <Text style={[styles.exampleEn, { flex: 1 }]}>{word.example}</Text>
                    {renderSpeakButton(speakExample, 16)}
                  </View>
                  <Text style={styles.exampleCn}>{word.exampleCn}</Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>使用场景</Text>
                  <Text style={styles.contextText}>{word.context}</Text>
                </View>
              </ScrollView>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>

      {/* Action buttons - 3 buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, styles.unknownBtn]} onPress={handleUnknown}>
          <Text style={styles.actionBtnText}>不认识</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.fuzzyBtn]} onPress={handleFuzzy}>
          <Text style={styles.actionBtnText}>模糊</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.knownBtn]} onPress={handleKnown}>
          <Text style={styles.actionBtnText}>认识</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
  },
  swipeHint: {
    position: 'absolute',
    top: 160,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  swipeHintLeft: {
    left: 16,
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  swipeHintRight: {
    right: 16,
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  swipeHintText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(249,115,22,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reviewBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.warning,
  },
  cardContainer: {
    width: '100%',
    height: 380,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  cardFront: {
    justifyContent: 'space-between',
  },
  cardBack: {},
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardCenter: {
    alignItems: 'center',
  },
  wordText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  pronunciationText: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: 16,
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
  flipHint: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.textMuted,
  },
  backContent: {
    paddingBottom: 8,
  },
  backHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  backWord: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  backPOS: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  definitionCn: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  definitionEn: {
    fontSize: 13,
    color: colors.textMuted,
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  exampleEn: {
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.text,
  },
  exampleCn: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  contextText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  unknownBtn: {
    backgroundColor: colors.danger,
  },
  fuzzyBtn: {
    backgroundColor: colors.warning,
  },
  knownBtn: {
    backgroundColor: colors.success,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
})
