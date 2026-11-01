import { useState, useEffect, useRef } from 'react'
import { useNavigate }         from 'react-router-dom'
import CameraScanner           from '../components/CameraScanner'
import { downloadBackup, getBackupStatus } from '../utils/backup'
import { Coins, Sparkles, Scale } from 'lucide-react'
import '../styles/shine.css'
import { supabase }            from '../supabase'
import { useTheme }            from '../context/ThemeContext'
import { getTheme }            from '../context/theme'
import useIsMobile             from '../hooks/useIsMobile'
import useResponsiveGrid       from '../hooks/useResponsiveGrid'

// Small icon for a sale / stat tile
function CategoryIcon({ category }) {
  if (category === 'Gold')    return <Coins size={17} strokeWidth={1.8} color="#c9a45c" />
  if (category === 'Pattilu') return <Sparkles size={17} strokeWidth={1.8} color="#8b5cf6" />
  return <Coins size={17} strokeWidth={1.8} color="#94a3b8" />
}

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

  // Data backup (Excel download + reminder)
  const [backupStatus, setBackupStatus] = useState(getBackupStatus)
  const [backingUp, setBackingUp]       = useState(false)
  const [backupMsg, setBackupMsg]       = useState(null)

  const handleBackup = async () => {
    try {
      setBackingUp(true)
      setBackupMsg(null)
      const { failed, fileName } = await downloadBackup()
      setBackupStatus(getBackupStatus())
      if (failed.length) {
        setBackupMsg({ type: 'warn', text: `Downloaded ${fileName}, but these tables could not be read: ${failed.join(', ')}. Try again.` })
      } else {
        setBackupMsg({ type: 'success', text: `Backup downloaded: ${fileName}. Keep it safe (email it to yourself or save to a pen drive).` })
      }
    } catch {
      setBackupMsg({ type: 'error', text: 'Backup failed. Check your internet connection and try again.' })
    } finally {
      setBackingUp(false)
    }
  }

  const backupOverdue = backupStatus.last === null || backupStatus.days >= 7
  const backupText = backupStatus.last === null
    ? 'No backup downloaded yet on this device.'
    : backupStatus.days === 0
      ? 'Last backup: today.'
      : `Last backup: ${backupStatus.days} day${backupStatus.days === 1 ? '' : 's'} ago.`

  // Scan item -> go straight to Billing
  const navigate                    = useNavigate()
  const scanRef                     = useRef(null)
  const [scanValue, setScanValue]   = useState('')
  const [showCamera, setShowCamera] = useState(false)

  const goToBilling = (raw) => {
    const code = String(raw || '').trim().toUpperCase()
    if (!code) return
    navigate('/billing', { state: { barcode: code } })
  }

  useEffect(() => {
    if (!isMobile && scanRef.current) scanRef.current.focus()
  }, [isMobile])

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

      {/* ── Scan Item ── */}
      <div style={{
        backgroundColor: theme.cardBg,
        borderRadius   : '16px',
        padding        : isMobile ? '14px' : '18px 22px',
        marginBottom   : '20px',
        border         : `1px solid ${theme.border}`,
        boxShadow      : theme.shadowSm
      }}>
        <div style={{ fontSize: '15px', fontWeight: '700', color: theme.textPrimary, marginBottom: '4px' }}>
          Scan item
        </div>
        <div style={{ fontSize: '12px', color: theme.textSecondary, marginBottom: '12px' }}>
          Scan a tag to open Billing with that item filled in.
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            ref={scanRef}
            style={{
              flex           : 1,
              minWidth       : '180px',
              padding        : '11px 12px',
              borderRadius   : '8px',
              border         : `1px solid ${theme.borderInput}`,
              backgroundColor: theme.inputBg,
              color          : theme.textPrimary,
              fontSize       : '14px',
              outline        : 'none'
            }}
            placeholder="Scan with scanner, then it opens Billing"
            value={scanValue}
            onChange={e => setScanValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                goToBilling(scanValue)
              }
            }}
            autoComplete="off"
          />
          <button
            onClick={() => setShowCamera(true)}
            style={{
              padding        : '11px 18px',
              borderRadius   : '8px',
              border         : 'none',
              backgroundColor: '#c9a45c',
              color          : 'white',
              fontSize       : '14px',
              fontWeight     : '700',
              cursor         : 'pointer'
            }}
          >
            Scan item
          </button>
        </div>
      </div>

      {/* ── Data backup ── */}
      <div style={{
        backgroundColor: theme.cardBg,
        borderRadius   : '16px',
        padding        : isMobile ? '14px' : '18px 22px',
        marginBottom   : '20px',
        border         : `1px solid ${backupOverdue ? '#c9a45c' : theme.border}`,
        boxShadow      : theme.shadowSm
      }}>
        <div style={{ fontSize: '15px', fontWeight: '700', color: theme.textPrimary, marginBottom: '4px' }}>
          Data backup
        </div>
        <div style={{ fontSize: '13px', color: backupOverdue ? '#a8823a' : theme.textSecondary, marginBottom: '12px', fontWeight: backupOverdue ? '600' : '400' }}>
          {backupText}{backupOverdue ? ' Download a backup now (do this once a week).' : ''}
        </div>
        <button
          onClick={handleBackup}
          disabled={backingUp}
          style={{
            padding        : '11px 18px',
            borderRadius   : '8px',
            border         : 'none',
            backgroundColor: '#c9a45c',
            color          : 'white',
            fontSize       : '14px',
            fontWeight     : '700',
            cursor         : 'pointer',
            opacity        : backingUp ? 0.6 : 1,
            width          : isMobile ? '100%' : 'auto'
          }}
        >
          {backingUp ? 'Preparing backup...' : 'Download backup (Excel)'}
        </button>
        {backupMsg && (
          <div style={{
            marginTop      : '12px',
            padding        : '10px 12px',
            borderRadius   : '8px',
            fontSize       : '13px',
            backgroundColor: { success: '#d1fae5', warn: '#fef3c7', error: '#fee2e2' }[backupMsg.type],
            color          : { success: '#065f46', warn: '#92400e', error: '#dc2626' }[backupMsg.type]
          }}>
            {backupMsg.text}
          </div>
        )}
      </div>

      {showCamera && (
        <CameraScanner
          onScan={(text) => { setShowCamera(false); goToBilling(text) }}
          onClose={() => setShowCamera(false)}
        />
      )}

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
            background  : 'linear-gradient(135deg, #1d1812 0%, #3a2d16 100%)',
            borderRadius: '20px',
            padding     : '24px',
            marginBottom: '16px',
            boxShadow   : '0 12px 36px rgba(0,0,0,0.35)',
            border      : '1px solid rgba(201,164,92,0.35)',
            position    : 'relative',
            overflow    : 'hidden'
          }}>
            <div style={{
              position       : 'absolute', top: '-20px', right: '-20px',
              width          : '120px', height: '120px', borderRadius: '50%',
              backgroundColor: 'rgba(201,164,92,0.1)'
            }} />
            <div style={{
              position       : 'absolute', bottom: '-30px', right: '40px',
              width          : '80px', height: '80px', borderRadius: '50%',
              backgroundColor: 'rgba(201,164,92,0.05)'
            }} />
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginBottom: '6px' }}>
              Total Revenue
            </p>
            <p className="pj-shine pj-shine-static" style={{
              fontSize     : isMobile ? '34px' : '46px',
              fontWeight   : '700',
              fontFamily   : "'Playfair Display', Georgia, serif",
              marginBottom : '16px',
              display      : 'inline-block'
            }}>
              {formatCurrency(data.summary.totalRevenue)}
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Bills</p>
                <p style={{ fontSize: '16px', fontWeight: '700', color: '#c9a45c' }}>
                  {data.summary.totalBills}
                </p>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Items Sold</p>
                <p style={{ fontSize: '16px', fontWeight: '700', color: '#c9a45c' }}>
                  {data.sales.length}
                </p>
              </div>
            </div>
          </div>

          {/* ── Stat Cards Grid ── */}
          <div style={{ ...grids.grid2, marginBottom: '16px' }}>

            <div className="app-card" style={{
              backgroundColor: theme.cardBg, borderRadius: '16px',
              padding: '16px', boxShadow: theme.shadowSm, border: `1px solid ${theme.border}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ fontSize: '12px', color: theme.textSecondary, fontWeight: '600' }}>Gold Sold</p>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  backgroundColor: isDark ? 'rgba(201,164,92,0.18)' : '#fef3c7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
                }}><CategoryIcon category="Gold" /></div>
              </div>
              <p style={{ fontSize: '22px', fontWeight: '800', color: '#c9a45c', marginTop: '8px' }}>
                {data.summary.goldWeight.toFixed(2)}g
              </p>
            </div>

            <div className="app-card" style={{
              backgroundColor: theme.cardBg, borderRadius: '16px',
              padding: '16px', boxShadow: theme.shadowSm, border: `1px solid ${theme.border}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ fontSize: '12px', color: theme.textSecondary, fontWeight: '600' }}>Silver Sold</p>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
                }}><CategoryIcon category="Silver" /></div>
              </div>
              <p style={{ fontSize: '22px', fontWeight: '800', color: '#64748b', marginTop: '8px' }}>
                {data.summary.silverWeight.toFixed(2)}g
              </p>
            </div>

            <div className="app-card" style={{
              backgroundColor: theme.cardBg, borderRadius: '16px',
              padding: '16px', boxShadow: theme.shadowSm, border: `1px solid ${theme.border}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ fontSize: '12px', color: theme.textSecondary, fontWeight: '600' }}>Pattilu Sold</p>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  backgroundColor: isDark ? 'rgba(139,92,246,0.2)' : '#ede9fe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
                }}><CategoryIcon category="Pattilu" /></div>
              </div>
              <p style={{ fontSize: '22px', fontWeight: '800', color: '#8b5cf6', marginTop: '8px' }}>
                {data.summary.pattiluWeight.toFixed(2)}g
              </p>
            </div>

            <div className="app-card" style={{
              backgroundColor: theme.cardBg, borderRadius: '16px',
              padding: '16px', boxShadow: theme.shadowSm, border: `1px solid ${theme.border}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ fontSize: '12px', color: theme.textSecondary, fontWeight: '600' }}>Weight Check</p>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  backgroundColor: data.summary.pattiluChecked === 0
                    ? (isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9')
                    : data.summary.pattiluAllMatch
                      ? (isDark ? 'rgba(16,185,129,0.2)' : '#d1fae5')
                      : (isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
                }}><Scale size={17} strokeWidth={1.8} color={data.summary.pattiluChecked === 0 ? '#94a3b8' : data.summary.pattiluAllMatch ? '#10b981' : '#ef4444'} /></div>
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
            <div className="app-card" style={{
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
                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#c9a45c' }}>
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
              <div className="app-card" style={{
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
                    <div key={bill.id} className="app-card" style={{
                      backgroundColor: theme.cardBg, borderRadius: '16px',
                      padding: '16px', boxShadow: theme.shadowSm,
                      border: `1px solid ${theme.border}`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: '700', color: '#c9a45c' }}>
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
                  <div key={sale.id} className="app-card" style={{
                    backgroundColor: theme.cardBg, borderRadius: '14px',
                    padding: '14px 16px', border: `1px solid ${theme.border}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        backgroundColor: sale.category === 'Gold' ? (isDark ? 'rgba(201,164,92,0.18)' : '#fef3c7')
                          : sale.category === 'Pattilu' ? (isDark ? 'rgba(139,92,246,0.2)' : '#ede9fe')
                          : (isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
                      }}>
                        <CategoryIcon category={sale.category} />
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