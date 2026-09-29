'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ImagePlus, Images, Loader2, Mic, Square, Trash2, Upload, Wand2 } from 'lucide-react';
import type { MediaItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PolarImage } from '@/components/common/polar-image';
import { useStudioStore, type StudioImage } from '@/store/studio';
import { publishedItems, findRef } from '@/lib/archive';
import { suggestMetadata } from '@/lib/mock-ai/suggest';

export function StudioThumb({ img, className }: { img: StudioImage; className?: string }) {
  if (img.galleryId) {
    const m = findRef({ type: 'photo', id: img.galleryId }) as MediaItem | undefined;
    return <PolarImage variant={m?.art ?? 'ice'} seed={img.galleryId} alt={img.altText} className={className} />;
  }
  return <img src={img.url} alt={img.altText} className={`${className ?? ''} object-cover`} />;
}

/* --------------------------------- Images --------------------------------- */

export function ImageAttachments({ sourceTitle }: { sourceTitle?: string }) {
  const { images, addImage, updateImage, removeImage } = useStudioStore();
  const [gallery, setGallery] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const photos = publishedItems().filter((i): i is MediaItem => i.type === 'photo');

  const onFiles = (files: FileList | null) => {
    Array.from(files ?? []).forEach((f) => {
      if (!f.type.startsWith('image/')) return toast.error(`${f.name} is not an image`);
      const url = URL.createObjectURL(f);
      const sugg = suggestMetadata([f.name, sourceTitle ?? ''], 'photo').altText ?? `Image: ${f.name}`;
      addImage({ id: `img-${Date.now()}-${f.name}`, name: f.name, url, altText: '', suggestedAlt: sugg });
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => input.current?.click()}>
          <Upload /> Upload
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setGallery(true)}>
          <Images /> From gallery
        </Button>
        <input ref={input} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} aria-label="Upload images" />
      </div>
      <ul className="space-y-2">
        {images.map((img) => (
          <li key={img.id} className="flex gap-2 rounded-md border p-2">
            <StudioThumb img={img} className="h-14 w-14 shrink-0 rounded" />
            <div className="min-w-0 flex-1 space-y-1">
              <Label htmlFor={`alt-${img.id}`} className="text-xs">
                Alt text for {img.name}
              </Label>
              <Input id={`alt-${img.id}`} value={img.altText} onChange={(e) => updateImage(img.id, { altText: e.target.value })} className="h-8 text-xs" placeholder="Describe the image…" />
              {img.altText !== img.suggestedAlt && (
                <button type="button" className="flex items-center gap-1 text-[11px] text-polar-violet hover:underline" onClick={() => updateImage(img.id, { altText: img.suggestedAlt })}>
                  <Wand2 className="h-3 w-3" aria-hidden /> Use AI suggestion: “{img.suggestedAlt.slice(0, 60)}…”
                </button>
              )}
            </div>
            <Button type="button" size="icon" variant="ghost" onClick={() => removeImage(img.id)} aria-label={`Remove ${img.name}`}>
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      <Dialog open={gallery} onOpenChange={setGallery}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Pick from gallery</DialogTitle>
            <DialogDescription>Gallery images come with captions, credits and alt text.</DialogDescription>
          </DialogHeader>
          <ul className="grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto md:grid-cols-4">
            {photos.map((p) => {
              const on = images.some((i) => i.galleryId === p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      if (on) removeImage(images.find((i) => i.galleryId === p.id)!.id);
                      else addImage({ id: `g-${p.id}`, name: p.title, url: '', altText: p.altText, suggestedAlt: p.altText, galleryId: p.id });
                    }}
                    className={`block w-full overflow-hidden rounded-md border-2 text-left ${on ? 'border-primary' : 'border-transparent'}`}
                  >
                    <PolarImage variant={p.art} seed={p.id} alt={p.altText} className="aspect-square" />
                    <span className="line-clamp-1 p-1 text-[11px]">{p.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
      {images.length === 0 && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <ImagePlus className="h-3.5 w-3.5" aria-hidden /> No images attached.
        </p>
      )}
    </div>
  );
}

/* ------------------------------- Voice notes ------------------------------- */

async function peaksFromBlob(blob: Blob, n = 48): Promise<{ peaks: number[]; duration: number }> {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const data = buf.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / n));
    const peaks = Array.from({ length: n }, (_, i) => {
      let m = 0;
      for (let j = i * step; j < Math.min(data.length, (i + 1) * step); j += 32) m = Math.max(m, Math.abs(data[j]));
      return m;
    });
    const max = Math.max(0.01, ...peaks);
    ctx.close();
    return { peaks: peaks.map((p) => p / max), duration: buf.duration };
  } catch {
    return { peaks: Array.from({ length: n }, (_, i) => 0.3 + Math.abs(Math.sin(i / 3)) * 0.6), duration: 5 };
  }
}

function Waveform({ peaks }: { peaks: number[] }) {
  return (
    <svg viewBox={`0 0 ${peaks.length * 4} 24`} className="h-6 w-full" aria-hidden>
      {peaks.map((p, i) => (
        <rect key={i} x={i * 4} y={12 - p * 11} width="2.5" height={Math.max(1, p * 22)} rx="1" className="fill-primary" />
      ))}
    </svg>
  );
}

export function VoiceNotes({ sourceTitle }: { sourceTitle?: string }) {
  const { voices, addVoice, updateVoice, removeVoice } = useStudioStore();
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [secs, setSecs] = useState(0);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const supported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  const ingest = async (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const { peaks, duration } = await peaksFromBlob(blob);
    const id = `vn-${Date.now()}`;
    addVoice({ id, name, url, durationSec: Math.round(duration), transcript: '', status: 'transcribing', peaks });
    // Simulated transcription (SWAP POINT: speech-to-text API).
    setTimeout(() => {
      updateVoice(id, {
        status: 'ready',
        transcript: `The team saw clear changes this season${sourceTitle ? ` while working on “${sourceTitle.split(':')[0]}”` : ''}. Please mention the whole field team. (Demo transcript — edit me.)`,
      });
    }, 1600);
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timer.current) clearInterval(timer.current);
        ingest(new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' }), `Voice note ${voices.length + 1}`);
        setRec(null);
      };
      mr.start();
      setRec(mr);
      setSecs(0);
      timer.current = setInterval(() => setSecs((s) => s + 1), 1000);
    } catch {
      toast.error('Microphone not available — you can upload an audio file instead.');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {supported &&
          (rec ? (
            <Button type="button" size="sm" variant="destructive" onClick={() => rec.stop()}>
              <Square /> Stop ({secs}s)
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={start}>
              <Mic /> Record
            </Button>
          ))}
        <Button type="button" size="sm" variant="outline" onClick={() => upload.current?.click()}>
          <Upload /> Upload audio
        </Button>
        <input ref={upload} type="file" accept="audio/*" className="sr-only" aria-label="Upload audio file" onChange={(e) => { const f = e.target.files?.[0]; if (f) ingest(f, f.name); }} />
      </div>
      {rec && <p role="status" className="flex items-center gap-2 text-xs text-destructive"><span className="h-2 w-2 animate-pulse rounded-full bg-destructive" aria-hidden /> Recording…</p>}
      <ul className="space-y-2">
        {voices.map((v) => (
          <li key={v.id} className="space-y-1.5 rounded-md border p-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">{v.name}</span>
              <span className="text-[11px] text-muted-foreground">{v.durationSec}s</span>
              <Button type="button" size="icon" variant="ghost" className="ml-auto h-7 w-7" onClick={() => removeVoice(v.id)} aria-label={`Remove ${v.name}`}>
                <Trash2 />
              </Button>
            </div>
            <Waveform peaks={v.peaks} />
            <audio controls src={v.url} className="h-8 w-full" aria-label={`Play ${v.name}`} />
            {v.status === 'transcribing' ? (
              <p className="flex items-center gap-1 text-xs text-muted-foreground" role="status">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Transcribing… (simulated)
              </p>
            ) : (
              <>
                <Label htmlFor={`tr-${v.id}`} className="text-xs">Transcript (editable, feeds generation)</Label>
                <Textarea id={`tr-${v.id}`} rows={2} value={v.transcript} onChange={(e) => updateVoice(v.id, { transcript: e.target.value })} className="text-xs" />
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
