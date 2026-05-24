import useIsMobile       from '../hooks/useIsMobile'
import useResponsiveGrid from '../hooks/useResponsiveGrid'
import { useTheme } from '../context/ThemeContext'
import { getTheme } from '../context/theme'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Bills() {
  const isMobile = useIsMobile()
  const grids    = useResponsiveGrid()
  const today = new Date().toISOString().split('T')[0]
  const { isDark } = useTheme()
  const theme      = getTheme(isDark)
  const [bills, setBills]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [selectedBill, setSelectedBill] = useState(null)
  const [filterDate, setFilterDate]     = useState('')
  // 👆 empty string = show all bills

  
  // ── FETCH ALL BILLS ────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const loadBills = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('bills')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw error
        if (!cancelled) setBills(data || [])
      } catch (err) {
        console.error(err)
        if (!cancelled) setError('Failed to load bills')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadBills()
    return () => { cancelled = true }
  }, [])

  // ── FILTER BILLS BY DATE ───────────────────────────────
  // If filterDate is empty → show all bills
  // If filterDate is set   → show only that date's bills
  const filteredBills = filterDate
    ? bills.filter(b => b.bill_date === filterDate)
    : bills

  // ── TOTAL OF FILTERED BILLS ────────────────────────────
  const filteredTotal = filteredBills.reduce((sum, b) => sum + b.grand_total, 0)

  // ── FORMAT CURRENCY ────────────────────────────────────
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style               : 'currency',
      currency            : 'INR',
      maximumFractionDigits: 2
    }).format(amount)
  }

  // ── PRINT BILL ─────────────────────────────────────────
  const handlePrint = () => {
    window.print()
  }
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
  filterSection: {
    display      : 'flex',
  flexDirection: isMobile ? 'column' : 'row',
  alignItems   : isMobile ? 'flex-start' : 'flex-end',
  gap          : '12px'
  },
  filterGroup: {
    display      : 'flex',
    flexDirection: 'column',
    gap          : '6px'
  },
  filterLabel: {
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
  clearButton: {
    backgroundColor: theme.cardBg,
    color          : theme.textPrimary,
    border         : `1px solid ${theme.borderInput}`,
    padding        : '10px 16px',
    borderRadius   : '8px',
    fontSize       : '13px',
    fontWeight     : '600',
    cursor         : 'pointer'
  },
  summaryBar: {
    display        : 'flex',
    gap            : '24px',
    backgroundColor: theme.cardBg,
    borderRadius   : '12px',
    padding        : '16px 24px',
    marginBottom   : '16px',
    boxShadow      : theme.shadow,
    border         : `1px solid ${theme.border}`
  },
  summaryBarItem: {
    display      : 'flex',
    flexDirection: 'column',
    gap          : '4px'
  },
  summaryBarLabel: {
    fontSize: '13px',
    color   : theme.textSecondary
  },
  summaryBarValue: {
    fontSize  : '20px',
    fontWeight: '700',
    color     : theme.textPrimary
  },
  error: {
    backgroundColor: '#fee2e2',
    color          : '#dc2626',
    padding        : '12px',
    borderRadius   : '8px',
    marginBottom   : '16px',
    fontSize       : '14px'
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
  viewButton: {
    backgroundColor: '#1a1a2e',
    color          : 'white',
    border         : 'none',
    padding        : '8px 16px',
    borderRadius   : '6px',
    fontSize       : '13px',
    fontWeight     : '600',
    cursor         : 'pointer'
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
  loadingText: {
    color   : theme.textSecondary,
    fontSize: '14px'
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
  backButton: {
    backgroundColor: theme.cardBg,
    color          : theme.textPrimary,
    border         : `1px solid ${theme.borderInput}`,
    padding        : '10px 20px',
    borderRadius   : '8px',
    fontSize       : '14px',
    fontWeight     : '600',
    cursor         : 'pointer',
    marginBottom   : '24px'
  },
  billCard: {
    backgroundColor: theme.cardBg,
  borderRadius   : '12px',
  padding        : isMobile ? '16px' : '40px',
  boxShadow      : theme.shadow,
  border         : `1px solid ${theme.border}`,
  maxWidth       : '800px',
  margin         : '0 auto'
  },
  billHeader: {
    display        : 'flex',
    justifyContent : 'space-between',
    alignItems     : 'flex-start',
    marginBottom   : '16px'
  },
  shopName: {
    fontSize  : '28px',
    fontWeight: 'bold',
    color      : theme.textPrimary
  },
  billMeta: {
    textAlign: 'right'
  },
  billMetaText: {
    fontSize    : '14px',
    color       : theme.textPrimary,
    marginBottom: '4px'
  },
  divider: {
    borderTop   : `2px solid ${theme.border}`,
    marginBottom: '16px'
  },
  customerSection: {
    marginBottom: '20px'
  },
  customerText: {
    fontSize    : '14px',
    color       : theme.textPrimary,
    marginBottom: '4px'
  },
  billTable: {
    width         : '100%',
    borderCollapse: 'collapse',
    marginBottom  : '24px'
  },
  billTableHead: {
    backgroundColor: '#1a1a2e'
  },
  billTh: {
    padding   : '10px 12px',
    textAlign : 'left',
    fontSize  : '13px',
    color     : 'white',
    fontWeight: '600'
  },
  billTableRow: {
    borderBottom: `1px solid ${theme.border}`
  },
  billTd: {
    padding : '10px 12px',
    fontSize: '13px',
    color   : theme.textPrimary
  },
  summarySection: {
    display       : 'flex',
    justifyContent: 'flex-end',
    marginBottom  : '24px'
  },
  summaryBox: {
     width: isMobile ? '100%' : '280px'
  },
  summaryRow: {
    display        : 'flex',
    justifyContent : 'space-between',
    alignItems     : 'center',
    marginBottom   : '8px'
  },
  summaryLabel: {
    fontSize: '14px',
    color   : theme.textSecondary
  },
  summaryValue: {
    fontSize  : '14px',
    fontWeight: '600',
    color     : theme.textPrimary
  },
  grandTotalRow: {
    borderTop  : `2px solid ${theme.border}`,
    paddingTop : '12px',
    marginTop  : '4px'
  },
  grandTotalLabel: {
    fontSize  : '16px',
    fontWeight: '700',
    color     : '#f59e0b'
  },
  grandTotalValue: {
    fontSize  : '20px',
    fontWeight: '800',
    color     :  '#10b981'
  },
  billFooter: {
    textAlign : 'center',
    borderTop : `1px solid ${theme.border}`,
    paddingTop: '16px',
    marginTop : '8px'
  },
  footerText: {
    fontSize    : '13px',
    color       : theme.textSecondary,
    marginBottom: '4px'
  },
  printSection: {
    display       : 'flex',
    justifyContent: 'center',
    marginTop     : '24px'
  },
  printButton: {
    backgroundColor: '#1a1a2e',
    color          : 'white',
    border         : 'none',
    padding        : '12px 40px',
    borderRadius   : '8px',
    fontSize       : '15px',
    fontWeight     : '600',
    cursor         : 'pointer'
  }
}

  // ── RENDER SINGLE BILL VIEW ────────────────────────────
  if (selectedBill) {
  const parsed = typeof selectedBill.items_json === 'string'
    ? JSON.parse(selectedBill.items_json)
    : selectedBill.items_json
  const items  = Array.isArray(parsed) ? parsed : parsed.items || []
  const old_items = Array.isArray(parsed) ? [] : parsed.old_items || []
    return (
      <div>

        <button
          style={styles.backButton}
          onClick={() => setSelectedBill(null)}
        >
          Back to Bills
        </button>

        <div style={styles.billCard}>

          <div style={styles.billHeader}>
            <h1 style={styles.shopName}>Palivella Jewellery</h1>
            <div style={styles.billMeta}>
              <p style={styles.billMetaText}>
                Bill No: <strong>{selectedBill.bill_number}</strong>
              </p>
              <p style={styles.billMetaText}>
                Date: <strong>{selectedBill.bill_date}</strong>
              </p>
            </div>
          </div>

          <div style={styles.divider} />

          <div style={styles.customerSection}>
            <p style={styles.customerText}>
              <strong>Customer:</strong> {selectedBill.customer_name}
            </p>
            {selectedBill.customer_phone && (
              <p style={styles.customerText}>
                <strong>Phone:</strong> {selectedBill.customer_phone}
              </p>
            )}
          </div>

          <table style={styles.billTable}>
            <thead>
              <tr style={styles.billTableHead}>
                <th style={styles.billTh}>Item</th>
                <th style={styles.billTh}>Type</th>
                <th style={styles.billTh}>Actual Wt</th>
                <th style={styles.billTh}>Bill Wt</th>
                <th style={styles.billTh}>Rate/g</th>
                <th style={styles.billTh}>Price</th>
                <th style={styles.billTh}>Making</th>
                <th style={styles.billTh}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} style={styles.billTableRow}>
                  <td style={styles.billTd}>{item.item_name}</td>
                  <td style={styles.billTd}>
                    {item.category === 'Gold' ? item.gold_type : 'Silver'}
                  </td>
                  <td style={styles.billTd}>{item.actual_weight} g</td>
                  <td style={styles.billTd}>{item.billing_weight} g</td>
                  <td style={styles.billTd}>₹{item.rate}</td>
                  <td style={styles.billTd}>₹{parseFloat(item.price).toFixed(2)}</td>
                  <td style={styles.billTd}>₹{parseFloat(item.making_charges).toFixed(2)}</td>
                  <td style={styles.billTd}>₹{parseFloat(item.total_price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={styles.summarySection}>
            <div style={styles.summaryBox}>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Subtotal</span>
                <span style={styles.summaryValue}>
                  {formatCurrency(selectedBill.subtotal)}
                </span>
              </div>
              {selectedBill.discount > 0 && (
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Discount</span>
                  <span style={{ ...styles.summaryValue, color: '#dc2626' }}>
                    - {formatCurrency(selectedBill.discount)}
                  </span>
                </div>
              )}
              <div style={{ ...styles.summaryRow, ...styles.grandTotalRow }}>
                <span style={styles.grandTotalLabel}>Grand Total</span>
                <span style={styles.grandTotalValue}>
                  {formatCurrency(selectedBill.grand_total)}
                </span>
              </div>
            </div>
          </div>

          <div style={styles.billFooter}>
            <p style={styles.footerText}>Thank you for your purchase!</p>
            <p style={styles.footerText}>Palivella Jewellery</p>
          </div>

        </div>

        <div style={styles.printSection}>
          <button style={styles.printButton} onClick={handlePrint}>
            Print Bill
          </button>
        </div>

      </div>
    )
  }

  // ── RENDER BILLS LIST ──────────────────────────────────
  
  
  return (
    <div>

      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Bills History</h1>
          <p style={styles.pageSubtitle}>
            {filterDate
              ? `Showing bills for ${filterDate}`
              : `Showing all bills (${bills.length} total)`}
          </p>
        </div>

        {/* Date Filter */}
        <div style={styles.filterSection}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Filter by Date</label>
            <input
              style={styles.dateInput}
              type="date"
              value={filterDate}
              max={today}
              onChange={e => setFilterDate(e.target.value)}
            />
          </div>
          {/* Clear filter button */}
          {filterDate && (
            <button
              style={styles.clearButton}
              onClick={() => setFilterDate('')}
            >
              Show All
            </button>
          )}
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Summary bar when date is filtered */}
      {filterDate && filteredBills.length > 0 && (
        <div style={styles.summaryBar}>
          <div style={styles.summaryBarItem}>
            <span style={styles.summaryBarLabel}>Bills on {filterDate}</span>
            <span style={styles.summaryBarValue}>{filteredBills.length}</span>
          </div>
          <div style={styles.summaryBarItem}>
            <span style={styles.summaryBarLabel}>Total Revenue</span>
            <span style={{ ...styles.summaryBarValue, color: '#16a34a' }}>
              {formatCurrency(filteredTotal)}
            </span>
          </div>
        </div>
      )}

      <div style={styles.tableCard}>
        {loading ? (
          <p style={styles.loadingText}>Loading bills...</p>
        ) : filteredBills.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>
              {filterDate
                ? `No bills found for ${filterDate}`
                : 'No bills yet'}
            </p>
            <p style={styles.emptySubText}>
              {filterDate
                ? 'Try a different date or click Show All'
                : 'Go to Billing page to create your first bill'}
            </p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>Bill No</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Customer</th>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>Items</th>
                <th style={styles.th}>Subtotal</th>
                <th style={styles.th}>Discount</th>
                <th style={styles.th}>Grand Total</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((bill) => {
               const parsed = typeof bill.items_json === 'string'
                 ? JSON.parse(bill.items_json)
                 : bill.items_json
const items  = Array.isArray(parsed) ? parsed : parsed.items || []
                return (
                  <tr key={bill.id} style={styles.tableRow}>
                    <td style={{ ...styles.td, fontWeight: '600', color: '#f59e0b' }}>
                  {bill.bill_number}
                      </td>
                    <td style={styles.td}>{bill.bill_date}</td>
                    <td style={styles.td}>{bill.customer_name}</td>
                    <td style={styles.td}>{bill.customer_phone || '—'}</td>
                    <td style={styles.td}>
                      {items.map((item, index) => (
                        <div key={index} style={styles.itemChip}>
                          {item.item_name} — {item.actual_weight}g
                        </div>
                      ))}
                    </td>
                    <td style={styles.td}>{formatCurrency(bill.subtotal)}</td>
                    <td style={styles.td}>
                      {bill.discount > 0
                        ? formatCurrency(bill.discount)
                        : '—'}
                    </td>
                    <td style={{ ...styles.td, fontWeight: '700', color: '#16a34a' }}>
                      {formatCurrency(bill.grand_total)}
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.viewButton}
                        onClick={() => setSelectedBill(bill)}
                      >
                        View & Print
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>

            {/* Total row */}
            {filteredBills.length > 1 && (
              <tfoot>
                <tr style={styles.totalRow}>
                  <td colSpan="7" style={styles.totalLabel}>
                    {filterDate ? `Total for ${filterDate}` : 'Grand Total'}
                  </td>
                  <td style={styles.totalValue}>
                    {formatCurrency(filteredTotal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}

          </table>
        )}
      </div>

    </div>
  )
}

// ── STYLES ─────────────────────────────────────────────────


export default Bills