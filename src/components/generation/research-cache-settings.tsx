"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Zap, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ResearchCacheSettings, CostEstimate } from "@/types";

interface ResearchCacheSettingsProps {
  settings: ResearchCacheSettings;
  onChange: (settings: ResearchCacheSettings) => void;
  costEstimate?: CostEstimate;
  className?: string;
}

export function ResearchCacheSettingsComponent({
  settings,
  onChange,
  costEstimate,
  className
}: ResearchCacheSettingsProps) {
  const handleSettingsChange = (updates: Partial<ResearchCacheSettings>) => {
    const newSettings = { ...settings, ...updates };
    
    // Auto-disable cache when force fresh is enabled
    if (updates.force_fresh_research === true) {
      newSettings.use_cached_research = false;
    }
    
    onChange(newSettings);
  };

  const getCacheModeBadge = () => {
    if (settings.force_fresh_research) {
      return <Badge variant="destructive">Fresh Only</Badge>;
    }
    if (!settings.use_cached_research) {
      return <Badge variant="secondary">Cache Disabled</Badge>;
    }
    if (settings.max_research_age_hours <= 6) {
      return <Badge variant="default">Conservative</Badge>;
    }
    if (settings.max_research_age_hours <= 24) {
      return <Badge variant="default">Balanced</Badge>;
    }
    return <Badge variant="outline">Aggressive</Badge>;
  };

  const getTimeEstimate = () => {
    if (settings.force_fresh_research) {
      return "4-6 minutes";
    }
    if (settings.use_cached_research && costEstimate?.cache_hit_probability && costEstimate.cache_hit_probability > 0.7) {
      return "2-3 minutes";
    }
    return "3-5 minutes";
  };

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
                Research Configuration
              </CardTitle>
              <CardDescription>
                Control research caching to balance speed, cost, and freshness
              </CardDescription>
            </div>
            {getCacheModeBadge()}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Use Cached Research Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="use-cache" className="text-xs sm:text-sm">Use cached research when available</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Use previously researched data to speed up generation and reduce costs</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="use-cache"
                checked={settings.use_cached_research}
                onCheckedChange={(checked) => handleSettingsChange({ use_cached_research: checked })}
                disabled={settings.force_fresh_research}
              />
            </div>
          </div>

          {/* Cache Age Slider */}
          {settings.use_cached_research && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm">Maximum research age: {settings.max_research_age_hours} hours</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Older research may be less current but faster to generate</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Slider
                value={[settings.max_research_age_hours]}
                onValueChange={([value]) => handleSettingsChange({ max_research_age_hours: value })}
                min={1}
                max={168}
                step={1}
                className="w-full"
              />
            </div>
          )}

          {/* Force Fresh Research Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="force-fresh" className="text-xs sm:text-sm">Force fresh research</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Always conduct new research, even if cache is available</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="force-fresh"
                checked={settings.force_fresh_research}
                onCheckedChange={(checked) => handleSettingsChange({ force_fresh_research: checked })}
              />
            </div>
          </div>

          {/* Time Estimate Only */}
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
              <div>
                <p className="text-xs sm:text-sm font-medium">Estimated Time</p>
                <p className="text-xs text-muted-foreground">{getTimeEstimate()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}