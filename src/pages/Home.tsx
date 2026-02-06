import { Link } from 'react-router-dom'
import { BookOpen, ClipboardCheck, Bookmark, TrendingUp, Target } from 'lucide-react'
import { useStore } from '../store'
import { vocabulary } from '../data/vocabulary'
import { categoryNames, categoryColors, type Category } from '../types'

// Q版怪奇物语角色
const StrangerCharacters = () => (
  <div className="flex justify-center gap-4 my-4 text-3xl">
    <span className="animate-bounce" style={{ animationDelay: '0s' }} title="Eleven">👧</span>
    <span className="animate-bounce" style={{ animationDelay: '0.1s' }} title="Demogorgon">🌺</span>
    <span className="animate-bounce" style={{ animationDelay: '0.2s' }} title="Mike">👦</span>
    <span className="animate-bounce" style={{ animationDelay: '0.3s' }} title="Mind Flayer">🕸️</span>
    <span className="animate-bounce" style={{ animationDelay: '0.4s' }} title="Dustin">🧢</span>
  </div>
)

// 颠倒世界粒子
const UpsideDownParticles = () => (
  <div className="upside-down-particles">
    {[...Array(20)].map((_, i) => (
      <div
        key={i}
        className="particle"
        style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 15}s`,
          animationDuration: `${15 + Math.random() * 10}s`,
        }}
      />
    ))}
  </div>
)

export function Home() {
  const {
    user,
    getTotalWordsLearned,
    getTodayWordsLearned,
    getOverallMastery,
    getWordsToReview,
    getBookmarkedWords,
    selectedCategory,
    setSelectedCategory
  } = useStore()

  const totalWords = vocabulary.length
  const wordsLearned = getTotalWordsLearned()
  const todayLearned = getTodayWordsLearned()
  const mastery = getOverallMastery()
  const reviewCount = getWordsToReview().length
  const bookmarkCount = getBookmarkedWords().length

  const categories = Object.entries(categoryNames) as [Category, string][]

  return (
    <div className="px-4 py-6 relative z-10">
      <UpsideDownParticles />

      {/* Header - 怪奇物语风格 */}
      <div className="mb-6 text-center">
        <h1 className="stranger-title text-3xl font-bold mb-2">
          TMT Vocab
        </h1>
        <p className="text-[var(--color-text-muted)]">
          {user ? `欢迎回来, ${user.name?.split(' ')[0] || '学习者'}` : '进入颠倒世界学英语'}
        </p>
        <StrangerCharacters />
        <p className="text-sm text-[var(--color-neon-red)]">
          ⚡ 今日已学习 {todayLearned} 个单词 ⚡
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card neon-glow-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <Target size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--color-neon-red)]">{wordsLearned}/{totalWords}</p>
              <p className="text-xs text-[var(--color-text-muted)]">👾 已学习</p>
            </div>
          </div>
        </div>

        <div className="card neon-glow-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-400">{mastery}%</p>
              <p className="text-xs text-[var(--color-text-muted)]">🔮 掌握程度</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3 mb-6">
        {reviewCount > 0 && (
          <Link to="/learn?mode=review" className="block">
            <div className="card bg-gradient-to-r from-red-900/40 to-purple-900/40 border-red-500/50 animate-pulse-glow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🌺</span>
                  <div>
                    <p className="font-medium text-[var(--color-neon-red)]">颠倒世界召唤你！</p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {reviewCount} 个单词等待复习
                    </p>
                  </div>
                </div>
                <span className="text-[var(--color-neon-red)]">进入 →</span>
              </div>
            </div>
          </Link>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Link to="/learn" className="card text-center py-5 hover:neon-glow-subtle transition-all">
            <span className="text-2xl block mb-2">📚</span>
            <BookOpen size={20} className="mx-auto mb-1 text-red-400" />
            <p className="text-sm font-medium">闪卡学习</p>
          </Link>

          <Link to="/quiz" className="card text-center py-5 hover:neon-glow-subtle transition-all">
            <span className="text-2xl block mb-2">🎮</span>
            <ClipboardCheck size={20} className="mx-auto mb-1 text-purple-400" />
            <p className="text-sm font-medium">挑战测验</p>
          </Link>

          <Link to="/notebook" className="card text-center py-5 relative hover:neon-glow-subtle transition-all">
            <span className="text-2xl block mb-2">📓</span>
            <Bookmark size={20} className="mx-auto mb-1 text-yellow-400" />
            <p className="text-sm font-medium">单词本</p>
            {bookmarkCount > 0 && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-[var(--color-neon-red)] rounded-full text-xs flex items-center justify-center text-white font-medium shadow-lg shadow-red-500/50">
                {bookmarkCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span>🔦</span> 词汇分类
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-red-500/30'
                : 'bg-[var(--color-surface-light)] hover:bg-[var(--color-surface)]'
            }`}
          >
            全部 ({vocabulary.length})
          </button>
          {categories.map(([key, name]) => {
            const count = vocabulary.filter(w => w.category === key).length
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                  selectedCategory === key
                    ? 'text-white shadow-lg'
                    : 'bg-[var(--color-surface-light)] hover:bg-[var(--color-surface)]'
                }`}
                style={selectedCategory === key ? {
                  backgroundColor: categoryColors[key],
                  boxShadow: `0 4px 15px ${categoryColors[key]}40`
                } : {}}
              >
                {name} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Word List Preview */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>👁️</span> 词汇预览
          </h2>
          <Link to="/learn" className="text-sm text-[var(--color-neon-red)] hover:underline">
            开始冒险 →
          </Link>
        </div>
        <div className="space-y-2">
          {vocabulary
            .filter(w => selectedCategory === 'all' || w.category === selectedCategory)
            .slice(0, 5)
            .map((word, index) => (
              <div key={word.id} className="card py-3 hover:border-red-500/40 transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{['🔴', '🟣', '🔵', '🟢', '🟡'][index % 5]}</span>
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
      </div>

      {/* 底部装饰 */}
      <div className="text-center mt-8 text-[var(--color-text-muted)] text-sm">
        <p>🔮 Friends don't lie. 学习不能停。 🔮</p>
      </div>
    </div>
  )
}
