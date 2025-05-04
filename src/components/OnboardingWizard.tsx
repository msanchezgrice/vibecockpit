'use client';

import { useWizard } from '@/hooks/useWizard';
import { CodingPlatform, CreateProjectPayload } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useState, useEffect, useRef, useMemo } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useSWRConfig } from 'swr';
import { ProjectStatus } from '@/generated/prisma';

// Add gtag type declaration
declare global {
  interface Window {
    gtag?: (command: string, action: string, params?: Record<string, unknown>) => void;
  }
}

interface OnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Form validation helpers
const validators = {
  0: (data: CreateProjectPayload) => !!data.name && data.name.length > 0 && data.name.length <= 60,
  1: (data: CreateProjectPayload) => {
    if (!data.url) return true; // URL is optional
    try {
      const url = new URL(data.url);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  },
  2: (data: CreateProjectPayload) => {
    if (!data.repoUrl) return true; // Repo URL is optional
    return /^[\w-]+\/[\w.-]+$/.test(data.repoUrl);
  },
  3: (data: CreateProjectPayload) => !!data.status // Status is required
};

export function OnboardingWizard({ open, onOpenChange }: OnboardingWizardProps) {
  const [urlValidationStatus, setUrlValidationStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
  const inputRef1 = useRef<HTMLInputElement>(null);
  const inputRef2 = useRef<HTMLInputElement>(null);
  
  // Create inputRefs with useMemo
  const inputRefs = useMemo(() => [inputRef1, inputRef2], [inputRef1, inputRef2]);
  
  const { mutate } = useSWRConfig();

  const wizard = useWizard<CreateProjectPayload>(
    {
      name: '',
      description: '',
      url: '',
      platform: 'CURSOR',
      repoUrl: '',
      status: 'design', // Default to 'design'
    },
    4, // Increase total steps to 4
    validators
  );

  // Handle URL validation
  useEffect(() => {
    let isMounted = true;
    const url = wizard.formData.url;
    
    if (!url) {
      setUrlValidationStatus('idle');
      return;
    }
    
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        setUrlValidationStatus('invalid');
        return;
      }
      
      setUrlValidationStatus('loading');
      
      const checkUrl = async () => {
        try {
          const response = await fetch('/api/validate-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          
          if (isMounted) {
            setUrlValidationStatus(response.ok ? 'valid' : 'invalid');
          }
        } catch {
          if (isMounted) {
            setUrlValidationStatus('invalid');
          }
        }
      };
      
      checkUrl();
    } catch {
      setUrlValidationStatus('invalid');
    }
    
    return () => {
      isMounted = false;
    };
  }, [wizard.formData.url]);

  // Auto-focus first input when step changes
  useEffect(() => {
    if (open) {
      if (wizard.currentStep < inputRefs.length) {
        const currentInputRef = inputRefs[wizard.currentStep]?.current;
        if (currentInputRef) {
          setTimeout(() => {
            currentInputRef.focus();
          }, 100);
        }
      }
    }
  }, [wizard.currentStep, open, inputRefs]);

  // Handle escape key to close dialog
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  // Handle project creation
  const handleCreateProject = async () => {
    try {
      // Clean input data for API
      const formData = { ...wizard.formData };
      
      // Handle URL formatting
      if (formData.url && !formData.url.match(/^https?:\/\//)) {
        formData.url = `https://${formData.url}`;
      }
      
      // Handle empty strings
      Object.keys(formData).forEach(key => {
        if (formData[key] === '') {
          formData[key] = null;
        }
      });
      
      console.log('Creating project with data:', formData);
      
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Project creation API error:', {
          status: response.status,
          statusText: response.statusText,
          error: data
        });
        throw new Error(data.message || `Failed to create project: ${response.status} ${response.statusText}`);
      }
      
      console.log('Project creation successful, response:', data);
      
      // Analytics event
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'onboarding_completed', {
          status: data.status,
          hasRepo: !!wizard.formData.repoUrl
        });
      }
      
      // Update projects list with SWR
      mutate('/api/projects');
      
      toast({
        title: 'Project created successfully!',
        description: data.status === 'prep_launch' ? 'Checklist generation initiated.' : 'Project created.',
      });
      
      // Close the wizard
      onOpenChange(false);
      
      // Reset wizard state
      wizard.resetWizard();
      
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error creating project',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Skip URL step
  const handleSkipUrl = () => {
    wizard.updateFormData({ url: '' });
    wizard.nextStep();
    
    // Analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'onboarding_url_skipped');
    }
  };

  // Render step content based on current step
  const renderStepContent = () => {
    switch (wizard.currentStep) {
      case 0:
        return (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name <span className="text-red-500">*</span></Label>
              <Input
                ref={inputRef1}
                id="name"
                value={wizard.formData.name}
                onChange={(e) => wizard.updateFormData({ name: e.target.value })}
                placeholder="My Awesome Project"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">
                {60 - (wizard.formData.name?.length || 0)} characters remaining
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Tagline (optional)</Label>
              <Textarea
                id="description"
                value={wizard.formData.description || ''}
                onChange={(e) => wizard.updateFormData({ description: e.target.value })}
                placeholder="A short description of your project"
                maxLength={140}
                className="resize-none"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {140 - (wizard.formData.description?.length || 0)} characters remaining
              </p>
            </div>
          </div>
        );
        
      case 1:
        return (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url">Website URL</Label>
              <div className="relative">
                <Input
                  ref={inputRef2}
                  id="url"
                  value={wizard.formData.url || ''}
                  onChange={(e) => wizard.updateFormData({ url: e.target.value })}
                  placeholder="https://yourproject.com"
                  className="pr-10"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {urlValidationStatus === 'loading' && (
                    <div className="animate-spin h-5 w-5 border-2 border-muted rounded-full border-t-primary" />
                  )}
                  {urlValidationStatus === 'valid' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {urlValidationStatus === 'invalid' && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Must start with http:// or https://
              </p>
              {urlValidationStatus === 'invalid' && (
                <p className="text-xs text-red-500">Invalid URL format or unable to reach the URL</p>
              )}
            </div>
            
            <div className="pt-2">
              <Button 
                variant="ghost" 
                className="text-sm text-muted-foreground" 
                onClick={handleSkipUrl}
              >
                Skip for now
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                You can add your URL later once your project is ready.
              </p>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Development Platform</Label>
              <Select
                value={wizard.formData.platform}
                onValueChange={(value) => wizard.updateFormData({ platform: value as CodingPlatform })}
              >
                <SelectTrigger className="w-full" id="platform">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CURSOR">Cursor</SelectItem>
                  <SelectItem value="WINDSURF">Windsurf</SelectItem>
                  <SelectItem value="REPLIT">Replit</SelectItem>
                  <SelectItem value="MANUS">Manus</SelectItem>
                  <SelectItem value="OPENAI_CANVAS">OpenAI Canvas</SelectItem>
                  <SelectItem value="ANTHROPIC_CONSOLE">Anthropic Console</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="repoUrl">GitHub Repository (optional)</Label>
              <div className="flex items-center">
                <span className="bg-muted px-3 py-2 rounded-l-md border border-r-0 border-input text-muted-foreground">
                  github.com/
                </span>
                <Input
                  id="repoUrl"
                  value={wizard.formData.repoUrl || ''}
                  onChange={(e) => wizard.updateFormData({ repoUrl: e.target.value })}
                  placeholder="username/repo"
                  className="rounded-l-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Format: username/repository
              </p>
              {wizard.formData.repoUrl && !validators[2](wizard.formData) && (
                <p className="text-xs text-red-500">Invalid repository format</p>
              )}
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">Project Phase</Label>
              <Select
                value={wizard.formData.status}
                onValueChange={(value) => wizard.updateFormData({ status: value as ProjectStatus })}
              >
                <SelectTrigger className="w-full" id="status">
                  <SelectValue placeholder="Select project phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="prep_launch">Preparing to Launch</SelectItem>
                  <SelectItem value="launched">Launched</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Projects in &quot;Preparing to Launch&quot; phase will automatically get an AI-generated launch checklist.
              </p>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          <DialogTitle>Create your first project</DialogTitle>
          <div className="flex justify-end mt-2 space-x-1">
            {Array.from({ length: wizard.totalSteps }).map((_, i) => (
              <div 
                key={i} 
                className={`h-2 w-2 rounded-full ${
                  i === wizard.currentStep 
                    ? 'bg-primary'
                    : wizard.steps[i]?.completed
                    ? 'bg-green-500' 
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </DialogHeader>
        
        {renderStepContent()}
        
        <div className="flex justify-between mt-4">
          <Button
            variant="outline"
            onClick={wizard.prevStep}
            disabled={!wizard.canGoPrev}
          >
            Back
          </Button>
          
          {wizard.currentStep < wizard.totalSteps - 1 ? (
            <Button
              onClick={wizard.nextStep}
              disabled={!wizard.isCurrentStepValid}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleCreateProject}
              disabled={!wizard.isCurrentStepValid}
            >
              Create Project
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 