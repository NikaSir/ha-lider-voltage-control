"""Protect full HACS validation using only the Python standard library."""

from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]


class HacsValidationContractTests(unittest.TestCase):
    def test_hacs_job_does_not_exempt_publication_checks(self):
        source = (ROOT / ".github/workflows/integration-validation.yml").read_text()
        hacs = re.search(r"^  hacs:\n(.*?)(?=^  [\w-]+:|\Z)", source, re.M | re.S)
        self.assertIsNotNone(hacs, "Required HACS job must exist")
        self.assertRegex(hacs.group(1), r"(?m)^      - uses: hacs/action@")
        self.assertRegex(hacs.group(1), r"(?m)^          category: integration$")
        self.assertNotRegex(hacs.group(1), r"(?m)^\s+ignore:",
                            "HACS must validate topics and all publication checks")

    def test_required_validate_runs_this_regression(self):
        source = (ROOT / ".github/workflows/repository-checks.yml").read_text()
        validate = re.search(r"^  validate:\n(.*?)(?=^  [\w-]+:|\Z)", source, re.M | re.S)
        self.assertIsNotNone(validate)
        self.assertRegex(validate.group(1),
                         r"(?m)^        run: python scripts/check-hacs-validation\.py$")


if __name__ == "__main__":
    unittest.main()
