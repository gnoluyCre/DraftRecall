// input: clsx and tailwind-merge; output: cn class composer; pos: UI utility, update this header and lib/README.md when changed.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
