export class SourceManager {
  constructor({ video, image, imageInput, mirrorToggle, status, sourceLabel, getText }) {
    this.video = video;
    this.image = image;
    this.imageInput = imageInput;
    this.mirrorToggle = mirrorToggle;
    this.status = status;
    this.sourceLabel = sourceLabel;
    this.getText = getText || ((key) => key);
    this.kind = "idle";
    this.stream = null;
    this.ready = false;
    this.mediaUrl = "";
    this.setSourceState("idle");

    this.imageInput.addEventListener("change", () => this.loadMedia());
  }

  get element() {
    if (this.kind === "image") return this.image;
    if (this.kind === "camera" || this.kind === "video") return this.video;
    return null;
  }

  get width() {
    const el = this.element;
    if (!el) return 0;
    return this.kind === "image" ? el.naturalWidth : el.videoWidth;
  }

  get height() {
    const el = this.element;
    if (!el) return 0;
    return this.kind === "image" ? el.naturalHeight : el.videoHeight;
  }

  get mirrored() {
    return this.kind === "camera" && this.mirrorToggle.checked;
  }

  startAmbient() {
    this.stopStream();
    this.clearVideoFile();
    this.kind = "ambient";
    this.ready = true;
    this.setSourceState("ambient");
    this.setStatus("ambientLive");
  }

  async startCamera() {
    this.stopStream();
    this.clearVideoFile();
    this.kind = "camera";
    this.ready = false;
    this.setStatus("requestingCamera");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user"
      },
      audio: false
    });
    this.stream = stream;
    this.video.removeAttribute("src");
    this.video.srcObject = stream;
    await this.video.play();
    this.ready = true;
    this.setSourceState("camera");
    this.setStatus("cameraLive");
  }

  async loadMedia() {
    const file = this.imageInput.files?.[0];
    if (!file) return;
    this.stopStream();
    this.clearVideoFile();
    if (this.mediaUrl) URL.revokeObjectURL(this.mediaUrl);
    this.mediaUrl = URL.createObjectURL(file);
    this.ready = false;
    this.setStatus("loadingImage");

    if (file.type.startsWith("video/")) {
      this.kind = "video";
      this.video.srcObject = null;
      this.video.src = this.mediaUrl;
      this.video.loop = true;
      this.video.muted = true;
      this.video.playsInline = true;
      await waitForVideo(this.video);
      try {
        await this.video.play();
      } catch (error) {
        // The first frame is still usable even if autoplay is blocked.
      }
      this.ready = true;
      this.setSourceState("video");
      this.setStatus("imageLoaded");
      return;
    }

    this.kind = "image";
    this.image.src = this.mediaUrl;
    await this.image.decode();
    this.ready = true;
    this.setSourceState("image");
    this.setStatus("imageLoaded");
  }

  stopStream() {
    if (!this.stream) return;
    for (const track of this.stream.getTracks()) track.stop();
    this.stream = null;
    this.video.srcObject = null;
  }

  clearVideoFile() {
    if (this.video.srcObject) return;
    this.video.pause();
    this.video.removeAttribute("src");
    this.video.load();
  }

  setSourceState(source) {
    document.body.dataset.source = source;
    document.querySelectorAll("[data-source-button]").forEach((button) => {
      const isActive = button.dataset.sourceButton === source || (button.dataset.sourceButton === "image" && source === "video");
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    if (this.sourceLabel) this.sourceLabel.textContent = this.getText(sourceLabelKey(source));
  }

  refreshLanguage() {
    this.setSourceState(this.kind);
  }

  setStatus(key) {
    this.status.dataset.statusKey = key;
    this.status.textContent = this.getText(key);
  }
}

function sourceLabelKey(source) {
  if (source === "camera") return "sourceCamera";
  if (source === "image") return "sourceImage";
  if (source === "video") return "sourceVideo";
  if (source === "draw") return "sourceDraw";
  if (source === "ambient") return "sourceAmbient";
  return "idle";
}

function waitForVideo(video) {
  if (video.readyState >= 2 && video.videoWidth && video.videoHeight) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const clean = () => {
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("error", onError);
    };
    const onLoaded = () => {
      clean();
      resolve();
    };
    const onError = () => {
      clean();
      reject(new Error("Video could not load"));
    };
    video.addEventListener("loadeddata", onLoaded, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}
