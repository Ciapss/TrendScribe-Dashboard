"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { PageTransition } from "@/components/ui/page-transition"
import { JobProvider } from "@/contexts/JobContext"
import { DataProvider } from "@/contexts/DataContext"

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
      <JobProvider>
        <DataProvider>
          <SidebarProvider>
            <AppSidebar />
            <main className="flex-1 overflow-hidden">
              <div className="flex h-full flex-col">
                <header className="flex h-14 sm:h-16 items-center gap-2 sm:gap-4 border-b bg-muted/40 px-3 sm:px-6">
                  <SidebarTrigger className="cursor-pointer -ml-1 sm:-ml-3 min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto" />
                  <h1 className="text-base sm:text-lg font-semibold truncate">TrendScribe Dashboard</h1>
                </header>
                <div className="flex-1 overflow-auto p-3 sm:p-6">
                  <PageTransition>
                    {children}
                  </PageTransition>
                </div>
              </div>
            </main>
          </SidebarProvider>
        </DataProvider>
      </JobProvider>
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