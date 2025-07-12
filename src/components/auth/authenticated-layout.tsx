"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { PageTransition } from "@/components/ui/page-transition"

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const pathname = usePathname()

  // Define routes that should not show sidebar/header even when authenticated
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password']
  const isPublicRoute = publicRoutes.includes(pathname)

  // Show sidebar and header only if authenticated and not on public routes
  const showSidebar = isAuthenticated && !isPublicRoute

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (showSidebar) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1 overflow-hidden">
          <div className="flex h-full flex-col">
            <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6">
              <SidebarTrigger className="cursor-pointer -ml-3" />
              <h1 className="text-lg font-semibold">TrendScribe Dashboard</h1>
            </header>
            <div className="flex-1 overflow-auto p-6">
              <PageTransition>
                {children}
              </PageTransition>
            </div>
          </div>
        </main>
      </SidebarProvider>
    )
  }

  // For non-authenticated users or public routes, show simple layout
  return (
    <div className="min-h-screen">
      <PageTransition>
        {children}
      </PageTransition>
    </div>
  )
}