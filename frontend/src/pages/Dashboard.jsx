import { useTheme } from '../context/ThemeContext'
import { getTheme } from '../context/theme'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Dashboard() {

  const today = new Date().toISOString().split('T')[0]
  const { isDark } = useTheme()
  const theme      = getTheme(isDark)
  const [date, setDate]       = useState(today)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  // ── FETCH DASHBOARD DATA ───────────────────────────────
  const fetchDashboard = async (selectedDate) => {
    try {
      setLoading(true)
      setError('')

      const { data: bills, error: billsErr } = await supabase
        .from('bills')
        .select('*')
        .eq('bill_date', selectedDate)
        .order('created_at', { ascending: false })

      if (billsErr) throw billsErr

      const { data: sales, error: salesErr } = await supabase
        .from('sales')
        .select('*')
        .eq('sale_date', selectedDate)

      if (salesErr) throw salesErr

      const { data: weightChecks, error: wcErr } = await supabase
        .from('weight_checks')
        .select('*')
        .eq('check_date', selectedDate)

      if (wcErr) throw wcErr

      const totalBills      = bills.length
      const totalRevenue    = bills.reduce((sum, b) => sum + b.grand_total, 0)
      const totalWeightSold = sales.reduce((sum, s) => sum + s.weight_sold_g, 0)

      const goldSales    = sales.filter(s => s.category === 'Gold')
      const silverSales  = sales.filter(s => s.category === 'Silver')
      const pattiluSales = sales.filter(s => s.category === 'Pattilu')

      const goldWeight    = goldSales.reduce((sum, s) => sum + s.weight_sold_g, 0)
      const silverWeight  = silverSales.reduce((sum, s) => sum + s.weight_sold_g, 0)
      const pattiluWeight = pattiluSales.reduce((sum, s) => sum + s.weight_sold_g, 0)

      let oldGoldWeight   = 0
      let oldSilverWeight = 0

      for (const bill of bills) {
        try {
          const parsed   = typeof bill.items_json === 'string' ? JSON.parse(bill.items_json) : bill.items_json
          const oldItems = Array.isArray(parsed) ? [] : parsed.old_items || []
          for (const old of oldItems) {
            if (old.category === 'Gold') {
              oldGoldWeight   += parseFloat(old.pure_weight) || 0
            } else if (old.category === 'Silver') {
              oldSilverWeight += parseFloat(old.pure_weight) || 0
            }
          }
        } catch (_err) {
          // skip
        }
      }

      const pattiluChecked   = weightChecks.length
      const pattiluMismatch  = weightChecks.filter(c => c.status === 'mismatch').length
      const pattiluAllMatch  = pattiluChecked > 0 && pattiluMismatch === 0

      setData({
        date: selectedDate,
        summary: {
          totalBills,
          totalRevenue,
          totalWeightSold,
          goldWeight,
          silverWeight,
          pattiluWeight,
          oldGoldWeight,
          oldSilverWeight,
          pattiluChecked,
          pattiluMismatch,
          pattiluAllMatch
        },
        bills,
        sales,
        weightChecks
      })

    } catch (err) {
      console.error(err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard(date)
  }, [date])

  // ── FORMAT DATE ────────────────────────────────────────
  const formatDate = (dateStr) => {
    const options = {
      weekday: 'long',
      year   : 'numeric',
      month  : 'long',
      day    : 'numeric'
    }
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', options)
  }

  // ── FORMAT CURRENCY ────────────────────────────────────
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style               : 'currency',
      currency            : 'INR',
      maximumFractionDigits: 2
    }).format(amount)
  }

  // ── RENDER ─────────────────────────────────────────────
  const styles = {
  pageHeader: {
    display       : 'flex',
    justifyContent: 'space-between',
    alignItems    : 'flex-start',
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
  datePicker: {
    display      : 'flex',
    flexDirection: 'column',
    alignItems   : 'flex-end',
    gap          : '6px'
  },
  dateLabel: {
    fontSize  : '13px',
    fontWeight: '600',
    color     : theme.textPrimary
  },
  dateInput: {
    padding        : '10px 12px',
    borderRadius   : '8px',
    border         : `1px solid ${theme.borderInput}`,
    fontSize       : '14px',
    outline        : 'none',
    cursor         : 'pointer',
    backgroundColor: theme.inputBg,
    color          : theme.textPrimary
  },
  statsGrid: {
    display             : 'grid',
    gridTemplateColumns : 'repeat(4, 1fr)',
    gap                 : '16px',
    marginBottom        : '24px'
  },
  statCard: {
    backgroundColor: theme.cardBg,
    borderRadius   : '12px',
    padding        : '20px',
    boxShadow      : theme.shadow,
    border         : `1px solid ${theme.border}`
  },
  statLabel: {
    fontSize    : '13px',
    color       : theme.textSecondary,
    fontWeight  : '600',
    marginBottom: '8px'
  },
  statValue: {
    fontSize    : '22px',
    fontWeight  : '800',
    marginBottom: '4px'
  },
  statSub: {
    fontSize: '12px',
    color   : theme.textMuted
  },
  card: {
    backgroundColor: theme.cardBg,
    borderRadius   : '12px',
    padding        : '24px',
    marginBottom   : '24px',
    boxShadow      : theme.shadow,
    border         : `1px solid ${theme.border}`,
    overflowX      : 'auto'
  },
  cardTitle: {
    fontSize    : '16px',
    fontWeight  : '600',
    color       : theme.textPrimary,
    marginBottom: '16px'
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
  totalRow: {
    backgroundColor: '#1a1a2e'
  },
  totalLabel: {
    padding   : '14px 16px',
    fontSize  : '14px',
    fontWeight: '600',
    color     : 'white',
    textAlign : 'right'
  },
  totalValue: {
    padding   : '14px 16px',
    fontSize  : '16px',
    fontWeight: '800',
    color     : '#f59e0b'
  },
  itemChip: {
    fontSize        : '12px',
    backgroundColor : isDark ? '#2a2d3e' : '#f1f5f9',
    color           : theme.textPrimary,
    padding         : '2px 8px',
    borderRadius    : '4px',
    marginBottom    : '4px',
    display         : 'inline-block',
    marginRight     : '4px'
  },
  badge: {
    padding     : '4px 10px',
    borderRadius: '20px',
    fontSize    : '12px',
    fontWeight  : '600'
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
  },
  error: {
    backgroundColor: '#fee2e2',
    color          : '#dc2626',
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
  }
}

  
  return (
    <div>

      {/* ── PAGE HEADER ── */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Dashboard</h1>
          <p style={styles.pageSubtitle}>{formatDate(date)}</p>
        </div>

        <div style={styles.datePicker}>
          <label style={styles.dateLabel}>Select Date</label>
          <input
            style={styles.dateInput}
            type="date"
            value={date}
            max={today}
            onChange={e => setDate(e.target.value)}
          />
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.loadingText}>Loading...</div>
      ) : data && (
        <>
          {/* ── STAT CARDS ── */}
          <div style={styles.statsGrid}>

            <div style={styles.statCard}>
              <p style={styles.statLabel}>Total Revenue</p>
              <p style={{ ...styles.statValue, color: '#16a34a' }}>
                {formatCurrency(data.summary.totalRevenue)}
              </p>
              <p style={styles.statSub}>for {formatDate(date)}</p>
            </div>

            <div style={styles.statCard}>
              <p style={styles.statLabel}>Total Bills</p>
              <p style={{ ...styles.statValue, color: theme.textPrimary }}>
             {data.summary.totalBills}
              </p>
              <p style={styles.statSub}>bills generated</p>
            </div>

            <div style={styles.statCard}>
              <p style={styles.statLabel}>Gold Sold</p>
              <p style={{ ...styles.statValue, color: '#f59e0b' }}>
                {data.summary.goldWeight.toFixed(3)} g
              </p>
              <p style={styles.statSub}>total gold weight</p>
            </div>

            <div style={styles.statCard}>
              <p style={styles.statLabel}>Silver Sold</p>
              <p style={{ ...styles.statValue, color: '#6b7280' }}>
                {data.summary.silverWeight.toFixed(3)} g
              </p>
              <p style={styles.statSub}>total silver weight</p>
            </div>

            <div style={styles.statCard}>
              <p style={styles.statLabel}>Pattilu Sold</p>
              <p style={{ ...styles.statValue, color: '#8b5cf6' }}>
                {data.summary.pattiluWeight.toFixed(3)} g
              </p>
              <p style={styles.statSub}>total pattilu weight</p>
            </div>

            <div style={styles.statCard}>
              <p style={styles.statLabel}>Old Gold Received</p>
              <p style={{ ...styles.statValue, color: '#f59e0b' }}>
                {data.summary.oldGoldWeight.toFixed(3)} g
              </p>
              <p style={styles.statSub}>from exchange today</p>
            </div>

            <div style={styles.statCard}>
              <p style={styles.statLabel}>Old Silver Received</p>
              <p style={{ ...styles.statValue, color: '#6b7280' }}>
                {data.summary.oldSilverWeight.toFixed(3)} g
              </p>
              <p style={styles.statSub}>from exchange today</p>
            </div>

            <div style={styles.statCard}>
              <p style={styles.statLabel}>Pattilu Check</p>
              <p style={{
                ...styles.statValue,
                color: data.summary.pattiluChecked === 0
                  ? '#6b7280'
                  : data.summary.pattiluAllMatch
                    ? '#16a34a'
                    : '#dc2626'
              }}>
                {data.summary.pattiluChecked === 0
                  ? 'Not Done'
                  : data.summary.pattiluAllMatch
                    ? 'All Match'
                    : `${data.summary.pattiluMismatch} Mismatch`}
              </p>
              <p style={styles.statSub}>
                {data.summary.pattiluChecked > 0
                  ? `${data.summary.pattiluChecked} items checked`
                  : 'Go to Weight Check page'}
              </p>
            </div>

          </div>

          {/* ── BILLS TABLE ── */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              Bills — {formatDate(date)}
            </h2>

            {data.bills.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>No bills found for this date</p>
                <p style={styles.emptySubText}>
                  Select a different date or create a new bill
                </p>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>Bill No</th>
                    <th style={styles.th}>Customer</th>
                    <th style={styles.th}>Phone</th>
                    <th style={styles.th}>Items</th>
                    <th style={styles.th}>Subtotal</th>
                    <th style={styles.th}>Discount</th>
                    <th style={styles.th}>Grand Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bills.map((bill) => {
                    const parsed = typeof bill.items_json === 'string'
                      ? JSON.parse(bill.items_json)
                      : bill.items_json
                    const items  = Array.isArray(parsed)
                      ? parsed
                      : parsed.items || []
                    return (
                      <tr key={bill.id} style={styles.tableRow}>
                       <td style={{ ...styles.td, fontWeight: '600', color: '#f59e0b' }}>
                       {bill.bill_number}
                        </td>
                        <td style={styles.td}>{bill.customer_name}</td>
                        <td style={styles.td}>{bill.customer_phone || '—'}</td>
                        <td style={styles.td}>
                          {items.map((item, index) => (
                            <div key={index} style={styles.itemChip}>
                              {item.item_name} — {item.actual_weight}g
                            </div>
                          ))}
                        </td>
                        <td style={styles.td}>
                          {formatCurrency(bill.subtotal)}
                        </td>
                        <td style={styles.td}>
                          {bill.discount > 0
                            ? formatCurrency(bill.discount)
                            : '—'}
                        </td>
                        <td style={{ ...styles.td, fontWeight: '700', color: '#16a34a' }}>
                          {formatCurrency(bill.grand_total)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>

                {/* Total row */}
                <tfoot>
                  <tr style={styles.totalRow}>
                    <td colSpan="6" style={styles.totalLabel}>
                      Total Revenue for {formatDate(date)}
                    </td>
                    <td style={styles.totalValue}>
                      {formatCurrency(data.summary.totalRevenue)}
                    </td>
                  </tr>
                </tfoot>

              </table>
            )}
          </div>

          {/* ── SALES BREAKDOWN ── */}
          {data.sales.length > 0 && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Sales Breakdown</h2>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>Item</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Weight Sold</th>
                    <th style={styles.th}>Rate/g</th>
                    <th style={styles.th}>Making</th>
                    <th style={styles.th}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sales.map((sale) => (
                    <tr key={sale.id} style={styles.tableRow}>
                      <td style={styles.td}>{sale.item_name}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          backgroundColor: sale.category === 'Gold'
                            ? '#fef3c7'
                            : sale.category === 'Pattilu'
                              ? '#ede9fe'
                              : '#f1f5f9',
                          color: sale.category === 'Gold'
                            ? '#92400e'
                            : sale.category === 'Pattilu'
                              ? '#5b21b6'
                              : '#475569'
                        }}>
                          {sale.category}
                        </span>
                      </td>
                      <td style={styles.td}>{sale.weight_sold_g} g</td>
                      <td style={styles.td}>₹{sale.rate_per_gram}</td>
                      <td style={styles.td}>₹{sale.making_charges}</td>
                      <td style={{ ...styles.td, fontWeight: '600' }}>
                        {formatCurrency(sale.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── WEIGHT CHECK SUMMARY ── */}
          {data.weightChecks && data.weightChecks.length > 0 && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Pattilu Weight Check — {formatDate(date)}</h2>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>Item</th>
                    <th style={styles.th}>Expected</th>
                    <th style={styles.th}>Actual</th>
                    <th style={styles.th}>Difference</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.weightChecks.map((check) => (
                    <tr key={check.id} style={styles.tableRow}>
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
                          ...styles.badge,
                          backgroundColor: check.status === 'match' ? '#f0fdf4' : '#fee2e2',
                          color          : check.status === 'match' ? '#16a34a' : '#dc2626'
                        }}>
                          {check.status === 'match' ? 'Match' : 'Mismatch'}
                        </span>
                      </td>
                      <td style={styles.td}>{check.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </>
      )}
    </div>
  )
}

// ── STYLES ─────────────────────────────────────────────────

export default Dashboard