import { glyphSet, randomGlyphForBrightness } from "./glyphs.js";

export class BurmeseAsciiRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.sampleCanvas = document.createElement("canvas");
    this.sampleCtx = this.sampleCanvas.getContext("2d", { willReadFrequently: true });
    this.rows = [];
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.lastResize = { width: 0, height: 0 };
    this.quality = 1;
    this.lastFrameTime = performance.now();
    this.cachedFont = "";
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    if (this.lastResize.width === width && this.lastResize.height === height) return;
    this.lastResize = { width, height };
    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  render({ source, sourceManager, faceProcessor, state }) {
    this.updateQuality();
    this.resize();
    const width = this.lastResize.width;
    const height = this.lastResize.height;
    const ctx = this.ctx;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(0, 0, width, height);

    if (!source || !sourceManager.ready || !sourceManager.width || !sourceManager.height) {
      this.drawIdle(state, width, height, sourceManager.kind);
      return;
    }

    const fontSize = Number(state.fontSize);
    const effectiveDensity = clamp(Number(state.density), 0.2, 1);
    const densityOverload = clamp((effectiveDensity - 0.55) / 0.45, 0, 1);
    let stepX = Math.max(5, (fontSize * 0.72) / effectiveDensity);
    let stepY = Math.max(7, (fontSize * 1.02) / effectiveDensity);
    if (densityOverload > 0) {
      const resolutionReduction = 1 + densityOverload * 0.85;
      stepX *= resolutionReduction;
      stepY *= resolutionReduction;
    }
    let sampleW = Math.max(28, Math.round(width / stepX));
    let sampleH = Math.max(22, Math.round(height / stepY));
    const cells = sampleW * sampleH;
    const maxCells = Math.round(5200 * this.quality * (1 - densityOverload * 0.42));
    if (cells > maxCells) {
      const scale = Math.sqrt(cells / maxCells);
      stepX *= scale;
      stepY *= scale;
      sampleW = Math.max(28, Math.round(width / stepX));
      sampleH = Math.max(22, Math.round(height / stepY));
    }
    this.drawSourceToSample(source, sourceManager, sampleW, sampleH, state);

    const imageData = this.sampleCtx.getImageData(0, 0, sampleW, sampleH);
    if (sourceManager.kind === "image") {
      applyPhotoBlend(imageData.data, state);
    }
    const pixels = imageData.data;
    const light = estimateLightSource(pixels, sampleW, sampleH);
    const time = performance.now() * 0.001 * Number(state.animationSpeed);
    const expression = faceProcessor.lastResult?.expression || 0;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = fontStack(fontSize);
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = state.fgColor;
    ctx.shadowBlur = Math.min(Number(state.glow) + light.intensity * 10, 24) * this.quality;
    this.rows = [];
    this.cachedFont = ctx.font;

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
        const depth = faceProcessor.depthAt(nx, ny, sourceManager.mirrored) * Number(state.depthIntensity);
        const lightAtCell = lightAt(nx, ny, light);
        const wave = Math.sin(time * 2.2 + x * 0.27 + y * 0.19) * 0.5 + 0.5;
        const poetic = state.poeticMode ? (wave - 0.5) * 0.14 * Number(state.animationSpeed) : 0;
        const motion = expression * (0.18 + wave * 0.2);
        const brightness = clamp(contrasted + poetic - depth * 0.3 + motion + lightAtCell * 0.18, 0, 1);
        const glyph = state.pretextMode && sourceManager.kind === "camera"
          ? pretextGlyphForMotion(state, brightness, x, y, time, expression, depth)
          : randomGlyphForBrightness(state.charMode, brightness, x, y, time, state.symbolPack);
        textRow += glyph;
        if (glyph === " ") continue;

        const flow = flowOffset(x, y, time, state, depth, stepX, stepY, sampleW, sampleH);
        const px = x * stepX + stepX * 0.5 + (depth - 0.35) * 15 * Number(state.depthIntensity) + flow.x;
        const py = y * stepY + stepY * 0.5 + Math.sin(time + x * 0.08) * depth * 5 + flow.y;
        const scale = 1 + depth * 0.82 + lightAtCell * 0.12;
        const alpha = clamp((1 - brightness * 0.76 + depth * 0.52 + lightAtCell * 0.14) * Number(state.blend), 0.06, 1);
        const quantizedSize = Math.round(Math.max(7, fontSize * scale));
        ctx.globalAlpha = alpha;
        this.setFont(ctx, quantizedSize);
        ctx.fillStyle = colorForDepth(state, clamp(depth + lightAtCell * 0.18, 0, 1), alpha);
        ctx.fillText(glyph, px, py);
      }
      this.rows.push(textRow);
    }

    ctx.restore();
    this.drawMeshHints(faceProcessor, sourceManager.mirrored, state, width, height, sourceManager.kind);
    this.drawPretextLayer(faceProcessor, sourceManager.mirrored, state, width, height, sourceManager.kind, time, expression);
    this.drawPoeticText(state, width, height);
  }

  textOutput() {
    return this.rows.join("\n");
  }

  drawSourceToSample(source, sourceManager, width, height, state) {
    if (this.sampleCanvas.width !== width || this.sampleCanvas.height !== height) {
      this.sampleCanvas.width = width;
      this.sampleCanvas.height = height;
    }

    const sw = sourceManager.width;
    const sh = sourceManager.height;
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

    if (sourceManager.kind === "image") {
      const imageScale = clamp(Number(state.imageScale || 1), 0.45, 2.6);
      const imageOffsetX = clamp(Number(state.imageOffsetX || 0), -0.7, 0.7);
      const imageOffsetY = clamp(Number(state.imageOffsetY || 0), -0.7, 0.7);
      const centerX = dx + drawW * 0.5 + width * imageOffsetX;
      const centerY = dy + drawH * 0.5 + height * imageOffsetY;
      drawW *= imageScale;
      drawH *= imageScale;
      dx = centerX - drawW * 0.5;
      dy = centerY - drawH * 0.5;
    }

    const ctx = this.sampleCtx;
    ctx.save();
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(0, 0, width, height);
    if (sourceManager.mirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(source, width - dx - drawW, dy, drawW, drawH);
    } else {
      ctx.drawImage(source, dx, dy, drawW, drawH);
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
    const time = performance.now() * 0.001 * Number(state.animationSpeed || 1);
    const density = clamp(Number(state.density || 0.48), 0.25, 0.75);
    const fontSize = clamp(Number(state.fontSize || 15), 8, 30);
    let stepX = Math.max(9, (fontSize * 0.92) / density);
    let stepY = Math.max(11, (fontSize * 1.22) / density);
    let cols = Math.max(8, Math.round(width / stepX));
    let rows = Math.max(8, Math.round(height / stepY));
    const maxCells = Math.round(1700 * this.quality);
    const cells = cols * rows;
    if (cells > maxCells) {
      const scale = Math.sqrt(cells / maxCells);
      stepX *= scale;
      stepY *= scale;
      cols = Math.max(8, Math.round(width / stepX));
      rows = Math.max(8, Math.round(height / stepY));
    }
    const mode = state.charMode === "love" ? "hybrid" : state.charMode;
    this.rows = [];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = fontStack(fontSize);
    ctx.shadowColor = state.fgColor;
    ctx.shadowBlur = Math.min(14, Number(state.glow || 0) * 0.65);

    for (let y = 0; y < rows; y += 1) {
      let textRow = "";
      for (let x = 0; x < cols; x += 1) {
        const wave = Math.sin(x * 0.54 + y * 0.31) * 0.5 + 0.5;
        const shimmer = Math.sin(time * 1.1 + x * 0.17 + y * 0.11) * 0.5 + 0.5;
        const flowLife = flowEnergy(x, y, time, state.flowMode, cols, rows);
        const brightness = clamp(0.16 + wave * 0.62 + shimmer * 0.16, 0, 1);
        const glyph = randomGlyphForBrightness(mode, brightness + flowLife * 0.08, x, y, time, state.symbolPack);
        textRow += glyph;
        if (glyph === " ") continue;
        const px = x * stepX + stepX * 0.5 + (width - cols * stepX) * 0.5;
        const py = y * stepY + stepY * 0.5 + (height - rows * stepY) * 0.5;
        const flow = flowOffset(x, y, time, state, 0.14 + shimmer * 0.2, stepX, stepY, cols, rows);
        ctx.globalAlpha = clamp(0.1 + density * 0.16 + shimmer * 0.08 + flowLife * 0.14, 0.08, 0.52);
        ctx.fillStyle = colorForDepth(state, wave * 0.7, ctx.globalAlpha);
        ctx.fillText(glyph, px + flow.x, py + flow.y);
      }
      this.rows.push(textRow);
    }

    ctx.globalAlpha = 1;
    ctx.strokeStyle = colorForDepth(state, 0.35, 0.18);
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 10]);
    ctx.strokeRect(width * 0.12, height * 0.12, width * 0.76, height * 0.76);
    ctx.setLineDash([]);

    ctx.restore();
    this.drawPoeticText(state, width, height);
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

    for (let y = 0; y < rows; y += 1) {
      let textRow = "";
      for (let x = 0; x < cols; x += 1) {
        const nx = (x / Math.max(1, cols - 1)) * 2 - 1;
        const ny = (y / Math.max(1, rows - 1)) * 2 - 1.08;
        const heart = heartField(nx, ny);
        const wave = Math.sin(time * 2.4 + x * 0.4 + y * 0.22) * 0.5 + 0.5;
        const brightness = clamp(heart * 2.2 + wave * 0.24, 0, 1);
        const glyph = heart < 0.08 && (x + y + Math.floor(time * 3)) % 13 === 0
          ? "အချစ်"
          : randomGlyphForBrightness("love", brightness, x, y, time);
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
    if (!state.poeticMode || !state.poem) return;
    const title = state.poem.title.trim();
    const paragraph = state.poem.paragraph.trim();
    const author = state.poem.author.trim();
    if (!title && !paragraph && !author) return;

    const ctx = this.ctx;
    const light = Number(state.textLight || 0.68);
    const align = state.textFormat?.align || "center";
    const margin = Math.max(24, width * 0.08);
    const maxWidth = width - margin * 2;
    const x = align === "left" ? margin : align === "right" ? width - margin : width * 0.5;
    const titleSize = clamp(width * 0.055, 20, 44);
    const bodySize = clamp(width * 0.03, 13, 24);
    const authorSize = clamp(width * 0.024, 11, 18);
    const titleLines = title ? wrapText(ctx, title, maxWidth, titleSize, state) : [];
    const bodyLines = paragraph ? paragraph.split("\n").flatMap((line) => wrapText(ctx, line, maxWidth, bodySize, state)) : [];
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

  drawPretextLayer(faceProcessor, mirrored, state, width, height, sourceKind, time, expression) {
    if (!state.pretextMode || sourceKind !== "camera") return;
    const chars = normalizedPretextText(state);
    if (!chars.length) return;

    const ctx = this.ctx;
    const boundsList = trackedBounds(faceProcessor, mirrored, width, height);
    const fontSize = clamp(Number(state.fontSize || 15) * 1.35, 14, 34);
    const stepX = fontSize * 0.86;
    const stepY = fontSize * 1.18;
    const cols = Math.ceil(width / stepX) + 2;
    const rows = Math.ceil(height / stepY) + 2;
    const drift = time * (12 + expression * 30);
    const fallbackBounds = {
      cx: width * 0.5,
      cy: height * 0.5,
      rx: width * 0.18,
      ry: height * 0.24
    };
    const activeBounds = boundsList.length ? boundsList : [fallbackBounds];

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = state.depthColor;
    ctx.shadowBlur = Math.min(28, Number(state.glow || 0) + 12);
    ctx.font = fontStack(fontSize);

    for (let row = -1; row < rows; row += 1) {
      for (let col = -1; col < cols; col += 1) {
        const baseX = col * stepX + ((row % 2) * stepX * 0.5) - (drift % stepX);
        const baseY = row * stepY + Math.sin(time * 1.7 + col * 0.4) * stepY * 0.18;
        const displaced = repelFromBoundsList(baseX, baseY, activeBounds, 22 + expression * 38);
        const pulse = Math.sin(time * 2.4 + row * 0.8 + col * 0.35) * 0.5 + 0.5;
        const charIndex = Math.abs(Math.floor(col + row * 5 + time * 8 + displaced.force * 17)) % chars.length;
        const glyph = chars[charIndex];
        if (!glyph.trim()) continue;

        ctx.globalAlpha = clamp(0.18 + displaced.force * 0.58 + pulse * 0.12, 0.12, 0.86);
        ctx.fillStyle = colorForDepth(state, clamp(displaced.force + pulse * 0.22, 0, 1), ctx.globalAlpha);
        this.setFont(ctx, Math.round(fontSize * (1 + displaced.force * 0.42)));
        ctx.fillText(glyph, displaced.x, displaced.y);
      }
    }

    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = colorForDepth(state, 0.85, 0.32);
    ctx.lineWidth = 1.2;
    for (const bounds of activeBounds) {
      ctx.beginPath();
      ctx.ellipse(bounds.cx, bounds.cy, bounds.rx, bounds.ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  updateQuality() {
    const now = performance.now();
    const frameMs = now - this.lastFrameTime;
    this.lastFrameTime = now;
    if (frameMs > 250) return;
    if (frameMs > 24) {
      this.quality = Math.max(0.45, this.quality - 0.045);
    } else if (frameMs < 17) {
      this.quality = Math.min(1, this.quality + 0.012);
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
    ctx.save();
    ctx.globalAlpha = sourceKind === "image" ? 0.28 : 0.18;
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = state.depthColor;
    ctx.shadowBlur = sourceKind === "image" ? Math.min(18, Number(state.glow || 0) + 5) : Math.min(12, Number(state.glow || 0) * 0.35);
    ctx.strokeStyle = state.depthColor;
    ctx.lineWidth = sourceKind === "image" ? 1.35 : 1;

    if (face?.landmarks) {
      ctx.beginPath();
      for (let i = 0; i < face.landmarks.length; i += 17) {
        const point = face.landmarks[i];
        const x = (mirrored ? 1 - point.x : point.x) * width;
        const y = point.y * height;
        ctx.moveTo(x + 2, y);
        ctx.arc(x, y, 2, 0, Math.PI * 2);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = sourceKind === "image" ? 0.34 : 0.26;
    for (const hand of hands) {
      ctx.beginPath();
      for (const index of HAND_HINT_INDICES) {
        const point = hand.landmarks[index];
        if (!point) continue;
        const x = (mirrored ? 1 - point.x : point.x) * width;
        const y = point.y * height;
        ctx.moveTo(x + 3, y);
        ctx.arc(x, y, 3, 0, Math.PI * 2);
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

function trackedBounds(faceProcessor, mirrored, width, height) {
  const bounds = [];
  const face = faceBounds(faceProcessor.lastResult, mirrored, width, height);
  if (face) bounds.push(face);
  for (const hand of faceProcessor.lastHandResults || []) {
    const handShape = handBounds(hand, mirrored, width, height);
    if (handShape) bounds.push(handShape);
  }
  return bounds;
}

function faceBounds(result, mirrored, width, height) {
  if (!result?.bounds) return null;
  const minX = mirrored ? 1 - result.bounds.maxX : result.bounds.minX;
  const maxX = mirrored ? 1 - result.bounds.minX : result.bounds.maxX;
  const minY = result.bounds.minY;
  const maxY = result.bounds.maxY;
  return {
    cx: ((minX + maxX) * 0.5) * width,
    cy: ((minY + maxY) * 0.5) * height,
    rx: Math.max(width * 0.11, (maxX - minX) * width * 0.62),
    ry: Math.max(height * 0.14, (maxY - minY) * height * 0.68)
  };
}

function handBounds(hand, mirrored, width, height) {
  if (!hand?.bounds) return null;
  const minX = mirrored ? 1 - hand.bounds.maxX : hand.bounds.minX;
  const maxX = mirrored ? 1 - hand.bounds.minX : hand.bounds.maxX;
  const minY = hand.bounds.minY;
  const maxY = hand.bounds.maxY;
  return {
    cx: ((minX + maxX) * 0.5) * width,
    cy: ((minY + maxY) * 0.5) * height,
    rx: Math.max(width * 0.075, (maxX - minX) * width * 0.86),
    ry: Math.max(height * 0.075, (maxY - minY) * height * 0.86)
  };
}

function repelFromBoundsList(x, y, boundsList, amount) {
  let best = { x, y, force: 0 };
  for (const bounds of boundsList) {
    const displaced = repelFromBounds(x, y, bounds, amount);
    if (displaced.force > best.force) best = displaced;
  }
  return best;
}

function repelFromBounds(x, y, bounds, amount) {
  const dx = x - bounds.cx;
  const dy = y - bounds.cy;
  const nx = dx / Math.max(1, bounds.rx);
  const ny = dy / Math.max(1, bounds.ry);
  const distance = Math.sqrt(nx * nx + ny * ny);
  const force = clamp(1 - distance, 0, 1);
  if (force <= 0) return { x, y, force: 0 };
  const angle = Math.atan2(ny, nx);
  const push = amount * Math.pow(force, 1.35);
  return {
    x: x + Math.cos(angle) * push,
    y: y + Math.sin(angle) * push,
    force
  };
}

const HAND_HINT_INDICES = [
  0, 4, 8, 12, 16, 20
];

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

function pretextGlyphForMotion(state, brightness, x, y, time, expression, depth) {
  const text = normalizedPretextText(state);
  if (!text.length) {
    return randomGlyphForBrightness(state.charMode, brightness, x, y, time, state.symbolPack);
  }

  const motion = expression * 19 + depth * 13 + Math.sin(time * 3 + y * 0.21) * 7;
  const brightStride = Math.floor((1 - brightness) * text.length * 0.72);
  const index = Math.abs(Math.floor(x * 3 + y * 5 + time * 9 + motion + brightStride)) % text.length;
  const glyph = text[index];
  if (glyph.trim()) return glyph;
  return brightness > 0.76 ? " " : text[(index + 1) % text.length] || " ";
}

function normalizedPretextText(state) {
  const fallback = {
    ascii: "BASCII PRETEXT MOTION TEXT ASCII",
    hybrid: "BASCII မြန်မာ ASCII motion စာသား",
    love: "အချစ် LOVE motion",
    burmese: "မြန်မာ စာသား အလင်း လှုပ်ရှားမှု"
  };
  const raw = (state.pretextText || fallback[state.charMode] || fallback.burmese).trim();
  return Array.from(raw.replace(/\s+/g, " "));
}

function photoBlendChannel(base, top, mode) {
  if (mode === "screen") return 255 - ((255 - base) * (255 - top)) / 255;
  if (mode === "difference") return Math.abs(base - top);
  return base;
}

function flowOffset(x, y, time, state, depth, stepX, stepY, sampleW, sampleH) {
  const strength = Number(state.flowStrength || 0);
  if (!strength) return { x: 0, y: 0 };
  const speed = Number(state.animationSpeed || 1);
  const amountX = stepX * 0.75 * strength;
  const amountY = stepY * 0.75 * strength;

  if (state.flowMode === "rain") {
    const columnDrift = Math.sin(x * 0.74 + time * 0.85 * speed) * 0.5 + 0.5;
    const fall = ((time * 9.5 * speed + columnDrift * 2.4 + y * 1.7) % 4) - 2;
    return {
      x: Math.sin(time * 1.7 * speed + y * 0.31) * amountX * 0.18,
      y: fall * amountY * (0.58 + depth)
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
    return Math.pow(Math.sin(time * 4.2 + x * 0.47 + y * 0.92) * 0.5 + 0.5, 2.4);
  }

  if (mode === "orbit") {
    const dx = x - sampleW * 0.5;
    const dy = y - sampleH * 0.5;
    const radius = Math.hypot(dx / Math.max(1, sampleW), dy / Math.max(1, sampleH));
    return Math.sin(time * 3.1 + radius * 26 + Math.atan2(dy, dx) * 2) * 0.5 + 0.5;
  }

  return Math.sin(time * 1.7 + x * 0.19 + y * 0.13) * 0.5 + 0.5;
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
