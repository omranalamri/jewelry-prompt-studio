'use client';

import { useCallback, useRef, useState } from 'react';

interface UploadZoneProps {
  label: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  onFilesChange: (files: File[]) => void;
  previews?: string[];
  disabled?: boolean;
}

export function UploadZone({
  label,
  multiple = false,
  maxFiles = 1,
  maxSizeMB = 10,
  onFilesChange,
  previews = [],
  disabled = false,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSet = useCallback(
    (files: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(files).slice(0, maxFiles);

      for (const file of fileArray) {
        if (!file.type.startsWith('image/')) {
          setError('Please upload image files only (JPEG, PNG, WebP)');
          return;
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
          setError(`Files must be under ${maxSizeMB}MB`);
          return;
        }
      }

      onFilesChange(fileArray);
    },
    [maxFiles, maxSizeMB, onFilesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      validateAndSet(e.dataTransfer.files);
    },
    [disabled, validateAndSet]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) validateAndSet(e.target.files);
    },
    [validateAndSet]
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        {previews.length > 0 ? (
          <div className="flex gap-3 justify-center flex-wrap">
            {previews.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Preview ${i + 1}`}
                className="w-20 h-20 object-cover rounded-lg border"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Drop {multiple ? 'images' : 'an image'} here or click to upload
            </p>
            <p className="text-xs text-muted-foreground/60">
              JPEG, PNG, WebP up to {maxSizeMB}MB
              {multiple && ` (max ${maxFiles})`}
            </p>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
