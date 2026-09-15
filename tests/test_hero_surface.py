"""Regression guard for the approved flat five-percent HERO surface."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "custom_components/lider_voltage_control/frontend"
ARTIFACTS = ("lider-voltage-control-panel-core.js", "lider-voltage-control-panel.js")
SURFACE = "color-mix(in srgb,var(--card-background-color,#fff) 95%,var(--primary-color,#03a9d9) 5%)"


class HeroSurfaceTests(unittest.TestCase):
    def test_photo_card_surface_is_flat_and_theme_aware(self):
        for name in ARTIFACTS:
            with self.subTest(artifact=name):
                source = (FRONTEND / name).read_text(encoding="utf-8")
                rules = re.findall(r"\.installation\{([^{}]*)\}", source)
                self.assertTrue(rules, "Missing installation selector")
                backgrounds = [
                    value.strip()
                    for rule in rules
                    for value in re.findall(r"(?:^|;)background\s*:\s*([^;]+)", rule)
                ]
                self.assertTrue(backgrounds, "HERO surface must be explicit, not inherited")
                for value in backgrounds:
                    self.assertEqual(value, SURFACE, "HERO surface must be flat card 95% + primary 5%")
                for rule in rules:
                    self.assertNotIn("gradient(", rule)


if __name__ == "__main__":
    unittest.main()
