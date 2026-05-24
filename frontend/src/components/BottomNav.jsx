import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { getTheme } from '../context/theme'

const navItems = [
  { path: '/dashboard',   label: 'Home',    icon: '⌂'  },
  { path: '/stock',       label: 'Stock',   icon: '▦'  },
  { path: '/billing',     label: 'Bill',    icon: '⊕'  },
  { path: '/goldloan',    label: 'Loan',    icon: '◈'  },
  { path: '/weightcheck', label: 'Check',   icon: '⊜'  },
]

function BottomNav() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { isDark } = useTheme()
  const theme      = getTheme(isDark)

  return (
    <div style={{
      position       : 'fixed',
      bottom         : 0,
      left           : 0,
      right          : 0,
      height         : '70px',
      backgroundColor: theme.cardBg,
      borderTop      : `1px solid ${theme.border}`,
      display        : 'flex',
      alignItems     : 'center',
      justifyContent : 'space-around',
      zIndex         : 1000,
      paddingBottom  : '8px',
      boxShadow      : isDark
        ? '0 -4px 20px rgba(0,0,0,0.5)'
        : '0 -4px 20px rgba(0,0,0,0.08)'
    }}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path
        return (
          <div
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display       : 'flex',
              flexDirection : 'column',
              alignItems    : 'center',
              justifyContent: 'center',
              gap           : '3px',
              cursor        : 'pointer',
              flex          : 1,
              height        : '100%',
              transition    : 'all 0.2s'
            }}
          >
            <div style={{
              width          : '40px',
              height         : '28px',
              borderRadius   : '14px',
              display        : 'flex',
              alignItems     : 'center',
              justifyContent : 'center',
              backgroundColor: isActive
                ? isDark ? '#2a2000' : '#fef3c7'
                : 'transparent',
              transition     : 'all 0.2s'
            }}>
              <span style={{
                fontSize  : '18px',
                color     : isActive ? '#f59e0b' : theme.textMuted,
                transition: 'all 0.2s'
              }}>
                {item.icon}
              </span>
            </div>
            <span style={{
              fontSize  : '10px',
              fontWeight: isActive ? '700' : '500',
              color     : isActive ? '#f59e0b' : theme.textMuted,
              transition: 'all 0.2s'
            }}>
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default BottomNav