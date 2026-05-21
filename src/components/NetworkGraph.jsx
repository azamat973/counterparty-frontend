import { useEffect, useRef, useMemo } from 'react'

const COLORS = ['#4f8ef7', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#2dd4bf', '#fb923c', '#e879f9']

function fmtK(n) {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(0) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + 'K'
  return n.toFixed(0)
}

export default function NetworkGraph({ cp, allCps }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const stateRef = useRef(null)

  const graphData = useMemo(() => {
    const center = { id: cp.id, x: 0, y: 0, r: 30, color: '#4f8ef7', isCenter: true, amount: cp.total_abs }
    const partners = cp.top3.slice(0, 6).map((p, i) => ({
      id: p.partner,
      amount: p.amount,
      r: Math.max(14, Math.min(22, 14 + (p.amount / cp.top3[0].amount) * 8)),
      color: COLORS[(i + 1) % COLORS.length],
      isCenter: false,
    }))

    // Also add 2nd-level neighbors from allCps for richer graph
    const extra = allCps
      .filter(c => c.id !== cp.id && !partners.find(p => p.id === c.id))
      .slice(0, 4)
      .map((c, i) => ({
        id: c.id,
        amount: c.total_abs / 10,
        r: 10,
        color: '#505a6e',
        isCenter: false,
        isExtra: true,
      }))

    const nodes = [center, ...partners, ...extra]
    const links = [
      ...partners.map(p => ({ source: cp.id, target: p.id, weight: p.amount })),
      ...extra.map((e, i) => ({ source: partners[i % partners.length]?.id || cp.id, target: e.id, weight: e.amount })),
    ]

    return { nodes, links }
  }, [cp, allCps])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height

    // Place nodes in a radial layout
    const nodes = graphData.nodes.map((n, i) => {
      if (n.isCenter) return { ...n, x: W / 2, y: H / 2, vx: 0, vy: 0 }
      if (n.isExtra) {
        const angle = (i / graphData.nodes.length) * Math.PI * 2
        return { ...n, x: W / 2 + Math.cos(angle) * 160, y: H / 2 + Math.sin(angle) * 120, vx: 0, vy: 0 }
      }
      const angle = ((i - 1) / (graphData.nodes.length - 1)) * Math.PI * 2
      return { ...n, x: W / 2 + Math.cos(angle) * 110, y: H / 2 + Math.sin(angle) * 90, vx: 0, vy: 0 }
    })

    let hoveredNode = null
    stateRef.current = { nodes, hoveredNode }

    function draw() {
      ctx.clearRect(0, 0, W, H)

      // Draw links
      graphData.links.forEach(link => {
        const src = nodes.find(n => n.id === link.source)
        const tgt = nodes.find(n => n.id === link.target)
        if (!src || !tgt) return
        const isHovered = hoveredNode && (hoveredNode.id === src.id || hoveredNode.id === tgt.id)
        ctx.beginPath()
        ctx.moveTo(src.x, src.y)
        ctx.lineTo(tgt.x, tgt.y)
        ctx.strokeStyle = isHovered ? '#4f8ef780' : '#2e354740'
        ctx.lineWidth = isHovered ? 2 : 1
        ctx.stroke()

        if (isHovered) {
          const mx = (src.x + tgt.x) / 2
          const my = (src.y + tgt.y) / 2
          ctx.font = '9px JetBrains Mono, monospace'
          ctx.fillStyle = '#8b95ab'
          ctx.textAlign = 'center'
          ctx.fillText(fmtK(link.weight) + ' ₸', mx, my - 6)
        }
      })

      // Draw nodes
      nodes.forEach(node => {
        const isHov = hoveredNode?.id === node.id
        const grd = ctx.createRadialGradient(node.x - node.r * 0.3, node.y - node.r * 0.3, 0, node.x, node.y, node.r)
        grd.addColorStop(0, node.color + (node.isCenter ? 'ff' : 'cc'))
        grd.addColorStop(1, node.color + '44')

        // Glow
        if (node.isCenter || isHov) {
          ctx.beginPath()
          ctx.arc(node.x, node.y, node.r + 8, 0, Math.PI * 2)
          ctx.fillStyle = node.color + '18'
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(node.x, node.y, isHov ? node.r + 2 : node.r, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()
        ctx.strokeStyle = node.color
        ctx.lineWidth = node.isCenter ? 2 : 1
        ctx.stroke()

        // Label
        ctx.font = `${node.isCenter ? 'bold ' : ''}${node.isCenter ? 10 : 8}px JetBrains Mono, monospace`
        ctx.fillStyle = node.isExtra ? '#505a6e' : '#e8ecf4'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const short = node.id.slice(-6)
        if (!node.isExtra) ctx.fillText(short, node.x, node.y)

        if (isHov && !node.isCenter) {
          ctx.font = '9px JetBrains Mono, monospace'
          ctx.fillStyle = node.color
          ctx.fillText(node.id, node.x, node.y + node.r + 12)
        }
      })
    }

    // Simple force sim
    function tick() {
      nodes.forEach(n => {
        if (n.isCenter) return
        // repulsion from others
        nodes.forEach(o => {
          if (o.id === n.id) return
          const dx = n.x - o.x, dy = n.y - o.y
          const d = Math.sqrt(dx * dx + dy * dy) || 1
          const force = 1200 / (d * d)
          n.vx += (dx / d) * force
          n.vy += (dy / d) * force
        })
        // attraction to center
        const dx = W / 2 - n.x, dy = H / 2 - n.y
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        const strength = n.isExtra ? 0.008 : 0.012
        n.vx += dx * strength
        n.vy += dy * strength
        // damping
        n.vx *= 0.85
        n.vy *= 0.85
        n.x += n.vx
        n.y += n.vy
        // bounds
        n.x = Math.max(n.r + 5, Math.min(W - n.r - 5, n.x))
        n.y = Math.max(n.r + 5, Math.min(H - n.r - 5, n.y))
      })
      draw()
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)

    // Mouse hover
    function onMouseMove(e) {
      const rect = canvas.getBoundingClientRect()
      const mx = (e.clientX - rect.left) * (W / rect.width)
      const my = (e.clientY - rect.top) * (H / rect.height)
      hoveredNode = nodes.find(n => {
        const dx = n.x - mx, dy = n.y - my
        return Math.sqrt(dx * dx + dy * dy) < n.r + 4
      }) || null
      canvas.style.cursor = hoveredNode ? 'pointer' : 'default'
    }
    canvas.addEventListener('mousemove', onMouseMove)

    return () => {
      cancelAnimationFrame(animRef.current)
      canvas.removeEventListener('mousemove', onMouseMove)
    }
  }, [graphData])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{
        background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px'
      }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:12 }}>
          Граф партнёрских связей (Top-N)
        </div>
        <canvas
          ref={canvasRef}
          width={560}
          height={320}
          style={{ width:'100%', height:'auto', borderRadius:8, background:'var(--bg3)' }}
        />
        <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:8 }}>
          <Legend color="#4f8ef7" label="Выбранный контрагент" />
          {graphData.nodes.filter(n => !n.isCenter && !n.isExtra).map((n, i) => (
            <Legend key={n.id} color={COLORS[(i + 1) % COLORS.length]} label={`Партнёр: ${n.id.slice(-6)}`} />
          ))}
          <Legend color="#505a6e" label="Прочие контрагенты" />
        </div>
      </div>

      <div style={{
        background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px'
      }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:12 }}>
          Детали партнёров
        </div>
        {cp.top3.map((p, i) => (
          <div key={p.partner} style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'8px 12px', background:'var(--bg3)', borderRadius:8, border:'1px solid var(--border)',
            marginBottom:6,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{
                width:8, height:8, borderRadius:'50%', background:COLORS[(i + 1) % COLORS.length],
              }} />
              <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text)' }}>{p.partner}</span>
            </div>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:COLORS[(i + 1) % COLORS.length], fontWeight:600 }}>
              {fmtK(p.amount)} ₸
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <div style={{ width:10, height:10, borderRadius:'50%', background:color, flexShrink:0 }} />
      <span style={{ fontSize:10, color:'var(--text3)' }}>{label}</span>
    </div>
  )
}
