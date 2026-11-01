import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, ScanBarcode, ReceiptText,
  History, Coins, Scale, PiggyBank
} from 'lucide-react'

const navItems = [
  { path: '/dashboard',   label: 'Home',    Icon: LayoutDashboard },
  { path: '/stock',       label: 'Stock',   Icon: Package         },
  { path: '/barcode',     label: 'Barcode', Icon: ScanBarcode     },
  { path: '/billing',     label: 'Bill',    Icon: ReceiptText     },
  { path: '/bills',       label: 'Bills',   Icon: History         },
  { path: '/goldloan',    label: 'Loan',    Icon: Coins           },
  { path: '/weightcheck', label: 'Check',   Icon: Scale           },
  { path: '/scheme',      label: 'Scheme',  Icon: PiggyBank       },
]

function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div style={{
      position       : 'fixed',
      bottom         : 0,
      left           : 0,
      right          : 0,
      height         : '70px',
      backgroundColor: '#0a0908',
      borderTop      : '1px solid rgba(201,164,92,0.3)',
      display        : 'flex',
      alignItems     : 'center',
      overflowX      : 'auto',
      overflowY      : 'hidden',
      zIndex         : 1000,
      paddingBottom  : '8px',
      boxShadow      : '0 -6px 24px rgba(0,0,0,0.5)',
      scrollbarWidth : 'none',
      msOverflowStyle: 'none'
    }}>
      {navItems.map(({ path, label, Icon }) => {
        const isActive = location.pathname === path
        return (
          <div
            key={path}
            onClick={() => navigate(path)}
            style={{
              display        : 'flex',
              flexDirection  : 'column',
              alignItems     : 'center',
              justifyContent : 'center',
              gap            : '3px',
              cursor         : 'pointer',
              minWidth       : '72px',
              height         : '100%',
              flexShrink     : 0
            }}
          >
            <div style={{
              width          : '42px',
              height         : '28px',
              borderRadius   : '14px',
              display        : 'flex',
              alignItems     : 'center',
              justifyContent : 'center',
              backgroundColor: isActive ? 'rgba(201,164,92,0.18)' : 'transparent',
              transition     : 'background-color 0.2s'
            }}>
              <Icon size={19} strokeWidth={1.8} color={isActive ? '#e2c689' : '#7f7461'} />
            </div>
            <span style={{
              fontSize  : '9px',
              fontWeight: isActive ? '700' : '500',
              color     : isActive ? '#e2c689' : '#7f7461',
              whiteSpace: 'nowrap',
              letterSpacing: '0.04em'
            }}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default BottomNav
