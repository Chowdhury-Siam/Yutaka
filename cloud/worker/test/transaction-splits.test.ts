import test from 'node:test';
import assert from 'node:assert/strict';
import { transactionCategoryAmounts, transactionAccountAmounts, transactionScopeAmount } from '../src/transaction-splits.ts';

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

test('account shares conserve posted expense and net income, with combined budget scopes', () => {
  const row = { type: 'expense', amount: 110, base_amount: 100, from_account_id: 'cash', category_id: 'food',
    account_splits: JSON.stringify({ cash: 60, bank: 40 }), category_splits: JSON.stringify({ food: 60, travel: 40 }) };
  assert.deepEqual([...transactionAccountAmounts(row)], [['cash', 66], ['bank', 44]]);
  assert.equal(transactionScopeAmount(row, new Set(['bank']), null), 44);
  assert.equal(transactionScopeAmount(row, new Set(['cash', 'bank']), null), 110);
  assert.equal(transactionScopeAmount(row, new Set(['bank']), new Set(['food'])), 26.4);
  assert.equal(transactionScopeAmount(row, new Set(['missing']), null), 0);
  assert.deepEqual([...transactionAccountAmounts({ ...row, type: 'income', amount: 90 })], [['cash', 54], ['bank', 36]]);
});

test('legacy accounts and invalid, transfer or loan split metadata safely fall back', () => {
  const row = { type: 'expense', amount: 100, from_account_id: 'cash' };
  assert.deepEqual([...transactionAccountAmounts(row)], [['cash', 100]]);
  for (const metadata of ['broken', '{"cash":-1}', '{"cash":"60"}', '[]']) {
    assert.deepEqual([...transactionAccountAmounts({ ...row, account_splits: metadata })], [['cash', 100]]);
  }
  for (const type of ['transfer', 'loan']) {
    assert.deepEqual([...transactionAccountAmounts({ ...row, type,
      linked_entity_type: type === 'loan' ? 'loan_payments' : undefined,
      account_splits: '{"cash":60,"bank":40}' })], [['cash', 100]]);
  }
});
