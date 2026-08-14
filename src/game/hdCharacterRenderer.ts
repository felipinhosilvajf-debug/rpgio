import type { CharacterOpts } from "./characterRenderer";

/**
 * HD Pixel Art Character Renderer (32/64-bit aesthetic)
 * - Produces a detailed frontal full-body pixel-art sprite at a high logical resolution (baseW x baseH)
 * - No blur, no AA, discrete palette steps
 * - Exported function: drawHDCharacter(ctx, x, y, opts)
 *
 * Notes:
 * - This module is intentionally self-contained and conservative: it only depends on CharacterOpts
 *   so you can integrate it progressively. It does not replace the legacy renderer automatically.
 * - The implementation focuses on a deterministic pixel pipeline using an offscreen canvas.
 */

const DEFAULT_W = 128;
const DEFAULT_H = 256;

const clamp = (v: number, a = 0, b = 255) => Math.max(a, Math.min(b, v));

function hexToRgb(hex: string) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToCss(r: number, g: number, b: number) {
  return `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`;
}

function shade(hex: string, amt: number) {
  const c = hexToRgb(hex);
  return rgbToCss(c.r + amt, c.g + amt, c.b + amt);
}

function lerpColor(a: string, b: string, t: number) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToCss(
    Math.round(A.r + (B.r - A.r) * t),
    Math.round(A.g + (B.g - A.g) * t),
    Math.round(A.b + (B.b - A.b) * t)
  );
}

function generatePalette(baseHex: string) {
  // produce 5 levels: highlight, base, mid, shadow, deep
  return {
    high: shade(baseHex, 30),
    base: baseHex,
    mid: shade(baseHex, -12),
    shadow: shade(baseHex, -35),
    deep: shade(baseHex, -60),
  };
}

function irisFromHair(hair: string) {
  let h = 0;
  for (let i = 0; i < hair.length; i++) h = (h * 31 + hair.charCodeAt(i)) >>> 0;
  const palette = ["#506b90", "#44825d", "#7c5a3b", "#6a549a", "#4a4f5a", "#956236"];
  return palette[h % palette.length];
}

// Simple helper primitives: draw in logical pixels (1x1). The offscreen context is 1 unit per pixel.
function makeDrawer(octx: CanvasRenderingContext2D, scale = 1) {
  octx.imageSmoothingEnabled = false;
  return {
    px: (x: number, y: number, c: string) => {
      octx.fillStyle = c;
      octx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
    },
    rect: (x: number, y: number, w: number, h: number, c: string) => {
      octx.fillStyle = c;
      octx.fillRect(Math.floor(x), Math.floor(y), Math.max(1, Math.floor(w)), Math.max(1, Math.floor(h)));
    },
    hline: (x: number, y: number, w: number, c: string) => {
      octx.fillStyle = c;
      octx.fillRect(Math.floor(x), Math.floor(y), Math.max(1, Math.floor(w)), 1);
    },
    vline: (x: number, y: number, h: number, c: string) => {
      octx.fillStyle = c;
      octx.fillRect(Math.floor(x), Math.floor(y), 1, Math.max(1, Math.floor(h)));
    },
    stampImage: (img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) => {
      if (img && img.complete && img.naturalWidth > 0) {
        octx.save();
        octx.imageSmoothingEnabled = false;
        octx.beginPath();
        octx.rect(dx, dy, dw, dh);
        octx.clip();
        octx.drawImage(img, dx, dy, dw, dh);
        octx.restore();
      }
    }
  };
}

export async function drawHDCharacter(ctx: CanvasRenderingContext2D, x: number, y: number, opts: CharacterOpts) {
  // Respect provided options but use sensible defaults
  const baseW = DEFAULT_W;
  const baseH = DEFAULT_H;

  const pele = opts.pele ?? '#f0c396';
  const cabelo = opts.cabelo ?? '#2b1f1a';
  const cor = opts.cor ?? '#6b8cff';
  const camisaImagem = opts.camisaImagem ?? '';
  const cabeloEstilo = opts.cabeloEstilo ?? 'curto';
  const isFem = (opts.sexo ?? 'masculino') === 'feminino';

  // Offscreen canvas in logical pixel units
  const off = document.createElement('canvas');
  off.width = baseW;
  off.height = baseH;
  const octx = off.getContext('2d');
  if (!octx) return;
  octx.clearRect(0, 0, off.width, off.height);
  octx.imageSmoothingEnabled = false;

  const D = makeDrawer(octx);

  // Define a logical center where the character will be drawn
  const cx = Math.floor(baseW / 2);
  const groundY = Math.floor(baseH * 0.85);

  // Palettes
  const bodyPal = generatePalette(pele);
  const hairPal = generatePalette(cabelo);
  const clothPal = generatePalette(cor);
  const iris = irisFromHair(cabelo);

  // Simple scale for features (in logical pixels) chosen to give density
  // The proportions are tuned for a full-body portrait in the canvas
  const headW = 32;
  const headH = 32;
  const torsoW = 48;
  const torsoH = 60;
  const legH = 60;
  const footH = 10;

  // Helpers for relative drawing
  const left = (dx: number) => cx + dx;
  const top = (dy: number) => groundY - (legH + torsoH + headH) + dy;

  // 0. Ground shadow (soft but pixelated)
  for (let i = -18; i <= 18; i++) D.px(cx + i, groundY + 1, 'rgba(0,0,0,0.35)');
  for (let i = -14; i <= 14; i += 2) D.px(cx + i, groundY + 2, 'rgba(0,0,0,0.18)');

  // 1. Legs & pants/shorts
  const legX = cx - 12;
  const rightLegX = cx + 6;
  // pants body color
  for (let lx = 0; lx < 6; lx++) {
    for (let ly = 0; ly < legH; ly++) {
      // left leg
      D.px(legX + lx, groundY - footH - ly, clothPal.base);
      // right leg
      D.px(rightLegX + lx, groundY - footH - ly, clothPal.base);
    }
  }
  // pant highlights and shadows (simple border)
  for (let ly = 0; ly < legH; ly++) {
    D.px(legX, groundY - footH - ly, clothPal.high);
    D.px(rightLegX + 5, groundY - footH - ly, clothPal.shadow);
  }

  // 2. Shoes
  for (let sx = 0; sx < 8; sx++) {
    for (let sy = 0; sy < 4; sy++) {
      D.px(legX - 2 + sx, groundY - footH + sy, shade('#333333', -10));
      D.px(rightLegX - 2 + sx, groundY - footH + sy, shade('#333333', -10));
    }
  }
  D.hline(legX - 2, groundY - 1, 12, '#121318');

  // 3. Torso / Shirt
  const torsoX = cx - Math.floor(torsoW / 2);
  const torsoTop = groundY - footH - legH - torsoH + 28; // slightly adjusted
  for (let tx = 0; tx < torsoW; tx++) {
    for (let ty = 0; ty < torsoH; ty++) {
      // simple rounded-ish silhouette: skip corners
      const skip = (tx < 2 && ty < 2) || (tx > torsoW - 3 && ty < 2);
      if (!skip) D.px(torsoX + tx, torsoTop + ty, clothPal.base);
    }
  }
  // Shirt details: chest highlight and hem
  D.hline(torsoX + 6, torsoTop + 6, torsoW - 12, clothPal.high);
  D.hline(torsoX + 4, torsoTop + torsoH - 6, torsoW - 8, clothPal.shadow);

  // If camisaImagem provided, try stamping it (we draw it centered in torso box)
  if (camisaImagem) {
    try {
      const img = new Image();
      img.src = camisaImagem;
      img.onload = () => {
        // draw scaled to torso region using nearest neighbor
        octx.imageSmoothingEnabled = false;
        octx.drawImage(img, torsoX, torsoTop + 6, torsoW, Math.max(24, torsoH - 20));
      };
    } catch (e) {
      // ignore if cannot load
    }
  }

  // 4. Arms and hands (with fingers separated as pixels)
  const armW = 7;
  const armTop = torsoTop + 8;
  // left arm
  for (let ax = 0; ax < armW; ax++) {
    for (let ay = 0; ay < 14; ay++) {
      D.px(torsoX - armW + ax, armTop + ay, clothPal.base);
    }
  }
  // left hand (fingers)
  D.px(torsoX - armW - 1, armTop + 14, bodyPal.base);
  D.px(torsoX - armW, armTop + 14, bodyPal.base);
  D.px(torsoX - armW + 1, armTop + 14, bodyPal.base);

  // right arm
  for (let ax = 0; ax < armW; ax++) {
    for (let ay = 0; ay < 14; ay++) {
      D.px(torsoX + torsoW - 1 + ax, armTop + ay, clothPal.base);
    }
  }
  // right hand
  D.px(torsoX + torsoW + armW - 1, armTop + 14, bodyPal.base);
  D.px(torsoX + torsoW + armW - 2, armTop + 14, bodyPal.base);

  // 5. Neck
  D.rect(cx - 3, torsoTop - 4, 6, 4, bodyPal.mid);

  // 6. Head base
  const headX = cx - Math.floor(headW / 2);
  const headY = torsoTop - headH;
  // head rectangle with a small rounded top
  for (let hx = 0; hx < headW; hx++) {
    for (let hy = 0; hy < headH; hy++) {
      // round corners to give natural face shape
      const rx = hx - headW / 2;
      const ry = hy - 4;
      const round = Math.sqrt((rx * rx) / ((headW / 2) ** 2) + (ry * ry) / ((headH / 1.6) ** 2));
      if (round < 1.05) D.px(headX + hx, headY + hy, bodyPal.base);
    }
  }
  // subtle head shading
  for (let i = 0; i < headW; i++) D.px(headX + i, headY, bodyPal.high);
  for (let i = 0; i < headW; i++) D.px(headX + i, headY + headH - 1, bodyPal.shadow);

  // 7. Hair (back volume + front fringe/highlight)
  const hairBackY = headY + 2;
  // back volume
  for (let hx = -4; hx <= headW + 2; hx++) {
    for (let hy = 0; hy < 10; hy++) {
      // only fill where it looks like hair should extend
      if (Math.abs(hx - headW / 2) < (headW / 2 + 2) - hy / 2) {
        D.px(headX + Math.floor(hx), hairBackY + hy, hairPal.base);
      }
    }
  }
  // hair highlights
  for (let i = 0; i < 6; i++) D.px(headX + 6 + i, hairBackY + 2 + i % 2, hairPal.high);

  // front fringe
  for (let fx = 6; fx < headW - 6; fx++) D.px(headX + fx, headY + 6, hairPal.base);
  // small stray strands
  D.px(headX + 4, headY + 8, hairPal.shadow);
  D.px(headX + headW - 5, headY + 8, hairPal.shadow);

  // 8. Face details: eyes, nose, mouth
  const eyeY = headY + 10;
  const leftEyeX = cx - 6;
  const rightEyeX = cx + 5;
  // whites
  D.rect(leftEyeX - 1, eyeY, 3, 2, '#ffffff');
  D.rect(rightEyeX - 1, eyeY, 3, 2, '#ffffff');
  // iris
  D.rect(leftEyeX, eyeY, 1, 2, iris);
  D.rect(rightEyeX, eyeY, 1, 2, iris);
  // pupils (small)
  D.px(leftEyeX, eyeY + 1, '#11141c');
  D.px(rightEyeX, eyeY + 1, '#11141c');
  // brows
  D.hline(leftEyeX - 1, eyeY - 2, 3, hairPal.shadow);
  D.hline(rightEyeX - 1, eyeY - 2, 3, hairPal.shadow);
  // nose (subtle)
  D.px(cx, eyeY + 3, bodyPal.mid);
  // mouth
  D.hline(cx - 1, eyeY + 6, 3, isFem ? '#d06874' : bodyPal.shadow);

  // 9. Minor facial features (cheeks)
  if (isFem) {
    D.px(cx - 4, eyeY + 4, '#f0b0b7');
    D.px(cx + 4, eyeY + 4, '#f0b0b7');
  }

  // 10. Accessories (placeholder - respects opts.uniform, capo, etc. could be expanded)
  // If uniform coleto exists, draw a vest-like rectangle on top
  if ((opts.uniforme as any)?.colete) {
    const ucol = (opts.uniforme as any).colete as string;
    D.rect(torsoX + 6, torsoTop + 6, torsoW - 12, torsoH - 20, ucol);
    D.hline(torsoX + 6, torsoTop + 6, torsoW - 12, shade(ucol, 18));
  }

  // DONE drawing logical pixels in offscreen canvas.
  // Composite to destination canvas with nearest-neighbor scaling.
  const scaleX = Math.max(1, Math.floor((ctx.canvas.width / baseW) || 1));
  const scaleY = Math.max(1, Math.floor((ctx.canvas.height / baseH) || 1));
  // We choose to draw at 1:1 logical pixels onto the destination, and let caller scale as needed.

  // Draw offscreen canvas onto ctx at requested (x,y) with imageSmoothing disabled.
  ctx.imageSmoothingEnabled = false;
  // The user expects x,y to be the center-bottom anchor similar to legacy renderer.
  const drawX = Math.floor(x - baseW / 2);
  const drawY = Math.floor(y - baseH / 2);
  ctx.drawImage(off, drawX, drawY, baseW, baseH);
}
