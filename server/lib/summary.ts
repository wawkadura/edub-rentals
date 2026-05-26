import { ALL_PARTICIPANTS } from './types.ts'
import type { Participant, Record as TxRecord } from './types.ts'

export interface ParticipantSummary {
  name: Participant
  total_paid: number
  total_received: number
  net: number
  invested: number
  distributed: number
  expenses_advanced: number
  expenses_reimbursed: number
}

export interface SummaryResponse {
  currency: 'LYD'
  treasury: number
  total_invested: number
  total_revenus: number
  total_expenses: number
  total_distributions: number
  participants: ParticipantSummary[]
}

interface PerParticipant {
  total_paid: number
  total_received: number
  invested: number
  distributed: number
  expenses_advanced: number
  expenses_reimbursed: number
}

function zero(): PerParticipant {
  return {
    total_paid: 0,
    total_received: 0,
    invested: 0,
    distributed: 0,
    expenses_advanced: 0,
    expenses_reimbursed: 0,
  }
}

export function computeSummary(records: TxRecord[]): SummaryResponse {
  const live = records.filter(r => !r.archive && !r.hide)
  const perPart: { [K in Participant]: PerParticipant } = {
    Walid: zero(),
    Sofian: zero(),
    Client: zero(),
    Business: zero(),
  }

  let total_invested = 0
  let total_revenus = 0
  let total_expenses = 0
  let total_distributions = 0
  let cash_in = 0
  let cash_out = 0

  for (const r of live) {
    const tags = new Set(r.tags ?? [])
    const isSelf = r.paid_by === r.beneficiary

    if (!isSelf) {
      perPart[r.paid_by].total_paid += r.amount
      perPart[r.beneficiary].total_received += r.amount
    }

    if (tags.has('Investment')) {
      total_invested += r.amount
      if (r.paid_by !== 'Business') {
        perPart[r.paid_by].invested += r.amount
      }
    }
    if (tags.has('Distribution')) {
      total_distributions += r.amount
      if (r.beneficiary !== 'Business') {
        perPart[r.beneficiary].distributed += r.amount
      }
    }
    if (tags.has('Paying back') && r.beneficiary !== 'Business') {
      perPart[r.beneficiary].expenses_reimbursed += r.amount
    }
    if (r.nature === 'Revenu') {
      total_revenus += r.amount
    }
    if (r.nature === 'Expense') {
      total_expenses += r.amount
      if (r.paid_by !== 'Business') {
        perPart[r.paid_by].expenses_advanced += r.amount
      }
    }

    // Treasury cash-flow model:
    //   IN  = revenus into Business, investments into Business
    //   OUT = transfers from Business to a participant (distributions, paying back),
    //         direct expenses paid by Business itself (paid_by = beneficiary = Business)
    // An Expense "avance" (paid_by = Sofian, beneficiary = Business) does NOT
    // hit treasury until reimbursed — only the Paying back Transfer does.
    if (r.beneficiary === 'Business' && r.nature === 'Revenu') {
      cash_in += r.amount
    }
    if (r.beneficiary === 'Business' && tags.has('Investment')) {
      cash_in += r.amount
    }
    if (r.paid_by === 'Business' && !isSelf) {
      cash_out += r.amount
    }
    if (isSelf && r.paid_by === 'Business' && r.nature === 'Expense') {
      cash_out += r.amount
    }
  }

  const participants = ALL_PARTICIPANTS.map(name => {
    const p = perPart[name]
    return {
      name,
      ...p,
      net: p.total_received - p.total_paid,
    } as ParticipantSummary
  })

  return {
    currency: 'LYD',
    treasury: cash_in - cash_out,
    total_invested,
    total_revenus,
    total_expenses,
    total_distributions,
    participants,
  }
}
