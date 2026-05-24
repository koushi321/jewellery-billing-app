import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { getTheme } from '../context/theme'

const navItems = [
  { path: '/dashboard',   label: 'Home',    icon: '⊞' },
  { path: '/stock',       label: 'Stock',   icon: '▤'  },
  { path: '/billing',     label: 'Bill',    icon: '✎'  },
  { path: '/bills',       label: 'History', icon: '☰'  },
  { path: '/goldloan',    label: 'Loan',    icon: '◈'  },
  { path: '/weightcheck', label: 'Weight',  icon: '⊜'  },
]

function BottomNav() {
  const navigate     = useNavigate()
  const location     = useLocation()
  const { isDark }   = useTheme()
  const theme        = getTheme(isDark)

  return (
    <div style={{
      ...styles.container,
      backgroundColor: isDark ? '#1a1d2e' : '#ffffff',
      borderTop      : `1px solid ${theme.border}`,
      boxShadow      : isDark
        ? '0 -4px 12px rgba(0,0,0,0.4)'
        : '0 -4px 12px rgba(0,0,0,0.08)'
    }}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path
        return (
          <div
            key={item.path}
            style={{
              ...styles.navItem,
              color: isActive ? '#f59e0b' : theme.textSecondary
            }}
            onClick={() => navigate(item.path)}
          >
            <div style={{
              ...styles.iconWrapper,
              backgroundColor: isActive
                ? isDark ? '#2a2400' : '#fef3c7'
                : 'transparent'
            }}>
              <span style={styles.icon}>{item.icon}</span>
            </div>
            <span style={{
              ...styles.label,
              fontWeight: isActive ? '700' : '500',
              color     : isActive ? '#f59e0b' : theme.textSecondary
            }}>
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

const styles = {
  container: {
    position      : 'fixed',
    bottom        : 0,
    left          : 0,
    right         : 0,
    height        : '65px',
    display       : 'flex',
    alignItems    : 'center',
    justifyContent: 'space-around',
    zIndex        : 1000,
    paddingBottom : '4px'
  },
  navItem: {
    display       : 'flex',
    flexDirection : 'column',
    alignItems    : 'center',
    justifyContent: 'center',
    gap           : '2px',
    cursor        : 'pointer',
    flex          : 1,
    height        : '100%'
  },
  iconWrapper: {
    width        : '36px',
    height       : '36px',
    borderRadius : '10px',
    display      : 'flex',
    alignItems   : 'center',
    justifyContent: 'center',
    transition   : 'background-color 0.2s'
  },
  icon: {
    fontSize: '20px'
  },
  label: {
    fontSize: '10px'
  }
}

export default BottomNav