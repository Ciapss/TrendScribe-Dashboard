"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, TrendingUp } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/constants";
import type { KeywordExample } from "@/types";

interface KeywordExamplesProps {
  className?: string;
  showIndustryFilter?: boolean;
  maxExamples?: number;
}

export function KeywordExamples({ 
  className = "", 
  showIndustryFilter = true,
  maxExamples = 6 
}: KeywordExamplesProps) {
  const [examples, setExamples] = useState<KeywordExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");
  
  const loadExamples = useCallback(async () => {
    try {
      setLoading(true);
      const industryFilter = selectedIndustry === "all" ? undefined : selectedIndustry;
      const data = await apiClient.getKeywordExamples(industryFilter);
      setExamples(data.examples || []);
    } catch (error) {
      console.error('Failed to load keyword examples:', error);
      // Set fallback examples with the new simplified format
      setExamples([
        {
          old_hashtag: "#ai",
          primary_keywords: ["ChatGPT", "OpenAI", "Claude", "artificial intelligence"],
          engagement_improvement: "1000x better",
          industry: "ai-ml"
        },
        {
          old_hashtag: "#tech",
          primary_keywords: ["ChatGPT", "machine learning", "software development", "programming", "innovation"],
          engagement_improvement: "500x better",
          industry: "technology"
        },
        {
          old_hashtag: "#startup",
          primary_keywords: ["seed funding", "venture capital", "Series A", "product launch", "entrepreneur"],
          engagement_improvement: "800x better",
          industry: "startups"
        },
        {
          old_hashtag: "#finance",
          primary_keywords: ["Bitcoin", "cryptocurrency", "stock market", "investing", "DeFi"],
          engagement_improvement: "600x better",
          industry: "finance"
        },
        {
          old_hashtag: "#business",
          primary_keywords: ["startup news", "business strategy", "market analysis", "leadership", "innovation"],
          engagement_improvement: "750x better",
          industry: "business"
        },
        {
          old_hashtag: "#health",
          primary_keywords: ["nutrition", "fitness", "wellness", "mental health", "healthcare"],
          engagement_improvement: "400x better",
          industry: "healthcare"
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [selectedIndustry]);

  useEffect(() => {
    loadExamples();
  }, [loadExamples]);

  const filteredExamples = examples.slice(0, maxExamples);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Keyword Examples
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Keyword Examples
          </CardTitle>
          <div className="flex items-center gap-2">
            {showIndustryFilter && (
              <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {INDUSTRY_LABELS[industry]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={loadExamples}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          See how keyword arrays deliver dramatically better engagement than traditional hashtags
        </p>
      </CardHeader>
      
      <CardContent>
        {filteredExamples.length > 0 ? (
          <div className="space-y-4">
            {filteredExamples.map((example, index) => (
              <div key={index} className="p-4 border rounded-lg bg-gradient-to-r from-green-50 to-blue-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {example.old_hashtag && (
                      <>
                        <span className="font-semibold text-gray-500 line-through">{example.old_hashtag}</span>
                        <span className="text-gray-400">→</span>
                      </>
                    )}
                    <span className="text-sm text-green-700 font-medium">Keywords</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    🔥 {example.engagement_improvement}
                  </Badge>
                </div>
                
                <div className="bg-green-100 p-3 rounded border border-green-200">
                  <div className="flex flex-wrap gap-2">
                    {example.primary_keywords.map((keyword, keywordIndex) => (
                      <Badge
                        key={keywordIndex}
                        variant="secondary"
                        className="text-xs bg-green-200 text-green-800 border-green-300 font-mono"
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {example.industry && (
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      {INDUSTRY_LABELS[example.industry] || example.industry}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-1">💡 Pro Tips for Keywords</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Include popular brand names (ChatGPT, Tesla, Apple)</li>
                <li>• Use specific terms instead of generic hashtags</li>
                <li>• Mix branded terms with descriptive keywords</li>
                <li>• Focus on trending topics in your industry</li>
                <li>• Use 3-8 keywords per topic for best results</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No examples available</p>
            <Button variant="outline" onClick={loadExamples} className="mt-2">
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}