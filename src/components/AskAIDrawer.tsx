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
import { Sparkles, RotateCcw, Globe, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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
    setIsOpen(false); // Close drawer
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
        } catch (e) {
          // If URL parsing fails, just use the URL as title
        }
        
        urls.push({ url, title });
      }
    }
    
    return urls;
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
        </DrawerHeader>
        
        <div className="p-4 flex-grow overflow-y-auto"> {/* Scrollable content */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-24">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-sm text-muted-foreground">Researching task...</p>
              </div>
            ) : editMode || !isMarkdown ? (
              <Textarea
                value={aiDraft}
                onChange={(e) => setAiDraft(e.target.value)}
                className="h-full min-h-[200px] text-sm bg-muted/50"
                rows={10}
              />
            ) : (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>
                  {aiDraft}
                </ReactMarkdown>
              </div>
            )}
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        <DrawerFooter className="flex-shrink-0 flex-row pt-4 border-t"> {/* Use flex-row */}
             <Button variant="outline" onClick={handleRegenerate} disabled={isLoading} className="mr-auto">
                <RotateCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Regenerate
             </Button>
             
             {isMarkdown && (
               <Button 
                 variant="outline" 
                 onClick={() => setEditMode(!editMode)} 
                 className="ml-2" 
                 disabled={isLoading}
               >
                 {editMode ? 'Preview' : 'Edit'}
               </Button>
             )}
             
            <DrawerClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DrawerClose>
            <Button onClick={handleAccept} disabled={isLoading || !aiDraft || aiDraft.startsWith('Could not')}>Accept & Save</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
} 