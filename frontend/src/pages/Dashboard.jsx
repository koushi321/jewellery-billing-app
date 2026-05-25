import { useState, useEffect } from 'react'
import { supabase }            from '../supabase'
import { useTheme }            from '../context/ThemeContext'
import { getTheme }            from '../context/theme'
import useIsMobile             from '../hooks/useIsMobile'
import useResponsiveGrid       from '../hooks/useResponsiveGrid'

function Dashboard() {
  const today = new Date().toISOString().split('T')[0]

  const [date, setDate]             = useState(today)
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)

  const { isDark } = useTheme()
  const theme      = getTheme(isDark)
  const isMobile   = useIsMobile()
  const grids      = useResponsiveGrid()

  const fetchDashboard = async (selectedDate) => {
    try {
      setLoading(true)
      setError('')

      // Fetch bills for selected date
      const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select('*')
        .eq('bill_date', selectedDate)
        .order('created_at', { ascending: false })

      if (billsError) throw billsError

      // Fetch sales for selected date
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('sale_date', selectedDate)
        .order('created_at', { ascending: false })

      if (salesError) throw salesError

      // Calculate summary
      const totalRevenue    = bills.reduce((sum, b) => sum + (b.grand_total || 0), 0)
      const totalBills      = bills.length
      const goldWeight      = sales.filter(s => s.category === 'Gold').reduce((sum, s) => sum + (s.weight_sold_g || 0), 0)
      const silverWeight    = sales.filter(s => s.category === 'Silver').reduce((sum, s) => sum + (s.weight_sold_g || 0), 0)
      const pattiluWeight   = sales.filter(s => s.category === 'Pattilu').reduce((sum, s) => sum + (s.weight_sold_g || 0), 0)

      // Fetch weight checks
      const { data: weightChecks } = await supabase
        .from('weight_checks')
        .select('*')
        .eq('check_date', selectedDate)

      const pattiluChecked  = weightChecks ? weightChecks.length : 0
      const pattiluAllMatch = weightChecks ? weightChecks.every(w => w.is_match) : false

      // Old gold/silver from bills items_json
     let oldGoldWeight   = 0
let oldSilverWeight = 0
bills.forEach(bill => {
  try {
    const parsed   = typeof bill.items_json === 'string'
      ? JSON.parse(bill.items_json)
      : bill.items_json

    // old_items is separate array in the parsed object
    const oldItems = Array.isArray(parsed) ? [] : parsed.old_items || []

    oldItems.forEach(item => {
      if (item.category === 'Gold') {
        oldGoldWeight   += parseFloat(item.pure_weight) || 0
      } else if (item.category === 'Silver') {
        oldSilverWeight += parseFloat(item.pure_weight) || 0
      }
    })
  } catch (_) {}
})

      setData({
        bills,
        sales,
        summary: {
          totalRevenue,
          totalBills,
          goldWeight,
          silverWeight,
          pattiluWeight,
          pattiluChecked,
          pattiluAllMatch,
          oldGoldWeight,
          oldSilverWeight
        }
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

  const formatDate = (dateStr) => {
    const options = { weekday: 'long', month: 'long', day: 'numeric' }
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', options)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style               : 'currency',
      currency            : 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const isToday = date === today

  return (
    <div>

      {/* ── Date Header ── */}
      <div style={{
        display        : 'flex',
        justifyContent : 'space-between',
        alignItems     : 'center',
        marginBottom   : '20px'
      }}>
        <div>
          <p style={{ fontSize: '13px', color: theme.textSecondary, fontWeight: '500' }}>
            {isToday ? 'Today' : 'Viewing'}
          </p>
          <h1 style={{
            fontSize  : isMobile ? '18px' : '24px',
            fontWeight: '800',
            color     : theme.textPrimary,
            marginTop : '2px'
          }}>
            {formatDate(date)}
          </h1>
        </div>

        <div>
          {showDatePicker ? (
            <input
              style={{
                padding        : '8px 12px',
                borderRadius   : '10px',
                border         : `1px solid ${theme.borderInput}`,
                fontSize       : '13px',
                outline        : 'none',
                backgroundColor: theme.inputBg,
                color          : theme.textPrimary
              }}
              type="date"
              value={date}
              max={today}
              onChange={e => {
                setDate(e.target.value)
                setShowDatePicker(false)
              }}
              autoFocus
              onBlur={() => setShowDatePicker(false)}
            />
          ) : (
            <button
              onClick={() => setShowDatePicker(true)}
              style={{
                padding        : '8px 16px',
                borderRadius   : '10px',
                border         : `1px solid ${theme.borderInput}`,
                backgroundColor: theme.cardBg,
                color          : theme.textSecondary,
                fontSize       : '13px',
                fontWeight     : '600',
                cursor         : 'pointer',
                boxShadow      : theme.shadowSm
              }}
            >
              Change Date
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          color          : '#dc2626',
          padding        : '12px 16px',
          borderRadius   : '12px',
          marginBottom   : '16px',
          fontSize       : '14px'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{
              height         : '80px',
              borderRadius   : '16px',
              backgroundColor: theme.cardBg,
              opacity        : 0.5
            }} />
          ))}
        </div>
      ) : data && (
        <>
          {/* ── Revenue Hero Card ── */}
          <div style={{
            background  : 'linear-gradient(135deg, #1a1a2e 0%, #2d2d5e 100%)',
            borderRadius: '20px',
            padding     : '24px',
            marginBottom: '16px',
            boxShadow   : '0 8px 32px rgba(26,26,46,0.3)',
            position    : 'relative',
            overflow    : 'hidden'
          }}>
            <div style={{
              position       : 'absolute', top: '-20px', right: '-20px',
              width          : '120px', height: '120px', borderRadius: '50%',
              backgroundColor: 'rgba(245,158,11,0.1)'
            }} />
            <div style={{
              position       : 'absolute', bottom: '-30px', right: '40px',
              width          : '80px', height: '80px', borderRadius: '50%',
              backgroundColor: 'rgba(245,158,11,0.05)'
            }} />
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginBottom: '6px' }}>
              Total Revenue
            </p>
            <p style={{
              fontSize     : isMobile ? '32px' : '40px',
              fontWeight   : '800',
              color        : '#ffffff',
              marginBottom : '16px',
              letterSpacing: '-1px'
            }}>
              {formatCurrency(data.summary.totalRevenue)}
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Bills</p>
                <p style={{ fontSize: '16px', fontWeight: '700', color: '#f59e0b' }}>
                  {data.summary.totalBills}
                </p>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Items Sold</p>
                <p style={{ fontSize: '16px', fontWeight: '700', color: '#f59e0b' }}>
                  {data.sales.length}
                </p>
              </div>
            </div>
          </div>

          {/* ── Stat Cards Grid ── */}
          <div style={{ ...grids.grid2, marginBottom: '16px' }}>

            <div style={{
              backgroundColor: theme.cardBg, borderRadius: '16px',
              padding: '16px', boxShadow: theme.shadowSm, border: `1px solid ${theme.border}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ fontSize: '12px', color: theme.textSecondary, fontWeight: '600' }}>Gold Sold</p>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  backgroundColor: '#fef3c7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
                }}>🥇</div>
              </div>
              <p style={{ fontSize: '22px', fontWeight: '800', color: '#f59e0b', marginTop: '8px' }}>
                {data.summary.goldWeight.toFixed(2)}g
              </p>
            </div>

            <div style={{
              backgroundColor: theme.cardBg, borderRadius: '16px',
              padding: '16px', boxShadow: theme.shadowSm, border: `1px solid ${theme.border}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ fontSize: '12px', color: theme.textSecondary, fontWeight: '600' }}>Silver Sold</p>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  backgroundColor: '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
                }}>🥈</div>
              </div>
              <p style={{ fontSize: '22px', fontWeight: '800', color: '#64748b', marginTop: '8px' }}>
                {data.summary.silverWeight.toFixed(2)}g
              </p>
            </div>

            <div style={{
              backgroundColor: theme.cardBg, borderRadius: '16px',
              padding: '16px', boxShadow: theme.shadowSm, border: `1px solid ${theme.border}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ fontSize: '12px', color: theme.textSecondary, fontWeight: '600' }}>Pattilu Sold</p>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  backgroundColor: '#ede9fe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
                }}>💫</div>
              </div>
              <p style={{ fontSize: '22px', fontWeight: '800', color: '#8b5cf6', marginTop: '8px' }}>
                {data.summary.pattiluWeight.toFixed(2)}g
              </p>
            </div>

            <div style={{
              backgroundColor: theme.cardBg, borderRadius: '16px',
              padding: '16px', boxShadow: theme.shadowSm, border: `1px solid ${theme.border}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ fontSize: '12px', color: theme.textSecondary, fontWeight: '600' }}>Weight Check</p>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  backgroundColor: data.summary.pattiluChecked === 0
                    ? '#f1f5f9' : data.summary.pattiluAllMatch ? '#d1fae5' : '#fee2e2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
                }}>⚖️</div>
              </div>
              <p style={{
                fontSize: '18px', fontWeight: '800', marginTop: '8px',
                color: data.summary.pattiluChecked === 0
                  ? theme.textSecondary
                  : data.summary.pattiluAllMatch ? '#10b981' : '#ef4444'
              }}>
                {data.summary.pattiluChecked === 0
                  ? 'Not Done'
                  : data.summary.pattiluAllMatch ? '✓ OK' : '⚠ Check'}
              </p>
            </div>

          </div>

          {/* ── Old Gold/Silver Received ── */}
          {(data.summary.oldGoldWeight > 0 || data.summary.oldSilverWeight > 0) && (
            <div style={{
              backgroundColor: theme.cardBg, borderRadius: '16px',
              padding: '16px', marginBottom: '16px',
              boxShadow: theme.shadowSm, border: `1px solid ${theme.border}`
            }}>
              <p style={{ fontSize: '13px', fontWeight: '700', color: theme.textPrimary, marginBottom: '12px' }}>
                Old Items Received Today
              </p>
              <div style={{ display: 'flex', gap: '24px' }}>
                {data.summary.oldGoldWeight > 0 && (
                  <div>
                    <p style={{ fontSize: '11px', color: theme.textSecondary }}>Old Gold</p>
                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b' }}>
                      {data.summary.oldGoldWeight.toFixed(2)}g
                    </p>
                  </div>
                )}
                {data.summary.oldSilverWeight > 0 && (
                  <div>
                    <p style={{ fontSize: '11px', color: theme.textSecondary }}>Old Silver</p>
                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#64748b' }}>
                      {data.summary.oldSilverWeight.toFixed(2)}g
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Recent Bills ── */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '15px', fontWeight: '700', color: theme.textPrimary, marginBottom: '12px' }}>
              Bills — {data.bills.length} total
            </p>
            {data.bills.length === 0 ? (
              <div style={{
                backgroundColor: theme.cardBg, borderRadius: '16px',
                padding: '32px', textAlign: 'center', border: `1px solid ${theme.border}`
              }}>
                <p style={{ fontSize: '32px', marginBottom: '8px' }}>📋</p>
                <p style={{ color: theme.textSecondary, fontSize: '14px' }}>No bills for this date</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.bills.map((bill) => {
                  const parsed = typeof bill.items_json === 'string'
     ? JSON.parse(bill.items_json)
         : bill.items_json
          const items = Array.isArray(parsed) ? parsed : parsed.items || []
                  return (
                    <div key={bill.id} style={{
                      backgroundColor: theme.cardBg, borderRadius: '16px',
                      padding: '16px', boxShadow: theme.shadowSm,
                      border: `1px solid ${theme.border}`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: '700', color: '#f59e0b' }}>
                          {bill.bill_number}
                        </p>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: theme.textPrimary, marginTop: '2px' }}>
                          {bill.customer_name}
                        </p>
                        <p style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '2px' }}>
                          {items.length} item{items.length > 1 ? 's' : ''}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '16px', fontWeight: '800', color: '#10b981' }}>
                          {formatCurrency(bill.grand_total)}
                        </p>
                        {bill.discount > 0 && (
                          <p style={{ fontSize: '11px', color: theme.textSecondary, marginTop: '2px' }}>
                            Disc: {formatCurrency(bill.discount)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Sales Breakdown ── */}
          {data.sales.length > 0 && (
            <div>
              <p style={{ fontSize: '15px', fontWeight: '700', color: theme.textPrimary, marginBottom: '12px' }}>
                Sales Breakdown
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.sales.map((sale) => (
                  <div key={sale.id} style={{
                    backgroundColor: theme.cardBg, borderRadius: '14px',
                    padding: '14px 16px', border: `1px solid ${theme.border}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        backgroundColor: sale.category === 'Gold' ? '#fef3c7'
                          : sale.category === 'Pattilu' ? '#ede9fe' : '#f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
                      }}>
                        {sale.category === 'Gold' ? '🥇' : sale.category === 'Pattilu' ? '💫' : '🥈'}
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: theme.textPrimary }}>
                          {sale.item_name}
                        </p>
                        <p style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '1px' }}>
                          {sale.weight_sold_g}g × ₹{sale.rate_per_gram}/g
                        </p>
                      </div>
                    </div>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: '#10b981' }}>
                      {formatCurrency(sale.total_price)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </>
      )}
    </div>
  )
}

export default Dashboard