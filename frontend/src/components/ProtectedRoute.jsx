import { Navigate } from 'react-router-dom'

function ProtectedRoute({ children }) {

  // Check if token exists in localStorage
  const token = localStorage.getItem('token')

  // If no token → send to login page
  if (!token) {
    return <Navigate to="/" />
  }

  // If token exists → show the page
  return children
}

export default ProtectedRoute