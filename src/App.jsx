import { useState, useEffect, useMemo } from 'react'
import CounterpartyTable from './components/CounterpartyTable.jsx'
import CounterpartyCard from './components/CounterpartyCard.jsx'

export default function App() {
  const [counterparties, setCounterparties] = useState([])
  const [transactions, setTransactions] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/data/mock_counterparties.json').then(r => r.json()),
      fetch('/data/mock_transactions.json').then(r => r.json()),
    ]).then(([cps, txs]) => {
      setCounterparties(cps)
      setTransactions(txs)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', gap:12 }}>
      <div className="spinner" />
      <span style={{ color:'var(--text2)', fontFamily:'var(--font-mono)', fontSize:13 }}>загрузка данных...</span>
      <style>{`.spinner{width:20px;height:20px;border:2px solid var(--border2);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
      <Header />
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <CounterpartyTable
          data={counterparties}
          selected={selected}
          onSelect={setSelected}
        />
        {selected && (
          <CounterpartyCard
            cp={selected}
            transactions={transactions}
            allCps={counterparties}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  )
}

function Header() {
  return (
    <header style={{
      background: 'var(--bg2)',
      borderBottom: '1px solid var(--border)',
      padding: '0 20px',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
      gap: 16,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, #4f8ef7 0%, #a78bfa 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 800,
        }}>Ф</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>FinGraph</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>Анализ транзакций KZT</div>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:16 }}>
        <Chip label="80 800 транзакций" color="var(--accent)" />
        <Chip label="6 140 контрагентов" color="var(--green)" />
        <Chip label="2024–2026" color="var(--purple)" />
      </div>
    </header>
  )
}

function Chip({ label, color }) {
  return (
    <div style={{
      background: color + '18',
      border: `1px solid ${color}40`,
      color: color,
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontFamily: 'var(--font-mono)',
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>{label}</div>
  )
}
