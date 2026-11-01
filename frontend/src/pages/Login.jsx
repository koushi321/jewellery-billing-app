import { useState } from 'react'
import { supabase } from '../supabase'
import { useNavigate, Link } from 'react-router-dom'
import '@fontsource/playfair-display/700.css'
import '@fontsource/jost/400.css'
import '@fontsource/jost/500.css'
import { SHOP_NAME, HERO_BACKGROUND } from '../data/brand'
import { spotlight } from '../utils/spotlight'
import '../styles/shine.css'
import './Login.css'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter email and password')
      return
    }

    try {
      setLoading(true)
      setError('')

      const { data, error } = await supabase.auth.signInWithPassword({
        email: username,
        password
      })

      if (error) {
        throw error
      }

      localStorage.setItem('token', data.session.access_token)
      navigate('/dashboard')

    } catch (err) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pjl" onMouseMove={spotlight}>
      <div className="pjl-bg" style={{ background: HERO_BACKGROUND }} aria-hidden="true" />
      <div className="pj-glow-layer" aria-hidden="true" />
      <Link className="pjl-back" to="/">← Back to home</Link>

      <div className="pjl-card">
        <div className="pj-name-wrap">
          <h1 className="pjl-title pj-shine">{SHOP_NAME}</h1>
          <span className="pj-sparkle" aria-hidden="true" style={{ top: '-4%', left: '2%', '--s': '12px', '--d': '0s' }} />
          <span className="pj-sparkle" aria-hidden="true" style={{ top: '10%', right: '0%', '--s': '14px', '--d': '1.5s' }} />
          <span className="pj-sparkle" aria-hidden="true" style={{ bottom: '6%', left: '40%', '--s': '10px', '--d': '2.4s' }} />
        </div>
        <div className="pjl-rule" aria-hidden="true" />
        <p className="pjl-subtitle">Sign in to manage your shop</p>

        {error && <p className="pjl-error">{error}</p>}

        <div className="pjl-group">
          <label className="pjl-label" htmlFor="pjl-email">Email address</label>
          <input
            id="pjl-email"
            className="pjl-input"
            type="email"
            placeholder="Enter email address"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="pjl-group">
          <label className="pjl-label" htmlFor="pjl-password">Password</label>
          <input
            id="pjl-password"
            className="pjl-input"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
            autoComplete="current-password"
          />
        </div>

        <button className="pjl-button" onClick={handleLogin} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>
    </div>
  )
}

export default Login
