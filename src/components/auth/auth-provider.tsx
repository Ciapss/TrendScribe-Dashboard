"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export interface User {
  id: string
  email: string
  username: string
  role: 'admin' | 'user' | 'api_user'
  isActive: boolean
  isVerified: boolean
  createdAt: string
  lastLogin?: string
  webhookUrl?: string
}

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, username: string, password: string) => Promise<boolean>
  logout: () => void
  refreshToken: () => Promise<boolean>
  updateProfile: (data: Partial<User>) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const isAuthenticated = !!user

  // API base URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

  // Token management
  const getAccessToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token')
    }
    return null
  }

  const getRefreshToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refresh_token')
    }
    return null
  }

  const setTokens = (accessToken: string, refreshToken: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
    }
  }

  const clearTokens = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
  }

  // API calls with token handling
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = getAccessToken()
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      })

      // If unauthorized, try to refresh token
      if (response.status === 401 && token) {
        const refreshed = await refreshToken()
        if (refreshed) {
          // Retry with new token
          const newToken = getAccessToken()
          const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
              ...headers,
              Authorization: `Bearer ${newToken}`,
            },
          })
          return retryResponse
        } else {
          // Refresh failed, logout
          logout()
          return response
        }
      }

      return response
    } catch (error) {
      console.error('API call failed:', error)
      throw error
    }
  }

  // Auth functions
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      const formData = new FormData()
      formData.append('username', email) // OAuth2 standard uses 'username' for email
      formData.append('password', password)

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setTokens(data.access_token, data.refresh_token)
        
        // Fetch user profile
        await fetchUserProfile()
        
        toast.success('Login successful!')
        return true
      } else {
        const errorData = await response.json()
        toast.error(errorData.detail || 'Login failed')
        return false
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Login failed. Please try again.')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          username,
          password,
          role: 'user', // Default role
        }),
      })

      if (response.ok) {
        toast.success('Registration successful! Please login.')
        return true
      } else {
        const errorData = await response.json()
        toast.error(errorData.detail || 'Registration failed')
        return false
      }
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Registration failed. Please try again.')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    clearTokens()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const refresh = getRefreshToken()
      if (!refresh) return false

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refresh }),
      })

      if (response.ok) {
        const data = await response.json()
        setTokens(data.access_token, data.refresh_token)
        return true
      } else {
        clearTokens()
        return false
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      clearTokens()
      return false
    }
  }, [API_BASE_URL])

  const fetchUserProfile = async (): Promise<void> => {
    try {
      const response = await apiCall('/auth/me')
      
      if (response.ok) {
        const userData = await response.json()
        setUser({
          id: userData.id,
          email: userData.email,
          username: userData.username,
          role: userData.role,
          isActive: userData.is_active || false,
          isVerified: userData.is_verified || false,
          createdAt: userData.created_at,
          lastLogin: userData.last_login,
          webhookUrl: userData.webhook_url,
        })
      } else if (response.status === 401) {
        // Token invalid, clear auth state
        clearTokens()
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    }
  }

  const updateProfile = async (data: Partial<User>): Promise<boolean> => {
    try {
      const response = await apiCall('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({
          email: data.email,
          username: data.username,
          webhook_url: data.webhookUrl,
        }),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUser(prev => prev ? {
          ...prev,
          email: updatedUser.email,
          username: updatedUser.username,
          webhookUrl: updatedUser.webhook_url,
        } : null)
        toast.success('Profile updated successfully!')
        return true
      } else {
        const errorData = await response.json()
        toast.error(errorData.detail || 'Failed to update profile')
        return false
      }
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error('Failed to update profile')
      return false
    }
  }

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken()
      
      if (token) {
        await fetchUserProfile()
      }
      
      setIsLoading(false)
    }

    initAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-refresh token periodically
  useEffect(() => {
    if (isAuthenticated) {
      // Tokens expire in 30 days (43800 minutes), refresh every 24 hours to be safe
      const interval = setInterval(() => {
        refreshToken()
      }, 24 * 60 * 60 * 1000) // Refresh every 24 hours (tokens expire in 30 days)

      return () => clearInterval(interval)
    }
  }, [isAuthenticated, refreshToken])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}