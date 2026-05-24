import useIsMobile       from '../hooks/useIsMobile'
import useResponsiveGrid from '../hooks/useResponsiveGrid'
import { useTheme } from '../context/ThemeContext'
import { getTheme } from '../context/theme'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Billing() {

  // ── STATE ──────────────────────────────────────────────
  const isMobile = useIsMobile()
  const grids    = useResponsiveGrid()
  const { isDark } = useTheme()
  const theme      = getTheme(isDark)
  const [stockItems, setStockItems]       = useState([])
  const [billItems, setBillItems]         = useState([])
  const [oldItems, setOldItems]           = useState([])
  const [customerName, setCustomerName]   = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [discount, setDiscount]           = useState(0)
  const [error, setError]                 = useState('')
  const [success, setSuccess]             = useState('')
  const [savedBill, setSavedBill]         = useState(null)

  // Current new item being added
  const [currentItem, setCurrentItem] = useState({
    item_id       : '',
    item_name     : '',
    category      : '',
    gold_type     : 'KDM',
    actual_weight : '',
    extra_weight  : 0.25,
    rate          : '',
    making_charges: '',
  })

  // Current old item being added
  const [currentOldItem, setCurrentOldItem] = useState({
    item_name      : '',
    category       : 'Gold',
    original_weight: '',
    pure_weight    : '',
    rate           : '',
  })

  const [showOldItemForm, setShowOldItemForm] = useState(false)

  // ── FETCH STOCK ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const loadStock = async () => {
      try {
        const { data, error } = await supabase
          .from('stock')
          .select('*')
          .order('name', { ascending: true })
        if (error) throw error
        if (!cancelled) setStockItems(data || [])
      } catch {
        if (!cancelled) setError('Failed to load stock')
      }
    }
    loadStock()
    return () => { cancelled = true }
  }, [])

  // ── SELECT STOCK ITEM ──────────────────────────────────
 const handleItemSelect = (e) => {
  const selected = stockItems.find(i => i.id === parseInt(e.target.value))
  if (!selected) return
  setCurrentItem(prev => ({
    ...prev,
    item_id       : selected.id,
    item_name     : selected.name,
    category      : selected.category,
    making_charges: '',
    extra_weight  : 0.25,
    gold_type     : 'KDM'
  }))
}
  // ── CALCULATE NEW ITEM PRICE ───────────────────────────
 const calculateItemPrice = (item) => {
  const actual  = parseFloat(item.actual_weight) || 0
  const rate    = parseFloat(item.rate)           || 0
  const making  = parseFloat(item.making_charges) || 0

  if (actual <= 0 || rate <= 0) {
    return {
      billing_weight: 0,
      price         : 0,
      making_charges: 0,
      total_price   : 0
    }
  }

  // Silver and Pattilu → same calculation
  if (item.category === 'Silver' || item.category === 'Pattilu') {
    const price = actual * rate
    return {
      billing_weight: actual,
      price,
      making_charges: making,
      total_price   : price + making
    }
  }

  // Gold → with extra weight
  if (item.category === 'Gold') {
    const extra          = actual > 2 ? parseFloat(item.extra_weight) || 0 : 0
    const billing_weight = actual + extra
    const price          = billing_weight * rate
    return {
      billing_weight,
      price,
      making_charges: making,
      total_price   : price + making
    }
  }

  return { billing_weight: 0, price: 0, making_charges: 0, total_price: 0 }
}
  // ── CALCULATE OLD ITEM VALUE ───────────────────────────
  const calculateOldItemValue = (item) => {
    const pureWeight = parseFloat(item.pure_weight) || 0
    const rate       = parseFloat(item.rate)        || 0
    return pureWeight * rate
  }

  // ── ADD NEW ITEM TO BILL ───────────────────────────────
  const handleAddItem = () => {
    setError('')
    if (!currentItem.item_id) {
      setError('Please select an item')
      return
    }
    if (!currentItem.actual_weight || parseFloat(currentItem.actual_weight) <= 0) {
      setError('Please enter a valid weight')
      return
    }
    if (!currentItem.rate || parseFloat(currentItem.rate) <= 0) {
      setError('Please enter a valid rate')
      return
    }

    // Check stock
    const stockItem = stockItems.find(i => i.id === parseInt(currentItem.item_id))
    if (stockItem && parseFloat(currentItem.actual_weight) > stockItem.net_weight_g) {
      setError(`Not enough stock. Available: ${stockItem.net_weight_g}g`)
      return
    }

    const calc = calculateItemPrice(currentItem)
    setBillItems(prev => [...prev, {
      ...currentItem,
      billing_weight: calc.billing_weight,
      price         : calc.price,
      making_charges: calc.making_charges,
      total_price   : calc.total_price,
      uid           : Date.now()
    }])

    setCurrentItem(prev => ({
      ...prev,
      item_id       : '',
      item_name     : '',
      category      : '',
      actual_weight : '',
      extra_weight  : 0.25,
      making_charges: '',
      rate          : ''
    }))
  }

  // ── ADD OLD ITEM TO BILL ───────────────────────────────
  const handleAddOldItem = () => {
    setError('')
    if (!currentOldItem.item_name) {
      setError('Please enter old item name')
      return
    }
    if (!currentOldItem.pure_weight || parseFloat(currentOldItem.pure_weight) <= 0) {
      setError('Please enter pure weight')
      return
    }
    if (!currentOldItem.rate || parseFloat(currentOldItem.rate) <= 0) {
      setError('Please enter rate')
      return
    }

    const value = calculateOldItemValue(currentOldItem)
    setOldItems(prev => [...prev, {
      ...currentOldItem,
      value,
      uid: Date.now()
    }])

    setCurrentOldItem({
      item_name      : '',
      category       : 'Gold',
      original_weight: '',
      pure_weight    : '',
      rate           : '',
    })
    setShowOldItemForm(false)
  }

  // ── REMOVE ITEMS ───────────────────────────────────────
  const handleRemoveItem    = (uid) => setBillItems(prev => prev.filter(i => i.uid !== uid))
  const handleRemoveOldItem = (uid) => setOldItems(prev => prev.filter(i => i.uid !== uid))

  // ── BILL TOTALS ────────────────────────────────────────
  const subtotal      = billItems.reduce((sum, i) => sum + i.total_price, 0)
  const oldItemsTotal = oldItems.reduce((sum, i) => sum + i.value, 0)
  const grandTotal    = subtotal - oldItemsTotal - (parseFloat(discount) || 0)

  // ── SAVE BILL ──────────────────────────────────────────
  const handleSaveBill = async () => {
    setError('')
    if (billItems.length === 0) {
      setError('Please add at least one item to the bill')
      return
    }
    try {
      const today    = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase.rpc('create_bill_transaction', {
        p_customer_name : customerName || 'Walk-in Customer',
        p_customer_phone: customerPhone || '',
        p_items         : billItems,
        p_old_items     : oldItems || [],
        p_subtotal      : parseFloat(subtotal) || 0,
        p_discount      : parseFloat(discount) || 0,
        p_grand_total   : parseFloat(grandTotal) || 0,
        p_bill_date     : today
      })

      if (error) throw error

      setSavedBill(data)
      setSuccess('Bill saved successfully!')
      setBillItems([])
      setOldItems([])
      setCustomerName('')
      setCustomerPhone('')
      setDiscount(0)

      // Reload stock to reflect updated values
      const { data: updatedStock, error: stockErr } = await supabase
        .from('stock')
        .select('*')
        .order('name', { ascending: true })
      if (!stockErr) setStockItems(updatedStock || [])

    } catch (err) {
      setError(err.message || 'Failed to save bill')
    }
  }

  // ── PRINT ──────────────────────────────────────────────
  const handlePrint    = () => window.print()
  const handleNewBill  = () => { setSavedBill(null); setSuccess('') }

  // ── FORMAT CURRENCY ────────────────────────────────────
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style               : 'currency',
      currency            : 'INR',
      maximumFractionDigits: 2
    }).format(amount)
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
  card: {
    backgroundColor: theme.cardBg,
  borderRadius   : '12px',
  padding        : isMobile ? '16px 12px' : '24px',
  marginBottom   : '24px',
  boxShadow      : theme.shadow,
  border         : `1px solid ${theme.border}`
  },
  cardTitle: {
    fontSize    : '16px',
    fontWeight  : '600',
    color       : theme.textPrimary,
    marginBottom: '16px'
  },
  formGrid2: {
    ...grids.grid2
  },
  formGrid3: {
   ...grids.grid3,
  marginBottom: '16px'
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
  pricePreview: {
    backgroundColor: isDark ? '#1c1a05' : '#fefce8',
    border         : `1px solid ${isDark ? '#3d3600' : '#fef08a'}`,
    borderRadius   : '8px',
    padding        : '16px',
    marginBottom   : '16px'
  },
  previewGrid: {
     display             : 'grid',
  gridTemplateColumns : isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
    gap                : '12px'
  },
  previewItem: {
    display      : 'flex',
    flexDirection: 'column',
    gap          : '4px'
  },
  previewLabel: {
    fontSize: '12px',
    color   : theme.textSecondary
  },
  previewValue: {
    fontSize  : '16px',
    fontWeight: '600',
    color     : theme.textPrimary
  },
  addItemButton: {
    backgroundColor: '#f59e0b',
    color          : 'white',
    border         : 'none',
    padding        : '10px 24px',
    borderRadius   : '8px',
    fontSize       : '14px',
    fontWeight     : '600',
    cursor         : 'pointer'
  },
  oldItemHeader: {
    display        : 'flex',
    justifyContent : 'space-between',
    alignItems     : 'center',
    marginBottom   : '16px'
  },
  addOldItemButton: {
    backgroundColor: '#dc2626',
    color          : 'white',
    border         : 'none',
    padding        : '8px 16px',
    borderRadius   : '8px',
    fontSize       : '13px',
    fontWeight     : '600',
    cursor         : 'pointer'
  },
  addOldItemConfirmButton: {
    backgroundColor: '#dc2626',
    color          : 'white',
    border         : 'none',
    padding        : '10px 24px',
    borderRadius   : '8px',
    fontSize       : '14px',
    fontWeight     : '600',
    cursor         : 'pointer'
  },
  oldItemPreview: {
    display        : 'flex',
    justifyContent : 'space-between',
    alignItems     : 'center',
    backgroundColor: isDark ? '#2d0a0a' : '#fee2e2',
    border         : `1px solid ${isDark ? '#5c1a1a' : '#fecaca'}`,
    borderRadius   : '8px',
    padding        : '12px 16px',
    marginBottom   : '16px',
    fontSize       : '14px',
    color          : '#dc2626'
  },
  emptyOldItems: {
    fontSize : '13px',
    color    : theme.textMuted,
    textAlign: 'center',
    padding  : '16px'
  },
  table: {
    width         : '100%',
    borderCollapse: 'collapse',
    marginBottom  : '16px'
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
    padding : '12px 16px',
    fontSize: '14px',
    color   : theme.textPrimary
  },
  removeButton: {
    backgroundColor: '#dc2626',
    color          : 'white',
    border         : 'none',
    padding        : '6px 12px',
    borderRadius   : '6px',
    fontSize       : '13px',
    cursor         : 'pointer'
  },
  summarySection: {
    display       : 'flex',
    justifyContent: 'flex-end',
    marginBottom  : '16px'
  },
  summaryBox: {
   width    : isMobile ? '100%' : '320px',
  borderTop: `2px solid ${theme.border}`,
  paddingTop: '16px'
  },
  summaryRow: {
    display        : 'flex',
    justifyContent : 'space-between',
    alignItems     : 'center',
    marginBottom   : '12px'
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
    borderTop : `2px solid ${theme.border}`,
    paddingTop: '12px',
    marginTop : '4px'
  },
  grandTotalLabel: {
    fontSize  : '16px',
    fontWeight: '700',
    color     : theme.textPrimary
  },
  grandTotalValue: {
    fontSize  : '20px',
    fontWeight: '800',
    color     : theme.textPrimary
  },
  discountInput: {
    padding        : '6px 10px',
    borderRadius   : '6px',
    border         : `1px solid ${theme.borderInput}`,
    fontSize       : '14px',
    width          : '100px',
    textAlign      : 'right',
    backgroundColor: theme.inputBg,
    color          : theme.textPrimary
  },
  payCustomerNote: {
    backgroundColor: isDark ? '#2d0a0a' : '#fee2e2',
    color          : '#dc2626',
    padding        : '10px 12px',
    borderRadius   : '8px',
    fontSize       : '13px',
    fontWeight     : '600',
    marginTop      : '8px',
    textAlign      : 'center'
  },
  saveBillButton: {
    backgroundColor: '#1a1a2e',
    color          : 'white',
    border         : 'none',
    padding        : '12px 32px',
    borderRadius   : '8px',
    fontSize       : '15px',
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
  sectionHeading: {
    fontSize    : '15px',
    fontWeight  : '700',
    color       : theme.textPrimary,
    marginBottom: '12px',
    marginTop   : '8px'
  },
  billCard: {
     backgroundColor: theme.cardBg,
  borderRadius   : '12px',
  padding        : isMobile ? '16px' : '40px',
  boxShadow      : theme.shadow,
  border         : `1px solid ${theme.border}`,
  marginBottom   : '20px',
  maxWidth       : '860px',
  margin         : '0 auto 20px auto'
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
    color     : theme.textPrimary
  },
  billMeta: {
    textAlign: 'right'
  },
  billMetaText: {
    fontSize    : '14px',
    color       : theme.textPrimary,
    marginBottom: '4px'
  },
  billDivider: {
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
    marginBottom  : '20px'
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
  billSummary: {
    display      : 'flex',
    flexDirection: 'column',
    alignItems   : 'flex-end',
    gap          : '8px',
    borderTop    : `2px solid ${theme.border}`,
    paddingTop   : '16px',
    marginBottom : '16px'
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
  billActions: {
    display       : 'flex',
    gap           : '12px',
    justifyContent: 'center',
    marginTop     : '20px'
  },
  printButton: {
    backgroundColor: '#1a1a2e',
    color          : 'white',
    border         : 'none',
    padding        : '12px 32px',
    borderRadius   : '8px',
    fontSize       : '14px',
    fontWeight     : '600',
    cursor         : 'pointer'
  },
  newBillButton: {
    backgroundColor: theme.cardBg,
    color          : theme.textPrimary,
    border         : `2px solid ${theme.border}`,
    padding        : '12px 32px',
    borderRadius   : '8px',
    fontSize       : '14px',
    fontWeight     : '600',
    cursor         : 'pointer'
  }
}
  // ── SAVED BILL VIEW ────────────────────────────────────
  if (savedBill) {
    const parsedData = typeof savedBill.items_json === 'string'
      ? JSON.parse(savedBill.items_json)
      : savedBill.items_json
    const items      = parsedData.items     || []
    const old_items  = parsedData.old_items || []

    

    return (
      <div>
        <div style={styles.billCard}>

          <div style={styles.billHeader}>
            <h1 style={styles.shopName}>Palivella Jewellery</h1>
            <div style={styles.billMeta}>
              <p style={styles.billMetaText}>
                Bill No: <strong>{savedBill.bill_number}</strong>
              </p>
              <p style={styles.billMetaText}>
                Date: <strong>{savedBill.bill_date}</strong>
              </p>
            </div>
          </div>

          <div style={styles.billDivider} />

          <div style={styles.customerSection}>
            <p style={styles.customerText}>
              <strong>Customer:</strong> {savedBill.customer_name}
            </p>
            {savedBill.customer_phone && (
              <p style={styles.customerText}>
                <strong>Phone:</strong> {savedBill.customer_phone}
              </p>
            )}
          </div>

          {/* New Items */}
          <h3 style={styles.sectionHeading}>Purchased Items</h3>
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
                  <td style={styles.billTd}>{item.actual_weight}g</td>
                  <td style={styles.billTd}>{item.billing_weight}g</td>
                  <td style={styles.billTd}>₹{item.rate}</td>
                  <td style={styles.billTd}>₹{parseFloat(item.price).toFixed(2)}</td>
                  <td style={styles.billTd}>₹{parseFloat(item.making_charges).toFixed(2)}</td>
                  <td style={styles.billTd}>₹{parseFloat(item.total_price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Old Items */}
          {old_items.length > 0 && (
            <>
              <h3 style={{ ...styles.sectionHeading, color: '#dc2626' }}>
                Old Items Exchange
              </h3>
              <table style={styles.billTable}>
                <thead>
                  <tr style={{ ...styles.billTableHead, backgroundColor: '#dc2626' }}>
                    <th style={styles.billTh}>Item</th>
                    <th style={styles.billTh}>Category</th>
                    <th style={styles.billTh}>Original Wt</th>
                    <th style={styles.billTh}>Pure Wt</th>
                    <th style={styles.billTh}>Rate/g</th>
                    <th style={styles.billTh}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {old_items.map((item, index) => (
                    <tr key={index} style={styles.billTableRow}>
                      <td style={styles.billTd}>{item.item_name}</td>
                      <td style={styles.billTd}>{item.category}</td>
                      <td style={styles.billTd}>{item.original_weight}g</td>
                      <td style={styles.billTd}>{item.pure_weight}g</td>
                      <td style={styles.billTd}>₹{item.rate}</td>
                      <td style={{ ...styles.billTd, color: '#dc2626', fontWeight: '700' }}>
                        - ₹{parseFloat(item.value).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Bill Summary */}
          <div style={styles.billSummary}>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Subtotal</span>
              <span style={styles.summaryValue}>{formatCurrency(savedBill.subtotal)}</span>
            </div>
            {old_items.length > 0 && (
  <div style={styles.summaryRow}>
    <span style={styles.summaryLabel}>Old Items Exchange</span>
    <span style={{ ...styles.summaryValue, color: '#dc2626' }}>
      - {formatCurrency(
          old_items.reduce((sum, item) => sum + parseFloat(item.value || 0), 0)
        )}
    </span>
  </div>
)}
            {savedBill.discount > 0 && (
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Discount</span>
                <span style={{ ...styles.summaryValue, color: '#dc2626' }}>
                  - {formatCurrency(savedBill.discount)}
                </span>
              </div>
            )}
            <div style={{ ...styles.summaryRow, ...styles.grandTotalRow }}>
              <span style={styles.grandTotalLabel}>
                {savedBill.grand_total < 0 ? 'Amount to Pay Customer' : 'Grand Total'}
              </span>
              <span style={{
                ...styles.grandTotalValue,
                color: savedBill.grand_total < 0 ? '#dc2626' : '#1a1a2e'
              }}>
                {formatCurrency(Math.abs(savedBill.grand_total))}
              </span>
            </div>
          </div>

          {savedBill.grand_total < 0 && (
            <div style={styles.payCustomerNote}>
              Customer should receive {formatCurrency(Math.abs(savedBill.grand_total))}
            </div>
          )}

          <div style={styles.billFooter}>
            <p style={styles.footerText}>Thank you for your purchase!</p>
            <p style={styles.footerText}>Palivella Jewellery</p>
          </div>

        </div>

        <div style={styles.billActions}>
          <button style={styles.printButton} onClick={handlePrint}>
            Print Bill
          </button>
          <button style={styles.newBillButton} onClick={handleNewBill}>
            New Bill
          </button>
        </div>
      </div>
    )
  }

  // ── BILLING FORM ───────────────────────────────────────
  
  
  return (
    <div>

      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Billing</h1>
          <p style={styles.pageSubtitle}>Create a new bill for your customer</p>
        </div>
      </div>

      {error   && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.successMsg}>{success}</div>}

      {/* Customer Details */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Customer Details</h2>
        <div style={styles.formGrid2}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Customer Name</label>
            <input
              style={styles.input}
              placeholder="Enter customer name"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Phone Number</label>
            <input
              style={styles.input}
              placeholder="Enter phone number"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Add New Item */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Add New Item to Bill</h2>
        <div style={styles.formGrid3}>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Select Item *</label>
            <select
              style={styles.input}
              value={currentItem.item_id}
              onChange={handleItemSelect}
            >
              <option value="">-- Select item --</option>
              {stockItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.category}) — {item.net_weight_g}g available
                </option>
              ))}
            </select>
          </div>

          {currentItem.category === 'Gold' && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Gold Type *</label>
              <select
                style={styles.input}
                value={currentItem.gold_type}
                onChange={e => setCurrentItem(prev => ({ ...prev, gold_type: e.target.value }))}
              >
                <option value="KDM">KDM</option>
                <option value="NonKDM">Non KDM</option>
              </select>
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Actual Weight (g) *</label>
            <input
              style={styles.input}
              type="number"
              placeholder="Weight in grams"
              value={currentItem.actual_weight}
              onChange={e => setCurrentItem(prev => ({ ...prev, actual_weight: e.target.value }))}
            />
          </div>

          {currentItem.category === 'Gold' &&
           parseFloat(currentItem.actual_weight) > 2 && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Extra Weight (g)</label>
              <input
                style={styles.input}
                type="number"
                value={currentItem.extra_weight}
                onChange={e => setCurrentItem(prev => ({ ...prev, extra_weight: e.target.value }))}
              />
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Rate per gram (₹) *</label>
            <input
              style={styles.input}
              type="number"
              placeholder="Today's rate"
              value={currentItem.rate}
              onChange={e => setCurrentItem(prev => ({ ...prev, rate: e.target.value }))}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Making Charges (₹)</label>
            <input
              style={styles.input}
              type="number"
              placeholder="Enter making charges"
              value={currentItem.making_charges}
              onChange={e => setCurrentItem(prev => ({ ...prev, making_charges: e.target.value }))}
            />
          </div>

        </div>

        {/* Live Price Preview */}
        {currentItem.actual_weight && currentItem.rate && (
  <div style={styles.pricePreview}>
    {(() => {
      const calc = calculateItemPrice(currentItem)
      return (
        <div style={styles.previewGrid}>

          <div style={styles.previewItem}>
            <span style={styles.previewLabel}>Billing Weight</span>
            <span style={{ ...styles.previewValue, color: '#3b82f6' }}>
              {calc.billing_weight.toFixed(3)}g
            </span>
          </div>

          <div style={styles.previewItem}>
            <span style={styles.previewLabel}>Item Price</span>
            <span style={{ ...styles.previewValue, color: '#f59e0b' }}>
              ₹{calc.price.toFixed(2)}
            </span>
          </div>

          <div style={styles.previewItem}>
            <span style={styles.previewLabel}>Making Charges</span>
            <span style={{ ...styles.previewValue, color: '#8b5cf6' }}>
              ₹{calc.making_charges.toFixed(2)}
            </span>
          </div>

          <div style={styles.previewItem}>
            <span style={styles.previewLabel}>Item Total</span>
            <span style={{ ...styles.previewValue, color: '#10b981', fontWeight: '800' }}>
              ₹{calc.total_price.toFixed(2)}
            </span>
          </div>

        </div>
      )
    })()}
  </div>
)}

        <button style={styles.addItemButton} onClick={handleAddItem}>
          Add to Bill
        </button>
      </div>

      {/* Old Gold/Silver Exchange */}
      <div style={styles.card}>
        <div style={styles.oldItemHeader}>
          <h2 style={styles.cardTitle}>Old Item Exchange</h2>
          <button
            style={styles.addOldItemButton}
            onClick={() => setShowOldItemForm(!showOldItemForm)}
          >
            {showOldItemForm ? 'Cancel' : 'Add Old Item'}
          </button>
        </div>

        {showOldItemForm && (
          <>
            <div style={styles.formGrid3}>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Item Name *</label>
                <input
                  style={styles.input}
                  placeholder="e.g. Old Gold Chain"
                  value={currentOldItem.item_name}
                  onChange={e => setCurrentOldItem(prev => ({ ...prev, item_name: e.target.value }))}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Category *</label>
                <select
                  style={styles.input}
                  value={currentOldItem.category}
                  onChange={e => setCurrentOldItem(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Original Weight (g)</label>
                <input
                  style={styles.input}
                  type="number"
                  placeholder="Gross weight"
                  value={currentOldItem.original_weight}
                  onChange={e => setCurrentOldItem(prev => ({ ...prev, original_weight: e.target.value }))}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Pure Weight (g) *</label>
                <input
                  style={styles.input}
                  type="number"
                  placeholder="Weight after purity check"
                  value={currentOldItem.pure_weight}
                  onChange={e => setCurrentOldItem(prev => ({ ...prev, pure_weight: e.target.value }))}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Rate per gram (₹) *</label>
                <input
                  style={styles.input}
                  type="number"
                  placeholder="Enter rate"
                  value={currentOldItem.rate}
                  onChange={e => setCurrentOldItem(prev => ({ ...prev, rate: e.target.value }))}
                />
              </div>

            </div>

            {/* Old Item Value Preview */}
            {currentOldItem.pure_weight && currentOldItem.rate && (
              <div style={styles.oldItemPreview}>
                <span>Old Item Value</span>
                <strong>
                  - ₹{calculateOldItemValue(currentOldItem).toFixed(2)}
                </strong>
              </div>
            )}

            <button style={styles.addOldItemConfirmButton} onClick={handleAddOldItem}>
              Add Old Item
            </button>
          </>
        )}

        {/* Old Items List */}
        {oldItems.length > 0 && (
          <table style={{ ...styles.table, marginTop: '16px' }}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>Item</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Original Wt</th>
                <th style={styles.th}>Pure Wt</th>
                <th style={styles.th}>Rate/g</th>
                <th style={styles.th}>Value</th>
                <th style={styles.th}>Remove</th>
              </tr>
            </thead>
            <tbody>
              {oldItems.map((item) => (
                <tr key={item.uid} style={styles.tableRow}>
                  <td style={styles.td}>{item.item_name}</td>
                  <td style={styles.td}>{item.category}</td>
                  <td style={styles.td}>{item.original_weight || '—'}g</td>
                  <td style={styles.td}>{item.pure_weight}g</td>
                  <td style={styles.td}>₹{item.rate}</td>
                  <td style={{ ...styles.td, color: '#dc2626', fontWeight: '700' }}>
                    - ₹{item.value.toFixed(2)}
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.removeButton}
                      onClick={() => handleRemoveOldItem(item.uid)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {oldItems.length === 0 && !showOldItemForm && (
          <p style={styles.emptyOldItems}>
            No old items added. Click "Add Old Item" if customer brings old gold/silver.
          </p>
        )}
      </div>

      {/* Bill Items Table */}
      {billItems.length > 0 && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Bill Items</h2>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>Item</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Actual Wt</th>
                <th style={styles.th}>Bill Wt</th>
                <th style={styles.th}>Rate/g</th>
                <th style={styles.th}>Price</th>
                <th style={styles.th}>Making</th>
                <th style={styles.th}>Total</th>
                <th style={styles.th}>Remove</th>
              </tr>
            </thead>
            <tbody>
              {billItems.map((item) => (
                <tr key={item.uid} style={styles.tableRow}>
                  <td style={styles.td}>{item.item_name}</td>
                  <td style={styles.td}>
                    {item.category === 'Gold' ? item.gold_type : 'Silver'}
                  </td>
                  <td style={styles.td}>{item.actual_weight}g</td>
                  <td style={styles.td}>{item.billing_weight}g</td>
                  <td style={styles.td}>₹{item.rate}</td>
                  <td style={styles.td}>₹{item.price.toFixed(2)}</td>
                  <td style={styles.td}>₹{item.making_charges.toFixed(2)}</td>
                  <td style={styles.td}>₹{item.total_price.toFixed(2)}</td>
                  <td style={styles.td}>
                    <button
                      style={styles.removeButton}
                      onClick={() => handleRemoveItem(item.uid)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary */}
          <div style={styles.summarySection}>
            <div style={styles.summaryBox}>

              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Subtotal</span>
                <span style={styles.summaryValue}>₹{subtotal.toFixed(2)}</span>
              </div>

              {oldItems.length > 0 && (
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Old Items Exchange</span>
                  <span style={{ ...styles.summaryValue, color: '#dc2626' }}>
                    - ₹{oldItemsTotal.toFixed(2)}
                  </span>
                </div>
              )}

              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Discount (₹)</span>
                <input
                  style={styles.discountInput}
                  type="number"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div style={{ ...styles.summaryRow, ...styles.grandTotalRow }}>
                <span style={styles.grandTotalLabel}>
                  {grandTotal < 0 ? 'Pay to Customer' : 'Grand Total'}
                </span>
                <span style={{
                  ...styles.grandTotalValue,
                  color: grandTotal < 0 ? '#dc2626' : '#1a1a2e'
                }}>
                  ₹{Math.abs(grandTotal).toFixed(2)}
                </span>
              </div>

              {grandTotal < 0 && (
                <div style={styles.payCustomerNote}>
                  Pay customer ₹{Math.abs(grandTotal).toFixed(2)}
                </div>
              )}

            </div>
          </div>

          <button style={styles.saveBillButton} onClick={handleSaveBill}>
            Save Bill
          </button>

        </div>
      )}

    </div>
  )
}

// ── STYLES ─────────────────────────────────────────────────


export default Billing