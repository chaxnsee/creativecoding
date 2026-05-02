# BASCII

Burmese + American Standard Code for Information Interchange.

A browser-based creative coding tool that reconstructs webcam, uploaded-image, or no-camera ambient portraits as living Burmese/Myanmar Unicode typography.

## Run

Start a local server from this folder:

```bash
python3 -m http.server 4173
```

Open:

```text
http://localhost:4173
```

Using `localhost` is recommended because webcam access is restricted on raw `file://` pages in modern browsers.

## Quick Customization Map

Use these files when you want to rename, restyle, or rebrand the project:

- App/browser tab title: edit `<title>` in `index.html`.
- Main visible app name: edit the `<h1>` inside `.brand` in `index.html`.
- Subtitle under the name: edit the `<p>` inside `.brand` in `index.html`.
- Logo/icon image: replace `assets/brand-icon.png`, or edit the `.brand-mark` image in `index.html`.
- Button icons: change each `data-lucide="..."` value in `index.html`.
- Website credit link: edit the `.site-credit` footer link in `index.html`.
- Google font import: change the Google Fonts `<link>` in `index.html`.
- UI/canvas font stack: edit `font-family` in `styles.css` and `fontStack()` / `formattedFont()` in `src/renderer.js`.
- Preset names/colors: edit `PRESETS` in `src/glyphs.js`.
- Character/glyph packs: edit `BURMESE_GLYPH_TIERS`, `ASCII_GLYPH_TIERS`, `HYBRID_GLYPH_TIERS`, `LOVE_GLYPH_TIERS`, `SYMBOL_GLYPH_TIERS`, `CUTE_GLYPH_TIERS`, and `INTERNET_GLYPH_TIERS` in `src/glyphs.js`.
- Status messages and default labels used by JS: edit `UI_COPY` in `src/app.js`.
- Default poem title/body/author: edit `#poemTitle`, `#poemParagraph`, and `#poemAuthor` values in `index.html`.

## Changing Icons

This app uses Lucide icons from the CDN in `index.html`.

Example:

```html
<i data-lucide="video"></i>
```

Change `"video"` to another Lucide icon name, such as `"camera"`, `"sparkles"`, `"heart"`, `"image-up"`, or `"download"`. After changing icons, keep this script in `index.html`:

```html
<script src="https://unpkg.com/lucide@latest"></script>
```

The app calls `window.lucide.createIcons()` in `src/app.js`.

## Changing Fonts

The current font is loaded in `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=DotGothic16&display=swap" rel="stylesheet" />
```

To use a different Google Font:

1. Replace the Google Fonts URL in `index.html`.
2. Update the CSS font stack in `styles.css`.
3. Update `fontStack()` and `formattedFont()` in `src/renderer.js` so the canvas uses the same font.

## Features

- Real-time webcam input with MediaPipe Face Mesh depth cues.
- Image upload mode for still portraits.
- Starts in no-camera ambient mode for standalone generative text compositions.
- Red `အချစ်` special mode with heart symbols and hybrid Burmese/ASCII glyphs.
- Burmese-only, ASCII-only, and hybrid glyph modes.
- Symbol packs for core text, symbols, cute text, and internet-core aesthetics.
- Poetic text editor with title, paragraph, author, bold/italic/underline, alignment, and text-light controls.
- Fixed output screens for 1:1, 4:3, and 9:16 compositions.
- Drift, rain, and orbit flow modes with adjustable flow strength.
- Camera-only Pretext Session mode with motion-responsive editable text, inspired by Pretext by Cheng Lou.
- Density, font size, depth, smoothing, speed, contrast, saturation, glow, and blend controls.
- Terminal, cyberpunk neon, Thingyan gold, and monochrome presets.
- PNG, GIF, 15-second video export with MP4 when supported by the browser, and copy-to-text export.

## Notes

The app is intentionally static and dependency-light. It loads MediaPipe Face Mesh, GIF export support, Lucide icons, and the Google Font from CDNs at runtime, so those features need browser internet access on first load.

Pretext Session is an artistic, motion-reactive text mode inspired by Cheng Lou's Pretext project: https://github.com/chenglou/pretext
