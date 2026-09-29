import { describe, expect, it } from 'vitest';
import { formatCompact } from '@/lib/utils';

describe('formatCompact', () => {
  it('uses K, L (lakh) and Cr (crore) instead of the ambiguous "T"', () => {
    expect(formatCompact(950)).toBe('950');
    expect(formatCompact(38_600)).toBe('38.6K');
    expect(formatCompact(270_000)).toBe('2.7L');
    expect(formatCompact(12_000_000)).toBe('1.2Cr');
    expect(formatCompact(-4_200)).toBe('-4.2K');
  });
});
