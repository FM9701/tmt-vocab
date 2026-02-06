import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Volume2, BookmarkX, Search } from 'lucide-react'
import { useStore } from '../store'
import { categoryNames, categoryColors } from '../types'

export function Notebook() {
  const { getBookmarkedWords, toggleBookmark, getProgress, getAllWords } = useStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const bookmarkedIds = getBookmarkedWords()
  const bookmarkedWords = getAllWords().filter(w => bookmarkedIds.includes(w.id))

  const filteredWords = bookmarkedWords.filter(w =>
    w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.definitionCn.includes(searchQuery)
  )

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    speechSynthesis.speak(utterance)
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="text-[var(--color-text-muted)]">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">单词本</h1>
        <span className="text-sm text-[var(--color-text-muted)]">
          {bookmarkedWords.length} 个单词
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="text"
          placeholder="搜索单词..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-[var(--color-surface)] rounded-xl text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
      </div>

      {/* Word list */}
      {filteredWords.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--color-text-muted)]">
            {bookmarkedWords.length === 0
              ? '还没有收藏单词'
              : '没有匹配的单词'}
          </p>
          {bookmarkedWords.length === 0 && (
            <Link to="/learn" className="btn btn-primary mt-4">
              开始学习
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredWords.map(word => {
            const progress = getProgress(word.id)
            const isExpanded = expandedId === word.id

            return (
              <div key={word.id} className="card">
                <div
                  className="flex justify-between items-start cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : word.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold">{word.word}</h3>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {word.pronunciation}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {word.definitionCn}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
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

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[var(--color-surface-light)] animate-fade-in">
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-[var(--color-text-muted)] text-xs mb-1">英文释义</p>
                        <p>{word.definition}</p>
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

                      <div className="flex items-center gap-2 pt-2">
                        <span className="text-xs text-[var(--color-text-muted)]">
                          掌握程度: {progress.mastery}%
                        </span>
                        <div className="flex-1 h-1 bg-[var(--color-surface-light)] rounded-full">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${progress.mastery}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          speak(word.word)
                        }}
                        className="btn btn-secondary flex-1"
                      >
                        <Volume2 size={16} />
                        发音
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleBookmark(word.id)
                        }}
                        className="btn btn-danger flex-1"
                      >
                        <BookmarkX size={16} />
                        移除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
