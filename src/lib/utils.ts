import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Add the reusable date formatting function
export function formatDateTime(date: Date | string | null): string {
  if (!date) return 'N/A';
  // Handle potential string date from serialization
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Invalid Date'; // Check if date is valid
  return dateObj.toLocaleString();
}
