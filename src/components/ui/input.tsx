import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base: neutral so it doesn't force light-mode colours when used on dark pages
          "flex h-10 w-full rounded-lg border px-3 py-2 text-sm",
          "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400",
          "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Allow complete override from parent className
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
