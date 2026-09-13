"""Validate Blender render requests without invoking an expensive render."""
import contextlib
import io
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest import mock
import render_library


class Scene(dict):
    def __init__(self, asset_id, output_name):
        super().__init__(asset_id=asset_id, output_name=output_name)
        self.name = asset_id
        self.render = SimpleNamespace(resolution_x=384, resolution_y=384, filepath='')
        self.cycles = SimpleNamespace(samples=48)


class RenderRequestTests(unittest.TestCase):
    def setUp(self):
        build = render_library.ROOT / 'art/build'
        build.mkdir(parents=True, exist_ok=True)
        self.temporary = tempfile.TemporaryDirectory(prefix='render-request-test-', dir=build)
        self.addCleanup(self.temporary.cleanup)
        self.destination = Path(self.temporary.name) / 'renders'
        self.scene = Scene('tree.awake', 'tree-awake-v1.png')
        self.other = Scene('mirror', 'mirror-v1.png')
        self.render = mock.Mock()
        self.bpy = SimpleNamespace(data=SimpleNamespace(scenes=[self.scene, self.other]),
                                   ops=SimpleNamespace(render=SimpleNamespace(render=self.render)))

    def run_request(self, *args):
        with contextlib.redirect_stderr(io.StringIO()), contextlib.redirect_stdout(io.StringIO()):
            return render_library.render_library(self.bpy, ['--output', str(self.destination), *args])

    def assert_rejected(self, *args):
        with self.assertRaises(SystemExit) as caught:
            self.run_request(*args)
        self.assertEqual(caught.exception.code, 2)
        self.render.assert_not_called()
        self.assertFalse(self.destination.exists(), 'invalid request must not create output directories')

    def test_typo_or_empty_selection_fails_before_render(self):
        for value in ['tree.typo', '', ',', 'tree.awake,', 'tree.awake,tree.typo']:
            with self.subTest(value=value):
                self.assert_rejected('--only', value)

    def test_invalid_size_or_sample_budget_fails_before_render(self):
        for option, values in [('--size', ['-1', '0', '15', '4097']), ('--samples', ['-1', '0', '4097'])]:
            for value in values:
                with self.subTest(option=option, value=value):
                    self.assert_rejected(option, value)

    def test_no_asset_scenes_is_an_explicit_failure(self):
        self.bpy.data.scenes = []
        self.assert_rejected()

    def test_valid_selected_scene_renders_once_with_requested_quality(self):
        self.assertEqual(self.run_request('--only', 'tree.awake', '--size', '256', '--samples', '16'), 1)
        self.render.assert_called_once_with(write_still=True, scene='tree.awake')
        self.assertEqual((self.scene.render.resolution_x, self.scene.render.resolution_y), (256, 256))
        self.assertEqual(self.scene.cycles.samples, 16)
        self.assertEqual(self.other.render.filepath, '')
        self.assertEqual(self.scene.render.filepath, str(self.destination / 'tree-awake-v1.png'))

    def test_bad_output_name_cannot_render_over_authoring_sources(self):
        self.scene['output_name'] = '../../source/tree.blend'
        self.assert_rejected()

    def test_default_output_is_the_versionable_sprite_input_folder(self):
        isolated_root = Path(self.temporary.name) / 'project'
        with mock.patch.object(render_library, 'ROOT', isolated_root):
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(render_library.render_library(self.bpy, ['--only', 'mirror']), 1)
        self.assertEqual(self.other.render.filepath, str(isolated_root / 'art/renders/sprites/mirror-v1.png'))
        self.render.assert_called_once_with(write_still=True, scene='mirror')

    def test_output_cannot_overwrite_editable_models_or_runtime_assets(self):
        for relative in ['art/source', 'assets/game', 'src']:
            with self.subTest(relative=relative):
                self.assert_rejected('--output', str(render_library.ROOT / relative))


if __name__ == '__main__':
    unittest.main()
