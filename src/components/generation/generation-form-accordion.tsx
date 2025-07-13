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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Plus, 
  Loader2, 
  TrendingUp, 
  Zap, 
  Search, 
  Edit, 
  ChevronDown, 
  ChevronUp,
  Check,
  Sparkles,
  ArrowLeft,
  ArrowRight
} from "lucide-react"
import { LANGUAGES, LANGUAGE_LABELS, BLOG_TYPES, BLOG_TYPE_LABELS } from "@/lib/constants"
import { apiClient } from "@/lib/api-client"
import { TrendSelector } from "@/components/trends/trend-selector"
import type { Trend, TrendFilters, Industry } from "@/types"
import type { Job } from "@/types/job"
import { SourceSelector } from "@/components/sources/source-selector"
import { useJobPolling } from "@/hooks/use-job-polling"
import { DiscoveryJobStorage } from "@/utils/discovery-job-storage"
import { ResearchCacheSettingsComponent } from "@/components/generation/research-cache-settings"
import { estimateGenerationCost } from "@/utils/cost-estimator"
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

export function GenerationFormAccordion({ children }: GenerationFormProps) {
  const [open, setOpen] = useState(false)
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
  const [openAccordionItem, setOpenAccordionItem] = useState<string>("method")
  const [currentStep, setCurrentStep] = useState(0)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  // Step definitions
  const steps = ["method", "content", "settings"] as const
  const router = useRouter()

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
      // Clear discovery job first
      setDiscoveryJobId(null)
      // Force reload trends from the database after discovery with a slight delay
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1)
        loadTrends(false)
      }, 500)
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
  }, [form, loadTrends, currentPage, trendFilters, refreshTrigger])

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
  }, [form, loadTrends, trendFilters.industry, refreshTrigger])

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

  // Check if a section is complete
  const isSectionComplete = (section: string) => {
    const generationType = form.watch("generationType")
    const industry = form.watch("industry")
    const customTopic = form.watch("customTopic")
    const selectedTrendIds = form.watch("selectedTrendIds")
    const language = form.watch("language")
    const blogType = form.watch("blogType")

    switch (section) {
      case "method":
        return !!generationType
      case "content":
        if (generationType === "trending") return !!industry
        if (generationType === "custom") return !!customTopic?.trim()
        if (generationType === "trending_select") return !!selectedTrendIds?.length
        return false
      case "settings":
        return !!language && !!blogType
      default:
        return false
    }
  }

  // Navigation functions with smooth transitions
  const handleNext = () => {
    if (currentStep < steps.length - 1 && canProceedToNextStep()) {
      const nextStep = currentStep + 1
      
      // First close current accordion (allow time for close animation)
      setOpenAccordionItem("")
      
      // Then open next accordion after close animation completes
      setTimeout(() => {
        setCurrentStep(nextStep)
        setOpenAccordionItem(steps[nextStep])
      }, 300) // Match accordion animation duration
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1
      
      // First close current accordion (allow time for close animation)
      setOpenAccordionItem("")
      
      // Then open previous accordion after close animation completes
      setTimeout(() => {
        setCurrentStep(prevStep)
        setOpenAccordionItem(steps[prevStep])
      }, 300) // Match accordion animation duration
    }
  }

  // Prevent manual accordion interaction - only allow button navigation
  const handleAccordionChange = () => {
    // Don't allow manual accordion changes - navigation is button-only
    // The accordion state is controlled programmatically via Next/Back buttons
  }

  // Check if current step can proceed to next
  const canProceedToNextStep = () => {
    const currentStepName = steps[currentStep]
    return isSectionComplete(currentStepName)
  }

  // Reset to first step when modal opens
  useEffect(() => {
    if (open) {
      setCurrentStep(0)
      setOpenAccordionItem("method")
    }
  }, [open])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return
      
      if (event.key === 'Enter' && currentStep < steps.length - 1 && canProceedToNextStep()) {
        event.preventDefault()
        handleNext()
      } else if (event.key === 'Escape' && currentStep === 0) {
        event.preventDefault()
        setOpen(false)
      } else if (event.key === 'Escape' && currentStep > 0) {
        event.preventDefault()
        handleBack()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, currentStep, canProceedToNextStep])

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
      <DialogContent className="w-screen max-w-none h-full max-h-screen sm:max-w-[1200px] sm:max-h-[90vh] sm:h-auto overflow-y-auto p-4 sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <DialogTitle className="text-lg sm:text-xl">Generate New Blog Post</DialogTitle>
              <DialogDescription className="text-sm">
                Configure your blog post generation settings
              </DialogDescription>
            </div>

            <Accordion 
              type="single" 
              value={openAccordionItem}
              onValueChange={handleAccordionChange}
              className="w-full transition-all duration-300 ease-in-out"
              collapsible
            >
                {/* Step 1: Generation Method */}
                <AccordionItem value="method">
                  <AccordionTrigger 
                    className="px-0 pointer-events-none hover:no-underline [&>svg]:hidden"
                  >
                    <div className="flex items-center gap-2 text-left">
                      {isSectionComplete("method") ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                      )}
                      <span className="font-medium">Generation Method</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="generationType"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="space-y-3">
                                <Card 
                                  className={`cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${
                                    field.value === "trending" ? "bg-primary/10 border-primary shadow-sm" : "hover:bg-muted/50"
                                  }`}
                                  onClick={() => field.onChange("trending")}
                                >
                                  <CardHeader className="p-3 sm:p-4">
                                    <div className="flex items-start space-x-2 sm:space-x-3">
                                      <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 transition-colors ${
                                        field.value === "trending" ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-600"
                                      }`}>
                                        <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <CardTitle className="text-sm sm:text-base leading-tight">Auto-generate from trending topics</CardTitle>
                                        <CardDescription className="text-xs sm:text-sm mt-0.5 sm:mt-1">
                                          AI automatically discovers and selects the best trending topic
                                        </CardDescription>
                                      </div>
                                      {field.value === "trending" && (
                                        <Check className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                                      )}
                                    </div>
                                  </CardHeader>
                                </Card>

                                <Card 
                                  className={`cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${
                                    field.value === "trending_select" ? "bg-primary/10 border-primary shadow-sm" : "hover:bg-muted/50"
                                  }`}
                                  onClick={() => field.onChange("trending_select")}
                                >
                                  <CardHeader className="p-3 sm:p-4">
                                    <div className="flex items-start space-x-2 sm:space-x-3">
                                      <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 transition-colors ${
                                        field.value === "trending_select" ? "bg-green-500 text-white" : "bg-green-100 text-green-600"
                                      }`}>
                                        <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <CardTitle className="text-sm sm:text-base leading-tight">Choose from trending topics</CardTitle>
                                        <CardDescription className="text-xs sm:text-sm mt-0.5 sm:mt-1">
                                          Browse and select specific trending topics
                                        </CardDescription>
                                      </div>
                                      {field.value === "trending_select" && (
                                        <Check className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                                      )}
                                    </div>
                                  </CardHeader>
                                </Card>

                                <Card 
                                  className={`cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${
                                    field.value === "custom" ? "bg-primary/10 border-primary shadow-sm" : "hover:bg-muted/50"
                                  }`}
                                  onClick={() => field.onChange("custom")}
                                >
                                  <CardHeader className="p-3 sm:p-4">
                                    <div className="flex items-start space-x-2 sm:space-x-3">
                                      <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 transition-colors ${
                                        field.value === "custom" ? "bg-purple-500 text-white" : "bg-purple-100 text-purple-600"
                                      }`}>
                                        <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <CardTitle className="text-sm sm:text-base leading-tight">Generate from custom topic</CardTitle>
                                        <CardDescription className="text-xs sm:text-sm mt-0.5 sm:mt-1">
                                          Provide your own specific topic
                                        </CardDescription>
                                      </div>
                                      {field.value === "custom" && (
                                        <Check className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                                      )}
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
                  </AccordionContent>
                </AccordionItem>

                {/* Step 2: Content Configuration */}
                <AccordionItem value="content" disabled={!isSectionComplete("method")}>
                  <AccordionTrigger 
                    className="px-0 pointer-events-none hover:no-underline [&>svg]:hidden"
                  >
                    <div className="flex items-center gap-2 text-left">
                      {isSectionComplete("content") ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                      )}
                      <span className="font-medium">Content Configuration</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0">
                    <div className="space-y-4">
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
                        <div className="space-y-4">
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
                            className="lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start"
                          />
                          
                          {form.formState.errors.selectedTrendIds && (
                            <p className="text-sm text-destructive">
                              Please select at least one trending topic to continue
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Step 3: Settings & Options */}
                <AccordionItem value="settings" disabled={!isSectionComplete("content")}>
                  <AccordionTrigger 
                    className="px-0 pointer-events-none hover:no-underline [&>svg]:hidden"
                  >
                    <div className="flex items-center gap-2 text-left">
                      {isSectionComplete("settings") ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                      )}
                      <span className="font-medium">Settings & Options</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0">
                    <div className="space-y-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* Language Selection */}
                        <FormField
                          control={form.control}
                          name="language"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Language</FormLabel>
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
                              <FormLabel>Blog Post Type</FormLabel>
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
                                  Select which sources to use for discovering trends
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
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

            {/* Footer with Navigation Buttons */}
            <div className="border-t pt-4 flex gap-2 justify-between">
              {/* Left Button: Cancel or Back */}
              <Button
                type="button"
                variant="outline"
                onClick={currentStep === 0 ? () => setOpen(false) : handleBack}
                size="default"
              >
                {currentStep === 0 ? (
                  "Cancel"
                ) : (
                  <>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </>
                )}
              </Button>
              
              {/* Right Button: Next or Generate */}
              {currentStep === steps.length - 1 ? (
                <Button 
                  type="submit" 
                  disabled={isGenerating || !canProceedToNextStep()}
                  size="default"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting Generation...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Post
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceedToNextStep()}
                  size="default"
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}