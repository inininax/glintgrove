# Image generation recipes · Nocturne v1

> Historical prompts for retired image-model backgrounds. These images are excluded from the current catalog and release. The current four backgrounds and share image come from local Blender scenes; see [current Blender recipe](procedural-environments-v2.md). No image model is part of the current production pipeline.

Generation date: 2026-09-13. Mode: **built-in image_gen**. No CLI/API billing path used. The tool has no model selector. Source PNG C2PA records `softwareAgent: {name: "gpt-image", version: "2.0"}`. This is software provenance, not a verified API model ID or dated snapshot; it does not establish the exact serving model. GPT Image 2.5 execution is **not verified**. See `art/README.md` and `docs/art/model-access.md` for the outstanding latest-model requirement.

All images were generated at 1536×1024. Runtime exports use WebP quality 88, encoded by `publish_art.py`. PNG masters are kept intact. Referenced images below are our own generated artwork, not vendor illustrations.

## forest-v1.png

Inputs: none. Tool output: `exec-689cbccb-7bb2-408a-afb0-f4d706a4c077.png`.

```text
Use case: stylized-concept. Asset type: production background painting for Glintgrove, an original high-end browser light-reflection puzzle about waking a sleeping forest. Generate one beautiful finished wide landscape environment image, landscape aspect 3:2, high resolution. This is actual background art, not a screenshot or UI mockup. Composition: a majestic ancient nocturnal forest clearing, enormous gracefully arching gnarled tree trunks along the far left and right edges with layered rounded foliage forming a canopy above, fern fronds and lush mossy stones in the bottom corners, a few tiny bioluminescent blue-cyan mushrooms nestled in the edges. Deep layered distant tree silhouettes fading into silvery teal atmospheric fog. The broad central 60 percent is a calm open clearing of low-contrast deep blue-green mist and velvety moss, with intentionally little detail so a square puzzle board or elegant title can be overlaid legibly. Centered composition must also survive a tall central mobile crop: some narrow trees and vegetation silhouettes should still be present toward x=35 and x=65 percent, very subtle. Subtle warm gold firefly pinpoints framing the opening, soft shafts of pale moonlight from high left. Painterly sculptural forms, meticulous varied leaf brushwork, beautiful value grouping and edge control, sophisticated art direction, tactile gouache and hand-painted 3D diorama quality, natural organic asymmetry, enchanting quiet atmosphere. Palette: near-black evergreen #071916, petrol blue #143438, desaturated jade #3c7770, moss green, restrained antique gold #dcc68e, small cyan bioluminescence. The forest must be clearly visible, rich in depth and atmospheric color, not crushed to black, not harsh neon. Gentle illumination on trunks and soft luminous fog in upper-middle distance, dark quiet central foreground. No text, letters, logos, watermark, borders, interface, grid, mirrors, characters or humanoids. Original environment design. Render a final detailed painting with restrained glowing highlights.
```

## depths-v1.png

Input: `art/source/imagegen/forest-v1.png` as style reference. Tool output: `exec-5ac35803-cc52-48ed-9bdd-ea0c1c4dad80.png`.

```text
Use case: stylized-concept. Create a matching second original environment background for this same premium nocturnal forest light-reflection puzzle game, using the supplied forest image only as style/color/quality reference. Output landscape 3:2 composition, no text or UI. Environment is the misty depths chapter: a beautiful hidden forest grotto, huge moss-covered tree roots arch around a cavern-like clearing, scattered elegant quartz clusters glowing very subtly muted lavender at the far edges, a still pool reflecting mist in the far distance, hanging ferns and ancient twisting trunks at both sides. Rich atmospheric layers of deep indigo, midnight teal, muted violet. Small warm fireflies, moonlit silver mist. The middle 60% must be broad low-contrast quiet dark-blue/teal negative space, suitable for overlaying a puzzle board; all detailed framing mossy rocks, crystals, small mushrooms and ferns concentrated in the outer edges. Preserve the sophisticated painterly naturalism and exquisite organic detail and tangible sculptural texture of the reference. No characters, buildings, interface, grid, writing, symbols, logo, watermark. Avoid harsh neon, excessive bloom, vivid purple wash, flat black. Crisp fine brushwork at edges, soft layered fog in the distance. Finished production background art.
```

## garden-v1.png

Input: `art/source/imagegen/forest-v1.png` as style reference. Tool output: `exec-9baf0f94-a54e-42c4-9b58-ce64aa80e5e8.png`.

```text
Use case: stylized-concept. Generate a matching original environment background for a sophisticated nocturnal forest light puzzle, using supplied image only as quality, painterly texture and coherent world reference. Chapter: Starlit Garden. Wide landscape aspect 3:2. A peaceful magical woodland garden at blue hour with layers of rounded flowering tree canopies, deep jade foliage, pale mauve and ivory blossoms scattered sparsely around edges, tiny sapphire blue and warm gold luminous flowers tucked beside mossy stones and fern fronds in bottom corners. Graceful dark trees frame both sides and arch overhead. Delicate starlight through a gap overhead, dusty lavender atmospheric fog and luminous pale turquoise distance. Preserve deeply layered spatial depth, realistic yet artistically painted organic forms and thoughtful brushwork. CENTER 60% MUST BE a quiet low-contrast open velvety blue-green clearing, darker near foreground, to overlay a puzzle board without distraction. More subtle colors than candy fantasy: deep evergreen, dusty plum in shadows, muted silver jade, occasional gold pollen specks. Beautiful artistic value grouping. No characters, text, interface, watermarks, grid or other game objects. Final environment painting for direct game integration.
```

## heart-v1.png

Input: `art/source/imagegen/forest-v1.png` as style reference. Tool output: `exec-9603713d-fc66-4849-b40f-1a3f3ddf4a50.png`.

```text
Use case: stylized-concept. Create a fourth original production environment background matching this supplied original nocturnal forest painting in texture, sophistication and visual universe. Ancient Heart chapter: deep in an ancient forest, massive venerable roots form a gentle arch around a sacred woodland clearing. Worn old stone fragments with natural spiral weathering half-buried under moss and fine ferns at the far left and right. Beautiful old branches and drooping foliage overhead, muted amber leaves at edges. A distant small opening between tree trunks holds subtle warm honey-gold atmospheric light, contrasted with dark petrol teal shadows. A handful of tiny pale gold fireflies. Rich organic brushwork and layered fog, sophisticated subtle colors, illuminated edges on bark, living moss and small ivory mushrooms. Landscape 3:2. Preserve the central 60 percent as a dark, quiet low-contrast clearing with soft distant haze so a puzzle board can be overlaid. Strong forest framing on both outer edges but not visual clutter in center. Majestic, mysterious, tender and peaceful rather than ominous. No characters, interface, text, letters, logos, grid, watermarks or obvious glowing magical symbols. Detailed finished art for direct game integration, not a concept sheet.
```
