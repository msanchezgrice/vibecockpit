'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, RotateCcw } from 'lucide-react';

interface AskAIDrawerProps {
  taskId: string;
  taskTitle: string;
  initialHint?: string | null;
  onAccept: (taskId: string, draft: string) => void; // Callback to save accepted draft
}

export function AskAIDrawer({ 
    taskId, 
    taskTitle,
    initialHint,
    onAccept 
}: AskAIDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState(initialHint ?? 'Loading draft...');
  const [error, setError] = useState<string | null>(null);

  const fetchAIDraft = useCallback(async (isRegenerate = false) => {
    setIsLoading(true);
    setError(null);
    if (!isRegenerate) {
        setAiDraft(initialHint ?? 'Generating draft...');
    } else {
        setAiDraft('Regenerating draft...');
    }

    try {
        const response = await fetch(`/api/ai/tasks/${taskId}/draft`, {
            method: 'POST',
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Failed to fetch/generate AI draft');
        }
        setAiDraft(result.ai_help_hint || result.ai_image_prompt || 'No suggestion available.'); 
    } catch (err: unknown) {
        console.error("AI Draft fetch/generation failed:", err);
        const message = err instanceof Error ? err.message : 'Failed to process AI request';
        setError(message);
        setAiDraft(initialHint ?? 'Error loading draft.');
    } finally {
        setIsLoading(false);
    }
  }, [taskId, initialHint]);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchAIDraft();
    }
  }, [isOpen, taskId, fetchAIDraft]);

  const handleRegenerate = () => fetchAIDraft(true);

  const handleAccept = () => {
    onAccept(taskId, aiDraft); // Pass accepted draft back
    setIsOpen(false); // Close drawer
  };

  return (
    <Drawer direction="right" open={isOpen} onOpenChange={setIsOpen}> 
      <DrawerTrigger asChild>
         <Button variant="ghost" size="sm" className="text-xs h-7 text-blue-600 hover:text-blue-700">
            Ask AI
        </Button>
      </DrawerTrigger>
      <DrawerContent className="w-[80vw] sm:w-[60vw] md:w-[40vw] lg:w-[30vw] xl:w-[24rem] mt-24 h-auto max-h-[calc(100vh-6rem)] flex flex-col"> {/* Right side, width constraints */}
        <DrawerHeader className="flex-shrink-0">
          <DrawerTitle className="flex items-center">
             <Sparkles className="w-5 h-5 mr-2 text-purple-500" /> AI Assistant
          </DrawerTitle>
          <DrawerDescription>Drafting help for: &quot;{taskTitle}&quot;</DrawerDescription>
        </DrawerHeader>
        
        <div className="p-4 flex-grow overflow-y-auto"> {/* Scrollable content */}
            <Textarea
              value={isLoading ? 'Loading...' : aiDraft}
              onChange={(e) => setAiDraft(e.target.value)}
              className="h-full min-h-[200px] text-sm bg-muted/50"
              rows={10}
              disabled={isLoading}
            />
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        <DrawerFooter className="flex-shrink-0 flex-row pt-4 border-t"> {/* Use flex-row */}
             <Button variant="outline" onClick={handleRegenerate} disabled={isLoading} className="mr-auto">
                <RotateCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Regenerate
             </Button>
            <DrawerClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DrawerClose>
            <Button onClick={handleAccept} disabled={isLoading || !aiDraft || aiDraft.startsWith('Could not')}>Accept & Save</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
} 