import test from 'node:test';
import assert from 'node:assert/strict';
import { transactionCategoryAmounts } from '../src/transaction-splits.ts';

test('split reports distribute fees and preserve the one posted total', () => {
  const row = { type: 'expense', category_id: 'food', amount: 110, base_amount: 100,
    category_splits: JSON.stringify({ food: 60, travel: 40 }) };
  const allocations = transactionCategoryAmounts(row);
  assert.equal(allocations.get('food'), 66);
  assert.equal(allocations.get('travel'), 44);
  assert.equal([...allocations.values()].reduce((sum, amount) => sum + amount, 0), 110);
  assert.deepEqual([...transactionCategoryAmounts({ ...row, type: 'income', amount: 90 })], [['food', 54], ['travel', 36]]);
});

test('old rows, loan movements, transfers and malformed splits retain their primary total', () => {
  const row = { type: 'expense', category_id: 'food', amount: 100 };
  for (const metadata of [undefined, '{bad', '{}', '{"food": -5}', '{"food": "100"}']) {
    assert.deepEqual([...transactionCategoryAmounts({ ...row, category_splits: metadata })], [['food', 100]]);
  }
  for (const type of ['transfer', 'loan']) {
    assert.deepEqual([...transactionCategoryAmounts({ ...row, type: type === 'loan' ? 'expense' : type,
      linked_entity_type: type === 'loan' ? 'loan_payments' : undefined,
      category_splits: '{"food": 60, "travel": 40}' })], [['food', 100]]);
  }
});
