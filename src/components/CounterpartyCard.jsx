import { useMemo, useState, useEffect, useRef } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import NetworkGraph from './NetworkGraph.jsx'

const COLORS = ['#4f8ef7', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#2dd4bf', '#fb923c', '#e879f9']

function fmtK(n) {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(0) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + 'K'
  return n.toFixed(0)
}
function fmtFull(n) {
  return Math.abs(n).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₸'
}

const TABS = ['Обзор', 'Динамика', 'Документы', 'Партнёры']

export default function CounterpartyCard({ cp, transactions, allCps, onClose }) {
  const [tab, setTab] = useState('Обзор')

  // Monthly chart data
  const monthlyData = useMemo(() => {
    return cp.monthly.map(m => ({
      month: m.month.slice(0, 7),
      out: Math.abs(m.out),
      in: Math.abs(m.in),
      net: m.in - m.out,
    }))
  }, [cp])

  // Doc type distribution from cp transactions
  const docData = useMemo(() => {
    const cpTxs = transactions.filter(t => t.sender_id === cp.id || t.receiver_id === cp.id)
    const byDoc = {}
    cpTxs.forEach(t => {
      if (!byDoc[t.doc_type]) byDoc[t.doc_type] = 0
      byDoc[t.doc_type] += Math.abs(t.amount_kzt)
    })
    return Object.entries(byDoc).map(([name, value]) => ({ name, value }))
  }, [cp, transactions])

  // Category distribution
  const catData = useMemo(() => {
    const cpTxs = transactions.filter(t => t.sender_id === cp.id || t.receiver_id === cp.id)
    const byCat = {}
    cpTxs.forEach(t => {
      const k = t.cat_name || 'Прочее'
      if (!byCat[k]) byCat[k] = 0
      byCat[k] += Math.abs(t.amount_kzt)
    })
    return Object.entries(byCat)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [cp, transactions])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{
        background: 'var(--bg3)',
        border: '1px solid var(--border2)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
        fontFamily: 'var(--font-mono)',
      }}>
        <div style={{ color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>{p.name}: {fmtK(p.value)} ₸</div>
        ))}
      </div>
    )
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg)',
      animation: 'slideIn 0.2s ease',
    }}>
      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '14px 20px 0',
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:20, fontWeight:700, letterSpacing:'-0.02em', color:'var(--accent)' }}>
              {cp.id}
            </div>
            <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
              БИН/ИИН контрагента
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background:'none', border:'1px solid var(--border)',
              color:'var(--text3)', borderRadius:7, width:30, height:30,
              fontSize:16, display:'flex', alignItems:'center', justifyContent:'center',
            }}
          >×</button>
        </div>

        {/* Summary row */}
        <div style={{ display:'flex', gap:1, marginBottom: 12, flexWrap:'wrap' }}>
          <StatChip label="Оборот" value={fmtFull(cp.total_abs)} color="var(--accent)" />
          <StatChip label="Исходящие" value={'−' + fmtFull(cp.out_sum)} color="var(--red)" />
          <StatChip label="Входящие" value={'+' + fmtFull(cp.in_sum)} color="var(--green)" />
          <StatChip label="Операций" value={cp.n_ops.toLocaleString()} color="var(--yellow)" />
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4 }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background:'none',
                border:'none',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === t ? 'var(--accent)' : 'var(--text3)',
                padding:'6px 12px',
                fontSize:13,
                fontWeight: tab === t ? 700 : 500,
                transition:'color 0.15s',
              }}
            >{t}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:'auto', padding:16 }}>
        {tab === 'Обзор' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Top 3 partners */}
            <Section title="Топ-3 партнёра">
              {cp.top3.length === 0 ? (
                <div style={{ color:'var(--text3)', fontSize:12 }}>Нет данных</div>
              ) : cp.top3.map((p, i) => (
                <div key={p.partner} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'8px 12px', background:'var(--bg3)', borderRadius:8,
                  border:'1px solid var(--border)',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{
                      width:22, height:22, borderRadius:6,
                      background: COLORS[i] + '30',
                      border:`1px solid ${COLORS[i]}60`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:11, fontWeight:700, color:COLORS[i],
                    }}>{i + 1}</div>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text)' }}>{p.partner}</span>
                  </div>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:COLORS[i], fontWeight:600 }}>
                    {fmtK(p.amount)} ₸
                  </span>
                </div>
              ))}
            </Section>

            {/* Mini monthly turnover preview */}
            <Section title="Динамика оборота">
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={monthlyData.slice(-12)}>
                  <defs>
                    <linearGradient id="gout" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fill:'var(--text3)', fontSize:9, fontFamily:'var(--font-mono)' }} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="out" stroke="#f87171" fill="url(#gout)" strokeWidth={1.5} name="Исход" dot={false} />
                  <Area type="monotone" dataKey="in" stroke="#34d399" fill="url(#gin)" strokeWidth={1.5} name="Вход" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Section>

            {/* Category dist */}
            {catData.length > 0 && (
              <Section title="Категории операций">
                {catData.slice(0,5).map((c, i) => {
                  const max = catData[0].value
                  return (
                    <div key={c.name} style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ fontSize:11, color:'var(--text2)' }}>{c.name}</span>
                        <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:COLORS[i % COLORS.length] }}>{fmtK(c.value)} ₸</span>
                      </div>
                      <div style={{ height:4, background:'var(--bg4)', borderRadius:2 }}>
                        <div style={{ height:'100%', width:`${(c.value/max)*100}%`, background:COLORS[i % COLORS.length], borderRadius:2, transition:'width 0.4s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </Section>
            )}
          </div>
        )}

        {tab === 'Динамика' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <Section title="Помесячный оборот — входящие и исходящие">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} barGap={1}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill:'var(--text3)', fontSize:9, fontFamily:'var(--font-mono)' }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={fmtK} tick={{ fill:'var(--text3)', fontSize:9, fontFamily:'var(--font-mono)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize:11, color:'var(--text2)' }} />
                  <Bar dataKey="out" name="Исходящие" fill="#f87171" radius={[3,3,0,0]} opacity={0.85} />
                  <Bar dataKey="in" name="Входящие" fill="#34d399" radius={[3,3,0,0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </Section>

            <Section title="Чистый поток (входящие − исходящие)">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="gnet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill:'var(--text3)', fontSize:9, fontFamily:'var(--font-mono)' }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={fmtK} tick={{ fill:'var(--text3)', fontSize:9, fontFamily:'var(--font-mono)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="net" stroke="#4f8ef7" fill="url(#gnet)" strokeWidth={2} name="Чистый поток" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Section>
          </div>
        )}

        {tab === 'Документы' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <Section title="Распределение по типам документов">
              {docData.length === 0 ? (
                <div style={{ color:'var(--text3)', fontSize:12 }}>Нет данных в выборке</div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={docData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={3}>
                        {docData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => fmtK(v) + ' ₸'} contentStyle={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, fontSize:11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
                    {docData.map((d, i) => (
                      <div key={d.name} style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:10, height:10, borderRadius:3, background:COLORS[i % COLORS.length], flexShrink:0 }} />
                        <span style={{ fontSize:12, color:'var(--text2)', flex:1 }}>{d.name}</span>
                        <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color:COLORS[i % COLORS.length] }}>{fmtK(d.value)} ₸</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            <Section title="Категории операций">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={catData} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmtK} tick={{ fill:'var(--text3)', fontSize:9, fontFamily:'var(--font-mono)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fill:'var(--text2)', fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Сумма" radius={[0,4,4,0]}>
                    {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Section>
          </div>
        )}

        {tab === 'Партнёры' && (
          <NetworkGraph cp={cp} allCps={allCps} />
        )}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '14px 16px',
    }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:12 }}>{title}</div>
      {children}
    </div>
  )
}

function StatChip({ label, value, color }) {
  return (
    <div style={{
      flex: 1,
      minWidth: 100,
      padding: '8px 12px',
      background: color + '10',
      border: `1px solid ${color}30`,
      borderRadius: 8,
    }}>
      <div style={{ fontSize:10, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:12, fontFamily:'var(--font-mono)', fontWeight:700, color, lineHeight:1.2 }}>{value}</div>
    </div>
  )
}
