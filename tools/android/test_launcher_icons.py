"""Check themed launcher resources without requiring the Android SDK."""
from pathlib import Path
import re
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
RES = ROOT / 'android/app/src/main/res'
ANDROID = '{http://schemas.android.com/apk/res/android}'
SVG = '{http://www.w3.org/2000/svg}'


class LauncherIconTest(unittest.TestCase):
    def test_both_themed_icons_resolve_to_the_padded_brand_mark(self):
        for name in ('ic_launcher', 'ic_launcher_round'):
            icon = ET.parse(RES / f'mipmap-anydpi-v26/{name}.xml').getroot()
            reference = icon.find('monochrome').get(ANDROID + 'drawable')
            self.assertEqual(reference, '@drawable/ic_launcher_monochrome')
            vector = ET.parse(RES / (reference[1:] + '.xml')).getroot()
            group = vector.find('group')
            self.assertEqual(float(group.get(ANDROID + 'scaleX')), 0.75)
            self.assertEqual(float(group.get(ANDROID + 'scaleY')), 0.75)
            self.assertEqual(float(group.get(ANDROID + 'translateX')), 128)
            self.assertEqual(float(group.get(ANDROID + 'translateY')), 120.5)
            # Compare the actual brand geometry, excluding highlight/stroke paths.
            logo = ET.parse(ROOT / 'assets/icons/yutaka_logo.svg').getroot()
            outlines = [p.get('d') for p in logo.iter(SVG + 'path')
                        if p.get('fill', '').startswith('url(')
                        and p.get('fill') != 'url(#frontHighlight)']
            paths = list(group)
            normalize = lambda d: re.findall(r'[A-Za-z]|-?(?:\d*\.)?\d+', d)
            self.assertTrue(outlines)
            self.assertEqual([normalize(p.get(ANDROID + 'pathData')) for p in paths],
                             [normalize(d) for d in outlines])
            self.assertTrue(all(p.get(ANDROID + 'fillColor') == '#FFFFFFFF' for p in paths))


if __name__ == '__main__':
    unittest.main()
