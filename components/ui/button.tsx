import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, useMotionValue, useSpring } from "framer-motion"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    // Magnetic effect logic
    const isMagnetic = (props as any)["data-magnetic"] !== undefined
    const x = useMotionValue(0)
    const y = useMotionValue(0)
    const springX = useSpring(x, { stiffness: 400, damping: 30 })
    const springY = useSpring(y, { stiffness: 400, damping: 30 })
    React.useEffect(() => {
      if (!isMagnetic) return
      const handleMove = (e: MouseEvent) => {
        const btn = ref && typeof ref !== 'function' && ref.current ? ref.current : null
        if (!btn) return
        const rect = (btn as HTMLElement).getBoundingClientRect()
        const mx = e.clientX - rect.left - rect.width / 2
        const my = e.clientY - rect.top - rect.height / 2
        const dist = Math.sqrt(mx * mx + my * my)
        if (dist < 120) {
          x.set(mx * 0.2)
          y.set(my * 0.2)
        } else {
          x.set(0)
          y.set(0)
        }
      }
      const handleLeave = () => {
        x.set(0)
        y.set(0)
      }
      window.addEventListener("mousemove", handleMove)
      if (ref && typeof ref !== 'function' && ref.current) {
        (ref.current as HTMLElement).addEventListener("mouseleave", handleLeave)
      }
      return () => {
        window.removeEventListener("mousemove", handleMove)
        if (ref && typeof ref !== 'function' && ref.current) {
          (ref.current as HTMLElement).removeEventListener("mouseleave", handleLeave)
        }
      }
    }, [isMagnetic, ref, x, y])
    if (isMagnetic) {
      return (
        <motion.button
          ref={ref}
          style={{ x: springX, y: springY }}
          className={cn(buttonVariants({ variant, size, className }))}
          {...props}
        />
      )
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
