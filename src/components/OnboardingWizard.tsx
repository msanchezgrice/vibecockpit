'use client';

import { useState } from 'react';
import { useWizard } from '@/hooks/useWizard';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CodingPlatform } from '@/lib/types';

interface OnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: ProjectFormData) => Promise<void>;
}

interface ProjectFormData {
  name: string;
  description?: string;
  frontendUrl?: string;
  platform: CodingPlatform;
  githubRepo?: string;
}

export function OnboardingWizard({ open, onOpenChange, onComplete }: OnboardingWizardProps) {
  const {
    currentStep,
    formData,
    validationErrors,
    isFirstStep,
    isLastStep,
    progress,
    nextStep,
    prevStep,
    reset,
  } = useWizard({
    steps: 3,
    onComplete: async (data) => {
      await onComplete(data as ProjectFormData);
      reset();
      onOpenChange(false);
    },
  });

  const [loading, setLoading] = useState(false);

  // Step 1 validation - Name and Description
  const validateStep1 = (data: Record<string, any>) => {
    const errors: Record<string, string> = {};
    if (!data.name || data.name.trim() === '') {
      errors.name = 'Project name is required';
    }
    return errors;
  };

  // Step 2 validation - Frontend URL
  const validateStep2 = (data: Record<string, any>) => {
    const errors: Record<string, string> = {};
    if (data.frontendUrl && !data.frontendUrl.match(/^https?:\/\//)) {
      errors.frontendUrl = 'URL must start with http:// or https://';
    }
    return errors;
  };

  // Step 3 validation - Platform and GitHub repo
  const validateStep3 = (data: Record<string, any>) => {
    const errors: Record<string, string> = {};
    if (!data.platform) {
      errors.platform = 'Platform selection is required';
    }
    return errors;
  };

  // Handle form submission for each step
  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formElement = e.target as HTMLFormElement;
    const formData = new FormData(formElement);
    const stepData: Record<string, any> = {};
    
    formData.forEach((value, key) => {
      stepData[key] = value;
    });
    
    // For the last step, show loading state while submitting
    if (isLastStep) {
      setLoading(true);
      
      const result = nextStep(stepData, validateStep3);
      
      if (!result) {
        setLoading(false);
      }
    } else if (currentStep === 0) {
      nextStep(stepData, validateStep1);
    } else if (currentStep === 1) {
      nextStep(stepData, validateStep2);
    }
  };

  // Close and reset the wizard
  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] h-[520px] md:h-auto max-h-screen overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {currentStep === 0 && "Project Details"}
            {currentStep === 1 && "Website URL"}
            {currentStep === 2 && "Development Platform"}
          </DialogTitle>
          
          {/* Progress indicators */}
          <div className="flex gap-2 mt-2 justify-end">
            {[0, 1, 2].map((step) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full ${
                  step === currentStep ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        {/* Step 1: Project Name & Description */}
        {currentStep === 0 && (
          <form onSubmit={handleNext} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="My Awesome Project"
                  defaultValue={formData.name || ''}
                  aria-invalid={!!validationErrors.name}
                  aria-describedby={validationErrors.name ? "name-error" : undefined}
                />
                {validationErrors.name && (
                  <p id="name-error" className="text-sm text-red-500">{validationErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="What's this project about?"
                  defaultValue={formData.description || ''}
                  className="min-h-[100px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit">Next</Button>
            </DialogFooter>
          </form>
        )}

        {/* Step 2: Frontend URL */}
        {currentStep === 1 && (
          <form onSubmit={handleNext} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="frontendUrl">Website URL</Label>
                <Input
                  id="frontendUrl"
                  name="frontendUrl"
                  placeholder="https://myproject.com"
                  defaultValue={formData.frontendUrl || ''}
                  aria-invalid={!!validationErrors.frontendUrl}
                  aria-describedby={validationErrors.frontendUrl ? "url-error" : undefined}
                />
                {validationErrors.frontendUrl && (
                  <p id="url-error" className="text-sm text-red-500">{validationErrors.frontendUrl}</p>
                )}
                <p className="text-sm text-gray-500">Your live demo or production URL</p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={prevStep}>
                Back
              </Button>
              <Button type="submit">Next</Button>
            </DialogFooter>
          </form>
        )}

        {/* Step 3: Platform & GitHub Repo */}
        {currentStep === 2 && (
          <form onSubmit={handleNext} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform">Development Platform <span className="text-red-500">*</span></Label>
                <Select 
                  name="platform" 
                  defaultValue={formData.platform || ''} 
                  aria-invalid={!!validationErrors.platform}
                >
                  <SelectTrigger id="platform">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CodingPlatform.CURSOR}>Cursor</SelectItem>
                    <SelectItem value={CodingPlatform.WINDSURF}>Windsurf</SelectItem>
                    <SelectItem value={CodingPlatform.REPLIT}>Replit</SelectItem>
                    <SelectItem value={CodingPlatform.MANUS}>Manus</SelectItem>
                    <SelectItem value={CodingPlatform.OPENAI_CANVAS}>OpenAI Canvas</SelectItem>
                    <SelectItem value={CodingPlatform.ANTHROPIC_CONSOLE}>Anthropic Console</SelectItem>
                    <SelectItem value={CodingPlatform.OTHER}>Other</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.platform && (
                  <p className="text-sm text-red-500">{validationErrors.platform}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="githubRepo">GitHub Repository</Label>
                <Input
                  id="githubRepo"
                  name="githubRepo"
                  placeholder="username/repo"
                  defaultValue={formData.githubRepo || ''}
                />
                <p className="text-sm text-gray-500">Format: username/repo</p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={prevStep}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => {
                    // Set platform to OTHER if not already selected
                    const skipData = { platform: formData.platform || CodingPlatform.OTHER };
                    nextStep(skipData, validateStep3);
                  }}
                >
                  Skip for now
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
} 