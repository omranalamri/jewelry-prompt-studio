'use client';

import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, ImageIcon } from 'lucide-react';

interface UploadZoneProps {
  label: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  onFilesChange: (files: File[]) => void;
  previews?: string[];
  disabled?: boolean;
  onRemove?: () => void;
}

export function UploadZone({
  label,
  multiple = false,
  maxFiles = 1,
  maxSizeMB = 10,
  onFilesChange,
  previews = [],
  disabled = false,
  onRemove,
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
      <motion.div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        whileHover={disabled ? {} : { scale: 1.01 }}
        whileTap={disabled ? {} : { scale: 0.99 }}
        className={`
          relative border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden
          ${previews.length > 0 ? 'p-3' : 'p-8'}
          ${isDragging ? 'border-gold bg-gold/5 shadow-lg' : 'border-muted-foreground/20 hover:border-gold/40 hover:bg-accent/30'}
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

        <AnimatePresence mode="wait">
          {previews.length > 0 ? (
            <motion.div
              key="previews"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-3 flex-wrap"
            >
              {previews.map((src, i) => (
                <div key={i} className="relative group">
                  <img
                    src={src}
                    alt={`Preview ${i + 1}`}
                    className="h-24 w-24 object-cover rounded-xl border shadow-sm"
                  />
                  {onRemove && i === 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                      }}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {multiple && previews.length < maxFiles && (
                <div className="h-24 w-24 rounded-xl border-2 border-dashed flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <Upload className="h-5 w-5" />
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="h-14 w-14 rounded-2xl bg-muted/80 flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drop {multiple ? 'images' : 'an image'} here or click to upload
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPEG, PNG, WebP up to {maxSizeMB}MB
                  {multiple && ` (max ${maxFiles})`}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drag overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gold/5 backdrop-blur-[2px] flex items-center justify-center rounded-2xl"
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-gold" />
                <span className="text-sm font-medium text-gold-dark dark:text-gold-light">Drop here</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
