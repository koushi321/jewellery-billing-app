import Sidebar     from './Sidebar'
import BottomNav   from './BottomNav'
import useIsMobile from '../hooks/useIsMobile'
import { useTheme } from '../context/ThemeContext'
import { getTheme }  from '../context/theme'

function MobileHeader() {
  const { isDark, toggleTheme } = useTheme()
  const theme = getTheme(isDark)

  return (
    <div style={{
      display        : 'flex',
      justifyContent : 'space-between',
      alignItems     : 'center',
      marginBottom   : '20px',
      paddingBottom  : '16px',
      borderBottom   : `1px solid ${theme.border}`
    }}>
      <div>
        <div style={{
          fontSize  : '18px',
          fontWeight: '800',
          color     : theme.textPrimary,
          fontFamily: 'Georgia, serif'
        }}>
          Palivella
        </div>
        <div style={{
          fontSize     : '9px',
          color        : '#f59e0b',
          letterSpacing: '2px',
          fontWeight   : '600'
        }}>
          J E W E L L E R Y
        </div>
      </div>

      <div
        style={{
          width          : '44px',
          height         : '24px',
          borderRadius   : '12px',
          backgroundColor: isDark ? '#f59e0b' : '#555',
          cursor         : 'pointer',
          position       : 'relative',
          transition     : 'background-color 0.3s'
        }}
        onClick={toggleTheme}
      >
        <div style={{
          position       : 'absolute',
          top            : '2px',
          left           : '2px',
          width          : '20px',
          height         : '20px',
          borderRadius   : '50%',
          backgroundColor: 'white',
          transition     : 'transform 0.3s',
          transform      : isDark ? 'translateX(20px)' : 'translateX(0px)'
        }} />
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

      {/* Sidebar only on desktop */}
      {!isMobile && <Sidebar />}

      {/* Main content */}
      <div style={{
        marginLeft     : isMobile ? '0' : '240px',
        flex           : 1,
        padding        : isMobile ? '16px 16px 80px 16px' : '30px',
        backgroundColor: theme.pageBg,
        minHeight      : '100vh',
        width          : isMobile ? '100%' : 'auto',
        boxSizing      : 'border-box'
      }}>

        {/* Mobile header */}
        {isMobile && <MobileHeader />}

        {children}

      </div>

      {/* Bottom nav only on mobile */}
      {isMobile && <BottomNav />}

    </div>
  )
}

export default Layout