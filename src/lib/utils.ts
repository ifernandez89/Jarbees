import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const MAX_MESSAGE_LENGTH = 5000

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
