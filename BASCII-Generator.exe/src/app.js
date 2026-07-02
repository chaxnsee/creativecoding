import { Exporter } from "./exporter.js";
import { FaceProcessor } from "./faceProcessor.js?v=bascii-depth-open-20260701";
import { PRESETS } from "./glyphs.js";
import { BurmeseAsciiRenderer } from "./renderer.js?v=bascii-text-mixer-20260701";
import { SourceManager } from "./source.js?v=bascii-draw-studio-20260701";

const ARTCORE_SHAPES = {
  burmese: {
    title: "စကြဝဠာ Artcore",
    paragraph: [
      "              စကြဝဠာ",
      "        က ခ ဂ င စ ဆ ဇ",
      "     ၀ ၁ ၂   နက္ခတ်   ၃ ၄ ၅",
      "   မ ယ ရ လ  စကြဝဠာ  ဝ သ ဟ အ",
      "     ၆ ၇ ၈   ဂလက်ဆီ   ၉ ၀ ၁",
      "        ည တ ထ ဒ န မ ယ",
      "              စကြဝဠာ"
    ].join("\n"),
    author: "shape study / asciiart.eu reference"
  },
  ascii: {
    title: "စကြဝဠာ / Galaxy Artcore",
    paragraph: [
      "              စကြဝဠာ",
      "        * . + # @ # + . *",
      "     0 1 2   G A L A X Y   3 4 5",
      "   A S C I I   U N I V E R S E   C O R E",
      "     6 7 8   O R B I T   9 0 1",
      "        * . + # @ # + . *",
      "              စကြဝဠာ"
    ].join("\n"),
    author: "shape study / asciiart.eu reference"
  },
  hybrid: {
    title: "စကြဝဠာ BASCII Artcore",
    paragraph: [
      "              စကြဝဠာ",
      "        က ခ ဂ  @ # @  G A L",
      "     ၀ ၁ ၂   GALAXY   ၃ ၄ ၅",
      "   B A S C I I   စကြဝဠာ   CORE",
      "     ၆ ၇ ၈   ORBIT   9 0 1",
      "        မ ယ ရ  + * +  STAR",
      "              စကြဝဠာ"
    ].join("\n"),
    author: "shape study / asciiart.eu reference"
  }
};

const elements = {
  canvas: document.querySelector("#portraitCanvas"),
  screenFrame: document.querySelector("#screenFrame"),
  video: document.querySelector("#webcam"),
  image: document.querySelector("#uploadPreview"),
  imageInput: document.querySelector("#imageInput"),
  cameraButton: document.querySelector("#cameraButton"),
  ambientButton: document.querySelector("#ambientButton"),
  drawButton: document.querySelector("#drawButton"),
  shuffleButton: document.querySelector("#shuffleButton"),
  loveButton: document.querySelector("#loveButton"),
  artcoreButton: document.querySelector("#artcoreButton"),
  poemTitle: document.querySelector("#poemTitle"),
  poemParagraph: document.querySelector("#poemParagraph"),
  poemAuthor: document.querySelector("#poemAuthor"),
  textLight: document.querySelector("#textLight"),
  status: document.querySelector("#status"),
  aspectLabel: document.querySelector("#aspectLabel"),
  sourceLabel: document.querySelector("#sourceLabel"),
  density: document.querySelector("#density"),
  fontSize: document.querySelector("#fontSize"),
  renderScale: document.querySelector("#renderScale"),
  flowStrength: document.querySelector("#flowStrength"),
  photoAmount: document.querySelector("#photoAmount"),
  sourceMix: document.querySelector("#sourceMix"),
  sourceScale: document.querySelector("#sourceScale"),
  sourceOffsetX: document.querySelector("#sourceOffsetX"),
  sourceOffsetY: document.querySelector("#sourceOffsetY"),
  sourceBlur: document.querySelector("#sourceBlur"),
  sourceBrightness: document.querySelector("#sourceBrightness"),
  dither: document.querySelector("#dither"),
  posterize: document.querySelector("#posterize"),
  imageScale: document.querySelector("#imageScale"),
  imageOffsetX: document.querySelector("#imageOffsetX"),
  imageOffsetY: document.querySelector("#imageOffsetY"),
  depthIntensity: document.querySelector("#depthIntensity"),
  smoothing: document.querySelector("#smoothing"),
  animationSpeed: document.querySelector("#animationSpeed"),
  fpsTarget: document.querySelector("#fpsTarget"),
  drawBlank: document.querySelector("#drawBlank"),
  drawBrushSize: document.querySelector("#drawBrushSize"),
  drawOpacity: document.querySelector("#drawOpacity"),
  drawScatter: document.querySelector("#drawScatter"),
  drawTextInput: document.querySelector("#drawTextInput"),
  drawTextSize: document.querySelector("#drawTextSize"),
  textMixAmount: document.querySelector("#textMixAmount"),
  textMixMode: document.querySelector("#textMixMode"),
  drawTextButton: document.querySelector("#drawTextButton"),
  clearDrawingButton: document.querySelector("#clearDrawingButton"),
  contrast: document.querySelector("#contrast"),
  saturation: document.querySelector("#saturation"),
  glow: document.querySelector("#glow"),
  blend: document.querySelector("#blend"),
  postVignette: document.querySelector("#postVignette"),
  postScanlines: document.querySelector("#postScanlines"),
  postCurvature: document.querySelector("#postCurvature"),
  postChromatic: document.querySelector("#postChromatic"),
  postBloom: document.querySelector("#postBloom"),
  postCharBloom: document.querySelector("#postCharBloom"),
  postCharChromatic: document.querySelector("#postCharChromatic"),
  postFilmGrain: document.querySelector("#postFilmGrain"),
  postGlitch: document.querySelector("#postGlitch"),
  postRgbSplit: document.querySelector("#postRgbSplit"),
  postPixelate: document.querySelector("#postPixelate"),
  postHalftone: document.querySelector("#postHalftone"),
  postFilmDust: document.querySelector("#postFilmDust"),
  poeticMode: document.querySelector("#poeticMode"),
  mirrorMode: document.querySelector("#mirrorMode"),
  transparentBg: document.querySelector("#transparentBg"),
  invertMedia: document.querySelector("#invertMedia"),
  fgColor: document.querySelector("#fgColor"),
  depthColor: document.querySelector("#depthColor"),
  bgColor: document.querySelector("#bgColor"),
  gradientPreview: document.querySelector("#gradientPreview"),
  pngButton: document.querySelector("#pngButton"),
  gifButton: document.querySelector("#gifButton"),
  videoButton: document.querySelector("#videoButton"),
  txtButton: document.querySelector("#txtButton"),
  copyButton: document.querySelector("#copyButton"),
  textExport: document.querySelector("#textExport")
};

const state = {
  charMode: "burmese",
  symbolPack: "core",
  aspect: "1 / 1",
  flowMode: "drift",
  photoMode: "normal",
  drawMode: false,
  textRenderActive: false,
  textMixActive: false,
  textMixAmount: 1,
  textMixMode: "sequence",
  drawTool: "paint",
  drawBackground: "black",
  artcoreMode: false,
  shuffleSeed: 0,
  textFormat: {
    bold: true,
    italic: false,
    underline: false,
    align: "center"
  }
};

const UI_COPY = {
  en: {
    title: "BASCII",
    subtitle: "Burmese + American Standard Code for Information Interchange",
    startCamera: "Start webcam",
    noCameraMode: "No camera mode",
    uploadImage: "Upload image or video",
    camera: "Camera",
    noCamera: "No Cam",
    image: "Media",
    draw: "Draw",
    drawModeTitle: "Draw BASCII by hand",
    burmese: "Burmese",
    hybrid: "Hybrid",
    corePack: "Core",
    symbolsPack: "Symbols",
    cutePack: "Cute",
    internetPack: "Net",
    shuffle: "Shuffle",
    shuffleGlyphs: "Shuffle glyph layout",
    artcore: "စကြဝဠာ Artcore",
    artcoreModeTitle: "Insert copyable galaxy artcore",
    drawStudio: "Draw Studio",
    drawHint: "paint with glyphs",
    paint: "Paint",
    erase: "Erase",
    blackBg: "Black",
    whiteBg: "White",
    blankCanvas: "Blank canvas",
    brushSize: "Brush Size",
    brushOpacity: "Opacity",
    brushScatter: "Scatter",
    textSize: "Text Size",
    textToAscii: "Text Mixer",
    textMixerHint: "Replaces the existing glyph slots with your typed English or Burmese text.",
    textMixAmount: "Mix",
    textMixOrder: "Order",
    mixSequence: "Sequence",
    mixRandom: "Random",
    mixWave: "Wave",
    renderBascii: "Apply Text Mix",
    drawTextPlaceholder: "Type English or Burmese text to replace the live glyph field...",
    clearDrawing: "Clear",
    drift: "Drift",
    rain: "Rain",
    orbit: "Orbit",
    photoBlend: "Media Stylizer",
    imageOnly: "Image / video",
    normalBlend: "Normal",
    screenBlend: "Screen",
    differenceBlend: "Difference",
    photoStrength: "Strength",
    sourceMix: "Source Mix",
    sourceSize: "Back Size",
    sourceX: "Back X",
    sourceY: "Back Y",
    sourceBlur: "Back Blur",
    sourceBright: "Back Light",
    dither: "Dither",
    posterize: "Posterize",
    imageSize: "Size",
    imageX: "Image X",
    imageY: "Image Y",
    density: "Density",
    font: "Font",
    pixelScale: "Resolution",
    flow: "Flow",
    depth: "Depth",
    smoothing: "Smoothing",
    speed: "Speed",
    fps: "FPS",
    contrast: "Contrast",
    saturation: "Saturation",
    glow: "Glow",
    textLight: "Text Light",
    blend: "Blend",
    postProcessing: "Post-Processing",
    vignette: "Vignette",
    scanLines: "Scan Lines",
    crtCurvature: "CRT Curve",
    chromatic: "Chromatic",
    bloom: "Bloom",
    charBloom: "Char Bloom",
    charChromatic: "Char Chrom",
    filmGrain: "Film Grain",
    glitch: "Glitch",
    rgbSplit: "RGB Split",
    pixelate: "Pixelate",
    halftone: "Halftone",
    filmDust: "Film Dust",
    poeticMode: "Poetic mode",
    poemEditor: "Poetic Text",
    liveText: "Live",
    mirror: "Mirror",
    transparentBg: "Transparent",
    invertMedia: "Invert media",
    output: "Output",
    source: "Source",
    idle: "Idle",
    noSource: "No camera or image",
    terminal: "Terminal",
    neon: "Neon",
    thingyan: "Thingyan",
    mono: "Mono",
    glyph: "Glyph",
    back: "Back",
    video: "Video",
    copy: "Copy",
    copyText: "Copy Text",
    waiting: "Waiting for camera or image.",
    requestingCamera: "Requesting camera access...",
    cameraLive: "Camera live. Face and hand tracking are listening for structure.",
    cameraDenied: "Camera permission was not granted.",
    loadingImage: "Loading media...",
    imageLoaded: "Media loaded. Burmese ASCII reconstruction is active.",
    sourceCamera: "Camera",
    sourceImage: "Image",
    sourceVideo: "Video",
    sourceDraw: "Draw",
    sourceAmbient: "No Cam",
    ambientLive: "Blank canvas ready. Start Camera or upload an image to begin.",
    shuffledGlyphs: "Glyph layout shuffled.",
    drawModeActive: "Draw mode active.",
    drawingCleared: "Text mixer cleared.",
    drawTextInserted: "Text is now mixing into the BASCII field.",
    loveModeTitle: "Love special mode",
    loveModeActive: "အချစ် mode active.",
    artcoreInserted: "စကြဝဠာ galaxy artcore inserted into Poetic Text.",
    pngExported: "PNG exported.",
    txtExported: "Text file exported.",
    noText: "No text output yet.",
    textCopied: "Text output copied.",
    videoUnavailable: "Video recording is not available in this browser.",
    recordingVideo: "Recording {seconds}s video...",
    videoExported: "Video exported.",
    mp4Fallback: "MP4 is not supported here, so WebM was exported.",
    gifUnavailable: "GIF encoder did not load. PNG and video export still work.",
    capturingGif: "Capturing GIF frames...",
    gifExported: "GIF exported.",
    gifFailed: "GIF export could not start. Try PNG or video export."
  }
};

const renderer = new BurmeseAsciiRenderer(elements.canvas);
const faceProcessor = new FaceProcessor({ status: elements.status });
const sourceManager = new SourceManager({
  video: elements.video,
  image: elements.image,
  imageInput: elements.imageInput,
  mirrorToggle: elements.mirrorMode,
  status: elements.status,
  sourceLabel: elements.sourceLabel,
  getText
});
const exporter = new Exporter({ canvas: elements.canvas, renderer, status: elements.status, getText });
let lastTextExport = "";
let textExportRefreshPending = true;
let lastRenderAt = 0;
let pointerPainting = false;

bindControls();
applyPreset("terminal");
sourceManager.startAmbient();
await faceProcessor.init();
requestAnimationFrame(loop);

async function loop() {
  const now = performance.now();
  const shouldRender = shouldRenderFrame(now);
  if (shouldRender) {
    syncState();
    const source = sourceManager.element;
    if (sourceManager.ready && source) {
      faceProcessor.process(source, Number(state.smoothing));
    }
    renderer.render({ source, sourceManager, faceProcessor, state });
    if (textExportRefreshPending) {
      refreshTextExport();
      textExportRefreshPending = false;
    }
  }
  requestAnimationFrame(loop);
}

function shouldRenderFrame(now) {
  const target = elements.fpsTarget.value;
  if (target === "original") {
    lastRenderAt = now;
    return true;
  }
  const fps = Number(target);
  if (!fps || fps <= 0) {
    lastRenderAt = now;
    return true;
  }
  const interval = 1000 / fps;
  if (now - lastRenderAt < interval - 0.5) return false;
  lastRenderAt = now - ((now - lastRenderAt) % interval);
  return true;
}

function bindControls() {
  elements.cameraButton.addEventListener("click", async () => {
    try {
      state.drawMode = false;
      document.body.dataset.drawMode = "false";
      await sourceManager.startCamera();
    } catch (error) {
      setStatus("cameraDenied");
    }
  });

  elements.imageInput.addEventListener("change", () => {
    state.drawMode = false;
    document.body.dataset.drawMode = "false";
  });

  elements.ambientButton.addEventListener("click", () => {
    state.drawMode = false;
    document.body.dataset.drawMode = "false";
    exitLoveModeForAmbient();
    elements.flowStrength.value = "0.10";
    sourceManager.startAmbient();
  });

  elements.drawButton?.addEventListener("click", () => {
    if (state.drawMode) deactivateDrawMode();
    else activateDrawMode();
  });

  elements.loveButton.addEventListener("click", () => {
    activateLoveMode();
  });

  elements.artcoreButton.addEventListener("click", () => {
    activateArtcoreMode();
  });

  elements.shuffleButton.addEventListener("click", () => {
    state.shuffleSeed = Math.floor(Math.random() * 1_000_000);
    requestTextExportRefresh();
    setStatus("shuffledGlyphs");
  });

  for (const button of document.querySelectorAll(".segment")) {
    button.addEventListener("click", () => {
      document.querySelectorAll(".segment").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.charMode = button.dataset.mode;
      elements.loveButton.classList.remove("active");
      elements.artcoreButton.classList.remove("active");
      state.artcoreMode = false;
    });
  }

  for (const button of document.querySelectorAll(".pack-segment")) {
    button.addEventListener("click", () => {
      document.querySelectorAll(".pack-segment").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.symbolPack = button.dataset.pack;
      elements.loveButton.classList.remove("active");
      elements.artcoreButton.classList.remove("active");
    });
  }

  for (const button of document.querySelectorAll(".ratio-segment")) {
    button.addEventListener("click", () => {
      document.querySelectorAll(".ratio-segment").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.aspect = button.dataset.aspect;
      applyAspect(state.aspect);
    });
  }

  for (const button of document.querySelectorAll(".flow-segment")) {
    button.addEventListener("click", () => {
      document.querySelectorAll(".flow-segment").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.flowMode = button.dataset.flow;
    });
  }

  for (const button of document.querySelectorAll(".photo-mode-segment")) {
    button.addEventListener("click", () => {
      document.querySelectorAll(".photo-mode-segment").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.photoMode = button.dataset.photoMode;
    });
  }

  for (const button of document.querySelectorAll(".draw-tool-segment")) {
    button.addEventListener("click", () => {
      document.querySelectorAll(".draw-tool-segment").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.drawTool = button.dataset.drawTool;
    });
  }

  for (const button of document.querySelectorAll(".draw-bg-segment")) {
    button.addEventListener("click", () => {
      document.querySelectorAll(".draw-bg-segment").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.drawBackground = button.dataset.drawBg;
    });
  }

  elements.clearDrawingButton?.addEventListener("click", () => {
    state.textMixActive = false;
    renderer.clearTextMixer();
    requestTextExportRefresh();
    setStatus("drawingCleared");
  });

  elements.drawTextButton?.addEventListener("click", () => {
    syncState();
    const text = elements.drawTextInput.value.trim();
    if (!text) {
      state.textMixActive = false;
      renderer.clearTextMixer();
      requestTextExportRefresh();
      setStatus("noText");
      return;
    }
    renderer.setTextMixer(text);
    state.textMixActive = true;
    state.drawMode = false;
    document.body.dataset.drawMode = "false";
    requestTextExportRefresh();
    setStatus("drawTextInserted");
  });

  elements.drawTextInput?.addEventListener("input", () => {
    if (!state.textMixActive) return;
    const text = elements.drawTextInput.value.trim();
    if (!text) {
      state.textMixActive = false;
      renderer.clearTextMixer();
    } else {
      renderer.setTextMixer(text);
    }
    requestTextExportRefresh();
  });

  elements.textMixAmount?.addEventListener("input", requestTextExportRefresh);
  elements.textMixMode?.addEventListener("change", requestTextExportRefresh);

  elements.canvas.addEventListener("pointerdown", (event) => {
    if (!state.drawMode) return;
    pointerPainting = true;
    elements.canvas.setPointerCapture(event.pointerId);
    paintAtPointer(event);
  });

  elements.canvas.addEventListener("pointermove", (event) => {
    if (!pointerPainting || !state.drawMode) return;
    paintAtPointer(event);
  });

  for (const eventName of ["pointerup", "pointercancel", "pointerleave"]) {
    elements.canvas.addEventListener(eventName, (event) => {
      if (!pointerPainting) return;
      pointerPainting = false;
      if (elements.canvas.hasPointerCapture?.(event.pointerId)) {
        elements.canvas.releasePointerCapture(event.pointerId);
      }
    });
  }

  for (const button of document.querySelectorAll(".preset")) {
    button.addEventListener("click", () => applyPreset(button.dataset.preset));
  }

  const colorInputs = [elements.fgColor, elements.depthColor, elements.bgColor];
  for (const input of colorInputs) {
    input.addEventListener("input", updateColorVars);
  }

  elements.pngButton.addEventListener("click", () => exporter.savePng());
  elements.gifButton.addEventListener("click", () => exporter.saveGif());
  elements.videoButton.addEventListener("click", () => exporter.recordVideo());
  elements.txtButton.addEventListener("click", () => {
    refreshTextExport();
    exporter.saveText();
  });
  elements.copyButton.addEventListener("click", () => {
    refreshTextExport();
    exporter.copyText();
  });

  for (const button of document.querySelectorAll(".format-button")) {
    button.addEventListener("click", () => {
      const key = button.dataset.format;
      state.textFormat[key] = !state.textFormat[key];
      button.classList.toggle("active", state.textFormat[key]);
    });
  }

  for (const button of document.querySelectorAll(".align-button")) {
    button.addEventListener("click", () => {
      document.querySelectorAll(".align-button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.textFormat.align = button.dataset.align;
    });
  }

  window.addEventListener("resize", () => renderer.resize());

  if (window.lucide) {
    window.lucide.createIcons();
  }

  applyAspect(state.aspect);
}

function syncState() {
  state.density = elements.density.value;
  state.fontSize = elements.fontSize.value;
  state.renderScale = elements.renderScale.value;
  state.flowStrength = elements.flowStrength.value;
  state.photoAmount = elements.photoAmount.value;
  state.sourceMix = elements.sourceMix.value;
  state.sourceScale = elements.sourceScale.value;
  state.sourceOffsetX = elements.sourceOffsetX.value;
  state.sourceOffsetY = elements.sourceOffsetY.value;
  state.sourceBlur = elements.sourceBlur.value;
  state.sourceBrightness = elements.sourceBrightness.value;
  state.dither = elements.dither.value;
  state.posterize = elements.posterize.value;
  state.imageScale = elements.imageScale.value;
  state.imageOffsetX = elements.imageOffsetX.value;
  state.imageOffsetY = elements.imageOffsetY.value;
  state.textLight = elements.textLight.value;
  state.depthIntensity = elements.depthIntensity.value;
  state.smoothing = elements.smoothing.value;
  state.animationSpeed = elements.animationSpeed.value;
  state.fpsTarget = elements.fpsTarget.value;
  state.drawBlank = Boolean(elements.drawBlank?.checked);
  state.drawBrushSize = elements.drawBrushSize?.value || 24;
  state.drawOpacity = elements.drawOpacity?.value || 0.88;
  state.drawScatter = elements.drawScatter?.value || 0.12;
  state.drawTextSize = elements.drawTextSize?.value || 22;
  state.textMixAmount = elements.textMixAmount?.value || 1;
  state.textMixMode = elements.textMixMode?.value || "sequence";
  state.contrast = elements.contrast.value;
  state.saturation = elements.saturation.value;
  state.glow = elements.glow.value;
  state.blend = elements.blend.value;
  state.postVignette = elements.postVignette.value;
  state.postScanlines = elements.postScanlines.value;
  state.postCurvature = elements.postCurvature.value;
  state.postChromatic = elements.postChromatic.value;
  state.postBloom = elements.postBloom.value;
  state.postCharBloom = elements.postCharBloom.value;
  state.postCharChromatic = elements.postCharChromatic.value;
  state.postFilmGrain = elements.postFilmGrain.value;
  state.postGlitch = elements.postGlitch.value;
  state.postRgbSplit = elements.postRgbSplit.value;
  state.postPixelate = elements.postPixelate.value;
  state.postHalftone = elements.postHalftone.value;
  state.postFilmDust = elements.postFilmDust.value;
  state.poeticMode = elements.poeticMode.checked;
  state.transparentBg = elements.transparentBg.checked;
  state.invertMedia = elements.invertMedia.checked;
  document.body.dataset.transparent = String(state.transparentBg);
  document.body.dataset.drawMode = String(state.drawMode);
  document.body.dataset.textRender = String(state.textRenderActive);
  document.body.dataset.textMix = String(state.textMixActive);
  document.body.dataset.drawBg = state.drawBackground;
  state.artcoreMode = elements.artcoreButton.classList.contains("active");
  state.fgColor = elements.fgColor.value;
  state.depthColor = elements.depthColor.value;
  state.bgColor = elements.bgColor.value;
  state.poem = {
    title: elements.poemTitle.value,
    paragraph: elements.poemParagraph.value,
    author: elements.poemAuthor.value
  };
  updateColorVars();
}

function activateDrawMode() {
  state.drawMode = true;
  document.body.dataset.drawMode = "true";
  exitLoveModeForAmbient();
  sourceManager.startAmbient();
  sourceManager.setSourceState("draw");
  requestTextExportRefresh();
  setStatus("drawModeActive");
}

function deactivateDrawMode() {
  state.drawMode = false;
  document.body.dataset.drawMode = "false";
  sourceManager.startAmbient();
}

function paintAtPointer(event) {
  const rect = elements.canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / Math.max(1, rect.width);
  const y = (event.clientY - rect.top) / Math.max(1, rect.height);
  syncState();
  renderer.addDrawingStroke(x, y, state);
  requestTextExportRefresh();
}

function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;
  elements.fgColor.value = preset.fgColor;
  elements.depthColor.value = preset.depthColor;
  elements.bgColor.value = preset.bgColor;
  elements.saturation.value = preset.saturation;
  elements.glow.value = preset.glow;
  elements.contrast.value = preset.contrast;
  elements.blend.value = preset.blend;
  document.querySelectorAll(".preset").forEach((button) => {
    button.classList.toggle("active", button.dataset.preset === name);
  });
  syncState();
}

function updateColorVars() {
  document.documentElement.style.setProperty("--accent", elements.fgColor.value);
  document.documentElement.style.setProperty("--accent-2", elements.depthColor.value);
  document.documentElement.style.setProperty("--back", elements.bgColor.value);
  elements.gradientPreview.style.background = `linear-gradient(90deg, ${elements.bgColor.value}, ${elements.fgColor.value}, ${elements.depthColor.value})`;
}

function applyAspect(aspect) {
  const labels = {
    "1 / 1": "1:1",
    "4 / 3": "4:3",
    "9 / 16": "9:16"
  };
  document.documentElement.style.setProperty("--screen-aspect", aspect);
  elements.screenFrame.dataset.aspect = aspect;
  elements.aspectLabel.textContent = labels[aspect] || "1:1";
  renderer.resize();
}

function requestTextExportRefresh() {
  textExportRefreshPending = true;
}

function refreshTextExport() {
  const text = renderer.textOutput();
  if (text === lastTextExport) return;
  lastTextExport = text;
  elements.textExport.value = text;
}

function activateLoveMode() {
  state.charMode = "love";
  state.symbolPack = "core";
  state.flowMode = "orbit";
  state.artcoreMode = false;
  document.querySelectorAll(".segment").forEach((item) => item.classList.remove("active"));
  document.querySelectorAll(".pack-segment").forEach((item) => {
    item.classList.toggle("active", item.dataset.pack === "core");
  });
  document.querySelectorAll(".flow-segment").forEach((item) => {
    item.classList.toggle("active", item.dataset.flow === "orbit");
  });
  elements.loveButton.classList.add("active");
  elements.artcoreButton.classList.remove("active");
  applyPreset("love");
  elements.flowStrength.value = "1.18";
  setStatus("loveModeActive");
}

function activateArtcoreMode() {
  const mode = state.charMode === "ascii" ? "ascii" : state.charMode === "hybrid" || state.charMode === "love" ? "hybrid" : "burmese";
  const art = ARTCORE_SHAPES[mode];
  elements.poeticMode.checked = true;
  elements.poemTitle.value = art.title;
  elements.poemParagraph.value = art.paragraph;
  elements.poemAuthor.value = art.author;
  state.artcoreMode = true;
  elements.artcoreButton.classList.add("active");
  elements.loveButton.classList.remove("active");
  requestTextExportRefresh();
  syncState();
  setStatus("artcoreInserted");
}

function exitLoveModeForAmbient() {
  if (!elements.loveButton.classList.contains("active") && !elements.artcoreButton.classList.contains("active")) return;
  state.charMode = "burmese";
  state.symbolPack = "core";
  state.flowMode = "drift";
  state.artcoreMode = false;
  document.querySelectorAll(".segment").forEach((item) => {
    item.classList.toggle("active", item.dataset.mode === "burmese");
  });
  document.querySelectorAll(".pack-segment").forEach((item) => {
    item.classList.toggle("active", item.dataset.pack === "core");
  });
  document.querySelectorAll(".flow-segment").forEach((item) => {
    item.classList.toggle("active", item.dataset.flow === "drift");
  });
  elements.loveButton.classList.remove("active");
  elements.artcoreButton.classList.remove("active");
  elements.flowStrength.value = "0.10";
  applyPreset("terminal");
}

function getText(key) {
  return UI_COPY.en[key] || key;
}

function setStatus(key) {
  elements.status.dataset.statusKey = key;
  elements.status.textContent = getText(key);
}
