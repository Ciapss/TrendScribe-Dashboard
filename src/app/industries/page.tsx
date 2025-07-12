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

export default function IndustriesPage() {
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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Custom Industry</DialogTitle>
                <DialogDescription>
                  Define a new industry with specific keywords, categories, and sources.
                </DialogDescription>
              </DialogHeader>
              <IndustryCreateForm 
                onSuccess={handleIndustryCreated}
                onCancel={() => setCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        <IndustryStats key={refreshTrigger} />
        
        <IndustryList 
          key={refreshTrigger}
          onIndustryUpdated={handleIndustryUpdated}
        />
      </div>
    </RouteGuard>
  )
}