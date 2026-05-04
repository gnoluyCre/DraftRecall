// input: React input props and cn utility; output: minimal input component; pos: UI primitive, update this header and components/README.md when changed.
import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-line bg-white/60 px-3 text-sm outline-none transition focus:border-ink",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
