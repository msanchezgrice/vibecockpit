import { useState, useCallback } from 'react';

interface WizardStep {
  isValid: boolean;
  completed: boolean;
}

interface WizardState<T> {
  currentStep: number;
  totalSteps: number;
  formData: T;
  steps: WizardStep[];
}

export function useWizard<T extends Record<string, unknown>>(
  initialData: T,
  totalSteps: number,
  validators?: Record<number, (data: T) => boolean>
) {
  const [state, setState] = useState<WizardState<T>>({
    currentStep: 0,
    totalSteps,
    formData: initialData,
    steps: Array(totalSteps).fill({ isValid: false, completed: false }),
  });

  const updateFormData = useCallback((updates: Partial<T>) => {
    setState((prev) => {
      const newFormData = { ...prev.formData, ...updates };
      const isStepValid = validators?.[prev.currentStep]?.(newFormData) ?? true;
      
      const newSteps = [...prev.steps];
      newSteps[prev.currentStep] = {
        ...newSteps[prev.currentStep],
        isValid: isStepValid
      };
      
      return {
        ...prev,
        formData: newFormData,
        steps: newSteps
      };
    });
  }, [validators]);

  const nextStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep >= prev.totalSteps - 1) return prev;
      
      const newSteps = [...prev.steps];
      newSteps[prev.currentStep] = {
        ...newSteps[prev.currentStep],
        completed: true
      };
      
      return {
        ...prev,
        currentStep: prev.currentStep + 1,
        steps: newSteps
      };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep <= 0) return prev;
      return {
        ...prev,
        currentStep: prev.currentStep - 1
      };
    });
  }, []);

  const resetWizard = useCallback(() => {
    setState({
      currentStep: 0,
      totalSteps,
      formData: initialData,
      steps: Array(totalSteps).fill({ isValid: false, completed: false }),
    });
  }, [initialData, totalSteps]);

  const isCurrentStepValid = state.steps[state.currentStep]?.isValid ?? false;
  
  return {
    currentStep: state.currentStep,
    totalSteps: state.totalSteps,
    formData: state.formData,
    steps: state.steps,
    isCurrentStepValid,
    canGoNext: isCurrentStepValid && state.currentStep < state.totalSteps - 1,
    canGoPrev: state.currentStep > 0,
    updateFormData,
    nextStep,
    prevStep,
    resetWizard
  };
} 