"use client"

import {
  Home,
  FileText,
  BarChart3,
  Webhook,
  Key,
  Plus,
  TrendingUp,
  Activity,
  LogOut,
  User,
  Users,
  Shield,
  Rss,
  Building2,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { GenerationFormAccordion } from "@/components/generation/generation-form-accordion"
import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/components/auth/auth-provider"

const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Posts",
    url: "/posts",
    icon: FileText,
  },
  {
    title: "Industries",
    url: "/industries",
    icon: Building2,
  },
  {
    title: "Jobs",
    url: "/jobs",
    icon: Activity,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Webhooks",
    url: "/webhooks",
    icon: Webhook,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [processingCount, setProcessingCount] = useState(0)
  const { user, logout } = useAuth()
  const { setOpenMobile } = useSidebar()

  const settingsItems = [
    {
      title: "Sources",
      url: "/settings/sources",
      icon: Rss,
    },
    {
      title: "API Keys",
      url: "/settings/api-keys",
      icon: Key,
    },
    ...(user?.role === 'admin' ? [
      {
        title: "User Management",
        url: "/admin/users",
        icon: Users,
      }
    ] : [])
  ]

  useEffect(() => {
    const fetchProcessingCount = async () => {
      try {
        const stats = await apiClient.getJobStats()
        setProcessingCount(stats.processing || 0)
      } catch (error) {
        console.error("Failed to fetch job stats:", error)
        setProcessingCount(0)
      }
    }

    // Fetch immediately
    fetchProcessingCount()

    // Set up polling every 5 seconds
    const interval = setInterval(fetchProcessingCount, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">TrendScribe</span>
            <span className="truncate text-xs text-muted-foreground">AI Blog Dashboard</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url} onClick={() => setOpenMobile(false)}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.title === "Jobs" && processingCount > 0 && (
                    <SidebarMenuBadge>{processingCount}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url} onClick={() => setOpenMobile(false)}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-3 sm:p-4 space-y-3">
          <GenerationFormAccordion>
            <Button className="w-full min-h-[44px]" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Generate Post</span>
              <span className="sm:hidden">Generate</span>
            </Button>
          </GenerationFormAccordion>
          
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start h-auto p-2 min-h-[44px]">
                  <div className="flex items-center gap-2 sm:gap-3 w-full">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-left min-w-0 flex-1">
                      <span className="text-sm font-medium truncate">{user.username}</span>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                        {user.role === 'admin' && <Shield className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center" onClick={() => setOpenMobile(false)}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={logout}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}