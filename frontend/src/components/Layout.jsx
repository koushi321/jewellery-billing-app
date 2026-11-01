import Sidebar     from './Sidebar'
import BottomNav   from './BottomNav'
import useIsMobile from '../hooks/useIsMobile'
import { useTheme }  from '../context/ThemeContext'
import { getTheme }  from '../context/theme'
import { Sun, Moon } from 'lucide-react'

function MobileHeader() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <div style={{
      display        : 'flex',
      justifyContent : 'space-between',
      alignItems     : 'center',
      padding        : '14px 18px',
      backgroundColor: '#0a0908',
      borderBottom   : '1px solid rgba(201,164,92,0.3)',
      position       : 'sticky',
      top            : 0,
      zIndex         : 100,
      boxShadow      : '0 4px 18px rgba(0,0,0,0.4)'
    }}>
      <div className="app-logo">
        <span className="app-logo-main" style={{ fontSize: '17px' }}>Sri Palivela</span>
        <span className="app-logo-sub">Jewellery</span>
      </div>

      <div
        onClick={toggleTheme}
        style={{
          width          : '38px',
          height         : '38px',
          borderRadius   : '50%',
          border         : '1px solid rgba(201,164,92,0.45)',
          display        : 'flex',
          alignItems     : 'center',
          justifyContent : 'center',
          cursor         : 'pointer',
          color          : '#e2c689'
        }}
        aria-label="Change theme"
      >
        {isDark ? <Moon size={17} strokeWidth={1.8} /> : <Sun size={17} strokeWidth={1.8} />}
      </div>
    </div>
  )
}

function Layout({ children }) {
  const { isDark } = useTheme()
  const theme      = getTheme(isDark)
  const isMobile   = useIsMobile()

  return (
    <div style={{
      display        : 'flex',
      minHeight      : '100vh',
      backgroundColor: theme.pageBg
    }}>

      {!isMobile && <Sidebar />}

      <div style={{
       marginLeft    : isMobile ? '0' : '240px',
  flex          : 1,
  minHeight     : '100vh',
  maxHeight     : isMobile ? '100vh' : 'none',
  overflowY     : isMobile ? 'auto' : 'visible',
  backgroundColor: theme.pageBg,
  backgroundImage: isDark
    ? 'radial-gradient(ellipse at 80% -10%, rgba(201,164,92,0.10), transparent 55%)'
    : 'radial-gradient(ellipse at 80% -10%, rgba(201,164,92,0.14), transparent 55%)',
  width         : isMobile ? '100%' : 'auto'
      }}>

        {isMobile && <MobileHeader />}

        <div className="app-page" style={{
          padding   : isMobile ? '16px 16px 90px 16px' : '30px',
          maxWidth  : isMobile ? '100%' : '100%',
          boxSizing : 'border-box'
        }}>
          {children}
        </div>

      </div>

      {isMobile && <BottomNav />}

    </div>
  )
}

export default Layout