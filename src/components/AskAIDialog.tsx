'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Globe, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AskAIDialogProps {
  taskId: string;
  taskTitle: string;
  initialHint?: string | null;
  onAccept: (taskId: string, draft: string) => void; // Callback to save accepted draft
}

export function AskAIDialog({ 
    taskId, 
    taskTitle,
    initialHint,
    onAccept 
}: AskAIDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState(initialHint ?? 'Loading draft...');
  const [error, setError] = useState<string | null>(null);
  const [isMarkdown, setIsMarkdown] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [hasEdited, setHasEdited] = useState(false);

  const fetchAIDraft = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAiDraft(initialHint ?? 'Generating draft...');

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
        setHasEdited(false);
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

  const handleAccept = () => {
    onAccept(taskId, aiDraft); // Pass accepted draft back
    setIsOpen(false); // Close dialog
  };
  
  const handleContentChange = (value: string) => {
    setAiDraft(value);
    setHasEdited(true);
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
      <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center">
             <Sparkles className="w-5 h-5 mr-2 text-purple-500" /> AI Assistant
          </DialogTitle>
          <DialogDescription>Drafting help for: &quot;{taskTitle}&quot;</DialogDescription>
          
          {hasWebSearchResults(aiDraft) && !isLoading && (
            <div className="flex items-center mt-2 text-xs text-muted-foreground">
              <Globe className="w-3 h-3 mr-1" /> 
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
        
        <div className="p-4 flex-grow overflow-y-auto"> {/* Scrollable content */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-24">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-sm text-muted-foreground">Researching task...</p>
              </div>
            ) : editMode || !isMarkdown ? (
              <Textarea
                value={aiDraft}
                onChange={({ target }) => handleContentChange(target.value)}
                className="h-full min-h-[300px] text-sm bg-muted/50"
                rows={15}
              />
            ) : (
              <div className="prose prose-sm max-w-none min-h-[300px]">
                <ReactMarkdown>
                  {aiDraft}
                </ReactMarkdown>
              </div>
            )}
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        <DialogFooter className="flex-shrink-0 flex-row pt-4 border-t"> {/* Use flex-row */}
             {isMarkdown && (
               <Button 
                 variant="outline" 
                 onClick={() => setEditMode(!editMode)} 
                 className="mr-auto" 
                 disabled={isLoading}
               >
                 {editMode ? 'Preview' : 'Edit'}
               </Button>
             )}
             
             {editMode && hasEdited && (
               <Button 
                 variant="secondary"
                 onClick={handleAccept}
                 className="ml-2"
                 disabled={isLoading}
               >
                 Save
               </Button>
             )}
             
             <Button 
               onClick={handleAccept} 
               disabled={isLoading || !aiDraft || aiDraft.startsWith('Could not')}
               className="ml-2"
             >
               Accept & Save
             </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 