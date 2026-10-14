/** Category allocations affect reports, never the transaction's account debit. */
export function transactionCategoryAmounts(row: Record<string, unknown>): Map<string, number> {
  const amount = Number(row.amount ?? 0);
  const fallback = new Map([[String(row.category_id ?? ''), amount]]);
  if (row.type === 'transfer' || row.linked_entity_type === 'loans' || row.linked_entity_type === 'loan_payments') return fallback;
  try {
    const split = typeof row.category_splits === 'string' ? JSON.parse(row.category_splits) : row.category_splits;
    if (!split || typeof split !== 'object' || Array.isArray(split)) return fallback;
    const entries = Object.entries(split);
    if (!entries.length || entries.length > 20 || entries.some(([id, value]) => !id || typeof value !== 'number' || !Number.isFinite(value) || value <= 0)) return fallback;
    const total = entries.reduce((sum, [, value]) => sum + Number(value), 0);
    if (!Number.isFinite(total) || total <= 0) return fallback;
    let allocated = 0;
    return new Map(entries.map(([id, value], index) => {
      const share = index === entries.length - 1 ? amount - allocated : amount * Number(value) / total;
      allocated += share;
      return [id, share];
    }));
  } catch {
    return fallback;
  }
}
