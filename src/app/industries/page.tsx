"use client"

import { useState } from "react"
import { RouteGuard } from "@/components/auth/route-guard"
import { IndustryList } from "@/components/industries/industry-list"
import { IndustryStats } from "@/components/industries/industry-stats"
import { IndustryCreateForm } from "@/components/industries/industry-create-form"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export default function IndustriesPage() {
  const isMobile = useIsMobile()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleIndustryCreated = () => {
    setCreateDialogOpen(false)
    setRefreshTrigger(prev => prev + 1)
  }

  const handleIndustryUpdated = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <RouteGuard requireAuth={true}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Industries</h2>
            <p className="text-muted-foreground">
              Manage built-in and custom industries for content generation.
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Industry
              </Button>
            </DialogTrigger>
            <DialogContent className={cn(
              "max-w-2xl p-0",
              isMobile && "max-w-full h-[100dvh] w-screen rounded-none m-0 border-0"
            )}>
              <DialogHeader className={cn("p-4 sm:p-6 border-b", isMobile && "sticky top-0 bg-background z-10")}>
                <DialogTitle>Create Custom Industry</DialogTitle>
                <DialogDescription>
                  Define a new industry with specific keywords, categories, and sources.
                </DialogDescription>
              </DialogHeader>
              <div className={cn(
                "overflow-y-auto p-4 sm:p-6",
                isMobile ? "h-[calc(100dvh-120px)]" : "max-h-[70vh]"
              )}>
                <IndustryCreateForm 
                  onSuccess={handleIndustryCreated}
                  onCancel={() => setCreateDialogOpen(false)}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <IndustryStats key={`stats-${refreshTrigger}`} />
        
        <IndustryList 
          key={`list-${refreshTrigger}`}
          onIndustryUpdated={handleIndustryUpdated}
        />
      </div>
    </RouteGuard>
  )
}