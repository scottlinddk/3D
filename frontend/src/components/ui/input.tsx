import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900",
      "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-purple",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "dark:border-[#2a2a2a] dark:bg-[#252525] dark:text-gray-50 dark:placeholder:text-gray-500 dark:focus:ring-brand-purple",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
