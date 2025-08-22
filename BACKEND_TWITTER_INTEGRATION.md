# Backend Twitter Integration Guide

## 🎯 **Overview**
The frontend is ready for enhanced Twitter data integration. This document outlines the exact API changes needed to enable rich Twitter features with 3-5x more trending topics and enhanced engagement data.

## 📊 **Current State vs. Target State**

### **Current API Response (Basic)**
```json
{
  "sources": [
    {
      "platform": "twitter",
      "url": "https://twitter.com/user/status/123",
      "title": "Tweet title",
      "engagement_score": 85,
      "mentions": 1500
    }
  ]
}
```

### **Enhanced API Response (Required)**
```json
{
  "sources": [
    {
      "platform": "twitter",
      "url": "https://twitter.com/user/status/123",
      "title": "Tweet title",
      "engagement_score": 85,
      "mentions": 1500,
      
      // NEW: Enhanced Twitter fields
      "id": "1951935325485363238",
      "text": "72+ AI tools to finish months of work...",
      "created_at": "Sun Aug 03 09:17:01 +0000 2025",
      "language": "en",
      "source": "Twitter for Android",
      
      // NEW: Author information
      "author_info": {
        "username": "manishkhosiya",
        "display_name": "Manish Kumar",
        "verified": true,
        "followers_count": 89592,
        "profile_image_url": "https://pbs.twimg.com/profile_images/...",
        "description": "Passionate about AI and career development...",
        "location": null
      },
      
      // NEW: Enhanced metrics
      "metrics": {
        "like_count": 3823,
        "retweet_count": 816,
        "reply_count": 44,
        "quote_count": 11,
        "bookmarks": 5464,
        "views": 549477,
        "total_engagement": 4694
      },
      
      // NEW: Entities
      "entities": {
        "hashtags": ["AI", "ProductivityHacks", "TechTools"],
        "urls": [
          {
            "url": "https://t.co/abc123",
            "expanded_url": "https://example.com/full-link",
            "display_url": "example.com/full-link"
          }
        ],
        "user_mentions": [
          {
            "username": "openai",
            "name": "OpenAI"
          }
        ]
      },
      
      // NEW: Media attachments
      "media": {
        "photo": [
          {
            "media_url_https": "https://pbs.twimg.com/media/...",
            "sizes": {"h": 843, "w": 735}
          }
        ]
      },
      
      // NEW: Quality indicators
      "quality_score": 8.5,
      "is_viral": true
    }
  ]
}
```

## 🔧 **Implementation Requirements**

### **1. Twitter API Data Collection**
The backend needs to collect these additional fields from Twitter API v2:

#### **Tweet Fields**
```python
tweet_fields = [
    "id", "text", "created_at", "lang", "source",
    "public_metrics", "context_annotations", "entities"
]
```

#### **User Fields** 
```python
user_fields = [
    "id", "username", "name", "verified", "public_metrics",
    "profile_image_url", "description", "location"
]
```

#### **Media Fields**
```python
media_fields = [
    "media_key", "type", "url", "preview_image_url", 
    "public_metrics", "width", "height"
]
```

### **2. Data Transformation Logic**

#### **Map Twitter API Response to Enhanced Format**
```python
def transform_twitter_data(tweet_data):
    return {
        # Basic fields (existing)
        "platform": "twitter",
        "url": f"https://twitter.com/{tweet_data['author']['username']}/status/{tweet_data['id']}",
        "title": tweet_data["text"][:100] + "..." if len(tweet_data["text"]) > 100 else tweet_data["text"],
        "engagement_score": calculate_engagement_score(tweet_data["public_metrics"]),
        "mentions": tweet_data["public_metrics"]["retweet_count"] + tweet_data["public_metrics"]["like_count"],
        
        # Enhanced fields (NEW)
        "id": tweet_data["id"],
        "text": tweet_data["text"],
        "created_at": tweet_data["created_at"],
        "language": tweet_data["lang"],
        "source": tweet_data.get("source", "Twitter"),
        
        "author_info": {
            "username": tweet_data["author"]["username"],
            "display_name": tweet_data["author"]["name"],
            "verified": tweet_data["author"]["verified"],
            "followers_count": tweet_data["author"]["public_metrics"]["followers_count"],
            "profile_image_url": tweet_data["author"]["profile_image_url"],
            "description": tweet_data["author"].get("description"),
            "location": tweet_data["author"].get("location")
        },
        
        "metrics": {
            "like_count": tweet_data["public_metrics"]["like_count"],
            "retweet_count": tweet_data["public_metrics"]["retweet_count"],
            "reply_count": tweet_data["public_metrics"]["reply_count"],
            "quote_count": tweet_data["public_metrics"]["quote_count"],
            "bookmarks": tweet_data["public_metrics"].get("bookmark_count", 0),
            "views": tweet_data["public_metrics"].get("impression_count", 0),
            "total_engagement": (
                tweet_data["public_metrics"]["like_count"] +
                tweet_data["public_metrics"]["retweet_count"] +
                tweet_data["public_metrics"]["reply_count"] +
                tweet_data["public_metrics"]["quote_count"] +
                tweet_data["public_metrics"].get("bookmark_count", 0)
            )
        },
        
        "entities": {
            "hashtags": [tag["tag"] for tag in tweet_data.get("entities", {}).get("hashtags", [])],
            "urls": [
                {
                    "url": url["url"],
                    "expanded_url": url["expanded_url"],
                    "display_url": url["display_url"]
                }
                for url in tweet_data.get("entities", {}).get("urls", [])
            ],
            "user_mentions": [
                {
                    "username": mention["username"],
                    "name": mention.get("name", mention["username"])
                }
                for mention in tweet_data.get("entities", {}).get("mentions", [])
            ]
        },
        
        "media": transform_media_data(tweet_data.get("attachments", {})),
        "quality_score": calculate_quality_score(tweet_data),
        "is_viral": is_viral_content(tweet_data["public_metrics"])
    }
```

### **3. Quality Score Calculation**
```python
def calculate_quality_score(tweet_data):
    """Calculate quality score 0-10 based on engagement, author credibility, content"""
    metrics = tweet_data["public_metrics"]
    author = tweet_data["author"]
    
    # Engagement factor (0-4 points)
    total_engagement = metrics["like_count"] + metrics["retweet_count"] + metrics["reply_count"]
    impression_count = metrics.get("impression_count", 1)
    engagement_rate = (total_engagement / impression_count) * 100
    engagement_score = min(engagement_rate * 0.4, 4.0)
    
    # Author credibility (0-3 points)
    credibility_score = 0
    if author["verified"]:
        credibility_score += 1.5
    if author["public_metrics"]["followers_count"] > 100000:
        credibility_score += 1
    if author["public_metrics"]["followers_count"] > 1000000:
        credibility_score += 0.5
    
    # Content quality (0-3 points)
    content_score = 0
    text = tweet_data["text"]
    if len(text) > 50:  # Substantial content
        content_score += 1
    if has_media(tweet_data):  # Visual content
        content_score += 1
    if has_links(tweet_data):  # Reference links
        content_score += 1
    
    total_score = engagement_score + credibility_score + content_score
    return min(total_score, 10.0)
```

### **4. Viral Detection**
```python
def is_viral_content(metrics):
    """Determine if content is viral based on engagement thresholds"""
    views = metrics.get("impression_count", 0)
    total_engagement = (
        metrics["like_count"] + 
        metrics["retweet_count"] + 
        metrics["reply_count"] + 
        metrics["quote_count"]
    )
    
    # Viral thresholds
    if views > 1000000:  # 1M+ views
        return True
    if total_engagement > 10000:  # 10K+ total engagement
        return True
    if views > 0 and (total_engagement / views) > 0.05:  # 5%+ engagement rate
        return True
        
    return False
```

## 🚀 **API Endpoints to Update**

### **1. GET /trends**
Add enhanced Twitter data to all trend sources where `platform = "twitter"`

### **2. GET /trends/discover** 
Include enhanced data in newly discovered Twitter trends

### **3. Filtering Support**
The frontend now supports these additional filters (optional to implement):
```json
{
  "verifiedOnly": true,
  "viralOnly": false,
  "hasMedia": true,
  "minViews": 10000,
  "maxViews": 1000000,
  "minQualityScore": 7.0,
  "maxQualityScore": 10.0
}
```

## 📋 **Testing Checklist**

### **Before Deployment:**
- [ ] Twitter API v2 credentials are configured
- [ ] Enhanced data collection is working for new tweets
- [ ] Data transformation functions are tested
- [ ] Quality score calculation produces reasonable values (0-10)
- [ ] Viral detection works for high-engagement content
- [ ] API response includes all new fields
- [ ] No breaking changes to existing fields

### **After Deployment:**
- [ ] Frontend automatically shows verification badges
- [ ] Engagement metrics display correctly (views, bookmarks, etc.)
- [ ] Quality scores appear with appropriate color coding
- [ ] Viral badges show for high-engagement content
- [ ] Author profiles display with follower counts
- [ ] Media thumbnails appear when available

## 🎯 **Expected Results**

Once implemented, users will immediately see:

1. **3-5x More Trending Topics** - Twitter trends now included
2. **Rich Author Context** - Verification badges, follower counts, profiles
3. **Detailed Engagement Data** - Views, bookmarks, likes, retweets
4. **Quality Assessment** - Color-coded quality scores (0-10)
5. **Viral Content Identification** - 🔥 badges for viral tweets
6. **Media Previews** - Thumbnails for tweets with images
7. **Enhanced Analytics** - Twitter-specific engagement insights

## 💡 **Implementation Priority**

### **Phase 1 (High Priority)**
- Basic enhanced fields: `author_info`, `metrics`, `quality_score`, `is_viral`
- These will enable verification badges, engagement metrics, quality scores

### **Phase 2 (Medium Priority)** 
- Media attachments and entities
- These will enable media thumbnails and hashtag extraction

### **Phase 3 (Low Priority)**
- Advanced filtering support
- These will enable the new filter options in the UI

## 🆘 **Support**

If you need clarification on any of these requirements, the frontend team can provide:
- Sample API responses that work with the current frontend
- Specific field formats expected
- Testing endpoints to validate implementation

The frontend is **100% ready** - once you deploy these API changes, all enhanced Twitter features will automatically activate! 🚀