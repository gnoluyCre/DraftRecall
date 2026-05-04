// input: React textarea props and cn utility; output: minimal textarea component; pos: UI primitive, update this header and components/README.md when changed.
import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-40 w-full resize-none rounded-md border border-line bg-white/60 p-3 text-sm leading-6 outline-none transition focus:border-ink",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
