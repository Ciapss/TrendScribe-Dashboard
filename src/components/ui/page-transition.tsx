"use client"

import { ReactNode } from "react"

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <div className="w-full h-full">
      {children}
    </div>
  )
}

// Simple wrapper - no animations
export function FadeIn({ children }: { children: ReactNode; delay?: number }) {
  return <>{children}</>
}

// For backwards compatibility
export const StaggerChildren = ({ children }: { children: ReactNode }) => <>{children}</>
export const FadeInUp = FadeIn
export const ScaleIn = FadeIn