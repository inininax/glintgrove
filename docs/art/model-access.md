# Image model requirement · access audit

> Historical access audit for the retired image-model backgrounds. Its incomplete-model statement and old runtime revision describe that earlier task only. Current artwork uses local Blender scenes and authored SVG/Canvas code; see [current replacement audit](../legal/remake-audit.md) and [reference recheck](commercial-reference-recheck.md). No image-model selection is required by the current production pipeline.

Checked 2026-09-13. The latest-model requirement remains **unverified**, so the full goal is not marked complete. The existing 25 runtime assets remain at revision `nocturne-c4cf96b06729`.

## Official model versus this session's tool

The official [GPT Image 2.5 Sunburst model page](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst) identifies `gpt-image-2.5-sunburst` and the dated snapshot `gpt-image-2.5-sunburst-2026-09-08`. The [image-generation guide](https://developers.openai.com/api/docs/guides/image-generation) documents API model selection. That does not establish a selector in the built-in tool used here.

The actual built-in `image_gen.imagegen` schema in this session accepts a prompt and reference images, with no `model` parameter. No tool output provided an explicit API model ID or dated snapshot. The local Codex CLI reports image generation enabled; its feature list does not provide a separate image-model selector. This observation does not claim that no other product or account could offer one.

## What the original images establish

All four original PNGs contain `softwareAgent: {name: "gpt-image", version: "2.0"}` in their C2PA data. A separate reviewer decoded the CBOR actions in `forest-v1.png` and found the agent under `c2pa.created`, with an algorithmically generated media source type. The signature was not cryptographically validated.

This is embedded software provenance, not proof of a specific serving model. No official mapping from this `2.0` label to the API model ID `gpt-image-2` was established. It cannot independently confirm or rule out GPT Image 2.5. The [OpenAI content-provenance guide](https://developers.openai.com/api/docs/guides/content-provenance) qualifies model identification on its availability and shows a family-level `gpt-image` example.

Accurate description: **Generated with the built-in image tool; exact serving model unverified.** The original PNG metadata remains intact.

## Additional route checked

The tool catalogue also exposed Higgsfield model-search and balance metadata. Actual read-only calls to both returned `Mcp error -32001: Unknown tool`. Therefore this session did not establish a working connection, available GPT Image 2.5 model, free allowance, or generation price for that service. No generation, upload, trial signup, subscription, or credit expenditure was performed there. The plugin-management search/suggestion tools were not exposed in this session; inspecting the local plugin catalogue did not establish a working free model-selection route.

No new integration was installed speculatively. Neither paid API generation nor a trial with future charges satisfies the user's zero-spend constraint without further evidence.

## Remaining condition

To verify the original requirement, the session needs a working generation route that both identifies GPT Image 2.5 and confirms no additional payment. Once available, use the saved prompts and original images as references, preserve new masters as a new version, and publish through the existing catalogue. If the user explicitly accepts the currently available built-in output instead, record that changed requirement separately; silence is not acceptance.
