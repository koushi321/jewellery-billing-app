import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, ScanBarcode, ReceiptText,
  History, Coins, Scale, PiggyBank, Sun, Moon, LogOut
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const menuItems = [
  { path: '/dashboard',   label: 'Dashboard',     Icon: LayoutDashboard },
  { path: '/stock',       label: 'Stock',         Icon: Package         },
  { path: '/barcode',     label: 'Barcode',       Icon: ScanBarcode     },
  { path: '/billing',     label: 'Billing',       Icon: ReceiptText     },
  { path: '/bills',       label: 'Bills History', Icon: History         },
  { path: '/goldloan',    label: 'Gold Loan',     Icon: Coins           },
  { path: '/weightcheck', label: 'Weight Check',  Icon: Scale           },
  { path: '/scheme',      label: 'Scheme',        Icon: PiggyBank       },
]

function Sidebar() {
  const navigate                = useNavigate()
  const location                = useLocation()
  const { isDark, toggleTheme } = useTheme()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/')
  }

  return (
    <div style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logo}>
        <div className="app-logo">
          <span className="app-logo-main">Sri Palivela</span>
          <span className="app-logo-sub">Jewellery</span>
        </div>
      </div>

      {/* Menu */}
      <nav style={styles.nav}>
        {menuItems.map(({ path, label, Icon }) => {
          const isActive = location.pathname === path
          return (
            <div
              key={path}
              className={`app-nav-item${isActive ? ' active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon size={18} strokeWidth={1.8} />
              {label}
            </div>
          )
        })}
      </nav>

      {/* Theme + logout */}
      <div style={styles.bottom}>
        <div className="app-nav-item" onClick={toggleTheme}>
          {isDark ? <Moon size={18} strokeWidth={1.8} /> : <Sun size={18} strokeWidth={1.8} />}
          {isDark ? 'Dark mode' : 'Light mode'}
        </div>
        <div className="app-nav-item" onClick={handleLogout}>
          <LogOut size={18} strokeWidth={1.8} />
          Logout
        </div>
      </div>
    </div>
  )
}

const styles = {
  sidebar: {
    width          : '240px',
    minHeight      : '100vh',
    display        : 'flex',
    flexDirection  : 'column',
    padding        : '26px 0 16px',
    position       : 'fixed',
    left           : 0,
    top            : 0,
    backgroundColor: '#0a0908',
    backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(201,164,92,0.12), transparent 60%)',
    borderRight    : '1px solid rgba(201,164,92,0.22)',
    zIndex         : 20
  },
  logo: {
    padding     : '0 20px 26px',
    marginBottom: '18px',
    borderBottom: '1px solid rgba(201,164,92,0.22)',
    display     : 'flex',
    justifyContent: 'center'
  },
  nav: {
    flex         : 1,
    display      : 'flex',
    flexDirection: 'column',
    gap          : '4px',
    padding      : '0 12px'
  },
  bottom: {
    padding      : '14px 12px 0',
    borderTop    : '1px solid rgba(201,164,92,0.22)',
    display      : 'flex',
    flexDirection: 'column',
    gap          : '4px'
  }
}

export default Sidebar
