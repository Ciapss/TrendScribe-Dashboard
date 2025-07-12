"use client"

import { motion, MotionProps } from "framer-motion"
import { Button, buttonVariants } from "@/components/ui/button"
import { VariantProps } from "class-variance-authority"

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {
  asChild?: boolean
}
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface EnhancedButtonProps extends ButtonProps {
  loading?: boolean
  icon?: React.ReactNode
  motionProps?: MotionProps
}

export function EnhancedButton({ 
  className,
  loading = false,
  icon,
  children,
  disabled,
  motionProps,
  ...props 
}: EnhancedButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      {...motionProps}
    >
      <Button
        className={cn(
          "transition-all duration-200 ease-out",
          "hover:shadow-md active:shadow-sm",
          "disabled:hover:shadow-none disabled:hover:scale-100",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : icon ? (
          <span className="mr-2">{icon}</span>
        ) : null}
        {children}
      </Button>
    </motion.div>
  )
}

export default EnhancedButton