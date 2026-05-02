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
    this.imageBitmapUrl = "";
    this.setSourceState("idle");

    this.imageInput.addEventListener("change", () => this.loadImage());
  }

  get element() {
    if (this.kind === "image") return this.image;
    if (this.kind === "camera") return this.video;
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
    this.kind = "ambient";
    this.ready = true;
    this.setSourceState("ambient");
    this.setStatus("ambientLive");
  }

  async startCamera() {
    this.stopStream();
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
    this.video.srcObject = stream;
    await this.video.play();
    this.ready = true;
    this.setSourceState("camera");
    this.setStatus("cameraLive");
  }

  async loadImage() {
    const file = this.imageInput.files?.[0];
    if (!file) return;
    this.stopStream();
    if (this.imageBitmapUrl) URL.revokeObjectURL(this.imageBitmapUrl);
    this.imageBitmapUrl = URL.createObjectURL(file);
    this.kind = "image";
    this.ready = false;
    this.setStatus("loadingImage");
    this.image.src = this.imageBitmapUrl;
    await this.image.decode();
    this.ready = true;
    this.setSourceState("image");
    this.setStatus("imageLoaded");
  }

  stopStream() {
    if (!this.stream) return;
    for (const track of this.stream.getTracks()) track.stop();
    this.stream = null;
  }

  setSourceState(source) {
    document.body.dataset.source = source;
    document.querySelectorAll("[data-source-button]").forEach((button) => {
      const isActive = button.dataset.sourceButton === source;
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
  if (source === "ambient") return "sourceAmbient";
  return "idle";
}
