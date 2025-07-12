"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './auth-provider'
import { Icons } from '@/components/ui/icons'

interface RouteGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireAdmin?: boolean
  fallbackPath?: string
}

export function RouteGuard({ 
  children, 
  requireAuth = false, 
  requireAdmin = false,
  fallbackPath = '/login'
}: RouteGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return

    // Check if route requires authentication
    if (requireAuth && !isAuthenticated) {
      router.push(`${fallbackPath}?redirect=${encodeURIComponent(pathname)}`)
      return
    }

    // Check if route requires admin privileges
    if (requireAdmin && (!user || user.role !== 'admin')) {
      router.push('/unauthorized')
      return
    }

    // Redirect authenticated users away from auth pages
    if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
      router.push('/')
      return
    }
  }, [isLoading, isAuthenticated, user, router, pathname, requireAuth, requireAdmin, fallbackPath])

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Show nothing while redirecting
  if (requireAuth && !isAuthenticated) {
    return null
  }

  if (requireAdmin && (!user || user.role !== 'admin')) {
    return null
  }

  return <>{children}</>
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: { requireAdmin?: boolean } = {}
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <RouteGuard requireAuth={true} requireAdmin={options.requireAdmin}>
        <Component {...props} />
      </RouteGuard>
    )
  }
}

// Hook for checking admin access in components
export function useRequireAdmin() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/unauthorized')
    }
  }, [user, isLoading, router])

  return {
    isAdmin: user?.role === 'admin',
    isLoading,
  }
}