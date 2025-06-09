import React from 'react';
import { Download, Eye, File, FileText, Image, Music, Video } from 'lucide-react';

interface FileAttachmentProps {
  fileName: string;
  fileType: string;
  fileSize: number;
  url?: string;
  isLoading?: boolean;
  onDownload?: () => void;
  onPreview?: () => void;
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return Image;
  if (fileType.startsWith('video/')) return Video;
  if (fileType.startsWith('audio/')) return Music;
  if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) return FileText;
  return File;
};

const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
};

export const FileAttachment: React.FC<FileAttachmentProps> = ({
  fileName,
  fileType,
  fileSize,
  url,
  isLoading = false,
  onDownload,
  onPreview,
}) => {
  const FileIcon = getFileIcon(fileType);
  const isImage = fileType.startsWith('image/');
  const isVideo = fileType.startsWith('video/');
  const isPdf = fileType.includes('pdf');

  const canPreview = isImage || isVideo || isPdf;

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="flex-1">
          <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
          <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (isImage && url) {
    return (
      <div className="group relative max-w-sm">
        <img
          src={url}
          alt={fileName}
          className="rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={onPreview}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex gap-2">
            {canPreview && (
              <button
                onClick={onPreview}
                className="p-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors"
              >
                <Eye className="w-4 h-4 text-gray-700" />
              </button>
            )}
            {url && (
              <button
                onClick={onDownload}
                className="p-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors"
              >
                <Download className="w-4 h-4 text-gray-700" />
              </button>
            )}
          </div>
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
          {fileName} ({formatFileSize(fileSize)})
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <FileIcon className="w-8 h-8 text-gray-500 dark:text-gray-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
          {fileName}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {formatFileSize(fileSize)} • {fileType.split('/')[1]?.toUpperCase() || 'FILE'}
        </div>
      </div>
      <div className="flex gap-1">
        {canPreview && url && (
          <button
            onClick={onPreview}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
        {url && (
          <button
            onClick={onDownload}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}; 