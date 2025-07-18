import React, { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { UploadedImage } from '../types';

interface FileUploadProps {
  onImagesUpload: (images: UploadedImage[]) => void;
  uploadedImages: UploadedImage[];
  onRemoveImage: (id: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onImagesUpload, uploadedImages, onRemoveImage }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback(async (files: FileList) => {
    const supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const validFiles = Array.from(files).filter(file => supportedTypes.includes(file.type));
    
    if (validFiles.length === 0) {
      setUploadError('Please upload PNG, JPG, or WEBP images only.');
      return;
    }

    setUploadError(null);
    
    const newImages: UploadedImage[] = [];
    
    for (const file of validFiles) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = url;
      });
      
      const uploadedImage: UploadedImage = {
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        url,
        name: file.name,
        width: img.width,
        height: img.height,
        annotations: [],
      };
      
      newImages.push(uploadedImage);
    }
    
    onImagesUpload(newImages);
  }, [onImagesUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  return (
    <div className="space-y-6">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Drop images here or click to upload
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Support for PNG, JPG, and WEBP formats
        </p>
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
        >
          <Upload className="w-4 h-4 mr-2" />
          Select Images
        </label>
      </div>

      {uploadError && (
        <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{uploadError}</span>
        </div>
      )}

      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {uploadedImages.map((image) => (
            <div key={image.id} className="relative group">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {image.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {image.width} × {image.height}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onRemoveImage(image.id)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;