import { createClient } from '@supabase/supabase-js'
import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { createMMKV } from 'react-native-mmkv'

WebBrowser.maybeCompleteAuthSession()

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// MMKV-backed storage for Supabase auth
const authStorage = createMMKV({ id: 'supabase-auth' })

const mmkvStorageAdapter = {
  getItem: (key: string): string | null => {
    return authStorage.getString(key) ?? null
  },
  setItem: (key: string, value: string): void => {
    authStorage.set(key, value)
  },
  removeItem: (key: string): void => {
    authStorage.remove(key)
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: mmkvStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export const signInWithGoogle = async () => {
  const redirectTo = AuthSession.makeRedirectUri()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  })

  if (error) return { data: null, error }

  if (data?.url) {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)

    if (result.type === 'success') {
      const url = result.url
      // Extract tokens from URL fragment
      const params = new URLSearchParams(url.split('#')[1] || '')
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
      }
    }
  }

  return { data, error: null }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}
