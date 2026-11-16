"""Offline regression coverage for the pinned documentation baseline."""
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {'standard': '39691a1e8ad5b98a961d518ab7b38761f3b04e7f7eb032dc19e3c68b4f249083', 'navigation_contract': '26269e700cffa7cc1b0a2f93ff6314ed3d366f988460168c312324511f282423'}

class StandardDocumentSyncTests(unittest.TestCase):
    def test_production_documents_match_authority(self):
        declaration = json.loads((ROOT / '.nikas-ui-standard.json').read_text())
        for key, expected in EXPECTED.items():
            with self.subTest(document=key):
                actual = hashlib.sha256((ROOT / declaration[key + '_path']).read_bytes()).hexdigest()
                self.assertEqual(actual, expected)
                self.assertEqual(declaration[key + '_sha256'], expected)

    def test_checker_rejects_independent_and_coordinated_drift(self):
        path = ROOT / 'scripts/check_standard_documents.py'
        if not path.exists():
            self.skipTest('checker will be introduced with the fix')
        spec = importlib.util.spec_from_file_location('standard_document_checker', path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        for mutation in ('document', 'declaration', 'both', 'missing', 'version'):
            with self.subTest(mutation=mutation), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                declaration = json.loads((ROOT / '.nikas-ui-standard.json').read_text())
                for key in EXPECTED:
                    target = root / declaration[key + '_path']
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(ROOT / declaration[key + '_path'], target)
                manifest = root / '.nikas-ui-standard.json'
                manifest.write_text(json.dumps(declaration))
                self.assertEqual(module.validate(root), [])
                document = root / declaration['standard_path']
                if mutation in ('document', 'both'):
                    document.write_text('obsolete baseline')
                if mutation == 'declaration':
                    declaration['standard_sha256'] = '0' * 64
                if mutation == 'both':
                    declaration['standard_sha256'] = hashlib.sha256(document.read_bytes()).hexdigest()
                if mutation == 'missing':
                    document.unlink()
                if mutation == 'version':
                    declaration['version'] = '0.0'
                manifest.write_text(json.dumps(declaration))
                self.assertTrue(module.validate(root))

if __name__ == '__main__':
    unittest.main()
