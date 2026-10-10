import { describe, it, expect } from 'vitest';
import { formatTransactionForSummary } from '../controllers/aiController.js';

describe('AI Summary Payload Formatter Suite', () => {
  it('correctly maps transaction fields and includes note and description', () => {
    const mockTx = {
      amount: 45.5,
      currency: 'MYR',
      type: 'EXPENSE',
      date: new Date('2026-10-10T12:00:00Z'),
      categoryId: { name: 'Food & Beverage' },
      accountId: { name: 'Maybank Savings' },
      note: 'Village Grocer Bangsar',
      description: 'Weekly organic groceries, milk and eggs'
    };

    const formatted = formatTransactionForSummary(mockTx);

    expect(formatted.amount).toBe(45.5);
    expect(formatted.currency).toBe('MYR');
    expect(formatted.type).toBe('EXPENSE');
    expect(formatted.date).toBe('2026-10-10');
    expect(formatted.category).toBe('Food & Beverage');
    expect(formatted.account).toBe('Maybank Savings');
    expect(formatted.note).toBe('Village Grocer Bangsar');
    expect(formatted.description).toBe('Weekly organic groceries, milk and eggs');
  });

  it('safely handles missing or empty note and description', () => {
    const mockTx = {
      amount: 100,
      currency: 'USD',
      type: 'EXPENSE',
      date: '2026-10-09T08:30:00.000Z',
      categoryId: null,
      accountId: null,
      note: '   ',
      description: ''
    };

    const formatted = formatTransactionForSummary(mockTx);

    expect(formatted.category).toBe('Transfer');
    expect(formatted.account).toBeUndefined();
    expect(formatted.note).toBeUndefined();
    expect(formatted.description).toBeUndefined();
    expect(formatted.date).toBe('2026-10-09');
  });

  it('truncates excessively long notes (50 chars) and descriptions (100 chars) to prevent prompt bloat', () => {
    const longNote = 'A'.repeat(80);
    const longDesc = 'B'.repeat(150);

    const mockTx = {
      amount: 15,
      type: 'EXPENSE',
      date: new Date('2026-10-08T00:00:00Z'),
      note: longNote,
      description: longDesc
    };

    const formatted = formatTransactionForSummary(mockTx);

    expect(formatted.note).toHaveLength(50);
    expect(formatted.note).toBe('A'.repeat(50));
    expect(formatted.description).toHaveLength(100);
    expect(formatted.description).toBe('B'.repeat(100));
  });
});
