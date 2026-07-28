'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Copy, Loader2, Trash2, Upload } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type MediaRow = {
  id: string;
  filename: string;
  url: string;
  folder?: string;
  [key: string]: unknown;
};

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_FILE_BYTES = 8 * 1024 * 1024;

export default function AdminMediaPage() {
  const [rows, setRows] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [folder, setFolder] = useState('vyqour');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadMedia = useCallback(() => {
    setLoading(true);
    apiClient
      .get<unknown>('/media', { auth: true })
      .then((res) => {
        if (Array.isArray(res)) setRows(res as MediaRow[]);
        else if (res && typeof res === 'object' && 'data' in (res as object))
          setRows(((res as { data: MediaRow[] }).data) || []);
        else setRows([]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

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
        await apiClient.post(
          `/media/upload?folder=${encodeURIComponent(folder || 'vyqour')}`,
          formData,
          { auth: true },
        );
        toast.success('Image uploaded');
        loadMedia();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [folder, loadMedia],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files || []);
      files.forEach(uploadFile);
    },
    [uploadFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      files.forEach(uploadFile);
      e.target.value = '';
    },
    [uploadFile],
  );

  const copyUrl = (url: string) => {
    navigator.clipboard?.writeText(url).then(
      () => toast.success('URL copied'),
      () => toast.error('Could not copy URL'),
    );
  };

  const removeMedia = async (id: string) => {
    setRemovingId(id);
    try {
      await apiClient.delete(`/media/${id}`, { auth: true });
      toast.success('Deleted');
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-5">
        <h2 className="font-medium mb-4">Upload media</h2>
        <div className="mb-3 flex items-center gap-2">
          <label className="text-xs uppercase text-white/45">Folder</label>
          <input
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="vyqour"
            className="input-field h-9 w-48 text-sm"
          />
        </div>
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
            'flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed transition-colors',
            isDragging
              ? 'border-primary-glow bg-primary/10'
              : 'border-white/15 bg-black/30 hover:border-white/30',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES.join(',')}
            className="hidden"
            onChange={handleFileInput}
          />
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
              <p className="text-sm text-white/60">Uploading…</p>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 text-white/40" />
              <p className="text-sm text-white/60">Drag & drop images here, or click to browse</p>
              <p className="text-xs text-white/35">JPG, PNG, WEBP, GIF, AVIF up to 8MB</p>
            </>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-5 overflow-x-auto">
        <h2 className="font-medium mb-4">Media ({rows.length})</h2>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="pb-3 pr-4">Preview</th>
                <th className="pb-3 pr-4">Filename</th>
                <th className="pb-3 pr-4">URL</th>
                <th className="pb-3 pr-4">Folder</th>
                <th className="pb-3 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="py-3 pr-4">
                    <div className="h-12 w-12 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.url} alt="" className="h-full w-full object-cover" />
                    </div>
                  </td>
                  <td className="py-3 pr-4 max-w-[200px] truncate">{r.filename}</td>
                  <td className="py-3 pr-4 max-w-[260px] truncate text-white/60">{r.url}</td>
                  <td className="py-3 pr-4 text-white/60">{r.folder || '—'}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyUrl(r.url)}
                        className="rounded-full border border-white/15 p-1.5 text-white/60 hover:border-white/30 hover:text-white"
                        aria-label="Copy URL"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMedia(r.id)}
                        disabled={removingId === r.id}
                        className="rounded-full border border-white/15 p-1.5 text-white/60 hover:border-red-400/50 hover:text-red-400 disabled:opacity-50"
                        aria-label="Delete"
                      >
                        {removingId === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && !error && !rows.length && (
          <p className="text-muted-foreground text-sm mt-4">No records yet.</p>
        )}
      </div>
    </div>
  );
          }
      
