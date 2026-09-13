"""Empirical publication tests; all fixtures live in a cleaned temporary folder.

  .venv-art-build/bin/python -m unittest discover -s tools/art -p 'test_*.py'
"""
import contextlib
import copy
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock
from PIL import Image
import publish_art


class PublishTests(unittest.TestCase):
    def setUp(self):
        build = publish_art.ROOT / 'art/build'
        build.mkdir(parents=True, exist_ok=True)
        self.temporary = tempfile.TemporaryDirectory(prefix='publisher-test-', dir=build)
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.destination = self.root / 'runtime'
        self.catalog_path = self.root / 'catalog.json'
        self.good = self.image('good.png')
        self.spec = {'source': self.relative(self.good), 'kind': 'sprite', 'anchor': [.5, .5], 'scale': 1.1}
        self.catalog = {'schemaVersion': 1, 'assets': {'tree.awake': self.spec}}
        self.source_bytes = self.good.read_bytes()
        with contextlib.redirect_stdout(io.StringIO()):
            self.first = self.run_publish(self.catalog)
        self.baseline = self.snapshot()

    def relative(self, path):
        return path.relative_to(publish_art.ROOT).as_posix()

    def image(self, name, size=(8, 8), alpha=255, opaque=False):
        path = self.root / name
        image = Image.new('RGBA', size, (0, 0, 0, 255 if opaque else 0))
        if alpha:
            image.putpixel((size[0] // 2, size[1] // 2), (88, 143, 119, alpha))
        image.save(path)
        return path

    def run_publish(self, catalog, destination=None):
        self.catalog_path.write_text(json.dumps(catalog))
        with contextlib.redirect_stdout(io.StringIO()):
            return publish_art.publish(self.catalog_path, destination or self.destination)

    def snapshot(self):
        return {str(path.relative_to(self.destination)): path.read_bytes()
                for path in self.destination.rglob('*') if path.is_file()}

    def assert_rejected_unchanged(self, catalog):
        with self.assertRaises((ValueError, OSError)):
            self.run_publish(catalog)
        self.assertEqual(self.snapshot(), self.baseline, 'invalid input must not change ANY runtime output')
        self.assertEqual(self.good.read_bytes(), self.source_bytes, 'authoring source must remain untouched')

    def patched_spec(self, **patch):
        catalog = copy.deepcopy(self.catalog)
        catalog['assets']['tree.awake'].update(patch)
        return catalog

    def test_invalid_ids_do_not_replace_valid_manifest(self):
        for invalid in ['tree/awake', '../tree', '1tree', 'tree awake', '트리', 'a' * 65]:
            with self.subTest(invalid=invalid):
                self.assert_rejected_unchanged({'schemaVersion': 1, 'assets': {invalid: self.spec}})

    def test_catalogue_schema_and_entry_shapes_rejected_before_output(self):
        for invalid in [None, [], 'catalog', {}, {'schemaVersion': True, 'assets': {}},
                        {'schemaVersion': 2, 'assets': {}}, {'schemaVersion': 1, 'assets': []},
                        {'schemaVersion': 1, 'assets': {'tree': None}},
                        {'schemaVersion': 1, 'assets': {f'a{i}': self.spec for i in range(129)}}]:
            with self.subTest(invalid=str(invalid)[:80]):
                self.assert_rejected_unchanged(invalid)

    def test_boolean_nonfinite_and_malformed_metadata_rejected(self):
        for anchor in [[True, .5], [.5, False], [float('nan'), .5], [float('inf'), .5],
                       [-.1, .5], [.5, 1.1], [.5], '.5', None, {'0': .5, '1': .5}]:
            with self.subTest(anchor=anchor):
                self.assert_rejected_unchanged(self.patched_spec(anchor=anchor))
        for scale in [True, False, float('nan'), float('inf'), 0, 4.01, '1', None]:
            with self.subTest(scale=scale):
                self.assert_rejected_unchanged(self.patched_spec(scale=scale))

    def test_source_and_kind_require_exact_types(self):
        for source in [True, 5, [], {}, None, '', '.', '/tmp/outside.png', 'art/../README.md', 'README.md']:
            with self.subTest(source=source):
                self.assert_rejected_unchanged(self.patched_spec(source=source))
        for kind in [True, None, 1, ['sprite'], 'Sprite', 'model']:
            with self.subTest(kind=kind):
                self.assert_rejected_unchanged(self.patched_spec(kind=kind))

    def test_missing_corrupt_and_escaping_sources_preserve_all_outputs(self):
        corrupt = self.root / 'corrupt.png'
        corrupt.write_bytes(b'not an image')
        outside = self.root / 'outside.png'
        outside.symlink_to(publish_art.ROOT / 'README.md')
        for source in [self.root / 'missing.png', corrupt, outside]:
            with self.subTest(source=source):
                # A valid first item must not write before the invalid second.
                self.assert_rejected_unchanged({'schemaVersion': 1, 'assets': {
                    'new.tree': self.spec,
                    'bad.tree': {**self.spec, 'source': self.relative(source)},
                }})

    def test_blank_and_opaque_sprites_cannot_publish(self):
        for source in [self.image('blank.png', alpha=0), self.image('opaque.png', opaque=True)]:
            self.assert_rejected_unchanged(self.patched_spec(source=self.relative(source)))
        blank_background = self.patched_spec(source=self.relative(self.root / 'blank.png'), kind='background')
        self.assert_rejected_unchanged(blank_background)

    def test_low_nonzero_alpha_is_valid(self):
        source = self.image('faint.png', alpha=1)
        result = self.run_publish(self.patched_spec(source=self.relative(source)))
        self.assertNotEqual(result['revision'], self.first['revision'])
        with Image.open(self.destination / result['assets']['tree.awake']['src']) as image:
            self.assertEqual(image.getchannel('A').getextrema(), (0, 1))

    def test_dimension_change_gets_new_immutable_file_and_matching_manifest(self):
        source = self.image('new-size.png', size=(13, 9))
        result = self.run_publish(self.patched_spec(source=self.relative(source), anchor=[.2, .8], scale=.9))
        old = self.first['assets']['tree.awake']
        new = result['assets']['tree.awake']
        self.assertNotEqual(old['src'], new['src'])
        self.assertEqual((new['width'], new['height']), (13, 9))
        self.assertEqual(new['anchor'], [.2, .8])
        self.assertEqual(new['scale'], .9)
        self.assertEqual((self.destination / old['src']).read_bytes(), self.baseline[old['src']])
        with Image.open(self.destination / new['src']) as image:
            self.assertEqual(image.size, (13, 9))
        self.assertEqual(json.loads((self.destination / 'manifest.json').read_text()), result)
        self.assertEqual(self.good.read_bytes(), self.source_bytes)

    def test_invalid_input_does_not_even_create_fresh_destination(self):
        fresh = self.root / 'never-created'
        with self.assertRaises(ValueError):
            self.run_publish(self.patched_spec(anchor=[True, .5]), fresh)
        self.assertFalse(fresh.exists())

    def test_shared_runtime_validation_is_before_output_writes(self):
        with mock.patch.object(publish_art, '_validate_runtime_manifest', side_effect=ValueError('runtime rejected')):
            self.assert_rejected_unchanged(self.catalog)

    def test_export_collision_preflight_does_not_publish_other_prepared_files(self):
        old_path = self.destination / self.first['assets']['tree.awake']['src']
        old_path.write_bytes(b'collision')
        collision_baseline = self.snapshot()
        source = self.image('another.png', size=(9, 9))
        with self.assertRaisesRegex(ValueError, 'collision'):
            self.run_publish({'schemaVersion': 1, 'assets': {
                'new.tree': {**self.spec, 'source': self.relative(source)},
                'tree.awake': self.spec,
            }})
        self.assertEqual(self.snapshot(), collision_baseline)

    def test_manifest_commit_failure_keeps_previous_manifest_and_cleans_tempfiles(self):
        source = self.image('commit-new.png', size=(10, 12))
        original_replace = publish_art.os.replace
        def fail_manifest(source, destination):
            if Path(destination).name == 'manifest.json':
                raise OSError('simulated manifest commit failure')
            return original_replace(source, destination)
        with mock.patch.object(publish_art.os, 'replace', side_effect=fail_manifest):
            with self.assertRaises(OSError):
                self.run_publish(self.patched_spec(source=self.relative(source)))
        self.assertEqual((self.destination / 'manifest.json').read_bytes(), self.baseline['manifest.json'])
        self.assertEqual((self.destination / self.first['assets']['tree.awake']['src']).read_bytes(), self.baseline[self.first['assets']['tree.awake']['src']])
        self.assertFalse(list(self.destination.rglob('*.tmp')))

    def test_duplicate_json_keys_are_rejected(self):
        self.catalog_path.write_text('{"schemaVersion":1,"assets":{},"assets":{}}')
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            publish_art.publish(self.catalog_path, self.destination)
        self.assertEqual(self.snapshot(), self.baseline)


if __name__ == '__main__':
    unittest.main()
