'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { Job } from '@/types/job';
import { pollingService } from '@/lib/polling-service';

interface JobState {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  initialLoaded: boolean;
}

interface JobContextType {
  state: JobState;
  refreshJobs: () => void;
  setJobs: (jobs: Job[]) => void;
  dispatch: React.Dispatch<JobAction>;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

type JobAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_JOBS'; payload: Job[] }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_JOB'; payload: Job }
  | { type: 'SET_INITIAL_LOADED'; payload: boolean };

function jobReducer(state: JobState, action: JobAction): JobState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_JOBS':
      return { 
        ...state, 
        jobs: action.payload, 
        loading: false, 
        error: null, 
        initialLoaded: true 
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'UPDATE_JOB':
      return {
        ...state,
        jobs: state.jobs.map(job => 
          job.id === action.payload.id ? action.payload : job
        )
      };
    case 'SET_INITIAL_LOADED':
      return { ...state, initialLoaded: action.payload };
    default:
      return state;
  }
}

const initialState: JobState = {
  jobs: [],
  loading: true, // Show loading initially
  error: null,
  initialLoaded: false, // Start as not loaded to show spinner
};

export function JobProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(jobReducer, initialState);
  const consecutiveErrors = useRef(0);

  const setJobs = useCallback((jobs: Job[]) => {
    dispatch({ type: 'SET_JOBS', payload: jobs });
    consecutiveErrors.current = 0; // Reset error counter on successful data
    console.log('✅ Jobs updated from polling service:', jobs.length, 'jobs', jobs);
  }, []);

  const refreshJobs = useCallback(() => {
    console.log('🔄 Manual job refresh triggered via polling service');
    pollingService.triggerManualRefresh('jobs');
  }, []);

  useEffect(() => {
    // Reset error state on mount - polling service handles data fetching
    console.log('🔄 JobContext mounted - polling service will handle job data');
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const contextValue: JobContextType = {
    state,
    refreshJobs,
    setJobs,
    dispatch,
  };

  return (
    <JobContext.Provider value={contextValue}>
      {children}
    </JobContext.Provider>
  );
}

export function useJobs() {
  const context = useContext(JobContext);
  if (context === undefined) {
    throw new Error('useJobs must be used within a JobProvider');
  }
  return context;
}