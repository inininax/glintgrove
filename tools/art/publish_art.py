"""Validate and publish art with immutable filenames and an atomic manifest.

Run with .venv-art-build/bin/python tools/art/publish_art.py (Pillow and Node).
Change sources/pivots in art/recipes/catalog.json, never in gameplay code.
Catalogue, source pixels, output collisions, and the shared runtime schema are
validated before any output write. The manifest is the final atomic commit.
Old runtime files remain available for existing offline clients; no auto-pruning.
"""
import hashlib
import io
import json
import math
import os
from pathlib import Path
import re
import subprocess
import tempfile
import warnings
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / 'art/recipes/catalog.json'
DEST = ROOT / 'assets/game'
RUNTIME_VALIDATOR = ROOT / 'src/assets/assetStore.js'
ID_PATTERN = re.compile(r'[a-zA-Z][a-zA-Z0-9._-]{0,63}', re.ASCII)
MAX_MANIFEST_BYTES = 128 * 1024
MAX_SOURCE_BYTES = 64 * 1024 * 1024
MAX_FILE_BYTES = 8 * 1024 * 1024
MAX_TOTAL_BYTES = 32 * 1024 * 1024
MAX_PIXELS = 16 * 1024 * 1024
MAX_TOTAL_PIXELS = 48 * 1024 * 1024


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f'Duplicate catalogue key: {key}')
        result[key] = value
    return result


def _number(value):
    # bool is an int subclass in Python, but not a number in the JS schema.
    if type(value) not in (int, float):
        return False
    try:
        return math.isfinite(value)
    except OverflowError:
        return False


def _read_catalog(catalog_path):
    raw = Path(catalog_path).read_bytes()
    if len(raw) > MAX_MANIFEST_BYTES:
        raise ValueError('Catalogue exceeds 128 KB budget')
    catalog = json.loads(raw, object_pairs_hook=_unique_object)
    if type(catalog) is not dict or type(catalog.get('schemaVersion')) is not int or catalog['schemaVersion'] != 1:
        raise ValueError('Unsupported catalogue schema')
    assets = catalog.get('assets')
    if type(assets) is not dict or len(assets) > 128:
        raise ValueError('Catalogue assets must be an object with at most 128 entries')
    validated = []
    for asset_id, spec in assets.items():
        if not ID_PATTERN.fullmatch(asset_id) or type(spec) is not dict:
            raise ValueError(f'Invalid asset ID or entry: {asset_id}')
        kind = spec.get('kind')
        if type(kind) is not str or kind not in ('sprite', 'background'):
            raise ValueError(f'{asset_id}: kind must be sprite or background')
        source_name = spec.get('source')
        if type(source_name) is not str or not source_name or '\\' in source_name:
            raise ValueError(f'{asset_id}: source must be a project-relative path')
        relative_source = Path(source_name)
        if not relative_source.parts or relative_source.is_absolute() or '..' in relative_source.parts or relative_source.parts[0] != 'art':
            raise ValueError(f'{asset_id}: authoring source must live in art/')
        source = (ROOT / relative_source).resolve()
        if not source.is_relative_to((ROOT / 'art').resolve()):
            raise ValueError(f'{asset_id}: authoring source must live in art/')
        anchor = spec.get('anchor', [.5, .5])
        scale = spec.get('scale', 1)
        if type(anchor) is not list or len(anchor) != 2 or not all(_number(n) and 0 <= n <= 1 for n in anchor):
            raise ValueError(f'{asset_id}: invalid anchor')
        if not _number(scale) or not .05 <= scale <= 4:
            raise ValueError(f'{asset_id}: invalid scale')
        validated.append((asset_id, source_name, source, kind, anchor, scale))
    return validated


def _validate_runtime_manifest(manifest_bytes, manifest_path):
    # Keep the final acceptance boundary identical to the browser and SW. This
    # runs before creating output directories, so schema drift cannot publish art.
    script = """
      import { readFileSync } from 'node:fs';
      const { validateAssetManifest, ASSET_LIMITS } = await import(process.argv[1]);
      const bytes = readFileSync(0);
      if (bytes.byteLength > ASSET_LIMITS.manifestBytes) throw new Error('Manifest too large');
      validateAssetManifest(JSON.parse(bytes.toString('utf8')), process.argv[2]);
    """
    try:
        subprocess.run(
            ['node', '--input-type=module', '--eval', script,
             RUNTIME_VALIDATOR.as_uri(), manifest_path.as_uri()],
            input=manifest_bytes, capture_output=True, check=True, timeout=15,
        )
    except FileNotFoundError as error:
        raise ValueError('Node is required to validate the shared runtime art schema') from error
    except subprocess.CalledProcessError as error:
        raise ValueError('Runtime manifest validation failed: ' + error.stderr.decode().strip()) from error
    except subprocess.TimeoutExpired as error:
        raise ValueError('Runtime manifest validation timed out') from error


def _atomic_write(target, payload):
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=target.parent, prefix='.' + target.name + '.', suffix='.tmp', delete=False) as output:
            temporary = Path(output.name)
            output.write(payload)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, target)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def publish(catalog_path=CATALOG, destination=DEST, *, provenance_path=None):
    specs = _read_catalog(catalog_path)
    entries, prepared, provenance = {}, [], {}
    total_bytes = total_pixels = 0
    destination = Path(destination).resolve()
    manifest_path = destination / 'manifest.json'
    # Custom destinations are self-contained; preview/tests cannot overwrite the
    # real library's provenance. Production keeps its existing authoring report.
    if provenance_path is None:
        provenance_path = ROOT / 'art/build/provenance.json' if destination == DEST.resolve() else destination / 'provenance.json'
    provenance_path = Path(provenance_path).resolve()
    sources = {spec[2] for spec in specs}

    for asset_id, source_name, source, kind, anchor, scale in specs:
        if not source.is_file() or source.stat().st_size > MAX_SOURCE_BYTES:
            raise ValueError(f'{asset_id}: missing source or source larger than 64 MB')
        raw = source.read_bytes()
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as image:
                width, height = image.size
                if not 0 < width <= 8192 or not 0 < height <= 8192 or width * height > MAX_PIXELS:
                    raise ValueError(f'{asset_id}: invalid dimensions')
                total_pixels += width * height
                if total_pixels > MAX_TOTAL_PIXELS:
                    raise ValueError('Art collection exceeds decoded pixel budget')
                if getattr(image, 'n_frames', 1) != 1:
                    raise ValueError(f'{asset_id}: source must be a static image')
                image.load()
                alpha = image.getchannel('A').getextrema() if 'A' in image.getbands() else None
                if alpha is None and 'transparency' in image.info:
                    alpha = image.convert('RGBA').getchannel('A').getextrema()
                if alpha is not None and alpha[1] == 0:
                    raise ValueError(f'{asset_id}: source is entirely transparent')
                data = io.BytesIO()
                if kind == 'sprite':
                    if image.mode != 'RGBA' or alpha[0] != 0 or alpha[1] <= 0:
                        raise ValueError(f'{asset_id}: sprite needs transparent RGBA background and visible pixels')
                    image.save(data, format='PNG', optimize=True)
                    suffix, folder = 'png', 'sprites'
                else:
                    image.convert('RGB').save(data, format='WEBP', quality=88, method=6)
                    suffix, folder = 'webp', 'backgrounds'
        payload = data.getvalue()
        if len(payload) > MAX_FILE_BYTES:
            raise ValueError(f'{asset_id}: file budget exceeded')
        total_bytes += len(payload)
        if total_bytes > MAX_TOTAL_BYTES:
            raise ValueError('Art collection exceeds download budget')
        digest = hashlib.sha256(payload).hexdigest()
        path = f'{folder}/{asset_id.replace(".", "-")}-v1-{digest[:12]}.{suffix}'
        entries[asset_id] = {'src': path, 'width': width, 'height': height, 'anchor': anchor, 'scale': scale}
        prepared.append((path, payload))
        provenance[asset_id] = {'source': source_name, 'sourceSha256': hashlib.sha256(raw).hexdigest(), 'outputSha256': digest}

    revision = 'nocturne-' + hashlib.sha256(json.dumps(entries, sort_keys=True).encode()).hexdigest()[:12]
    manifest = {'schemaVersion': 1, 'revision': revision, 'assets': entries}
    manifest_bytes = (json.dumps(manifest, indent=2, allow_nan=False) + '\n').encode()
    provenance_bytes = (json.dumps({'revision': revision, 'assets': provenance}, indent=2) + '\n').encode()
    _validate_runtime_manifest(manifest_bytes, manifest_path)

    # Preflight every output before any write, including pre-existing immutable
    # files and symlink escapes. Authoring sources are never publication targets.
    for relative, payload in prepared:
        target = destination / relative
        resolved = target.resolve()
        if not resolved.is_relative_to(destination) or resolved in sources:
            raise ValueError(f'Invalid output target: {target}')
        if target.exists() and (not target.is_file() or target.read_bytes() != payload):
            raise ValueError(f'Immutable output collision: {target}')
    output_targets = {(destination / relative).resolve() for relative, _ in prepared}
    if manifest_path.resolve() in sources | output_targets or provenance_path in sources | output_targets or manifest_path.resolve() == provenance_path:
        raise ValueError('Publication metadata cannot overwrite a source or each other')

    for relative, payload in prepared:
        target = destination / relative
        if not target.exists():
            _atomic_write(target, payload)
    _atomic_write(provenance_path, provenance_bytes)
    _atomic_write(manifest_path, manifest_bytes)  # Final, atomic publication commit.
    print(f'Published {len(entries)} assets · {total_bytes / 1024 / 1024:.2f} MiB · {total_pixels / 1000000:.2f} megapixels · {revision}')
    return manifest


def publish_site_preview():
    """Export the wordless Blender preview without local-path/text metadata."""
    source = ROOT / 'art/source/procedural/share-v2.png'
    raw = source.read_bytes()
    with Image.open(io.BytesIO(raw)) as picture:
        picture.load()
        if picture.size != (1200, 630) or picture.mode != 'RGB':
            raise ValueError('Site preview must be a 1200 x 630 RGB Blender render')
    # Preserve compressed pixel bytes and color chunks exactly, removing only
    # ancillary metadata that may contain workstation paths or timestamps.
    if raw[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('Site preview must be PNG')
    allowed = {b'IHDR', b'IDAT', b'IEND', b'PLTE', b'tRNS', b'gAMA', b'cHRM', b'sRGB', b'iCCP', b'pHYs'}
    output = bytearray(raw[:8])
    offset = 8
    while offset < len(raw):
        size = int.from_bytes(raw[offset:offset + 4], 'big')
        end = offset + 12 + size
        if end > len(raw):
            raise ValueError('Truncated site preview PNG')
        kind = raw[offset + 4:offset + 8]
        if kind in allowed:
            output.extend(raw[offset:end])
        offset = end
        if kind == b'IEND':
            break
    destination = ROOT / 'assets/site/share.png'
    _atomic_write(destination, bytes(output))
    print('Exported site preview with unchanged pixels and no textual metadata')


if __name__ == '__main__':
    publish()
    publish_site_preview()
