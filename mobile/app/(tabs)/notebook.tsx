import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useStore } from '../../store'
import { categoryNames, categoryColors } from '../../types'
import { speak } from '../../lib/tts'
import { colors } from '../../theme/colors'

export default function Notebook() {
  const router = useRouter()
  const { getBookmarkedWords, removeFromNotebook, getProgress, getAllWords } = useStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const bookmarkedIds = getBookmarkedWords()
  const bookmarkedWords = getAllWords().filter((w) => bookmarkedIds.includes(w.id))

  const filteredWords = bookmarkedWords.filter(
    (w) =>
      w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.definitionCn.includes(searchQuery)
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')}>
          <Ionicons name="arrow-back" size={22} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.title}>单词本</Text>
        <Text style={styles.count}>{bookmarkedWords.length} 个单词</Text>
      </View>

      {/* Practice button + Search */}
      {bookmarkedWords.length > 0 && (
        <TouchableOpacity
          style={styles.practiceBtn}
          onPress={() => router.push('/learn?mode=notebook')}
        >
          <Ionicons name="book" size={18} color="#fff" />
          <Text style={styles.practiceBtnText}>专项练习</Text>
          <Text style={styles.practiceBtnCount}>{bookmarkedWords.length} 词</Text>
        </TouchableOpacity>
      )}

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          placeholder="搜索单词..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      {/* Word list */}
      {filteredWords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {bookmarkedWords.length === 0 ? '单词本里还没有单词' : '没有匹配的单词'}
          </Text>
          {bookmarkedWords.length === 0 && (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/learn')}>
              <Text style={styles.primaryBtnText}>开始学习</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredWords}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item: word }) => {
            const progress = getProgress(word.id)
            const isExpanded = expandedId === word.id

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => setExpandedId(isExpanded ? null : word.id)}
                activeOpacity={0.7}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.wordRow}>
                      <Text style={styles.wordText}>{word.word}</Text>
                      <Text style={styles.pronunciationText}>{word.pronunciation}</Text>
                    </View>
                    <Text style={styles.definitionText}>{word.definitionCn}</Text>
                  </View>
                  <View
                    style={[
                      styles.categoryTag,
                      { backgroundColor: categoryColors[word.category] + '33' },
                    ]}
                  >
                    <Text
                      style={[styles.categoryTagText, { color: categoryColors[word.category] }]}
                    >
                      {categoryNames[word.category]}
                    </Text>
                  </View>
                </View>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>英文释义</Text>
                      <Text style={styles.sectionText}>{word.definition}</Text>
                    </View>

                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>例句</Text>
                      <Text style={[styles.sectionText, { fontStyle: 'italic' }]}>
                        {word.example}
                      </Text>
                      <Text style={styles.mutedText}>{word.exampleCn}</Text>
                    </View>

                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>使用场景</Text>
                      <Text style={styles.mutedText}>{word.context}</Text>
                    </View>

                    <View style={styles.masteryRow}>
                      <Text style={styles.masteryLabel}>掌握程度: {progress.mastery}%</Text>
                      <View style={styles.masteryBar}>
                        <View
                          style={[styles.masteryFill, { width: `${progress.mastery}%` }]}
                        />
                      </View>
                    </View>

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => speak(word.word)}
                      >
                        <Ionicons name="volume-medium" size={16} color={colors.text} />
                        <Text style={styles.actionBtnText}>发音</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.danger }]}
                        onPress={() => removeFromNotebook(word.id)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#fff" />
                        <Text style={[styles.actionBtnText, { color: '#fff' }]}>移出单词本</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  count: {
    fontSize: 13,
    color: colors.textMuted,
  },
  practiceBtn: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  practiceBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  practiceBtnCount: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  searchContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 14,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingLeft: 40,
    paddingRight: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    gap: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  wordText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  pronunciationText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  definitionText: {
    fontSize: 13,
    color: colors.textMuted,
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
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 14,
    color: colors.text,
  },
  mutedText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  masteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  masteryLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  masteryBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: 2,
  },
  masteryFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceLight,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 14,
    color: colors.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
})
