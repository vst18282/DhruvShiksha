'use client';

import { Heart, MessageCircle, Repeat2, Send, Share2, ThumbsUp, Bookmark, Play, MoreHorizontal } from 'lucide-react';
import type { PlatformId, SocialAccount } from '@/types';
import type { StudioImage } from '@/store/studio';
import { StudioThumb } from './attachments';
import { PolarImage } from '@/components/common/polar-image';
import { AiBadge } from '@/components/common';
import { PLATFORM_META } from '@/lib/constants';
import { cn, formatCompact } from '@/lib/utils';

function Avatar({ acc, platform }: { acc?: SocialAccount; platform: PlatformId }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, #0B1F3A, ${PLATFORM_META[platform].color})` }} aria-hidden>
      {(acc?.displayName ?? 'NC').slice(0, 2).toUpperCase()}
    </span>
  );
}

function Media({ images, className }: { images: StudioImage[]; className?: string }) {
  if (!images.length) return <PolarImage variant="aurora" seed="preview" alt="Placeholder visual (no image attached)" className={cn('aspect-video rounded-md', className)} />;
  if (images.length === 1) return <StudioThumb img={images[0]} className={cn('aspect-video w-full rounded-md', className)} />;
  return (
    <div className={cn('grid grid-cols-2 gap-0.5 overflow-hidden rounded-md', className)}>
      {images.slice(0, 4).map((i) => <StudioThumb key={i.id} img={i} className="aspect-square w-full" />)}
    </div>
  );
}

/** Live preview styled after each network (approximation, no real brand assets). */
export function PlatformPreview({ platform, text, parts, images, account, lang }: { platform: PlatformId; text: string; parts?: string[]; images: StudioImage[]; account?: SocialAccount; lang: string }) {
  const limit = PLATFORM_META[platform].limit;
  const over = text.length > limit;
  const handle = account?.handle ?? '@ncpor_demo';
  const name = account?.displayName ?? 'NCPOR (demo)';
  const counter = <span className={cn('text-[10px] tabular-nums', over ? 'font-bold text-destructive' : 'text-muted-foreground')}>{text.length}/{limit}</span>;
  const body = <p lang={lang} className="whitespace-pre-wrap break-words text-[13px] leading-5">{text}</p>;

  switch (platform) {
    case 'instagram':
      return (
        <article className="overflow-hidden rounded-lg border bg-background text-foreground">
          <header className="flex items-center gap-2 p-2"><Avatar acc={account} platform={platform} /><span className="text-xs font-semibold">{handle.replace('@', '')}</span><MoreHorizontal className="ml-auto h-4 w-4" aria-hidden /></header>
          <div className="relative">
            {images.length ? <StudioThumb img={images[0]} className="aspect-square w-full" /> : <PolarImage variant="ice" seed="ig" alt="Carousel slide placeholder" className="aspect-square" />}
            {parts && parts.length > 1 && (
              <>
                <p className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-md bg-black/55 p-3 text-center text-sm font-semibold text-white">{parts[0].replace(/^Slide \d+\/\d+:\s*/, '')}</p>
                <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">1/{parts.length}</span>
              </>
            )}
          </div>
          {parts && parts.length > 1 && <div className="flex justify-center gap-1 py-1.5" aria-hidden>{parts.map((_, i) => <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i === 0 ? 'bg-primary' : 'bg-muted-foreground/40')} />)}</div>}
          <div className="flex gap-3 px-2 pb-1"><Heart className="h-5 w-5" aria-hidden /><MessageCircle className="h-5 w-5" aria-hidden /><Send className="h-5 w-5" aria-hidden /><Bookmark className="ml-auto h-5 w-5" aria-hidden /></div>
          <div className="max-h-40 overflow-y-auto px-2 pb-2"><span className="text-xs font-semibold">{handle.replace('@', '')} </span>{body}</div>
          <footer className="flex justify-end px-2 pb-2">{counter}</footer>
        </article>
      );
    case 'linkedin':
      return (
        <article className="rounded-lg border bg-background p-3 text-foreground">
          <header className="mb-2 flex items-center gap-2"><Avatar acc={account} platform={platform} /><div><p className="text-xs font-semibold">{name}</p><p className="text-[10px] text-muted-foreground">{formatCompact(account?.followers ?? 31500)} followers · Promoted by demo</p></div></header>
          <div className="max-h-48 overflow-y-auto">{body}</div>
          <Media images={images} className="mt-2" />
          <footer className="mt-2 flex items-center gap-4 border-t pt-2 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" aria-hidden />Like</span><span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" aria-hidden />Comment</span><span className="inline-flex items-center gap-1"><Repeat2 className="h-3.5 w-3.5" aria-hidden />Repost</span><span className="ml-auto">{counter}</span></footer>
        </article>
      );
    case 'youtube':
      return (
        <article className="overflow-hidden rounded-lg border bg-background text-foreground">
          <div className="relative"><Media images={images} className="rounded-none" /><span className="absolute inset-0 flex items-center justify-center" aria-hidden><span className="flex h-10 w-14 items-center justify-center rounded-xl bg-[#FF0000] text-white"><Play className="h-5 w-5" /></span></span></div>
          <div className="p-3"><p className="text-xs font-semibold">{name}</p><div className="mt-1 max-h-40 overflow-y-auto">{body}</div><div className="mt-1 text-right">{counter}</div></div>
        </article>
      );
    case 'whatsapp':
      return (
        <article className="rounded-lg border bg-[#e5ddd5] p-3 dark:bg-[#0b141a]">
          <div className="ml-auto max-w-[90%] rounded-lg rounded-tr-none bg-[#dcf8c6] p-2 text-slate-900 shadow-sm dark:bg-[#005c4b] dark:text-white">
            {images[0] && <StudioThumb img={images[0]} className="mb-1 aspect-video w-full rounded" />}
            <p lang={lang} className="whitespace-pre-wrap text-[13px] leading-5">{text.replace(/\*(.+?)\*/g, '$1')}</p>
            <p className="mt-1 text-right text-[10px] opacity-70">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ✓✓ · {text.length}/{limit}</p>
          </div>
        </article>
      );
    case 'facebook':
      return (
        <article className="rounded-lg border bg-background p-3 text-foreground">
          <header className="mb-2 flex items-center gap-2"><Avatar acc={account} platform={platform} /><div><p className="text-xs font-semibold">{name}</p><p className="text-[10px] text-muted-foreground">Just now · 🌐</p></div></header>
          <div className="max-h-48 overflow-y-auto">{body}</div>
          <Media images={images} className="mt-2" />
          <footer className="mt-2 flex items-center gap-4 border-t pt-2 text-[11px] text-muted-foreground"><span>👍 Like</span><span>💬 Comment</span><span className="inline-flex items-center gap-1"><Share2 className="h-3 w-3" aria-hidden />Share</span><span className="ml-auto">{counter}</span></footer>
        </article>
      );
    default:
      return (
        <article className="rounded-lg border bg-background p-3 text-foreground">
          <div className="flex gap-2">
            <Avatar acc={account} platform={platform} />
            <div className="min-w-0 flex-1">
              <p className="text-xs"><span className="font-semibold">{name}</span> <span className="text-muted-foreground">{handle} · now</span></p>
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {parts && parts.length > 1 ? parts.map((p, i) => <p key={i} lang={lang} className={cn('whitespace-pre-wrap break-words text-[13px] leading-5', i > 0 && 'border-l-2 border-muted pl-2')}>{p}</p>) : body}
              </div>
              {images.length > 0 && <Media images={images} className="mt-2" />}
              <footer className="mt-2 flex items-center gap-5 text-muted-foreground"><MessageCircle className="h-3.5 w-3.5" aria-hidden /><Repeat2 className="h-3.5 w-3.5" aria-hidden /><Heart className="h-3.5 w-3.5" aria-hidden /><span className="ml-auto">{counter}</span></footer>
            </div>
          </div>
        </article>
      );
  }
}

export function PreviewLabel() {
  return <AiBadge className="mb-2" label="AI-generated draft · preview" />;
}
