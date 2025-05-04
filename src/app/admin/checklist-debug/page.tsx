'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function ChecklistDebugPage() {
  const [projectId, setProjectId] = useState('');
  const [itemCount, setItemCount] = useState(3);
  const [isLoadingTrigger, setIsLoadingTrigger] = useState(false);
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Setup trigger
  const setupTrigger = async () => {
    if (isLoadingTrigger) return;

    setIsLoadingTrigger(true);
    try {
      const response = await fetch('/api/manual-trigger-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      setResult(data);

      if (response.ok) {
        toast({
          title: 'Success!',
          description: 'Database trigger setup successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to setup trigger',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error setting up trigger:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingTrigger(false);
    }
  };

  // Create test checklist
  const createTestChecklist = async () => {
    if (isLoadingTest || !projectId) return;

    setIsLoadingTest(true);
    try {
      const response = await fetch('/api/create-test-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, itemCount }),
      });

      const data = await response.json();
      setResult(data);

      if (response.ok) {
        toast({
          title: 'Success!',
          description: data.message || 'Test checklist created successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to create test checklist',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating test checklist:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingTest(false);
    }
  };

  return (
    <div className="container mx-auto py-10 space-y-8">
      <h1 className="text-3xl font-bold">Checklist Debug Tools</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Trigger Setup Card */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Database Trigger</CardTitle>
            <CardDescription>
              Manually setup/reset the database trigger that generates checklists
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will create or replace the database trigger that automatically generates
                checklists when a project status is set to &quot;Preparing to Launch&quot;.
              </p>
              
              <Button 
                onClick={setupTrigger} 
                disabled={isLoadingTrigger}
                className="w-full"
              >
                {isLoadingTrigger ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : 'Setup Database Trigger'}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Test Checklist Card */}
        <Card>
          <CardHeader>
            <CardTitle>Create Test Checklist</CardTitle>
            <CardDescription>
              Manually create test checklist items for a project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="projectId">Project ID</Label>
                <Input
                  id="projectId"
                  placeholder="Enter project ID"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  This must be a valid project ID from your database
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="itemCount">Number of Items</Label>
                <Input
                  id="itemCount"
                  type="number"
                  min={1}
                  max={10}
                  value={itemCount}
                  onChange={(e) => setItemCount(parseInt(e.target.value))}
                />
              </div>
              
              <Button
                onClick={createTestChecklist}
                disabled={isLoadingTest || !projectId}
                className="w-full"
              >
                {isLoadingTest ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : 'Create Test Checklist'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Results Display */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>API Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded overflow-auto max-h-[300px]">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 