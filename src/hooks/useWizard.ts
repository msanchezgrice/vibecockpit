'use client';

import { useState, useCallback } from 'react';

interface UseWizardOptions {
  steps: number;
  initialStep?: number;
  onComplete?: (data: any) => void;
}

/**
 * A hook for managing multi-step wizard UI flows
 */
export function useWizard({ steps, initialStep = 0, onComplete }: UseWizardOptions) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps - 1;
  const progress = Math.round(((currentStep + 1) / steps) * 100);

  // Navigate to the next step
  const nextStep = useCallback((stepData?: Record<string, any>, validator?: (data: Record<string, any>) => Record<string, string>) => {
    // If there's data to validate
    if (stepData && validator) {
      const errors = validator(stepData);
      
      // If there are validation errors
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return false;
      }
    }

    // Clear validation errors
    setValidationErrors({});
    
    // Update form data if provided
    if (stepData) {
      setFormData(prevData => ({ ...prevData, ...stepData }));
    }

    // If we're on the last step, call onComplete
    if (isLastStep && onComplete) {
      const finalData = { ...formData, ...(stepData || {}) };
      onComplete(finalData);
      return true;
    }

    // Otherwise move to the next step
    setCurrentStep(prev => Math.min(prev + 1, steps - 1));
    return true;
  }, [currentStep, formData, isLastStep, onComplete, steps]);

  // Navigate to the previous step
  const prevStep = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  }, [isFirstStep]);

  // Jump to a specific step
  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < steps) {
      setCurrentStep(step);
    }
  }, [steps]);

  // Reset the wizard
  const reset = useCallback(() => {
    setCurrentStep(initialStep);
    setFormData({});
    setValidationErrors({});
  }, [initialStep]);

  // Update form data
  const updateFormData = useCallback((data: Record<string, any>) => {
    setFormData(prevData => ({ ...prevData, ...data }));
  }, []);

  return {
    currentStep,
    formData,
    validationErrors,
    isFirstStep,
    isLastStep,
    progress,
    nextStep,
    prevStep,
    goToStep,
    reset,
    updateFormData,
  };
} 