# ASO Audit Agent — how the audit works

A 37.75-second, silent explainer authored in Rust and rendered with [Psychopomp](https://github.com/kitlangton/psychopomp). It explains the input, listing confirmation, public evidence collection, parallel scoring, weighted report, follow-up questions, and saved history.

- Repository video: [aso-audit-explainer.mp4](../../docs/assets/aso-audit-explainer.mp4) — 1920 × 1080, 60 FPS
- Local render output: `output/aso-audit-explainer-v4.mp4`
- Editable choreography: `src/main.rs`
- Renderer input: `aso-audit-explainer.reel.json`
- Renderer font patch: `renderer/helvetica-neue.patch`
- Inspected frames: `output/proof-v4/*.png`
- Psychopomp revision: `46fd6121d0c2067f22a176e2187924a9914e9453`

## Opening and typography

Version 4 uses Helvetica Neue throughout. The video begins with “How the audit works” and “Start with an App Store URL or app ID.” These fade in over 750 ms with a restrained 12-pixel rise. A 700-ms transition leads into “First, a checkpoint.” The original promotional opening and closing remain removed.

The renderer patch selects installed Helvetica Neue for the family used by these recipes. It also adds a test that verifies regular and bold resolve to Helvetica Neue, while preserving verification of the bundled CommitMono faces. The font is not bundled; the rendering machine must have Helvetica Neue installed. All scenes are re-rendered and their measured layouts checked after the font change.

## Visual explanation

Confirmation uses a pause-to-check ring. A particle hub gathers public evidence. Three colored lanes show parallel scoring. A rolling example score accompanies staggered recommendations. The ending explains how follow-up questions and saved audit history work. The 78/100 score is explicitly illustrative, and the report is described as a heuristic assessment with limitations. These diagrams summarize the workflow; they are not captures of the app UI.

## Regenerate

From this directory, with a recent Rust toolchain:

```sh
cargo run --release -- aso-audit-explainer.reel.json
```

With FFmpeg/libx264, a working GPU, and installed Helvetica Neue, build the patched renderer and export:

```sh
git clone https://github.com/kitlangton/psychopomp.git /tmp/psychopomp-renderer
git -C /tmp/psychopomp-renderer checkout 46fd6121d0c2067f22a176e2187924a9914e9453
git -C /tmp/psychopomp-renderer apply --unidiff-zero "$PWD/renderer/helvetica-neue.patch"
cargo build --release --manifest-path /tmp/psychopomp-renderer/Cargo.toml -p psychopomp-render
/tmp/psychopomp-renderer/target/release/psychopomp plan validate aso-audit-explainer.reel.json
/tmp/psychopomp-renderer/target/release/psychopomp plan render aso-audit-explainer.reel.json output/aso-audit-explainer-v4.mp4 --theme original
```

The JSON reel is self-contained and can be rendered without recompiling the Scene Program. The font patch must still be applied to the renderer.

## Earlier versions

Earlier versions and proof frames are retained locally in ignored `output/` and `versions/` directories. Only the approved video, its preview image, and the current source are intended for Git.

## Validation

The Scene Program passes strict Clippy and formatting. Psychopomp workspace tests pass, including Helvetica Neue resolution and bundled CommitMono checks. The renderer passes Clippy with the pre-existing `chunks_exact_to_as_chunks` lint allowed; strict workspace Clippy on Rust 1.99 reports that lint in unchanged upstream files. No upstream rendering code was changed to silence it. Rendered proof frames check the opening, confirmation, evidence, scoring lanes, rolling number, and conversation/history ending.
