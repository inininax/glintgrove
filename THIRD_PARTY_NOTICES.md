# Source and tool notices

Ilyndrel's current visual assets are produced from local Blender geometry and locally authored SVG/Canvas constructions. The replacement register records their files and recipes. This statement describes the production process; it does not guarantee exclusive copyright or non-infringement.

## Runtime algorithms

`mulberry32` and `xmur3` in `src/core/math.js` correspond to bryc's published implementations. The author's source document marks these algorithms **Public domain**:
https://github.com/bryc/code/blob/master/jshash/PRNGs.md

## Installed text fonts

The application asks the user's platform to display text using installed system fonts. It does not distribute font binaries or an extracted emoji image set. Decorative pictographs have been replaced by the project's geometric SVG symbols. Ordinary characters, letters and numbers remain platform-rendered text.

- Microsoft font usage FAQ: https://learn.microsoft.com/en-us/typography/fonts/font-faq
- Apple macOS font display terms, §2E: https://www.apple.com/legal/sla/docs/macOSTahoe.pdf

## Local authoring tools

Blender and Pillow are local production tools, not bundled browser dependencies. Art outputs and the Blender Python API scripts have different licensing treatment. The scoped notice in `tools/art/LICENSES.md` applies to the listed Blender scripts; it does not license the game's PNG/WebP files or the entire game under the GPL.

Blender: https://www.blender.org/about/license/
Pillow: https://github.com/python-pillow/Pillow/blob/main/LICENSE

The runtime-only distribution excludes those tools, retired image sources and research materials. No external model, texture, image pack or icon library was added to the replacement set.
