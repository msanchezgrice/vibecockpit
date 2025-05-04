'use client';

import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { UploadCloud, X, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadProps {
  onImageUpload: (imageUrl: string) => void;
  currentImageUrl?: string | null;
  className?: string;
}

export function ImageUpload({ onImageUpload, currentImageUrl, className = '' }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Check if the file is an image
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // For now, we're using a simplified API that doesn't actually upload files
      // but returns mock URLs, so we'll skip the FormData creation
      
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload image');
      }

      const data = await response.json();
      setLocalImageUrl(data.imageUrl);
      onImageUpload(data.imageUrl);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setLocalImageUrl(null);
    onImageUpload('');
  };

  return (
    <div className={`w-full ${className}`}>
      {localImageUrl ? (
        <div className="relative w-full h-full flex items-center justify-center">
          <Image 
            src={localImageUrl} 
            alt="Project image"
            className="w-full h-full object-cover rounded-md"
            width={800}
            height={400}
          />
          <Button 
            className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-full p-1 w-8 h-8 flex items-center justify-center"
            onClick={handleRemoveImage}
            type="button"
            size="icon"
            variant="ghost"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Remove image</span>
          </Button>
        </div>
      ) : (
        <div
          className={`
            w-full h-full min-h-[150px] border-2 border-dashed rounded-md flex flex-col items-center justify-center p-6
            ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'}
            ${isUploading ? 'opacity-70' : 'hover:bg-primary/5 hover:border-primary'}
            transition-all cursor-pointer
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-2" />
          ) : (
            <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
          )}
          <div className="text-center">
            <p className="text-sm font-medium">
              {isUploading ? 'Uploading...' : 'Drag & drop or click to upload project image'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG or WebP (max 5MB)
            </p>
            {uploadError && (
              <p className="text-xs text-destructive mt-2">{uploadError}</p>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleFileInputChange}
            disabled={isUploading}
          />
        </div>
      )}
    </div>
  );
} 