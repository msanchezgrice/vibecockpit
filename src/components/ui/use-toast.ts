// Adapted from shadcn/ui
// https://ui.shadcn.com/docs/components/toast

import * as React from "react";

type ToastVariant = "default" | "destructive" | null | undefined;

interface ToastActionElement {
  altText: string;
  element: React.ReactNode;
}

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  action?: ToastActionElement;
}

interface ToastProps {
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

export const toast = ({ title, description, variant }: ToastProps = {}) => {
  // In a real implementation, this would update a context or state
  // For this implementation, just use console.log
  console.log(`Toast: ${variant || 'default'} - ${title || ''} - ${description || ''}`);
  
  // Return a fake toast object for compatibility
  return {
    id: Date.now().toString(),
    title,
    description,
    variant,
    dismiss: () => {},
    update: () => {},
  };
}; 