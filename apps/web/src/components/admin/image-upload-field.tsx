'use client';

import { useCallback, useRef, useState } from 'react';
import { ImagePlus, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type MediaRecord = { url: string; [key: string]: unknown };

type ImageUploadFieldProps = {
  /** Current image URL (controlled) */
  value: string;
  /** Called with the new URL — either typed manually or after a successful upload */
  onChange: (url: string) => void;
  /** Cloudinary/media folder to upload into, e.g. "products", "categories" */
  folder: string;
  /** Optional label rendered above the field */
  label?: string;
  /** Optional helper text under the field */
  hint?: string;
  className?: string;
  /** Aspect ratio class for the preview box, e.g. "aspect-square" or "aspect-[4/5]" */
  previewClassName?: string;
};

const MAX_FILE_BYTES = 8 * 1024 * 1024; // matches backend limit
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export function ImageUploadField({
  value,
  onChange,
  folder,
  label,
  hint,
  className,
  previewClassName = 'aspect-square',
}: ImageUploadFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error('Unsupported file type — use JPG, PNG, WEBP, GIF or AVIF');
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error('Image is too large — max 8MB');
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const media = await apiClient.post<MediaRecord>(
          `/media/upload?folder=${encodeURIComponent(folder)}`,
          formData,
          { auth: true },
        );
        if (media?.url) {
          onChange(media.url);
          toast.success('Image uploaded');
        } else {
          toast.error('Upload succeeded but no URL was returned');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [folder, onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
      // reset so selecting the same file again still fires onChange
      e.target.value = '';
    },
    [uploadFile],
  );

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <span className="block text-xs font-medium uppercase tracking-wide text-white/45">
          {label}
        </span>
      )}

      <div className="flex gap-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
          className={cn(
            'relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed transition-colors',
            previewClassName,
            isDragging
              ? 'border-primary-glow bg-primary/10'
              : 'border-white/15 bg-black/40 hover:border-white/30',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="hidden"
            onChange={handleFileInput}
          />

          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-white/60" />
          ) : value ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white/80 hover:bg-black hover:text-white"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 text-white/40">
              <ImagePlus className="h-5 w-5" />
              <span className="text-[10px]">Drop or click</span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://… or drop a file"
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 text-xs font-medium text-white/80 transition-colors hover:border-white/30 hover:bg-white/10 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Upload
            </button>
          </div>
          {hint && <p className="text-[11px] text-white/40">{hint}</p>}
        </div>
      </div>
    </div>
  );
          }
            
