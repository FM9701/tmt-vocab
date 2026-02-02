/**
 * 间隔重复算法 (SM-2的简化版本)
 * 根据用户的回答情况计算下次复习时间
 */

export interface ReviewResult {
  nextReview: Date
  newMastery: number
}

/**
 * 计算下次复习时间
 * @param currentMastery 当前掌握程度 (0-100)
 * @param isCorrect 本次是否答对
 * @param correctStreak 连续答对次数
 * @returns 下次复习时间和新的掌握程度
 */
export function calculateNextReview(
  currentMastery: number,
  isCorrect: boolean,
  correctStreak: number
): ReviewResult {
  const now = new Date()
  let newMastery = currentMastery
  let intervalDays: number

  if (isCorrect) {
    // 答对：提高掌握程度，增加复习间隔
    newMastery = Math.min(100, currentMastery + 15)

    // 根据连续答对次数和掌握程度计算间隔
    if (correctStreak <= 1) {
      intervalDays = 1
    } else if (correctStreak === 2) {
      intervalDays = 3
    } else if (correctStreak === 3) {
      intervalDays = 7
    } else if (correctStreak === 4) {
      intervalDays = 14
    } else {
      intervalDays = Math.min(30, 7 * (correctStreak - 2))
    }

    // 掌握程度越高，间隔越长
    if (newMastery >= 80) {
      intervalDays = Math.ceil(intervalDays * 1.5)
    }
  } else {
    // 答错：降低掌握程度，缩短复习间隔
    newMastery = Math.max(0, currentMastery - 20)
    intervalDays = 0.5 // 12小时后复习
  }

  const nextReview = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000)

  return {
    nextReview,
    newMastery
  }
}

/**
 * 判断单词是否需要复习
 */
export function needsReview(nextReviewDate: string | Date): boolean {
  const now = new Date()
  const reviewDate = new Date(nextReviewDate)
  return now >= reviewDate
}

/**
 * 获取需要复习的单词数量
 */
export function getReviewCount(
  progressList: { nextReview: string }[]
): number {
  return progressList.filter(p => needsReview(p.nextReview)).length
}

/**
 * 按复习优先级排序
 * 优先级：过期时间越长 > 掌握程度越低
 */
export function sortByReviewPriority(
  words: { wordId: string; nextReview: string; mastery: number }[]
): typeof words {
  const now = new Date().getTime()

  return [...words].sort((a, b) => {
    const aOverdue = now - new Date(a.nextReview).getTime()
    const bOverdue = now - new Date(b.nextReview).getTime()

    // 首先按过期时间排序（过期越久越优先）
    if (aOverdue !== bOverdue) {
      return bOverdue - aOverdue
    }

    // 其次按掌握程度排序（掌握程度越低越优先）
    return a.mastery - b.mastery
  })
}
