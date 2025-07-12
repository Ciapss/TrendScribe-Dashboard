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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Plus, Loader2, TrendingUp } from "lucide-react"
import { LANGUAGES, LANGUAGE_LABELS, BLOG_TYPES, BLOG_TYPE_LABELS } from "@/lib/constants"
import { apiClient } from "@/lib/api-client"
import { TrendSelector } from "@/components/trends/trend-selector"
import type { Trend, TrendFilters, Industry } from "@/types"
import type { Job } from "@/types/job"
import { SourceSelector } from "@/components/sources/source-selector"
import { Separator } from "@/components/ui/separator"
import { useJobPolling } from "@/hooks/use-job-polling"
import { DiscoveryJobStorage } from "@/utils/discovery-job-storage"

const formSchema = z.object({
  generationType: z.enum(["trending", "trending_select", "custom"], {
    required_error: "Please select how you want to generate the post",
  }),
  industry: z.string().optional(),
  selectedTrendIds: z.array(z.string()).optional(),
  customTopic: z.string().optional(),
  language: z.string().min(1, "Please select a language"),
  blogType: z.string().min(1, "Please select a blog post type"),
  enableComprehensiveResearch: z.boolean(),
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
      enableComprehensiveResearch: true,
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
          researchDepth: data.enableComprehensiveResearch ? "deep" : "moderate",
          selectedTrendIds: data.selectedTrendIds,
          industry: selectedTrend.industry, // Pass the industry from the selected trend
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
          ...(data.generationType === "trending" && data.industry && {
            industry: data.industry,
          }),
          ...(data.generationType === "custom" && data.customTopic && {
            topic: data.customTopic.trim(),
          }),
          options: {
            enableComprehensiveResearch: data.enableComprehensiveResearch,
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
      <DialogContent className="w-full max-w-4xl p-0 max-h-[90vh] h-[90vh] flex flex-col">
        <DialogHeader className="p-6 border-b shrink-0">
          <DialogTitle className="text-xl">Generate New Blog Post</DialogTitle>
          <DialogDescription>
            Generate a blog post from trending topics or provide your own custom topic. Configure the parameters below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Generation Type Selection */}
                <FormField
                  control={form.control}
                  name="generationType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>How would you like to generate your post?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="trending" id="trending" />
                            <label htmlFor="trending" className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              Auto-generate from trending topics
                            </label>
                          </div>
                          <p className="text-xs text-muted-foreground ml-6">
                            AI will automatically discover and select the best trending topic in your industry
                          </p>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="trending_select" id="trending_select" />
                            <label htmlFor="trending_select" className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              Choose from trending topics
                            </label>
                          </div>
                          <p className="text-xs text-muted-foreground ml-6">
                            Browse and select specific trending topics that interest you
                          </p>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="custom" id="custom" />
                            <label htmlFor="custom" className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              Generate from custom topic
                            </label>
                          </div>
                          <p className="text-xs text-muted-foreground ml-6">
                            Provide your own specific topic or subject to write about
                          </p>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Source Selection - Available for all generation types */}
                <div className="space-y-2">
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Data Sources</Label>
                    <FormDescription className="text-xs">
                      Select which sources to use for discovering trends and researching content
                    </FormDescription>
                    <SourceSelector 
                      showWeights={false}
                      compact={true}
                    />
                  </div>
                  <Separator />
                </div>

                {/* Industry Selection - Only show when generating from trending topics */}
                {form.watch("generationType") === "trending" && (
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent side="bottom" sideOffset={4}>
                            {industriesLoading ? (
                              <div className="flex items-center justify-center py-2">
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
                        <FormDescription>
                          Choose the industry to discover trending topics from
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Custom Topic - Only show when custom generation is selected */}
                {form.watch("generationType") === "custom" && (
                  <FormField
                    control={form.control}
                    name="customTopic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Topic *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter the specific topic you'd like to write about..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Be specific about the topic, angle, or perspective you want to explore
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Language Selection */}
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent side="bottom" sideOffset={4}>
                          {LANGUAGES.map((language) => (
                            <SelectItem key={language} value={language}>
                              {LANGUAGE_LABELS[language]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose the language for your blog post
                      </FormDescription>
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
                      <FormLabel>Blog Post Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a blog post type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent side="bottom" sideOffset={4}>
                          {BLOG_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {BLOG_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose the style and format for your blog post
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Comprehensive Research */}
                <FormField
                  control={form.control}
                  name="enableComprehensiveResearch"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Comprehensive Research Mode</FormLabel>
                        <FormDescription>
                          Enable deeper research with more sources (increases generation time and cost)
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Estimated Generation Time */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Estimated Generation Time</span>
                    <Badge variant="secondary">
                      {form.watch("enableComprehensiveResearch") ? "4-6 minutes" : "3-4 minutes"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Time may vary based on topic complexity and current system load
                  </p>
                </div>
              </div>
            </div>

            {/* Trend Selector Section - Show within the same scroll area */}
            {form.watch("generationType") === "trending_select" && (
              <div className="border-t bg-muted/30">
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <h3 className="text-lg font-semibold">Choose from Trending Topics</h3>
                    {isDiscoveryActive && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Discovering topics...
                      </div>
                    )}
                    {usingSyncMode && (
                      <div className="flex items-center gap-2 text-sm text-orange-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Discovering (sync mode)...
                      </div>
                    )}
                  </div>

                  {/* Discovery Job Status */}
                  {discoveryJob && isDiscoveryActive && (
                    <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
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
                            // Remove from storage and cancel job
                            if (discoveryJobId) {
                              DiscoveryJobStorage.updateJobStatus(discoveryJobId, 'cancelled')
                            }
                            cancelDiscoveryJob()
                          }}
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                      <div className="mt-2 text-xs text-blue-700">
                        Job ID: {discoveryJobId} - You can close this dialog and check the Jobs page for progress.
                      </div>
                    </div>
                  )}

                  {/* Job Recovery Notice */}
                  {discoveryJobId && !discoveryJob && (
                    <div className="p-3 border rounded-lg bg-green-50 border-green-200">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          Reconnected to discovery job for {trendFilters.industry}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-green-700">
                        Job ID: {discoveryJobId} - Checking status...
                      </div>
                    </div>
                  )}

                  {/* Sync Mode Status */}
                  {usingSyncMode && (
                    <div className="p-3 border rounded-lg bg-orange-50 border-orange-200">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                        <span className="text-sm font-medium text-orange-800">
                          Discovering trending topics for {trendFilters.industry} (Direct Mode)
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-orange-700">
                        Running in direct mode - async job system not available. Please wait...
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
                  />
                  {form.formState.errors.selectedTrendIds && (
                    <p className="text-sm text-destructive">
                      Please select at least one trending topic to continue
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Fixed Footer with Submit Buttons */}
            <div className="border-t bg-background p-6 flex gap-3 justify-end shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting Generation...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}