"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Loader2, TrendingUp, ArrowRight, ArrowLeft, Zap, Search, Edit, ChevronDown, ChevronUp } from "lucide-react"
import { LANGUAGES, LANGUAGE_LABELS, BLOG_TYPES, BLOG_TYPE_LABELS } from "@/lib/constants"
import { apiClient } from "@/lib/api-client"
import { TrendSelector } from "@/components/trends/trend-selector"
import type { Trend, TrendFilters, Industry } from "@/types"
import type { Job } from "@/types/job"
import { SourceSelector } from "@/components/sources/source-selector"
import { useJobPolling } from "@/hooks/use-job-polling"
import { DiscoveryJobStorage } from "@/utils/discovery-job-storage"
import { ResearchCacheSettingsComponent } from "@/components/generation/research-cache-settings"
import { estimateGenerationCost, getTimeEstimate } from "@/utils/cost-estimator"
import { loadResearchPreferences, saveResearchPreferences } from "@/utils/research-preferences"
import type { ResearchCacheSettings, CostEstimate } from "@/types"

const formSchema = z.object({
  generationType: z.enum(["trending", "trending_select", "custom"], {
    required_error: "Please select how you want to generate the post",
  }),
  industry: z.string().optional(),
  selectedTrendIds: z.array(z.string()).optional(),
  customTopic: z.string().optional(),
  language: z.string().min(1, "Please select a language"),
  blogType: z.string().min(1, "Please select a blog post type"),
  researchDepth: z.enum(["moderate", "deep"]).default("moderate"),
  
  // Research Caching Parameters
  useCachedResearch: z.boolean().default(true),
  maxResearchAgeHours: z.number().min(1).max(168).default(24),
  forceFreshResearch: z.boolean().default(false),
}).refine((data) => {
  // Industry required only for trending topics
  if (data.generationType === "trending" && (!data.industry || data.industry.trim() === "")) {
    return false;
  }
  // Selected trends required for interactive trending
  if (data.generationType === "trending_select" && (!data.selectedTrendIds || data.selectedTrendIds.length === 0)) {
    return false;
  }
  // Custom topic required only for custom generation
  if (data.generationType === "custom" && (!data.customTopic || data.customTopic.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Please fill in all required fields",
  path: ["industry", "customTopic", "selectedTrendIds"],
})

type FormData = z.infer<typeof formSchema>

interface GenerationFormProps {
  children?: React.ReactNode
}

export function GenerationForm({ children }: GenerationFormProps) {
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [trends, setTrends] = useState<Trend[]>([])
  const [trendsLoading, setTrendsLoading] = useState(false)
  const [trendsError, setTrendsError] = useState<string | null>(null)
  const [discoveryJobId, setDiscoveryJobId] = useState<string | null>(null)
  const [usingSyncMode, setUsingSyncMode] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [trendFilters, setTrendFilters] = useState<TrendFilters>({
    sortBy: "trend_score",
    sortOrder: "desc",
  })
  const [industries, setIndustries] = useState<Industry[]>([])
  const [industriesLoading, setIndustriesLoading] = useState(false)
  const [showAdvancedSources, setShowAdvancedSources] = useState(false)
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null)
  const router = useRouter()

  const totalSteps = 4

  // Job polling for trend discovery
  const { 
    job: discoveryJob, 
    error: discoveryJobError,
    cancelJob: cancelDiscoveryJob,
    isActive: isDiscoveryActive 
  } = useJobPolling({
    jobId: discoveryJobId,
    enabled: !!discoveryJobId,
    onSuccess: (job: Job) => {
      console.log('Discovery job completed:', job)
      // Remove from persistent storage
      if (discoveryJobId) {
        DiscoveryJobStorage.updateJobStatus(discoveryJobId, 'completed')
      }
      // Reload trends from the database after discovery
      loadTrends(false)
      setDiscoveryJobId(null)
    },
    onError: (error: Error) => {
      console.error('Discovery job failed:', error)
      // Remove from persistent storage
      if (discoveryJobId) {
        DiscoveryJobStorage.updateJobStatus(discoveryJobId, 'failed')
      }
      setTrendsError(error.message)
      setDiscoveryJobId(null)
    }
  })

  // Recovery function to check for existing jobs when modal opens
  const recoverActiveJobs = useCallback(() => {
    if (!open || !trendFilters.industry) return

    const existingJob = DiscoveryJobStorage.getActiveJobForIndustry(trendFilters.industry)
    if (existingJob && !discoveryJobId) {
      console.log('🔄 Recovering active discovery job:', existingJob)
      setDiscoveryJobId(existingJob.jobId)
    }
  }, [open, trendFilters.industry, discoveryJobId])

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      generationType: "trending",
      industry: "",
      selectedTrendIds: [],
      customTopic: "",
      language: "en",
      blogType: "informative",
      researchDepth: "moderate",
      ...loadResearchPreferences(),
    },
  })

  // Load available industries
  const loadIndustries = async () => {
    setIndustriesLoading(true)
    try {
      const data = await apiClient.getIndustries()
      setIndustries(data)
    } catch (error) {
      console.error("Failed to load industries:", error)
    } finally {
      setIndustriesLoading(false)
    }
  }

  // Load trends when trending_select mode is enabled or when Load Topics is clicked
  const loadTrends = useCallback(async (forceDiscover = false) => {
    if (form.watch("generationType") !== "trending_select") return
    
    // Don't load trends if no industry is selected (unless forcing discovery)
    if (!trendFilters.industry && !forceDiscover) {
      setTrends([])
      setTotalCount(0)
      setTotalPages(0)
      return
    }
    
    setTrendsLoading(true)
    setTrendsError(null)
    
    try {
      if (forceDiscover && trendFilters.industry) {
        // Check for existing active job first
        const existingJob = DiscoveryJobStorage.getActiveJobForIndustry(trendFilters.industry)
        if (existingJob) {
          console.log('⚠️ Active discovery job already exists for', trendFilters.industry, ':', existingJob.jobId)
          setDiscoveryJobId(existingJob.jobId)
          setTrendsLoading(false)
          return
        }

        // Use async discovery to create a job for trend discovery
        try {
          const response = await apiClient.discoverTrendsAsync({
            industry: trendFilters.industry,
            limit: 200  // Get up to 200 sources
          })
          
          console.log('✅ Discovery job created successfully:', response)
          if (response.job_id) {
            // Store in persistent storage
            DiscoveryJobStorage.addJob(response.job_id, trendFilters.industry)
            setDiscoveryJobId(response.job_id)
            setTrendsLoading(false) // Stop loading since we're now tracking via job
            console.log('📋 Job ID set for polling:', response.job_id)
          } else {
            console.error('❌ No job_id returned from async discovery:', response)
            throw new Error('No job_id returned from async discovery')
          }
          
        } catch (asyncError) {
          // Fallback to synchronous discovery if async is not supported
          console.log('⚠️ Async discovery not supported, falling back to sync:', asyncError)
          console.log('🔄 Using synchronous discovery instead...')
          setUsingSyncMode(true)
          
          const response = await apiClient.discoverTrends({
            industry: trendFilters.industry,
            limit: 200
          })
          
          console.log('✅ Synchronous discovery completed:', response)
          setTrends(response.trends as Trend[])
          setTotalCount(response.discovered_count)
          setTotalPages(1) // Discovery returns all results in one page
          setCurrentPage(1)
          setUsingSyncMode(false)
        }
      } else {
        // Use existing trends from database with filtering for today and selected industry
        const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
        
        const response = await apiClient.getTrends({
          page: currentPage,
          limit: 30,
          industry: trendFilters.industry, // Only show trends for selected industry
          ...trendFilters,
          // Add date filter for today - this would need to be supported by the API
          discoveredAfter: today,
        })
        
        setTrends(response.trends as Trend[])
        setTotalCount(response.pagination.total)
        setTotalPages(response.pagination.pages)
      }
    } catch (error) {
      setTrendsError(error instanceof Error ? error.message : "Failed to load trends")
    } finally {
      if (!forceDiscover || !trendFilters.industry) {
        setTrendsLoading(false)
      }
    }
  }, [form, trendFilters, currentPage])

  // Load industries on component mount
  useEffect(() => {
    loadIndustries()
  }, [])

  // Recover active jobs when modal opens or industry changes
  useEffect(() => {
    recoverActiveJobs()
  }, [recoverActiveJobs])

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Don't remove jobs from storage on unmount - they should persist
      // Only clear local state
      if (discoveryJobId) {
        console.log('🧹 Component unmounting, keeping job in storage:', discoveryJobId)
      }
    }
  }, [discoveryJobId])

  useEffect(() => {
    const generationType = form.watch("generationType")
    if (generationType === "trending_select") {
      loadTrends()
    }
  }, [form, loadTrends, currentPage, trendFilters])

  // Load existing trends when industry changes in trendFilters
  useEffect(() => {
    const generationType = form.watch("generationType")
    if (generationType === "trending_select") {
      if (trendFilters.industry) {
        // Load existing trends for today and this industry
        loadTrends(false) // false = don't force discovery, load existing
      } else {
        // Clear trends when no industry is selected
        setTrends([])
        setTotalCount(0)
        setTotalPages(0)
        setCurrentPage(1)
      }
    }
  }, [form, loadTrends, trendFilters.industry])

  // Update cost estimate when research settings change
  const updateCostEstimate = useCallback(() => {
    const formData = form.getValues()
    const cacheSettings: ResearchCacheSettings = {
      use_cached_research: formData.useCachedResearch,
      max_research_age_hours: formData.maxResearchAgeHours,
      force_fresh_research: formData.forceFreshResearch,
    }
    
    const topicType = formData.generationType === "custom" ? "custom" : "trending"
    const estimate = estimateGenerationCost(formData.researchDepth, cacheSettings, topicType)
    setCostEstimate(estimate)
  }, [form])

  // Update cost estimate when relevant form fields change
  useEffect(() => {
    updateCostEstimate()
  }, [
    form.watch("researchDepth"),
    form.watch("useCachedResearch"), 
    form.watch("maxResearchAgeHours"),
    form.watch("forceFreshResearch"),
    form.watch("generationType"),
    updateCostEstimate
  ])

  const onSubmit = async (data: FormData) => {
    setIsGenerating(true)
    try {
      // Log form data for debugging
      console.log('Form data:', data)
      
      // Handle trend selection flow
      if (data.generationType === "trending_select" && data.selectedTrendIds && data.selectedTrendIds.length > 0) {
        // Find the selected trend to get its industry
        const selectedTrend = trends.find(t => t.id === data.selectedTrendIds![0])
        if (!selectedTrend) {
          throw new Error('Selected trend not found')
        }
        
        // Select the trends (backend will automatically replace any previous selections)
        await apiClient.selectTrends({ trend_ids: data.selectedTrendIds })
        
        // Then generate posts from selected trends
        const apiParams = {
          language: data.language,
          blogType: data.blogType,
          researchDepth: data.researchDepth,
          selectedTrendIds: data.selectedTrendIds,
          industry: selectedTrend.industry, // Pass the industry from the selected trend
          
          // Research caching parameters
          useCachedResearch: data.useCachedResearch,
          maxResearchAgeHours: data.maxResearchAgeHours,
          forceFreshResearch: data.forceFreshResearch,
        }
        
        const response = await apiClient.generateFromSelectedTrends(apiParams)
        console.log('API Response:', response)
        
        if (!('jobId' in response)) {
          throw new Error('No job ID returned from API')
        }
        
        router.push(`/jobs?highlight=${response.jobId}`)
      } else {
        // Original flow for trending and custom generation
        const apiParams = {
          language: data.language,
          blogType: data.blogType,
          researchDepth: data.researchDepth,
          ...(data.generationType === "trending" && data.industry && {
            industry: data.industry,
          }),
          ...(data.generationType === "custom" && data.customTopic && {
            topic: data.customTopic.trim(),
          }),
          
          // Research caching parameters
          useCachedResearch: data.useCachedResearch,
          maxResearchAgeHours: data.maxResearchAgeHours,
          forceFreshResearch: data.forceFreshResearch,
          
          options: {
            generationType: data.generationType,
          },
        }

        console.log('API params:', apiParams)

        const response = await apiClient.generatePost(apiParams)
        console.log('API Response:', response)
        
        if (!('jobId' in response)) {
          throw new Error('No job ID returned from API')
        }
        
        router.push(`/jobs?highlight=${response.jobId}`)
      }
      
      setOpen(false)
      setIsGenerating(false)
    } catch (error) {
      console.error('Failed to start generation:', error)
      setIsGenerating(false)
      
      // Show error message to user
      const errorMessage = error instanceof Error ? error.message : 'Failed to start generation'
      alert(`Error: ${errorMessage}`)
    }
  }



  // Reset step to 1 when modal opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStep(1)
    }
  }, [open])

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps))
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1: return "Choose Generation Method"
      case 2: return "Configure Content"
      case 3: return "Settings & Options"
      case 4: return "Review & Generate"
      default: return "Generate New Blog Post"
    }
  }

  const canProceedToNextStep = () => {
    const generationType = form.watch("generationType")
    const industry = form.watch("industry")
    const customTopic = form.watch("customTopic")
    const selectedTrendIds = form.watch("selectedTrendIds")

    switch (currentStep) {
      case 1:
        return !!generationType
      case 2:
        if (generationType === "trending") {
          return !!industry
        }
        if (generationType === "custom") {
          return !!customTopic?.trim()
        }
        if (generationType === "trending_select") {
          return !!selectedTrendIds?.length
        }
        return false
      case 3:
        const language = form.watch("language")
        const blogType = form.watch("blogType")
        const useCachedResearch = form.watch("useCachedResearch")
        const maxResearchAgeHours = form.watch("maxResearchAgeHours")
        const forceFreshResearch = form.watch("forceFreshResearch")
        
        // Validate cache settings
        if (useCachedResearch && !forceFreshResearch) {
          if (maxResearchAgeHours < 1 || maxResearchAgeHours > 168) {
            return false
          }
        }
        
        return !!language && !!blogType
      default:
        return true
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">How would you like to generate your post?</h3>
              <p className="text-sm text-muted-foreground">
                Choose the method that best fits your content creation needs
              </p>
            </div>
            
            <FormField
              control={form.control}
              name="generationType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="space-y-3 sm:space-y-4">
                      <Card 
                        className={`cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${
                          field.value === "trending" ? "ring-2 ring-primary bg-primary/5" : ""
                        }`}
                        onClick={() => field.onChange("trending")}
                      >
                        <CardHeader className="p-3 sm:p-4">
                          <div className="flex items-start space-x-2 sm:space-x-3">
                            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-sm sm:text-base leading-tight">Auto-generate from trending topics</CardTitle>
                              <CardDescription className="text-xs sm:text-sm mt-0.5 sm:mt-1">
                                AI automatically discovers and selects the best trending topic in your industry
                              </CardDescription>
                            </div>
                            <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex-shrink-0 ${
                              field.value === "trending" ? "bg-primary border-primary" : "border-border"
                            }`} />
                          </div>
                        </CardHeader>
                      </Card>

                      <Card 
                        className={`cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${
                          field.value === "trending_select" ? "ring-2 ring-primary bg-primary/5" : ""
                        }`}
                        onClick={() => field.onChange("trending_select")}
                      >
                        <CardHeader className="p-3 sm:p-4">
                          <div className="flex items-start space-x-2 sm:space-x-3">
                            <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
                              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-sm sm:text-base leading-tight">Choose from trending topics</CardTitle>
                              <CardDescription className="text-xs sm:text-sm mt-0.5 sm:mt-1">
                                Browse and select specific trending topics that interest you
                              </CardDescription>
                            </div>
                            <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex-shrink-0 ${
                              field.value === "trending_select" ? "bg-primary border-primary" : "border-border"
                            }`} />
                          </div>
                        </CardHeader>
                      </Card>

                      <Card 
                        className={`cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${
                          field.value === "custom" ? "ring-2 ring-primary bg-primary/5" : ""
                        }`}
                        onClick={() => field.onChange("custom")}
                      >
                        <CardHeader className="p-3 sm:p-4">
                          <div className="flex items-start space-x-2 sm:space-x-3">
                            <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
                              <Edit className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-sm sm:text-base leading-tight">Generate from custom topic</CardTitle>
                              <CardDescription className="text-xs sm:text-sm mt-0.5 sm:mt-1">
                                Provide your own specific topic or subject to write about
                              </CardDescription>
                            </div>
                            <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex-shrink-0 ${
                              field.value === "custom" ? "bg-primary border-primary" : "border-border"
                            }`} />
                          </div>
                        </CardHeader>
                      </Card>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      case 2:
        return (
          <div className="space-y-6 flex flex-col h-full">
            {/* Industry Selection for Trending */}
            {form.watch("generationType") === "trending" && (
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Select Industry</FormLabel>
                    <FormDescription>
                      Choose the industry to discover trending topics from
                    </FormDescription>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 sm:h-12">
                          <SelectValue placeholder="Select an industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {industriesLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="ml-2 text-sm">Loading industries...</span>
                          </div>
                        ) : (
                          industries.map((industry) => (
                            <SelectItem key={industry.id} value={industry.id}>
                              {industry.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Custom Topic Input */}
            {form.watch("generationType") === "custom" && (
              <FormField
                control={form.control}
                name="customTopic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Custom Topic</FormLabel>
                    <FormDescription>
                      Be specific about the topic, angle, or perspective you want to explore
                    </FormDescription>
                    <FormControl>
                      <Textarea
                        placeholder="Enter the specific topic you'd like to write about..."
                        className="min-h-[100px] sm:min-h-[120px] text-sm sm:text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Trend Selection */}
            {form.watch("generationType") === "trending_select" && (
              <div className="space-y-4 flex-1 min-h-0">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <h3 className="text-base font-semibold">Choose Trending Topics</h3>
                  {isDiscoveryActive && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Discovering...
                    </div>
                  )}
                </div>

                {/* Discovery Job Status */}
                {discoveryJob && isDiscoveryActive && (
                  <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                          Discovering trending topics for {trendFilters.industry}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (discoveryJobId) {
                            DiscoveryJobStorage.updateJobStatus(discoveryJobId, 'cancelled')
                          }
                          cancelDiscoveryJob()
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex-1 min-h-0 overflow-y-auto">
                  <TrendSelector
                    trends={trends}
                    selectedTrendIds={form.watch("selectedTrendIds") || []}
                    onTrendSelection={(trendIds) => form.setValue("selectedTrendIds", trendIds)}
                    loading={trendsLoading || isDiscoveryActive || usingSyncMode}
                    error={(trendsError || discoveryJobError?.message) || undefined}
                    totalCount={totalCount}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    filters={trendFilters}
                    onFiltersChange={setTrendFilters}
                    onLoadTopics={() => loadTrends(true)}
                    disabled={isDiscoveryActive || usingSyncMode}
                  />
                </div>
                
                {form.formState.errors.selectedTrendIds && (
                  <p className="text-sm text-destructive">
                    Please select at least one trending topic to continue
                  </p>
                )}
              </div>
            )}

          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Language Selection */}
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Language</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 sm:h-12">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LANGUAGES.map((language) => (
                          <SelectItem key={language} value={language}>
                            {LANGUAGE_LABELS[language]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Blog Type Selection */}
              <FormField
                control={form.control}
                name="blogType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Blog Post Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 sm:h-12">
                          <SelectValue placeholder="Select post type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BLOG_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {BLOG_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Research Depth Selection */}
            <FormField
              control={form.control}
              name="researchDepth"
              render={({ field }) => (
                <FormItem>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-base">Research Depth</CardTitle>
                          <CardDescription>
                            Choose how comprehensive the research should be
                          </CardDescription>
                        </div>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="moderate">Moderate Research</SelectItem>
                            <SelectItem value="deep">Deep Research</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                  </Card>
                </FormItem>
              )}
            />

            {/* Research Cache Settings */}
            <ResearchCacheSettingsComponent
              settings={{
                use_cached_research: form.watch("useCachedResearch"),
                max_research_age_hours: form.watch("maxResearchAgeHours"),
                force_fresh_research: form.watch("forceFreshResearch"),
              }}
              onChange={(settings) => {
                form.setValue("useCachedResearch", settings.use_cached_research)
                form.setValue("maxResearchAgeHours", settings.max_research_age_hours)
                form.setValue("forceFreshResearch", settings.force_fresh_research)
                
                // Save preferences to localStorage
                saveResearchPreferences(settings)
              }}
              costEstimate={costEstimate || undefined}
            />

            {/* Advanced Source Settings */}
            <div className="space-y-4">
              <Button 
                variant="ghost" 
                className="w-full justify-between"
                onClick={() => setShowAdvancedSources(!showAdvancedSources)}
                type="button"
              >
                <span>Advanced Source Settings</span>
                {showAdvancedSources ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              {showAdvancedSources && (
                <Card>
                  <CardHeader>
                    <div className="space-y-2">
                      <CardTitle className="text-base">Data Sources</CardTitle>
                      <CardDescription>
                        Select which sources to use for discovering trends and researching content
                      </CardDescription>
                      <SourceSelector 
                        showWeights={false}
                        compact={true}
                      />
                    </div>
                  </CardHeader>
                </Card>
              )}
            </div>

            {/* Generation Time Estimate */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Estimated Generation Time</CardTitle>
                    <CardDescription>
                      Time may vary based on topic complexity and system load
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {(() => {
                      const cacheSettings: ResearchCacheSettings = {
                        use_cached_research: form.watch("useCachedResearch"),
                        max_research_age_hours: form.watch("maxResearchAgeHours"),
                        force_fresh_research: form.watch("forceFreshResearch"),
                      }
                      const timeEstimate = getTimeEstimate(form.watch("researchDepth"), cacheSettings)
                      return timeEstimate.description
                    })()}
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          </div>
        )

      case 4:
        const generationType = form.watch("generationType")
        const industry = form.watch("industry")
        const customTopic = form.watch("customTopic")
        const selectedTrendIds = form.watch("selectedTrendIds")
        const language = form.watch("language")
        const blogType = form.watch("blogType")
        const researchDepth = form.watch("researchDepth")
        const useCachedResearch = form.watch("useCachedResearch")
        const maxResearchAgeHours = form.watch("maxResearchAgeHours")
        const forceFreshResearch = form.watch("forceFreshResearch")

        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Ready to Generate</h3>
              <p className="text-sm text-muted-foreground">
                Review your settings before starting the generation process
              </p>
            </div>

            <div className="space-y-4">
              {/* Generation Method */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Generation Method</CardTitle>
                  <div className="flex items-center space-x-2">
                    {generationType === "trending" && (
                      <>
                        <Zap className="h-4 w-4 text-blue-600" />
                        <span>Auto-generate from trending topics</span>
                      </>
                    )}
                    {generationType === "trending_select" && (
                      <>
                        <Search className="h-4 w-4 text-green-600" />
                        <span>Choose from trending topics</span>
                      </>
                    )}
                    {generationType === "custom" && (
                      <>
                        <Edit className="h-4 w-4 text-purple-600" />
                        <span>Custom topic</span>
                      </>
                    )}
                  </div>
                </CardHeader>
              </Card>

              {/* Content Source */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Content Source</CardTitle>
                  <div>
                    {generationType === "trending" && industry && (
                      <span>Industry: {industries.find(i => i.id === industry)?.name}</span>
                    )}
                    {generationType === "custom" && customTopic && (
                      <span className="line-clamp-2">{customTopic}</span>
                    )}
                    {generationType === "trending_select" && selectedTrendIds && (
                      <span>{selectedTrendIds.length} trending topic(s) selected</span>
                    )}
                  </div>
                </CardHeader>
              </Card>

              {/* Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Settings</CardTitle>
                  <div className="space-y-1 text-sm">
                    <div>Language: {LANGUAGE_LABELS[language]}</div>
                    <div>Type: {BLOG_TYPE_LABELS[blogType]}</div>
                    <div>Research Depth: {researchDepth === "deep" ? "Deep Research" : "Moderate Research"}</div>
                    <div>Cache Settings: {forceFreshResearch ? "Fresh Only" : useCachedResearch ? `Cache enabled (${maxResearchAgeHours}h)` : "Cache disabled"}</div>
                  </div>
                </CardHeader>
              </Card>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Generate Post
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] sm:max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 sm:p-6 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg sm:text-xl truncate">{getStepTitle(currentStep)}</DialogTitle>
              <DialogDescription className="mt-1 text-sm">
                Step {currentStep} of {totalSteps}
              </DialogDescription>
            </div>
            <div className="flex space-x-1 ml-4">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${
                    i + 1 <= currentStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              {renderStepContent()}
            </div>

            {/* Fixed Footer with Navigation */}
            <div className="border-t bg-background p-3 sm:p-6 flex gap-2 sm:gap-3 justify-between shrink-0">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  size="sm"
                  className="sm:h-10"
                >
                  Cancel
                </Button>
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    size="sm"
                    className="sm:h-10"
                  >
                    <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Back</span>
                  </Button>
                )}
              </div>
              
              <div>
                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceedToNextStep()}
                    size="sm"
                    className="sm:h-10"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden">Next</span>
                    <ArrowRight className="ml-1 sm:ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={isGenerating || !canProceedToNextStep()}
                    size="sm"
                    className="sm:h-10"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-1 sm:mr-2 h-4 w-4 animate-spin" />
                        <span className="hidden sm:inline">Starting Generation...</span>
                        <span className="sm:hidden">Starting...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="mr-1 sm:mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Generate Post</span>
                        <span className="sm:hidden">Generate</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}