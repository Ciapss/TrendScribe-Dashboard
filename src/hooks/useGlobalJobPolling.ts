'use client';

import { useEffect } from 'react';
import { useJobs } from '@/contexts/JobContext';
import { pollingService } from '@/lib/polling-service';
import type { Job } from '@/types/job';

const POLLING_INTERVAL = 5000; // 5 seconds

export function useGlobalJobPolling() {
  const { setJobs, dispatch } = useJobs();

  useEffect(() => {
    console.log('🔄 useGlobalJobPolling: Setting up job polling subscription');
    
    const unsubscribe = pollingService.subscribe<Job[]>(
      'jobs',
      'jobs',
      (data) => {
        console.log('📡 useGlobalJobPolling: Received job data:', Array.isArray(data) ? data.length : 0, 'jobs');
        setJobs(data);
      },
      POLLING_INTERVAL,
      (error) => {
        console.error('❌ Job polling error:', error);
        // Handle different types of errors more gracefully
        let errorMessage = 'Failed to load jobs';
        if (error.message.includes('timeout')) {
          errorMessage = 'Jobs API is slow to respond. Retrying...';
        } else if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Network connection issue. Retrying...';
        }
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      }
    );

    return unsubscribe;
  }, [setJobs, dispatch]);

  // Manual refresh function
  const manualRefresh = () => {
    console.log('🔄 Manual refresh triggered for jobs');
    pollingService.triggerManualRefresh('jobs');
  };

  return { manualRefresh };
}