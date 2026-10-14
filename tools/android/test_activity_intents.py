"""Keep Android lifecycle hooks shared by widget and update integrations."""
import re
import unittest
from pathlib import Path


class ActivityIntentTest(unittest.TestCase):
    def test_lifecycle_signatures_are_unique_and_new_intent_keeps_both_integrations(self):
        activity = (Path(__file__).resolve().parents[2] /
                    'android/app/src/main/kotlin/com/yutaka/siam/MainActivity.kt').read_text()
        signatures = re.findall(r'\boverride\s+fun\s+(\w+)\s*\(([^)]*)\)', activity)
        self.assertEqual(len(signatures), len(set(signatures)), 'Duplicate Android lifecycle override')
        handlers = re.findall(r'override fun onNewIntent\(intent: Intent\) \{([\s\S]*?)\n    \}', activity)
        self.assertEqual(len(handlers), 1)
        handler = handlers[0]
        self.assertEqual(handler.count('super.onNewIntent(intent)'), 1)
        self.assertIn('setIntent(intent)', handler)
        self.assertIn('DirectApkInstaller.onAppResumed(this)', handler)
        self.assertIn('intent.getStringExtra(YutakaWidgetProvider.QUICK_ACTION)', handler)
        self.assertIn('deviceAccessChannel?.invokeMethod("quickAction", action)', handler)
        self.assertLess(handler.index('setIntent(intent)'), handler.index('invokeMethod'))


if __name__ == '__main__':
    unittest.main()
