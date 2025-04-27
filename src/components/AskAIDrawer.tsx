'use client';

import { useState } from 'react';
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
  const [aiDraft, setAiDraft] = useState(initialHint ?? 'Could not generate hint.');
  const [error, setError] = useState<string | null>(null);

  // Mock AI generation
  const handleRegenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 750));
        // Generate slightly different mock text
        const newDraft = `Here's another idea for "${taskTitle}": Strategy ${Math.floor(Math.random() * 100)}.

${initialHint ? `Original hint was: ${initialHint}` : 'No initial hint provided.'}`;
        setAiDraft(newDraft);
    } catch (err: unknown) {
        console.error("Regeneration failed:", err);
        setError(err instanceof Error ? err.message : 'Failed to regenerate');
    } finally {
        setIsLoading(false);
    }
  };

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
              readOnly // Make textarea read-only to display draft
              value={isLoading ? 'Generating...' : aiDraft}
              className="h-full min-h-[200px] text-sm bg-muted/50"
              rows={10}
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