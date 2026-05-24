import Sidebar     from './Sidebar'
import BottomNav   from './BottomNav'
import useIsMobile from '../hooks/useIsMobile'
import { useTheme }  from '../context/ThemeContext'
import { getTheme }  from '../context/theme'

function MobileHeader() {
  const { isDark, toggleTheme } = useTheme()
  const theme = getTheme(isDark)

  return (
    <div style={{
      display        : 'flex',
      justifyContent : 'space-between',
      alignItems     : 'center',
      padding        : '16px 20px',
      backgroundColor: theme.cardBg,
      borderBottom   : `1px solid ${theme.border}`,
      position       : 'sticky',
      top            : 0,
      zIndex         : 100,
      boxShadow      : theme.shadowSm
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width          : '36px',
          height         : '36px',
          borderRadius   : '10px',
          background     : 'linear-gradient(135deg, #f59e0b, #d97706)',
          display        : 'flex',
          alignItems     : 'center',
          justifyContent : 'center',
          boxShadow      : '0 4px 12px rgba(245,158,11,0.3)'
        }}>
          <span style={{
            color     : 'white',
            fontSize  : '18px',
            fontWeight: '800',
            fontFamily: 'Georgia, serif'
          }}>P</span>
        </div>
        <div>
          <div style={{
            fontSize  : '15px',
            fontWeight: '800',
            color     : theme.textPrimary,
            fontFamily: 'Georgia, serif',
            lineHeight : '1.1'
          }}>
            Palivella
          </div>
          <div style={{
            fontSize     : '8px',
            color        : '#f59e0b',
            letterSpacing: '2px',
            fontWeight   : '600'
          }}>
            JEWELLERY
          </div>
        </div>
      </div>

      {/* Dark mode toggle */}
      <div
        onClick={toggleTheme}
        style={{
          width          : '48px',
          height         : '26px',
          borderRadius   : '13px',
          backgroundColor: isDark ? '#f59e0b' : '#e2e8f0',
          cursor         : 'pointer',
          position       : 'relative',
          transition     : 'background-color 0.3s',
          boxShadow      : 'inset 0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{
          position       : 'absolute',
          top            : '3px',
          left           : '3px',
          width          : '20px',
          height         : '20px',
          borderRadius   : '50%',
          backgroundColor: 'white',
          transition     : 'transform 0.3s',
          transform      : isDark ? 'translateX(22px)' : 'translateX(0px)',
          boxShadow      : '0 2px 4px rgba(0,0,0,0.2)',
          display        : 'flex',
          alignItems     : 'center',
          justifyContent : 'center',
          fontSize       : '10px'
        }}>
          {isDark ? '🌙' : '☀️'}
        </div>
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
        backgroundColor: theme.pageBg,
        width         : isMobile ? '100%' : 'auto'
      }}>

        {isMobile && <MobileHeader />}

        <div style={{
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