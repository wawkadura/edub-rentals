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

interface PerParticipant {
  total_paid: number
  total_received: number
  invested: number
  distributed: number
  expenses_advanced: number
  expenses_reimbursed: number
}

// Per-rent share: net (rent − period expenses) split 50/50, plus the
// partner's own advances in the period (full reimbursement). Period
// is forward: [rent_date, next_rent_date).
function computeEarnedByPartner(
  live: TxRecord[],
  partners: Participant[],
): { [K in Participant]?: number } {
  const revenus = live
    .filter(r => r.nature === 'Revenu' && r.beneficiary === 'Business')
    .sort((a, b) => (a.date < b.date ? -1 : 1))
  const expenses = live
    .filter(r => r.nature === 'Expense')
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  const earned: { [K in Participant]?: number } = {}
  for (const p of partners) earned[p] = 0

  for (let i = 0; i < revenus.length; i += 1) {
    const r = revenus[i]
    const next = revenus[i + 1]
    const periodEnd = next ? next.date : '9999-12-31'
    const inPeriod = expenses.filter(e => e.date >= r.date && e.date < periodEnd)
    const totalExpense = inPeriod.reduce((s, e) => s + e.amount, 0)
    const net = r.amount - totalExpense
    const baseShare = net / 2
    for (const partner of partners) {
      const ownAdvances = inPeriod
        .filter(e => e.paid_by === partner)
        .reduce((s, e) => s + e.amount, 0)
      earned[partner] = (earned[partner] ?? 0) + baseShare + ownAdvances
    }
  }
  return earned
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

  // Walid 2026-06-27 (v6): solde formula = invested + earned − withdrawn.
  //
  //   earned(P)     = Σ per-rent shares for P (forward window
  //                   [rent_date, next_rent_date), with full advance
  //                   reimbursement)
  //   withdrawn(P)  = Σ Business → P transfers (Distribution + Paying back)
  //   solde(P)      = invested(P) + earned(P) − withdrawn(P)
  //
  // Properties:
  //   • Withdrawing from one partner only impacts that partner's solde
  //     (the previous V5 split-equity formula reduced both, which Walid
  //     rejected).
  //   • By construction, Σ partner soldes = treasury — because:
  //       Σ invested = total partner capital in
  //       Σ earned   = Σ rent − B→B expenses (advances cancel pair-wise)
  //       Σ withdrawn = Σ B→partner cash out
  //       so Σ solde = cash_in − cash_out − B→B leftover = treasury.
  //
  // Client and Business get solde = 0 (not partners).
  const PARTNERS: Participant[] = ['Walid', 'Sofian']
  const earnedByPartner = computeEarnedByPartner(live, PARTNERS)

  // Any Business → partner transfer counts as "withdrawn", regardless of
  // tag (Distribution, Paying back, or untagged).
  const withdrawnByPartner: { [K in Participant]?: number } = {}
  for (const partner of PARTNERS) withdrawnByPartner[partner] = 0
  for (const r of live) {
    if (
      r.nature === 'Transfer' &&
      r.paid_by === 'Business' &&
      PARTNERS.includes(r.beneficiary)
    ) {
      withdrawnByPartner[r.beneficiary] = (withdrawnByPartner[r.beneficiary] ?? 0) + r.amount
    }
  }

  const partnerSoldes: { [K in Participant]?: number } = {}
  for (const partner of PARTNERS) {
    const p = perPart[partner]
    const earned = earnedByPartner[partner] ?? 0
    const withdrawn = withdrawnByPartner[partner] ?? 0
    partnerSoldes[partner] = Math.round(p.invested + earned - withdrawn)
  }
  // Enforce the invariant Σ partner soldes = treasury exactly (any
  // rounding remainder lands on Walid).
  const partnerSum = PARTNERS.reduce((acc, p) => acc + (partnerSoldes[p] ?? 0), 0)
  const remainder = Math.round(treasury) - partnerSum
  if (remainder !== 0 && PARTNERS.length > 0) {
    const first = PARTNERS[0]
    partnerSoldes[first] = (partnerSoldes[first] ?? 0) + remainder
  }

  const participants = ALL_PARTICIPANTS.map(name => {
    const p = perPart[name]
    const earned = earnedByPartner[name] ?? 0
    const solde = PARTNERS.includes(name) ? (partnerSoldes[name] ?? 0) : 0
    return {
      name,
      ...p,
      advance_due: 0, // kept for type stability, unused since v6
      earned,
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
