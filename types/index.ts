export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: 'member' | 'admin'
  created_at: string
}

export interface JournalEntry {
  id: string
  user_id: string
  entry_date: string          // 'YYYY-MM-DD'
  objective: string
  action_step_1: string
  action_step_2: string
  action_step_3: string
  strength_1: string
  strength_2: string
  strength_3: string
  weakness: string
  extra_notes: string | null
  rating_motivation: number   // 1–10
  rating_focus: number        // 1–10
  rating_confidence: number   // 1–10
  rating_anxiety: number      // 1–10
  created_at: string
}

export interface JournalFormData {
  objective: string
  action_step_1: string
  action_step_2: string
  action_step_3: string
  strength_1: string
  strength_2: string
  strength_3: string
  weakness: string
  extra_notes: string
  rating_motivation: number
  rating_focus: number
  rating_confidence: number
  rating_anxiety: number
}

export interface ApprovedEmail {
  id: string
  email: string
  notes: string | null
  registered: boolean
  added_at: string
}

export interface MemberWithCount extends Profile {
  entry_count: number
}
