import { useState, useEffect } from 'react'
import { supabase }            from '../supabase'
import { useTheme }            from '../context/ThemeContext'
import { getTheme }            from '../context/theme'
import useIsMobile             from '../hooks/useIsMobile'
import useResponsiveGrid       from '../hooks/useResponsiveGrid'

function Stock() {

  const { isDark } = useTheme()
  const theme      = getTheme(isDark)
  const isMobile   = useIsMobile()
  const grids      = useResponsiveGrid()

  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [filter, setFilter]     = useState('All')

  const [form, setForm] = useState({
    name            : '',
    category        : 'Gold',
    box_name        : '',
    total_weight_g  : '',
    box_weight_g    : '',
    reorder_weight_g: ''
  })

  // ── FETCH STOCK ────────────────────────────────────────
  const fetchStock = async () => {
    try {
      setLoading(true)
      setError('')
      const { data, error: err } = await supabase
        .from('stock')
        .select('*')
        .order('created_at', { ascending: false })
      if (err) throw err
      setItems(data || [])
    } catch (_err) {
      setError('Failed to load stock')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStock()
  }, [])

  // ── FILTER ─────────────────────────────────────────────
  const filteredItems = filter === 'All'
    ? items
    : items.filter(i => i.category === filter)

  // ── HANDLE CHANGE ──────────────────────────────────────
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleCategoryChange = (e) => {
    setForm({ ...form, category: e.target.value, box_weight_g: '' })
  }

  // ── ADD ITEM ───────────────────────────────────────────
  const handleAdd = async () => {
    try {
      setError('')
      const totalWeight = parseFloat(form.total_weight_g)
      const boxWeight   = parseFloat(form.box_weight_g) || 0
      const netWeight   = form.category === 'Gold' ? totalWeight : totalWeight - boxWeight

      const { error: err } = await supabase
        .from('stock')
        .insert({
          name            : form.name,
          category        : form.category,
          box_name        : form.box_name || null,
          total_weight_g  : totalWeight,
          box_weight_g    : boxWeight,
          net_weight_g    : netWeight,
          reorder_weight_g: parseFloat(form.reorder_weight_g) || 10
        })

      if (err) throw err

      setForm({ name: '', category: 'Gold', box_name: '', total_weight_g: '', box_weight_g: '', reorder_weight_g: '' })
      setShowForm(false)
      fetchStock()
    } catch (err) {
      setError(err.message || 'Failed to add item')
    }
  }

  // ── EDIT ITEM ──────────────────────────────────────────
  const handleEditClick = (item) => {
    setEditItem(item)
    setForm({
      name            : item.name,
      category        : item.category,
      box_name        : item.box_name || '',
      total_weight_g  : item.total_weight_g,
      box_weight_g    : item.box_weight_g,
      reorder_weight_g: item.reorder_weight_g
    })
    setShowForm(true)
  }

  const handleUpdate = async () => {
    try {
      setError('')
      const totalWeight = parseFloat(form.total_weight_g)
      const boxWeight   = parseFloat(form.box_weight_g) || 0
      const netWeight   = form.category === 'Gold' ? totalWeight : totalWeight - boxWeight

      const { error: err } = await supabase
        .from('stock')
        .update({
          name            : form.name,
          category        : form.category,
          box_name        : form.box_name || null,
          total_weight_g  : totalWeight,
          box_weight_g    : boxWeight,
          net_weight_g    : netWeight,
          reorder_weight_g: parseFloat(form.reorder_weight_g) || 10
        })
        .eq('id', editItem.id)

      if (err) throw err

      setEditItem(null)
      setForm({ name: '', category: 'Gold', box_name: '', total_weight_g: '', box_weight_g: '', reorder_weight_g: '' })
      setShowForm(false)
      fetchStock()
    } catch (err) {
      setError(err.message || 'Failed to update item')
    }
  }

  // ── DELETE ITEM ────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return
    try {
      const { error: err } = await supabase
        .from('stock')
        .delete()
        .eq('id', id)
      if (err) throw err
      fetchStock()
    } catch (_err) {
      setError('Failed to delete item')
    }
  }

  // ── NET WEIGHT PREVIEW ─────────────────────────────────
  const netWeightPreview = form.category !== 'Gold' &&
    form.total_weight_g && form.box_weight_g
      ? (parseFloat(form.total_weight_g) - parseFloat(form.box_weight_g)).toFixed(2)
      : null

  // ── STATUS ─────────────────────────────────────────────
  const getStatus = (item) => {
    if (item.net_weight_g <= 0)                     return { label: 'Out of Stock', color: '#ef4444', bg: '#fee2e2' }
    if (item.net_weight_g <= item.reorder_weight_g) return { label: 'Low Stock',    color: '#f59e0b', bg: '#fef3c7' }
    return                                                  { label: 'In Stock',     color: '#10b981', bg: '#d1fae5' }
  }

  // ── CATEGORY ICON ──────────────────────────────────────
  const getCategoryIcon = (category) => {
    if (category === 'Gold')    return { icon: '🥇', bg: '#fef3c7', color: '#f59e0b' }
    if (category === 'Silver')  return { icon: '🥈', bg: '#f1f5f9', color: '#64748b' }
    if (category === 'Pattilu') return { icon: '💫', bg: '#ede9fe', color: '#8b5cf6' }
    return                             { icon: '📦', bg: '#f1f5f9', color: '#64748b' }
  }

  // ── STOCK SUMMARY ──────────────────────────────────────
  const goldItems    = items.filter(i => i.category === 'Gold')
  const silverItems  = items.filter(i => i.category === 'Silver')
  const pattiluItems = items.filter(i => i.category === 'Pattilu')
  const lowItems     = items.filter(i => i.net_weight_g <= i.reorder_weight_g)

  return (
    <div>

      {/* ── Page Header ── */}
      <div style={{
        display        : 'flex',
        justifyContent : 'space-between',
        alignItems     : 'center',
        marginBottom   : '20px'
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '800', color: theme.textPrimary }}>
            Stock
          </h1>
          <p style={{ fontSize: '13px', color: theme.textSecondary, marginTop: '2px' }}>
            {items.length} items total
          </p>
        </div>
        <button
          onClick={() => {
            setEditItem(null)
            setForm({ name: '', category: 'Gold', box_name: '', total_weight_g: '', box_weight_g: '', reorder_weight_g: '' })
            setShowForm(true)
          }}
          style={{
            backgroundColor: '#1a1a2e', color: 'white', border: 'none',
            padding: '10px 18px', borderRadius: '12px', fontSize: '13px',
            fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(26,26,46,0.3)'
          }}
        >
          + Add Item
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fee2e2', color: '#dc2626',
          padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div style={{ ...grids.grid4, marginBottom: '20px' }}>
        {[
          { label: 'Gold',    count: goldItems.length,    color: '#f59e0b', bg: '#fef3c7', icon: '🥇' },
          { label: 'Silver',  count: silverItems.length,  color: '#64748b', bg: '#f1f5f9', icon: '🥈' },
          { label: 'Pattilu', count: pattiluItems.length, color: '#8b5cf6', bg: '#ede9fe', icon: '💫' },
          { label: 'Low',     count: lowItems.length,     color: '#ef4444', bg: '#fee2e2', icon: '⚠️' },
        ].map((s) => (
          <div key={s.label} style={{
            backgroundColor: theme.cardBg, borderRadius: '14px',
            padding: '14px', border: `1px solid ${theme.border}`, boxShadow: theme.shadowSm
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              backgroundColor: s.bg, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '16px', marginBottom: '8px'
            }}>
              {s.icon}
            </div>
            <p style={{ fontSize: '20px', fontWeight: '800', color: s.color }}>{s.count}</p>
            <p style={{ fontSize: '11px', color: theme.textSecondary, marginTop: '2px' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        {['All', 'Gold', 'Silver', 'Pattilu'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px', borderRadius: '20px',
              border: `1px solid ${filter === f ? '#1a1a2e' : theme.border}`,
              backgroundColor: filter === f ? '#1a1a2e' : theme.cardBg,
              color: filter === f ? 'white' : theme.textSecondary,
              fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              whiteSpace: 'nowrap', boxShadow: theme.shadowSm
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Stock Items ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{
              height: '80px', borderRadius: '16px',
              backgroundColor: theme.cardBg, opacity: 0.5
            }} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{
          backgroundColor: theme.cardBg, borderRadius: '16px',
          padding: '40px', textAlign: 'center', border: `1px solid ${theme.border}`
        }}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>📦</p>
          <p style={{ color: theme.textSecondary, fontSize: '14px' }}>No items found</p>
        </div>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredItems.map((item) => {
            const status  = getStatus(item)
            const catIcon = getCategoryIcon(item.category)
            return (
              <div key={item.id} style={{
                backgroundColor: theme.cardBg, borderRadius: '16px',
                padding: '16px', border: `1px solid ${theme.border}`, boxShadow: theme.shadowSm
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px',
                      backgroundColor: catIcon.bg, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '20px', flexShrink: 0
                    }}>
                      {catIcon.icon}
                    </div>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: '700', color: theme.textPrimary }}>
                        {item.name}
                      </p>
                      <p style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '2px' }}>
                        {item.box_name ? `${item.box_name} • ` : ''}{item.category}
                      </p>
                    </div>
                  </div>
                  <span style={{
                    backgroundColor: status.bg, color: status.color,
                    padding: '4px 10px', borderRadius: '20px',
                    fontSize: '11px', fontWeight: '700', flexShrink: 0
                  }}>
                    {status.label}
                  </span>
                </div>

                <div style={{
                  display: 'flex', gap: '16px', marginTop: '14px',
                  paddingTop: '14px', borderTop: `1px solid ${theme.border}`
                }}>
                  <div>
                    <p style={{ fontSize: '11px', color: theme.textSecondary }}>Net Weight</p>
                    <p style={{ fontSize: '16px', fontWeight: '800', color: catIcon.color }}>
                      {item.net_weight_g}g
                    </p>
                  </div>
                  {item.category !== 'Gold' && (
                    <div>
                      <p style={{ fontSize: '11px', color: theme.textSecondary }}>Box Weight</p>
                      <p style={{ fontSize: '16px', fontWeight: '700', color: theme.textPrimary }}>
                        {item.box_weight_g}g
                      </p>
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: '11px', color: theme.textSecondary }}>Reorder At</p>
                    <p style={{ fontSize: '16px', fontWeight: '700', color: theme.textPrimary }}>
                      {item.reorder_weight_g}g
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    onClick={() => handleEditClick(item)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '10px',
                      border: `1px solid ${theme.border}`, backgroundColor: theme.headerBg,
                      color: theme.textPrimary, fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '10px',
                      border: 'none', backgroundColor: '#fee2e2',
                      color: '#dc2626', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{
          backgroundColor: theme.cardBg, borderRadius: '16px', padding: '24px',
          boxShadow: theme.shadowSm, border: `1px solid ${theme.border}`, overflowX: 'auto'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: theme.headerBg }}>
                {['Item Name','Category','Box Name','Total Wt','Box Wt','Net Wt','Reorder','Status','Actions'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: '13px',
                    fontWeight: '600', color: theme.textSecondary, borderBottom: `1px solid ${theme.border}`
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const status  = getStatus(item)
                const catIcon = getCategoryIcon(item.category)
                return (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: theme.textPrimary }}>
                      {item.name}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        backgroundColor: catIcon.bg, color: catIcon.color,
                        padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600'
                      }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: theme.textPrimary }}>
                      {item.category !== 'Gold' ? item.box_name || '—' : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: theme.textPrimary }}>
                      {item.total_weight_g}g
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: theme.textPrimary }}>
                      {item.category !== 'Gold' ? `${item.box_weight_g}g` : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '700', color: catIcon.color }}>
                      {item.net_weight_g}g
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: theme.textPrimary }}>
                      {item.reorder_weight_g}g
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        backgroundColor: status.bg, color: status.color,
                        padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700'
                      }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEditClick(item)}
                          style={{
                            backgroundColor: '#f59e0b', color: 'white', border: 'none',
                            padding: '6px 14px', borderRadius: '8px', fontSize: '13px',
                            cursor: 'pointer', fontWeight: '600'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          style={{
                            backgroundColor: '#ef4444', color: 'white', border: 'none',
                            padding: '6px 14px', borderRadius: '8px', fontSize: '13px',
                            cursor: 'pointer', fontWeight: '600'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add/Edit Form Modal ── */}
      {/* ── Add/Edit Form Modal ── */}
{showForm && (
  <div style={{
    position       : 'fixed',
    inset          : 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex         : 500,
    display        : 'flex',
    alignItems     : isMobile ? 'flex-end' : 'center',
    justifyContent : 'center',
    backdropFilter : 'blur(4px)',
    overflowY      : 'auto',        // ← ADD THIS
  }}>
    <div style={{
      backgroundColor          : theme.cardBg,
      borderRadius             : isMobile ? '24px 24px 0 0' : '20px',
      padding                  : '24px',
      width                    : isMobile ? '100%' : '480px',
      maxHeight                : isMobile ? '92dvh' : '90vh',  // ← dvh for mobile browsers
      overflowY                : 'auto',
      WebkitOverflowScrolling  : 'touch',   // ← smooth scroll on iOS
      boxShadow                : theme.shadowCard,
      paddingBottom            : isMobile ? '40px' : '24px',   // ← space for home bar
    }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '20px'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: theme.textPrimary }}>
                {editItem ? 'Edit Item' : 'Add Stock Item'}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditItem(null) }}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%', border: 'none',
                  backgroundColor: theme.headerBg, color: theme.textSecondary,
                  fontSize: '16px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Item Name *', name: 'name', placeholder: 'e.g. Gold Chain', type: 'text' },
              ].map(field => (
                <div key={field.name}>
                  <label style={{
                    fontSize: '13px', fontWeight: '600', color: theme.textSecondary,
                    marginBottom: '6px', display: 'block'
                  }}>
                    {field.label}
                  </label>
                  <input
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: '12px',
                      border: `1px solid ${theme.borderInput}`, fontSize: '14px',
                      outline: 'none', backgroundColor: theme.inputBg,
                      color: theme.textPrimary, boxSizing: 'border-box'
                    }}
                    name={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={form[field.name]}
                    onChange={handleChange}
                  />
                </div>
              ))}

              <div>
                <label style={{
                  fontSize: '13px', fontWeight: '600', color: theme.textSecondary,
                  marginBottom: '6px', display: 'block'
                }}>
                  Category *
                </label>
                <select
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: '12px',
                    border: `1px solid ${theme.borderInput}`, fontSize: '14px',
                    outline: 'none', backgroundColor: theme.inputBg,
                    color: theme.textPrimary, boxSizing: 'border-box'
                  }}
                  name="category"
                  value={form.category}
                  onChange={handleCategoryChange}
                >
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                  <option value="Pattilu">Pattilu</option>
                </select>
              </div>

              {form.category !== 'Gold' && (
                <div>
                  <label style={{
                    fontSize: '13px', fontWeight: '600', color: theme.textSecondary,
                    marginBottom: '6px', display: 'block'
                  }}>
                    Box Name
                  </label>
                  <input
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: '12px',
                      border: `1px solid ${theme.borderInput}`, fontSize: '14px',
                      outline: 'none', backgroundColor: theme.inputBg,
                      color: theme.textPrimary, boxSizing: 'border-box'
                    }}
                    name="box_name"
                    placeholder="e.g. Box A"
                    value={form.box_name}
                    onChange={handleChange}
                  />
                </div>
              )}

              <div>
                <label style={{
                  fontSize: '13px', fontWeight: '600', color: theme.textSecondary,
                  marginBottom: '6px', display: 'block'
                }}>
                  {form.category === 'Gold' ? 'Weight (g) *' : 'Total Weight (g) * — box + items'}
                </label>
                <input
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: '12px',
                    border: `1px solid ${theme.borderInput}`, fontSize: '14px',
                    outline: 'none', backgroundColor: theme.inputBg,
                    color: theme.textPrimary, boxSizing: 'border-box'
                  }}
                  name="total_weight_g"
                  type="number"
                  placeholder="Weight in grams"
                  value={form.total_weight_g}
                  onChange={handleChange}
                />
              </div>

              {form.category !== 'Gold' && (
                <div>
                  <label style={{
                    fontSize: '13px', fontWeight: '600', color: theme.textSecondary,
                    marginBottom: '6px', display: 'block'
                  }}>
                    Box Weight (g) *
                  </label>
                  <input
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: '12px',
                      border: `1px solid ${theme.borderInput}`, fontSize: '14px',
                      outline: 'none', backgroundColor: theme.inputBg,
                      color: theme.textPrimary, boxSizing: 'border-box'
                    }}
                    name="box_weight_g"
                    type="number"
                    placeholder="Empty box weight"
                    value={form.box_weight_g}
                    onChange={handleChange}
                  />
                </div>
              )}

              {netWeightPreview && (
                <div style={{
                  backgroundColor: isDark ? '#052e16' : '#f0fdf4',
                  borderRadius: '12px', padding: '12px 14px', border: '1px solid #bbf7d0'
                }}>
                  <p style={{ fontSize: '13px', color: '#10b981', fontWeight: '600' }}>
                    Net Weight = <strong>{netWeightPreview}g</strong>
                  </p>
                </div>
              )}

              <div>
                <label style={{
                  fontSize: '13px', fontWeight: '600', color: theme.textSecondary,
                  marginBottom: '6px', display: 'block'
                }}>
                  Reorder Alert (g)
                </label>
                <input
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: '12px',
                    border: `1px solid ${theme.borderInput}`, fontSize: '14px',
                    outline: 'none', backgroundColor: theme.inputBg,
                    color: theme.textPrimary, boxSizing: 'border-box'
                  }}
                  name="reorder_weight_g"
                  type="number"
                  placeholder="Alert when below this"
                  value={form.reorder_weight_g}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', marginBottom: isMobile ? '80px' : '0px' }}>
              <button
                onClick={editItem ? handleUpdate : handleAdd}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                  backgroundColor: '#1a1a2e', color: 'white',
                  fontSize: '15px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                {editItem ? 'Update Item' : 'Save Item'}
              </button>
              <button
                onClick={() => { setShowForm(false); setEditItem(null) }}
                style={{
                  padding: '14px 20px', borderRadius: '12px',
                  border: `1px solid ${theme.borderInput}`,
                  backgroundColor: theme.headerBg, color: theme.textPrimary,
                  fontSize: '15px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Stock