'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogClose
} from "@/components/ui/dialog";
import { Info } from 'lucide-react';

export function VercelConnectPrompt() {
  const { status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isVercelLinked, setIsVercelLinked] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only run check if user is authenticated
    if (status === 'authenticated') {
      setIsLoading(true);
      fetch('/api/auth/linked-accounts')
        .then(res => res.json())
        .then(data => {
          const linked = data.linkedProviders?.includes('vercel') ?? false;
          setIsVercelLinked(linked);
          // Show prompt only if Vercel is NOT linked
          // We also use sessionStorage to only show it once per browser session
          if (!linked && !sessionStorage.getItem('vercelConnectPromptDismissed')) {
            setShowPrompt(true);
          } else {
              setShowPrompt(false);
          }
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Failed to check linked accounts:", err);
          setIsLoading(false); // Don't show prompt on error
        });
    } else if (status === 'unauthenticated') {
        setIsLoading(false);
        setShowPrompt(false); // Hide if logged out
    }

  }, [status]); // Re-check when auth status changes

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('vercelConnectPromptDismissed', 'true');
  };

  const handleConnect = () => {
    signIn('vercel');
    // Don't dismiss here, let the OAuth flow handle it
    // If they cancel OAuth, the prompt might reappear on next load
  };

  // Don't render anything if loading, already linked, or dismissed
  if (isLoading || isVercelLinked || !showPrompt) {
    return null;
  }

  // Render the prompt as a Dialog
  return (
    <Dialog open={showPrompt} onOpenChange={(open) => !open && handleDismiss()}> 
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
             <Info className="w-5 h-5 mr-2 text-blue-500" />
             Connect Vercel Account
          </DialogTitle>
          <DialogDescription>
            Link your Vercel account to allow Vibe Cockpit to fetch project details, costs, and analytics.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <p className="text-sm text-muted-foreground">
                Clicking connect will redirect you to Vercel to authorize access.
            </p>
        </div>
        <DialogFooter className="sm:justify-start">
           <Button type="button" onClick={handleConnect}>
            Connect Vercel Account
          </Button>
           <DialogClose asChild>
            <Button type="button" variant="secondary" onClick={handleDismiss}>
              Maybe Later
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 