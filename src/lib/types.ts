export type Nature = 'Transfer' | 'Revenu' | 'Expense'

export type Tag =
  | 'Investment'
  | 'Rent'
  | 'Maintenance'
  | 'Distribution'
  | 'Paying back'
  | 'Other'

export const ALL_NATURES: Nature[] = ['Transfer', 'Revenu', 'Expense']
export const ALL_TAGS: Tag[] = [
  'Investment',
  'Rent',
  'Maintenance',
  'Distribution',
  'Paying back',
  'Other',
]

export type Participant = 'Walid' | 'Sofian' | 'Client' | 'Business'
export const ALL_PARTICIPANTS: Participant[] = ['Walid', 'Sofian', 'Client', 'Business']

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

export interface ParticipantSummary {
  name: Participant
  total_paid: number
  total_received: number
  net: number
  invested: number
  distributed: number
  expenses_advanced: number
  expenses_reimbursed: number
  advance_due: number
  earned: number
}

export interface SummaryResponse {
  currency: 'LYD'
  treasury: number
  total_invested: number
  total_revenus: number
  total_expenses: number
  total_distributions: number
  total_cash_in: number
  total_cash_out: number
  participants: ParticipantSummary[]
}
