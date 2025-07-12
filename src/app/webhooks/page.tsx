"use client"

import { WebhooksTable } from "@/components/webhooks/webhooks-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { RouteGuard } from "@/components/auth/route-guard"

export default function WebhooksPage() {
  return (
    <RouteGuard requireAuth={true}>
      <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Webhooks</h2>
          <p className="text-muted-foreground">
            Manage automated delivery of your blog posts to external systems.
          </p>
        </div>
        <Button asChild>
          <Link href="/webhooks/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Webhook
          </Link>
        </Button>
      </div>
      
      <WebhooksTable />
      </div>
    </RouteGuard>
  )
}