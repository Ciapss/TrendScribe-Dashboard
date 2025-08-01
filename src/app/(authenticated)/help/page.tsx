"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RouteGuard } from "@/components/auth/route-guard"
import { useAuth } from "@/components/auth/auth-provider"
import { 
  BookOpen, 
  Zap, 
  Search, 
  Edit, 
  FileText, 
  BarChart3, 
  Settings, 
  Webhook, 
  Key, 
  Users,
  Building2,
  Activity,
  Rss,
  Hash,
  MessageCircle,
  Shield,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  PlayCircle,
  Target,
  Globe,
  Download,
  Eye,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Home,
  Star
} from "lucide-react"

export default function HelpPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isWelcome = searchParams.get('welcome') === 'true'
  const [showWelcome, setShowWelcome] = useState(isWelcome)
  
  return (
    <RouteGuard requireAuth={true}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Welcome Banner for First-Time Users */}
        {showWelcome && (
          <Alert className="border-primary bg-primary/5">
            <Star className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <strong>Welcome to TrendScribe Dashboard, {user?.username || 'User'}!</strong>
                <span className="block text-sm text-muted-foreground mt-1">
                  This is your first time here. Let&apos;s get you started with a complete overview of all features.
                </span>
              </div>
              <div className="flex gap-2 ml-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setShowWelcome(false)
                    router.push('/')
                  }}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Skip to Dashboard
                </Button>
                <Button 
                  size="sm"
                  onClick={() => setShowWelcome(false)}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Start Tour
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BookOpen className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {showWelcome ? "Welcome Guide" : "User Manual"}
              </h1>
              <p className="text-muted-foreground">
                {showWelcome 
                  ? "Everything you need to know to get started with TrendScribe Dashboard"
                  : "Complete guide to using TrendScribe Dashboard - your AI-powered blog post generation platform"
                }
              </p>
            </div>
          </div>
          
          {/* Navigation buttons */}
          {!showWelcome && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.back()}>
                Back
              </Button>
              <Button onClick={() => router.push('/')}>
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="getting-started" className="space-y-6">
          <TabsList className="grid grid-cols-2 lg:grid-cols-6 h-auto">
            <TabsTrigger value="getting-started" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Getting Started
            </TabsTrigger>
            <TabsTrigger value="generation" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Content Generation
            </TabsTrigger>
            <TabsTrigger value="management" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Content Management
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Analytics & Jobs
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Settings & Config
            </TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Advanced Features
            </TabsTrigger>
          </TabsList>

          {/* Getting Started Tab */}
          <TabsContent value="getting-started" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5" />
                  Welcome to TrendScribe Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  TrendScribe Dashboard is an AI-powered platform that automatically discovers trending topics and generates high-quality blog posts. 
                  This comprehensive tool helps content creators, marketers, and businesses stay ahead of trends while producing engaging content.
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Key Features</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• AI-powered trend discovery from multiple sources</li>
                      <li>• Support for 21 industries and custom categories</li>
                      <li>• Generate content in 15 languages</li>
                      <li>• 9 different blog post types</li>
                      <li>• Real-time job monitoring</li>
                      <li>• Comprehensive analytics and cost tracking</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Data Sources</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Reddit communities (140+ subreddits)</li>
                      <li>• RSS feeds from news sources</li>
                      <li>• Twitter/X hashtag monitoring</li>
                      <li>• Linkup real-time web search</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Dashboard Navigation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="font-medium">Dashboard</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Overview of your content performance, recent posts, and activity charts. Admin users also see API cost information.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">Posts</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      View, filter, and manage all your generated blog posts. Export content and track performance metrics.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className="font-medium">Industries</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Manage industry categories, create custom industries, and configure content targeting.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      <span className="font-medium">Jobs</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Monitor active generation jobs, view progress, and track completion status in real-time.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="font-medium">Analytics</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Detailed insights on content performance, quality scores, and API costs (admin only).
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Webhook className="h-4 w-4" />
                      <span className="font-medium">Webhooks</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Set up automated content delivery to external systems and manage webhook configurations.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Quick Start Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge variant="default" className="min-w-6 h-6 flex items-center justify-center text-xs">1</Badge>
                    <div>
                      <h4 className="font-medium">Generate Your First Post</h4>
                      <p className="text-sm text-muted-foreground">Click the &quot;Generate Post&quot; button to open the generation dialog and create your first blog post.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Badge variant="default" className="min-w-6 h-6 flex items-center justify-center text-xs">2</Badge>
                    <div>
                      <h4 className="font-medium">Choose Generation Method</h4>
                      <p className="text-sm text-muted-foreground">Select auto-trending, trend selection, or custom topic based on your content needs.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Badge variant="default" className="min-w-6 h-6 flex items-center justify-center text-xs">3</Badge>
                    <div>
                      <h4 className="font-medium">Configure Settings</h4>
                      <p className="text-sm text-muted-foreground">Select language, blog type, research depth, and caching preferences to optimize cost and quality.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Badge variant="default" className="min-w-6 h-6 flex items-center justify-center text-xs">4</Badge>
                    <div>
                      <h4 className="font-medium">Monitor Progress</h4>
                      <p className="text-sm text-muted-foreground">Track your generation job in the Jobs section and get notified when your content is ready.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Generation Tab */}
          <TabsContent value="generation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Content Generation Methods
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <Zap className="h-4 w-4" />
                      </div>
                      <h3 className="font-semibold">Auto-Generate</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      AI automatically discovers and selects the best trending topic from your chosen industry. 
                      Perfect for consistent content creation without manual topic selection.
                    </p>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Best for:</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Regular content publishing</li>
                        <li>• Automated workflows</li>
                        <li>• Staying on top of trends</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                        <Search className="h-4 w-4" />
                      </div>
                      <h3 className="font-semibold">Choose from Trends</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Browse and select specific trending topics from a curated list. 
                      Gives you control over content direction while leveraging trend data.
                    </p>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Best for:</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Selective content creation</li>
                        <li>• Brand alignment</li>
                        <li>• Editorial control</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                        <Edit className="h-4 w-4" />
                      </div>
                      <h3 className="font-semibold">Custom Topic</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Provide your own specific topic or angle for content creation. 
                      AI will research and create comprehensive content around your chosen subject.
                    </p>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Best for:</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Specific subject matter</li>
                        <li>• Niche content</li>
                        <li>• Educational content</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Generation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Language Support</h3>
                      <p className="text-sm text-muted-foreground mb-3">Generate content in 15 different languages:</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>• English</div>
                        <div>• Spanish</div>
                        <div>• French</div>
                        <div>• German</div>
                        <div>• Italian</div>
                        <div>• Portuguese</div>
                        <div>• Chinese (Simplified)</div>
                        <div>• Japanese</div>
                        <div>• Korean</div>
                        <div>• Arabic</div>
                        <div>• Russian</div>
                        <div>• Hindi</div>
                        <div>• Dutch</div>
                        <div>• Swedish</div>
                        <div>• Polish</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Blog Post Types</h3>
                      <p className="text-sm text-muted-foreground mb-3">Choose from 9 content formats:</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Informative Article</span>
                          <Badge variant="secondary" className="text-xs">General</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>How-To Guide</span>
                          <Badge variant="secondary" className="text-xs">Tutorial</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Listicle</span>
                          <Badge variant="secondary" className="text-xs">Lists</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>News Article</span>
                          <Badge variant="secondary" className="text-xs">Current</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Opinion Piece</span>
                          <Badge variant="secondary" className="text-xs">Editorial</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Case Study</span>
                          <Badge variant="secondary" className="text-xs">Analysis</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Comparison</span>
                          <Badge variant="secondary" className="text-xs">vs</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Review</span>
                          <Badge variant="secondary" className="text-xs">Evaluation</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Guide</span>
                          <Badge variant="secondary" className="text-xs">Complete</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Research Cache & Cost Optimization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  TrendScribe includes an intelligent research caching system to optimize costs and speed up content generation:
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Cache Settings</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Use Cached Research</span>
                        <Badge variant="default">Recommended</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Cache Age</span>
                        <span className="text-muted-foreground">1-168 hours</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Force Fresh Research</span>
                        <span className="text-muted-foreground">Override cache</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Research Depth</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Moderate Research</span>
                        <Badge variant="secondary">Faster, Lower Cost</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Deep Research</span>
                        <Badge variant="secondary">Comprehensive</Badge>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Cost Optimization Tips</span>
                  </div>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Enable cache to reuse recent research and reduce API costs</li>
                    <li>• Set cache age to 24-48 hours for optimal balance</li>
                    <li>• Use moderate research for regular content, deep for premium posts</li>
                    <li>• Monitor cost estimates before generation</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Management Tab */}
          <TabsContent value="management" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Posts Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  The Posts section provides comprehensive management of all your generated content with powerful filtering and export capabilities.
                </p>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Viewing & Filtering</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Search by title, content, or keywords</li>
                      <li>• Filter by industry category</li>
                      <li>• Sort by date, quality score, or trend score</li>
                      <li>• View detailed metadata and metrics</li>
                      <li>• Access source materials and references</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Post Metrics</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• SEO Score (0-100%)</li>
                      <li>• Fact Check Score (0-10)</li>
                      <li>• Quality Score (0-10)</li>
                      <li>• Trend Relevance Score (0-10)</li>
                      <li>• Word count and reading time</li>
                      <li>• Generation cost breakdown</li>
                    </ul>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold">Export & Integration</h4>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="flex items-center gap-2 p-3 border rounded">
                      <Download className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Export as Markdown</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 border rounded">
                      <Eye className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Preview Content</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 border rounded">
                      <Webhook className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Webhook Delivery</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Industry Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Manage industry categories to organize content and target specific market segments.
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Built-in Industries (21)</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>• Technology</div>
                      <div>• Healthcare</div>
                      <div>• Finance</div>
                      <div>• Marketing</div>
                      <div>• Education</div>
                      <div>• Entertainment</div>
                      <div>• Sports</div>
                      <div>• Business</div>
                      <div>• Science</div>
                      <div>• Environment</div>
                      <div>• Politics</div>
                      <div>• Travel</div>
                      <div>• Food</div>
                      <div>• Fashion</div>
                      <div>• Automotive</div>
                      <div>• Real Estate</div>
                      <div>• Cryptocurrency</div>
                      <div>• AI & ML</div>
                      <div>• Cybersecurity</div>
                      <div>• Startups</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Custom Industries</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Create niche industry categories</li>
                      <li>• Define custom keywords and categories</li>
                      <li>• Configure specific data sources</li>
                      <li>• Set up targeted content generation</li>
                      <li>• Track usage and performance</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics & Jobs Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Job Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Track all generation jobs in real-time with detailed progress monitoring and status updates.
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Job Statuses</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Pending</Badge>
                        <span className="text-sm text-muted-foreground">Queued for processing</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Processing</Badge>
                        <span className="text-sm text-muted-foreground">Active generation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-green-500 text-green-700">Completed</Badge>
                        <span className="text-sm text-muted-foreground">Successfully finished</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Failed</Badge>
                        <span className="text-sm text-muted-foreground">Error occurred</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Cancelled</Badge>
                        <span className="text-sm text-muted-foreground">Manually stopped</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Generation Stages</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Trend Discovery</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Research Phase</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span>Content Generation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>Fact Checking</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>SEO Optimization</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Real-time Updates</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Jobs are monitored via WebSocket connections for instant updates. The processing count badge in the sidebar shows active jobs.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Analytics & Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Comprehensive analytics help you understand content performance and optimize your strategy.
                </p>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Content Analytics</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Total posts generated</li>
                      <li>• Average quality scores</li>
                      <li>• Posts by industry distribution</li>
                      <li>• Content performance over time</li>
                      <li>• Most active industry categories</li>
                      <li>• Success rate tracking</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Cost Analytics <Badge variant="secondary" className="text-xs">Admin Only</Badge></h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• API usage and costs breakdown</li>
                      <li>• Cost per generation analysis</li>
                      <li>• Service-specific spending</li>
                      <li>• Cache hit rates and savings</li>
                      <li>• Monthly cost trends</li>
                      <li>• Budget monitoring</li>
                    </ul>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold">Quality Metrics</h4>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="text-center p-3 border rounded">
                      <div className="font-semibold text-lg">8.5/10</div>
                      <div className="text-xs text-muted-foreground">Avg Quality</div>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <div className="font-semibold text-lg">92%</div>
                      <div className="text-xs text-muted-foreground">SEO Score</div>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <div className="font-semibold text-lg">7.8/10</div>
                      <div className="text-xs text-muted-foreground">Fact Check</div>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <div className="font-semibold text-lg">8.2/10</div>
                      <div className="text-xs text-muted-foreground">Trend Score</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings & Configuration Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rss className="h-5 w-5" />
                  Source Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Configure and manage multiple data sources for trend discovery and content generation.
                </p>
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-orange-600" />
                      <h4 className="font-semibold">Reddit</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      140+ subreddits across 21 industries. Configure which communities to monitor and set engagement thresholds.
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Settings: Max posts, min upvotes, min comments per subreddit
                    </div>
                  </div>
                  
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Rss className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold">RSS Feeds</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Monitor news sources, blogs, and publications. Add custom feeds and configure update frequencies.
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Settings: Feed URLs, update intervals, content filters
                    </div>
                  </div>
                  
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Hash className="h-5 w-5 text-cyan-600" />
                      <h4 className="font-semibold">Twitter/X</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Monitor trending hashtags and conversations. Set up industry-specific hashtag tracking.
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Settings: Hashtags, engagement thresholds, language filters
                    </div>
                  </div>
                  
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-green-600" />
                      <h4 className="font-semibold">Linkup</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Real-time web search and analysis for emerging trends and breaking news across the internet.
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Settings: Search parameters, result limits, relevance scoring
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold">Advanced Source Settings</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Source Weights</label>
                      <p className="text-xs text-muted-foreground">
                        Adjust the priority of each source type to influence trend discovery and final trend scores.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Global Filters</label>
                      <p className="text-xs text-muted-foreground">
                        Set include/exclude keywords that apply across all sources for better content targeting.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Key Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Create and manage API keys for programmatic access to TrendScribe functionality.
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Permission Levels</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-blue-500" />
                        <span>Read Posts</span>
                        <Badge variant="secondary" className="text-xs">View content</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-green-500" />
                        <span>Generate Posts</span>
                        <Badge variant="secondary" className="text-xs">Create content</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Webhook className="h-4 w-4 text-purple-500" />
                        <span>Manage Webhooks</span>
                        <Badge variant="secondary" className="text-xs">Configure delivery</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Security Features</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Expiration date support</li>
                      <li>• Usage tracking and monitoring</li>
                      <li>• Granular permission control</li>
                      <li>• Key rotation capabilities</li>
                      <li>• Activity logging</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Features Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Webhooks & Automation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Set up automated content delivery to external systems with robust webhook configurations.
                </p>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Webhook Features</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Multiple authentication methods</li>
                      <li>• Flexible scheduling (immediate, daily, weekly, monthly)</li>
                      <li>• Industry-specific targeting</li>
                      <li>• Retry logic with backoff</li>
                      <li>• Comprehensive logging</li>
                      <li>• Payload customization</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Automation Options</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Automatic content publishing</li>
                      <li>• Industry rotation for diverse content</li>
                      <li>• Tag-based content filtering</li>
                      <li>• Time zone support</li>
                      <li>• Delivery status monitoring</li>
                      <li>• Error handling and notifications</li>
                    </ul>
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Integration Examples</span>
                  </div>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• WordPress blog auto-publishing</li>
                    <li>• CMS content management systems</li>
                    <li>• Social media scheduling tools</li>
                    <li>• Email marketing platforms</li>
                    <li>• Custom content workflows</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management <Badge variant="secondary" className="text-xs ml-2">Admin Only</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Administrative features for managing users, permissions, and system access.
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="font-semibold">User Roles</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Admin</span>
                        <Badge variant="default" className="text-xs">Full Access</Badge>
                      </div>
                      <ul className="text-sm text-muted-foreground ml-6 space-y-1">
                        <li>• All content generation features</li>
                        <li>• User management</li>
                        <li>• Cost analytics and monitoring</li>
                        <li>• System configuration</li>
                        <li>• API key management</li>
                      </ul>
                      
                      <div className="flex items-center gap-2 mt-3">
                        <Eye className="h-4 w-4 text-green-500" />
                        <span className="font-medium">User</span>
                        <Badge variant="secondary" className="text-xs">Content Access</Badge>
                      </div>
                      <ul className="text-sm text-muted-foreground ml-6 space-y-1">
                        <li>• Content generation</li>
                        <li>• Post management</li>
                        <li>• Basic analytics</li>
                        <li>• Personal settings</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Admin Capabilities</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Create and manage user accounts</li>
                      <li>• Assign roles and permissions</li>
                      <li>• Monitor API usage and costs</li>
                      <li>• Configure system-wide settings</li>
                      <li>• Access audit logs and analytics</li>
                      <li>• Manage webhooks and integrations</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Troubleshooting & Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Common Issues</h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="font-medium">Generation Jobs Failing</div>
                        <div className="text-muted-foreground">Check API key permissions and source configurations</div>
                      </div>
                      <div>
                        <div className="font-medium">No Trends Found</div>
                        <div className="text-muted-foreground">Verify industry settings and source weights</div>
                      </div>
                      <div>
                        <div className="font-medium">High API Costs</div>
                        <div className="text-muted-foreground">Enable research caching and use moderate research depth</div>
                      </div>
                      <div>
                        <div className="font-medium">Webhook Delivery Failures</div>
                        <div className="text-muted-foreground">Check endpoint URLs and authentication settings</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Performance Optimization</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Enable research caching for cost savings</li>
                      <li>• Use appropriate research depth</li>
                      <li>• Configure source weights efficiently</li>
                      <li>• Monitor job processing times</li>
                      <li>• Optimize webhook retry settings</li>
                      <li>• Regular cleanup of old content</li>
                    </ul>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="h-4 w-4 text-gray-600" />
                    <span className="font-medium">System Status</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Reddit API</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>RSS Feeds</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Linkup API</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Twitter/X API</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Floating Action Buttons for Welcome Mode */}
        {showWelcome && (
          <div className="fixed bottom-6 right-6 flex flex-col gap-3">
            <Button
              size="lg"
              onClick={() => {
                setShowWelcome(false)
                router.push('/')
              }}
              className="shadow-lg"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Start Creating Content
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowWelcome(false)
                router.push('/')
              }}
              className="shadow-lg bg-white"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>
        )}
      </div>
    </RouteGuard>
  )
}