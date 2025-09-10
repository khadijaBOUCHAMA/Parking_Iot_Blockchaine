import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/hooks/useAuth.tsx'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'user' | 'admin'
  redirectTo?: string
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole = 'user',
  redirectTo
}) => {
  const { user, isLoading } = useAuthContext()
  const navigate = useNavigate()

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return

    // If not authenticated, redirect to auth page
    if (!user) {
      navigate('/auth')
      return
    }

    // Check if user is admin based on their MetaMask address
    const adminAddress = '0x5aE80F47D3ABc81F820fd1C7E57e315DCC1DF8bF'.toLowerCase()
    const isAdmin = user.walletAddress.toLowerCase() === adminAddress

    if (requiredRole === 'admin' && !isAdmin) {
      // Non-admin trying to access admin route, redirect to user dashboard
      navigate('/dashboard')
      return
    }

    if (requiredRole === 'user' && isAdmin) {
      // Admin trying to access user route, redirect to admin dashboard
      navigate('/admin')
      return
    }
  }, [user, isLoading, requiredRole, redirectTo, navigate])

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-accent/5">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!user) {
    return null
  }

  // Render the protected content
  return <>{children}</>
}

export default ProtectedRoute
