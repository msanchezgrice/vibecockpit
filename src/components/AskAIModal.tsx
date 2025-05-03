'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Sparkles, RotateCcw, Globe, ExternalLink, Maximize2, Code, Eye, Edit, FileText, Copy, Check, Download, SendHorizontal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Input } from "@/components/ui/input";

interface AskAIModalProps {
  taskId: string;
  taskTitle: string;
  initialHint?: string | null;
  taskReasoning?: string | null;
  onAccept: (taskId: string, draft: string) => void; // Callback to save accepted draft
}

export function AskAIModal({ 
    taskId, 
    taskTitle,
    initialHint,
    taskReasoning,
    onAccept 
}: AskAIModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState(initialHint ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isMarkdown, setIsMarkdown] = useState(false);
  const [isHtmlMockup, setIsHtmlMockup] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'code' | 'html'>('preview');
  const [fullscreenPreview, setFullscreenPreview] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([
    { role: 'assistant', content: 'Hi! How may I help you?' }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [hasCachedResult, setHasCachedResult] = useState(!!initialHint);
  
  // Initialize isViewingReasoning based on props - show reasoning view if taskReasoning exists
  const [isViewingReasoning, setIsViewingReasoning] = useState(!!taskReasoning);

  // Fetch new recommendations from OpenAI only if no cached results
  const fetchAIDraft = useCallback(async () => {
    // Remove check for hasCachedResult to allow fetching new recommendations
    // even when there's existing content
    setIsLoading(true);
    setError(null);
    setAiDraft('Generating draft...');

    try {
        const response = await fetch(`/api/ai/tasks/${taskId}/draft`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              taskReasoning
            })
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Failed to fetch/generate AI draft');
        }
        
        const content = result.ai_help_hint || result.ai_image_prompt || 'No suggestion available.';
        setAiDraft(content);
        setHasCachedResult(true); // Mark that we now have a result
        
        // Check if the content is likely markdown (contains ## or URLs)
        setIsMarkdown(
          content.includes('##') || 
          content.includes('http') || 
          content.includes('Source:') ||
          content.includes('# ')
        );
    } catch (err: unknown) {
        console.error("AI Draft fetch/generation failed:", err);
        const message = err instanceof Error ? err.message : 'Failed to process AI request';
        setError(message);
        setAiDraft('');
    } finally {
        setIsLoading(false);
    }
  }, [taskId, taskReasoning]);

  // When modal opens, determine content source and mode
  useEffect(() => {
    if (isOpen) {
      if (initialHint) {
        // Use cached content but keep reasoning state if it exists
        setAiDraft(initialHint);
        setHasCachedResult(true);
        // Only set isViewingReasoning to false if there's no taskReasoning
        if (!taskReasoning) {
          setIsViewingReasoning(false);
        }
        
        setIsMarkdown(
          initialHint.includes('##') || 
          initialHint.includes('http') || 
          initialHint.includes('Source:') ||
          initialHint.includes('# ')
        );
      } else if (taskReasoning) {
        // Show reasoning and "Ask AI for help" button
        setAiDraft(taskReasoning);
        setIsViewingReasoning(true);
        setHasCachedResult(false);
        
        setIsMarkdown(
          taskReasoning.includes('##') || 
          taskReasoning.includes('http') || 
          taskReasoning.includes('Source:') ||
          taskReasoning.includes('# ')
        );
      } else {
        // No content, fetch new recommendations
        setIsViewingReasoning(false);
        fetchAIDraft();
      }
    }
  }, [isOpen, initialHint, taskReasoning, fetchAIDraft]);

  // Initial analysis of the content when it changes
  useEffect(() => {
    if (!aiDraft) return;
    
    // Check if it's likely HTML+CSS content
    const hasCSS = aiDraft.includes(' {') && aiDraft.includes('}') && 
                  (aiDraft.includes('body {') || aiDraft.includes('div {') || 
                   aiDraft.includes('color:') || aiDraft.includes('display:'));
                   
    const hasHTML = aiDraft.includes('<div') || aiDraft.includes('<section') || 
                   aiDraft.includes('<header') || aiDraft.includes('<button');
    
    setIsHtmlMockup(hasCSS && hasHTML);
    
    // Check if the content is likely markdown
    setIsMarkdown(
      aiDraft.includes('##') || 
      aiDraft.includes('http') || 
      aiDraft.includes('Source:') ||
      aiDraft.includes('# ') ||
      hasHTML
    );
    
    // Set initial view mode based on content
    if (hasCSS && hasHTML) {
      setViewMode('html');
    } else if (aiDraft.includes('##') || aiDraft.includes('# ')) {
      setViewMode('preview');
    }
  }, [aiDraft]);

  // Unused but kept for future reference
  const _handleRegenerate = () => fetchAIDraft();

  const handleAccept = () => {
    onAccept(taskId, aiDraft); // Pass accepted draft back to be saved/persisted
    setHasCachedResult(true); // Mark as having cached result now
    setIsOpen(false); // Close modal
  };
  
  // Helper to detect if content contains web search results
  const hasWebSearchResults = (content: string): boolean => {
    return content.includes('Source:') || 
           (content.includes('http') && content.includes('Recommendation'));
  };

  // Preprocess AI response for better HTML rendering
  const processedAiDraft = useMemo(() => {
    if (!aiDraft) return '';
    
    // If the content appears to be HTML+CSS (contains CSS selectors)
    if (aiDraft.includes('{') && aiDraft.includes('}') && 
       (aiDraft.includes('body {') || aiDraft.includes('div {') || aiDraft.includes('.container {'))) {
      
      // Extract CSS and HTML parts
      const parts = aiDraft.split(/\n\s*\n/);
      let cssContent = '';
      let htmlContent = '';
      
      // Process each part
      parts.forEach(part => {
        if (part.includes('{') && part.includes('}') && 
           (part.includes(' {') || part.includes('{ '))) {
          // This looks like CSS
          cssContent += part + '\n';
        } else if (part.trim().length > 0) {
          // This looks like HTML or text content
          htmlContent += part + '\n';
        }
      });
      
      // Return formatted content with style tag
      return `<style>\n${cssContent}\n</style>\n\n${htmlContent}`;
    }
    
    return aiDraft;
  }, [aiDraft]);

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

  // Function to handle copying text to clipboard
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(aiDraft)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text:', err);
      });
  }, [aiDraft]);

  // Function to handle downloading content
  const handleDownload = useCallback(() => {
    const element = document.createElement('a');
    const file = new Blob([aiDraft], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${taskTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_ai_draft.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }, [aiDraft, taskTitle]);

  const handleRefineClick = useCallback(() => {
    // Instead of regenerating, we'll open a chat interface
    setIsChatOpen(true);
  }, []);
  
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim()) return;
    
    // Add user message to chat
    setChatMessages(prev => [...prev, { role: 'user', content: newMessage }]);
    
    // Simulate assistant thinking (in a real implementation, this would call an API)
    setTimeout(() => {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'This is a placeholder response. The chat functionality will be implemented later.' 
      }]);
    }, 1000);
    
    // Clear input
    setNewMessage('');
  }, [newMessage]);

  // Update trigger button text based on content state
  const buttonText = useMemo(() => {
    if (hasCachedResult) return "See Tips";
    if (taskReasoning && !initialHint) return "Ask AI for help";
    return "Ask AI";
  }, [hasCachedResult, taskReasoning, initialHint]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}> 
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs h-7 text-blue-600 hover:text-blue-700">
            {buttonText}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center">
               <Sparkles className="w-6 h-6 mr-2 text-purple-500" /> AI Assistant
            </DialogTitle>
            <DialogDescription className="text-base">
              {isViewingReasoning 
                ? "Task context for: " 
                : "Drafting help for: "
              }
              &quot;{taskTitle}&quot;
            </DialogDescription>
            
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
          
          <ScrollArea className="flex-grow my-4 border rounded-md overflow-hidden">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-36">
                  <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-base text-muted-foreground">Researching task...</p>
                </div>
              ) : viewMode === 'edit' ? (
                <Textarea
                  value={aiDraft}
                  onChange={({ target }) => setAiDraft(target.value)}
                  className="h-full min-h-[300px] text-base bg-muted/50 border-0"
                  rows={15}
                />
              ) : viewMode === 'code' ? (
                <pre className="bg-slate-950 text-slate-50 p-4 rounded-md max-h-[calc(90vh-200px)] overflow-auto">
                  <code>{aiDraft}</code>
                </pre>
              ) : viewMode === 'html' ? (
                <div className="w-full max-h-[calc(90vh-200px)] overflow-auto p-4">
                  <div 
                    className="w-full bg-white rounded" 
                    dangerouslySetInnerHTML={{ __html: processedAiDraft }}
                  />
                </div>
              ) : (
                <div className={`prose prose-base max-w-none p-4 max-h-[calc(90vh-200px)] overflow-auto ${fullscreenPreview ? 'min-h-screen p-8' : ''}`}>
                  <ReactMarkdown 
                    rehypePlugins={[rehypeRaw, [rehypeSanitize, {
                      attributes: {
                        '*': ['style', 'class', 'className'],
                        'div': ['style', 'class', 'className'],
                        'span': ['style', 'class', 'className'],
                        'a': ['href', 'target', 'rel'],
                        'img': ['src', 'alt', 'width', 'height'],
                        'body': ['style'],
                        'header': ['style'],
                        'footer': ['style'],
                        'h1': ['style'],
                        'button': ['style'],
                        'container': ['style'],
                        'content': ['style'],
                        'cta-button': ['style']
                      }
                    }]]}
                    components={{
                      p: (props) => {
                        // Check if the paragraph starts with CSS-like content
                        const content = props.children?.toString() || '';
                        if (content.trim().startsWith('body {') || content.includes(' { ')) {
                          // Wrap CSS-like content in a style tag
                          return (
                            <style dangerouslySetInnerHTML={{__html: content}} />
                          );
                        }
                        return <p {...props} />;
                      }
                    }}
                  >
                    {processedAiDraft}
                  </ReactMarkdown>
                </div>
              )}
              {error && <p className="text-sm text-red-500 mt-4 p-4">{error}</p>}
          </ScrollArea>

          <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t flex flex-row justify-between items-center sticky bottom-0 bg-background z-10">
               <div className="flex items-center space-x-2">
                 {isViewingReasoning && (
                   <Button 
                     variant="default" 
                     onClick={() => {
                       setIsViewingReasoning(false); // Stop viewing reasoning
                       fetchAIDraft(); // Fetch AI recommendations
                     }} 
                     disabled={isLoading}
                     className="bg-blue-600 hover:bg-blue-700 text-white"
                   >
                     <Sparkles className="h-4 w-4 mr-2" /> 
                     Ask AI for help
                   </Button>
                 )}
                 
                 {!isViewingReasoning && (
                   <Button variant="outline" onClick={handleRefineClick} disabled={isLoading}>
                      <RotateCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refine Results
                   </Button>
                 )}
                 
                 {!isLoading && aiDraft && !aiDraft.startsWith('Loading') && !aiDraft.startsWith('Generating') && (
                   <>
                     <Button 
                       variant="outline" 
                       size="icon" 
                       onClick={handleCopy}
                       title="Copy to clipboard"
                     >
                       {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                     </Button>
                     <Button 
                       variant="outline" 
                       size="icon" 
                       onClick={handleDownload}
                       title="Download as text file"
                     >
                       <Download className="h-4 w-4" />
                     </Button>
                   </>
                 )}
               </div>
               
               <div className="flex space-x-2 items-center">
                 {isMarkdown && !isViewingReasoning && (
                   <>
                     <div className="flex border rounded-md overflow-hidden">
                       <Button 
                         variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
                         size="sm"
                         onClick={() => setViewMode('preview')}
                         disabled={isLoading}
                         className="rounded-none border-r"
                       >
                         <Eye className="h-4 w-4 mr-1" /> Preview
                       </Button>
                       {isHtmlMockup && (
                         <Button 
                           variant={viewMode === 'html' ? 'secondary' : 'ghost'}
                           size="sm"
                           onClick={() => setViewMode('html')}
                           disabled={isLoading}
                           className="rounded-none border-r"
                         >
                           <FileText className="h-4 w-4 mr-1" /> HTML
                         </Button>
                       )}
                       <Button 
                         variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
                         size="sm"
                         onClick={() => setViewMode('edit')}
                         disabled={isLoading}
                         className="rounded-none border-r"
                       >
                         <Edit className="h-4 w-4 mr-1" /> Edit
                       </Button>
                       <Button 
                         variant={viewMode === 'code' ? 'secondary' : 'ghost'}
                         size="sm"
                         onClick={() => setViewMode('code')}
                         disabled={isLoading}
                         className="rounded-none"
                       >
                         <Code className="h-4 w-4" />
                       </Button>
                     </div>
                     
                     <Button
                       variant="outline"
                       size="icon"
                       onClick={() => setFullscreenPreview(!fullscreenPreview)}
                       disabled={isLoading || (viewMode !== 'preview' && viewMode !== 'html')}
                       title="Maximize view"
                     >
                       <Maximize2 className="h-4 w-4" />
                     </Button>
                   </>
                 )}
                  
                 <DialogClose asChild>
                   <Button variant="secondary">Cancel</Button>
                 </DialogClose>
                 
                 <Button 
                  onClick={handleAccept} 
                  disabled={isLoading || !aiDraft || aiDraft.startsWith('Could not') || isViewingReasoning}
                 >
                   Save
                 </Button>
               </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Chat dialog for refining results */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Sparkles className="w-6 h-6 mr-2 text-purple-500" /> Refine Results
            </DialogTitle>
            <DialogDescription>
              Chat with AI to refine the recommendations for: &quot;{taskTitle}&quot;
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-grow p-4 border rounded-md my-4">
            <div className="space-y-4">
              {chatMessages.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user' 
                        ? 'bg-blue-500 text-white rounded-br-none' 
                        : 'bg-gray-100 dark:bg-gray-800 rounded-bl-none'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-grow"
            />
            <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChatOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Fullscreen preview dialog - update to be 2x wider */}
      {fullscreenPreview && (
        <Dialog open={fullscreenPreview} onOpenChange={setFullscreenPreview}>
          <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] flex flex-col overflow-hidden">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center">
                <Sparkles className="w-6 h-6 mr-2 text-purple-500" /> Landing Page Preview
              </DialogTitle>
              <DialogDescription className="text-base">
                {taskTitle}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto p-4 bg-white rounded-lg">
              {viewMode === 'html' ? (
                <div 
                  className="w-full h-full bg-white" 
                  dangerouslySetInnerHTML={{ __html: processedAiDraft }}
                />
              ) : (
                <ReactMarkdown 
                  rehypePlugins={[rehypeRaw, [rehypeSanitize, {
                    attributes: {
                      '*': ['style', 'class', 'className'],
                      'div': ['style', 'class', 'className'],
                      'span': ['style', 'class', 'className'],
                      'a': ['href', 'target', 'rel'],
                      'img': ['src', 'alt', 'width', 'height'],
                      'body': ['style'],
                      'header': ['style'],
                      'footer': ['style'],
                      'h1': ['style'],
                      'button': ['style'],
                      'container': ['style'],
                      'content': ['style'],
                      'cta-button': ['style']
                    }
                  }]]}
                  components={{
                    p: (props) => {
                      // Check if the paragraph starts with CSS-like content
                      const content = props.children?.toString() || '';
                      if (content.trim().startsWith('body {') || content.includes(' { ')) {
                        // Wrap CSS-like content in a style tag
                        return (
                          <style dangerouslySetInnerHTML={{__html: content}} />
                        );
                      }
                      return <p {...props} />;
                    }
                  }}
                >
                  {processedAiDraft}
                </ReactMarkdown>
              )}
            </div>
            
            <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t sticky bottom-0 bg-background z-10">
              <div className="flex space-x-2 w-full justify-between">
                <div className="flex items-center space-x-2">
                  {isHtmlMockup && (
                    <div className="flex border rounded-md overflow-hidden mr-4">
                      <Button 
                        variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
                        onClick={() => setViewMode('preview')}
                        size="sm"
                        className="rounded-none border-r"
                      >
                        <Eye className="h-4 w-4 mr-1" /> Preview
                      </Button>
                      <Button 
                        variant={viewMode === 'html' ? 'secondary' : 'ghost'}
                        onClick={() => setViewMode('html')}
                        size="sm"
                        className="rounded-none"
                      >
                        <FileText className="h-4 w-4 mr-1" /> HTML
                      </Button>
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleCopy}
                    title="Copy to clipboard"
                  >
                    {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleDownload}
                    title="Download as text file"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                
                <DialogClose asChild>
                  <Button>Close</Button>
                </DialogClose>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 