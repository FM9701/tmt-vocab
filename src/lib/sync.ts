import { supabase } from './supabase'
import type { UserProgress } from '../types'

// 从云端加载用户进度
export async function loadProgressFromCloud(userId: string): Promise<Record<string, UserProgress> | null> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('progress_data')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // 没有数据，返回null
      return null
    }
    console.error('Failed to load progress:', error)
    return null
  }

  return data?.progress_data || null
}

// 保存用户进度到云端
export async function saveProgressToCloud(
  userId: string,
  progress: Record<string, UserProgress>
): Promise<boolean> {
  const { error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: userId,
      progress_data: progress,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })

  if (error) {
    console.error('Failed to save progress:', error)
    return false
  }

  return true
}

// 合并本地和云端进度（取最新的）
export function mergeProgress(
  local: Record<string, UserProgress>,
  cloud: Record<string, UserProgress>
): Record<string, UserProgress> {
  const merged: Record<string, UserProgress> = { ...local }

  for (const [wordId, cloudProgress] of Object.entries(cloud)) {
    const localProgress = local[wordId]

    if (!localProgress) {
      // 本地没有，使用云端
      merged[wordId] = cloudProgress
    } else {
      // 比较最后复习时间，取更新的
      const localTime = new Date(localProgress.lastReviewed).getTime()
      const cloudTime = new Date(cloudProgress.lastReviewed).getTime()

      if (cloudTime > localTime) {
        merged[wordId] = cloudProgress
      }
    }
  }

  return merged
}
