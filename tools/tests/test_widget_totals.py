"""Exercise the actual Android widget SQL against a real SQLite database."""
import re
import sqlite3
import unittest
from pathlib import Path


class WidgetTotalsTest(unittest.TestCase):
    def test_today_uses_one_posted_expense_and_excludes_transfers_and_loans(self):
        source = (Path(__file__).resolve().parents[2] /
                  'android/app/src/main/kotlin/com/yutaka/siam/YutakaWidgetProvider.kt').read_text()
        query = re.search(r'database\.rawQuery\("([^"]+)"', source).group(1)
        with sqlite3.connect(':memory:') as database:
            database.execute('CREATE TABLE transactions(type TEXT, amount REAL, exclude_from_reports INTEGER, created_on INTEGER)')
            database.executemany('INSERT INTO transactions VALUES (?, ?, ?, ?)', [
                ('expense', 110, 0, 1500),  # One split purchase including its fee.
                ('transfer', 110, 0, 1500),
                ('income', 100, 0, 1500),
                ('expense', 999, 1, 1500),  # Loan movement.
                ('expense', 20, 0, 999),
                ('expense', 30, 0, 2000),
            ])
            self.assertEqual(database.execute(query, ('1000', '2000')).fetchone()[0], 110)
            database.execute('DELETE FROM transactions WHERE amount = 110 AND type = \'expense\'')
            self.assertEqual(database.execute(query, ('1000', '2000')).fetchone()[0], 0)
            database.execute('INSERT INTO transactions VALUES (\'expense\', 110, 0, 1500)')
            self.assertEqual(database.execute(query, ('1000', '2000')).fetchone()[0], 110)


if __name__ == '__main__':
    unittest.main()
