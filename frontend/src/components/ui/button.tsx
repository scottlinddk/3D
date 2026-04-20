import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-gray-900 text-white shadow hover:bg-gray-700 active:scale-[0.98] dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100",
        gradient:
          "bg-gradient-to-r from-brand-pink via-brand-purple to-brand-blue text-white shadow-md hover:opacity-90 active:scale-[0.98]",
        outline:
          "border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-[#2a2a2a] dark:bg-[#1c1c1c] dark:text-gray-50 dark:hover:bg-[#252525]",
        ghost:
          "hover:bg-gray-100 text-gray-700 dark:text-gray-300 dark:hover:bg-[#252525]",
        destructive: "bg-red-500 text-white hover:bg-red-600",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
