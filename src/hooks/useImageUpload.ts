import { useState, useCallback } from 'react';
import { compressImage } from '../lib/utils';
import { validateFileUpload } from '../lib/validation';
import { useToast } from '../components/Toast';

export interface UploadItem {
  id: string;
  file?: File;
  preview: string;
  status: 'pending' | 'compressing' | 'ready' | 'uploading' | 'error' | 'success';
  progress: number;
  error?: string;
  retryCount: number;
}

interface UseImageUploadOptions {
  maxFiles?: number;
  maxSizeMB?: number;
  onUploadComplete?: (urls: string[]) => void;
}

export const useImageUpload = ({ maxFiles = 8, maxSizeMB = 10 }: UseImageUploadOptions = {}) => {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const { showToast } = useToast();

  const addFiles = useCallback(async (files: File[]) => {
    const currentCount = uploads.length;
    const remainingSlots = maxFiles - currentCount;
    
    if (remainingSlots <= 0) {
      showToast(`Maximum ${maxFiles} photos allowed`, 'error');
      return;
    }

    const newUploads: UploadItem[] = files.slice(0, remainingSlots).map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
      retryCount: 0,
    }));

    setUploads(prev => [...prev, ...newUploads]);
    
    // Process each new file
    newUploads.forEach(processFile);
  }, [uploads.length, maxFiles]);

  const processFile = async (item: UploadItem) => {
    if (!item.file) return;

    updateUpload(item.id, { status: 'compressing', progress: 10 });

    try {
      // Validate
      const validation = validateFileUpload(item.file, { maxSizeMB });
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Compress
      const compressed = await compressImage(item.file);
      updateUpload(item.id, { 
        file: compressed, 
        status: 'ready', 
        progress: 100,
        preview: URL.createObjectURL(compressed) // Update preview with compressed version
      });
    } catch (error) {
      console.error('Image processing failed:', error);
      updateUpload(item.id, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Compression failed',
        progress: 0 
      });
    }
  };

  const updateUpload = (id: string, updates: Partial<UploadItem>) => {
    setUploads(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeUpload = (id: string) => {
    setUploads(prev => {
      const item = prev.find(p => p.id === id);
      if (item?.preview.startsWith('blob:')) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter(p => p.id !== id);
    });
  };

  const retryUpload = (id: string) => {
    const item = uploads.find(p => p.id === id);
    if (item && item.file) {
      updateUpload(id, { status: 'pending', error: undefined, retryCount: item.retryCount + 1 });
      processFile(item);
    }
  };

  return {
    uploads,
    addFiles,
    removeUpload,
    retryUpload,
    setUploads
  };
};
