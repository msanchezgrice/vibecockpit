'use client';

import { useState } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { NotebookPen } from 'lucide-react'; // Icon for the trigger button

interface NotesDrawerProps {
  projectId: string;
  // We might pass existing notes later
}

export default function NotesDrawer({ projectId }: NotesDrawerProps) {
  const [noteText, setNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSaveNote = async () => {
    if (!noteText.trim() || isSaving) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/changelog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: noteText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save note');
      }

      setSuccessMessage('Note saved successfully!');
      setNoteText(''); // Clear textarea on success
      // Optionally close drawer or refresh data elsewhere
      setTimeout(() => setSuccessMessage(null), 3000); // Clear success message after 3s

    } catch (err: unknown) {
      console.error('Failed to save note:', err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="icon">
          <NotebookPen className="h-4 w-4" />
          <span className="sr-only">Add Note</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle>Add a Note</DrawerTitle>
            <DrawerDescription>Enter your note below. It will be added to the project changelog.</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0">
            <Textarea
              placeholder="Type your note here..."
              value={noteText}
              onChange={(e) => {
                  setNoteText(e.target.value);
                  setError(null); // Clear error when user types
              }}
              rows={5}
              disabled={isSaving}
            />
             {error && <p className="text-xs text-red-500 mt-2">Error: {error}</p>}
             {successMessage && <p className="text-xs text-green-500 mt-2">{successMessage}</p>}
          </div>
          <DrawerFooter>
            <Button onClick={handleSaveNote} disabled={isSaving || !noteText.trim()}>
              {isSaving ? 'Saving...' : 'Save Note'}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
} 