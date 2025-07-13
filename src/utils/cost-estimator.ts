import type { ResearchCacheSettings, CostEstimate } from "@/types";

// Base cost estimates (these would typically come from an API)
const BASE_COSTS = {
  research: {
    moderate: 0.15,  // $0.15 for moderate research
    deep: 0.25,      // $0.25 for deep research
  },
  generation: 0.08,  // $0.08 for content generation
  processing: 0.02,  // $0.02 for processing/formatting
};

// Cache hit probability based on topic age and cache settings
const calculateCacheHitProbability = (
  cacheSettings: ResearchCacheSettings,
  topicType: 'trending' | 'custom' = 'trending'
): number => {
  if (!cacheSettings.use_cached_research || cacheSettings.force_fresh_research) {
    return 0;
  }

  // Base probability based on topic type
  let baseProbability = topicType === 'trending' ? 0.6 : 0.4;
  
  // Adjust based on cache age tolerance
  if (cacheSettings.max_research_age_hours >= 48) {
    baseProbability += 0.3;
  } else if (cacheSettings.max_research_age_hours >= 24) {
    baseProbability += 0.2;
  } else if (cacheSettings.max_research_age_hours >= 12) {
    baseProbability += 0.1;
  }

  return Math.min(1, baseProbability);
};

export const estimateGenerationCost = (
  researchDepth: 'moderate' | 'deep',
  cacheSettings: ResearchCacheSettings,
  topicType: 'trending' | 'custom' = 'trending'
): CostEstimate => {
  const baseResearchCost = BASE_COSTS.research[researchDepth];
  const baseEstimate = baseResearchCost + BASE_COSTS.generation + BASE_COSTS.processing;
  
  const cacheHitProbability = calculateCacheHitProbability(cacheSettings, topicType);
  
  if (cacheHitProbability === 0) {
    // No cache benefit
    return {
      base_estimate: baseEstimate,
      with_cache_estimate: baseEstimate,
      potential_savings: 0,
      cache_hit_probability: 0,
    };
  }

  // Cache hit saves research cost (80% of research cost)
  const researchSavings = baseResearchCost * 0.8;
  const cachedCost = baseEstimate - researchSavings;
  
  // Expected cost considering cache hit probability
  const expectedCost = (cacheHitProbability * cachedCost) + ((1 - cacheHitProbability) * baseEstimate);
  
  return {
    base_estimate: baseEstimate,
    with_cache_estimate: expectedCost,
    potential_savings: baseEstimate - expectedCost,
    cache_hit_probability: cacheHitProbability,
  };
};

export const getTimeEstimate = (
  researchDepth: 'moderate' | 'deep',
  cacheSettings: ResearchCacheSettings
): { min: number; max: number; description: string } => {
  if (cacheSettings.force_fresh_research) {
    const baseTime = researchDepth === 'deep' ? { min: 5, max: 7 } : { min: 4, max: 6 };
    return {
      ...baseTime,
      description: `${baseTime.min}-${baseTime.max} minutes (fresh research)`,
    };
  }

  if (cacheSettings.use_cached_research) {
    const cacheHitProbability = calculateCacheHitProbability(cacheSettings);
    if (cacheHitProbability > 0.7) {
      return {
        min: 2,
        max: 4,
        description: "2-4 minutes (likely cached)",
      };
    }
    if (cacheHitProbability > 0.4) {
      return {
        min: 3,
        max: 5,
        description: "3-5 minutes (mixed cache/fresh)",
      };
    }
  }

  // Default estimates
  const baseTime = researchDepth === 'deep' ? { min: 4, max: 6 } : { min: 3, max: 5 };
  return {
    ...baseTime,
    description: `${baseTime.min}-${baseTime.max} minutes`,
  };
};