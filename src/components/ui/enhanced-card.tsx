"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"

type CardProps = React.ComponentProps<"div">
import { cn } from "@/lib/utils"

interface EnhancedCardProps extends CardProps {
  hover?: boolean
  delay?: number
}

export function EnhancedCard({ 
  className, 
  hover = true, 
  delay = 0, 
  children, 
  ...props 
}: EnhancedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, 
        delay,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      <Card
        className={cn(
          "transition-all duration-300 ease-out",
          hover && "hover:shadow-lg hover:-translate-y-1 cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </Card>
    </motion.div>
  )
}

export default EnhancedCard