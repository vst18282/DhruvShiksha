'use client';

import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { downloadTextFile } from '@/lib/utils';

export function PressDownload({ name, body, label, small }: { name: string; body: string; label: string; small?: boolean }) {
  return (
    <Button
      variant={small ? 'ghost' : 'outline'}
      size="sm"
      className={small ? '' : 'mt-3'}
      onClick={() => {
        downloadTextFile(name, body);
        toast.success('Download started (demo)');
      }}
    >
      <Download /> {label}
    </Button>
  );
}
