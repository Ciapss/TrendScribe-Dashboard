import { UserManagement } from "@/components/admin/user-management"
import { RouteGuard } from "@/components/auth/route-guard"

export default function UserManagementPage() {
  return (
    <RouteGuard requireAuth={true} requireAdmin={true}>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions.
          </p>
        </div>
        
        <UserManagement />
      </div>
    </RouteGuard>
  )
}

export const metadata = {
  title: 'User Management - TrendScribe',
  description: 'Manage user accounts and permissions',
}