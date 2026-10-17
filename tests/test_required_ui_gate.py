"""Execute the required UI gate, including unsuccessful and missing results."""
import json
import os
from pathlib import Path
import re
import subprocess
import textwrap
import unittest

ROOT = Path(__file__).resolve().parents[1]
GATE = "validate"
REQUIRED = ["repository-checks","hero-surface"]

class RequiredUIGateTests(unittest.TestCase):
    def setUp(self):
        source = (ROOT / ".github/workflows/repository-checks.yml").read_text()
        jobs = dict(re.findall(r"^  ([\w-]+):\n(.*?)(?=^  [\w-]+:|\Z)",
                               source.split("\njobs:\n", 1)[1], re.M | re.S))
        self.gate = jobs[GATE]
        self.assertIn("always()", self.gate)
        needs = re.search(r"^    needs: \[([^\]]+)\]$", self.gate, re.M)
        self.assertIsNotNone(needs, "Gate must list every required local dependency")
        self.assertEqual([v.strip() for v in needs[1].split(",")], REQUIRED)
        script = re.search(r"^        run: \|\n((?:          .*\n|\n)+)", self.gate, re.M)
        self.assertIsNotNone(script)
        self.script = textwrap.dedent(script[1])

    def run_gate(self, results):
        env = {**os.environ, "NIKAS_JOB_RESULTS": json.dumps(results)}
        return subprocess.run(["bash", "-e", "-o", "pipefail", "-c", self.script],
                              env=env, capture_output=True, text=True, timeout=5)

    def success(self):
        return {name: {"result": "success"} for name in REQUIRED}

    def test_all_success_passes(self):
        result = self.run_gate(self.success())
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_failed_cancelled_skipped_and_missing_results_block(self):
        for name in REQUIRED:
            for status in ("failure", "cancelled", "skipped", "neutral", "", None):
                with self.subTest(name=name, status=status):
                    results = self.success()
                    results[name]["result"] = status
                    self.assertNotEqual(self.run_gate(results).returncode, 0)
            for results in (self.success(), self.success()):
                results.pop(name)
                self.assertNotEqual(self.run_gate(results).returncode, 0)
            results = self.success()
            results[name] = {}
            self.assertNotEqual(self.run_gate(results).returncode, 0)
        self.assertNotEqual(self.run_gate({}).returncode, 0)
        self.assertNotEqual(self.run_gate({**self.success(), "unexpected": {"result": "success"}}).returncode, 0)

if __name__ == "__main__":
    unittest.main()
