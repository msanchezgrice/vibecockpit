'use client';

import { signIn } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import { Github } from 'lucide-react';

interface GitHubSignInButtonProps {
  className?: string;
}

export function GitHubSignInButton({ className = '' }: GitHubSignInButtonProps) {
  const handleSignIn = () => {
    signIn('github', { callbackUrl: '/dashboard' });
  };

  return (
    <Button 
      onClick={handleSignIn}
      className={className}
    >
      <Github className="mr-2 h-4 w-4" />
      Sign in with GitHub
    </Button>
  );
} 