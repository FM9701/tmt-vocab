import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ClipboardCheck, Bookmark, Target, CheckCircle, X, Volume2 } from 'lucide-react'
import { useStore } from '../store'
import { categoryNames, categoryColors } from '../types'
import { speak as ttsSpeak } from '../lib/tts'

export function Home() {
  const {
    user,
    getTotalWordsLearned,
    getTodayWordsLearned,
    getWordsToReview,
    getBookmarkedWords,
    getAllWords,
    progress
  } = useStore()

  const [showMastered, setShowMastered] = useState(false)

  const wordsLearned = getTotalWordsLearned()
  const todayLearned = getTodayWordsLearned()
  const reviewCount = getWordsToReview().length
  const bookmarkCount = getBookmarkedWords().length

  // 已学会 = mastery >= 80
  const allWords = getAllWords()
  const masteredWords = allWords.filter(w => progress[w.id]?.mastery >= 80)
  const masteredCount = masteredWords.length

  return (
    <div className="px-4 py-6 relative z-10">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="stranger-title text-3xl font-bold mb-2">
          TMT Vocab
        </h1>
        <p className="text-[var(--color-text-muted)]">
          {user ? `欢迎回来, ${user.name?.split(' ')[0] || '学习者'}` : 'TMT 行业英语词汇学习'}
        </p>
        <p className="text-sm text-[var(--color-primary)] mt-2">
          今日已学习 {todayLearned} 个单词
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card neon-glow-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Target size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{wordsLearned}</p>
              <p className="text-xs text-[var(--color-text-muted)]">已学习</p>
            </div>
          </div>
        </div>

        <button onClick={() => setShowMastered(true)} className="card neon-glow-subtle text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{masteredCount}</p>
              <p className="text-xs text-[var(--color-text-muted)]">已学会</p>
            </div>
          </div>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3 mb-6">
        {reviewCount > 0 && (
          <Link to="/learn?mode=review" className="block">
            <div className="card bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-500/50 animate-pulse-glow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📖</span>
                  <div>
                    <p className="font-medium text-[var(--color-primary)]">有单词等待复习！</p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {reviewCount} 个单词等待复习
                    </p>
                  </div>
                </div>
                <span className="text-[var(--color-primary)]">去复习 →</span>
              </div>
            </div>
          </Link>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Link to="/learn" className="card text-center py-5 hover:border-blue-500 transition-all">
            <BookOpen size={24} className="mx-auto mb-2 text-blue-400" />
            <p className="text-sm font-medium">闪卡学习</p>
          </Link>

          <Link to="/quiz" className="card text-center py-5 hover:border-purple-500 transition-all">
            <ClipboardCheck size={24} className="mx-auto mb-2 text-purple-400" />
            <p className="text-sm font-medium">挑战测验</p>
          </Link>

          <Link to="/notebook" className="card text-center py-5 relative hover:border-yellow-500 transition-all">
            <Bookmark size={24} className="mx-auto mb-2 text-yellow-400" />
            <p className="text-sm font-medium">单词本</p>
            {bookmarkCount > 0 && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-[var(--color-primary)] rounded-full text-xs flex items-center justify-center text-white font-medium">
                {bookmarkCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* 底部 */}
      <div className="text-center mt-8 text-[var(--color-text-muted)] text-sm">
        <p>坚持学习，每天进步一点点</p>
      </div>

      {/* 已学会弹窗 */}
      {showMastered && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={() => setShowMastered(false)}>
          <div
            className="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl max-h-[75vh] flex flex-col animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-surface-light)]">
              <h2 className="text-lg font-semibold">已学会的词 ({masteredCount})</h2>
              <button onClick={() => setShowMastered(false)} className="p-1">
                <X size={20} className="text-[var(--color-text-muted)]" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {masteredWords.length === 0 ? (
                <p className="text-center text-[var(--color-text-muted)] py-8">
                  还没有学会的词，继续加油！
                </p>
              ) : (
                <div className="space-y-2">
                  {masteredWords.map(word => (
                    <div key={word.id} className="card py-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => ttsSpeak(word.word)}
                            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                          >
                            <Volume2 size={16} />
                          </button>
                          <div>
                            <h3 className="font-medium">{word.word}</h3>
                            <p className="text-sm text-[var(--color-text-muted)]">{word.definitionCn}</p>
                          </div>
                        </div>
                        <span
                          className="text-xs px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: categoryColors[word.category] + '20',
                            color: categoryColors[word.category]
                          }}
                        >
                          {categoryNames[word.category]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
