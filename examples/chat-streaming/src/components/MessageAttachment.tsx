import React, { useState } from 'react';
import { Download, Eye, File, FileText, Image, Music, Video, X } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface MessageAttachmentProps {
  storageId: Id<"_storage">;
  className?: string;
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return Image;
  if (fileType.startsWith('video/')) return Video;
  if (fileType.startsWith('audio/')) return Music;
  if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) return FileText;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Image Modal Component
const ImageModal: React.FC<{
  src: string;
  alt: string;
  onClose: () => void;
}> = ({ src, alt, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-[90vw] max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-black/90 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};

export const MessageAttachment: React.FC<MessageAttachmentProps> = ({
  storageId,
  className = "",
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Fetch file metadata
  const fileData = useQuery(api.fileUpload.getFileForAI, { storageId });

  const handleDownload = () => {
    if (fileData?.url) {
      const link = document.createElement('a');
      link.href = fileData.url;
      link.download = `file_${storageId}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePreview = () => {
    if (fileData?.url && fileData.contentType?.startsWith('image/')) {
      setSelectedImage(fileData.url);
    }
  };

  if (!fileData) {
    return (
      <div className={`flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 ${className}`}>
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="flex-1">
          <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
          <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const FileIcon = getFileIcon(fileData.contentType || '');
  const isImage = fileData.contentType?.startsWith('image/');
  const isVideo = fileData.contentType?.startsWith('video/');
  const isPdf = fileData.contentType?.includes('pdf');

  const canPreview = isImage || isVideo || isPdf;

  // For images, show a compact preview
  if (isImage && fileData.url) {
    return (
      <>
        <div className={`group relative max-w-xs ${className}`}>
          <img
            src={fileData.url}
            alt={`File ${storageId}`}
            className="rounded-lg max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity border border-gray-200 dark:border-gray-700"
            onClick={handlePreview}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex gap-2">
              <button
                onClick={handlePreview}
                className="p-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors"
              >
                <Eye className="w-4 h-4 text-gray-700" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors"
              >
                <Download className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
            {formatFileSize(fileData.size)}
          </div>
        </div>

        {selectedImage && (
          <ImageModal
            src={selectedImage}
            alt={`File ${storageId}`}
            onClose={() => setSelectedImage(null)}
          />
        )}
      </>
    );
  }

  // For other file types, show a compact file card
  return (
    <div className={`flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors max-w-xs ${className}`}>
      <FileIcon className="w-8 h-8 text-gray-500 dark:text-gray-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
          {fileData.contentType?.split('/')[1]?.toUpperCase() || 'FILE'}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formatFileSize(fileData.size)}
        </div>
      </div>
      <div className="flex gap-1">
        {canPreview && fileData.url && (
          <button
            onClick={handlePreview}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
        {fileData.url && (
          <button
            onClick={handleDownload}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}; 