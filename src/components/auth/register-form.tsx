"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Icons } from '@/components/ui/icons'
import { useAuth } from './auth-provider'

interface PasswordRequirements {
  minLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
}

export function RegisterForm() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const { register } = useAuth()
  const router = useRouter()

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateUsername = (username: string) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/
    return usernameRegex.test(username)
  }

  const checkPasswordRequirements = (password: string): PasswordRequirements => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password)
    }
  }

  const passwordRequirements = checkPasswordRequirements(password)
  const isPasswordValid = Object.values(passwordRequirements).every(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setEmailError('')
    setUsernameError('')
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address')
      return
    }
    
    if (!validateUsername(username)) {
      setUsernameError('Username must be 3-50 characters and contain only letters, numbers, and underscores')
      return
    }
    
    if (!isPasswordValid) {
      return
    }

    if (password !== confirmPassword) {
      return
    }

    setIsLoading(true)
    
    try {
      const success = await register(email, username, password)
      if (success) {
        router.push('/register/success')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const passwordsMatch = password === confirmPassword
  const isFormValid = validateEmail(email) && validateUsername(username) && isPasswordValid && passwordsMatch

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>
            Enter your information to create your TrendScribe account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className={emailError ? 'border-red-500' : ''}
              />
              {emailError && (
                <p className="text-xs text-red-500">{emailError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                minLength={3}
                maxLength={50}
                className={usernameError ? 'border-red-500' : ''}
              />
              {usernameError && (
                <p className="text-xs text-red-500">{usernameError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
                className={password && !isPasswordValid ? 'border-red-500' : ''}
              />
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`text-xs ${passwordRequirements.minLength ? 'text-green-600' : 'text-red-500'}`}>
                    {passwordRequirements.minLength ? '✓' : '✗'} At least 8 characters
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-red-500'}`}>
                    {passwordRequirements.hasUppercase ? '✓' : '✗'} One uppercase letter
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs ${passwordRequirements.hasLowercase ? 'text-green-600' : 'text-red-500'}`}>
                    {passwordRequirements.hasLowercase ? '✓' : '✗'} One lowercase letter
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-red-500'}`}>
                    {passwordRequirements.hasNumber ? '✓' : '✗'} One number
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-500">Passwords don&apos;t match</p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !isFormValid}
            >
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Account
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}