"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/constants"
import { useState, useEffect } from "react"

interface PostFiltersProps {
  onSearchChange?: (search: string) => void
  onIndustryChange?: (industry: string) => void
  onSortChange?: (sort: string) => void
}

export function PostFilters({ onSearchChange, onIndustryChange, onSortChange }: PostFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all")
  const [selectedSort, setSelectedSort] = useState<string>("date-desc")

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange?.(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, onSearchChange])

  // Handle industry filter changes
  useEffect(() => {
    onIndustryChange?.(selectedIndustry === "all" ? "" : selectedIndustry)
  }, [selectedIndustry, onIndustryChange])

  // Handle sort changes
  useEffect(() => {
    onSortChange?.(selectedSort)
  }, [selectedSort, onSortChange])

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedIndustry("all")
    setSelectedSort("date-desc")
    // Immediately trigger callbacks to clear filters
    onSearchChange?.("")
    onIndustryChange?.("")
    onSortChange?.("date-desc")
  }

  const hasActiveFilters = searchTerm || selectedIndustry !== "all" || selectedSort !== "date-desc"

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts by title or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Industries" />
            </SelectTrigger>
            <SelectContent side="bottom" sideOffset={4}>
              <SelectItem value="all">All Industries</SelectItem>
              {INDUSTRIES.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {INDUSTRY_LABELS[industry]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSort} onValueChange={setSelectedSort}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="bottom" sideOffset={4}>
              <SelectItem value="date-desc">Newest First</SelectItem>
              <SelectItem value="date-asc">Oldest First</SelectItem>
              <SelectItem value="quality-desc">Quality High-Low</SelectItem>
              <SelectItem value="quality-asc">Quality Low-High</SelectItem>
              <SelectItem value="title-asc">Title A-Z</SelectItem>
              <SelectItem value="title-desc">Title Z-A</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleClearFilters}
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}