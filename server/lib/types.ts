export type Nature = 'Transfer' | 'Revenu' | 'Expense'
export type Tag = 'Investment' | 'Rent' | 'Maintenance' | 'Distribution' | 'Paying back' | 'Other'
export type Participant = 'Walid' | 'Sofian' | 'Client' | 'Business'

export const ALL_NATURES: readonly Nature[] = ['Transfer', 'Revenu', 'Expense']
export const ALL_TAGS: readonly Tag[] = ['Investment', 'Rent', 'Maintenance', 'Distribution', 'Paying back', 'Other']
export const ALL_PARTICIPANTS: readonly Participant[] = ['Walid', 'Sofian', 'Client', 'Business']

export interface Record {
  id: string
  transaction: string
  amount: number
  date: string
  paid_by: Participant
  beneficiary: Participant
  nature: Nature
  tags: Tag[]
  notes?: string
  archive?: boolean
  hide?: boolean
}

export interface RecordsFile {
  schema_version: 1
  records: Record[]
}
