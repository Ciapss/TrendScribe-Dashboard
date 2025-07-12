"use client"

import { PostsTable } from "@/components/posts/posts-table"
import { PostFilters } from "@/components/posts/post-filters"
import { GenerationForm } from "@/components/generation/generation-form"
import { RouteGuard } from "@/components/auth/route-guard"
import { useState } from "react"

export default function PostsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [industryFilter, setIndustryFilter] = useState("")
  const [sortBy, setSortBy] = useState("")

  return (
    <RouteGuard requireAuth={true}>
      <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Posts</h2>
          <p className="text-muted-foreground">
            Manage and view all your generated blog posts.
          </p>
        </div>
        <GenerationForm />
      </div>
      
      <PostFilters 
        onSearchChange={setSearchQuery}
        onIndustryChange={setIndustryFilter}
        onSortChange={setSortBy}
      />
      <PostsTable 
        searchQuery={searchQuery}
        industryFilter={industryFilter}
        sortBy={sortBy}
      />
      </div>
    </RouteGuard>
  )
}