'use client';

import { useCallback } from 'react';
import { audit } from '@/lib/mock-api';
import { useInvalidate } from '@/hooks/use-queries';

/** Record an admin action in the audit log and refresh any open audit views. */
export function useAuditLog() {
  const invalidate = useInvalidate();
  return useCallback(
    (action: string, itemType: string, itemTitle: string, details?: string) => {
      audit(action, itemType, itemTitle, { details, module: 'System settings' });
      void invalidate([['audit']]);
    },
    [invalidate],
  );
}
