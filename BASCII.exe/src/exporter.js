export class Exporter {
  constructor({ canvas, renderer, status, getText }) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.status = status;
    this.getText = getText || ((key) => key);
    this.mediaRecorder = null;
    this.chunks = [];
  }

  savePng() {
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `burmese-ascii-portrait-${stamp()}.png`);
      this.setStatus("pngExported");
    }, "image/png");
  }

  async copyText() {
    const text = this.renderer.textOutput();
    if (!text.trim()) {
      this.setStatus("noText");
      return;
    }
    await navigator.clipboard.writeText(text);
    this.setStatus("textCopied");
  }

  saveText() {
    const text = this.renderer.textOutput();
    if (!text.trim()) {
      this.setStatus("noText");
      return;
    }
    downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `burmese-ascii-text-${stamp()}.txt`);
    this.setStatus("txtExported");
  }

  async recordVideo(seconds = 15) {
    if (!this.canvas.captureStream || !window.MediaRecorder) {
      this.setStatus("videoUnavailable");
      return;
    }

    this.setStatus("recordingVideo", { seconds });
    const stream = this.canvas.captureStream(30);
    this.chunks = [];
    const type = mediaType();
    this.mediaRecorder = new MediaRecorder(stream, { mimeType: type.mimeType });
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size) this.chunks.push(event.data);
    };
    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: this.mediaRecorder.mimeType });
      downloadBlob(blob, `burmese-ascii-motion-${stamp()}.${type.extension}`);
      this.setStatus(type.extension === "mp4" ? "videoExported" : "mp4Fallback");
    };
    this.mediaRecorder.start();
    await delay(seconds * 1000);
    this.mediaRecorder.stop();
  }

  async saveGif() {
    if (!window.GIF) {
      this.setStatus("gifUnavailable");
      return;
    }

    try {
      this.setStatus("capturingGif");
      const gif = new window.GIF({
        workers: 2,
        quality: 12,
        width: this.canvas.width,
        height: this.canvas.height,
        workerScript: await gifWorkerUrl()
      });

      for (let i = 0; i < 42; i += 1) {
        gif.addFrame(this.canvas, { copy: true, delay: 85 });
        await delay(85);
      }

      gif.on("finished", (blob) => {
        downloadBlob(blob, `burmese-ascii-loop-${stamp()}.gif`);
        this.setStatus("gifExported");
      });
      gif.render();
    } catch (error) {
      this.setStatus("gifFailed");
    }
  }

  setStatus(key, values = {}) {
    this.status.dataset.statusKey = key;
    this.status.textContent = this.getText(key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
  }
}

let cachedWorkerUrl = "";

async function gifWorkerUrl() {
  if (cachedWorkerUrl) return cachedWorkerUrl;
  const response = await fetch("https://cdn.jsdelivr.net/npm/gif.js.optimized/dist/gif.worker.js");
  const script = await response.text();
  cachedWorkerUrl = URL.createObjectURL(new Blob([script], { type: "text/javascript" }));
  return cachedWorkerUrl;
}

function mediaType() {
  const candidates = [
    { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
    { mimeType: "video/webm;codecs=vp9", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" }
  ];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate.mimeType)) || candidates.at(-1);
}

function downloadBlob(blob, name) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
