"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  Download,
  ExternalLink,
  ArrowLeft,
  Eye,
  Code,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { BlogPost } from "@/types";
import { INDUSTRY_LABELS } from "@/lib/constants";
import { apiClient } from "@/lib/api-client";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostDetailProps {
  postId: string;
}

export function PostDetail({ postId }: PostDetailProps) {
  const isMobile = useIsMobile();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("preview");
  const [sourcesCollapsed, setSourcesCollapsed] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{success: boolean; message: string} | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const postData = await apiClient.getPost(postId);
        setPost(postData);
      } catch (error) {
        console.error("Failed to fetch post:", error);
        setError(
          error instanceof Error ? error.message : "Failed to fetch post",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  const handleCopyContent = () => {
    if (post) {
      navigator.clipboard.writeText(post.content || "");
      // TODO: Add toast notification
    }
  };

  const handleExport = (format: "md" | "txt") => {
    if (!post) return;

    const content =
      format === "md" ? (post.content || "") : (post.content || "").replace(/[#*`]/g, "");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${post.title.toLowerCase().replace(/\s+/g, "-")}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePublishToWebsite = async () => {
    if (!post || publishing) return;

    setPublishing(true);
    setPublishResult(null);

    try {
      // Call the API to publish this specific post to the website
      const result = await apiClient.publishPostToWebsite(post.id);
      setPublishResult({
        success: true,
        message: result.message || 'Post published successfully to website!'
      });
    } catch (error) {
      console.error('Failed to publish post:', error);
      setPublishResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to publish post to website'
      });
    } finally {
      setPublishing(false);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 85) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 75) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getSeoColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 80) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/posts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Posts
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="h-8 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/posts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Posts
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium">Error loading post</h3>
              <p className="text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/posts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Posts
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium">Post not found</h3>
              <p className="text-muted-foreground">
                The requested post could not be found.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between",
        isMobile && "flex-col gap-4 items-stretch"
      )}>
        <Button variant="ghost" size="sm" asChild className={cn(isMobile && "self-start")}>
          <Link href="/posts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Posts
          </Link>
        </Button>

        {isMobile ? (
          /* Mobile Layout - Show primary action and dropdown */
          <div className="flex gap-2">
            <Button 
              variant="default" 
              size="sm" 
              onClick={handlePublishToWebsite}
              disabled={publishing}
              className="bg-green-600 hover:bg-green-700 flex-1 min-h-[44px]"
            >
              {publishing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {publishing ? 'Publishing...' : 'Publish'}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="min-h-[44px] min-w-[44px]">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleCopyContent}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Content
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport("md")}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("txt")}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Text
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          /* Desktop Layout - Show all buttons */
          <div className="flex items-center gap-2">
            <Button 
              variant="default" 
              size="sm" 
              onClick={handlePublishToWebsite}
              disabled={publishing}
              className="bg-green-600 hover:bg-green-700"
            >
              {publishing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {publishing ? 'Publishing...' : 'Publish to Website'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyContent}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Content
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("md")}
            >
              <Download className="mr-2 h-4 w-4" />
              Export MD
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("txt")}
            >
              <Download className="mr-2 h-4 w-4" />
              Export TXT
            </Button>
          </div>
        )}
      </div>

      {/* Publish Result Notification */}
      {publishResult && (
        <div className={`p-4 rounded-lg border ${
          publishResult.success 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <p className="font-medium">
              {publishResult.success ? '✅ Success!' : '❌ Error'}
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setPublishResult(null)}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
          <p className="text-sm mt-1">{publishResult.message}</p>
        </div>
      )}

      {/* Main Content */}
      <div className={cn(
        "grid gap-6",
        isMobile ? "grid-cols-1" : "lg:grid-cols-3"
      )}>
        {/* Content */}
        <div className={cn(isMobile ? "col-span-1" : "lg:col-span-2")}>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{post.title}</CardTitle>
              <CardDescription>
                Created on {new Date(post.createdAt).toLocaleDateString()} at{" "}
                {new Date(post.createdAt).toLocaleTimeString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="preview">
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="markdown">
                    <Code className="mr-2 h-4 w-4" />
                    Markdown
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-4">
                  <div 
                    className="prose max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mt-6 [&>h1]:mb-4 [&>h1]:text-foreground [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:mt-5 [&>h2]:mb-3 [&>h2]:text-foreground [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:mt-4 [&>h3]:mb-2 [&>h3]:text-foreground [&>p]:mb-3 [&>p]:leading-relaxed [&>p]:text-foreground [&>ul]:list-disc [&>ul]:ml-6 [&>ul]:mb-4 [&>ul]:text-foreground [&>ol]:list-decimal [&>ol]:ml-6 [&>ol]:mb-4 [&>ol]:text-foreground [&>li]:mb-1 [&>li]:text-foreground [&>strong]:font-bold [&>strong]:text-foreground [&>em]:italic [&>em]:text-foreground [&>blockquote]:border-l-4 [&>blockquote]:border-muted-foreground [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:my-4 [&>blockquote]:text-foreground [&>code]:bg-muted [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-sm [&>code]:text-foreground [&>pre]:bg-muted [&>pre]:p-4 [&>pre]:rounded-lg [&>pre]:overflow-auto [&>pre]:text-sm [&>pre]:text-foreground"
                    dangerouslySetInnerHTML={{ __html: post.content || "" }}
                  />
                </TabsContent>

                <TabsContent value="markdown" className="mt-4">
                  <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
                    <code>{post.content || ""}</code>
                  </pre>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Metadata Sidebar */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Post Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Industry
                </label>
                <div className="mt-1">
                  <Badge variant="secondary">
                    {INDUSTRY_LABELS[post.industry]}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Word Count
                </label>
                <div className="text-sm">
                  {post.metadata.wordCount.toLocaleString()} words
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Reading Time
                </label>
                <div className="text-sm">
                  {post.metadata.readingTime} minutes
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quality Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quality Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Quality Score</span>
                <Badge
                  variant="outline"
                  className={getQualityColor(post.metadata.qualityScore)}
                >
                  {post.metadata.qualityScore}/100
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">SEO Score</span>
                <Badge
                  variant="outline"
                  className={getSeoColor(post.metadata.seoScore)}
                >
                  {post.metadata.seoScore}%
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Fact Check</span>
                <Badge
                  variant="outline"
                  className="bg-blue-100 text-blue-800 border-blue-200"
                >
                  {post.metadata.factCheckScore.toFixed(1)}/10
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Trend Score</span>
                <Badge
                  variant="outline"
                  className="bg-purple-100 text-purple-800 border-purple-200"
                >
                  {post.metadata.trendScore}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Sources */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Sources ({post.sources.length})
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSourcesCollapsed(!sourcesCollapsed)}
                  className="h-8 w-8 p-0"
                >
                  {sourcesCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {sourcesCollapsed && post.sources.length > 0 && (
                <CardDescription className="text-sm text-muted-foreground">
                  Click to view {post.sources.length} source{post.sources.length === 1 ? '' : 's'}
                </CardDescription>
              )}
            </CardHeader>
            <div className={`transition-all duration-300 ease-in-out ${
              sourcesCollapsed ? 'max-h-0 overflow-hidden' : 'max-h-[1000px]'
            }`}>
              <CardContent className="space-y-3">
                {post.sources.map((source, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm leading-tight">
                        {source.title}
                      </h4>
                      <div className="flex items-center justify-end">
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                      {source.publishDate && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(source.publishDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </div>
          </Card>

          {/* Keywords */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Keywords</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {post.keywords.map((keyword, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
