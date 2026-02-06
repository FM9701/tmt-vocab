import { useEffect, useState } from 'react'
import { LogIn, LogOut, TrendingUp, Target, Calendar, Award, RefreshCw } from 'lucide-react'
import { useStore } from '../store'
import { supabase, signInWithGoogle, signOut } from '../lib/supabase'

export function Profile() {
  const {
    user,
    setUser,
    setLoading,
    getTotalWordsLearned,
    getOverallMastery,
    getStreakDays,
    progress,
    syncWithCloud,
    isSyncing,
    lastSyncTime,
    getAllWords
  } = useStore()

  const [isSigningIn, setIsSigningIn] = useState(false)

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.email || '',
          avatar: session.user.user_metadata?.avatar_url
        }
        setUser(userData)
        // 登录后自动同步
        setTimeout(() => {
          useStore.getState().syncWithCloud()
        }, 500)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.email || '',
          avatar: session.user.user_metadata?.avatar_url
        }
        setUser(userData)
        // 登录后自动同步
        setTimeout(() => {
          useStore.getState().syncWithCloud()
        }, 500)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignIn = async () => {
    setIsSigningIn(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Sign in error:', error)
    }
    setIsSigningIn(false)
  }

  const handleSignOut = async () => {
    await signOut()
    setUser(null)
  }

  const handleSync = () => {
    syncWithCloud()
  }

  const allWords = getAllWords()
  const wordsLearned = getTotalWordsLearned()
  const mastery = getOverallMastery()
  const streakDays = getStreakDays()

  // Calculate category progress
  const categoryProgress = allWords.reduce((acc, word) => {
    if (!acc[word.category]) {
      acc[word.category] = { total: 0, learned: 0 }
    }
    acc[word.category].total++
    if (progress[word.id]?.mastery > 0) {
      acc[word.category].learned++
    }
    return acc
  }, {} as Record<string, { total: number; learned: number }>)

  const formatSyncTime = (isoString: string | null) => {
    if (!isoString) return '从未同步'
    const date = new Date(isoString)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="px-4 py-6">
      {/* Profile Header */}
      <div className="card mb-6">
        {user ? (
          <div>
            <div className="flex items-center gap-4">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-2xl font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold">{user.name}</h2>
                <p className="text-sm text-[var(--color-text-muted)]">{user.email}</p>
              </div>
            </div>
            {/* Sync status */}
            <div className="mt-4 pt-4 border-t border-[var(--color-surface-light)] flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-muted)]">
                {isSyncing ? '同步中...' : `上次同步: ${formatSyncTime(lastSyncTime)}`}
              </span>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-2 text-sm text-[var(--color-primary-light)]"
              >
                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                同步
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-[var(--color-text-muted)] mb-4">
              登录后可同步学习进度
            </p>
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="btn btn-primary"
            >
              <LogIn size={18} />
              {isSigningIn ? '登录中...' : '使用 Google 登录'}
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <h3 className="text-lg font-semibold mb-3">学习统计</h3>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Target size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{wordsLearned}</p>
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
              <p className="text-xl font-bold">{mastery}%</p>
              <p className="text-xs text-[var(--color-text-muted)]">掌握程度</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Calendar size={20} className="text-orange-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{streakDays}</p>
              <p className="text-xs text-[var(--color-text-muted)]">连续天数</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Award size={20} className="text-purple-500" />
            </div>
            <div>
              <p className="text-xl font-bold">
                {Object.values(progress).filter(p => p.mastery >= 80).length}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">已掌握</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Progress */}
      <h3 className="text-lg font-semibold mb-3">分类进度</h3>
      <div className="space-y-3 mb-6">
        {Object.entries(categoryProgress).map(([category, { total, learned }]) => (
          <div key={category} className="card py-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">
                {category === 'earnings' && '财报与估值'}
                {category === 'ai-ml' && 'AI/ML技术'}
                {category === 'semiconductor' && '半导体供应链'}
                {category === 'cloud-saas' && '云计算/SaaS'}
                {category === 'm7' && 'M7公司业务'}
                {category === 'conference' && '电话会议/研报'}
              </span>
              <span className="text-sm text-[var(--color-text-muted)]">
                {learned}/{total}
              </span>
            </div>
            <div className="h-2 bg-[var(--color-surface-light)] rounded-full">
              <div
                className="h-full bg-[var(--color-primary)] rounded-full transition-all"
                style={{ width: `${(learned / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Sign Out */}
      {user && (
        <button
          onClick={handleSignOut}
          className="btn btn-secondary w-full"
        >
          <LogOut size={18} />
          退出登录
        </button>
      )}

      {/* Version */}
      <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
        TMT Vocab v1.0.0
      </p>
    </div>
  )
}
