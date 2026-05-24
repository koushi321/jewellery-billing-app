import { useTheme } from '../context/ThemeContext'
import { getTheme } from '../context/theme'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function GoldLoan() {
  const { isDark } = useTheme()
  const theme      = getTheme(isDark)
  const [activeTab, setActiveTab]       = useState('loans')
  const [loans, setLoans]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState('')
  const [showAddForm, setShowAddForm]   = useState(false)
  const [selectedLoan, setSelectedLoan] = useState(null)
  const [loanFilter, setLoanFilter]     = useState('active')
  const [showPayment, setShowPayment]   = useState(false)
  const [searchQuery, setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching]       = useState(false)

  const [form, setForm] = useState({
    loan_id      : '',
    person_name  : '',
    phone        : '',
    address      : '',
    gold_weight_g: '',
    net_weight_g : '',
    gold_purity  : '22K',
    gold_value   : '',
    loan_amount  : '',
    interest_rate: '2',
    loan_date    : new Date().toISOString().split('T')[0],
    due_date     : '',
    notes        : ''
  })

  const [paymentForm, setPaymentForm] = useState({
    amount_paid : '',
    payment_date: new Date().toISOString().split('T')[0],
    notes       : ''
  })

  // ── FETCH LOANS ────────────────────────────────────────
  const fetchLoans = async () => {
    try {
      const { data, error } = await supabase
        .from('gold_loans')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setLoans(data || [])
    } catch {
      setError('Failed to load loans')
    }
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('gold_loans')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw error
        if (!cancelled) setLoans(data || [])
      } catch {
        if (!cancelled) setError('Failed to load loans')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── FILTER LOANS ───────────────────────────────────────
  const filteredLoans = loans.filter(l => {
    if (loanFilter === 'all')    return true
    if (loanFilter === 'active') return l.status === 'active'
    if (loanFilter === 'closed') return l.status === 'closed'
    return true
  })

  // ── PURITY OPTIONS ─────────────────────────────────────
  const purityOptions  = ['24K', '22K', '18K', '916']
  const isCustomPurity = !purityOptions.includes(form.gold_purity)

  // ── RESET FORM ─────────────────────────────────────────
  const resetForm = () => {
    setForm({
      loan_id: '', person_name: '', phone: '', address: '',
      gold_weight_g: '', net_weight_g: '', gold_purity: '22K',
      gold_value: '', loan_amount: '', interest_rate: '2',
      loan_date: new Date().toISOString().split('T')[0],
      due_date: '', notes: ''
    })
  }

  // ── ADD LOAN ───────────────────────────────────────────
  const handleAddLoan = async () => {
    setError('')
    try {
      if (!form.loan_id || !form.person_name || !form.gold_weight_g || !form.loan_amount || !form.interest_rate || !form.loan_date) {
        setError('Please fill all required fields')
        return
      }

      // Check if loan_id already exists
      const { data: existing, error: existingErr } = await supabase
        .from('gold_loans')
        .select('id')
        .eq('person_id', form.loan_id)
        .maybeSingle()

      if (existingErr) throw existingErr
      if (existing) {
        setError('Loan ID already exists. Use a different ID.')
        return
      }

      const { error: insertErr } = await supabase
        .from('gold_loans')
        .insert({
          person_id: form.loan_id,
          person_name: form.person_name,
          phone: form.phone || '',
          address: form.address || '',
          gold_weight_g: parseFloat(form.gold_weight_g),
          net_weight_g : parseFloat(form.net_weight_g)  || 0,
          gold_purity  : form.gold_purity   || '',
          gold_value   : parseFloat(form.gold_value)    || 0,
          loan_amount  : parseFloat(form.loan_amount),
          interest_rate: parseFloat(form.interest_rate),
          loan_date    : form.loan_date,
          due_date     : form.due_date      || null,
          status       : 'active',
          notes        : form.notes         || ''
        })

      if (insertErr) throw insertErr

      setSuccess('Loan added successfully!')
      setShowAddForm(false)
      resetForm()
      fetchLoans()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to add loan')
    }
  }

  // ── VIEW LOAN ──────────────────────────────────────────
  const handleViewLoan = async (loanId) => {
    try {
      setError('')
      const { data: loan, error: loanErr } = await supabase
        .from('gold_loans')
        .select('*')
        .eq('person_id', loanId)
        .maybeSingle()

      if (loanErr) throw loanErr
      if (!loan) throw new Error('Loan not found')

      const { data: payments, error: payErr } = await supabase
        .from('loan_payments')
        .select('*')
        .eq('loan_id', loan.id)
        .order('payment_date', { ascending: true })

      if (payErr) throw payErr

      // ── Interest Calculation ──────────────────────────────
      const loanDate  = new Date(loan.loan_date)

      // If loan is closed → use closed date
      // If loan is active → use today
      const endDate   = loan.status === 'closed' && loan.closed_date
        ? new Date(loan.closed_date)
        : new Date()

      const diffDays  = Math.floor((endDate - loanDate) / (1000 * 60 * 60 * 24))
      const months    = diffDays / 30
      const interest  = loan.loan_amount * (loan.interest_rate / 100) * months
      const totalPaid = (payments || []).reduce((sum, p) => sum + p.amount_paid, 0)
      const totalDue  = loan.loan_amount + interest - totalPaid

      setSelectedLoan({
        loan,
        payments: payments || [],
        calculation: {
          diffDays    : Math.floor(diffDays),
          months      : months.toFixed(2),
          interest    : interest.toFixed(2),
          totalPaid   : totalPaid.toFixed(2),
          totalDue    : totalDue.toFixed(2),
          endDate     : endDate.toISOString().split('T')[0],
          isClosedLoan: loan.status === 'closed'
        }
      })
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to load loan details')
    }
  }

  // ── RECORD PAYMENT ─────────────────────────────────────
  const handleRecordPayment = async () => {
    try {
      setError('')
      if (!paymentForm.amount_paid || parseFloat(paymentForm.amount_paid) <= 0) {
        setError('Please enter a valid amount')
        return
      }

      const { error: payErr } = await supabase
        .from('loan_payments')
        .insert({
          loan_id: selectedLoan.loan.id,
          amount_paid: parseFloat(paymentForm.amount_paid),
          payment_date: paymentForm.payment_date,
          notes: paymentForm.notes || ''
        })

      if (payErr) throw payErr

      setSuccess('Payment recorded!')
      setShowPayment(false)
      setPaymentForm({
        amount_paid : '',
        payment_date: new Date().toISOString().split('T')[0],
        notes       : ''
      })
      handleViewLoan(selectedLoan.loan.person_id)
      fetchLoans()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error(err)
      setError('Failed to record payment')
    }
  }

  // ── CLOSE LOAN ─────────────────────────────────────────
  const handleCloseLoan = async (loanId) => {
    if (!window.confirm('Are you sure you want to close this loan?')) return
    try {
      const today = new Date().toISOString().split('T')[0]
      const { error } = await supabase
        .from('gold_loans')
        .update({
          status: 'closed',
          closed_date: today
        })
        .eq('person_id', loanId)

      if (error) throw error

      setSuccess('Loan closed successfully!')
      setSelectedLoan(null)
      fetchLoans()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error(err)
      setError('Failed to close loan')
    }
  }

  // ── SEARCH CUSTOMER ────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery || searchQuery.length < 2) {
      setError('Please enter at least 2 characters')
      return
    }
    try {
      setSearching(true)
      setError('')
      
      const pattern = `%${searchQuery}%`

      const { data: bills, error: billsErr } = await supabase
        .from('bills')
        .select('*')
        .or(`customer_name.ilike.${pattern},customer_phone.ilike.${pattern}`)
        .order('created_at', { ascending: false })

      if (billsErr) throw billsErr

      const { data: loans, error: loansErr } = await supabase
        .from('gold_loans')
        .select('*')
        .or(`person_name.ilike.${pattern},phone.ilike.${pattern}`)
        .order('created_at', { ascending: false })

      if (loansErr) throw loansErr

      setSearchResults({ bills: bills || [], loans: loans || [] })
    } catch (err) {
      console.error(err)
      setError('Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  // ── FORMAT CURRENCY ────────────────────────────────────
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style               : 'currency',
      currency            : 'INR',
      maximumFractionDigits: 2
    }).format(amount)
  }

  // ── PRINT ──────────────────────────────────────────────
  const handlePrint = () => window.print()

  // ── LOAN DETAIL VIEW ───────────────────────────────────
  if (selectedLoan) {
    const { loan, payments, calculation } = selectedLoan

    return (
      <div>
        <button style={styles.backButton} onClick={() => setSelectedLoan(null)}>
          Back to Loans
        </button>

        {error   && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.successMsg}>{success}</div>}

        <div style={styles.loanCard}>

          {/* ── Header ── */}
          <div style={styles.loanCardHeader}>
            <div>
              <h1 style={styles.shopName}>Palivella Jewellery</h1>
              <p style={styles.loanCardSub}>Gold Loan Card</p>
            </div>
            <div style={styles.loanCardMeta}>
              <p style={styles.loanCardMetaText}>
                Loan ID: <strong>{loan.person_id}</strong>
              </p>
              <p style={styles.loanCardMetaText}>
                Date: <strong>{loan.loan_date}</strong>
              </p>
              <span style={{
                ...styles.statusBadge,
                backgroundColor: loan.status === 'active' ? '#16a34a' : '#6b7280'
              }}>
                {loan.status.toUpperCase()}
              </span>
            </div>
          </div>

          <div style={styles.divider} />

          {/* ── Customer & Gold Details ── */}
          <div style={styles.loanDetailGrid}>
            <div style={styles.detailSection}>
              <h3 style={styles.detailSectionTitle}>Customer Details</h3>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Name</span>
                <span style={styles.detailValue}>{loan.person_name}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Phone</span>
                <span style={styles.detailValue}>{loan.phone || '—'}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Address</span>
                <span style={styles.detailValue}>{loan.address || '—'}</span>
              </div>
              {loan.due_date && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Due Date</span>
                  <span style={styles.detailValue}>{loan.due_date}</span>
                </div>
              )}
            </div>

            <div style={styles.detailSection}>
              <h3 style={styles.detailSectionTitle}>Gold Details</h3>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Gross Weight</span>
                <span style={styles.detailValue}>{loan.gold_weight_g} g</span>
              </div>
              {loan.net_weight_g > 0 && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Net Weight</span>
                  <span style={styles.detailValue}>{loan.net_weight_g} g</span>
                </div>
              )}
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Purity</span>
                <span style={styles.detailValue}>{loan.gold_purity}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Gold Value</span>
                <span style={styles.detailValue}>{formatCurrency(loan.gold_value)}</span>
              </div>
              {loan.notes && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Notes</span>
                  <span style={styles.detailValue}>{loan.notes}</span>
                </div>
              )}
            </div>
          </div>

          <div style={styles.divider} />

          {/* ── Interest Calculation ── */}
          <h3 style={styles.detailSectionTitle}>Interest Calculation</h3>

          {/* Date Range */}
          <div style={styles.dateRangeBox}>
            <div style={styles.dateRangeItem}>
              <span style={styles.dateRangeLabel}>Loan Start Date</span>
              <span style={styles.dateRangeValue}>{loan.loan_date}</span>
            </div>
            <div style={styles.dateRangeArrow}>→</div>
            <div style={styles.dateRangeItem}>
              <span style={styles.dateRangeLabel}>
                {calculation.isClosedLoan ? 'Closed Date' : 'Today'}
              </span>
              <span style={styles.dateRangeValue}>{calculation.endDate}</span>
            </div>
            <div style={styles.dateRangeArrow}>→</div>
            <div style={styles.dateRangeItem}>
              <span style={styles.dateRangeLabel}>Duration</span>
              <span style={styles.dateRangeValue}>
                {calculation.diffDays} days ({calculation.months} months)
              </span>
            </div>
          </div>

          {/* Calc Cards */}
          <div style={styles.calcGrid}>
            <div style={styles.calcCard}>
              <p style={styles.calcLabel}>Loan Amount</p>
              <p style={styles.calcValue}>{formatCurrency(loan.loan_amount)}</p>
            </div>
            <div style={styles.calcCard}>
              <p style={styles.calcLabel}>Interest Rate</p>
              <p style={styles.calcValue}>{loan.interest_rate}% / month</p>
            </div>
            <div style={styles.calcCard}>
              <p style={styles.calcLabel}>Interest Amount</p>
              <p style={{ ...styles.calcValue, color: '#f59e0b' }}>
                {formatCurrency(calculation.interest)}
              </p>
            </div>
          </div>

          {/* Final Amount Breakdown */}
          <div style={styles.finalAmountBox}>
            <div style={styles.finalAmountRow}>
              <span style={styles.finalAmountLabel}>Loan Amount</span>
              <span style={styles.finalAmountValue}>
                {formatCurrency(loan.loan_amount)}
              </span>
            </div>
            <div style={styles.finalAmountRow}>
              <span style={styles.finalAmountLabel}>
                Interest ({loan.interest_rate}% × {calculation.months} months)
              </span>
              <span style={{ ...styles.finalAmountValue, color: '#f59e0b' }}>
                + {formatCurrency(calculation.interest)}
              </span>
            </div>
            {calculation.totalPaid > 0 && (
              <div style={styles.finalAmountRow}>
                <span style={styles.finalAmountLabel}>Amount Already Paid</span>
                <span style={{ ...styles.finalAmountValue, color: '#16a34a' }}>
                  - {formatCurrency(calculation.totalPaid)}
                </span>
              </div>
            )}
            <div style={styles.totalDueBox}>
              <span style={styles.totalDueLabel}>
                {calculation.isClosedLoan ? 'Final Amount (Closed)' : 'Total Amount Due'}
              </span>
              <span style={styles.totalDueValue}>
                {formatCurrency(calculation.totalDue)}
              </span>
            </div>
          </div>

          {/* ── Payment History ── */}
          {payments.length > 0 && (
            <>
              <div style={styles.divider} />
              <h3 style={styles.detailSectionTitle}>Payment History</h3>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Amount Paid</th>
                    <th style={styles.th}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} style={styles.tableRow}>
                      <td style={styles.td}>{payment.payment_date}</td>
                      <td style={{ ...styles.td, color: '#16a34a', fontWeight: '600' }}>
                        {formatCurrency(payment.amount_paid)}
                      </td>
                      <td style={styles.td}>{payment.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

        </div>

        {/* ── Action Buttons ── */}
        {loan.status === 'active' && (
          <div style={styles.actionButtons}>
            {!showPayment ? (
              <button style={styles.paymentButton} onClick={() => setShowPayment(true)}>
                Record Payment
              </button>
            ) : (
              <div style={styles.paymentForm}>
                <h3 style={styles.paymentFormTitle}>Record Payment</h3>
                <div style={styles.paymentGrid}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Amount Paid (₹) *</label>
                    <input
                      style={styles.input}
                      type="number"
                      placeholder="Enter amount"
                      value={paymentForm.amount_paid}
                      onChange={e => setPaymentForm(p => ({ ...p, amount_paid: e.target.value }))}
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Payment Date *</label>
                    <input
                      style={styles.input}
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={e => setPaymentForm(p => ({ ...p, payment_date: e.target.value }))}
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Notes</label>
                    <input
                      style={styles.input}
                      placeholder="Optional notes"
                      value={paymentForm.notes}
                      onChange={e => setPaymentForm(p => ({ ...p, notes: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={styles.paymentActions}>
                  <button style={styles.saveButton} onClick={handleRecordPayment}>
                    Save Payment
                  </button>
                  <button style={styles.cancelButton} onClick={() => setShowPayment(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <button style={styles.closeButton} onClick={() => handleCloseLoan(loan.person_id)}>
              Close Loan
            </button>
            <button style={styles.printButton} onClick={handlePrint}>
              Print Loan Card
            </button>
          </div>
        )}

        {loan.status === 'closed' && (
          <div style={styles.actionButtons}>
            <button style={styles.printButton} onClick={handlePrint}>
              Print Loan Card
            </button>
          </div>
        )}

      </div>
    )
  }

  // ── MAIN RENDER ────────────────────────────────────────
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
  formCard: {
    backgroundColor: theme.cardBg,
    borderRadius   : '12px',
    padding        : '24px',
    marginBottom   : '24px',
    boxShadow      : theme.shadow,
    border         : `1px solid ${theme.border}`
  },
  formTitle: {
    fontSize    : '16px',
    fontWeight  : '600',
    color       : theme.textPrimary,
    marginBottom: '16px'
  },
  formGrid: {
    display             : 'grid',
    gridTemplateColumns : 'repeat(3, 1fr)',
    gap                 : '16px',
    marginBottom        : '16px'
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
  formButtons: {
    display: 'flex',
    gap    : '12px'
  },
  filterButtons: {
    display     : 'flex',
    gap         : '8px',
    marginBottom: '16px'
  },
  filterBtn: {
    backgroundColor: theme.cardBg,
    color          : theme.textSecondary,
    border         : `1px solid ${theme.border}`,
    padding        : '8px 16px',
    borderRadius   : '8px',
    fontSize       : '13px',
    fontWeight     : '600',
    cursor         : 'pointer'
  },
  filterBtnActive: {
    backgroundColor: '#1a1a2e',
    color          : 'white',
    border         : '1px solid #1a1a2e',
    padding        : '8px 16px',
    borderRadius   : '8px',
    fontSize       : '13px',
    fontWeight     : '600',
    cursor         : 'pointer'
  },
  tableCard: {
    backgroundColor: theme.cardBg,
    borderRadius   : '12px',
    padding        : '24px',
    marginBottom   : '24px',
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
  searchCard: {
    backgroundColor: theme.cardBg,
    borderRadius   : '12px',
    padding        : '24px',
    marginBottom   : '24px',
    boxShadow      : theme.shadow,
    border         : `1px solid ${theme.border}`
  },
  searchHint: {
    fontSize    : '13px',
    color       : theme.textSecondary,
    marginBottom: '16px'
  },
  searchRow: {
    display: 'flex',
    gap    : '12px'
  },
  searchInput: {
    flex           : 1,
    padding        : '12px 16px',
    borderRadius   : '8px',
    border         : `1px solid ${theme.borderInput}`,
    fontSize       : '14px',
    outline        : 'none',
    backgroundColor: theme.inputBg,
    color          : theme.textPrimary
  },
  searchButton: {
    backgroundColor: '#1a1a2e',
    color          : 'white',
    border         : 'none',
    padding        : '12px 24px',
    borderRadius   : '8px',
    fontSize       : '14px',
    fontWeight     : '600',
    cursor         : 'pointer'
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
  loanCard: {
    backgroundColor: theme.cardBg,
    borderRadius   : '12px',
    padding        : '40px',
    boxShadow      : theme.shadow,
    border         : `1px solid ${theme.border}`,
    marginBottom   : '24px'
  },
  loanCardHeader: {
    display        : 'flex',
    justifyContent : 'space-between',
    alignItems     : 'flex-start',
    marginBottom   : '16px'
  },
  shopName: {
    fontSize  : '24px',
    fontWeight: 'bold',
    color     : theme.textPrimary
  },
  loanCardSub: {
    fontSize : '14px',
    color    : theme.textSecondary,
    marginTop: '4px'
  },
  loanCardMeta: {
    textAlign: 'right'
  },
  loanCardMetaText: {
    fontSize    : '14px',
    color       : theme.textPrimary,
    marginBottom: '4px'
  },
  divider: {
    borderTop: `1px solid ${theme.border}`,
    margin   : '20px 0'
  },
  loanDetailGrid: {
    display             : 'grid',
    gridTemplateColumns : '1fr 1fr',
    gap                 : '24px'
  },
  detailSection: {
    display      : 'flex',
    flexDirection: 'column',
    gap          : '12px'
  },
  detailSectionTitle: {
    fontSize    : '15px',
    fontWeight  : '700',
    color       : theme.textPrimary,
    marginBottom: '8px'
  },
  detailRow: {
    display        : 'flex',
    justifyContent : 'space-between',
    padding        : '8px 0',
    borderBottom   : `1px solid ${theme.border}`
  },
  detailLabel: {
    fontSize: '13px',
    color   : theme.textSecondary
  },
  detailValue: {
    fontSize  : '13px',
    fontWeight: '600',
    color     : theme.textPrimary
  },
  dateRangeBox: {
    display        : 'flex',
    alignItems     : 'center',
    gap            : '16px',
    backgroundColor: theme.headerBg,
    borderRadius   : '10px',
    padding        : '16px 24px',
    marginBottom   : '16px',
    border         : `1px solid ${theme.border}`
  },
  dateRangeItem: {
    display      : 'flex',
    flexDirection: 'column',
    gap          : '4px'
  },
  dateRangeLabel: {
    fontSize: '12px',
    color   : theme.textSecondary
  },
  dateRangeValue: {
    fontSize  : '15px',
    fontWeight: '700',
    color     : theme.textPrimary
  },
  dateRangeArrow: {
    fontSize  : '20px',
    color     : theme.textPrimary,
    fontWeight: '700'
  },
  calcGrid: {
    display             : 'grid',
    gridTemplateColumns : 'repeat(3, 1fr)',
    gap                 : '16px',
    margin              : '16px 0'
  },
  calcCard: {
    backgroundColor: theme.headerBg,
    borderRadius   : '8px',
    padding        : '16px',
    border         : `1px solid ${theme.border}`
  },
  calcLabel: {
    fontSize    : '12px',
    color       : theme.textSecondary,
    marginBottom: '8px'
  },
  calcValue: {
    fontSize  : '18px',
    fontWeight: '700',
    color     : theme.textPrimary
  },
  finalAmountBox: {
    backgroundColor: theme.headerBg,
    borderRadius   : '12px',
    padding        : '20px 24px',
    marginTop      : '8px',
    border         : `1px solid ${theme.border}`
  },
  finalAmountRow: {
    display        : 'flex',
    justifyContent : 'space-between',
    alignItems     : 'center',
    padding        : '10px 0',
    borderBottom   : `1px solid ${theme.border}`
  },
  finalAmountLabel: {
    fontSize: '14px',
    color   : theme.textSecondary
  },
  finalAmountValue: {
    fontSize  : '14px',
    fontWeight: '600',
    color     : theme.textPrimary
  },
  totalDueBox: {
    display        : 'flex',
    justifyContent : 'space-between',
    alignItems     : 'center',
    backgroundColor: '#1a1a2e',
    borderRadius   : '10px',
    padding        : '16px 24px',
    marginTop      : '16px'
  },
  totalDueLabel: {
    fontSize  : '16px',
    fontWeight: '600',
    color     : 'white'
  },
  totalDueValue: {
    fontSize  : '24px',
    fontWeight: '800',
    color     : '#f59e0b'
  },
  actionButtons: {
    display     : 'flex',
    gap         : '12px',
    flexWrap    : 'wrap',
    marginBottom: '24px'
  },
  paymentButton: {
    backgroundColor: '#f59e0b',
    color          : 'white',
    border         : 'none',
    padding        : '10px 20px',
    borderRadius   : '8px',
    fontSize       : '14px',
    fontWeight     : '600',
    cursor         : 'pointer'
  },
  closeButton: {
    backgroundColor: '#dc2626',
    color          : 'white',
    border         : 'none',
    padding        : '10px 20px',
    borderRadius   : '8px',
    fontSize       : '14px',
    fontWeight     : '600',
    cursor         : 'pointer'
  },
  printButton: {
    backgroundColor: '#1a1a2e',
    color          : 'white',
    border         : 'none',
    padding        : '10px 20px',
    borderRadius   : '8px',
    fontSize       : '14px',
    fontWeight     : '600',
    cursor         : 'pointer'
  },
  saveButton: {
    backgroundColor: '#16a34a',
    color          : 'white',
    border         : 'none',
    padding        : '10px 20px',
    borderRadius   : '8px',
    fontSize       : '14px',
    fontWeight     : '600',
    cursor         : 'pointer'
  },
  paymentForm: {
    backgroundColor: theme.cardBg,
    borderRadius   : '12px',
    padding        : '24px',
    marginBottom   : '16px',
    boxShadow      : theme.shadow,
    border         : `1px solid ${theme.border}`,
    width          : '100%'
  },
  paymentFormTitle: {
    fontSize    : '15px',
    fontWeight  : '700',
    color       : theme.textPrimary,
    marginBottom: '16px'
  },
  paymentGrid: {
    display             : 'grid',
    gridTemplateColumns : 'repeat(3, 1fr)',
    gap                 : '16px',
    marginBottom        : '16px'
  },
  paymentActions: {
    display: 'flex',
    gap    : '12px'
  }
}
  
  return (
    <div>

      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Gold Loan</h1>
          <p style={styles.pageSubtitle}>Manage gold loans and customer history</p>
        </div>
        {activeTab === 'loans' && (
          <button style={styles.addButton} onClick={() => setShowAddForm(true)}>
            Add New Loan
          </button>
        )}
      </div>

      {error   && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.successMsg}>{success}</div>}

      <div style={styles.tabs}>
        <button
          style={activeTab === 'loans' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('loans')}
        >
          Gold Loans
        </button>
        <button
          style={activeTab === 'customer' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('customer')}
        >
          Customer Search
        </button>
      </div>

      {/* ── LOANS TAB ── */}
      {activeTab === 'loans' && (
        <>
          {showAddForm && (
            <div style={styles.formCard}>
              <h2 style={styles.formTitle}>Add New Loan</h2>
              <div style={styles.formGrid}>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Loan ID *</label>
                  <input
                    style={styles.input}
                    placeholder="e.g. GL001"
                    value={form.loan_id}
                    onChange={e => setForm(p => ({ ...p, loan_id: e.target.value }))}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Customer Name *</label>
                  <input
                    style={styles.input}
                    placeholder="Full name"
                    value={form.person_name}
                    onChange={e => setForm(p => ({ ...p, person_name: e.target.value }))}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Phone</label>
                  <input
                    style={styles.input}
                    placeholder="Phone number"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Address</label>
                  <input
                    style={styles.input}
                    placeholder="Address"
                    value={form.address}
                    onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Gross Weight (g) *</label>
                  <input
                    style={styles.input}
                    type="number"
                    placeholder="Total gold weight"
                    value={form.gold_weight_g}
                    onChange={e => setForm(p => ({ ...p, gold_weight_g: e.target.value }))}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Net Weight After Purity (g)</label>
                  <input
                    style={styles.input}
                    type="number"
                    placeholder="Weight after purity check"
                    value={form.net_weight_g}
                    onChange={e => setForm(p => ({ ...p, net_weight_g: e.target.value }))}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Gold Purity *</label>
                  <select
                    style={styles.input}
                    value={isCustomPurity ? 'custom' : form.gold_purity}
                    onChange={e => {
                      if (e.target.value !== 'custom') {
                        setForm(p => ({ ...p, gold_purity: e.target.value }))
                      } else {
                        setForm(p => ({ ...p, gold_purity: '' }))
                      }
                    }}
                  >
                    <option value="24K">24K</option>
                    <option value="22K">22K</option>
                    <option value="18K">18K</option>
                    <option value="916">916</option>
                    <option value="custom">Enter Manually</option>
                  </select>
                  {isCustomPurity && (
                    <input
                      style={{ ...styles.input, marginTop: '8px' }}
                      placeholder="Enter purity e.g. 750, 875"
                      value={form.gold_purity}
                      onChange={e => setForm(p => ({ ...p, gold_purity: e.target.value }))}
                    />
                  )}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Gold Value (₹)</label>
                  <input
                    style={styles.input}
                    type="number"
                    placeholder="Value at time of loan"
                    value={form.gold_value}
                    onChange={e => setForm(p => ({ ...p, gold_value: e.target.value }))}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Loan Amount (₹) *</label>
                  <input
                    style={styles.input}
                    type="number"
                    placeholder="Amount given to customer"
                    value={form.loan_amount}
                    onChange={e => setForm(p => ({ ...p, loan_amount: e.target.value }))}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Interest Rate (% / month) *</label>
                  <input
                    style={styles.input}
                    type="number"
                    placeholder="e.g. 2"
                    value={form.interest_rate}
                    onChange={e => setForm(p => ({ ...p, interest_rate: e.target.value }))}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Loan Date *</label>
                  <input
                    style={styles.input}
                    type="date"
                    value={form.loan_date}
                    onChange={e => setForm(p => ({ ...p, loan_date: e.target.value }))}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Due Date</label>
                  <input
                    style={styles.input}
                    type="date"
                    value={form.due_date}
                    onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Notes</label>
                  <input
                    style={styles.input}
                    placeholder="Any notes about the gold item"
                    value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  />
                </div>

              </div>

              <div style={styles.formButtons}>
                <button style={styles.addButton} onClick={handleAddLoan}>
                  Save Loan
                </button>
                <button
                  style={styles.cancelButton}
                  onClick={() => { setShowAddForm(false); resetForm() }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div style={styles.filterButtons}>
            {['active', 'closed', 'all'].map(filter => (
              <button
                key={filter}
                style={loanFilter === filter ? styles.filterBtnActive : styles.filterBtn}
                onClick={() => setLoanFilter(filter)}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                {' '}({loans.filter(l =>
                  filter === 'all' ? true : l.status === filter
                ).length})
              </button>
            ))}
          </div>

          <div style={styles.tableCard}>
            {loading ? (
              <p style={styles.loadingText}>Loading loans...</p>
            ) : filteredLoans.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>No {loanFilter} loans found</p>
                <p style={styles.emptySubText}>Click Add New Loan to create one</p>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>Loan ID</th>
                    <th style={styles.th}>Customer</th>
                    <th style={styles.th}>Phone</th>
                    <th style={styles.th}>Gross Wt</th>
                    <th style={styles.th}>Net Wt</th>
                    <th style={styles.th}>Purity</th>
                    <th style={styles.th}>Loan Amount</th>
                    <th style={styles.th}>Interest %</th>
                    <th style={styles.th}>Loan Date</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLoans.map((loan) => (
                    <tr key={loan.id} style={styles.tableRow}>
                      <td style={{ ...styles.td, fontWeight: '600', color: '#f59e0b' }}>
                      {loan.person_id}
                        </td>
                      <td style={styles.td}>{loan.person_name}</td>
                      <td style={styles.td}>{loan.phone || '—'}</td>
                      <td style={styles.td}>{loan.gold_weight_g} g</td>
                      <td style={styles.td}>
                        {loan.net_weight_g > 0 ? `${loan.net_weight_g} g` : '—'}
                      </td>
                      <td style={styles.td}>{loan.gold_purity}</td>
                      <td style={styles.td}>{formatCurrency(loan.loan_amount)}</td>
                      <td style={styles.td}>{loan.interest_rate}%</td>
                      <td style={styles.td}>{loan.loan_date}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: loan.status === 'active' ? '#16a34a' : '#6b7280'
                        }}>
                          {loan.status}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button
                          style={styles.viewButton}
                          onClick={() => handleViewLoan(loan.person_id)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── CUSTOMER SEARCH TAB ── */}
      {activeTab === 'customer' && (
        <div>
          <div style={styles.searchCard}>
            <h2 style={styles.formTitle}>Search Customer</h2>
            <p style={styles.searchHint}>
              Search by customer name or phone number
            </p>
            <div style={styles.searchRow}>
              <input
                style={styles.searchInput}
                placeholder="Enter name or phone number"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <button
                style={styles.searchButton}
                onClick={handleSearch}
                disabled={searching}
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {searchResults && (
            <>
              <div style={styles.tableCard}>
                <h2 style={styles.formTitle}>
                  Purchase History ({searchResults.bills.length} bills)
                </h2>
                {searchResults.bills.length === 0 ? (
                  <p style={styles.emptyText}>No purchases found</p>
                ) : (
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeader}>
                        <th style={styles.th}>Bill No</th>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Customer</th>
                        <th style={styles.th}>Items</th>
                        <th style={styles.th}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.bills.map((bill) => {
                        const parsedData = JSON.parse(bill.items_json)
                        const items = Array.isArray(parsedData)
                          ? parsedData
                          : parsedData.items || []
                        return (
                          <tr key={bill.id} style={styles.tableRow}>
                            <td style={{ ...styles.td, fontWeight: '600' }}>
                              {bill.bill_number}
                            </td>
                            <td style={styles.td}>{bill.bill_date}</td>
                            <td style={styles.td}>{bill.customer_name}</td>
                            <td style={styles.td}>
                              {items.map((item, i) => (
                                <div key={i} style={styles.itemChip}>
                                  {item.item_name} — {item.actual_weight}g
                                </div>
                              ))}
                            </td>
                            <td style={{ ...styles.td, fontWeight: '700', color: '#16a34a' }}>
                              {formatCurrency(bill.grand_total)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={styles.tableCard}>
                <h2 style={styles.formTitle}>
                  Loan History ({searchResults.loans.length} loans)
                </h2>
                {searchResults.loans.length === 0 ? (
                  <p style={styles.emptyText}>No loans found</p>
                ) : (
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeader}>
                        <th style={styles.th}>Loan ID</th>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Gross Wt</th>
                        <th style={styles.th}>Net Wt</th>
                        <th style={styles.th}>Purity</th>
                        <th style={styles.th}>Loan Amount</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.loans.map((loan) => (
                        <tr key={loan.id} style={styles.tableRow}>
                          <td style={{ ...styles.td, fontWeight: '600' }}>
                            {loan.person_id}
                          </td>
                          <td style={styles.td}>{loan.loan_date}</td>
                          <td style={styles.td}>{loan.gold_weight_g} g</td>
                          <td style={styles.td}>
                            {loan.net_weight_g > 0 ? `${loan.net_weight_g} g` : '—'}
                          </td>
                          <td style={styles.td}>{loan.gold_purity}</td>
                          <td style={styles.td}>{formatCurrency(loan.loan_amount)}</td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.statusBadge,
                              backgroundColor: loan.status === 'active' ? '#16a34a' : '#6b7280'
                            }}>
                              {loan.status}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <button
                              style={styles.viewButton}
                              onClick={() => {
                                setActiveTab('loans')
                                handleViewLoan(loan.person_id)
                              }}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}

    </div>
  )
}

// ── STYLES ─────────────────────────────────────────────────

export default GoldLoan