import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useTheme } from './context/ThemeContext'
import Home        from './pages/Home'
import Login       from './pages/Login'
import Stock       from './pages/Stock'
import Billing     from './pages/Billing'
import Dashboard   from './pages/Dashboard'
import Bills       from './pages/Bills'
import GoldLoan    from './pages/GoldLoan'
import WeightCheck from './pages/WeightCheck'
import Layout      from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Scheme from './pages/Scheme'
import Barcode from './pages/Barcode'

function App() {
  const { isDark } = useTheme()

  // Apply dark/light class to body
  useEffect(() => {
    document.body.className = isDark ? 'dark' : 'light'
  }, [isDark])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={
        <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
      }/>
      <Route path="/stock" element={
        <ProtectedRoute><Layout><Stock /></Layout></ProtectedRoute>
      }/>
      <Route path="/barcode" element={
        <ProtectedRoute><Layout><Barcode /></Layout></ProtectedRoute>
      }/>
      <Route path="/billing" element={
        <ProtectedRoute><Layout><Billing /></Layout></ProtectedRoute>
      }/>
      <Route path="/bills" element={
        <ProtectedRoute><Layout><Bills /></Layout></ProtectedRoute>
      }/>
      <Route path="/goldloan" element={
        <ProtectedRoute><Layout><GoldLoan /></Layout></ProtectedRoute>
      }/>
      <Route path="/weightcheck" element={
        <ProtectedRoute><Layout><WeightCheck /></Layout></ProtectedRoute>
      }/>
      <Route path="/scheme" element={
  <ProtectedRoute><Layout><Scheme /></Layout></ProtectedRoute>
}/>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App