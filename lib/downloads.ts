import type { ArchiveItem, Attachment } from '@/types';
import { downloadTextFile, toCsv } from '@/lib/utils';
import { toApa } from '@/lib/cite';
import { toast } from 'sonner';
import { accessState } from '@/lib/access';
import { useAuthStore } from '@/store/auth';
import { useDataStore } from '@/store/data';

/**
 * Demo downloads: generates small local files in the browser (no network).
 * Datasets download real CSV built from their sample rows; other files are text placeholders.
 * SWAP POINT: replace with signed URLs from object storage.
 */
export function downloadItem(item: ArchiveItem, file?: Attachment): boolean {
  // Every download path (detail pages, gallery, chatbot attachments) goes through the same access rules.
  const st = accessState(item, useAuthStore.getState().user, useDataStore.getState().accessRequests);
  if (!st.canDownload) {
    toast.error('Download not available', { description: st.message });
    return false;
  }
  if (item.type === 'dataset' && (!file || file.kind === 'csv')) {
    downloadTextFile(`${item.slug}.csv`, toCsv(item.sampleRows), 'text/csv');
    return true;
  }
  const name = file ? file.name : `${item.slug}.txt`;
  const body = [
    `DhruvShiksha demo download — ${file ? file.name : item.title}`,
    '',
    'This is a placeholder file generated in your browser. In production this would be the original',
    `${file?.kind?.toUpperCase() ?? 'item'} stored in the archive.`,
    '',
    `Title: ${item.title}`,
    `Authors: ${item.authors.join(', ')}`,
    `Year: ${item.year}`,
    `Licence: ${item.licence}`,
    `Credit: ${item.credit}`,
    '',
    'Summary:',
    item.summary,
    '',
    'Cite as:',
    toApa(item),
    '',
    'ALL CONTENT IS FICTIONAL DEMO DATA.',
  ].join('\n');
  downloadTextFile(`${name}.demo.txt`, body);
  return true;
}
