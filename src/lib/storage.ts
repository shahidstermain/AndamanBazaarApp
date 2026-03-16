import { storage as firebaseStorage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll, getMetadata } from 'firebase/storage';

// ===== STORAGE PROVIDER TYPES =====

// ===== INTERFACES =====

export interface UploadResult {
  url: string;
  path: string;
  name: string;
  size: number;
  contentType: string;
}

export interface StorageFile {
  name: string;
  path: string;
  size: number;
  contentType: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ===== UPLOAD OPERATIONS =====

export const uploadFile = async (
  file: File,
  path: string,
  options?: {
    metadata?: Record<string, any>;
    contentType?: string;
  }
): Promise<UploadResult> => {
  try {
    const storageRef = ref(firebaseStorage, path);
    const metadata = {
      contentType: options?.contentType || file.type,
      customMetadata: options?.metadata || {}
    };
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const url = await getDownloadURL(snapshot.ref);
    return { url, path, name: file.name, size: file.size, contentType: file.type };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

export const uploadListingImages = async (
  files: File[],
  listingId: string
): Promise<UploadResult[]> => {
  const uploadPromises = files.map(async (file, index) => {
    const timestamp = Date.now();
    const path = `listing-images/${listingId}/${timestamp}-${index}-${file.name}`;
    
    return await uploadFile(file, path, {
      metadata: {
        listingId,
        imageIndex: index.toString(),
        uploadedAt: new Date().toISOString()
      }
    });
  });
  
  return await Promise.all(uploadPromises);
};

export const uploadUserAvatar = async (
  file: File,
  userId: string
): Promise<UploadResult> => {
  const timestamp = Date.now();
  const path = `avatars/${userId}/${timestamp}-${file.name}`;
  
  return await uploadFile(file, path, {
    metadata: {
      userId,
      uploadedAt: new Date().toISOString(),
      type: 'avatar'
    }
  });
};

// ===== DOWNLOAD OPERATIONS =====

export const getFileUrl = async (path: string): Promise<string> => {
  try {
    const storageRef = ref(firebaseStorage, path);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error getting file URL:', error);
    throw error;
  }
};

export const getListingImageUrl = async (
  listingId: string,
  imageId: string
): Promise<string> => {
  // Try different path patterns
  const paths = [
    `listing-images/${listingId}/${imageId}`,
    `listing-images/${listingId}/${imageId}.webp`,
    `listing-images/${listingId}/${imageId}.jpg`,
    `listing-images/${listingId}/${imageId}.png`
  ];
  
  for (const path of paths) {
    try {
      return await getFileUrl(path);
    } catch {
      // Try next path
      continue;
    }
  }
  
  throw new Error(`Image not found for listing ${listingId}, image ${imageId}`);
};

export const getUserAvatarUrl = async (userId: string): Promise<string> => {
  // Try different avatar patterns
  const paths = [
    `avatars/${userId}/avatar`,
    `avatars/${userId}/avatar.webp`,
    `avatars/${userId}/avatar.jpg`,
    `avatars/${userId}/avatar.png`,
    `avatars/${userId}/profile`
  ];
  
  for (const path of paths) {
    try {
      return await getFileUrl(path);
    } catch {
      // Try next path
      continue;
    }
  }
  
  // Return default avatar if none found
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
};

// ===== DELETE OPERATIONS =====

export const deleteFile = async (path: string): Promise<void> => {
  try {
    const storageRef = ref(firebaseStorage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

export const deleteListingImages = async (listingId: string): Promise<void> => {
  try {
    const folderRef = ref(firebaseStorage, `listing-images/${listingId}`);
    const { items } = await listAll(folderRef);
    await Promise.all(items.map(item => deleteObject(item)));
  } catch (error) {
    console.error('Error deleting listing images:', error);
    throw error;
  }
};

// ===== METADATA OPERATIONS =====

export const getFileMetadata = async (path: string): Promise<StorageFile> => {
  try {
    const storageRef = ref(firebaseStorage, path);
    const metadata = await getMetadata(storageRef);
    return {
      name: metadata.name,
      path,
      size: metadata.size,
      contentType: metadata.contentType || 'application/octet-stream',
      createdAt: metadata.timeCreated ? new Date(metadata.timeCreated) : undefined,
      updatedAt: metadata.updated ? new Date(metadata.updated) : undefined
    };
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw error;
  }
};

// ===== MIGRATION UTILITIES =====

export const migrateListingImages = async (
  listingId: string,
  images: Array<{ id: string; url: string }>
): Promise<Array<{ id: string; url: string; path: string }>> => {
  const migratedImages = [];
  
  for (const image of images) {
    try {
      // Check if it's a legacy storage URL from pre-Firebase migration
      const isLegacyStorageUrl = image.url.includes('supabase') && image.url.includes('/storage/');
      
      if (isLegacyStorageUrl) {
        // Download from legacy storage and re-upload to Firebase
        const response = await fetch(image.url);
        const blob = await response.blob();
        const file = new File([blob], image.id, { type: blob.type });
        
        // Upload to Firebase
        const path = `listing-images/${listingId}/${image.id}`;
        const uploadResult = await uploadFile(file, path);
        
        migratedImages.push({
          id: image.id,
          url: uploadResult.url,
          path: uploadResult.path
        });
      } else {
        // Already a Firebase URL or external URL
        migratedImages.push({
          id: image.id,
          url: image.url,
          path: '' // No path for external URLs
        });
      }
    } catch (error) {
      console.error(`Failed to migrate image ${image.id}:`, error);
      // Keep original URL on failure
      migratedImages.push({
        id: image.id,
        url: image.url,
        path: ''
      });
    }
  }
  
  return migratedImages;
};

export const migrateUserAvatar = async (
  userId: string,
  avatarUrl: string
): Promise<string> => {
  try {
    // Check if it's a legacy storage URL from pre-Firebase migration
    const isLegacyStorageUrl = avatarUrl.includes('supabase') && avatarUrl.includes('/storage/');
    
    if (isLegacyStorageUrl) {
      // Download from legacy storage and re-upload to Firebase
      const response = await fetch(avatarUrl);
      const blob = await response.blob();
      const file = new File([blob], 'avatar', { type: blob.type });
      
      // Upload to Firebase
      const uploadResult = await uploadUserAvatar(file, userId);
      
      return uploadResult.url;
    } else {
      // Already a Firebase URL or external URL
      return avatarUrl;
    }
  } catch (error) {
    console.error(`Failed to migrate avatar for user ${userId}:`, error);
    // Return original URL on failure
    return avatarUrl;
  }
};

// ===== BATCH OPERATIONS =====

export const batchUploadFiles = async (
  files: Array<{ file: File; path: string }>
): Promise<UploadResult[]> => {
  const uploadPromises = files.map(({ file, path }) => 
    uploadFile(file, path)
  );
  
  return await Promise.all(uploadPromises);
};

export const batchDeleteFiles = async (paths: string[]): Promise<void> => {
  const deletePromises = paths.map(path => deleteFile(path));
  await Promise.all(deletePromises);
};

export default {
  uploadFile,
  uploadListingImages,
  uploadUserAvatar,
  getFileUrl,
  getListingImageUrl,
  getUserAvatarUrl,
  deleteFile,
  deleteListingImages,
  getFileMetadata,
  migrateListingImages,
  migrateUserAvatar,
  batchUploadFiles,
  batchDeleteFiles,
};
