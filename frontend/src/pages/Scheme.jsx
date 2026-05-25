import { useState, useEffect } from 'react'
import { supabase }            from '../supabase'
import { useTheme }            from '../context/ThemeContext'
import { getTheme }            from '../context/theme'
import useIsMobile             from '../hooks/useIsMobile'
import useResponsiveGrid       from '../hooks/useResponsiveGrid'

function Scheme() {
  const { isDark } = useTheme()
  const theme      = getTheme(isDark)
  const isMobile   = useIsMobile()
  const grids      = useResponsiveGrid()

  const [activeTab, setActiveTab]     = useState('plans')
  const [plans, setPlans]             = useState([])
  const [customers, setCustomers]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')

  // Plans form
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [editPlan, setEditPlan]         = useState(null)
  const [planForm, setPlanForm]         = useState({
    plan_name      : '',
    monthly_amount : '',
    duration_months: '',
    description    : ''
  })

  // Customer form
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [customerForm, setCustomerForm]         = useState({
    customer_name: '',
    phone        : '',
    address      : '',
    plan_id      : '',
    start_date   : new Date().toISOString().split('T')[0]
  })

  // Selected customer for details
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerPayments, setCustomerPayments] = useState([])
  const [searchQuery, setSearchQuery]           = useState('')
  const [searchResults, setSearchResults]       = useState(null)
  const [searching, setSearching]               = useState(false)

  // Payment form
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentForm, setPaymentForm]         = useState({
    month_number : '',
    amount_paid  : '',
    payment_date : new Date().toISOString().split('T')[0],
    notes        : ''
  })

  // ── FETCH PLANS ────────────────────────────────────────
  const fetchPlans = async () => {
    try {
      const { data, error: err } = await supabase
        .from('scheme_plans')
        .select('*')
        .order('created_at', { ascending: false })
      if (err) throw err
      setPlans(data || [])
    } catch (_err) {
      setError('Failed to load plans')
    }
  }

  // ── FETCH CUSTOMERS ────────────────────────────────────
  const fetchCustomers = async () => {
    try {
      const { data, error: err } = await supabase
        .from('scheme_customers')
        .select(`*, scheme_plans(*)`)
        .order('created_at', { ascending: false })
      if (err) throw err
      setCustomers(data || [])
    } catch (_err) {
      setError('Failed to load customers')
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchPlans(), fetchCustomers()])
      setLoading(false)
    }
    load()
  }, [])

  // ── ADD PLAN ───────────────────────────────────────────
  const handleAddPlan = async () => {
    try {
      setError('')
      const monthly = parseFloat(planForm.monthly_amount)
      const { error: err } = await supabase
        .from('scheme_plans')
        .insert({
          plan_name      : planForm.plan_name,
          monthly_amount : monthly,
          duration_months: parseInt(planForm.duration_months),
          bonus_amount   : monthly, // bonus = one month amount
          description    : planForm.description || ''
        })
      if (err) throw err
      setPlanForm({ plan_name: '', monthly_amount: '', duration_months: '', description: '' })
      setShowPlanForm(false)
      fetchPlans()
      setSuccess('Plan added successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to add plan')
    }
  }

  // ── UPDATE PLAN ────────────────────────────────────────
  const handleUpdatePlan = async () => {
    try {
      setError('')
      const monthly = parseFloat(planForm.monthly_amount)
      const { error: err } = await supabase
        .from('scheme_plans')
        .update({
          plan_name      : planForm.plan_name,
          monthly_amount : monthly,
          duration_months: parseInt(planForm.duration_months),
          bonus_amount   : monthly,
          description    : planForm.description || ''
        })
        .eq('id', editPlan.id)
      if (err) throw err
      setEditPlan(null)
      setPlanForm({ plan_name: '', monthly_amount: '', duration_months: '', description: '' })
      setShowPlanForm(false)
      fetchPlans()
      setSuccess('Plan updated!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update plan')
    }
  }

  // ── DELETE PLAN ────────────────────────────────────────
  const handleDeletePlan = async (id) => {
    if (!window.confirm('Delete this plan?')) return
    try {
      const { error: err } = await supabase
        .from('scheme_plans')
        .delete()
        .eq('id', id)
      if (err) throw err
      fetchPlans()
      setSuccess('Plan deleted!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (_err) {
      setError('Failed to delete plan')
    }
  }

  // ── ADD CUSTOMER ───────────────────────────────────────
  const handleAddCustomer = async () => {
    try {
      setError('')
      const { error: err } = await supabase
        .from('scheme_customers')
        .insert({
          customer_name: customerForm.customer_name,
          phone        : customerForm.phone || '',
          address      : customerForm.address || '',
          plan_id      : parseInt(customerForm.plan_id),
          start_date   : customerForm.start_date,
          status       : 'active'
        })
      if (err) throw err
      setCustomerForm({
        customer_name: '', phone: '', address: '',
        plan_id: '', start_date: new Date().toISOString().split('T')[0]
      })
      setShowCustomerForm(false)
      fetchCustomers()
      setSuccess('Customer added to scheme!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to add customer')
    }
  }

  // ── VIEW CUSTOMER DETAILS ──────────────────────────────
  const handleViewCustomer = async (customer) => {
    try {
      setSelectedCustomer(customer)
      const { data, error: err } = await supabase
        .from('scheme_payments')
        .select('*')
        .eq('customer_id', customer.id)
        .order('month_number', { ascending: true })
      if (err) throw err
      setCustomerPayments(data || [])
      // Auto fill payment amount from plan
      setPaymentForm(prev => ({
        ...prev,
        amount_paid: customer.scheme_plans?.monthly_amount || ''
      }))
    } catch (_err) {
      setError('Failed to load customer details')
    }
  }

  // ── RECORD PAYMENT ─────────────────────────────────────
  const handleRecordPayment = async () => {
    try {
      setError('')
      const { error: err } = await supabase
        .from('scheme_payments')
        .insert({
          customer_id  : selectedCustomer.id,
          month_number : parseInt(paymentForm.month_number),
          amount_paid  : parseFloat(paymentForm.amount_paid),
          payment_date : paymentForm.payment_date,
          notes        : paymentForm.notes || ''
        })
      if (err) throw err

      // Check if scheme is complete
      const totalMonths = selectedCustomer.scheme_plans?.duration_months || 0
      if (parseInt(paymentForm.month_number) >= totalMonths) {
        await supabase
          .from('scheme_customers')
          .update({ status: 'completed' })
          .eq('id', selectedCustomer.id)
        fetchCustomers()
      }

      setPaymentForm(prev => ({
        ...prev,
        month_number: '',
        notes       : '',
        payment_date: new Date().toISOString().split('T')[0]
      }))
      setShowPaymentForm(false)
      handleViewCustomer(selectedCustomer)
      setSuccess('Payment recorded!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to record payment')
    }
  }

  // ── SEARCH CUSTOMER ────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery || searchQuery.length < 2) {
      setError('Enter at least 2 characters')
      return
    }
    try {
      setSearching(true)
      setError('')
      const { data, error: err } = await supabase
        .from('scheme_customers')
        .select(`*, scheme_plans(*)`)
        .or(`customer_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
      if (err) throw err
      setSearchResults(data || [])
    } catch (_err) {
      setError('Search failed')
    } finally {
      setSearching(false)
    }
  }

  // ── UPDATE STATUS ──────────────────────────────────────
  const handleUpdateStatus = async (customerId, status) => {
    try {
      await supabase
        .from('scheme_customers')
        .update({ status })
        .eq('id', customerId)
      fetchCustomers()
      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer(prev => ({ ...prev, status }))
      }
      setSuccess('Status updated!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (_err) {
      setError('Failed to update status')
    }
  }

  // ── FORMAT CURRENCY ────────────────────────────────────
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style               : 'currency',
      currency            : 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  // ── GET STATUS COLOR ───────────────────────────────────
  const getStatusStyle = (status) => {
    if (status === 'active')    return { color: '#10b981', bg: '#d1fae5' }
    if (status === 'completed') return { color: '#3b82f6', bg: '#dbeafe' }
    if (status === 'cancelled') return { color: '#ef4444', bg: '#fee2e2' }
    return { color: '#64748b', bg: '#f1f5f9' }
  }

  // ── CUSTOMER DETAIL VIEW ───────────────────────────────
  if (selectedCustomer) {
    const plan         = selectedCustomer.scheme_plans
    const totalMonths  = plan?.duration_months || 0
    const monthlyAmt   = plan?.monthly_amount  || 0
    const bonusAmt     = plan?.bonus_amount    || 0
    const totalPaid    = customerPayments.reduce((sum, p) => sum + p.amount_paid, 0)
    const monthsPaid   = customerPayments.length
    const remaining    = totalMonths - monthsPaid
    const totalBenefit = (totalMonths * monthlyAmt) + bonusAmt
    const statusStyle  = getStatusStyle(selectedCustomer.status)

    // Which months already paid
    const paidMonths = customerPayments.map(p => p.month_number)

    return (
      <div>
        <button
          onClick={() => { setSelectedCustomer(null); setCustomerPayments([]) }}
          style={{
            backgroundColor: theme.cardBg,
            color          : theme.textPrimary,
            border         : `1px solid ${theme.borderInput}`,
            padding        : '10px 20px',
            borderRadius   : '10px',
            fontSize       : '14px',
            fontWeight     : '600',
            cursor         : 'pointer',
            marginBottom   : '20px'
          }}
        >
          ← Back
        </button>

        {error   && <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
        {success && <div style={{ backgroundColor: '#d1fae5', color: '#10b981', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '14px' }}>{success}</div>}

        {/* Customer Hero Card */}
        <div style={{
          background    : 'linear-gradient(135deg, #1a1a2e 0%, #2d2d5e 100%)',
          borderRadius  : '20px',
          padding       : '24px',
          marginBottom  : '16px',
          boxShadow     : '0 8px 32px rgba(26,26,46,0.3)',
          position      : 'relative',
          overflow      : 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: '-20px', right: '-20px',
            width: '100px', height: '100px', borderRadius: '50%',
            backgroundColor: 'rgba(245,158,11,0.1)'
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Scheme Customer</p>
              <p style={{ fontSize: '22px', fontWeight: '800', color: 'white', marginTop: '4px' }}>
                {selectedCustomer.customer_name}
              </p>
              {selectedCustomer.phone && (
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                  {selectedCustomer.phone}
                </p>
              )}
            </div>
            <span style={{
              backgroundColor: statusStyle.bg,
              color          : statusStyle.color,
              padding        : '6px 12px',
              borderRadius   : '20px',
              fontSize       : '12px',
              fontWeight     : '700'
            }}>
              {selectedCustomer.status.toUpperCase()}
            </span>
          </div>

          <div style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius   : '12px',
            padding        : '14px 16px'
          }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>Plan</p>
            <p style={{ fontSize: '16px', fontWeight: '700', color: '#f59e0b' }}>
              {plan?.plan_name}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
              {formatCurrency(monthlyAmt)}/month × {totalMonths} months + {formatCurrency(bonusAmt)} bonus
            </p>
          </div>
        </div>

        {/* Progress & Stats */}
        <div style={{ ...grids.grid2, marginBottom: '16px' }}>

          <div style={{
            backgroundColor: theme.cardBg, borderRadius: '16px',
            padding: '16px', border: `1px solid ${theme.border}`, boxShadow: theme.shadowSm
          }}>
            <p style={{ fontSize: '12px', color: theme.textSecondary, fontWeight: '600' }}>
              Months Paid
            </p>
            <p style={{ fontSize: '28px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>
              {monthsPaid}
              <span style={{ fontSize: '14px', color: theme.textSecondary }}>/{totalMonths}</span>
            </p>
            <p style={{ fontSize: '11px', color: theme.textSecondary, marginTop: '4px' }}>
              {remaining} months remaining
            </p>
          </div>

          <div style={{
            backgroundColor: theme.cardBg, borderRadius: '16px',
            padding: '16px', border: `1px solid ${theme.border}`, boxShadow: theme.shadowSm
          }}>
            <p style={{ fontSize: '12px', color: theme.textSecondary, fontWeight: '600' }}>
              Amount Paid
            </p>
            <p style={{ fontSize: '22px', fontWeight: '800', color: '#f59e0b', marginTop: '4px' }}>
              {formatCurrency(totalPaid)}
            </p>
            <p style={{ fontSize: '11px', color: theme.textSecondary, marginTop: '4px' }}>
              Total benefit: {formatCurrency(totalBenefit)}
            </p>
          </div>

        </div>

        {/* Progress Bar */}
        <div style={{
          backgroundColor: theme.cardBg, borderRadius: '16px',
          padding: '16px', marginBottom: '16px',
          border: `1px solid ${theme.border}`, boxShadow: theme.shadowSm
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: theme.textPrimary }}>
              Scheme Progress
            </p>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#f59e0b' }}>
              {Math.round((monthsPaid / totalMonths) * 100)}%
            </p>
          </div>
          <div style={{
            height: '8px', backgroundColor: theme.headerBg,
            borderRadius: '4px', overflow: 'hidden'
          }}>
            <div style={{
              height        : '100%',
              width         : `${Math.min((monthsPaid / totalMonths) * 100, 100)}%`,
              background    : 'linear-gradient(90deg, #f59e0b, #10b981)',
              borderRadius  : '4px',
              transition    : 'width 0.5s ease'
            }} />
          </div>

          {/* Month Bubbles */}
          <div style={{
            display      : 'flex',
            flexWrap     : 'wrap',
            gap          : '6px',
            marginTop    : '12px'
          }}>
            {Array.from({ length: totalMonths }, (_, i) => i + 1).map(month => (
              <div
                key={month}
                style={{
                  width          : '32px',
                  height         : '32px',
                  borderRadius   : '50%',
                  display        : 'flex',
                  alignItems     : 'center',
                  justifyContent : 'center',
                  fontSize       : '11px',
                  fontWeight     : '700',
                  backgroundColor: paidMonths.includes(month)
                    ? '#10b981' : theme.headerBg,
                  color          : paidMonths.includes(month)
                    ? 'white' : theme.textSecondary,
                  border         : paidMonths.includes(month)
                    ? 'none' : `1px solid ${theme.border}`
                }}
              >
                {month}
              </div>
            ))}
            {/* Bonus bubble */}
            <div style={{
              width          : '32px',
              height         : '32px',
              borderRadius   : '50%',
              display        : 'flex',
              alignItems     : 'center',
              justifyContent : 'center',
              fontSize       : '10px',
              fontWeight     : '700',
              backgroundColor: selectedCustomer.status === 'completed' ? '#f59e0b' : theme.headerBg,
              color          : selectedCustomer.status === 'completed' ? 'white' : theme.textSecondary,
              border         : `1px solid ${theme.border}`
            }}>
              B
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div style={{
          backgroundColor: theme.cardBg, borderRadius: '16px',
          padding: '16px', marginBottom: '16px',
          border: `1px solid ${theme.border}`, boxShadow: theme.shadowSm
        }}>
          <p style={{ fontSize: '13px', fontWeight: '700', color: theme.textPrimary, marginBottom: '12px' }}>
            Customer Details
          </p>
          {[
            { label: 'Name',       value: selectedCustomer.customer_name },
            { label: 'Phone',      value: selectedCustomer.phone || '—' },
            { label: 'Address',    value: selectedCustomer.address || '—' },
            { label: 'Start Date', value: selectedCustomer.start_date },
            { label: 'Plan',       value: plan?.plan_name },
          ].map(row => (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '8px 0', borderBottom: `1px solid ${theme.border}`
            }}>
              <span style={{ fontSize: '13px', color: theme.textSecondary }}>{row.label}</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: theme.textPrimary }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Payment History */}
        {customerPayments.length > 0 && (
          <div style={{
            backgroundColor: theme.cardBg, borderRadius: '16px',
            padding: '16px', marginBottom: '16px',
            border: `1px solid ${theme.border}`, boxShadow: theme.shadowSm
          }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: theme.textPrimary, marginBottom: '12px' }}>
              Payment History
            </p>
            {customerPayments.map(payment => (
              <div key={payment.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: `1px solid ${theme.border}`
              }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: theme.textPrimary }}>
                    Month {payment.month_number}
                  </p>
                  <p style={{ fontSize: '11px', color: theme.textSecondary, marginTop: '2px' }}>
                    {payment.payment_date}
                    {payment.notes ? ` • ${payment.notes}` : ''}
                  </p>
                </div>
                <p style={{ fontSize: '15px', fontWeight: '700', color: '#10b981' }}>
                  {formatCurrency(payment.amount_paid)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {selectedCustomer.status === 'active' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>

            {!showPaymentForm ? (
              <button
                onClick={() => setShowPaymentForm(true)}
                style={{
                  backgroundColor: '#f59e0b', color: 'white', border: 'none',
                  padding: '14px', borderRadius: '12px', fontSize: '15px',
                  fontWeight: '700', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(245,158,11,0.3)'
                }}
              >
                Record Payment
              </button>
            ) : (
              <div style={{
                backgroundColor: theme.cardBg, borderRadius: '16px',
                padding: '20px', border: `1px solid ${theme.border}`
              }}>
                <p style={{ fontSize: '15px', fontWeight: '700', color: theme.textPrimary, marginBottom: '16px' }}>
                  Record Payment
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: theme.textSecondary, display: 'block', marginBottom: '6px' }}>
                      Month Number *
                    </label>
                    <select
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: '12px',
                        border: `1px solid ${theme.borderInput}`, fontSize: '14px',
                        outline: 'none', backgroundColor: theme.inputBg,
                        color: theme.textPrimary, boxSizing: 'border-box'
                      }}
                      value={paymentForm.month_number}
                      onChange={e => setPaymentForm(p => ({ ...p, month_number: e.target.value }))}
                    >
                      <option value="">-- Select month --</option>
                      {Array.from({ length: totalMonths }, (_, i) => i + 1)
                        .filter(m => !paidMonths.includes(m))
                        .map(m => (
                          <option key={m} value={m}>Month {m}</option>
                        ))
                      }
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: theme.textSecondary, display: 'block', marginBottom: '6px' }}>
                      Amount (₹) *
                    </label>
                    <input
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: '12px',
                        border: `1px solid ${theme.borderInput}`, fontSize: '14px',
                        outline: 'none', backgroundColor: theme.inputBg,
                        color: theme.textPrimary, boxSizing: 'border-box'
                      }}
                      type="number"
                      value={paymentForm.amount_paid}
                      onChange={e => setPaymentForm(p => ({ ...p, amount_paid: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: theme.textSecondary, display: 'block', marginBottom: '6px' }}>
                      Payment Date *
                    </label>
                    <input
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: '12px',
                        border: `1px solid ${theme.borderInput}`, fontSize: '14px',
                        outline: 'none', backgroundColor: theme.inputBg,
                        color: theme.textPrimary, boxSizing: 'border-box'
                      }}
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={e => setPaymentForm(p => ({ ...p, payment_date: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: theme.textSecondary, display: 'block', marginBottom: '6px' }}>
                      Notes
                    </label>
                    <input
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: '12px',
                        border: `1px solid ${theme.borderInput}`, fontSize: '14px',
                        outline: 'none', backgroundColor: theme.inputBg,
                        color: theme.textPrimary, boxSizing: 'border-box'
                      }}
                      placeholder="Optional notes"
                      value={paymentForm.notes}
                      onChange={e => setPaymentForm(p => ({ ...p, notes: e.target.value }))}
                    />
                  </div>

                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button
                    onClick={handleRecordPayment}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                      backgroundColor: '#10b981', color: 'white',
                      fontSize: '14px', fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    Save Payment
                  </button>
                  <button
                    onClick={() => setShowPaymentForm(false)}
                    style={{
                      padding: '12px 20px', borderRadius: '12px',
                      border: `1px solid ${theme.borderInput}`,
                      backgroundColor: theme.headerBg, color: theme.textPrimary,
                      fontSize: '14px', fontWeight: '600', cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => handleUpdateStatus(selectedCustomer.id, 'completed')}
              style={{
                backgroundColor: '#3b82f6', color: 'white', border: 'none',
                padding: '12px', borderRadius: '12px', fontSize: '14px',
                fontWeight: '600', cursor: 'pointer'
              }}
            >
              Mark as Completed
            </button>

            <button
              onClick={() => handleUpdateStatus(selectedCustomer.id, 'cancelled')}
              style={{
                backgroundColor: theme.cardBg, color: '#ef4444',
                border: `1px solid #ef4444`,
                padding: '12px', borderRadius: '12px', fontSize: '14px',
                fontWeight: '600', cursor: 'pointer'
              }}
            >
              Cancel Scheme
            </button>

          </div>
        )}

      </div>
    )
  }

  // ── MAIN RENDER ────────────────────────────────────────
  return (
    <div>

      {/* Page Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '800', color: theme.textPrimary }}>
            Scheme
          </h1>
          <p style={{ fontSize: '13px', color: theme.textSecondary, marginTop: '2px' }}>
            {plans.length} plans • {customers.length} customers
          </p>
        </div>
        <button
          onClick={() => activeTab === 'plans' ? setShowPlanForm(true) : setShowCustomerForm(true)}
          style={{
            backgroundColor: '#1a1a2e', color: 'white', border: 'none',
            padding: '10px 18px', borderRadius: '12px', fontSize: '13px',
            fontWeight: '700', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(26,26,46,0.3)'
          }}
        >
          + Add {activeTab === 'plans' ? 'Plan' : 'Customer'}
        </button>
      </div>

      {error   && <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
      {success && <div style={{ backgroundColor: '#d1fae5', color: '#10b981', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '14px' }}>{success}</div>}

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '20px',
        borderBottom: `2px solid ${theme.border}`, paddingBottom: '0'
      }}>
        {[
          { key: 'plans',     label: 'Plans'    },
          { key: 'customers', label: 'Customers'},
          { key: 'search',    label: 'Search'   },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px', border: 'none', background: 'none',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              color       : activeTab === tab.key ? theme.textPrimary : theme.textSecondary,
              borderBottom: activeTab === tab.key ? '2px solid #f59e0b' : '2px solid transparent',
              marginBottom: '-2px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── PLANS TAB ── */}
      {activeTab === 'plans' && (
        <>
          {/* Add Plan Form */}
          {showPlanForm && (
            <div style={{
              position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
              zIndex: 500, display: 'flex',
              alignItems: isMobile ? 'flex-end' : 'center',
              justifyContent: 'center', backdropFilter: 'blur(4px)'
            }}>
              <div style={{
                backgroundColor: theme.cardBg,
                borderRadius: isMobile ? '24px 24px 0 0' : '20px',
                padding: '24px', width: isMobile ? '100%' : '440px',
                maxHeight: '90vh', overflowY: 'auto', boxShadow: theme.shadowCard
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: theme.textPrimary }}>
                    {editPlan ? 'Edit Plan' : 'Add New Plan'}
                  </h2>
                  <button
                    onClick={() => { setShowPlanForm(false); setEditPlan(null) }}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%', border: 'none',
                      backgroundColor: theme.headerBg, color: theme.textSecondary,
                      fontSize: '16px', cursor: 'pointer'
                    }}
                  >✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    { label: 'Plan Name *',         key: 'plan_name',       type: 'text',   placeholder: 'e.g. Gold Scheme 11+1' },
                    { label: 'Monthly Amount (₹) *', key: 'monthly_amount',  type: 'number', placeholder: 'e.g. 1000' },
                    { label: 'Duration (months) *',  key: 'duration_months', type: 'number', placeholder: 'e.g. 11' },
                  ].map(field => (
                    <div key={field.key}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: theme.textSecondary, display: 'block', marginBottom: '6px' }}>
                        {field.label}
                      </label>
                      <input
                        style={{
                          width: '100%', padding: '12px 14px', borderRadius: '12px',
                          border: `1px solid ${theme.borderInput}`, fontSize: '14px',
                          outline: 'none', backgroundColor: theme.inputBg,
                          color: theme.textPrimary, boxSizing: 'border-box'
                        }}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={planForm[field.key]}
                        onChange={e => setPlanForm(p => ({ ...p, [field.key]: e.target.value }))}
                      />
                    </div>
                  ))}

                  {/* Bonus Preview */}
                  {planForm.monthly_amount && (
                    <div style={{
                      backgroundColor: isDark ? '#1c1a05' : '#fefce8',
                      borderRadius: '12px', padding: '12px 14px',
                      border: '1px solid #fef08a'
                    }}>
                      <p style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '600' }}>
                        Bonus Amount = {formatCurrency(parseFloat(planForm.monthly_amount) || 0)}
                        <span style={{ fontSize: '11px', color: theme.textSecondary, marginLeft: '6px' }}>
                          (= 1 month amount)
                        </span>
                      </p>
                      {planForm.duration_months && (
                        <p style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '4px' }}>
                          Total benefit = {formatCurrency(
                            (parseFloat(planForm.monthly_amount) * parseInt(planForm.duration_months)) +
                            parseFloat(planForm.monthly_amount)
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: theme.textSecondary, display: 'block', marginBottom: '6px' }}>
                      Description
                    </label>
                    <textarea
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: '12px',
                        border: `1px solid ${theme.borderInput}`, fontSize: '14px',
                        outline: 'none', backgroundColor: theme.inputBg,
                        color: theme.textPrimary, boxSizing: 'border-box',
                        resize: 'none', height: '80px'
                      }}
                      placeholder="Any notes about this plan"
                      value={planForm.description}
                      onChange={e => setPlanForm(p => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    onClick={editPlan ? handleUpdatePlan : handleAddPlan}
                    style={{
                      flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                      backgroundColor: '#1a1a2e', color: 'white',
                      fontSize: '15px', fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    {editPlan ? 'Update Plan' : 'Save Plan'}
                  </button>
                  <button
                    onClick={() => { setShowPlanForm(false); setEditPlan(null) }}
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

          {/* Plans List */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[1,2].map(i => (
                <div key={i} style={{ height: '100px', borderRadius: '16px', backgroundColor: theme.cardBg, opacity: 0.5 }} />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div style={{
              backgroundColor: theme.cardBg, borderRadius: '16px',
              padding: '40px', textAlign: 'center', border: `1px solid ${theme.border}`
            }}>
              <p style={{ fontSize: '32px', marginBottom: '8px' }}>📋</p>
              <p style={{ color: theme.textSecondary, fontSize: '14px' }}>No plans yet. Add your first scheme plan!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {plans.map(plan => (
                <div key={plan.id} style={{
                  backgroundColor: theme.cardBg, borderRadius: '16px',
                  padding: '20px', border: `1px solid ${theme.border}`, boxShadow: theme.shadowSm
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <p style={{ fontSize: '16px', fontWeight: '800', color: theme.textPrimary }}>
                        {plan.plan_name}
                      </p>
                      {plan.description && (
                        <p style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '4px' }}>
                          {plan.description}
                        </p>
                      )}
                    </div>
                    <div style={{
                      backgroundColor: '#fef3c7', color: '#f59e0b',
                      padding: '4px 10px', borderRadius: '20px',
                      fontSize: '12px', fontWeight: '700'
                    }}>
                      {plan.duration_months}+1 months
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: theme.textSecondary }}>Monthly</p>
                      <p style={{ fontSize: '18px', fontWeight: '800', color: '#f59e0b' }}>
                        {formatCurrency(plan.monthly_amount)}
                      </p>
                    </div>
                    <div style={{ width: '1px', backgroundColor: theme.border }} />
                    <div>
                      <p style={{ fontSize: '11px', color: theme.textSecondary }}>Bonus</p>
                      <p style={{ fontSize: '18px', fontWeight: '800', color: '#10b981' }}>
                        {formatCurrency(plan.bonus_amount)}
                      </p>
                    </div>
                    <div style={{ width: '1px', backgroundColor: theme.border }} />
                    <div>
                      <p style={{ fontSize: '11px', color: theme.textSecondary }}>Total Benefit</p>
                      <p style={{ fontSize: '18px', fontWeight: '800', color: '#3b82f6' }}>
                        {formatCurrency((plan.monthly_amount * plan.duration_months) + plan.bonus_amount)}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setEditPlan(plan)
                        setPlanForm({
                          plan_name      : plan.plan_name,
                          monthly_amount : plan.monthly_amount,
                          duration_months: plan.duration_months,
                          description    : plan.description || ''
                        })
                        setShowPlanForm(true)
                      }}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '10px',
                        border: `1px solid ${theme.border}`,
                        backgroundColor: theme.headerBg, color: theme.textPrimary,
                        fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
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
              ))}
            </div>
          )}
        </>
      )}

      {/* ── CUSTOMERS TAB ── */}
      {activeTab === 'customers' && (
        <>
          {/* Add Customer Form */}
          {showCustomerForm && (
            <div style={{
              position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
              zIndex: 500, display: 'flex',
              alignItems: isMobile ? 'flex-end' : 'center',
              justifyContent: 'center', backdropFilter: 'blur(4px)'
            }}>
              <div style={{
                backgroundColor: theme.cardBg,
                borderRadius: isMobile ? '24px 24px 0 0' : '20px',
                padding: '24px', width: isMobile ? '100%' : '440px',
                maxHeight: '90vh', overflowY: 'auto', boxShadow: theme.shadowCard
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: theme.textPrimary }}>
                    Add Customer to Scheme
                  </h2>
                  <button
                    onClick={() => setShowCustomerForm(false)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%', border: 'none',
                      backgroundColor: theme.headerBg, color: theme.textSecondary,
                      fontSize: '16px', cursor: 'pointer'
                    }}
                  >✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                  {[
                    { label: 'Customer Name *', key: 'customer_name', type: 'text',   placeholder: 'Full name' },
                    { label: 'Phone',           key: 'phone',         type: 'text',   placeholder: 'Phone number' },
                    { label: 'Address',         key: 'address',       type: 'text',   placeholder: 'Address' },
                  ].map(field => (
                    <div key={field.key}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: theme.textSecondary, display: 'block', marginBottom: '6px' }}>
                        {field.label}
                      </label>
                      <input
                        style={{
                          width: '100%', padding: '12px 14px', borderRadius: '12px',
                          border: `1px solid ${theme.borderInput}`, fontSize: '14px',
                          outline: 'none', backgroundColor: theme.inputBg,
                          color: theme.textPrimary, boxSizing: 'border-box'
                        }}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={customerForm[field.key]}
                        onChange={e => setCustomerForm(p => ({ ...p, [field.key]: e.target.value }))}
                      />
                    </div>
                  ))}

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: theme.textSecondary, display: 'block', marginBottom: '6px' }}>
                      Select Plan *
                    </label>
                    <select
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: '12px',
                        border: `1px solid ${theme.borderInput}`, fontSize: '14px',
                        outline: 'none', backgroundColor: theme.inputBg,
                        color: theme.textPrimary, boxSizing: 'border-box'
                      }}
                      value={customerForm.plan_id}
                      onChange={e => setCustomerForm(p => ({ ...p, plan_id: e.target.value }))}
                    >
                      <option value="">-- Select plan --</option>
                      {plans.map(plan => (
                        <option key={plan.id} value={plan.id}>
                          {plan.plan_name} — {formatCurrency(plan.monthly_amount)}/month
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: theme.textSecondary, display: 'block', marginBottom: '6px' }}>
                      Start Date *
                    </label>
                    <input
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: '12px',
                        border: `1px solid ${theme.borderInput}`, fontSize: '14px',
                        outline: 'none', backgroundColor: theme.inputBg,
                        color: theme.textPrimary, boxSizing: 'border-box'
                      }}
                      type="date"
                      value={customerForm.start_date}
                      onChange={e => setCustomerForm(p => ({ ...p, start_date: e.target.value }))}
                    />
                  </div>

                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    onClick={handleAddCustomer}
                    style={{
                      flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                      backgroundColor: '#1a1a2e', color: 'white',
                      fontSize: '15px', fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    Add Customer
                  </button>
                  <button
                    onClick={() => setShowCustomerForm(false)}
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

          {/* Customers List */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ height: '80px', borderRadius: '16px', backgroundColor: theme.cardBg, opacity: 0.5 }} />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div style={{
              backgroundColor: theme.cardBg, borderRadius: '16px',
              padding: '40px', textAlign: 'center', border: `1px solid ${theme.border}`
            }}>
              <p style={{ fontSize: '32px', marginBottom: '8px' }}>👥</p>
              <p style={{ color: theme.textSecondary, fontSize: '14px' }}>No customers yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {customers.map(customer => {
                const statusStyle = getStatusStyle(customer.status)
                return (
                  <div
                    key={customer.id}
                    onClick={() => handleViewCustomer(customer)}
                    style={{
                      backgroundColor: theme.cardBg, borderRadius: '16px',
                      padding: '16px', border: `1px solid ${theme.border}`,
                      boxShadow: theme.shadowSm, cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: '700', color: theme.textPrimary }}>
                        {customer.customer_name}
                      </p>
                      <p style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '2px' }}>
                        {customer.phone || '—'} • {customer.scheme_plans?.plan_name}
                      </p>
                      <p style={{ fontSize: '11px', color: theme.textSecondary, marginTop: '2px' }}>
                        Started: {customer.start_date}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <span style={{
                        backgroundColor: statusStyle.bg, color: statusStyle.color,
                        padding: '4px 10px', borderRadius: '20px',
                        fontSize: '11px', fontWeight: '700'
                      }}>
                        {customer.status}
                      </span>
                      <p style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '600' }}>
                        {formatCurrency(customer.scheme_plans?.monthly_amount)}/mo
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── SEARCH TAB ── */}
      {activeTab === 'search' && (
        <div>
          <div style={{
            backgroundColor: theme.cardBg, borderRadius: '16px',
            padding: '20px', marginBottom: '16px',
            border: `1px solid ${theme.border}`, boxShadow: theme.shadowSm
          }}>
            <p style={{ fontSize: '15px', fontWeight: '700', color: theme.textPrimary, marginBottom: '12px' }}>
              Search Customer
            </p>
            <p style={{ fontSize: '13px', color: theme.textSecondary, marginBottom: '16px' }}>
              Search by customer name or phone number
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: '12px',
                  border: `1px solid ${theme.borderInput}`, fontSize: '14px',
                  outline: 'none', backgroundColor: theme.inputBg, color: theme.textPrimary
                }}
                placeholder="Enter name or phone"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                style={{
                  backgroundColor: '#1a1a2e', color: 'white', border: 'none',
                  padding: '12px 20px', borderRadius: '12px', fontSize: '14px',
                  fontWeight: '700', cursor: 'pointer'
                }}
              >
                {searching ? '...' : 'Search'}
              </button>
            </div>
          </div>

          {searchResults && (
            searchResults.length === 0 ? (
              <div style={{
                backgroundColor: theme.cardBg, borderRadius: '16px',
                padding: '32px', textAlign: 'center', border: `1px solid ${theme.border}`
              }}>
                <p style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</p>
                <p style={{ color: theme.textSecondary, fontSize: '14px' }}>No customers found</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {searchResults.map(customer => {
                  const statusStyle = getStatusStyle(customer.status)
                  return (
                    <div
                      key={customer.id}
                      onClick={() => handleViewCustomer(customer)}
                      style={{
                        backgroundColor: theme.cardBg, borderRadius: '16px',
                        padding: '16px', border: `1px solid ${theme.border}`,
                        boxShadow: theme.shadowSm, cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p style={{ fontSize: '15px', fontWeight: '700', color: theme.textPrimary }}>
                            {customer.customer_name}
                          </p>
                          <p style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '2px' }}>
                            {customer.phone || '—'}
                          </p>
                          <p style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '600', marginTop: '4px' }}>
                            {customer.scheme_plans?.plan_name}
                          </p>
                        </div>
                        <span style={{
                          backgroundColor: statusStyle.bg, color: statusStyle.color,
                          padding: '4px 10px', borderRadius: '20px',
                          fontSize: '11px', fontWeight: '700'
                        }}>
                          {customer.status}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      )}

    </div>
  )
}

export default Scheme