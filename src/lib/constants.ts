export const INDUSTRIES = [
  "technology",
  "healthcare",
  "finance",
  "marketing",
  "education",
  "entertainment",
  "sports",
  "business",
  "science",
  "environment",
  "politics",
  "travel",
  "food",
  "fashion",
  "automotive",
  "real-estate",
  "cryptocurrency",
  "ai-ml",
  "cybersecurity",
  "startups"
] as const;

export const INDUSTRY_LABELS: Record<string, string> = {
  "technology": "Technology",
  "healthcare": "Healthcare",
  "finance": "Finance",
  "marketing": "Marketing",
  "education": "Education",
  "entertainment": "Entertainment",
  "sports": "Sports",
  "business": "Business",
  "science": "Science",
  "environment": "Environment",
  "politics": "Politics",
  "travel": "Travel",
  "food": "Food",
  "fashion": "Fashion",
  "automotive": "Automotive",
  "real-estate": "Real Estate",
  "cryptocurrency": "Cryptocurrency",
  "ai-ml": "AI & Machine Learning",
  "cybersecurity": "Cybersecurity",
  "startups": "Startups"
};

export const GENERATION_STEPS = [
  "Trend Discovery",
  "Research",
  "Content Generation",
  "Fact Checking",
  "SEO Optimization"
];

export const LANGUAGES = [
  "en",
  "es", 
  "fr",
  "de",
  "it",
  "pt",
  "zh",
  "ja",
  "ko",
  "ar",
  "ru",
  "hi",
  "nl",
  "sv",
  "pl"
] as const;

export const LANGUAGE_LABELS: Record<string, string> = {
  "en": "English",
  "es": "Spanish",
  "fr": "French", 
  "de": "German",
  "it": "Italian",
  "pt": "Portuguese",
  "zh": "Chinese (Simplified)",
  "ja": "Japanese",
  "ko": "Korean",
  "ar": "Arabic",
  "ru": "Russian",
  "hi": "Hindi",
  "nl": "Dutch",
  "sv": "Swedish",
  "pl": "Polish"
};

export const BLOG_TYPES = [
  "informative",
  "how_to",
  "listicle", 
  "news",
  "opinion",
  "case_study",
  "comparison",
  "review",
  "guide"
] as const;

export const BLOG_TYPE_LABELS: Record<string, string> = {
  "informative": "Informative Article",
  "how_to": "How-To Guide",
  "listicle": "Listicle",
  "news": "News Article",
  "opinion": "Opinion Piece", 
  "case_study": "Case Study",
  "comparison": "Comparison",
  "review": "Review",
  "guide": "Guide"
};

export const API_ENDPOINTS = {
  POSTS: "/api/posts",
  GENERATE: "/api/generate",
  ANALYTICS: "/api/analytics",
  WEBHOOKS: "/api/webhooks",
  API_KEYS: "/api/keys"
} as const;