// input: React button props and cn utility; output: minimal button component; pos: UI primitive, update this header and components/README.md when changed.
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "solid" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "solid", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border text-sm font-medium transition active:scale-[.99] disabled:pointer-events-none disabled:opacity-40",
        variant === "solid" && "border-ink bg-ink text-paper hover:bg-neutral-800",
        variant === "ghost" && "border-transparent bg-transparent text-ink hover:bg-black/5",
        variant === "danger" && "border-signal bg-signal text-white hover:bg-red-700",
        variant === "outline" && "border-line bg-transparent text-ink hover:bg-black/5",
        size === "sm" && "h-8 px-3",
        size === "md" && "h-10 px-4",
        size === "icon" && "h-10 w-10",
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
