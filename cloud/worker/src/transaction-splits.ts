/** Split metadata stores base shares; posted shares include proportional fees. */
export function transactionCategoryAmounts(row: Record<string, unknown>): Map<string, number> {
  return transactionAllocations(row, 'category_splits', 'category_id');
}

export function transactionAccountAmounts(row: Record<string, unknown>): Map<string, number> {
  return transactionAllocations(row, 'account_splits', 'from_account_id');
}

export function transactionScopeAmount(row: Record<string, unknown>, accounts: Set<string> | null, categories: Set<string> | null): number {
  const amount = Number(row.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const accountAmount = accounts === null ? amount : [...transactionAccountAmounts(row)]
    .filter(([id]) => accounts.has(id)).reduce((sum, [, share]) => sum + share, 0);
  const categoryAmount = categories === null ? amount : [...transactionCategoryAmounts(row)]
    .filter(([id]) => categories.has(id)).reduce((sum, [, share]) => sum + share, 0);
  return accountAmount * categoryAmount / amount;
}

function transactionAllocations(row: Record<string, unknown>, key: string, fallbackKey: string): Map<string, number> {
  const amount = Number(row.amount ?? 0);
  const fallback = new Map([[String(row[fallbackKey] ?? ''), amount]]);
  if (row.type === 'transfer' || row.linked_entity_type === 'loans' || row.linked_entity_type === 'loan_payments') return fallback;
  try {
    const split = typeof row[key] === 'string' ? JSON.parse(row[key]) : row[key];
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
