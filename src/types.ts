export interface Word {
  id: string
  word: string
  pronunciation: string
  partOfSpeech: string
  definition: string
  definitionCn: string
  example: string
  exampleCn: string
  context: string
  category: Category
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

export type Category =
  | 'earnings'      // 财报与估值
  | 'ai-ml'         // AI/ML技术
  | 'semiconductor' // 半导体供应链
  | 'cloud-saas'    // 云计算/SaaS
  | 'm7'            // M7公司业务
  | 'conference'    // 电话会议/研报

export const categoryNames: Record<Category, string> = {
  'earnings': '财报与估值',
  'ai-ml': 'AI/ML技术',
  'semiconductor': '半导体供应链',
  'cloud-saas': '云计算/SaaS',
  'm7': 'M7公司业务',
  'conference': '电话会议/研报'
}

export const categoryColors: Record<Category, string> = {
  'earnings': '#10b981',
  'ai-ml': '#8b5cf6',
  'semiconductor': '#f59e0b',
  'cloud-saas': '#3b82f6',
  'm7': '#ec4899',
  'conference': '#06b6d4'
}

export interface UserProgress {
  wordId: string
  mastery: number        // 0-100 掌握程度
  correctCount: number   // 答对次数
  wrongCount: number     // 答错次数
  lastReviewed: string   // ISO date
  nextReview: string     // ISO date (间隔重复)
  isBookmarked: boolean  // 是否收藏
}

export interface StudySession {
  id: string
  date: string
  wordsStudied: number
  correctAnswers: number
  wrongAnswers: number
  duration: number // in seconds
}

export type StudyMode = 'flashcard' | 'quiz' | 'review'
