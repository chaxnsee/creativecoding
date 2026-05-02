import { Exporter } from "./exporter.js";
import { FaceProcessor } from "./faceProcessor.js";
import { PRESETS } from "./glyphs.js";
import { BurmeseAsciiRenderer } from "./renderer.js?v=nocam-flow-start-20260502";
import { SourceManager } from "./source.js?v=source-active-20260502";

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
  imageScale: document.querySelector("#imageScale"),
  imageOffsetX: document.querySelector("#imageOffsetX"),
  imageOffsetY: document.querySelector("#imageOffsetY"),
  depthIntensity: document.querySelector("#depthIntensity"),
  smoothing: document.querySelector("#smoothing"),
  animationSpeed: document.querySelector("#animationSpeed"),
  contrast: document.querySelector("#contrast"),
  saturation: document.querySelector("#saturation"),
  glow: document.querySelector("#glow"),
  blend: document.querySelector("#blend"),
  poeticMode: document.querySelector("#poeticMode"),
  mirrorMode: document.querySelector("#mirrorMode"),
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
    uploadImage: "Upload image",
    camera: "Camera",
    noCamera: "No Cam",
    image: "Image",
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
    drift: "Drift",
    rain: "Rain",
    orbit: "Orbit",
    photoBlend: "Photo Blend",
    imageOnly: "Image only",
    normalBlend: "Normal",
    screenBlend: "Screen",
    differenceBlend: "Difference",
    photoStrength: "Strength",
    imageSize: "Size",
    imageX: "Image X",
    imageY: "Image Y",
    density: "Density",
    font: "Font",
    pixelScale: "Pixel Scale",
    flow: "Flow",
    depth: "Depth",
    smoothing: "Smoothing",
    speed: "Speed",
    contrast: "Contrast",
    saturation: "Saturation",
    glow: "Glow",
    textLight: "Text Light",
    blend: "Blend",
    poeticMode: "Poetic mode",
    poemEditor: "Poetic Text",
    liveText: "Live",
    mirror: "Mirror",
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
    loadingImage: "Loading image...",
    imageLoaded: "Image loaded. Burmese ASCII reconstruction is active.",
    sourceCamera: "Camera",
    sourceImage: "Image",
    sourceAmbient: "No Cam",
    ambientLive: "Blank canvas ready. Start Camera or upload an image to begin.",
    shuffledGlyphs: "Glyph layout shuffled.",
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

bindControls();
applyPreset("terminal");
sourceManager.startAmbient();
await faceProcessor.init();
requestAnimationFrame(loop);

async function loop() {
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
  requestAnimationFrame(loop);
}

function bindControls() {
  elements.cameraButton.addEventListener("click", async () => {
    try {
      await sourceManager.startCamera();
    } catch (error) {
      setStatus("cameraDenied");
    }
  });

  elements.ambientButton.addEventListener("click", () => {
    exitLoveModeForAmbient();
    elements.flowStrength.value = "0.10";
    sourceManager.startAmbient();
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
  state.imageScale = elements.imageScale.value;
  state.imageOffsetX = elements.imageOffsetX.value;
  state.imageOffsetY = elements.imageOffsetY.value;
  state.textLight = elements.textLight.value;
  state.depthIntensity = elements.depthIntensity.value;
  state.smoothing = elements.smoothing.value;
  state.animationSpeed = elements.animationSpeed.value;
  state.contrast = elements.contrast.value;
  state.saturation = elements.saturation.value;
  state.glow = elements.glow.value;
  state.blend = elements.blend.value;
  state.poeticMode = elements.poeticMode.checked;
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
