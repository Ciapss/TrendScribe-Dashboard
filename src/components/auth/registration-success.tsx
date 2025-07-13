"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Icons } from '@/components/ui/icons'

export function RegistrationSuccess() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Icons.check className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-green-700">Registration Successful!</CardTitle>
          <CardDescription>
            Your account has been created successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Account Verification Required</h3>
            <p className="text-sm text-blue-800 mb-3">
              Your account is currently pending activation. An administrator will review and activate your account shortly.
            </p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• You will receive an email confirmation once your account is activated</li>
              <li>• This process typically takes 1-2 business days</li>
              <li>• You can attempt to log in once your account is activated</li>
            </ul>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">What&apos;s Next?</h3>
            <p className="text-sm text-gray-700 mb-2">
              While you wait for account activation, you can:
            </p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Check your email for updates</li>
              <li>• Review our documentation and features</li>
              <li>• Contact support if you have questions</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/login">
                Go to Login Page
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                Return to Home
              </Link>
            </Button>
          </div>
          
          <div className="text-center text-sm text-gray-500">
            Need help? <Link href="/contact" className="text-blue-600 hover:underline">Contact Support</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}