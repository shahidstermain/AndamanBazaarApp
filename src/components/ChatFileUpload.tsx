import React, { useState, useRef } from "react";
import { Upload, Image as ImageIcon, File, X, Loader2 } from "lucide-react";
import { storage } from "../lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

interface ChatFileUploadProps {
  chatId: string;
  onFileUploaded: (fileUrl: string, fileType: "image" | "file") => void;
  disabled?: boolean;
}

export const ChatFileUpload: React.FC<ChatFileUploadProps> = ({
  chatId,
  onFileUploaded,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    // Validate file type
    const isImage = file.type.startsWith("image/");
    const isDocument = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ].includes(file.type);

    if (!isImage && !isDocument) {
      alert("Only images and PDF/Word documents are allowed");
      return;
    }

    setSelectedFile(file);
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const isImage = file.type.startsWith("image/");
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `chat-images/${chatId}/${fileName}`);

      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error("Upload error:", error);
          alert("Failed to upload file. Please try again.");
          setUploading(false);
          setSelectedFile(null);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onFileUploaded(downloadURL, isImage ? "image" : "file");
          setUploading(false);
          setSelectedFile(null);
          setUploadProgress(0);

          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        },
      );
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file. Please try again.");
      setUploading(false);
      setSelectedFile(null);
    }
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
        id={`file-upload-${chatId}`}
      />

      {uploading && selectedFile ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {selectedFile.type.startsWith("image/") ? (
                <ImageIcon className="w-4 h-4 text-teal-600" />
              ) : (
                <File className="w-4 h-4 text-teal-600" />
              )}
              <span className="text-sm text-gray-700 truncate">
                {selectedFile.name}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {uploadProgress}% uploaded
            </p>
          </div>
          <button
            onClick={cancelUpload}
            className="p-1 hover:bg-gray-200 rounded"
            title="Cancel upload"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={`file-upload-${chatId}`}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer
            transition-colors duration-150
            ${
              disabled
                ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-teal-500"
            }
          `}
        >
          <Upload className="w-4 h-4" />
          <span className="text-sm font-medium">Share File</span>
        </label>
      )}
    </div>
  );
};
