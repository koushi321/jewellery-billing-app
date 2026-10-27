import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

const menuItems = [
  { path: '/dashboard',   label: 'Dashboard'    },
  { path: '/stock',       label: 'Stock'        },
  { path: '/barcode',     label: 'Barcode'      },
  { path: '/billing',     label: 'Billing'      },
  { path: '/bills',       label: 'Bills History'},
  { path: '/goldloan',    label: 'Gold Loan'    },
  { path: '/weightcheck', label: 'Weight Check' },
  { path: '/scheme',      label: 'Scheme'       },
]

function Sidebar() {
  const navigate         = useNavigate()
  const location         = useLocation()
  const { isDark, toggleTheme } = useTheme()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/')
  }

  return (
    <div style={{
      ...styles.sidebar,
      backgroundColor: isDark ? '#1a1d2e' : '#1a1a2e',
      borderRight    : isDark ? '1px solid #2a2d3e' : 'none'
    }}>

      {/* Logo */}
     <div style={styles.logo}>
  <div style={styles.logoIcon}>
    <div style={styles.logoIconInner}>P</div>
  </div>
  <div style={styles.logoTextGroup}>
    <div style={styles.logoText}>Palivella</div>
    <div style={styles.logoSubText}>J E W E L L E R Y</div>
  </div>
</div>

      {/* Menu Items */}
      <nav style={styles.nav}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <div
              key={item.path}
              style={isActive ? styles.menuItemActive : styles.menuItem}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </div>
          )
        })}
      </nav>

      {/* Dark Mode Toggle */}
      <div style={styles.toggleSection}>
        <span style={styles.toggleLabel}>
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
        <div
          style={{
            ...styles.toggleTrack,
            backgroundColor: isDark ? '#f59e0b' : '#555'
          }}
          onClick={toggleTheme}
        >
          <div style={{
            ...styles.toggleThumb,
            transform: isDark ? 'translateX(20px)' : 'translateX(0px)'
          }} />
        </div>
      </div>

      {/* Logout */}
      <div style={styles.logout} onClick={handleLogout}>
        Logout
      </div>

    </div>
  )
}

const styles = {
  sidebar: {
    width        : '240px',
    minHeight    : '100vh',
    display      : 'flex',
    flexDirection: 'column',
    padding      : '20px 0',
    position     : 'fixed',
    left         : 0,
    top          : 0,
  },
  logo: {
     padding      : '0 24px 30px 24px',
     borderBottom : '1px solid #ffffff20',
    marginBottom : '20px',
    display      : 'flex',
    alignItems   : 'center',
    gap          : '12px'
  },
  logoIcon: {
  width          : '42px',
  height         : '42px',
  borderRadius   : '10px',
  background     : 'linear-gradient(135deg, #f59e0b, #d97706)',
  display        : 'flex',
  alignItems     : 'center',
  justifyContent : 'center',
  flexShrink     : 0,
  boxShadow      : '0 4px 12px rgba(245,158,11,0.4)'
},
logoIconInner: {
  color     : 'white',
  fontSize  : '22px',
  fontWeight: '800',
  fontFamily: 'Georgia, serif'
},
logoTextGroup: {
  display      : 'flex',
  flexDirection: 'column'
},
  logoText: {
  color      : 'white',
  fontSize   : '18px',
  fontWeight : '800',
  lineHeight : '1.2',
  fontFamily : 'Georgia, serif',
  letterSpacing: '0.5px'
},
  logoSubText: {
    color        : '#f59e0b',
  fontSize     : '9px',
  fontWeight   : '600',
  letterSpacing: '3px',
  textTransform: 'uppercase',
  marginTop    : '2px'
  },
  nav: {
    flex         : 1,
    display      : 'flex',
    flexDirection: 'column',
    gap          : '4px',
    padding      : '0 12px'
  },
  menuItem: {
    padding      : '12px 16px',
    borderRadius : '8px',
    color        : '#aaa',
    cursor       : 'pointer',
    fontSize     : '14px',
    fontWeight   : '500',
    transition   : 'all 0.2s'
  },
  menuItemActive: {
    padding        : '12px 16px',
    borderRadius   : '8px',
    color          : 'white',
    backgroundColor: '#f59e0b',
    cursor         : 'pointer',
    fontSize       : '14px',
    fontWeight     : '600'
  },
  toggleSection: {
    display        : 'flex',
    alignItems     : 'center',
    justifyContent : 'space-between',
    padding        : '16px 24px',
    borderTop      : '1px solid #ffffff20',
    marginTop      : '8px'
  },
  toggleLabel: {
    color   : '#aaa',
    fontSize: '13px'
  },
  toggleTrack: {
    width        : '44px',
    height       : '24px',
    borderRadius : '12px',
    cursor       : 'pointer',
    position     : 'relative',
    transition   : 'background-color 0.3s'
  },
  toggleThumb: {
    position        : 'absolute',
    top             : '2px',
    left            : '2px',
    width           : '20px',
    height          : '20px',
    borderRadius    : '50%',
    backgroundColor : 'white',
    transition      : 'transform 0.3s'
  },
  logout: {
    padding    : '16px 28px',
    color      : '#aaa',
    cursor     : 'pointer',
    fontSize   : '14px',
    borderTop  : '1px solid #ffffff20',
  }
}

export default Sidebar