import { glyphSet, randomGlyphForBrightness } from "./glyphs.js";

const GLYPH_EFFECT_POINT_LIMIT = 16000;

export class BurmeseAsciiRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.sampleCanvas = document.createElement("canvas");
    this.sampleCtx = this.sampleCanvas.getContext("2d", { willReadFrequently: true });
    this.postCanvas = document.createElement("canvas");
    this.postCtx = this.postCanvas.getContext("2d", { willReadFrequently: true });
    this.pixelCanvas = document.createElement("canvas");
    this.pixelCtx = this.pixelCanvas.getContext("2d");
    this.textCanvas = document.createElement("canvas");
    this.textCtx = this.textCanvas.getContext("2d", { willReadFrequently: true });
    this.rows = [];
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.lastResize = { width: 0, height: 0, renderScale: 1 };
    this.renderScale = 1;
    this.quality = 1;
    this.lastFrameTime = performance.now();
    this.cachedFont = "";
    this.lastStaticIdleKey = "";
    this.poemOutput = "";
    this.glyphPoints = [];
    this.drawingPoints = [];
    this.textSource = { text: "", seed: 0 };
    this.textMixer = { text: "", clusters: [], seed: 0 };
  }

  resize(renderScale = this.renderScale) {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const scale = clamp(Number(renderScale || 1), 0.2, 4);
    if (this.lastResize.width === width && this.lastResize.height === height && this.lastResize.renderScale === scale) return;
    this.renderScale = scale;
    this.lastResize = { width, height, renderScale: scale };
    this.canvas.width = Math.max(1, Math.floor(width * this.dpr * scale));
    this.canvas.height = Math.max(1, Math.floor(height * this.dpr * scale));
    this.ctx.setTransform(this.dpr * scale, 0, 0, this.dpr * scale, 0, 0);
  }

  render({ source, sourceManager, faceProcessor, state }) {
    this.updateQuality();
    this.resize(state.renderScale);
    const width = this.lastResize.width;
    const height = this.lastResize.height;
    const staticAmbient = !state.drawMode
      && sourceManager.kind === "ambient"
      && Number(state.flowStrength || 0) === 0
      && (!source || !sourceManager.width || !sourceManager.height);
    const staticAmbientKey = staticAmbient ? this.staticAmbientKey(state, width, height) : "";
    if (staticAmbient && this.lastStaticIdleKey === staticAmbientKey) return;
    if (!staticAmbient) this.lastStaticIdleKey = "";

    const ctx = this.ctx;
    ctx.globalCompositeOperation = "source-over";
    this.glyphPoints = [];
    this.paintBackground(state, width, height);

    if (state.drawMode && state.drawBlank) {
      this.rows = [];
      this.drawDrawingLayer(state, width, height);
      return;
    }

    if (!source || !sourceManager.ready || !sourceManager.width || !sourceManager.height) {
      this.drawIdle(state, width, height, sourceManager.kind);
      this.drawDrawingLayer(state, width, height);
      if (!state.drawMode) this.applyPostProcessing(state, width, height);
      if (staticAmbient) this.lastStaticIdleKey = staticAmbientKey;
      return;
    }

    const fontSize = Number(state.fontSize);
    const effectiveDensity = clamp(Number(state.density), 0.2, 1);
    const densityOverload = clamp((effectiveDensity - 0.82) / 0.18, 0, 1);
    let stepX = Math.max(5, (fontSize * 0.72) / effectiveDensity);
    let stepY = Math.max(7, (fontSize * 1.02) / effectiveDensity);
    if (densityOverload > 0) {
      const resolutionReduction = 1 + densityOverload * 0.22;
      stepX *= resolutionReduction;
      stepY *= resolutionReduction;
    }
    let sampleW = Math.max(28, Math.round(width / stepX));
    let sampleH = Math.max(22, Math.round(height / stepY));
    const cells = sampleW * sampleH;
    const maxCells = Math.round(18000 * (0.84 + this.quality * 0.28) * (1 - densityOverload * 0.12));
    if (cells > maxCells) {
      const scale = Math.sqrt(cells / maxCells);
      stepX *= scale;
      stepY *= scale;
      sampleW = Math.max(28, Math.round(width / stepX));
      sampleH = Math.max(22, Math.round(height / stepY));
    }
    this.drawSourceToSample(source, sourceManager, sampleW, sampleH, state);

    this.drawSourceUnderlay(source, sourceManager, state, width, height);

    const imageData = this.sampleCtx.getImageData(0, 0, sampleW, sampleH);
    if (sourceManager.kind === "image" || sourceManager.kind === "video") {
      applyPhotoBlend(imageData.data, state);
      applyMediaEffects(imageData.data, sampleW, sampleH, state);
    }
    const pixels = imageData.data;
    const light = estimateLightSource(pixels, sampleW, sampleH);
    const time = performance.now() * 0.001 * Number(state.animationSpeed);
    const glyphTime = Number(state.shuffleSeed || 0);
    const expression = faceProcessor.lastResult?.expression || 0;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = fontStack(fontSize);
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = state.fgColor;
    ctx.shadowBlur = Math.min(Number(state.glow) + light.intensity * 10, 24) * this.quality;
    this.rows = [];
    this.glyphPoints = [];
    this.cachedFont = ctx.font;
    let visibleIndex = 0;

    for (let y = 0; y < sampleH; y += 1) {
      let textRow = "";
      for (let x = 0; x < sampleW; x += 1) {
        const index = (y * sampleW + x) * 4;
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const contrasted = contrastCurve(luminance, Number(state.contrast));
        const nx = x / Math.max(1, sampleW - 1);
        const ny = y / Math.max(1, sampleH - 1);
        const lightAtCell = lightAt(nx, ny, light);
        const wave = Math.sin(time * 2.2 + x * 0.27 + y * 0.19) * 0.5 + 0.5;
        const poetic = state.poeticMode ? (wave - 0.5) * 0.14 * Number(state.animationSpeed) : 0;
        const motion = expression * (0.18 + wave * 0.2);
        const depthStrength = Number(state.depthIntensity || 0);
        const trackedDepth = faceProcessor.depthAt(nx, ny, sourceManager.mirrored);
        const imageDepth = clamp((1 - contrasted) * 0.54 + lightAtCell * 0.22, 0, 1);
        const rawDepth = trackedDepth > 0
          ? clamp(trackedDepth * 0.86 + imageDepth * 0.22, 0, 1)
          : imageDepth * 0.72;
        const depth = clamp(Math.pow(rawDepth, 0.54) * depthStrength * 1.86, 0, 4.8);
        const depthPop = clamp(depth / 3.15, 0, 1);
        const rainLife = state.flowMode === "rain" && Number(state.flowStrength || 0) > 0
          ? flowEnergy(x, y, time, state.flowMode, sampleW, sampleH)
          : 0;
        const brightness = clamp(contrasted + poetic - depthPop * 0.34 + motion + lightAtCell * 0.2, 0, 1);
        let glyph = randomGlyphForBrightness(state.charMode, brightness, x, y, glyphTime, state.symbolPack);
        if (glyph !== " ") {
          glyph = this.mixTextGlyph(glyph, state, x, y, visibleIndex, brightness, glyphTime);
          visibleIndex += 1;
        }
        textRow += glyph;
        if (glyph === " ") continue;

        const flow = flowOffset(x, y, time, state, depth, stepX, stepY, sampleW, sampleH);
        const parallaxX = (nx - 0.5) * depth * -48;
        const parallaxY = (ny - 0.5) * depth * -34 + Math.sin(time * 1.4 + x * 0.08) * depth * 8;
        const px = x * stepX + stepX * 0.5 + parallaxX + flow.x;
        const py = y * stepY + stepY * 0.5 + parallaxY + flow.y;
        const scale = 1 + depth * 1.28 + lightAtCell * 0.18;
        const alpha = clamp((1 - brightness * 0.68 + depthPop * 0.82 + lightAtCell * 0.18) * Number(state.blend), 0, 1);
        const quantizedSize = Math.round(Math.max(7, fontSize * scale));
        ctx.globalAlpha = state.flowMode === "rain" ? clamp(alpha * (0.42 + rainLife * 0.95), 0, 1) : alpha;
        this.setFont(ctx, quantizedSize);
        ctx.fillStyle = colorForDepth(state, clamp(depthPop + lightAtCell * 0.22 + rainLife * 0.26, 0, 1), ctx.globalAlpha);
        ctx.fillText(glyph, px, py);
        if (this.glyphPoints.length < GLYPH_EFFECT_POINT_LIMIT) {
          this.glyphPoints.push({
            x: px,
            y: py,
            size: quantizedSize,
            alpha: ctx.globalAlpha,
            depth: depthPop,
            glyph
          });
        }
      }
      this.rows.push(textRow);
    }

    ctx.restore();
    this.drawMeshHints(faceProcessor, sourceManager.mirrored, state, width, height, sourceManager.kind);
    if (!state.drawMode) this.drawPoeticText(state, width, height);
    this.drawDrawingLayer(state, width, height);
    if (!state.drawMode) this.applyPostProcessing(state, width, height);
  }

  textOutput() {
    return [this.rows.join("\n"), this.drawingTextOutput(), this.poemOutput].filter(Boolean).join("\n\n");
  }

  drawingTextOutput() {
    if (!this.drawingPoints.length) return "";
    const width = Math.max(1, this.lastResize.width);
    const height = Math.max(1, this.lastResize.height);
    const cols = clamp(Math.round(width / 9), 24, 160);
    const rows = clamp(Math.round(height / 13), 18, 120);
    const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => " "));
    for (const point of this.drawingPoints) {
      const x = clamp(Math.round(point.x * (cols - 1)), 0, cols - 1);
      const y = clamp(Math.round(point.y * (rows - 1)), 0, rows - 1);
      grid[y][x] = point.glyph;
    }
    return grid.map((row) => row.join("").trimEnd()).join("\n").trim();
  }

  setTextSource(text) {
    const clean = String(text || "").trim();
    this.textSource = {
      text: clean,
      seed: performance.now() + clean.length * 97
    };
    this.drawingPoints = [];
  }

  clearTextSource() {
    this.textSource = { text: "", seed: 0 };
    this.drawingPoints = [];
    this.rows = [];
  }

  setTextMixer(text) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    this.textMixer = {
      text: clean,
      clusters: textClusters(clean).filter(Boolean),
      seed: performance.now() + clean.length * 131
    };
  }

  clearTextMixer() {
    this.textMixer = { text: "", clusters: [], seed: 0 };
  }

  mixTextGlyph(baseGlyph, state, x, y, order, brightness, seed) {
    const clusters = this.textMixer.clusters;
    if (!state.textMixActive || !clusters.length || baseGlyph === " ") return baseGlyph;
    const amount = clamp(Number(state.textMixAmount ?? 1), 0, 1);
    if (amount <= 0) return baseGlyph;
    const roll = hash01(seed + this.textMixer.seed + x * 12.9898 + y * 78.233 + order * 0.37);
    if (roll > amount) return baseGlyph;

    let index = order;
    if (state.textMixMode === "random") {
      index = Math.floor(hash01(seed + x * 93.17 + y * 47.31 + this.textMixer.seed) * clusters.length);
    } else if (state.textMixMode === "wave") {
      const wave = Math.sin((x + y) * 0.34 + seed * 0.015 + brightness * 5.2) * 0.5 + 0.5;
      index = order + Math.floor(wave * clusters.length);
    }

    return clusters[((index % clusters.length) + clusters.length) % clusters.length] || baseGlyph;
  }

  addDrawingStroke(x, y, state) {
    const width = Math.max(1, this.lastResize.width);
    const height = Math.max(1, this.lastResize.height);
    const brush = clamp(Number(state.drawBrushSize || 24), 4, 90);
    const scatter = clamp(Number(state.drawScatter || 0), 0, 1);
    const opacity = clamp(Number(state.drawOpacity || 0.88), 0.05, 1);
    const erase = state.drawTool === "erase";
    const radius = brush / Math.max(width, height);

    if (erase) {
      this.drawingPoints = this.drawingPoints.filter((point) => {
        const dx = point.x - x;
        const dy = point.y - y;
        return Math.hypot(dx, dy) > radius * 1.35;
      });
      return;
    }

    const count = 1 + Math.round(scatter * 9);
    const mode = state.charMode === "love" ? "hybrid" : state.charMode;
    const seed = performance.now();
    for (let i = 0; i < count; i += 1) {
      const angle = hash01(seed + i * 19.17) * Math.PI * 2;
      const distance = hash01(seed + i * 7.31) * brush * scatter;
      const nx = clamp(x + Math.cos(angle) * distance / width, 0, 1);
      const ny = clamp(y + Math.sin(angle) * distance / height, 0, 1);
      const brightness = clamp(hash01(seed + i * 43.91) * 0.82, 0, 1);
      this.drawingPoints.push({
        x: nx,
        y: ny,
        size: brush * (0.72 + hash01(seed + i * 5.7) * 0.64),
        alpha: opacity,
        depth: hash01(seed + i * 11.43),
        glyph: randomGlyphForBrightness(mode, brightness, Math.round(nx * 1000), Math.round(ny * 1000), seed * 0.01, state.symbolPack),
        mode,
        pack: state.symbolPack
      });
    }

    if (this.drawingPoints.length > 18000) {
      this.drawingPoints.splice(0, this.drawingPoints.length - 18000);
    }
  }

  addDrawingText(text, state) {
    const clean = String(text || "").trim();
    if (!clean) return;
    const width = Math.max(1, this.lastResize.width);
    const height = Math.max(1, this.lastResize.height);
    const size = clamp(Number(state.drawTextSize || state.drawBrushSize || 22), 8, 72);
    const opacity = clamp(Number(state.drawOpacity || 0.88), 0.05, 1);
    const scatter = clamp(Number(state.drawScatter || 0.12), 0, 1);
    const mode = state.charMode === "love" ? "hybrid" : state.charMode;
    const seedBase = performance.now() + clean.length * 31;
    const lineHeight = size * 1.18;
    const maxWidth = width * 0.84;
    const safeTop = height * 0.08;
    const safeHeight = height * (state.drawBlank ? 0.42 : 0.72);
    const maxRows = Math.max(1, Math.floor(safeHeight / lineHeight));
    const sourceClusters = textClusters(clean).filter((cluster) => cluster.trim());
    const sampleClusters = sourceClusters.length ? sourceClusters : glyphSet(mode, state.symbolPack).filter((glyph) => glyph.trim());
    this.drawingPoints = this.drawingPoints.filter((point) => point.source !== "text");

    if (this.textCanvas.width !== width || this.textCanvas.height !== height) {
      this.textCanvas.width = width;
      this.textCanvas.height = height;
    }

    const mask = this.textCtx;
    mask.save();
    mask.setTransform(1, 0, 0, 1, 0, 0);
    mask.clearRect(0, 0, width, height);
    mask.fillStyle = "#fff";
    mask.textAlign = "center";
    mask.textBaseline = "top";
    mask.font = formattedFont(size, { textFormat: { bold: true } }, true);
    const lines = wrapMaskText(mask, clean, maxWidth).slice(0, maxRows);
    const totalHeight = lines.length * lineHeight;
    let y = safeTop + safeHeight * 0.5 - totalHeight * 0.5;
    for (const line of lines) {
      mask.fillText(line, width * 0.5, y);
      y += lineHeight;
    }
    mask.restore();

    const data = mask.getImageData(0, 0, width, height).data;
    const stepX = Math.max(4, size * 0.42);
    const stepY = Math.max(6, size * 0.62);
    const jitterAmount = scatter * Math.min(stepX, stepY) * 0.44;
    let pointCount = 0;
    for (let py = stepY * 0.5; py < height; py += stepY) {
      for (let px = stepX * 0.5; px < width; px += stepX) {
        const index = (Math.floor(py) * width + Math.floor(px)) * 4;
        const alpha = data[index + 3] / 255;
        if (alpha < 0.22) continue;
        const seed = seedBase + pointCount * 19.91 + px * 0.73 + py * 1.31;
        const cluster = sampleClusters[Math.floor(hash01(seed + 5.17) * sampleClusters.length)] || "အ";
        const glyph = glyphForTypedCluster(cluster, mode, state.symbolPack, seed);
        const crispness = clamp((alpha - 0.18) / 0.82, 0, 1);
        this.drawingPoints.push({
          x: clamp((px + (hash01(seed + 2.3) - 0.5) * jitterAmount) / width, 0, 1),
          y: clamp((py + (hash01(seed + 7.9) - 0.5) * jitterAmount) / height, 0, 1),
          size: size * (0.62 + crispness * 0.32 + hash01(seed + 3) * 0.1),
          alpha: clamp(opacity * (0.38 + crispness * 0.72), 0.04, 1),
          depth: crispness,
          glyph,
          mode,
          pack: state.symbolPack,
          source: "text"
        });
        pointCount += 1;
      }
    }

    if (this.drawingPoints.length > 18000) {
      this.drawingPoints.splice(0, this.drawingPoints.length - 18000);
    }
  }

  clearDrawing() {
    this.drawingPoints = [];
  }

  drawTextSource(state, width, height) {
    const clean = this.textSource.text.trim();
    if (!clean) return;
    const ctx = this.ctx;
    const fontSize = clamp(Number(state.drawTextSize || state.fontSize || 22), 8, 96);
    const density = clamp(Number(state.density || 0.72), 0.2, 1);
    const mode = state.charMode === "love" ? "hybrid" : state.charMode;
    const stepX = Math.max(4, (fontSize * 0.48) / density);
    const stepY = Math.max(6, (fontSize * 0.7) / density);
    const cols = Math.max(18, Math.round(width / stepX));
    const rows = Math.max(14, Math.round(height / stepY));
    const maskW = Math.max(1, Math.round(width));
    const maskH = Math.max(1, Math.round(height));
    const sourceClusters = textClusters(clean).filter((cluster) => cluster.trim());
    const sampleClusters = sourceClusters.length ? sourceClusters : glyphSet(mode, state.symbolPack).filter((glyph) => glyph.trim());
    const lineHeight = fontSize * 1.12;
    const maxWidth = width * 0.84;
    const time = performance.now() * 0.001 * Number(state.animationSpeed || 1);
    const seedBase = Number(state.shuffleSeed || 0) + this.textSource.seed;

    if (this.textCanvas.width !== maskW || this.textCanvas.height !== maskH) {
      this.textCanvas.width = maskW;
      this.textCanvas.height = maskH;
    }

    const mask = this.textCtx;
    mask.save();
    mask.setTransform(1, 0, 0, 1, 0, 0);
    mask.clearRect(0, 0, maskW, maskH);
    mask.fillStyle = "#fff";
    mask.textAlign = "center";
    mask.textBaseline = "top";
    mask.font = formattedFont(fontSize, { textFormat: { bold: true } }, true);
    const lines = wrapMaskText(mask, clean, maxWidth);
    const maxLines = Math.max(1, Math.floor((height * 0.82) / lineHeight));
    const visibleLines = lines.slice(0, maxLines);
    const totalHeight = visibleLines.length * lineHeight;
    let lineY = height * 0.5 - totalHeight * 0.5;
    for (const line of visibleLines) {
      mask.fillText(line, width * 0.5, lineY);
      lineY += lineHeight;
    }
    mask.restore();

    const data = mask.getImageData(0, 0, maskW, maskH).data;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = state.fgColor;
    ctx.shadowBlur = Math.min(28, Number(state.glow || 0) + 6);
    this.rows = [];
    this.glyphPoints = [];
    this.cachedFont = "";

    let visibleIndex = 0;
    for (let y = 0; y < rows; y += 1) {
      let textRow = "";
      for (let x = 0; x < cols; x += 1) {
        const px = (x + 0.5) * (width / cols);
        const py = (y + 0.5) * (height / rows);
        const index = (Math.floor(py) * maskW + Math.floor(px)) * 4;
        const alpha = data[index + 3] / 255;
        const edge = clamp((alpha - 0.08) / 0.92, 0, 1);
        if (edge <= 0.04) {
          textRow += " ";
          continue;
        }

        const seed = seedBase + x * 17.13 + y * 41.71;
        const cluster = sampleClusters[Math.floor(hash01(seed + 3.3) * sampleClusters.length)] || "အ";
        const wave = state.poeticMode ? Math.sin(time * 2 + x * 0.33 + y * 0.21) * 0.08 : 0;
        const brightness = clamp(1 - edge * 0.94 + wave, 0, 1);
        const glyph = hash01(seed + 8.1) < 0.5
          ? glyphForTypedCluster(cluster, mode, state.symbolPack, seed)
          : randomGlyphForBrightness(mode, brightness, x, y, seedBase, state.symbolPack);
        textRow += glyph;

        const flow = flowOffset(x, y, time, state, edge, stepX, stepY, cols, rows);
        const depth = clamp(edge * Number(state.depthIntensity || 0) * 0.5, 0, 1);
        const size = Math.round(fontSize * (0.72 + edge * 0.48 + depth * 0.28));
        const drawX = px + flow.x * 0.42;
        const drawY = py + flow.y * 0.42;
        const alphaOut = clamp((0.24 + edge * 0.82) * Number(state.blend || 1), 0, 1);
        this.setFont(ctx, size);
        ctx.globalAlpha = alphaOut;
        ctx.fillStyle = colorForDepth(state, depth, alphaOut);
        ctx.fillText(glyph, drawX, drawY);
        if (this.glyphPoints.length < GLYPH_EFFECT_POINT_LIMIT) {
          this.glyphPoints.push({
            x: drawX,
            y: drawY,
            size,
            alpha: alphaOut,
            depth,
            glyph
          });
        }
      }
      this.rows.push(textRow);
    }
    ctx.restore();
  }

  drawDrawingLayer(state, width, height) {
    if (!this.drawingPoints.length) return;
    const ctx = this.ctx;
    const cleanDraw = state.drawMode && state.drawBlank;
    const cleanInk = state.drawBackground === "white" ? "#070707" : "#f6f2df";
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalCompositeOperation = cleanDraw ? "source-over" : "lighter";
    ctx.shadowColor = cleanDraw ? "transparent" : state.depthColor;
    ctx.shadowBlur = cleanDraw ? 0 : Math.min(34, Number(state.glow || 0) + 12);
    for (const point of this.drawingPoints) {
      const x = point.x * width;
      const y = point.y * height;
      const size = clamp(point.size, 4, 110);
      this.setFont(ctx, Math.round(size));
      ctx.globalAlpha = point.alpha;
      ctx.fillStyle = cleanDraw ? cleanInk : colorForDepth(state, point.depth, point.alpha);
      ctx.fillText(point.glyph, x, y);
      if (this.glyphPoints.length < GLYPH_EFFECT_POINT_LIMIT) {
        this.glyphPoints.push({
          x,
          y,
          size,
          alpha: point.alpha,
          depth: point.depth,
          glyph: point.glyph
        });
      }
    }
    ctx.restore();
  }

  drawSourceToSample(source, sourceManager, width, height, state) {
    if (this.sampleCanvas.width !== width || this.sampleCanvas.height !== height) {
      this.sampleCanvas.width = width;
      this.sampleCanvas.height = height;
    }

    const rect = sourceDrawRect(sourceManager, width, height, state);

    const ctx = this.sampleCtx;
    ctx.save();
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(0, 0, width, height);
    if (sourceManager.mirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(source, width - rect.dx - rect.drawW, rect.dy, rect.drawW, rect.drawH);
    } else {
      ctx.drawImage(source, rect.dx, rect.dy, rect.drawW, rect.drawH);
    }
    ctx.restore();
  }

  paintBackground(state, width, height) {
    const ctx = this.ctx;
    if (state.drawMode && state.drawBlank) {
      ctx.fillStyle = state.drawBackground === "white" ? "#f7f4e8" : "#020805";
      ctx.fillRect(0, 0, width, height);
      return;
    }
    if (state.transparentBg) {
      ctx.clearRect(0, 0, width, height);
      return;
    }
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(0, 0, width, height);
  }

  drawSourceUnderlay(source, sourceManager, state, width, height) {
    const amount = clamp(Number(state.sourceMix || 0), 0, 1);
    if (amount <= 0 || (sourceManager.kind !== "image" && sourceManager.kind !== "video")) return;
    const rect = sourceDrawRect(sourceManager, width, height, state, {
      scaleKey: "sourceScale",
      offsetXKey: "sourceOffsetX",
      offsetYKey: "sourceOffsetY",
      minScale: 0.25,
      maxScale: 4,
      minOffset: -1,
      maxOffset: 1
    });
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = amount;
    ctx.globalCompositeOperation = compositeForPhotoMode(state.photoMode);
    ctx.imageSmoothingEnabled = true;
    ctx.filter = `brightness(${clamp(Number(state.sourceBrightness || 1), 0.25, 1.8)}) blur(${clamp(Number(state.sourceBlur || 0), 0, 24)}px)`;
    if (sourceManager.mirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(source, width - rect.dx - rect.drawW, rect.dy, rect.drawW, rect.drawH);
    } else {
      ctx.drawImage(source, rect.dx, rect.dy, rect.drawW, rect.drawH);
    }
    ctx.restore();
  }

  applyPostProcessing(state, width, height) {
    const effects = postValues(state);
    if (!hasPostEffects(effects)) return;

    if (this.postCanvas.width !== this.canvas.width || this.postCanvas.height !== this.canvas.height) {
      this.postCanvas.width = this.canvas.width;
      this.postCanvas.height = this.canvas.height;
    }

    const ctx = this.ctx;
    const source = this.postCanvas;
    const post = this.postCtx;
    post.save();
    post.setTransform(1, 0, 0, 1, 0, 0);
    post.clearRect(0, 0, source.width, source.height);
    post.drawImage(this.canvas, 0, 0);
    post.restore();

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    if (effects.pixelate > 0) {
      this.applyPixelate(source, effects.pixelate, width, height);
    }
    if (effects.curvature > 0) {
      this.applyCurvature(source, effects.curvature, width, height);
    }
    if (effects.rgbSplit > 0 || effects.chromatic > 0) {
      this.applyRgbSplit(source, effects.rgbSplit + effects.chromatic * 0.7, width, height);
    }
    if (effects.glitch > 0) {
      this.applyGlitch(source, effects.glitch, width, height);
    }
    if (effects.bloom > 0) {
      this.applyBloom(source, effects.bloom, width, height);
    }
    ctx.restore();

    this.applyCharacterEffects(state, effects, width, height);
    this.applyOverlayEffects(effects, width, height);
  }

  applyPixelate(source, amount, width, height) {
    const ctx = this.ctx;
    const scale = Math.max(0.04, 1 - amount * 0.92);
    const smallW = Math.max(8, Math.round(source.width * scale));
    const smallH = Math.max(8, Math.round(source.height * scale));
    if (this.pixelCanvas.width !== smallW || this.pixelCanvas.height !== smallH) {
      this.pixelCanvas.width = smallW;
      this.pixelCanvas.height = smallH;
    }
    const post = this.pixelCtx;
    post.imageSmoothingEnabled = false;
    post.clearRect(0, 0, smallW, smallH);
    post.drawImage(this.canvas, 0, 0, smallW, smallH);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(this.pixelCanvas, 0, 0, smallW, smallH, 0, 0, width, height);
    ctx.restore();
  }

  applyCurvature(source, amount, width, height) {
    const ctx = this.ctx;
    const slices = 44;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    for (let i = 0; i < slices; i += 1) {
      const y0 = (i / slices) * height;
      const y1 = ((i + 1) / slices) * height;
      const ny = (i + 0.5) / slices * 2 - 1;
      const bulge = (1 - ny * ny) * amount;
      const inset = width * 0.055 * bulge;
      const rowScale = 1 + amount * 0.035 * Math.abs(ny);
      ctx.drawImage(
        source,
        0,
        y0 * this.dpr * this.renderScale,
        source.width,
        Math.max(1, (y1 - y0) * this.dpr * this.renderScale),
        inset,
        y0 - amount * 3 * ny,
        width - inset * 2,
        (y1 - y0) * rowScale + 1
      );
    }
    ctx.restore();
  }

  applyRgbSplit(source, amount, width, height) {
    const ctx = this.ctx;
    const shift = amount * 10;
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.72;
    ctx.filter = "sepia(1) saturate(8) hue-rotate(-35deg)";
    ctx.drawImage(source, -shift, 0, width, height);
    ctx.filter = "sepia(1) saturate(8) hue-rotate(105deg)";
    ctx.drawImage(source, shift, 0, width, height);
    ctx.filter = "sepia(1) saturate(8) hue-rotate(180deg)";
    ctx.globalAlpha = 0.62;
    ctx.drawImage(source, 0, shift * 0.32, width, height);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.45;
    ctx.filter = "none";
    ctx.drawImage(source, 0, 0, width, height);
    ctx.restore();
  }

  applyGlitch(source, amount, width, height) {
    const ctx = this.ctx;
    const time = performance.now() * 0.001;
    const bands = Math.round(4 + amount * 18);
    ctx.save();
    for (let i = 0; i < bands; i += 1) {
      const seed = hash01(i * 91.7 + Math.floor(time * (8 + amount * 20)));
      if (seed > amount * 0.82) continue;
      const y = Math.floor(hash01(i * 17.1 + time) * height);
      const h = Math.max(2, Math.floor((2 + hash01(i * 43.4) * 22) * amount));
      const dx = (hash01(i * 29.9 + time * 2) - 0.5) * width * 0.08 * amount;
      ctx.globalAlpha = 0.35 + amount * 0.45;
      ctx.drawImage(source, 0, y * this.dpr * this.renderScale, source.width, h * this.dpr * this.renderScale, dx, y, width, h);
    }
    ctx.restore();
  }

  applyBloom(source, amount, width, height) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = amount * 0.72;
    ctx.filter = `blur(${8 + amount * 24}px) saturate(${1 + amount})`;
    ctx.drawImage(source, 0, 0, width, height);
    ctx.filter = "none";
    ctx.restore();
  }

  applyCharacterEffects(state, effects, width, height) {
    if ((!effects.charBloom && !effects.charChromatic) || !this.glyphPoints.length) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalCompositeOperation = "lighter";
    for (const point of this.glyphPoints) {
      if (effects.charChromatic > 0) {
        const shift = effects.charChromatic * (1.5 + point.depth * 5);
        this.setFont(ctx, point.size);
        ctx.globalAlpha = point.alpha * effects.charChromatic * 0.55;
        ctx.fillStyle = "rgba(255, 40, 80, 0.75)";
        ctx.fillText(point.glyph, point.x - shift, point.y);
        ctx.fillStyle = "rgba(60, 220, 255, 0.75)";
        ctx.fillText(point.glyph, point.x + shift, point.y);
      }
      if (effects.charBloom > 0) {
        this.setFont(ctx, Math.round(point.size * (1 + effects.charBloom * 0.14)));
        ctx.shadowColor = colorForDepth(state, 1, 0.9);
        ctx.shadowBlur = 10 + effects.charBloom * 28;
        ctx.globalAlpha = point.alpha * effects.charBloom * 0.62;
        ctx.fillStyle = colorForDepth(state, 0.95, ctx.globalAlpha);
        ctx.fillText(point.glyph, point.x, point.y);
      }
    }
    ctx.restore();
  }

  applyOverlayEffects(effects, width, height) {
    const ctx = this.ctx;
    const time = performance.now() * 0.001;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";

    if (effects.scanlines > 0) {
      ctx.globalAlpha = effects.scanlines * 0.44;
      ctx.fillStyle = "#000";
      const gap = Math.max(2, Math.round(4 - effects.scanlines * 1.5));
      for (let y = 0; y < height; y += gap) {
        ctx.fillRect(0, y, width, 1);
      }
    }

    if (effects.halftone > 0) {
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = effects.halftone * 0.36;
      ctx.fillStyle = "#000";
      const step = 8 + (1 - effects.halftone) * 14;
      for (let y = 0; y < height; y += step) {
        for (let x = (Math.floor(y / step) % 2) * step * 0.5; x < width; x += step) {
          ctx.beginPath();
          ctx.arc(x, y, step * 0.18 * effects.halftone, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = "source-over";
    }

    if (effects.filmGrain > 0 || effects.filmDust > 0) {
      const grainCount = Math.round(width * height * 0.002 * effects.filmGrain);
      ctx.globalAlpha = 0.18 + effects.filmGrain * 0.28;
      for (let i = 0; i < grainCount; i += 1) {
        const n = hash01(i * 12.989 + Math.floor(time * 24));
        const x = hash01(i * 78.23 + time) * width;
        const y = hash01(i * 39.42 - time) * height;
        const shade = Math.round(80 + n * 175);
        ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
        ctx.fillRect(x, y, 1, 1);
      }

      const dustCount = Math.round(8 + effects.filmDust * 70);
      ctx.globalAlpha = effects.filmDust * 0.62;
      ctx.strokeStyle = "rgba(255,255,235,0.75)";
      ctx.fillStyle = "rgba(255,255,235,0.55)";
      for (let i = 0; i < dustCount; i += 1) {
        const x = hash01(i * 31.7 + Math.floor(time * 3)) * width;
        const y = hash01(i * 93.1 - Math.floor(time * 2)) * height;
        const r = 0.8 + hash01(i * 11.2) * 2.8 * effects.filmDust;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        if (i % 9 === 0) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 8 * effects.filmDust, y + 18 * effects.filmDust);
          ctx.stroke();
        }
      }
    }

    if (effects.vignette > 0) {
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 1;
      const gradient = ctx.createRadialGradient(width * 0.5, height * 0.48, width * 0.18, width * 0.5, height * 0.5, width * 0.76);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.55, `rgba(${Math.round(255 - effects.vignette * 60)}, ${Math.round(255 - effects.vignette * 60)}, ${Math.round(255 - effects.vignette * 60)}, 1)`);
      gradient.addColorStop(1, `rgba(${Math.round(255 - effects.vignette * 220)}, ${Math.round(255 - effects.vignette * 220)}, ${Math.round(255 - effects.vignette * 220)}, 1)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }

  drawIdle(state, width, height, sourceKind) {
    if (sourceKind === "ambient") {
      this.drawAmbientPrompt(state, width, height);
      return;
    }

    if (state.charMode === "love") {
      this.drawLoveIdle(state, width, height);
      return;
    }

    const ctx = this.ctx;
    const chars = glyphSet(state.charMode, state.symbolPack);
    const fontSize = 18;
    const step = 28;
    const time = performance.now() * 0.001;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = fontStack(fontSize);
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = state.fgColor;
    ctx.shadowBlur = Number(state.glow);
    ctx.fillStyle = state.fgColor;
    ctx.globalAlpha = 0.28;
    for (let y = step; y < height; y += step) {
      for (let x = step; x < width; x += step) {
        const i = Math.abs(Math.floor(Math.sin(x * 0.01 + y * 0.02 + time) * chars.length)) % chars.length;
        const flow = flowOffset(x / step, y / step, time, state, 0.25, step, step, width / step, height / step);
        ctx.fillText(chars[i], x + flow.x, y + flow.y);
      }
    }
    ctx.restore();
    this.rows = [];
    this.drawPoeticText(state, width, height);
  }

  drawAmbientPrompt(state, width, height) {
    const ctx = this.ctx;
    const time = performance.now() * 0.001;
    const motionTime = time * Number(state.animationSpeed || 1);
    const stableTime = Number(state.shuffleSeed || 0);
    const ambientFlowStrength = Number(state.flowStrength || 0);
    const animatedFlow = ambientFlowStrength > 0;
    const density = clamp(Number(state.density || 0.48), 0.25, 0.75);
    const fontSize = clamp(Number(state.fontSize || 15), 8, 30);
    let stepX = Math.max(9, (fontSize * 0.92) / density);
    let stepY = Math.max(11, (fontSize * 1.22) / density);
    let cols = Math.max(8, Math.round(width / stepX));
    let rows = Math.max(8, Math.round(height / stepY));
    const maxCells = state.flowMode === "rain" && animatedFlow ? 1050 : 1700;
    const cells = cols * rows;
    if (cells > maxCells) {
      const scale = Math.sqrt(cells / maxCells);
      stepX *= scale;
      stepY *= scale;
      cols = Math.max(8, Math.round(width / stepX));
      rows = Math.max(8, Math.round(height / stepY));
    }
    const mode = state.charMode === "love" ? "hybrid" : state.charMode;
    const blend = clamp(Number(state.blend ?? 1), 0, 1);
    this.rows = [];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = fontStack(fontSize);
    const glow = clamp(Number(state.glow || 0), 0, 48);
    const glowPower = clamp(glow / 32, 0, 1.5);
    if (glowPower > 0 && blend > 0) {
      const bloom = ctx.createRadialGradient(width * 0.5, height * 0.45, 0, width * 0.5, height * 0.45, width * 0.7);
      bloom.addColorStop(0, colorForDepth(state, 0.72, 0.16 * glowPower * blend));
      bloom.addColorStop(0.42, colorForDepth(state, 0.36, 0.08 * glowPower * blend));
      bloom.addColorStop(1, colorForDepth(state, 0.05, 0));
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, width, height);
    }

    let visibleIndex = 0;
    for (let y = 0; y < rows; y += 1) {
      let textRow = "";
      for (let x = 0; x < cols; x += 1) {
        const wave = Math.sin(x * 0.54 + y * 0.31) * 0.5 + 0.5;
        const shimmer = Math.sin(x * 0.17 + y * 0.11) * 0.5 + 0.5;
        const flowLife = animatedFlow ? flowEnergy(x, y, motionTime, state.flowMode, cols, rows) : 0;
        const brightness = clamp(0.16 + wave * 0.62 + shimmer * 0.16, 0, 1);
        let glyph = randomGlyphForBrightness(mode, brightness, x, y, stableTime, state.symbolPack);
        if (glyph !== " ") {
          glyph = this.mixTextGlyph(glyph, state, x, y, visibleIndex, brightness, stableTime);
          visibleIndex += 1;
        }
        textRow += glyph;
        if (glyph === " ") continue;
        const px = x * stepX + stepX * 0.5 + (width - cols * stepX) * 0.5;
        const py = y * stepY + stepY * 0.5 + (height - rows * stepY) * 0.5;
        const flow = flowOffset(x, y, time, state, 0.14 + shimmer * 0.2, stepX, stepY, cols, rows);
        const depthMix = clamp(wave * 0.8 + flowLife * 0.16 + glowPower * 0.12, 0, 1);
        const alpha = clamp(0.18 + density * 0.32 + shimmer * 0.14 + flowLife * 0.12 + glowPower * 0.1, 0.16, 0.95);
        if (glowPower > 0 && !animatedFlow) {
          ctx.shadowColor = colorForDepth(state, 1, 0.95);
          ctx.shadowBlur = Math.min(58, 14 + glow * 1.35);
          ctx.filter = `blur(${Math.min(5.5, 1.2 + glow * 0.14)}px)`;
          ctx.globalAlpha = clamp(alpha * (0.34 + glowPower * 0.42) * blend, 0, 0.78);
          ctx.fillStyle = colorForDepth(state, 1, ctx.globalAlpha);
          ctx.fillText(glyph, px + flow.x, py + flow.y);
        }
        ctx.filter = "none";
        ctx.shadowColor = state.fgColor;
        ctx.shadowBlur = animatedFlow ? Math.min(16, 4 + glow * 0.32) : Math.min(46, 10 + glow);
        ctx.globalAlpha = alpha * blend;
        ctx.fillStyle = colorForDepth(state, depthMix, ctx.globalAlpha);
        ctx.fillText(glyph, px + flow.x, py + flow.y);
      }
      this.rows.push(textRow);
    }

    ctx.globalAlpha = blend;
    ctx.strokeStyle = colorForDepth(state, 0.35, 0.18 * blend);
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 10]);
    ctx.strokeRect(width * 0.12, height * 0.12, width * 0.76, height * 0.76);
    ctx.setLineDash([]);

    ctx.restore();
    this.drawPoeticText(state, width, height);
  }

  staticAmbientKey(state, width, height) {
    return JSON.stringify({
      width,
      height,
      renderScale: state.renderScale,
      charMode: state.charMode,
      symbolPack: state.symbolPack,
      shuffleSeed: state.shuffleSeed,
      density: state.density,
      fontSize: state.fontSize,
      fgColor: state.fgColor,
      depthColor: state.depthColor,
      bgColor: state.bgColor,
      saturation: state.saturation,
      glow: state.glow,
      poeticMode: state.poeticMode,
      artcoreMode: state.artcoreMode,
      poem: state.poem,
      textLight: state.textLight,
      textFormat: state.textFormat,
      textMixActive: state.textMixActive,
      textMixAmount: state.textMixAmount,
      textMixMode: state.textMixMode,
      textMixer: this.textMixer.text
    });
  }

  drawLoveIdle(state, width, height) {
    const ctx = this.ctx;
    const fontSize = Math.max(12, Number(state.fontSize));
    const stepX = fontSize * 1.05;
    const stepY = fontSize * 1.18;
    const cols = Math.ceil(width / stepX);
    const rows = Math.ceil(height / stepY);
    const time = performance.now() * 0.001 * Number(state.animationSpeed || 1);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = state.fgColor;
    ctx.shadowBlur = Math.min(Number(state.glow), 24);
    this.rows = [];

    let visibleIndex = 0;
    for (let y = 0; y < rows; y += 1) {
      let textRow = "";
      for (let x = 0; x < cols; x += 1) {
        const nx = (x / Math.max(1, cols - 1)) * 2 - 1;
        const ny = (y / Math.max(1, rows - 1)) * 2 - 1.08;
        const heart = heartField(nx, ny);
        const wave = Math.sin(time * 2.4 + x * 0.4 + y * 0.22) * 0.5 + 0.5;
        const brightness = clamp(heart * 2.2 + wave * 0.24, 0, 1);
        let glyph = heart < 0.08 && (x + y + Math.floor(Number(state.shuffleSeed || 0))) % 13 === 0
          ? "အချစ်"
          : randomGlyphForBrightness("love", brightness, x, y, Number(state.shuffleSeed || 0));
        if (glyph !== " " && glyph !== "အချစ်") {
          glyph = this.mixTextGlyph(glyph, state, x, y, visibleIndex, brightness, Number(state.shuffleSeed || 0));
          visibleIndex += 1;
        }
        textRow += glyph === "အချစ်" ? "ချ" : glyph;
        if (glyph === " ") continue;

        const flow = flowOffset(x, y, time, state, 0.8 - brightness * 0.5, stepX, stepY, cols, rows);
        const pulse = 1 + (1 - brightness) * 0.32 + Math.sin(time * 3 + x * 0.11) * 0.04;
        const px = x * stepX + stepX * 0.5 + flow.x;
        const py = y * stepY + stepY * 0.5 + flow.y;
        ctx.globalAlpha = clamp((1 - brightness * 0.72) * Number(state.blend || 1), 0.08, 1);
        this.setFont(ctx, Math.round(fontSize * pulse));
        ctx.fillStyle = colorForDepth(state, 1 - brightness, ctx.globalAlpha);
        ctx.fillText(glyph, px, py);
      }
      this.rows.push(textRow);
    }

    ctx.restore();
    this.drawPoeticText(state, width, height);
  }

  drawPoeticText(state, width, height) {
    this.poemOutput = "";
    if (!state.poeticMode || !state.poem) return;
    const title = state.poem.title.trim();
    const paragraph = state.poem.paragraph.trim();
    const author = state.poem.author.trim();
    if (!title && !paragraph && !author) return;
    this.poemOutput = [title, paragraph, author].filter(Boolean).join("\n");

    const ctx = this.ctx;
    const light = Number(state.textLight || 0.68);
    const align = state.textFormat?.align || "center";
    const margin = Math.max(24, width * 0.08);
    const maxWidth = width - margin * 2;
    const x = align === "left" ? margin : align === "right" ? width - margin : width * 0.5;
    const titleSize = clamp(width * 0.055, 20, 44);
    const bodySize = state.artcoreMode ? clamp(width * 0.021, 9, 16) : clamp(width * 0.03, 13, 24);
    const authorSize = clamp(width * 0.024, 11, 18);
    const titleLines = title ? wrapText(ctx, title, maxWidth, titleSize, state) : [];
    const bodyLines = paragraph
      ? paragraph.split("\n").flatMap((line) => (state.artcoreMode ? [line] : wrapText(ctx, line, maxWidth, bodySize, state)))
      : [];
    const authorLines = author ? wrapText(ctx, author, maxWidth, authorSize, state) : [];
    const lineGap = bodySize * 0.45;
    const totalHeight = titleLines.length * titleSize * 1.15 + bodyLines.length * bodySize * 1.38 + authorLines.length * authorSize * 1.25 + lineGap * 3;
    let y = height * 0.5 - totalHeight * 0.5;

    ctx.save();
    ctx.textAlign = align;
    ctx.textBaseline = "top";
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = state.depthColor;
    ctx.shadowBlur = Math.min(36, Number(state.glow || 0) + light * 20);
    ctx.fillStyle = colorForDepth(state, 0.65 + light * 0.35, clamp(0.22 + light * 0.78, 0, 1));
    for (const line of titleLines) {
      drawFormattedLine(ctx, line, x, y, titleSize, state, true);
      y += titleSize * 1.15;
    }
    y += lineGap;
    ctx.fillStyle = colorForDepth(state, 0.35 + light * 0.35, clamp(0.18 + light * 0.62, 0, 0.92));
    for (const line of bodyLines) {
      drawFormattedLine(ctx, line, x, y, bodySize, state, false);
      y += bodySize * 1.38;
    }
    y += lineGap;
    ctx.globalAlpha = clamp(0.35 + light * 0.58, 0, 1);
    for (const line of authorLines) {
      drawFormattedLine(ctx, line, x, y, authorSize, state, false);
      y += authorSize * 1.25;
    }
    ctx.restore();
  }

  updateQuality() {
    const now = performance.now();
    const frameMs = now - this.lastFrameTime;
    this.lastFrameTime = now;
    if (frameMs > 250) return;
    if (frameMs > 32) {
      this.quality = Math.max(0.72, this.quality - 0.025);
    } else if (frameMs < 17) {
      this.quality = Math.min(1, this.quality + 0.018);
    }
  }

  setFont(ctx, size) {
    const nextFont = fontStack(size);
    if (nextFont === this.cachedFont) return;
    ctx.font = nextFont;
    this.cachedFont = nextFont;
  }

  drawMeshHints(faceProcessor, mirrored, state, width, height, sourceKind) {
    const face = faceProcessor.lastResult;
    const hands = faceProcessor.lastHandResults || [];
    if (!face?.landmarks && !hands.length) return;
    const ctx = this.ctx;
    const depthStrength = Number(state.depthIntensity || 0);
    const hintPower = clamp(depthStrength / 2.5, 0, 1);
    ctx.save();
    ctx.globalAlpha = sourceKind === "image" ? 0.22 + hintPower * 0.22 : 0.14 + hintPower * 0.28;
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = state.depthColor;
    ctx.shadowBlur = sourceKind === "image"
      ? Math.min(28, Number(state.glow || 0) + 5 + depthStrength * 4)
      : Math.min(24, Number(state.glow || 0) * 0.35 + depthStrength * 5);
    ctx.strokeStyle = state.depthColor;
    ctx.lineWidth = sourceKind === "image" ? 1.2 + hintPower * 1.2 : 0.8 + hintPower * 1.4;

    if (face?.landmarks) {
      ctx.beginPath();
      for (let i = 0; i < face.landmarks.length; i += 17) {
        const point = face.landmarks[i];
        const x = (mirrored ? 1 - point.x : point.x) * width;
        const y = point.y * height;
        ctx.moveTo(x + 2, y);
        ctx.arc(x, y, 1.8 + hintPower * 2.2, 0, Math.PI * 2);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = sourceKind === "image" ? 0.28 + hintPower * 0.32 : 0.22 + hintPower * 0.36;
    for (const hand of hands) {
      ctx.beginPath();
      for (const index of HAND_HINT_INDICES) {
        const point = hand.landmarks[index];
        if (!point) continue;
        const x = (mirrored ? 1 - point.x : point.x) * width;
        const y = point.y * height;
        ctx.moveTo(x + 3, y);
        ctx.arc(x, y, 2.4 + hintPower * 3.4, 0, Math.PI * 2);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

function colorForDepth(state, depth, alpha) {
  const foreground = hexToRgb(state.fgColor);
  const close = hexToRgb(state.depthColor);
  const mix = clamp(depth, 0, 1);
  const saturation = Number(state.saturation);
  let r = lerp(foreground.r, close.r, mix);
  let g = lerp(foreground.g, close.g, mix);
  let b = lerp(foreground.b, close.b, mix);
  const gray = (r + g + b) / 3;
  r = lerp(gray, r, saturation);
  g = lerp(gray, g, saturation);
  b = lerp(gray, b, saturation);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

function estimateLightSource(pixels, width, height) {
  let total = 0;
  let weightedX = 0;
  let weightedY = 0;
  let peak = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const luminance = (0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2]) / 255;
      const weight = Math.pow(luminance, 2.4);
      total += weight;
      weightedX += x * weight;
      weightedY += y * weight;
      peak = Math.max(peak, luminance);
    }
  }

  if (total <= 0.0001) {
    return { x: 0.5, y: 0.25, intensity: 0 };
  }

  return {
    x: weightedX / total / Math.max(1, width - 1),
    y: weightedY / total / Math.max(1, height - 1),
    intensity: clamp(peak, 0, 1)
  };
}

function lightAt(x, y, light) {
  const dx = x - light.x;
  const dy = y - light.y;
  const falloff = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 1.65);
  return falloff * light.intensity;
}

const HAND_HINT_INDICES = [
  0, 4, 8, 12, 16, 20
];

function sourceDrawRect(sourceManager, width, height, state, options = {}) {
  const sw = Math.max(1, sourceManager.width);
  const sh = Math.max(1, sourceManager.height);
  const sourceRatio = sw / sh;
  const targetRatio = width / height;
  let drawW = width;
  let drawH = height;
  let dx = 0;
  let dy = 0;
  if (sourceRatio > targetRatio) {
    drawH = height;
    drawW = height * sourceRatio;
    dx = (width - drawW) / 2;
  } else {
    drawW = width;
    drawH = width / sourceRatio;
    dy = (height - drawH) / 2;
  }

  if (sourceManager.kind === "image" || sourceManager.kind === "video") {
    const scaleKey = options.scaleKey || "imageScale";
    const offsetXKey = options.offsetXKey || "imageOffsetX";
    const offsetYKey = options.offsetYKey || "imageOffsetY";
    const imageScale = clamp(Number(state[scaleKey] || 1), options.minScale ?? 0.45, options.maxScale ?? 2.6);
    const imageOffsetX = clamp(Number(state[offsetXKey] || 0), options.minOffset ?? -0.7, options.maxOffset ?? 0.7);
    const imageOffsetY = clamp(Number(state[offsetYKey] || 0), options.minOffset ?? -0.7, options.maxOffset ?? 0.7);
    const centerX = dx + drawW * 0.5 + width * imageOffsetX;
    const centerY = dy + drawH * 0.5 + height * imageOffsetY;
    drawW *= imageScale;
    drawH *= imageScale;
    dx = centerX - drawW * 0.5;
    dy = centerY - drawH * 0.5;
  }

  return { dx, dy, drawW, drawH };
}

function applyPhotoBlend(pixels, state) {
  const mode = state.photoMode || "normal";
  const amount = clamp(Number(state.photoAmount || 0), 0, 1);
  if (mode === "normal" || amount <= 0) return;

  const accent = hexToRgb(state.fgColor);
  const depth = hexToRgb(state.depthColor);
  for (let i = 0; i < pixels.length; i += 4) {
    const mix = (i / 4) % 2 === 0 ? accent : depth;
    pixels[i] = lerp(pixels[i], photoBlendChannel(pixels[i], mix.r, mode), amount);
    pixels[i + 1] = lerp(pixels[i + 1], photoBlendChannel(pixels[i + 1], mix.g, mode), amount);
    pixels[i + 2] = lerp(pixels[i + 2], photoBlendChannel(pixels[i + 2], mix.b, mode), amount);
  }
}

function applyMediaEffects(pixels, width, height, state) {
  const dither = clamp(Number(state.dither || 0), 0, 1);
  const posterize = clamp(Number(state.posterize || 0), 0, 1);
  const invert = Boolean(state.invertMedia);
  if (!dither && !posterize && !invert) return;

  const levels = Math.round(lerp(256, 4, posterize));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      let r = pixels[i];
      let g = pixels[i + 1];
      let b = pixels[i + 2];

      if (invert) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      }

      if (posterize > 0) {
        r = quantizeChannel(r, levels);
        g = quantizeChannel(g, levels);
        b = quantizeChannel(b, levels);
      }

      if (dither > 0) {
        const threshold = (BAYER_4[(y % 4) * 4 + (x % 4)] / 15 - 0.5) * 96 * dither;
        r = clamp(r + threshold, 0, 255);
        g = clamp(g + threshold, 0, 255);
        b = clamp(b + threshold, 0, 255);
      }

      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
    }
  }
}

const BAYER_4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5
];

function quantizeChannel(value, levels) {
  if (levels >= 255) return value;
  const step = 255 / Math.max(1, levels - 1);
  return Math.round(value / step) * step;
}

function photoBlendChannel(base, top, mode) {
  if (mode === "screen") return 255 - ((255 - base) * (255 - top)) / 255;
  if (mode === "difference") return Math.abs(base - top);
  return base;
}

function compositeForPhotoMode(mode) {
  if (mode === "screen") return "screen";
  if (mode === "difference") return "difference";
  return "source-over";
}

function wrapTextClusters(text, maxChars) {
  const lines = [];
  for (const rawLine of text.split(/\n/)) {
    const clusters = textClusters(rawLine);
    let line = [];
    for (const cluster of clusters) {
      if (line.length >= maxChars && cluster !== " ") {
        lines.push(line);
        line = [];
      }
      line.push(cluster);
    }
    lines.push(line);
  }
  return lines.length ? lines : [[]];
}

function wrapMaskText(ctx, text, maxWidth) {
  const lines = [];
  for (const rawLine of text.split(/\n/)) {
    const clusters = textClusters(rawLine);
    let current = "";
    for (const cluster of clusters) {
      const next = current + cluster;
      if (current && ctx.measureText(next).width > maxWidth) {
        lines.push(current.trimEnd());
        current = cluster.trim() ? cluster.trimStart() : "";
      } else {
        current = next;
      }
    }
    if (current.trim()) lines.push(current.trim());
    if (!clusters.length) lines.push("");
  }
  return lines.length ? lines : [text];
}

function textClusters(text) {
  const clusters = [];
  for (const char of Array.from(text.normalize("NFC"))) {
    if (isMyanmarMark(char) && clusters.length) {
      clusters[clusters.length - 1] += char;
    } else {
      clusters.push(char);
    }
  }
  return clusters;
}

function glyphForTypedCluster(cluster, mode, pack, seed) {
  if (cluster === " ") return " ";
  const random = hash01(seed + stringWeight(cluster));
  const burmese = isBurmese(cluster);
  const latin = isLatin(cluster);
  const keepBurmese = burmese && mode !== "ascii" && random < 0.68;
  const keepLatin = latin && mode !== "burmese" && random < 0.58;
  if (keepBurmese || keepLatin) return cluster;

  const brightness = clamp(0.08 + hash01(seed * 1.7) * 0.86, 0, 0.96);
  const glyph = randomGlyphForBrightness(mode, brightness, Math.round(seed) % 997, Math.round(seed * 3) % 991, seed * 0.01, pack);
  if (glyph.trim()) return glyph;
  const fallback = glyphSet(mode, pack).filter((item) => item.trim());
  return fallback[Math.floor(hash01(seed * 9.13) * fallback.length)] || cluster;
}

function stringWeight(text) {
  let total = 0;
  for (const char of Array.from(text)) total += char.codePointAt(0) || 0;
  return total;
}

function isBurmese(text) {
  return /[\u1000-\u109f\uaa60-\uaa7f]/u.test(text);
}

function isMyanmarMark(text) {
  return /[\u102b-\u103e\u1056-\u1059\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f]/u.test(text);
}

function isLatin(text) {
  return /[A-Za-z0-9]/u.test(text);
}

function postValues(state) {
  return {
    vignette: clamp(Number(state.postVignette || 0), 0, 1),
    scanlines: clamp(Number(state.postScanlines || 0), 0, 1),
    curvature: clamp(Number(state.postCurvature || 0), 0, 1),
    chromatic: clamp(Number(state.postChromatic || 0), 0, 1),
    bloom: clamp(Number(state.postBloom || 0), 0, 1),
    charBloom: clamp(Number(state.postCharBloom || 0), 0, 1),
    charChromatic: clamp(Number(state.postCharChromatic || 0), 0, 1),
    filmGrain: clamp(Number(state.postFilmGrain || 0), 0, 1),
    glitch: clamp(Number(state.postGlitch || 0), 0, 1),
    rgbSplit: clamp(Number(state.postRgbSplit || 0), 0, 1),
    pixelate: clamp(Number(state.postPixelate || 0), 0, 1),
    halftone: clamp(Number(state.postHalftone || 0), 0, 1),
    filmDust: clamp(Number(state.postFilmDust || 0), 0, 1)
  };
}

function hasPostEffects(effects) {
  return Object.values(effects).some((value) => value > 0);
}

function flowOffset(x, y, time, state, depth, stepX, stepY, sampleW, sampleH) {
  const strength = Number(state.flowStrength || 0);
  if (!strength) return { x: 0, y: 0 };
  const speed = Number(state.animationSpeed || 1);
  const amountX = stepX * 0.75 * strength;
  const amountY = stepY * 0.75 * strength;

  if (state.flowMode === "rain") {
    const rain = matrixRain(x, y, time, speed, strength, sampleH);
    return {
      x: 0,
      y: rain.offsetCells * stepY * (0.82 + depth * 0.28)
    };
  }

  if (state.flowMode === "orbit") {
    const cx = sampleW * 0.5;
    const cy = sampleH * 0.5;
    const dx = x - cx;
    const dy = y - cy;
    const angle = Math.atan2(dy, dx) + time * 1.35 * speed;
    const radius = Math.hypot(dx / Math.max(1, sampleW), dy / Math.max(1, sampleH));
    const pulse = 0.42 + depth * 0.75 + Math.sin(time * 2.1 * speed + radius * 16) * 0.12;
    return {
      x: Math.cos(angle + Math.PI * 0.5) * amountX * pulse,
      y: Math.sin(angle + Math.PI * 0.5) * amountY * pulse
    };
  }

  return {
    x: Math.sin(time * 1.6 * speed + y * 0.33) * amountX * (0.45 + depth),
    y: Math.cos(time * 1.25 * speed + x * 0.27) * amountY * (0.35 + depth * 0.8)
  };
}

function flowEnergy(x, y, time, mode, sampleW, sampleH) {
  if (mode === "rain") {
    return matrixRain(x, y, time, 1, 1, sampleH).energy;
  }

  if (mode === "orbit") {
    const dx = x - sampleW * 0.5;
    const dy = y - sampleH * 0.5;
    const radius = Math.hypot(dx / Math.max(1, sampleW), dy / Math.max(1, sampleH));
    return Math.sin(time * 3.1 + radius * 26 + Math.atan2(dy, dx) * 2) * 0.5 + 0.5;
  }

  return Math.sin(time * 1.7 + x * 0.19 + y * 0.13) * 0.5 + 0.5;
}

function matrixRain(x, y, time, speed, strength, sampleH) {
  const column = Math.floor(x);
  const height = Math.max(1, sampleH);
  const trail = Math.max(5, Math.round(height * 0.28));
  const loop = height + trail;
  const start = hash01(column * 12.9898) * loop;
  const columnSpeed = 4.2 + hash01(column * 78.233 + 13.7) * 8.5;
  const fall = (start + time * Math.max(0.08, speed) * columnSpeed * Math.max(0.2, strength)) % loop;
  const shifted = (y + fall) % loop - trail;
  const offsetCells = shifted - y;
  const distanceBehindHead = (fall - y + loop) % loop;
  const head = Math.exp(-Math.pow(distanceBehindHead / 1.55, 2));
  const tail = distanceBehindHead > 0 && distanceBehindHead < trail
    ? Math.pow(1 - distanceBehindHead / trail, 1.8)
    : 0;
  return {
    offsetCells,
    energy: clamp(head * 1.2 + tail * 0.72, 0, 1)
  };
}

function hash01(value) {
  const n = Math.sin(value) * 43758.5453123;
  return n - Math.floor(n);
}

function fontStack(size) {
  return `${size}px "DotGothic16", "Noto Sans Myanmar", "Myanmar MN", "Courier New", monospace`;
}

function formattedFont(size, state, forceBold) {
  const italic = state.textFormat?.italic ? "italic " : "";
  const weight = forceBold || state.textFormat?.bold ? "700 " : "400 ";
  return `${italic}${weight}${size}px "DotGothic16", "Noto Sans Myanmar", "Myanmar MN", "Courier New", monospace`;
}

function drawFormattedLine(ctx, line, x, y, size, state, forceBold) {
  ctx.font = formattedFont(size, state, forceBold);
  ctx.fillText(line, x, y);
  if (!state.textFormat?.underline) return;
  const width = ctx.measureText(line).width;
  const start = ctx.textAlign === "center" ? x - width / 2 : ctx.textAlign === "right" ? x - width : x;
  ctx.save();
  ctx.globalAlpha = Math.min(1, ctx.globalAlpha || 1);
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = Math.max(1, size * 0.06);
  ctx.beginPath();
  ctx.moveTo(start, y + size * 1.08);
  ctx.lineTo(start + width, y + size * 1.08);
  ctx.stroke();
  ctx.restore();
}

function wrapText(ctx, text, maxWidth, size, state) {
  ctx.font = formattedFont(size, state, false);
  const tokens = text.split(/(\s+)/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const token of tokens) {
    const next = current + token;
    if (current && ctx.measureText(next).width > maxWidth) {
      lines.push(current.trimEnd());
      current = token.trimStart();
    } else {
      current = next;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

function contrastCurve(value, contrast) {
  return clamp((value - 0.5) * contrast + 0.5, 0, 1);
}

function heartField(x, y) {
  const scaledX = x * 1.08;
  const scaledY = y * 1.08;
  return Math.pow(scaledX * scaledX + scaledY * scaledY - 1, 3) - scaledX * scaledX * scaledY * scaledY * scaledY;
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const int = Number.parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
