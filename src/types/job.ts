
export interface Job {
  id: string;
  job_type: "blog_post_generation" | "trend_discovery" | "bulk_generation" | "scheduled_generation";
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  
  // Request details
  request_data: Record<string, unknown>;
  topic?: string;
  industry?: string;
  
  
  // Timing
  queued_at: Date;
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
  archived_at?: Date;
  
  // Results
  result?: Record<string, unknown>;
  post_id?: string;
  error?: string;
  
  // Metadata
  cost?: number;
  retry_count: number;
  max_retries: number;
  user_id?: string;
}

export interface JobStats {
  total_jobs: number;
  by_status: Record<string, {
    count: number;
    avg_processing_time?: number;
  }>;
  by_type: Record<string, number>;
  queue_size: number;
  processing: number;
}