import { RouteGuard } from "@/components/auth/route-guard"

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RouteGuard requireAuth={true}>
      {children}
    </RouteGuard>
  )
}