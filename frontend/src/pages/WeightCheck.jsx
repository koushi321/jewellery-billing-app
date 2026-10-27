import useIsMobile       from '../hooks/useIsMobile'
import useResponsiveGrid from '../hooks/useResponsiveGrid'
import { useTheme } from '../context/ThemeContext'
import { getTheme } from '../context/theme'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function WeightCheck() {
  const isMobile = useIsMobile()
  const grids    = useResponsiveGrid()
  const today = new Date().toISOString().split('T')[0]
  const { isDark } = useTheme()
  const theme      = getTheme(isDark)
  const [pattiluItems, setPattiluItems] = useState([])
  const [todayChecks, setTodayChecks]   = useState([])
  const [history, setHistory]           = useState([])
  const [activeTab, setActiveTab]       = useState('check')
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState('')

  // Actual weights entered by user
  const [actualWeights, setActualWeights] = useState({})
  const [notes, setNotes]                 = useState({})

  // ── FETCH DATA ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const load = async () => {
        

      try {
        setLoading(true)
        setError('')

        // Fetch Pattilu Stock Items
        const { data: stockData, error: stockErr } = await supabase
          .from('stock')
          .select('*')
          .eq('category', 'Pattilu')
          .order('name', { ascending: true })

        if (stockErr) throw stockErr

        // Fetch Today's Checks
        const { data: checksData, error: checksErr } = await supabase
          .from('weight_checks')
          .select('*')
          .eq('check_date', today)

        if (checksErr) throw checksErr

        // Fetch History
        const { data: historyData, error: historyErr } = await supabase
          .from('weight_checks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)

        if (historyErr) throw historyErr

        if (!cancelled) {
          setPattiluItems(stockData || [])
          setTodayChecks(checksData || [])
          setHistory(historyData || [])

          // Pre fill actual weights if already checked today
          const weights = {};
          const notesMap = {};
          (checksData || []).forEach(check => {
            weights[check.item_id]  = check.actual_weight
            notesMap[check.item_id] = check.notes
          })
          setActualWeights(weights)
          setNotes(notesMap)
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) setError('Failed to load data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── SAVE CHECKS ────────────────────────────────────────
  const handleSaveChecks = async () => {
    setError('')
    setSuccess('')

    const checks = pattiluItems
      .filter(item => actualWeights[item.id] !== undefined && actualWeights[item.id] !== '')
      .map(item => ({
        item_id        : item.id,
        item_name      : item.name,
        expected_weight: item.total_weight_g,
        actual_weight  : parseFloat(actualWeights[item.id]),
        notes          : notes[item.id] || ''
      }))

    if (checks.length === 0) {
      setError('Please enter at least one weight')
      return
    }

    try {
      setLoading(true)

      // 1. Delete today's checks to avoid duplicates
      const { error: delErr } = await supabase
        .from('weight_checks')
        .delete()
        .eq('check_date', today)

      if (delErr) throw delErr

      // 2. Insert new checks
      const insertData = checks.map(check => {
        const difference = check.actual_weight - check.expected_weight
        const status     = Math.abs(difference) <= 0.5 ? 'match' : 'mismatch'
        return {
          check_date: today,
          item_id: check.item_id,
          item_name: check.item_name,
          expected_weight: check.expected_weight,
          actual_weight: check.actual_weight,
          difference,
          status,
          notes: check.notes || ''
        }
      })

      const { error: insErr } = await supabase
        .from('weight_checks')
        .insert(insertData)

      if (insErr) throw insErr

      setSuccess('Weight check saved successfully!')

      // Refresh data
      const { data: checksData, error: checksErr } = await supabase
        .from('weight_checks')
        .select('*')
        .eq('check_date', today)

      const { data: historyData, error: historyErr } = await supabase
        .from('weight_checks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (!checksErr) setTodayChecks(checksData || [])
      if (!historyErr) setHistory(historyData || [])

      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error(err)
      setError('Failed to save weight check')
    } finally {
      setLoading(false)
    }
  }

  // ── GET STATUS COLOR ───────────────────────────────────
  const getStatusColor = (status) => {
    return status === 'match' ? '#16a34a' : '#dc2626'
  }

  // ── RENDER ─────────────────────────────────────────────
  const styles = {
  pageHeader: {
    display       : 'flex',
  flexDirection : isMobile ? 'column' : 'row',
  justifyContent: 'space-between',
  alignItems    : isMobile ? 'flex-start' : 'flex-end',
  gap           : isMobile ? '12px' : '0',
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
  dateBox: {
    display        : 'flex',
    flexDirection  : 'column',
    alignItems     : 'flex-end',
    backgroundColor: theme.cardBg,
    padding        : '12px 20px',
    borderRadius   : '10px',
    boxShadow      : theme.shadow,
    border         : `1px solid ${theme.border}`
  },
  dateLabel: {
    fontSize: '12px',
    color   : theme.textSecondary
  },
  dateValue: {
    fontSize  : '16px',
    fontWeight: '700',
    color     : theme.textPrimary
  },
  tabs: {
    display      : 'flex',
    gap          : '8px',
    marginBottom : '24px',
    borderBottom : `2px solid ${theme.border}`,
    paddingBottom: '0'
  },
  tab: {
    padding      : '10px 24px',
    border       : 'none',
    background   : 'none',
    fontSize     : '14px',
    fontWeight   : '600',
    color        : theme.textSecondary,
    cursor       : 'pointer',
    borderBottom : '2px solid transparent',
    marginBottom : '-2px'
  },
  tabActive: {
    padding      : '10px 24px',
    border       : 'none',
    background   : 'none',
    fontSize     : '14px',
    fontWeight   : '600',
    color        : theme.textPrimary,
    cursor       : 'pointer',
    borderBottom : '2px solid #f59e0b',
    marginBottom : '-2px'
  },
  summaryBar: {
    display        : 'grid',
  gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'auto auto auto',
  gap            : '16px',
  backgroundColor: theme.cardBg,
  borderRadius   : '12px',
  padding        : isMobile ? '12px' : '16px 24px',
  marginBottom   : '16px',
  boxShadow      : theme.shadow,
  border         : `1px solid ${theme.border}`
  },
  summaryItem: {
    display      : 'flex',
    flexDirection: 'column',
    gap          : '4px'
  },
  summaryLabel: {
    fontSize: '13px',
    color   : theme.textSecondary
  },
  summaryValue: {
    fontSize  : '20px',
    fontWeight: '700',
    color     : theme.textPrimary
  },
  card: {
    backgroundColor: theme.cardBg,
  borderRadius   : '12px',
  padding        : isMobile ? '16px 12px' : '24px',
  marginBottom   : '24px',
  boxShadow      : theme.shadow,
  border         : `1px solid ${theme.border}`,
  overflowX      : 'auto'
  },
  cardTitle: {
    fontSize    : '16px',
    fontWeight  : '600',
    color       : theme.textPrimary,
    marginBottom: '8px'
  },
  cardHint: {
    fontSize    : '13px',
    color       : theme.textSecondary,
    marginBottom: '20px'
  },
  table: {
    width         : '100%',
    borderCollapse: 'collapse',
    marginBottom  : '20px'
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
  weightInput: {
   padding        : '8px 10px',
  borderRadius   : '6px',
  border         : `1px solid ${theme.borderInput}`,
  fontSize       : '14px',
  width          : isMobile ? '90px' : '120px',
  outline        : 'none',
  backgroundColor: theme.inputBg,
  color          : theme.textPrimary
  },
  notesInput: {
    padding        : '8px 10px',
  borderRadius   : '6px',
  border         : `1px solid ${theme.borderInput}`,
  fontSize       : '13px',
  width          : isMobile ? '80px' : '120px',
  outline        : 'none',
  backgroundColor: theme.inputBg,
  color          : theme.textPrimary
  },
  statusBadge: {
    color        : 'white',
    padding      : '4px 10px',
    borderRadius : '20px',
    fontSize     : '12px',
    fontWeight   : '600'
  },
  saveButton: {
    backgroundColor: '#1a1a2e',
    color          : 'white',
    border         : 'none',
    padding        : '12px 32px',
    borderRadius   : '8px',
    fontSize       : '14px',
    fontWeight     : '600',
    cursor         : 'pointer',
    width          : '100%'
  },
  error: {
    backgroundColor: '#fee2e2',
    color          : '#dc2626',
    padding        : '12px',
    borderRadius   : '8px',
    marginBottom   : '16px',
    fontSize       : '14px'
  },
  successMsg: {
    backgroundColor: isDark ? '#052e16' : '#f0fdf4',
    color          : '#16a34a',
    padding        : '12px',
    borderRadius   : '8px',
    marginBottom   : '16px',
    fontSize       : '14px'
  },
  loadingText: {
    textAlign: 'center',
    padding  : '40px',
    color    : theme.textSecondary,
    fontSize : '16px'
  },
  emptyCard: {
    backgroundColor: theme.cardBg,
    borderRadius   : '12px',
    padding        : '40px',
    textAlign      : 'center',
    boxShadow      : theme.shadow,
    border         : `1px solid ${theme.border}`
  },
  emptyState: {
    textAlign: 'center',
    padding  : '40px'
  },
  emptyText: {
    fontSize    : '16px',
    fontWeight  : '600',
    color       : theme.textPrimary,
    marginBottom: '8px'
  },
  emptySubText: {
    fontSize: '14px',
    color   : theme.textMuted
  }
}
  return (
    <div>

      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Pattilu Weight Check</h1>
          <p style={styles.pageSubtitle}>
            Daily weight verification for pattilu stock
          </p>
        </div>
        <div style={styles.dateBox}>
          <span style={styles.dateLabel}>Today</span>
          <span style={styles.dateValue}>{today}</span>
        </div>
      </div>

      {error   && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.successMsg}>{success}</div>}

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={activeTab === 'check' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('check')}
        >
          Today's Check
        </button>
        <button
          style={activeTab === 'history' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('history')}
        >
          Check History
        </button>
      </div>

      {/* ── TODAY'S CHECK TAB ── */}
      {activeTab === 'check' && (
        <>
          {loading ? (
            <div style={styles.loadingText}>Loading pattilu items...</div>
          ) : pattiluItems.length === 0 ? (
            <div style={styles.emptyCard}>
              <p style={styles.emptyText}>No Pattilu items found in stock</p>
              <p style={styles.emptySubText}>
                Go to Stock page and add items with category "Pattilu"
              </p>
            </div>
          ) : (
            <>
              {/* Today's summary if already checked */}
              {todayChecks.length > 0 && (
                <div style={styles.summaryBar}>
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryLabel}>Items Checked</span>
                    <span style={styles.summaryValue}>{todayChecks.length}</span>
                  </div>
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryLabel}>All Match</span>
                    <span style={{
                      ...styles.summaryValue,
                      color: todayChecks.every(c => c.status === 'match')
                        ? '#16a34a' : '#dc2626'
                    }}>
                      {todayChecks.every(c => c.status === 'match') ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryLabel}>Mismatches</span>
                    <span style={{ ...styles.summaryValue, color: '#dc2626' }}>
                      {todayChecks.filter(c => c.status === 'mismatch').length}
                    </span>
                  </div>
                </div>
              )}

              {/* Weight Check Form */}
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>
                  Enter Actual Weights for Today
                </h2>
                <p style={styles.cardHint}>
                  Physically weigh each pattilu box and enter the weight below.
                  System will compare with expected weight from stock.
                </p>

                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.th}>Item Name</th>
                      <th style={styles.th}>Box Name</th>
                      <th style={styles.th}>Expected Weight (g)</th>
                      <th style={styles.th}>Actual Weight (g)</th>
                      <th style={styles.th}>Difference</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pattiluItems.map((item) => {
                      const actual     = parseFloat(actualWeights[item.id]) || 0
                      const expected   = item.total_weight_g
                      const difference = actual - expected
                      const status     = actual > 0
                        ? Math.abs(difference) <= 0.5 ? 'match' : 'mismatch'
                        : null

                      return (
                        <tr key={item.id} style={styles.tableRow}>
                          <td style={{ ...styles.td, fontWeight: '600' }}>
                            {item.name}
                          </td>
                          <td style={styles.td}>
                            {item.box_name || '—'}
                          </td>
                          <td style={styles.td}>
                            {item.total_weight_g} g
                          </td>
                          <td style={styles.td}>
                            <input
                              style={styles.weightInput}
                              type="number"
                              placeholder="Enter weight"
                              value={actualWeights[item.id] || ''}
                              onChange={e => setActualWeights(prev => ({
                                ...prev,
                                [item.id]: e.target.value
                              }))}
                            />
                          </td>
                          <td style={{
                            ...styles.td,
                            color     : actual > 0
                              ? Math.abs(difference) <= 0.5 ? '#16a34a' : '#dc2626'
                              : '#999',
                            fontWeight: '600'
                          }}>
                            {actual > 0
                              ? `${difference >= 0 ? '+' : ''}${difference.toFixed(2)} g`
                              : '—'}
                          </td>
                          <td style={styles.td}>
                            {status ? (
                              <span style={{
                                ...styles.statusBadge,
                                backgroundColor: getStatusColor(status)
                              }}>
                                {status === 'match' ? 'Match' : 'Mismatch'}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={styles.td}>
                            <input
                              style={styles.notesInput}
                              placeholder="Notes"
                              value={notes[item.id] || ''}
                              onChange={e => setNotes(prev => ({
                                ...prev,
                                [item.id]: e.target.value
                              }))}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                <button style={styles.saveButton} onClick={handleSaveChecks}>
                  Save Today's Weight Check
                </button>

              </div>
            </>
          )}
        </>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Weight Check History</h2>

          {history.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>No checks recorded yet</p>
              <p style={styles.emptySubText}>
                Complete today's check to see history
              </p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Item</th>
                  <th style={styles.th}>Expected</th>
                  <th style={styles.th}>Actual</th>
                  <th style={styles.th}>Difference</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((check) => (
                  <tr key={check.id} style={styles.tableRow}>
                    <td style={styles.td}>{check.check_date}</td>
                    <td style={{ ...styles.td, fontWeight: '600' }}>
                      {check.item_name}
                    </td>
                    <td style={styles.td}>{check.expected_weight} g</td>
                    <td style={styles.td}>{check.actual_weight} g</td>
                    <td style={{
                      ...styles.td,
                      color     : check.status === 'match' ? '#16a34a' : '#dc2626',
                      fontWeight: '600'
                    }}>
                      {check.difference >= 0 ? '+' : ''}
                      {check.difference.toFixed(2)} g
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(check.status)
                      }}>
                        {check.status === 'match' ? 'Match' : 'Mismatch'}
                      </span>
                    </td>
                    <td style={styles.td}>{check.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

    </div>
  )
}

// ── STYLES ─────────────────────────────────────────────────


export default WeightCheck