'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, RotateCcw, Globe, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AskAIModalProps {
  taskId: string;
  taskTitle: string;
  initialHint?: string | null;
  onAccept: (taskId: string, draft: string) => void; // Callback to save accepted draft
}

export function AskAIModal({ 
    taskId, 
    taskTitle,
    initialHint,
    onAccept 
}: AskAIModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState(initialHint ?? 'Loading draft...');
  const [error, setError] = useState<string | null>(null);
  const [isMarkdown, setIsMarkdown] = useState(false);
  const [editMode, setEditMode] = useState(false);

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
        
        const content = result.ai_help_hint || result.ai_image_prompt || 'No suggestion available.';
        setAiDraft(content);
        
        // Check if the content is likely markdown (contains ## or URLs)
        setIsMarkdown(
          content.includes('##') || 
          content.includes('http') || 
          content.includes('Source:') ||
          content.includes('# ')
        );
        setEditMode(false);
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
    setIsOpen(false); // Close modal
  };
  
  // Helper to detect if content contains web search results
  const hasWebSearchResults = (content: string): boolean => {
    return content.includes('Source:') || 
           (content.includes('http') && content.includes('Recommendation'));
  };

  // Extract URLs from content for direct links
  const extractUrls = (content: string): Array<{url: string, title: string}> => {
    const urls: Array<{url: string, title: string}> = [];
    
    // Match Source: URLs - Format: Source: https://example.com
    const sourceRegex = /Source:\s*(https?:\/\/[^\s\n]+)/g;
    let match;
    
    while ((match = sourceRegex.exec(content)) !== null) {
      if (match[1]) {
        // Get a readable domain name as the title
        const url = match[1];
        let title = url;
        try {
          const urlObj = new URL(url);
          title = urlObj.hostname.replace(/^www\./, '');
        } catch {
          // If URL parsing fails, just use the URL as title
        }
        
        urls.push({ url, title });
      }
    }
    
    return urls;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}> 
      <DialogTrigger asChild>
         <Button variant="ghost" size="sm" className="text-xs h-7 text-blue-600 hover:text-blue-700">
            Ask AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center">
             <Sparkles className="w-6 h-6 mr-2 text-purple-500" /> AI Assistant
          </DialogTitle>
          <DialogDescription className="text-base">Drafting help for: &quot;{taskTitle}&quot;</DialogDescription>
          
          {hasWebSearchResults(aiDraft) && !isLoading && (
            <div className="flex items-center mt-2 text-sm text-muted-foreground">
              <Globe className="w-4 h-4 mr-1" /> 
              Includes web search results
            </div>
          )}
          
          {!isLoading && extractUrls(aiDraft).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {extractUrls(aiDraft).map((item, index) => (
                <a 
                  key={index}
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-2 py-1 bg-muted rounded-full text-xs hover:bg-muted/80"
                >
                  {item.title}
                  <ExternalLink className="ml-1 w-3 h-3" />
                </a>
              ))}
            </div>
          )}
        </DialogHeader>
        
        <ScrollArea className="flex-grow my-4 min-h-[350px] border rounded-md p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-36">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-base text-muted-foreground">Researching task...</p>
              </div>
            ) : editMode || !isMarkdown ? (
              <Textarea
                value={aiDraft}
                onChange={({ target }) => setAiDraft(target.value)}
                className="h-full min-h-[300px] text-base bg-muted/50 border-0"
                rows={15}
              />
            ) : (
              <div className="prose prose-base max-w-none">
                <ReactMarkdown>
                  {aiDraft}
                </ReactMarkdown>
              </div>
            )}
            {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 pt-4 border-t flex flex-row justify-between items-center">
             <Button variant="outline" onClick={handleRegenerate} disabled={isLoading} className="mr-auto">
                <RotateCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Regenerate
             </Button>
             
             <div className="flex space-x-2 items-center">
               {isMarkdown && (
                 <Button 
                   variant="outline" 
                   onClick={() => setEditMode(!editMode)}
                   disabled={isLoading}
                 >
                   {editMode ? 'Preview' : 'Edit'}
                 </Button>
               )}
                
               <DialogClose asChild>
                 <Button variant="secondary">Cancel</Button>
               </DialogClose>
               
               <Button onClick={handleAccept} disabled={isLoading || !aiDraft || aiDraft.startsWith('Could not')}>
                 Accept & Save
               </Button>
             </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 