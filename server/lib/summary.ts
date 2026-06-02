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
  advance_due: number
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

  const treasury = cash_in - cash_out

  // Walid 2026-06-02 (v5): when a partner advances cash for a joint
  // expense, only HALF of the unreimbursed advance is treated as a
  // receivable. The other half is that partner's own share of the
  // expense — they would have had to pay it anyway as a 50% owner.
  //
  //   advance_due(partner)  = unreimbursed(partner) / 2
  //   equityShare           = (treasury − Σ advance_due) / 2
  //   solde(partner)        = equityShare + advance_due(partner)
  //
  // Properties:
  //   • Walid.solde + Sofian.solde = treasury (by construction)
  //   • When Sofian advances 450, only 225 is "owed to him" by the
  //     joint partnership (the other 225 is his own share).
  //   • When the advance is fully reimbursed (treasury drops by the
  //     full advance), the soldes equalize.
  //
  // Client and Business get solde = 0 (not partners).
  const PARTNERS: Participant[] = ['Walid', 'Sofian']
  const advanceDueByPartner: { [K in Participant]?: number } = {}
  let advanceDueTotal = 0
  for (const partner of PARTNERS) {
    const p = perPart[partner]
    const unreimbursed = Math.max(0, p.expenses_advanced - p.expenses_reimbursed)
    const due = unreimbursed / 2
    advanceDueByPartner[partner] = due
    advanceDueTotal += due
  }
  const equityShare = (treasury - advanceDueTotal) / 2

  // Compute partner soldes first, then enforce the invariant
  // sum(partners) = treasury by giving any rounding remainder to the
  // first partner (so we don't display values that don't sum cleanly).
  const partnerSoldes: { [K in Participant]?: number } = {}
  for (const partner of PARTNERS) {
    partnerSoldes[partner] = Math.round(
      equityShare + (advanceDueByPartner[partner] ?? 0),
    )
  }
  const partnerSum = PARTNERS.reduce((acc, p) => acc + (partnerSoldes[p] ?? 0), 0)
  const remainder = Math.round(treasury) - partnerSum
  if (remainder !== 0 && PARTNERS.length > 0) {
    const first = PARTNERS[0]
    partnerSoldes[first] = (partnerSoldes[first] ?? 0) + remainder
  }

  const participants = ALL_PARTICIPANTS.map(name => {
    const p = perPart[name]
    const due = advanceDueByPartner[name] ?? 0
    const solde = PARTNERS.includes(name) ? (partnerSoldes[name] ?? 0) : 0
    return {
      name,
      ...p,
      advance_due: due,
      net: solde,
    } as ParticipantSummary
  })

  return {
    currency: 'LYD',
    treasury,
    total_invested,
    total_revenus,
    total_expenses,
    total_distributions,
    total_cash_in: cash_in,
    total_cash_out: cash_out,
    participants,
  }
}
