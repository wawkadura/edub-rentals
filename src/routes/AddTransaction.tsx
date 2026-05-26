import { useNavigate } from 'react-router-dom'
import TransactionFlow from '../components/TransactionFlow'
import { useRecords } from '../stores/records'

export default function AddTransaction() {
  const navigate = useNavigate()
  const { add } = useRecords()

  return (
    <TransactionFlow
      submitLabel="Enregistrer"
      onSubmit={async values => {
        await add(values)
        navigate('/transactions')
      }}
    />
  )
}
