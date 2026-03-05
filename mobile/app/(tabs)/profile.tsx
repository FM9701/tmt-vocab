import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useStore } from '../../store'
import { supabase, signInWithGoogle, signOut } from '../../lib/supabase'
import { colors } from '../../theme/colors'

export default function Profile() {
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
  } = useStore()

  const [isSigningIn, setIsSigningIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.email || '',
          avatar: session.user.user_metadata?.avatar_url,
        }
        setUser(userData)
        setTimeout(() => {
          useStore.getState().syncWithCloud()
        }, 500)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.email || '',
          avatar: session.user.user_metadata?.avatar_url,
        }
        setUser(userData)
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

  const wordsLearned = getTotalWordsLearned()
  const mastery = getOverallMastery()
  const streakDays = getStreakDays()

  const formatSyncTime = (isoString: string | null) => {
    if (!isoString) return '从未同步'
    const date = new Date(isoString)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileCard}>
          {user ? (
            <View>
              <View style={styles.userRow}>
                {user.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarLetter}>
                      {user.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
              </View>
              <View style={styles.syncRow}>
                <Text style={styles.syncText}>
                  {isSyncing ? '同步中...' : `上次同步: ${formatSyncTime(lastSyncTime)}`}
                </Text>
                <TouchableOpacity
                  onPress={syncWithCloud}
                  disabled={isSyncing}
                  style={styles.syncBtn}
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color={colors.primaryLight} />
                  ) : (
                    <Ionicons name="refresh" size={16} color={colors.primaryLight} />
                  )}
                  <Text style={styles.syncBtnText}>同步</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.loginPrompt}>
              <Text style={styles.loginText}>登录后可同步学习进度</Text>
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={handleSignIn}
                disabled={isSigningIn}
              >
                <Ionicons name="log-in-outline" size={18} color="#fff" />
                <Text style={styles.loginBtnText}>
                  {isSigningIn ? '登录中...' : '使用 Google 登录'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Stats */}
        <Text style={styles.sectionTitle}>学习统计</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(59,130,246,0.2)' }]}>
              <Ionicons name="flag" size={20} color={colors.blue} />
            </View>
            <View>
              <Text style={styles.statNum}>{wordsLearned}</Text>
              <Text style={styles.statLabel}>已学习</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(34,197,94,0.2)' }]}>
              <Ionicons name="trending-up" size={20} color={colors.success} />
            </View>
            <View>
              <Text style={styles.statNum}>{mastery}%</Text>
              <Text style={styles.statLabel}>掌握程度</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(249,115,22,0.2)' }]}>
              <Ionicons name="calendar" size={20} color={colors.orange} />
            </View>
            <View>
              <Text style={styles.statNum}>{streakDays}</Text>
              <Text style={styles.statLabel}>连续天数</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(139,92,246,0.2)' }]}>
              <Ionicons name="ribbon" size={20} color={colors.purple} />
            </View>
            <View>
              <Text style={styles.statNum}>
                {Object.values(progress).filter((p) => p.mastery >= 80).length}
              </Text>
              <Text style={styles.statLabel}>已掌握</Text>
            </View>
          </View>
        </View>

        {/* Sign Out */}
        {user && (
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color={colors.text} />
            <Text style={styles.signOutText}>退出登录</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.version}>TMT Vocab v1.0.0</Text>
      </ScrollView>
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
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
  },
  syncText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncBtnText: {
    fontSize: 13,
    color: colors.primaryLight,
  },
  loginPrompt: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginText: {
    color: colors.textMuted,
    marginBottom: 16,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
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
  statNum: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surfaceLight,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  signOutText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
  },
})
