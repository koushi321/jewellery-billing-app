import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { supabase }      from '../supabase'
import { useTheme }      from '../context/ThemeContext'
import { getTheme }      from '../context/theme'
import useIsMobile       from '../hooks/useIsMobile'
import CameraScanner     from '../components/CameraScanner'
import {
  printBarcodePdf,
  downloadBarcodePdf,
  labelsPerPage
} from '../utils/barcodePdf'

const STATUS_LABEL = {
  unassigned: 'Unassigned',
  in_stock  : 'In stock',
  sold      : 'Sold'
}

const EMPTY_FORM = {
  name  : '',
  metal : 'Gold',
  purity: '',
  gross : '',
  stone : '',
  notes : ''
}

// Supabase returns at most 1000 rows per request, so load in pages
const fetchAllItems = async () => {
  const pageSize = 1000
  let from = 0
  let all  = []
  for (;;) {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('id', { ascending: false })
      .range(from, from + pageSize - 1)
    if (error) throw error
    all = all.concat(data || [])
    if (!data || data.length < pageSize) break
    from += pageSize
  }
  return all
}

const round3 = (n) => Math.round(n * 1000) / 1000

function Barcode() {
  const { isDark } = useTheme()
  const theme      = getTheme(isDark)
  const isMobile   = useIsMobile()

  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Generate section
  const [qty, setQty]               = useState('100')
  const [labelW, setLabelW]         = useState('45')
  const [labelH, setLabelH]         = useState('25')
  const [cutLines, setCutLines]     = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError]     = useState('')
  const [generated, setGenerated]   = useState([])
  const [pdfError, setPdfError]     = useState('')

  // Scan section
  const scanRef                  = useRef(null)
  const [scanValue, setScanValue] = useState('')
  const [scanMsg, setScanMsg]     = useState(null)
  const [showCamera, setShowCamera] = useState(false)

  // Item form
  const [formItem, setFormItem]   = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving]       = useState(false)

  // List
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected]         = useState(new Set())
  const [visibleCount, setVisibleCount] = useState(100)

  const labelOptions = { labelW, labelH, cutLines }

  // ── LOAD ITEMS ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchAllItems()
        if (!cancelled) setItems(data)
      } catch {
        if (!cancelled) {
          setLoadError('Failed to load barcodes. Make sure the SQL setup was run in Supabase.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!isMobile && scanRef.current) scanRef.current.focus()
  }, [isMobile])

  const focusScan = () => {
    if (!isMobile && scanRef.current) scanRef.current.focus()
  }

  // ── STATS + FILTERED LIST ──────────────────────────────
  const stats = useMemo(() => {
    const s = { unassigned: 0, in_stock: 0, sold: 0 }
    items.forEach((i) => { if (s[i.status] !== undefined) s[i.status] += 1 })
    return s
  }, [items])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false
      if (!q) return true
      return [i.barcode, i.name, i.metal, i.purity]
        .some((v) => (v || '').toLowerCase().includes(q))
    })
  }, [items, search, statusFilter])

  const visible = filtered.slice(0, visibleCount)

  // ── GENERATE BARCODES ──────────────────────────────────
  const handleGenerate = async () => {
    const n = Number(qty)
    if (!Number.isInteger(n) || n < 1 || n > 500) {
      setGenError('Enter a whole number between 1 and 500')
      return
    }
    try {
      setGenerating(true)
      setGenError('')
      setPdfError('')
      const { data, error } = await supabase.rpc('generate_barcodes', { p_qty: n })
      if (error) throw error
      const rows = [...(data || [])].sort((a, b) => a.barcode.localeCompare(b.barcode))
      setGenerated(rows.map((r) => r.barcode))
      setItems((prev) => [...rows].reverse().concat(prev))
    } catch {
      setGenError('Could not generate barcodes. Make sure the SQL setup was run in Supabase and you are logged in.')
    } finally {
      setGenerating(false)
    }
  }

  const runPdf = (action, codes) => {
    try {
      setPdfError('')
      action(codes, labelOptions)
    } catch {
      setPdfError('Could not create the PDF. Please try again.')
    }
  }

  const selectedCodes = useMemo(
    () => items.filter((i) => selected.has(i.id)).map((i) => i.barcode).sort(),
    [items, selected]
  )

  // ── SCAN ───────────────────────────────────────────────
  const openForm = useCallback((item) => {
    setFormItem(item)
    setFormError('')
    setForm({
      name  : item.name || '',
      metal : item.metal || 'Gold',
      purity: item.purity || '',
      gross : item.gross_weight_g ?? '',
      stone : item.stone_weight_g ?? '',
      notes : item.notes || ''
    })
  }, [])

  const lookup = useCallback(async (raw) => {
    const code = String(raw || '').trim().toUpperCase()
    if (!code) return
    setScanMsg(null)
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('barcode', code)
      .maybeSingle()

    if (error) {
      setScanMsg({ type: 'error', text: 'Could not look up the barcode. Check your connection.' })
      return
    }
    if (!data) {
      setScanMsg({ type: 'error', text: `Barcode ${code} was not found. It was not generated by this app.` })
      return
    }
    if (data.status === 'sold') {
      setScanMsg({ type: 'warn', text: `${code} is already sold${data.name ? ` (${data.name})` : ''}.` })
      return
    }
    openForm(data)
  }, [openForm])

  const handleScanKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const value = scanValue
      setScanValue('')
      lookup(value)
    }
  }

  const handleCameraScan = (text) => {
    setShowCamera(false)
    lookup(text)
  }

  // ── SAVE ITEM DETAILS ──────────────────────────────────
  const gross = parseFloat(form.gross)
  const stone = form.stone === '' ? 0 : parseFloat(form.stone)
  const net   = Number.isFinite(gross) && Number.isFinite(stone) ? round3(gross - stone) : null

  const handleSave = async () => {
    if (!form.name.trim())               { setFormError('Enter the item name'); return }
    if (!Number.isFinite(gross) || gross <= 0) { setFormError('Enter the gross weight'); return }
    if (!Number.isFinite(stone) || stone < 0)  { setFormError('Stone weight cannot be negative'); return }
    if (stone >= gross)                  { setFormError('Stone weight must be less than gross weight'); return }

    try {
      setSaving(true)
      setFormError('')
      const { data, error } = await supabase
        .from('items')
        .update({
          name          : form.name.trim(),
          metal         : form.metal,
          purity        : form.purity.trim() || null,
          gross_weight_g: gross,
          stone_weight_g: stone,
          net_weight_g  : round3(gross - stone),
          notes         : form.notes.trim() || null,
          status        : 'in_stock',
          updated_at    : new Date().toISOString()
        })
        .eq('id', formItem.id)
        .neq('status', 'sold')
        .select()
        .single()
      if (error) throw error

      setItems((prev) => prev.map((i) => (i.id === data.id ? data : i)))
      setScanMsg({ type: 'success', text: `${data.barcode} saved: ${data.name}, net ${data.net_weight_g} g` })
      setFormItem(null)
      focusScan()
    } catch {
      setFormError('Could not save. The item may already be sold, or the connection failed.')
    } finally {
      setSaving(false)
    }
  }

  const closeForm = () => {
    setFormItem(null)
    focusScan()
  }

  // ── DELETE ─────────────────────────────────────────────
  const handleDelete = async (item) => {
    if (!window.confirm(`Delete ${item.barcode}? The sticker with this ID can no longer be used.`)) return
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', item.id)
      .neq('status', 'sold')
    if (error) {
      setScanMsg({ type: 'error', text: `Could not delete ${item.barcode}.` })
      return
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(item.id)
      return next
    })
  }

  // ── SELECTION ──────────────────────────────────────────
  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.id))

  const toggleAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) filtered.forEach((i) => next.delete(i.id))
      else filtered.forEach((i) => next.add(i.id))
      return next
    })
  }

  // ── STYLES ─────────────────────────────────────────────
  const card = {
    backgroundColor: theme.cardBg,
    borderRadius   : '16px',
    padding        : isMobile ? '16px' : '22px',
    boxShadow      : theme.shadow,
    border         : `1px solid ${theme.border}`,
    marginBottom   : '20px'
  }
  const input = {
    width          : '100%',
    padding        : '11px 12px',
    borderRadius   : '8px',
    border         : `1px solid ${theme.borderInput}`,
    backgroundColor: theme.inputBg,
    color          : theme.textPrimary,
    fontSize       : '14px',
    outline        : 'none',
    boxSizing      : 'border-box'
  }
  const label = {
    display     : 'block',
    marginBottom: '6px',
    fontSize    : '12px',
    fontWeight  : '600',
    color       : theme.textSecondary
  }
  const btnPrimary = {
    padding        : '11px 18px',
    borderRadius   : '8px',
    border         : 'none',
    backgroundColor: '#f59e0b',
    color          : 'white',
    fontSize       : '14px',
    fontWeight     : '700',
    cursor         : 'pointer'
  }
  const btnGhost = {
    padding        : '11px 18px',
    borderRadius   : '8px',
    border         : `1px solid ${theme.border}`,
    backgroundColor: 'transparent',
    color          : theme.textPrimary,
    fontSize       : '14px',
    fontWeight     : '600',
    cursor         : 'pointer'
  }
  const sectionTitle = {
    fontSize    : '16px',
    fontWeight  : '700',
    color       : theme.textPrimary,
    marginBottom: '4px'
  }
  const hint = { fontSize: '12px', color: theme.textSecondary, marginBottom: '14px' }

  const badge = (status) => {
    const colors = {
      unassigned: { bg: isDark ? '#2a2000' : '#fef3c7', fg: '#d97706' },
      in_stock  : { bg: isDark ? '#052e1c' : '#d1fae5', fg: '#059669' },
      sold      : { bg: isDark ? '#1f2937' : '#e2e8f0', fg: isDark ? '#9ca3af' : '#475569' }
    }[status] || { bg: '#e2e8f0', fg: '#475569' }
    return {
      display        : 'inline-block',
      padding        : '3px 10px',
      borderRadius   : '20px',
      fontSize       : '11px',
      fontWeight     : '700',
      backgroundColor: colors.bg,
      color          : colors.fg,
      whiteSpace     : 'nowrap'
    }
  }

  const msgColors = {
    success: { bg: '#d1fae5', fg: '#065f46' },
    warn   : { bg: '#fef3c7', fg: '#92400e' },
    error  : { bg: '#fee2e2', fg: '#dc2626' }
  }

  const perPage = labelsPerPage(labelOptions)

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '22px' }}>
        <h1 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: '800', color: theme.textPrimary }}>
          Barcode
        </h1>
        <p style={{ fontSize: '14px', color: theme.textSecondary, marginTop: '4px' }}>
          Generate stickers in bulk, then scan a sticker to save the item details.
        </p>
      </div>

      {loadError && (
        <div style={{ ...card, backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '14px' }}>
          {loadError}
        </div>
      )}

      {/* Stats */}
      <div style={{
        display            : 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap                : isMobile ? '10px' : '16px',
        marginBottom       : '20px'
      }}>
        {[
          { key: 'unassigned', title: 'Blank stickers' },
          { key: 'in_stock',   title: 'In stock' },
          { key: 'sold',       title: 'Sold' }
        ].map((s) => (
          <div key={s.key} style={{
            backgroundColor: theme.cardBg,
            borderRadius   : '14px',
            padding        : isMobile ? '12px' : '18px',
            border         : `1px solid ${theme.border}`,
            boxShadow      : theme.shadowSm
          }}>
            <div style={{ fontSize: '11px', color: theme.textSecondary, fontWeight: '600' }}>{s.title}</div>
            <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '800', color: theme.textPrimary }}>
              {stats[s.key]}
            </div>
          </div>
        ))}
      </div>

      {/* Generate */}
      <div style={card}>
        <div style={sectionTitle}>Generate new barcodes</div>
        <div style={hint}>
          Creates blank barcode IDs (no item details yet). Print them or download the PDF for the printing shop.
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-end' }}>
          <div style={{ width: isMobile ? '100%' : '140px' }}>
            <label style={label}>How many (max 500)</label>
            <input
              style={input}
              type="number"
              min="1"
              max="500"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <div style={{ width: isMobile ? 'calc(50% - 7px)' : '140px' }}>
            <label style={label}>Sticker width (mm)</label>
            <input style={input} type="number" value={labelW} onChange={(e) => setLabelW(e.target.value)} />
          </div>
          <div style={{ width: isMobile ? 'calc(50% - 7px)' : '140px' }}>
            <label style={label}>Sticker height (mm)</label>
            <input style={input} type="number" value={labelH} onChange={(e) => setLabelH(e.target.value)} />
          </div>
          <label style={{
            display    : 'flex',
            alignItems : 'center',
            gap        : '8px',
            fontSize   : '13px',
            color      : theme.textPrimary,
            paddingBottom: '12px',
            cursor     : 'pointer'
          }}>
            <input type="checkbox" checked={cutLines} onChange={(e) => setCutLines(e.target.checked)} />
            Show cut lines
          </label>
          <button
            style={{ ...btnPrimary, width: isMobile ? '100%' : 'auto', opacity: generating ? 0.6 : 1 }}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate Barcodes'}
          </button>
        </div>

        <div style={{ ...hint, marginTop: '12px', marginBottom: 0 }}>
          A4 sheet fits {perPage} stickers at this size. Tell the printing shop the same sticker size.
        </div>

        {genError && (
          <div style={{ marginTop: '12px', padding: '10px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '13px' }}>
            {genError}
          </div>
        )}

        {generated.length > 0 && (
          <div style={{
            marginTop      : '16px',
            padding        : '14px',
            borderRadius   : '10px',
            backgroundColor: isDark ? '#052e1c' : '#ecfdf5',
            border         : `1px solid ${isDark ? '#065f46' : '#a7f3d0'}`
          }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: isDark ? '#6ee7b7' : '#065f46', marginBottom: '10px' }}>
              {generated.length} barcodes created: {generated[0]} to {generated[generated.length - 1]}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button style={btnPrimary} onClick={() => runPdf(printBarcodePdf, generated)}>Print</button>
              <button style={btnGhost} onClick={() => runPdf(downloadBarcodePdf, generated)}>Download PDF</button>
            </div>
          </div>
        )}

        {pdfError && (
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#dc2626' }}>{pdfError}</div>
        )}
      </div>

      {/* Scan */}
      <div style={card}>
        <div style={sectionTitle}>Scan a sticker to add item details</div>
        <div style={hint}>
          Use a barcode scanner (click the box first) or the camera. The details form opens for that sticker.
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            ref={scanRef}
            style={{ ...input, flex: 1, minWidth: '200px' }}
            placeholder="Scan or type barcode, then press Enter"
            value={scanValue}
            onChange={(e) => setScanValue(e.target.value)}
            onKeyDown={handleScanKey}
            autoComplete="off"
          />
          <button style={btnGhost} onClick={() => lookup(scanValue) || setScanValue('')}>
            Find
          </button>
          <button style={btnPrimary} onClick={() => setShowCamera(true)}>
            Scan with camera
          </button>
        </div>

        {scanMsg && (
          <div style={{
            marginTop      : '12px',
            padding        : '10px 12px',
            borderRadius   : '8px',
            backgroundColor: msgColors[scanMsg.type].bg,
            color          : msgColors[scanMsg.type].fg,
            fontSize       : '13px'
          }}>
            {scanMsg.text}
          </div>
        )}
      </div>

      {/* List */}
      <div style={card}>
        <div style={sectionTitle}>All barcodes</div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '12px 0' }}>
          <input
            style={{ ...input, flex: 1, minWidth: '180px' }}
            placeholder="Search ID, name, metal, purity"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setVisibleCount(100) }}
          />
          <select
            style={{ ...input, width: isMobile ? '100%' : '160px' }}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setVisibleCount(100) }}
          >
            <option value="all">All</option>
            <option value="unassigned">Unassigned</option>
            <option value="in_stock">In stock</option>
            <option value="sold">Sold</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', color: theme.textSecondary }}>
            {selected.size} selected
          </span>
          <button
            style={{ ...btnGhost, padding: '8px 14px', opacity: selectedCodes.length ? 1 : 0.5 }}
            disabled={!selectedCodes.length}
            onClick={() => runPdf(printBarcodePdf, selectedCodes)}
          >
            Print selected
          </button>
          <button
            style={{ ...btnGhost, padding: '8px 14px', opacity: selectedCodes.length ? 1 : 0.5 }}
            disabled={!selectedCodes.length}
            onClick={() => runPdf(downloadBarcodePdf, selectedCodes)}
          >
            Download selected PDF
          </button>
          {selected.size > 0 && (
            <button
              style={{ ...btnGhost, padding: '8px 14px' }}
              onClick={() => setSelected(new Set())}
            >
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: theme.textSecondary }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: theme.textSecondary, fontSize: '14px' }}>
            No barcodes found.
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px', display: 'table' }}>
                <thead>
                  <tr style={{ backgroundColor: theme.headerBg }}>
                    <th style={{ padding: '10px', textAlign: 'left', width: '36px' }}>
                      <input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFiltered} />
                    </th>
                    {['Barcode', 'Item', 'Metal', 'Purity', 'Net wt (g)', 'Status', ''].map((h) => (
                      <th key={h} style={{
                        padding      : '10px',
                        textAlign    : 'left',
                        fontSize     : '12px',
                        fontWeight   : '700',
                        color        : theme.textSecondary,
                        whiteSpace   : 'nowrap'
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((i) => (
                    <tr key={i.id} style={{ borderTop: `1px solid ${theme.border}` }}>
                      <td style={{ padding: '10px' }}>
                        <input
                          type="checkbox"
                          checked={selected.has(i.id)}
                          onChange={() => toggleOne(i.id)}
                        />
                      </td>
                      <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: '700', color: theme.textPrimary, whiteSpace: 'nowrap' }}>
                        {i.barcode}
                      </td>
                      <td style={{ padding: '10px', color: theme.textPrimary, fontSize: '14px' }}>{i.name || '-'}</td>
                      <td style={{ padding: '10px', color: theme.textSecondary, fontSize: '14px' }}>{i.metal || '-'}</td>
                      <td style={{ padding: '10px', color: theme.textSecondary, fontSize: '14px' }}>{i.purity || '-'}</td>
                      <td style={{ padding: '10px', color: theme.textPrimary, fontSize: '14px' }}>
                        {i.net_weight_g ?? '-'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={badge(i.status)}>{STATUS_LABEL[i.status] || i.status}</span>
                      </td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                        {i.status !== 'sold' && (
                          <>
                            <button
                              style={{ ...btnGhost, padding: '6px 12px', fontSize: '12px', marginRight: '6px' }}
                              onClick={() => openForm(i)}
                            >
                              {i.status === 'unassigned' ? 'Add details' : 'Edit'}
                            </button>
                            <button
                              style={{ ...btnGhost, padding: '6px 12px', fontSize: '12px', color: '#ef4444' }}
                              onClick={() => handleDelete(i)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filtered.length > visible.length && (
              <div style={{ textAlign: 'center', marginTop: '14px' }}>
                <button style={btnGhost} onClick={() => setVisibleCount((c) => c + 100)}>
                  Show more ({filtered.length - visible.length} left)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Camera */}
      {showCamera && (
        <CameraScanner onScan={handleCameraScan} onClose={() => setShowCamera(false)} />
      )}

      {/* Item form */}
      {formItem && (
        <div style={{
          position       : 'fixed',
          inset          : 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex         : 1500,
          display        : 'flex',
          alignItems     : 'center',
          justifyContent : 'center',
          padding        : '16px'
        }}>
          <div style={{
            backgroundColor: theme.overlayBg,
            borderRadius   : '16px',
            padding        : isMobile ? '18px' : '26px',
            width          : '100%',
            maxWidth       : '480px',
            maxHeight      : '92dvh',
            overflowY      : 'auto',
            boxShadow      : theme.shadowCard
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: theme.textPrimary }}>
                {formItem.status === 'unassigned' ? 'Add item details' : 'Edit item details'}
              </div>
              <button
                onClick={closeForm}
                style={{ border: 'none', backgroundColor: 'transparent', color: theme.textSecondary, fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            <div style={{
              fontFamily: 'monospace',
              fontWeight: '700',
              color     : '#f59e0b',
              fontSize  : '15px',
              marginBottom: '16px'
            }}>
              {formItem.barcode}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={label}>Item name *</label>
              <input
                style={input}
                placeholder="e.g. Gold ring, Silver anklet"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}>
                <label style={label}>Metal *</label>
                <select
                  style={input}
                  value={form.metal}
                  onChange={(e) => setForm({ ...form, metal: e.target.value })}
                >
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Purity</label>
                <input
                  style={input}
                  list="purity-options"
                  placeholder={form.metal === 'Gold' ? '22K' : '925'}
                  value={form.purity}
                  onChange={(e) => setForm({ ...form, purity: e.target.value })}
                />
                <datalist id="purity-options">
                  {(form.metal === 'Gold' ? ['24K', '22K', '18K'] : ['999', '925', '800'])
                    .map((p) => <option key={p} value={p} />)}
                </datalist>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}>
                <label style={label}>Gross weight (g) *</label>
                <input
                  style={input}
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.gross}
                  onChange={(e) => setForm({ ...form, gross: e.target.value })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Stone weight (g)</label>
                <input
                  style={input}
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0"
                  value={form.stone}
                  onChange={(e) => setForm({ ...form, stone: e.target.value })}
                />
              </div>
            </div>

            <div style={{
              padding        : '10px 12px',
              borderRadius   : '8px',
              backgroundColor: theme.inputBg,
              border         : `1px solid ${theme.borderInput}`,
              marginBottom   : '14px',
              fontSize       : '14px',
              color          : theme.textSecondary
            }}>
              Net weight:{' '}
              <strong style={{ color: theme.textPrimary }}>
                {net !== null && net > 0 ? `${net} g` : '-'}
              </strong>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={label}>Notes (optional)</label>
              <input
                style={input}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            {formError && (
              <div style={{ marginBottom: '14px', padding: '10px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '13px' }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{ ...btnGhost, flex: 1 }} onClick={closeForm}>Cancel</button>
              <button
                style={{ ...btnPrimary, flex: 1, opacity: saving ? 0.6 : 1 }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Barcode
