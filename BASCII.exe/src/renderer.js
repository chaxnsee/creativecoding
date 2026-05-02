import { glyphSet, randomGlyphForBrightness } from "./glyphs.js";

export class BurmeseAsciiRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.sampleCanvas = document.createElement("canvas");
    this.sampleCtx = this.sampleCanvas.getContext("2d", { willReadFrequently: true });
    this.rows = [];
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.lastResize = { width: 0, height: 0, renderScale: 1 };
    this.renderScale = 1;
    this.quality = 1;
    this.lastFrameTime = performance.now();
    this.cachedFont = "";
    this.lastStaticIdleKey = "";
    this.poemOutput = "";
  }

  resize(renderScale = this.renderScale) {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const scale = clamp(Number(renderScale || 1), 0.2, 1);
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
    const staticAmbient = sourceManager.kind === "ambient"
      && Number(state.flowStrength || 0) === 0
      && (!source || !sourceManager.width || !sourceManager.height);
    const staticAmbientKey = staticAmbient ? this.staticAmbientKey(state, width, height) : "";
    if (staticAmbient && this.lastStaticIdleKey === staticAmbientKey) return;
    if (!staticAmbient) this.lastStaticIdleKey = "";

    const ctx = this.ctx;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(0, 0, width, height);

    if (!source || !sourceManager.ready || !sourceManager.width || !sourceManager.height) {
      this.drawIdle(state, width, height, sourceManager.kind);
      if (staticAmbient) this.lastStaticIdleKey = staticAmbientKey;
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
        const lightAtCell = lightAt(nx, ny, light);
        const wave = Math.sin(time * 2.2 + x * 0.27 + y * 0.19) * 0.5 + 0.5;
        const poetic = state.poeticMode ? (wave - 0.5) * 0.14 * Number(state.animationSpeed) : 0;
        const motion = expression * (0.18 + wave * 0.2);
        const depthStrength = Number(state.depthIntensity || 0);
        const trackedDepth = faceProcessor.depthAt(nx, ny, sourceManager.mirrored);
        const luminanceDepth = clamp((1 - contrasted) * 0.62 + lightAtCell * 0.24, 0, 1);
        const rawDepth = Math.max(trackedDepth, trackedDepth > 0 ? luminanceDepth * 0.22 : luminanceDepth * 0.58);
        const depth = clamp(Math.pow(rawDepth, 0.62) * depthStrength * 1.72, 0, 2.8);
        const depthPop = clamp(depth / 2.2, 0, 1);
        const rainLife = state.flowMode === "rain" && Number(state.flowStrength || 0) > 0
          ? flowEnergy(x, y, time, state.flowMode, sampleW, sampleH)
          : 0;
        const brightness = clamp(contrasted + poetic - depthPop * 0.46 + motion + lightAtCell * 0.18, 0, 1);
        const glyph = randomGlyphForBrightness(state.charMode, brightness, x, y, glyphTime, state.symbolPack);
        textRow += glyph;
        if (glyph === " ") continue;

        const flow = flowOffset(x, y, time, state, depth, stepX, stepY, sampleW, sampleH);
        const parallaxX = (nx - 0.5) * depth * -36;
        const parallaxY = (ny - 0.5) * depth * -24 + Math.sin(time * 1.4 + x * 0.08) * depth * 7;
        const px = x * stepX + stepX * 0.5 + parallaxX + flow.x;
        const py = y * stepY + stepY * 0.5 + parallaxY + flow.y;
        const scale = 1 + depth * 1.12 + lightAtCell * 0.16;
        const alpha = clamp((1 - brightness * 0.72 + depthPop * 0.74 + lightAtCell * 0.16) * Number(state.blend), 0, 1);
        const quantizedSize = Math.round(Math.max(7, fontSize * scale));
        ctx.globalAlpha = state.flowMode === "rain" ? clamp(alpha * (0.42 + rainLife * 0.95), 0, 1) : alpha;
        this.setFont(ctx, quantizedSize);
        ctx.fillStyle = colorForDepth(state, clamp(depthPop + lightAtCell * 0.22 + rainLife * 0.26, 0, 1), ctx.globalAlpha);
        ctx.fillText(glyph, px, py);
      }
      this.rows.push(textRow);
    }

    ctx.restore();
    this.drawMeshHints(faceProcessor, sourceManager.mirrored, state, width, height, sourceManager.kind);
    this.drawPoeticText(state, width, height);
  }

  textOutput() {
    return [this.rows.join("\n"), this.poemOutput].filter(Boolean).join("\n\n");
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

    for (let y = 0; y < rows; y += 1) {
      let textRow = "";
      for (let x = 0; x < cols; x += 1) {
        const wave = Math.sin(x * 0.54 + y * 0.31) * 0.5 + 0.5;
        const shimmer = Math.sin(x * 0.17 + y * 0.11) * 0.5 + 0.5;
        const flowLife = animatedFlow ? flowEnergy(x, y, motionTime, state.flowMode, cols, rows) : 0;
        const brightness = clamp(0.16 + wave * 0.62 + shimmer * 0.16, 0, 1);
        const glyph = randomGlyphForBrightness(mode, brightness, x, y, stableTime, state.symbolPack);
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
      textFormat: state.textFormat
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

    for (let y = 0; y < rows; y += 1) {
      let textRow = "";
      for (let x = 0; x < cols; x += 1) {
        const nx = (x / Math.max(1, cols - 1)) * 2 - 1;
        const ny = (y / Math.max(1, rows - 1)) * 2 - 1.08;
        const heart = heartField(nx, ny);
        const wave = Math.sin(time * 2.4 + x * 0.4 + y * 0.22) * 0.5 + 0.5;
        const brightness = clamp(heart * 2.2 + wave * 0.24, 0, 1);
        const glyph = heart < 0.08 && (x + y + Math.floor(Number(state.shuffleSeed || 0))) % 13 === 0
          ? "အချစ်"
          : randomGlyphForBrightness("love", brightness, x, y, Number(state.shuffleSeed || 0));
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
