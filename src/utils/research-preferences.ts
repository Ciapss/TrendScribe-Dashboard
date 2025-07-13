import type { ResearchCacheSettings } from "@/types";

const RESEARCH_PREFERENCES_KEY = "research_cache_preferences";

export const defaultResearchSettings = {
  useCachedResearch: true,
  maxResearchAgeHours: 24,
  forceFreshResearch: false,
};

export const saveResearchPreferences = (settings: ResearchCacheSettings): void => {
  try {
    localStorage.setItem(RESEARCH_PREFERENCES_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("Failed to save research preferences:", error);
  }
};

export const loadResearchPreferences = () => {
  try {
    const stored = localStorage.getItem(RESEARCH_PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ResearchCacheSettings;
      // Convert from API format to form format and validate
      if (
        typeof parsed.use_cached_research === "boolean" &&
        typeof parsed.max_research_age_hours === "number" &&
        parsed.max_research_age_hours >= 1 &&
        parsed.max_research_age_hours <= 168 &&
        typeof parsed.force_fresh_research === "boolean"
      ) {
        return {
          useCachedResearch: parsed.use_cached_research,
          maxResearchAgeHours: parsed.max_research_age_hours,
          forceFreshResearch: parsed.force_fresh_research,
        };
      }
    }
  } catch (error) {
    console.warn("Failed to load research preferences:", error);
  }
  
  return defaultResearchSettings;
};

export const clearResearchPreferences = (): void => {
  try {
    localStorage.removeItem(RESEARCH_PREFERENCES_KEY);
  } catch (error) {
    console.warn("Failed to clear research preferences:", error);
  }
};