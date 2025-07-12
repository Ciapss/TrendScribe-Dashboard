"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Ban,
} from "lucide-react"

interface JobStatusBadgeProps {
  status: string
  className?: string
}

export function JobStatusBadge({ status, className }: JobStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "completed":
        return {
          label: "Completed",
          variant: "default" as const,
          icon: CheckCircle2,
          className: "bg-green-500/10 text-green-700 hover:bg-green-500/20",
        }
      case "failed":
        return {
          label: "Failed",
          variant: "destructive" as const,
          icon: XCircle,
          className: "bg-red-500/10 text-red-700 hover:bg-red-500/20",
        }
      case "processing":
        return {
          label: "Processing",
          variant: "default" as const,
          icon: Loader2,
          className: "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20",
          iconClassName: "animate-spin",
        }
      case "queued":
        return {
          label: "Queued",
          variant: "secondary" as const,
          icon: Clock,
          className: "bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20",
        }
      case "cancelled":
        return {
          label: "Cancelled",
          variant: "outline" as const,
          icon: Ban,
          className: "bg-gray-500/10 text-gray-700 hover:bg-gray-500/20",
        }
      default:
        return {
          label: status,
          variant: "outline" as const,
          icon: null,
          className: "",
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {Icon && (
        <Icon className={cn("mr-1 h-3 w-3", config.iconClassName)} />
      )}
      {config.label}
    </Badge>
  )
}