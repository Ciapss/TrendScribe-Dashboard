'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { pollingService } from '@/lib/polling-service';
import { useAuth } from '@/components/auth/auth-provider';
import type { DashboardStats, BlogPost } from '@/types';

interface CostData {
  today: {
    total_usd: number;
    gemini_usd: number;
    linkup_eur: number;
    services: Record<string, {
      cost: number;
      currency: string;
      currency_symbol: string;
      cost_usd: number;
      requests: number;
      avg_cost_per_request: number;
    }>;
  };
  exchange_rate: {
    eur_to_usd: number;
    last_updated: string;
    source: string;
  };
  weekly_summary: {
    total_cost_usd: number;
    total_requests: number;
    avg_daily_cost_usd: number;
  };
}

interface DataContextType {
  dashboardStats: DashboardStats | null;
  costData: CostData | null;
  recentPosts: BlogPost[];
  loading: {
    dashboardStats: boolean;
    costData: boolean;
    recentPosts: boolean;
  };
  errors: {
    dashboardStats: string | null;
    costData: string | null;
    recentPosts: string | null;
  };
  refreshAll: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [costData, setCostData] = useState<CostData | null>(null);
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState({
    dashboardStats: true,
    costData: isAdmin, // Only show loading for cost data if user is admin
    recentPosts: true,
  });
  const [errors, setErrors] = useState({
    dashboardStats: null as string | null,
    costData: null as string | null,
    recentPosts: null as string | null,
  });

  useEffect(() => {
    // Subscribe to dashboard stats polling
    const unsubscribeDashboard = pollingService.subscribe(
      'dashboard-stats-global',
      'dashboard-stats',
      (data: DashboardStats) => {
        setDashboardStats(data);
        setLoading(prev => ({ ...prev, dashboardStats: false }));
        setErrors(prev => ({ ...prev, dashboardStats: null }));
      },
      60000, // 1 minute - less frequent since it's less critical
      (error: Error) => {
        console.error('Dashboard stats polling error:', error);
        setErrors(prev => ({ ...prev, dashboardStats: 'Failed to load dashboard statistics' }));
        setLoading(prev => ({ ...prev, dashboardStats: false }));
      }
    );

    // Subscribe to cost data polling (only for admin users)
    let unsubscribeCost = () => {};
    if (isAdmin) {
      unsubscribeCost = pollingService.subscribe(
        'cost-data-global',
        'detailed-costs',
        (data: CostData) => {
          setCostData(data);
          setLoading(prev => ({ ...prev, costData: false }));
          setErrors(prev => ({ ...prev, costData: null }));
        },
        30000, // 30 seconds
        (error: Error) => {
          console.error('Cost data polling error:', error);
          setErrors(prev => ({ ...prev, costData: 'Failed to load cost information' }));
          setLoading(prev => ({ ...prev, costData: false }));
        }
      );
    } else {
      // For non-admin users, set cost data to null and loading to false
      setCostData(null);
      setLoading(prev => ({ ...prev, costData: false }));
      console.log('🔒 Cost monitoring not available for non-admin users');
    }

    // Subscribe to recent posts polling (skip initial call to reduce load time)
    const unsubscribeRecentPosts = pollingService.subscribe(
      'recent-posts-global',
      'recent-posts',
      (data: { posts: BlogPost[] }) => {
        // Sort posts by creation date (newest first)
        const sortedPosts = [...data.posts].sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }).slice(0, 5); // Limit to 5 most recent
        
        setRecentPosts(sortedPosts);
        setLoading(prev => ({ ...prev, recentPosts: false }));
        setErrors(prev => ({ ...prev, recentPosts: null }));
      },
      60000, // 1 minute - less frequent for posts
      (error: Error) => {
        console.error('Recent posts polling error:', error);
        setErrors(prev => ({ ...prev, recentPosts: 'Failed to load recent posts' }));
        setLoading(prev => ({ ...prev, recentPosts: false }));
      }
    );
    
    // Set posts loading to false immediately since this is non-critical
    setLoading(prev => ({ ...prev, recentPosts: false }));

    return () => {
      unsubscribeDashboard();
      unsubscribeCost();
      unsubscribeRecentPosts();
    };
  }, [isAdmin]);

  const refreshAll = () => {
    console.log('🔄 Manual refresh triggered for all global data');
    setLoading({ dashboardStats: true, costData: isAdmin, recentPosts: true });
    setErrors({ dashboardStats: null, costData: null, recentPosts: null });
    pollingService.triggerManualRefresh('dashboard-stats-global');
    if (isAdmin) {
      pollingService.triggerManualRefresh('cost-data-global');
    }
    pollingService.triggerManualRefresh('recent-posts-global');
  };

  return (
    <DataContext.Provider
      value={{
        dashboardStats,
        costData,
        recentPosts,
        loading,
        errors,
        refreshAll,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

export function useDashboardStats() {
  const { dashboardStats, loading, errors } = useData();
  return {
    stats: dashboardStats,
    loading: loading.dashboardStats,
    error: errors.dashboardStats,
  };
}

export function useCostData() {
  const { costData, loading, errors } = useData();
  return {
    costData,
    loading: loading.costData,
    error: errors.costData,
  };
}

export function useRecentPosts() {
  const { recentPosts, loading, errors } = useData();
  return {
    posts: recentPosts,
    loading: loading.recentPosts,
    error: errors.recentPosts,
  };
}