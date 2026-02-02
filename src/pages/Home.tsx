import { Link } from 'react-router-dom'
import { BookOpen, ClipboardCheck, Bookmark, TrendingUp, Target, Zap } from 'lucide-react'
import { useStore } from '../store'
import { vocabulary } from '../data/vocabulary'
import { categoryNames, categoryColors, type Category } from '../types'

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
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">
          {user ? `Hi, ${user.name?.split(' ')[0] || '学习者'}` : 'TMT Vocab'}
        </h1>
        <p className="text-[var(--color-text-muted)]">
          今天学习了 {todayLearned} 个单词
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Target size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{wordsLearned}/{totalWords}</p>
              <p className="text-xs text-[var(--color-text-muted)]">已学习</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{mastery}%</p>
              <p className="text-xs text-[var(--color-text-muted)]">掌握程度</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3 mb-6">
        {reviewCount > 0 && (
          <Link to="/learn?mode=review" className="block">
            <div className="card bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap size={24} className="text-orange-500" />
                  <div>
                    <p className="font-medium">待复习</p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {reviewCount} 个单词需要复习
                    </p>
                  </div>
                </div>
                <span className="text-orange-500">开始 →</span>
              </div>
            </div>
          </Link>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Link to="/learn" className="card text-center py-5">
            <BookOpen size={24} className="mx-auto mb-2 text-blue-500" />
            <p className="text-sm font-medium">闪卡学习</p>
          </Link>

          <Link to="/quiz" className="card text-center py-5">
            <ClipboardCheck size={24} className="mx-auto mb-2 text-green-500" />
            <p className="text-sm font-medium">选择测验</p>
          </Link>

          <Link to="/notebook" className="card text-center py-5 relative">
            <Bookmark size={24} className="mx-auto mb-2 text-yellow-500" />
            <p className="text-sm font-medium">单词本</p>
            {bookmarkCount > 0 && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-yellow-500 rounded-full text-xs flex items-center justify-center text-black font-medium">
                {bookmarkCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-3">词汇分类</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface-light)]'
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
                    ? 'text-white'
                    : 'bg-[var(--color-surface-light)]'
                }`}
                style={selectedCategory === key ? { backgroundColor: categoryColors[key] } : {}}
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
          <h2 className="text-lg font-semibold">词汇预览</h2>
          <Link to="/learn" className="text-sm text-[var(--color-primary-light)]">
            开始学习 →
          </Link>
        </div>
        <div className="space-y-2">
          {vocabulary
            .filter(w => selectedCategory === 'all' || w.category === selectedCategory)
            .slice(0, 5)
            .map(word => (
              <div key={word.id} className="card py-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{word.word}</h3>
                    <p className="text-sm text-[var(--color-text-muted)]">{word.definitionCn}</p>
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
    </div>
  )
}
