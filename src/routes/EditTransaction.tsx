import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TransactionFlow from '../components/TransactionFlow'
import { useRecords } from '../stores/records'

export default function EditTransaction() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { records, refresh, update, remove } = useRecords()

  useEffect(() => {
    if (!records.length) refresh()
  }, [records.length, refresh])

  if (!id) {
    return <div className="opacity-60">URL invalide.</div>
  }
  const existing = records.find(r => r.id === id)
  if (!existing) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-3 p-4">
        <p className="opacity-60">Transaction introuvable.</p>
        <button
          onClick={() => navigate('/transactions')}
          className="rounded-md border px-3 py-1.5 text-sm"
          style={{ borderColor: 'var(--border-color)' }}
        >
          Retour
        </button>
      </div>
    )
  }

  return (
    <TransactionFlow
      initial={existing}
      submitLabel="Mettre à jour"
      onSubmit={async values => {
        await update(existing.id, values)
        navigate('/transactions')
      }}
      onDelete={async () => {
        await remove(existing.id)
        navigate('/transactions')
      }}
    />
  )
}
