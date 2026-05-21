import { useState, useMemo } from 'react'

const PAGE_SIZE = 15
const DOC_TYPES = ['Все типы', 'INVOICE', 'WAYBILL', 'ACT']

function fmt(n) {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + ' млрд'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + ' млн'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + ' тыс'
  return n.toFixed(0)
}

export default function CounterpartyTable({ data, selected, onSelect }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('total_abs')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [periodFrom, setPeriodFrom] = useState('')
  const [periodTo, setPeriodTo] = useState('')
  const [docType, setDocType] = useState('Все типы')

  const filtered = useMemo(() => {
    let d = data
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      d = d.filter(cp => cp.id.includes(q))
    }
    return d
  }, [data, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [filtered, sortKey, sortDir])

  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
    setPage(1)
  }

  function SortIcon({ k }) {
    if (sortKey !== k) return <span style={{ color: 'var(--text3)' }}>↕</span>
    return <span style={{ color: 'var(--accent)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const cols = [
    { key: 'id', label: 'БИН/ИИН', sortable: false },
    { key: 'total_abs', label: 'Оборот', sortable: true },
    { key: 'out_sum', label: 'Исходящие', sortable: true },
    { key: 'in_sum', label: 'Входящие', sortable: true },
    { key: 'n_ops', label: 'Операций', sortable: true },
  ]

  return (
    <div style={{
      width: selected ? '420px' : '100%',
      minWidth: selected ? 340 : undefined,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      borderRight: selected ? '1px solid var(--border)' : 'none',
      overflow: 'hidden',
      transition: 'width 0.25s ease',
    }}>
      {/* Filters bar */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
      }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Поиск по БИН/ИИН..."
          style={inputStyle}
        />
        <input
          type="date"
          value={periodFrom}
          onChange={e => setPeriodFrom(e.target.value)}
          style={{ ...inputStyle, width: 130 }}
          title="Период с"
        />
        <input
          type="date"
          value={periodTo}
          onChange={e => setPeriodTo(e.target.value)}
          style={{ ...inputStyle, width: 130 }}
          title="Период по"
        />
        <select
          value={docType}
          onChange={e => setDocType(e.target.value)}
          style={{ ...inputStyle, width: 120 }}
        >
          {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', color: 'var(--text3)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
          {total} контрагентов
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <tr style={{ background: 'var(--bg3)' }}>
              {cols.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={{
                    padding: '10px 14px',
                    textAlign: col.key === 'id' ? 'left' : 'right',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text3)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    cursor: col.sortable ? 'pointer' : 'default',
                    borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                  }}
                >
                  {col.label} {col.sortable && <SortIcon k={col.key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((cp, i) => {
              const isSelected = selected?.id === cp.id
              return (
                <tr
                  key={cp.id}
                  onClick={() => onSelect(cp)}
                  style={{
                    background: isSelected ? 'var(--accent)18' : i % 2 === 0 ? 'transparent' : 'var(--bg2)20',
                    borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg3)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'var(--bg2)20' }}
                >
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: isSelected ? 'var(--accent)' : 'var(--text)', fontWeight: isSelected ? 600 : 400 }}>
                    {cp.id}
                  </td>
                  <td style={numCell}>{fmt(cp.total_abs)} ₸</td>
                  <td style={{ ...numCell, color: 'var(--red)' }}>−{fmt(Math.abs(cp.out_sum))} ₸</td>
                  <td style={{ ...numCell, color: 'var(--green)' }}>+{fmt(Math.abs(cp.in_sum))} ₸</td>
                  <td style={{ ...numCell, color: 'var(--text2)' }}>{cp.n_ops.toLocaleString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg2)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <PaginationBtn onClick={() => setPage(1)} disabled={page === 1} label="«" />
        <PaginationBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} label="‹" />
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const start = Math.max(1, Math.min(page - 2, totalPages - 4))
          const p = start + i
          return (
            <PaginationBtn
              key={p}
              onClick={() => setPage(p)}
              active={p === page}
              label={p}
            />
          )
        })}
        <PaginationBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} label="›" />
        <PaginationBtn onClick={() => setPage(totalPages)} disabled={page === totalPages} label="»" />
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
          стр. {page} / {totalPages}
        </span>
      </div>
    </div>
  )
}

function PaginationBtn({ onClick, disabled, active, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 28, height: 28, padding: '0 6px',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? '#fff' : disabled ? 'var(--text3)' : 'var(--text2)',
        borderRadius: 6,
        fontSize: 12,
        fontFamily: 'var(--font-mono)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.1s',
      }}
    >{label}</button>
  )
}

const inputStyle = {
  background: 'var(--bg3)',
  border: '1px solid var(--border)',
  borderRadius: 7,
  padding: '6px 10px',
  color: 'var(--text)',
  fontSize: 12,
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  width: 180,
}

const numCell = {
  padding: '9px 14px',
  textAlign: 'right',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  color: 'var(--text)',
}
