'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { OnboardingWizard } from '@/components/OnboardingWizard';

export function OnboardingClient() {
  const [wizardOpen, setWizardOpen] = useState(false);
  
  return (
    <div className="mt-8">
      <Button onClick={() => setWizardOpen(true)} className="flex items-center gap-2">
        <PlusCircle className="h-4 w-4" />
        Create Project
      </Button>
      
      <OnboardingWizard 
        open={wizardOpen} 
        onOpenChange={setWizardOpen} 
      />
    </div>
  );
} 