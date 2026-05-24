import Sidebar from './Sidebar'
import { useTheme } from '../context/ThemeContext'

function Layout({ children }) {
  const { isDark } = useTheme()

  return (
    <div style={{
      ...styles.container,
      backgroundColor: isDark ? '#0f1117' : '#f4f6f9'
    }}>
      <Sidebar />
      <div style={{
        ...styles.main,
        backgroundColor: isDark ? '#0f1117' : '#f4f6f9'
      }}>
        {children}
      </div>
    </div>
  )
}

const styles = {
  container: {
    display  : 'flex',
    minHeight: '100vh'
  },
  main: {
    marginLeft: '240px',
    flex      : 1,
    padding   : '30px',
    minHeight : '100vh'
  }
}

export default Layout