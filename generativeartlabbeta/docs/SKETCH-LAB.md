# P5 Sketch Lab

A generative-art remix and audio laboratory, with no photographs, image data, reference tracing, or reconstructed photo geometry. Uses p5.js 1.11.11. The standalone P5-SKETCH-LAB.html includes p5, artwork code, and the Unicode Burmese font; the sketch.js can also be pasted into the p5.js editor.

## English / မြန်မာ
Choose English or မြန်မာ above the controls. Labels, method guides, statuses, hand data and recording controls switch without restarting the sketch. The font is embedded. The browser remembers the language; saved settings include it too.

မီနူးအပေါ်ရှိ ဘာသာစကားမှ English သို့မဟုတ် မြန်မာကို ရွေးပါ။ ပုံဖန်တီးနည်း၊ ဆလိုက်ဒါ၊ လက်ဒေတာနှင့် မှတ်တမ်းတင်မှုဆိုင်ရာ စာသားများကို ဘာသာစကားနှစ်မျိုးဖြင့် သုံးနိုင်သည်။

## Slider laboratory
Drawing methods are selected with a menu of 20 numbered buttons; all remaining artwork parameters use sliders. Utility buttons handle exports, randomization, fullscreen, settings, and camera start/stop. The method buttons select twenty distinct systems and load a useful starting configuration:

- Curl-noise streamlines: rotated finite differences of a p5 Perlin scalar field. Suggested exploration: flowing filaments, smoke and currents. A changes directional bias; B changes integration step; C scales the curl direction; D bends the field. Warp displaces paths; noise scale changes the underlying field.
- Clifford attractor: x'=sin(a*y)+c*cos(a*x), y'=sin(b*x)+d*cos(b*y), computed simultaneously from the previous point. Suggested exploration: dense ink clouds and folded particle structures. A–D directly control the recurrence.
- De Jong attractor: x'=sin(a*y)-cos(b*x), y'=sin(c*x)-cos(d*y). Suggested exploration: granular orbits and knots. A–D directly control the recurrence.
- Harmonic lace: superposed sine waves with A–D controlling frequencies. Suggested exploration: fine oscillating ribbons and overlapping linework.
- Warped contours: nested rings displaced by two stages of Perlin noise. Suggested exploration: topographic rings and organic membranes. A controls radial lobes, B their amplitude; C scales the second warp, D controls extra ripples.

- Superformula shells: A polar superformula turns four exponents and symmetry into nested organic shells. Try pollen forms, sculptural petals and soft geometric emblems. A: symmetry · B: roundness · C/D: horizontal/vertical exponents.
- Hypotrochoid spirographs: A point on a circle rolling inside another circle draws nested spirograph curves. Try intricate rosettes, mechanical lace and looping pen drawings. A: outer radius · B: rolling radius · C: pen offset · D: turns.
- Epitrochoid spirographs: A point on a circle rolling outside another circle draws scalloped orbital curves. Try radiant medallions, scalloped flowers and orbital filigree. A: fixed radius · B: rolling radius · C: pen offset · D: turns.
- Polar rose gardens: A signed polar cosine radius produces layered mathematical rose curves. Try petal mandalas, radial flowers and luminous botanical diagrams. A: petals · B: aspect · C: petal sharpness · D: petal phase.
- Phyllotaxis seed spirals: Golden-angle placement distributes small petal paths over a growing spiral disk. Try sunflower heads, seed constellations and botanical particle fields. A: divergence offset · B: radial growth · C: seed size · D: petal twist.
- Projected torus knots: Three-dimensional torus-knot curves are rotated and projected onto the canvas. Try braided light sculptures, orbital rings and dimensional woven loops. A/B: winding counts · C: tube radius · D: camera tilt.
- Mobius ribbon sections: Curves sample an odd half-twisted strip, then rotate through a projected view. Try impossible ribbons, folded bands and continuous sculptural surfaces. A: odd half-twists · B: band width · C: rim wave · D: camera tilt.
- Wave interference contours: Marching squares extracts contour segments from a field of interfering waves. Try diffraction-like textures, watery contours and vibrating wave maps. A: wavelength · B: source spacing · C: wave balance · D: contour level.
- Truchet arc tiles: Seeded quarter-circle tile orientations form a modular network of curved paths. Try tiled labyrinths, rounded circuits and repeating architectural patterns. A: tile orientation bias · B: arc radius · C: arc ripple · D: tile sway.
- Recursive branching: A seeded binary branch hierarchy draws a family of swaying tree segments. Try root systems, coral silhouettes and branching vascular drawings. A: branch angle · B: length decay · C: sway · D: branch asymmetry.
- Circle inversion orbits: Repeated circle inversions produce orbit samples with a bounded display projection. Try crystalline point clouds, folded constellations and inversion filigree. A: circle spacing · B: inversion radius · C: circle count · D: orbit bias.
- Affine fern IFS: Four probabilistic affine transforms generate a parameterized fern point cloud. Try fractal leaves, fern silhouettes and layered botanical print textures. A: lean · B: stem contraction · C: leaflet spread · D: branch balance.
- Hilbert space-filling weave: A discrete Hilbert traversal is divided into colored paths and gently deformed. Try maze drawings, woven circuit boards and dense square-based textiles. A: recursion order · B: weave wave · C: weave depth · D: phase offset.
- Voronoi cell outlines: Half-plane clipping divides the drawing into nearest-site polygon cells. Try cellular membranes, cracked glass and irregular architectural meshes. A: site sway · B: cell inset · C: site clustering · D: aspect ratio.
- Elastic repulsion loop: Neighbor springs and spatially local repulsion relax a deforming closed chain. Try soft membranes, self-avoiding linework and nervous organic loops. A: spring tension · B: inflation · C: repulsion radius · D: initial folds.

Suggested uses are creative starting points. Some attractor parameters collapse to a small orbit; change A–D or choose the method again to restore its starting point. Dense lines on an attractor intentionally connect orbit points; use Dots for a particle cloud.

Element count, detail, mark style, seed, chaos, per-element variation, noise scale, warp, jitter, twist, motion, palette, white accents, monochrome, bloom, composition, rotational copies and background HSL all have sliders. The selected-element slider chooses a procedural element; its chaos/noise/jitter/glow controls are stored independently. Each procedural element is a streamline, orbit sample batch, lace curve or contour ring, depending on method.

## Remixing methods
METHOD REMIXER can combine any of the 20 methods, including multiple copies of one method. Select a method and ADD LAYER. Adding a layer enables remixing. The main method is a separate optional base, with its own opacity; turn off Include Main Method to work entirely with custom layers. There is no fixed layer-count limit, although drawing more layers takes more work.

Every layer supports mute (Enabled), Solo, layer opacity (separate from ink opacity), blend mode, integer cycles per loop, phase offset, hue shift, independent geometry/noise/chaos/palette/composition sliders, and a seed. Available blend operations are Normal, Screen, Add, Multiply, Overlay, Difference, Exclusion and Cutout (Canvas xor). Their order matters. Move Up/Down changes compositing order; Duplicate copies the layer and its audio mappings; Remove also removes its audio mappings.

Layers begin with their method's starting A–D/count/detail/style and a copy of the main palette/settings. Follow Main Sliders uses the main live settings instead of the layer's stored parameters. Capture Main Settings copies the current manual values and individual overrides into the layer. The layer's own method, opacity, blend, phase, cycles, morph and hue shift remain independent. Each layer shares the main loop duration, so integer cycles retain the common loop even after the loop duration changes.

Geometry Morph blends a layer with a Morph Partner selected from the same 20 methods. The partner has its own A–D controls. Paths are resampled by arc length, then corresponding point positions interpolate. This is a geometry blend, rather than an opacity crossfade. Different topology, disconnected contours, dots and empty paths can change structure during the blend; it is not a topology-preserving surface morph. Regular layer opacity is available for visual crossfades. The layer's mark style draws the blended geometry.

The main sliders remain the main method's manual values. Drawing a layer or applying audio does not overwrite them. Layer snapshots and the audio router are saved in settings JSON.

## Optional audio reactivity
AUDIO REACTIVE is off until the user starts a source. It uses the browser's native Web Audio API and works with either an explicitly enabled microphone or a user-selected audio file. Loading settings never opens a microphone, starts audio playback or starts the camera. Starting microphone input requests audio only; camera tracking separately requests video only. Stop Audio disconnects the source, stops microphone tracks and restores manual/hand-controlled values. The microphone is never monitored through speakers. File playback has a listening-volume control, a loop toggle and native play/pause controls. Files stay local and must be selected again after reloading the page.

Gain, high-pass/low-pass frequency, filter resonance Q, FFT size, spectral smoothing, analysis floor/ceiling in dB, noise gate, attack, release, transient sensitivity and transient averaging are adjustable. The high/low cutoffs are automatically kept ordered. Gain and filters affect analysis only. File Listening Volume affects the monitor bus; Recording Gain affects the exported soundtrack bus. Microphone sound is not connected to the monitor bus.

Signals include RMS overall loudness, bass (20–250 Hz), mids (250–4000 Hz), treble (4000–16000 Hz), a custom frequency band with editable lower/upper Hz, and a transient pulse. Frequency bands use the peak finite FFT bin in the band, normalized between the analysis floor and ceiling; loudness uses time-domain RMS converted to dB. The transient is a positive difference from a slower loudness envelope, not a BPM estimate. A narrow band below the current FFT-bin resolution may contain no bin; increase FFT size for finer frequency resolution. Nyquist limits are applied using the actual AudioContext sample rate. The spectrum uses a log frequency scale, with its Hz-per-bin resolution shown.

ADD AUDIO MAPPING creates an independent route. Select its signal, main artwork or a specific remix layer, target variable, output range, influence, response curve and invert. Main targets include all 46 artwork variables; layer targets also include layer opacity, hue shift, phase offset, cycles and geometry morph. Main scope affects the main method and shared background/transport; choose the specific layer to control an independent layer. Use Global Attack/Release or set response times per route. The envelope follows exponential attack/release, and modulation fades when file playback is paused. Explicit Stop or disabling reactivity restores manual values. Integer controls such as method or cycle count still step between integers; continuous controls such as size, glow and morph respond smoothly.

Audio is blended after the existing hand mapping. Multiple audio routes to one scope/target use an influence-weighted mean, and total influence up to 1 blends that result with the existing hand/manual value. The audio meter and route readouts remain live in data-only mode. Hand routes can continue to control the main method while audio controls either the same variables with partial influence or separate layer variables.

Microphone access needs a supported secure context such as HTTPS/localhost and browser permission; local-file behavior varies by browser. Audio-file input is available when a microphone cannot be used. Neither audio nor video is sent to a server.

## Loops
The renderer recomputes each frame from the current seed, phase and settings. There is no accumulated drawing feedback, so a fixed configuration repeats after Loop duration animation seconds. Playback speed scales that duration; zero pauses. Scrub moves the phase (pause first to hold it). Live edits and gestures alter the picture while interacting. Changing method resets its orbit/geometry starting settings and individual overrides. The Drawing methods menu has 20 numbered buttons and highlights the active method. Buttons work with mouse, touch, Enter and Space. Method IDs stay 0–19 for saved settings and hand routing. When a hand route controls the method, the highlighted button and description follow the live value, and a note explains that hand mapping is selecting the method. Losing that input restores the manual button selection. Hand routes targeting Drawing method can address the same full range. Existing saved routes keep their calibrated output limits; set Output maximum to 19 to span the full collection.

## Recording and downloads
START RECORDING captures the artwork canvas only at 1000×1000, without the menu or camera feed. Include Audio in Video is optional and unchecked by default; it requires an active audio source. Auto prefers supported MP4, falling back to WebM; unavailable format choices are disabled. Choose 30 or 60 fps; actual output depends on rendering and encoding performance. STOP RECORDING finalizes the clip; use the embedded video preview and DOWNLOAD VIDEO. Optional audio is captured through a separate recording bus at a requested 192 kbps; stopping video recording stops only its cloned capture track and leaves the source available. Auto uses an explicitly supported MP4/AAC combination when available and otherwise falls back to supported WebM or another browser-supported container. The recorder uses browser-available codecs, so a filename extension does not promise one particular codec. Output is encoded locally at a requested 12 Mbps, with the actual file extension matched to its media type. No screen or microphone permission is requested.

Record one full loop restarts at phase zero, temporarily holds artwork controls, hand mapping and audio modulation, and stops after one animation cycle. Hand data and the language switch stay live. A paused sketch temporarily plays for the recording, then returns to pause. Keep this tab visible; hiding it stops recording to avoid background-throttled gaps. The last successful clip stays downloadable until replaced or the page closes. Recordings remain in browser memory until downloaded; save the clip before closing the page. Normal recording can include live hand/audio modulation and slider changes; one-loop recording holds settings for a consistent cycle. Browser timestamps and dropped frames mean the encoded clip is not a frame-exact offline render.

PNG exports are 1000×1000 and include only artwork. SAVE/LOAD SETTINGS JSON preserves the lab configuration, individual overrides and every hand route. Old Red Signal photo/reconstruction settings are intentionally incompatible.

## Two-hand tracking and variable routing
START CAMERA + TRACKING enables MediaPipe 0.10.21 with numHands:2. The panel below the artwork shows a live camera, both skeletons, point numbers, model Left/Right labels and their confidence, pinch ratios, tracking updates and inference timing. The coordinate table shows all 21 landmarks for each hand in parallel: raw normalized image X/Y/Z or local world X/Y/Z in meters. It never starts the camera automatically, including after loading settings.

Use HAND → VARIABLE ROUTER, select a starting route, and click INSERT ROUTE. You can add, duplicate and remove independent routes. Starters include either-hand pinch → chaos, a left/right pinch duet, left X + right Y → position, right point X/Y/Z → rotation/scale/noise, and two-hand separation → drawing method.

Every route chooses:

- Hand source: Left, Right, either (higher label confidence), both averaged, Left minus Right, or both-hand point separation. Both-hand sources require both labeled hands; they do not silently fall back to one hand.
- Signal: thumb-index pinch, a selected landmark's X/Y/Z, thumb-pinky spread, or distance between two selected landmarks. Any of the 21 landmarks can be selected with a slider. Pinch and spread are normalized by palm length and always use image coordinates. Same-hand image distances and cross-hand separation use image-height units with the image aspect ratio corrected. World same-hand distance uses meters.
- Coordinate space: image-normalized coordinates or local world coordinates for X/Y/Z and same-hand point distance. Cross-hand separation always uses image XY; subtracting two separate hand-centered world origins would not measure physical hand separation.
- Artwork variable: all 46 artwork variables, including the button-selected drawing method, A–D, geometry, color, bloom, selected element, individual element properties, seed, speed and phase. Routed method selection changes the active formula without repeatedly loading its manual starting preset. Discrete targets round to integers and clamp to valid ranges.
- Input/output minimum and maximum, invert, influence, response curve and smoothing (0–1 second). Set Input Min Here/Max Here calibrate endpoints from the current raw signal. Reversed ranges are allowed. A zero input range disables that route with a visible status. Smoothing follows an exponential response; changing source or reacquiring a hand resets the smoothing state.

Multiple active routes to the same variable use an influence-weighted mean of their mapped outputs. Total influence up to 1 blends that result with the manual value; above 1 uses the weighted result fully. A 0-influence route has no effect. The main menu displays live input values beside affected controls. Each route also shows raw input, normalized response, status and the combined live target value.

Routing uses temporary effective values during rendering. The stored/manual sliders are never overwritten by hand movement. Missing, stale (>600 ms), insufficient-confidence or unavailable required input returns the affected variable to its manual value immediately, including when animation is paused. A route requiring world landmarks does not silently substitute image coordinates. Individual element routes affect the effective selected procedural element only.

Minimum label confidence filters routing by handedness confidence, not landmark accuracy. Labels come from the model and are resolved by their Left/Right category, not result-array position. Swap Left/Right Labels is available if the labels disagree with your physical hands. Mirroring is a display option; X Follows Mirrored Preview optionally maps image X in the same direction as the visible preview. The raw coordinate table remains unchanged by mirroring. Image Z is wrist-relative, not absolute distance to the camera; world coordinates are local to each hand's center, not a shared room coordinate system.

The global Apply Routes switch allows data-only viewing. One-loop video recording holds all mappings, while the camera and raw data remain live; mappings resume afterward. Stop Camera stops all camera tracks. Hand tracking requests no microphone; audio input is controlled separately. Model loading needs internet, camera permission and a supported context such as HTTPS or localhost. All non-camera artwork controls work offline.

Settings use p5-sketch-lab-v3 and save remix layers, morph partners, audio settings/routes plus all route definitions, calibration, response, manual art values and individual overrides. Older p5-sketch-lab-v1/v2 files remain supported; v1 files migrate their single gesture target into one route. Loading settings never starts a camera; transient tracking measurements and smoothing state are not saved.

## References and licenses
All 20 method IDs and v1/v2 saved settings remain compatible. Shared Voronoi sites and the elastic loop are cached only within a frame. The elastic loop uses a fixed vertex count and fixed relaxation iterations, rather than adaptive vertex insertion. Count is grid rows for wave contours; Detail sets grid columns there and relaxation iterations for the elastic loop. Voronoi uses Count sites; Detail samples each polygon outline. Torus/Mobius methods project computed 3D curves into the 2D drawing. These are original interactive adaptations, with common chaos/noise/jitter controls layered over the underlying geometry.

The attractor equations follow Paul Bourke's Clifford and Peter de Jong references:
https://paulbourke.org/fractals/clifford/
https://paulbourke.org/fractals/peterdejong/
Superformula reference: https://paulbourke.net/geometry/supershape/
Fern affine-system reference: https://people.math.sc.edu/Burkardt/m_src/fern/fern.html
Seeded Perlin noise: https://p5js.org/reference/p5/noise/
Hand landmarks and coordinate conventions: https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js
Recording: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
p5.js: LGPL-2.1, bundled license. Noto Sans Myanmar: SIL Open Font License, bundled license. Native Web Audio is used without a sound-library dependency. No reference-image assets are used.
