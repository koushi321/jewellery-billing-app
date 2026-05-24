import useIsMobile       from '../hooks/useIsMobile'
import useResponsiveGrid from '../hooks/useResponsiveGrid'
import { useTheme } from '../context/ThemeContext'
import { getTheme } from '../context/theme'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Stock() {
  const isMobile = useIsMobile()
  const grids    = useResponsiveGrid()
  const { isDark } = useTheme()
  const theme      = getTheme(isDark)
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]               = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const [form, setForm] = useState({
    name            : '',
    category        : 'Gold',
    box_name        : '',
    total_weight_g  : '',
    box_weight_g    : '',
    reorder_weight_g: ''
  })

  const fetchStock = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('stock')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setItems(data || [])
    } catch {
      setError('Failed to load stock')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const loadStock = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('stock')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw error
        if (!cancelled) setItems(data || [])
      } catch {
        if (!cancelled) setError('Failed to load stock')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadStock()
    return () => { cancelled = true }
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // When category changes reset box weight
  const handleCategoryChange = (e) => {
    setForm({
      ...form,
      category    : e.target.value,
      box_weight_g: ''
    })
  }

  const handleAdd = async () => {
    try {
      setError('')
      const total_weight = parseFloat(form.total_weight_g)
      const box_weight = form.category === 'Silver' ? parseFloat(form.box_weight_g) || 0 : 0
      const net_weight = form.category === 'Silver' ? total_weight - box_weight : total_weight

      if (form.category === 'Silver' && net_weight < 0) {
        setError('Total weight must be greater than box weight')
        return
      }

      const { error } = await supabase
        .from('stock')
        .insert({
          name: form.name,
          category: form.category,
          box_name: form.category === 'Silver' ? form.box_name || '' : '',
          total_weight_g: total_weight,
          box_weight_g: box_weight,
          net_weight_g: net_weight,
          reorder_weight_g: parseFloat(form.reorder_weight_g) || 10
        })

      if (error) throw error

      setForm({ name: '', category: 'Gold', box_name: '', total_weight_g: '', box_weight_g: '', reorder_weight_g: '' })
      setShowForm(false)
      fetchStock()
    } catch (err) {
      setError(err.message || 'Failed to add item')
    }
  }

  const handleEditClick = (item) => {
    setEditItem(item)
    setForm({
      name            : item.name,
      category        : item.category,
      box_name        : item.box_name,
      total_weight_g  : item.total_weight_g,
      box_weight_g    : item.box_weight_g,
      reorder_weight_g: item.reorder_weight_g
    })
    setShowForm(true)
  }

  const handleUpdate = async () => {
    try {
      setError('')
      const total_weight = parseFloat(form.total_weight_g)
      const box_weight = (form.category === 'Silver' || form.category === 'Pattilu') ? parseFloat(form.box_weight_g) || 0 : 0
      const net_weight = (form.category === 'Silver' || form.category === 'Pattilu') ? total_weight - box_weight : total_weight

      const { error } = await supabase
        .from('stock')
        .update({
          name: form.name,
          category: form.category,
          box_name: form.category === 'Silver' ? form.box_name || '' : '',
          total_weight_g: total_weight,
          box_weight_g: box_weight,
          net_weight_g: net_weight,
          reorder_weight_g: parseFloat(form.reorder_weight_g),
          updated_at: new Date().toISOString()
        })
        .eq('id', editItem.id)

      if (error) throw error

      setEditItem(null)
      setForm({ name: '', category: 'Gold', box_name: '', total_weight_g: '', box_weight_g: '', reorder_weight_g: '' })
      setShowForm(false)
      fetchStock()
    } catch (err) {
      setError(err.message || 'Failed to update item')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return
    try {
      const { error } = await supabase
        .from('stock')
        .delete()
        .eq('id', id)
      if (error) throw error
      fetchStock()
    } catch {
      setError('Failed to delete item')
    }
  }

  // Net weight preview — only for silver
  const netWeightPreview = form.category === 'Silver' &&
    form.total_weight_g && form.box_weight_g
      ? (parseFloat(form.total_weight_g) - parseFloat(form.box_weight_g)).toFixed(2)
      : null

  const getStatus = (item) => {
    if (item.net_weight_g <= 0)                     return { label: 'Out of Stock', color: '#dc2626' }
    if (item.net_weight_g <= item.reorder_weight_g) return { label: 'Low Stock',    color: '#f59e0b' }
    return                                                  { label: 'In Stock',     color: '#16a34a' }
  }
  const styles = {
  pageHeader: {
    display       : 'flex',
    justifyContent: 'space-between',
    alignItems    : 'center',
    marginBottom  : '24px'
  },
  pageTitle: {
    fontSize  : '24px',
    fontWeight: 'bold',
    color     : theme.textPrimary
  },
  pageSubtitle: {
    fontSize : '14px',
    color    : theme.textSecondary,
    marginTop: '4px'
  },
  addButton: {
    backgroundColor: '#1a1a2e',
    color          : 'white',
    border         : 'none',
    padding        : '10px 20px',
    borderRadius   : '8px',
    fontSize       : '14px',
    fontWeight     : '600',
    cursor         : 'pointer'
  },
  cancelButton: {
    backgroundColor: theme.cardBg,
    color          : theme.textPrimary,
    border         : `1px solid ${theme.borderInput}`,
    padding        : '10px 20px',
    borderRadius   : '8px',
    fontSize       : '14px',
    fontWeight     : '600',
    cursor         : 'pointer'
  },
  error: {
    backgroundColor: '#fee2e2',
    color          : '#dc2626',
    padding        : '12px',
    borderRadius   : '8px',
    marginBottom   : '16px',
    fontSize       : '14px'
  },
  formCard: {
    
  backgroundColor: theme.cardBg,
  borderRadius   : '12px',
  padding        : isMobile ? '16px 12px' : '24px',
  marginBottom   : '24px',
  boxShadow      : theme.shadow,
  border         : `1px solid ${theme.border}`

  },
  formTitle: {
    fontSize    : '18px',
    fontWeight  : '600',
    color       : theme.textPrimary,
    marginBottom: '20px'
  },
  formGrid: {
    ...grids.grid3
  },
  inputGroup: {
    display      : 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize    : '13px',
    fontWeight  : '600',
    color       : theme.textPrimary,
    marginBottom: '6px'
  },
  input: {
    padding        : '10px 12px',
    borderRadius   : '8px',
    border         : `1px solid ${theme.borderInput}`,
    fontSize       : '14px',
    outline        : 'none',
    width          : '100%',
    boxSizing      : 'border-box',
    backgroundColor: theme.inputBg,
    color          : theme.textPrimary
  },
  netWeightPreview: {
    marginTop      : '16px',
    padding        : '12px 16px',
    backgroundColor: isDark ? '#052e16' : '#f0fdf4',
    borderRadius   : '8px',
    fontSize       : '14px',
    color          : '#16a34a',
    border         : '1px solid #bbf7d0'
  },
  formButtons: {
    display  : 'flex',
    gap      : '12px',
    marginTop: '20px'
  },
  tableCard: {
     backgroundColor: theme.cardBg,
    borderRadius   : '12px',
    padding        : isMobile ? '16px 12px' : '24px',
    boxShadow      : theme.shadow,
    border         : `1px solid ${theme.border}`,
    overflowX      : 'auto'
  },
  table: {
    width         : '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    backgroundColor: theme.headerBg
  },
  th: {
    padding     : '12px 16px',
    textAlign   : 'left',
    fontSize    : '13px',
    fontWeight  : '600',
    color       : theme.textSecondary,
    borderBottom: `1px solid ${theme.border}`
  },
  tableRow: {
    borderBottom: `1px solid ${theme.border}`
  },
  td: {
    padding : '14px 16px',
    fontSize: '14px',
    color   : theme.textPrimary
  },
  statusBadge: {
    color        : 'white',
    padding      : '4px 10px',
    borderRadius : '20px',
    fontSize     : '12px',
    fontWeight   : '600'
  },
  editButton: {
    backgroundColor: '#f59e0b',
    color          : 'white',
    border         : 'none',
    padding        : '6px 14px',
    borderRadius   : '6px',
    fontSize       : '13px',
    cursor         : 'pointer',
    marginRight    : '8px'
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    color          : 'white',
    border         : 'none',
    padding        : '6px 14px',
    borderRadius   : '6px',
    fontSize       : '13px',
    cursor         : 'pointer'
  },
  loadingText: {
    color   : theme.textSecondary,
    fontSize: '14px'
  },
  emptyText: {
    color    : theme.textSecondary,
    fontSize : '14px',
    textAlign: 'center',
    padding  : '40px'
  }
}

  return (
    <div>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Stock Management</h1>
          <p style={styles.pageSubtitle}>Manage your gold and silver inventory</p>
        </div>
        <button
          style={styles.addButton}
          onClick={() => {
            setEditItem(null)
            setForm({ name: '', category: 'Gold', box_name: '', total_weight_g: '', box_weight_g: '', reorder_weight_g: '' })
            setShowForm(true)
          }}
        >
          Add Stock Item
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {showForm && (
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>
            {editItem ? 'Edit Stock Item' : 'Add New Stock Item'}
          </h2>

          <div style={styles.formGrid}>

            {/* Item Name */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Item Name *</label>
              <input
                style={styles.input}
                name="name"
                placeholder="e.g. Gold Chain, Silver Ring"
                value={form.name}
                onChange={handleChange}
              />
            </div>

            {/* Category */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Category *</label>
              <select
  style={styles.input}
  name="category"
  value={form.category}
  onChange={handleCategoryChange}
>
  <option value="Gold">Gold</option>
  <option value="Silver">Silver</option>
  <option value="Pattilu">Pattilu</option>
</select>
            </div>

            {/* Box Name - only for silver */}
            {form.category === 'Silver' && (
              <div style={styles.inputGroup}>
                <label style={styles.label}>Box Name</label>
                <input
                  style={styles.input}
                  name="box_name"
                  placeholder="e.g. Box A, Red Box"
                  value={form.box_name}
                  onChange={handleChange}
                />
              </div>
            )}

            {/* Total Weight */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                {form.category === 'Silver'
                  ? 'Total Weight (g) * — box + items'
                  : 'Weight (g) * — actual gold weight'}
              </label>
              <input
                style={styles.input}
                name="total_weight_g"
                type="number"
                placeholder={
                  form.category === 'Silver'
                    ? 'Box + items weight'
                    : 'Actual gold weight'
                }
                value={form.total_weight_g}
                onChange={handleChange}
              />
            </div>

            {/* Box Weight - only for silver */}
            {form.category === 'Silver' && (
              <div style={styles.inputGroup}>
                <label style={styles.label}>Box Weight (g) *</label>
                <input
                  style={styles.input}
                  name="box_weight_g"
                  type="number"
                  placeholder="Empty box weight"
                  value={form.box_weight_g}
                  onChange={handleChange}
                />
              </div>
            )}

            {/* Reorder Level */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Reorder Alert (g)</label>
              <input
                style={styles.input}
                name="reorder_weight_g"
                type="number"
                placeholder="Alert when below this weight"
                value={form.reorder_weight_g}
                onChange={handleChange}
              />
            </div>

          </div>

          {/* Net Weight Preview - only for silver */}
          {netWeightPreview && (
            <div style={styles.netWeightPreview}>
              Net Weight (Silver items only) = <strong>{netWeightPreview} g</strong>
            </div>
          )}

          <div style={styles.formButtons}>
            <button
              style={styles.addButton}
              onClick={editItem ? handleUpdate : handleAdd}
            >
              {editItem ? 'Update Item' : 'Save Item'}
            </button>
            <button
              style={styles.cancelButton}
              onClick={() => {
                setShowForm(false)
                setEditItem(null)
              }}
            >
              Cancel
            </button>
          </div>

        </div>
      )}

      {/* Stock Table */}
      <div style={styles.tableCard}>
        {loading ? (
          <p style={styles.loadingText}>Loading stock...</p>
        ) : items.length === 0 ? (
          <p style={styles.emptyText}>No stock items yet. Add your first item!</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>Item Name</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Box Name</th>
                <th style={styles.th}>Total Wt (g)</th>
                <th style={styles.th}>Box Wt (g)</th>
                <th style={styles.th}>Net Wt (g)</th>
                <th style={styles.th}>Reorder (g)</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const status = getStatus(item)
                return (
                  <tr key={item.id} style={styles.tableRow}>
                    <td style={styles.td}>{item.name}</td>
                    <td style={styles.td}>{item.category}</td>
                    <td style={styles.td}>
                      {item.category === 'Silver' ? item.box_name || '—' : '—'}
                    </td>
                    <td style={styles.td}>{item.total_weight_g} g</td>
                    <td style={styles.td}>
                      {item.category === 'Silver' ? `${item.box_weight_g} g` : '—'}
                    </td>
                    <td style={{ ...styles.td, fontWeight: '600' }}>{item.net_weight_g} g</td>
                    <td style={styles.td}>{item.reorder_weight_g} g</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statusBadge, backgroundColor: status.color }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button style={styles.editButton} onClick={() => handleEditClick(item)}>Edit</button>
                      <button style={styles.deleteButton} onClick={() => handleDelete(item.id)}>Delete</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}



export default Stock