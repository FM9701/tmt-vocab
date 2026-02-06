import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react'
import { FlashCard } from '../components/FlashCard'
import { useStore } from '../store'
import type { Word } from '../types'
import { categoryNames, type Category } from '../types'

function getFilteredWords(mode: string | null, selectedCategory: string): Word[] {
  const words = useStore.getState().getAllWords()
  if (mode === 'review') {
    const reviewIds = useStore.getState().getWordsToReview()
    return words.filter(w => reviewIds.includes(w.id))
  }
  return words.filter(
    w => selectedCategory === 'all' || w.category === selectedCategory
  )
}

async function fetchNewWords(selectedCategory: string): Promise<Word[]> {
  const store = useStore.getState()
  if (store.isGenerating) {
    // Wait for current generation to finish instead of returning empty
    return new Promise((resolve) => {
      const unsub = useStore.subscribe((state) => {
        if (!state.isGenerating) {
          unsub()
          resolve(useStore.getState().getAllWords())
        }
      })
      // Timeout after 30 seconds
      setTimeout(() => {
        unsub()
        resolve([])
      }, 30000)
    })
  }
  const catParam = selectedCategory === 'all' ? undefined : selectedCategory
  return store.generateMoreWords(catParam as Category | undefined)
}

export function Learn() {
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode')

  const selectedCategory = useStore(s => s.selectedCategory)
  const setSelectedCategory = useStore(s => s.setSelectedCategory)
  const updateProgress = useStore(s => s.updateProgress)
  const recordAnswer = useStore(s => s.recordAnswer)
  const startSession = useStore(s => s.startSession)
  const isGenerating = useStore(s => s.isGenerating)

  const [currentWord, setCurrentWord] = useState<Word | null>(null)
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 })
  const [isComplete, setIsComplete] = useState(false)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const seenWordIds = useRef(new Set<string>())
  const retryQueue = useRef<string[]>([])
  const isInitializing = useRef(false)

  const categories = Object.entries(categoryNames) as [Category, string][]

  const pickNext = useCallback(async (): Promise<Word | null> => {
    const allFiltered = getFilteredWords(mode, selectedCategory)

    // 30% chance to retry a missed word
    if (retryQueue.current.length > 0 && Math.random() < 0.3) {
      const retryId = retryQueue.current.shift()!
      const word = allFiltered.find(w => w.id === retryId)
      if (word) return word
    }

    // Pick an unseen word
    const unseen = allFiltered.filter(w => !seenWordIds.current.has(w.id))
    if (unseen.length > 0) {
      const word = unseen[Math.floor(Math.random() * unseen.length)]
      seenWordIds.current.add(word.id)
      return word
    }

    // Drain remaining retry queue
    if (retryQueue.current.length > 0) {
      const retryId = retryQueue.current.shift()!
      const word = allFiltered.find(w => w.id === retryId)
      if (word) return word
    }

    // AI generation (not in review mode)
    if (mode === 'review') return null

    setIsLoadingAI(true)
    setErrorMsg(null)
    try {
      const newWords = await fetchNewWords(selectedCategory)
      if (newWords.length > 0) {
        // Try store first, then fallback to returned words
        let freshFiltered = getFilteredWords(mode, selectedCategory)
        if (freshFiltered.length === 0) {
          freshFiltered = newWords.filter(
            (w: Word) => selectedCategory === 'all' || w.category === selectedCategory
          )
        }
        const freshUnseen = freshFiltered.filter(w => !seenWordIds.current.has(w.id))
        if (freshUnseen.length > 0) {
          const word = freshUnseen[Math.floor(Math.random() * freshUnseen.length)]
          seenWordIds.current.add(word.id)
          return word
        }
      }
      setErrorMsg('AI 生成了词汇但无法加载，请点击重试')
    } catch (err) {
      console.error('pickNext error:', err)
      setErrorMsg('AI 生成词汇失败，请检查网络后重试')
    } finally {
      setIsLoadingAI(false)
    }

    return null
  }, [mode, selectedCategory])

  const goNext = useCallback(async () => {
    const next = await pickNext()
    if (next) {
      setCurrentWord(next)
      setErrorMsg(null)
    } else if (mode === 'review') {
      setIsComplete(true)
    }
    // If not review mode and next is null, errorMsg is already set by pickNext
  }, [pickNext, mode])

  // Initialize session
  useEffect(() => {
    if (isInitializing.current) return
    isInitializing.current = true

    seenWordIds.current.clear()
    retryQueue.current = []
    setSessionStats({ correct: 0, wrong: 0 })
    setIsComplete(false)
    setCurrentWord(null)
    setErrorMsg(null)
    startSession()

    const init = async () => {
      try {
        let allFiltered = getFilteredWords(mode, selectedCategory)
        let hasError = false

        // No words available, trigger AI generation
        if (allFiltered.length === 0 && mode !== 'review') {
          setIsLoadingAI(true)
          setErrorMsg(null)
          try {
            const result = await fetchNewWords(selectedCategory)
            console.log('[Learn] AI generated', result.length, 'words')

            // Try reading from store first
            allFiltered = getFilteredWords(mode, selectedCategory)
            console.log('[Learn] Store has', allFiltered.length, 'words after generation')

            // If store read fails, use returned words directly as fallback
            if (allFiltered.length === 0 && result.length > 0) {
              console.log('[Learn] Store read empty, using returned words directly')
              allFiltered = result.filter(
                (w: Word) => selectedCategory === 'all' || w.category === selectedCategory
              )
            }
          } catch (err) {
            console.error('[Learn] fetchNewWords error:', err)
            setErrorMsg('AI 生成词汇失败，请检查网络后重试')
            hasError = true
          } finally {
            setIsLoadingAI(false)
          }
        }

        if (allFiltered.length > 0) {
          const first = allFiltered[Math.floor(Math.random() * allFiltered.length)]
          seenWordIds.current.add(first.id)
          setCurrentWord(first)
          setErrorMsg(null)
        } else if (!hasError && mode !== 'review') {
          setErrorMsg('无法获取词汇，请点击重试')
        }
      } catch (err) {
        console.error('[Learn] init error:', err)
        setErrorMsg('初始化失败: ' + String(err))
      } finally {
        isInitializing.current = false
      }
    }
    init()
  }, [mode, selectedCategory])

  const handleKnown = () => {
    if (!currentWord) return
    updateProgress(currentWord.id, true)
    recordAnswer(true)
    setSessionStats(s => ({ ...s, correct: s.correct + 1 }))
    goNext()
  }

  const handleUnknown = () => {
    if (!currentWord) return
    updateProgress(currentWord.id, false)
    recordAnswer(false)
    setSessionStats(s => ({ ...s, wrong: s.wrong + 1 }))
    retryQueue.current.push(currentWord.id)
    goNext()
  }

  const handleRetry = async () => {
    setErrorMsg(null)
    setIsLoadingAI(true)
    try {
      const result = await fetchNewWords(selectedCategory)
      console.log('[Learn] Retry: AI generated', result.length, 'words')

      // Try store first, fallback to returned words
      let pool = getFilteredWords(mode, selectedCategory)
      if (pool.length === 0 && result.length > 0) {
        pool = result.filter(
          (w: Word) => selectedCategory === 'all' || w.category === selectedCategory
        )
      }

      if (pool.length > 0) {
        const unseen = pool.filter(w => !seenWordIds.current.has(w.id))
        const pick = unseen.length > 0 ? unseen : pool
        const word = pick[Math.floor(Math.random() * pick.length)]
        seenWordIds.current.add(word.id)
        setCurrentWord(word)
      } else {
        setErrorMsg('仍然无法获取词汇，请稍后再试')
      }
    } catch (err) {
      console.error('[Learn] retry error:', err)
      setErrorMsg('重试失败: ' + String(err))
    } finally {
      setIsLoadingAI(false)
    }
  }

  const handleRestart = async () => {
    seenWordIds.current.clear()
    retryQueue.current = []
    setSessionStats({ correct: 0, wrong: 0 })
    setIsComplete(false)
    setErrorMsg(null)
    startSession()
    const allFiltered = getFilteredWords(mode, selectedCategory)
    if (allFiltered.length > 0) {
      const first = allFiltered[Math.floor(Math.random() * allFiltered.length)]
      seenWordIds.current.add(first.id)
      setCurrentWord(first)
    }
  }

  const total = sessionStats.correct + sessionStats.wrong

  // Loading state
  if (isLoadingAI || (isGenerating && !currentWord)) {
    return (
      <div className="px-4 py-6">
        <Link to="/" className="flex items-center gap-2 mb-6 text-[var(--color-text-muted)]">
          <ArrowLeft size={20} />
          返回
        </Link>
        <div className="text-center py-12">
          <Loader2 size={40} className="animate-spin mx-auto mb-4 text-[var(--color-primary)]" />
          <p className="text-[var(--color-text-muted)]">
            AI 正在生成新词汇...
          </p>
        </div>
      </div>
    )
  }

  // Error state with retry button
  if (errorMsg && !currentWord) {
    return (
      <div className="px-4 py-6">
        <Link to="/" className="flex items-center gap-2 mb-6 text-[var(--color-text-muted)]">
          <ArrowLeft size={20} />
          返回
        </Link>
        <div className="text-center py-12">
          <p className="text-[var(--color-text-muted)] mb-4">
            {errorMsg}
          </p>
          <button
            onClick={handleRetry}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <RefreshCw size={16} />
            重试
          </button>
          <div className="mt-4">
            <Link to="/" className="text-sm text-[var(--color-text-muted)] underline">
              返回首页
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // No words available (review mode empty, etc.)
  if (!currentWord && !isComplete) {
    return (
      <div className="px-4 py-6">
        <Link to="/" className="flex items-center gap-2 mb-6 text-[var(--color-text-muted)]">
          <ArrowLeft size={20} />
          返回
        </Link>
        <div className="text-center py-12">
          <p className="text-[var(--color-text-muted)]">
            {mode === 'review' ? '没有需要复习的单词' : '该分类暂无单词'}
          </p>
          <Link to="/" className="btn btn-primary mt-4">
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  if (isComplete) {
    const accuracy = total > 0 ? Math.round(sessionStats.correct / total * 100) : 0

    return (
      <div className="px-4 py-6">
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎉</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">全部学完！</h2>
          <p className="text-[var(--color-text-muted)] mb-6">
            本次学习了 {total} 个单词
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="card text-center">
              <p className="text-2xl font-bold text-green-500">{sessionStats.correct}</p>
              <p className="text-xs text-[var(--color-text-muted)]">认识</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-red-500">{sessionStats.wrong}</p>
              <p className="text-xs text-[var(--color-text-muted)]">不认识</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-blue-500">{accuracy}%</p>
              <p className="text-xs text-[var(--color-text-muted)]">正确率</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={handleRestart} className="btn btn-primary flex-1">
              再来一轮
            </button>
            <Link to="/" className="btn btn-secondary flex-1">
              返回首页
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link to="/" className="flex items-center gap-2 text-[var(--color-text-muted)]">
          <ArrowLeft size={20} />
        </Link>
        <span className="text-sm text-[var(--color-text-muted)]">
          已学 {total} 个
          {isGenerating && ' · AI生成中...'}
        </span>
        <div className="flex gap-2 text-sm">
          <span className="text-green-500">{sessionStats.correct}</span>
          <span className="text-[var(--color-text-muted)]">/</span>
          <span className="text-red-500">{sessionStats.wrong}</span>
        </div>
      </div>

      {/* Category filter (only in normal mode) */}
      {mode !== 'review' && (
        <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 mb-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface-light)]'
            }`}
          >
            全部
          </button>
          {categories.map(([key, name]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${
                selectedCategory === key
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-surface-light)]'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Flash Card */}
      {currentWord && (
        <FlashCard
          key={currentWord.id}
          word={currentWord}
          onKnown={handleKnown}
          onUnknown={handleUnknown}
        />
      )}
    </div>
  )
}
