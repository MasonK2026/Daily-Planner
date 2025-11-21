export interface Task {
  id: string
  content: string
  description?: string
  projectName?: string
  projectColor?: string
  duration?: {
    amount: number
    unit: string
  } | null
  due?: {
    date: string
    string: string
    lang: string
    is_recurring: boolean
  } | null
  isBreak?: boolean
  priority: number
  labels: string[]
  sectionId?: string
  sectionName?: string
  isCompleted: boolean
  timer?: {
    elapsed: number // in seconds
    isPlaying: boolean
    lastStartedAt?: number // timestamp
  }
}

export type ColumnId = "pool" | "schedule" | "later"

export interface Column {
  id: ColumnId
  title: string
  tasks: Task[]
}
