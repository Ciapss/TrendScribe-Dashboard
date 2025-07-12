"use client"

import React, { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, RotateCw, X } from "lucide-react"
import { JobStatusBadge } from "./job-status-badge"
import type { Job } from "@/types/job"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth/auth-provider"

interface JobListProps {
  jobs: Job[]
  onAction: (action: string, jobId: string) => void
  highlightJobId?: string | null
}

export function JobList({ jobs, onAction, highlightJobId }: JobListProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set())

  const toggleExpand = (jobId: string) => {
    const newExpanded = new Set(expandedJobs)
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId)
    } else {
      newExpanded.add(jobId)
    }
    setExpandedJobs(newExpanded)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive"
      case "high":
        return "destructive"
      case "normal":
        return "default"
      case "low":
        return "secondary"
      default:
        return "outline"
    }
  }

  const formatDuration = (start?: Date | string, end?: Date | string, status?: string) => {
    if (!start) return "—"
    
    // For queued jobs, don't show duration
    if (status === "queued") return "—"
    
    // Parse start time
    let startTime: number
    try {
      startTime = typeof start === 'string' ? new Date(start).getTime() : start.getTime()
      if (isNaN(startTime)) return "—"
    } catch {
      return "—"
    }
    
    // Parse end time or use current time for processing jobs
    let endTime: number
    if (end) {
      try {
        endTime = typeof end === 'string' ? new Date(end).getTime() : end.getTime()
        if (isNaN(endTime)) endTime = Date.now()
      } catch {
        endTime = Date.now()
      }
    } else if (status === "processing") {
      endTime = Date.now()
    } else {
      return "—"
    }
    
    const duration = endTime - startTime
    
    // Handle invalid durations
    if (duration < 0 || isNaN(duration)) return "—"
    
    const totalSeconds = Math.floor(duration / 1000)
    if (totalSeconds < 60) return `${totalSeconds}s`
    
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    
    if (minutes < 60) {
      return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
    }
    
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Topic/Industry</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <React.Fragment key={job.id}>
              <TableRow 
                className={`cursor-pointer ${
                  highlightJobId === job.id ? 'bg-yellow-50 border-yellow-200' : ''
                }`}
                onClick={() => toggleExpand(job.id)}
              >
                <TableCell>
                  <JobStatusBadge status={job.status} />
                </TableCell>
                <TableCell className="font-medium">
                  {job.job_type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {job.topic && (
                      <div className="text-sm font-medium truncate max-w-[200px]" title={job.topic}>
                        {job.topic}
                      </div>
                    )}
                    {job.industry && (
                      <Badge variant="outline" className="text-xs">
                        {job.industry}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getPriorityColor(job.priority) as "default" | "secondary" | "destructive" | "outline"}>
                    {job.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatDuration(job.started_at, job.completed_at, job.status)}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(job.created_at), "MMM d, HH:mm")}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        toggleExpand(job.id)
                      }}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {job.status === "failed" && job.retry_count < job.max_retries && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          if (!job.id) {
                            console.error("Job ID is undefined:", job)
                            return
                          }
                          onAction("retry", job.id)
                        }}>
                          <RotateCw className="mr-2 h-4 w-4" />
                          Retry
                        </DropdownMenuItem>
                      )}
                      {(job.status === "queued" || job.status === "processing") && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          if (!job.id) {
                            console.error("Job ID is undefined:", job)
                            return
                          }
                          onAction("cancel", job.id)
                        }}>
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              {expandedJobs.has(job.id) && (
                <TableRow>
                  <TableCell colSpan={7} className="bg-muted/50">
                    <div className="p-4 space-y-4">
                      {job.error && (
                        <div>
                          <h4 className="font-medium mb-2 text-red-600">Error</h4>
                          <pre className="text-sm bg-red-50 p-3 rounded-md overflow-x-auto">
                            {job.error}
                          </pre>
                        </div>
                      )}
                      
                      {isAdmin && (
                        <div>
                          <h4 className="font-medium mb-2">Cost</h4>
                          <p className="text-sm">
                            {job.cost != null && typeof job.cost === 'number' 
                              ? `$${job.cost.toFixed(2)}` 
                              : '—'}
                          </p>
                        </div>
                      )}
                      
                      {job.retry_count > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Retry Information</h4>
                          <p className="text-sm">
                            Attempt {job.retry_count + 1} of {job.max_retries + 1}
                          </p>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="font-medium mb-2">Timestamps</h4>
                        <div className="text-sm space-y-1">
                          <div>Queued: {format(new Date(job.queued_at), "PPpp")}</div>
                          {job.started_at && (
                            <div>Started: {format(new Date(job.started_at), "PPpp")}</div>
                          )}
                          {job.completed_at && (
                            <div>Completed: {format(new Date(job.completed_at), "PPpp")}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
      
      {jobs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No jobs found</p>
        </div>
      )}
    </div>
  )
}