import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useStore } from '../../store'
import { categoryNames, categoryColors } from '../../types'
import { speak } from '../../lib/tts'
import { colors } from '../../theme/colors'

export default function Home() {
  const router = useRouter()
  const {
    user,
    getTotalWordsLearned,
    getTotalWordsMastered,
    getTodayWordsLearned,
    getWordsToReview,
    getBookmarkedWords,
    getAllWords,
    progress,
  } = useStore()

  const [showMastered, setShowMastered] = useState(false)

  const wordsLearned = getTotalWordsLearned()
  const masteredCount = getTotalWordsMastered()
  const todayLearned = getTodayWordsLearned()
  const reviewCount = getWordsToReview().length
  const bookmarkCount = getBookmarkedWords().length

  const allWords = getAllWords()
  const masteredWords = allWords.filter((w) => progress[w.id]?.isMastered)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>TMT Vocab</Text>
          <Text style={styles.subtitle}>
            {user
              ? `欢迎回来, ${user.name?.split(' ')[0] || '学习者'}`
              : 'TMT 行业英语词汇学习'}
          </Text>
          <Text style={styles.todayText}>今日已学习 {todayLearned} 个单词</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(59,130,246,0.2)' }]}>
              <Ionicons name="flag" size={20} color={colors.blue} />
            </View>
            <View>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{wordsLearned}</Text>
              <Text style={styles.statLabel}>已学习</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.statCard} onPress={() => setShowMastered(true)}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(34,197,94,0.2)' }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            </View>
            <View>
              <Text style={[styles.statNumber, { color: colors.success }]}>{masteredCount}</Text>
              <Text style={styles.statLabel}>已学会</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Review Reminder */}
        {reviewCount > 0 && (
          <TouchableOpacity
            style={styles.reviewBanner}
            onPress={() => router.push('/learn?mode=review')}
          >
            <View style={styles.reviewLeft}>
              <Text style={styles.reviewEmoji}>📖</Text>
              <View>
                <Text style={styles.reviewTitle}>有单词等待复习！</Text>
                <Text style={styles.reviewSubtitle}>{reviewCount} 个单词等待复习</Text>
              </View>
            </View>
            <Text style={styles.reviewAction}>去复习 →</Text>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/learn')}>
            <Ionicons name="book" size={24} color={colors.blue} />
            <Text style={styles.actionLabel}>闪卡学习</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/quiz')}>
            <Ionicons name="clipboard" size={24} color={colors.purple} />
            <Text style={styles.actionLabel}>挑战测验</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/notebook')}>
            <View>
              <Ionicons name="bookmark" size={24} color={colors.warning} />
              {bookmarkCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{bookmarkCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.actionLabel}>单词本</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.motto}>坚持学习，每天进步一点点</Text>
      </ScrollView>

      {/* Mastered Words Modal */}
      <Modal visible={showMastered} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setShowMastered(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>已学会的词 ({masteredCount})</Text>
              <TouchableOpacity onPress={() => setShowMastered(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {masteredWords.length === 0 ? (
              <Text style={styles.emptyText}>还没有学会的词，继续加油！</Text>
            ) : (
              <FlatList
                data={masteredWords}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.masteredItem}>
                    <TouchableOpacity
                      onPress={() => speak(item.word)}
                      style={styles.speakBtn}
                    >
                      <Ionicons name="volume-medium" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                    <View style={styles.masteredInfo}>
                      <Text style={styles.masteredWord}>{item.word}</Text>
                      <Text style={styles.masteredDef}>{item.definitionCn}</Text>
                    </View>
                    <View
                      style={[
                        styles.categoryTag,
                        { backgroundColor: categoryColors[item.category] + '33' },
                      ]}
                    >
                      <Text
                        style={[styles.categoryTagText, { color: categoryColors[item.category] }]}
                      >
                        {categoryNames[item.category]}
                      </Text>
                    </View>
                  </View>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  todayText: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  reviewBanner: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  reviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewEmoji: {
    fontSize: 24,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  reviewSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  reviewAction: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  motto: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    padding: 32,
  },
  masteredItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
    gap: 12,
  },
  speakBtn: {
    padding: 4,
  },
  masteredInfo: {
    flex: 1,
  },
  masteredWord: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  masteredDef: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
})
