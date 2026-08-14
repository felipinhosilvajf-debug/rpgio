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

// Upgraded base resolution for better detail
const DEFAULT_W = 256;
const DEFAULT_H = 512;

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
  // produce more levels for richer shading
  return {
    high: shade(baseHex, 40),
    base: baseHex,
    mid: shade(baseHex, -10),
    shadow: shade(baseHex, -30),
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
function makeDrawer(octx: CanvasRenderingContext2D) {
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
  const groundY = Math.floor(baseH * 0.86);

  // Palettes
  const bodyPal = generatePalette(pele);
  const hairPal = generatePalette(cabelo);
  const clothPal = generatePalette(cor);
  const iris = irisFromHair(cabelo);

  // Proportions tuned for 256x512
  const headW = 64;
  const headH = 64;
  const torsoW = 96;
  const torsoH = 120;
  const legH = 120;
  const footH = 20;

  // Helpers for relative drawing
  const torsoX = cx - Math.floor(torsoW / 2);
  const torsoTop = groundY - footH - legH - torsoH + 44;

  // 0. Ground shadow (pixelated ellipse)
  for (let i = -40; i <= 40; i++) D.px(cx + i, groundY + 2, 'rgba(0,0,0,0.30)');
  for (let i = -32; i <= 32; i += 2) D.px(cx + i, groundY + 6, 'rgba(0,0,0,0.16)');

  // 1. Legs & pants/shorts
  const legX = cx - 24;
  const rightLegX = cx + 12;
  const legW = 12;
  for (let lx = 0; lx < legW; lx++) {
    for (let ly = 0; ly < legH; ly++) {
      D.px(legX + lx, groundY - footH - ly, clothPal.base);
      D.px(rightLegX + lx, groundY - footH - ly, clothPal.base);
    }
  }
  // pant shading
  for (let ly = 0; ly < legH; ly++) {
    D.px(legX, groundY - footH - ly, clothPal.high);
    D.px(rightLegX + legW - 1, groundY - footH - ly, clothPal.shadow);
  }

  // 2. Shoes
  for (let sx = 0; sx < 16; sx++) {
    for (let sy = 0; sy < 8; sy++) {
      D.px(legX - 4 + sx, groundY - footH + sy, shade('#333333', -12));
      D.px(rightLegX - 4 + sx, groundY - footH + sy, shade('#333333', -12));
    }
  }
  D.hline(legX - 4, groundY - 2, 40, '#0f1113');

  // 3. Torso / Shirt
  for (let tx = 0; tx < torsoW; tx++) {
    for (let ty = 0; ty < torsoH; ty++) {
      const skip = (tx < 4 && ty < 4) || (tx > torsoW - 5 && ty < 4);
      if (!skip) D.px(torsoX + tx, torsoTop + ty, clothPal.base);
    }
  }
  D.hline(torsoX + 10, torsoTop + 12, torsoW - 20, clothPal.high);
  D.hline(torsoX + 8, torsoTop + torsoH - 12, torsoW - 16, clothPal.shadow);

  // stamp camisaImagem if present (async load)
  if (camisaImagem) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = camisaImagem;
      img.onload = () => {
        octx.imageSmoothingEnabled = false;
        octx.drawImage(img, torsoX + 6, torsoTop + 18, torsoW - 12, Math.max(48, torsoH - 48));
      };
    } catch (e) { /* ignore */ }
  }

  // 4. Arms and hands
  const armW = 14;
  const armTop = torsoTop + 20;
  // left arm
  for (let ax = 0; ax < armW; ax++) {
    for (let ay = 0; ay < 32; ay++) D.px(torsoX - armW + ax, armTop + ay, clothPal.base);
  }
  // left hand (fingers simplified but legible)
  for (let fx = 0; fx < 6; fx++) D.px(torsoX - armW - 2 + fx, armTop + 34, bodyPal.base);

  // right arm
  for (let ax = 0; ax < armW; ax++) {
    for (let ay = 0; ay < 32; ay++) D.px(torsoX + torsoW - 1 + ax, armTop + ay, clothPal.base);
  }
  for (let fx = 0; fx < 6; fx++) D.px(torsoX + torsoW + armW - 2 - fx, armTop + 34, bodyPal.base);

  // 5. Neck
  D.rect(cx - 6, torsoTop - 8, 12, 6, bodyPal.mid);

  // 6. Head base
  const headX = cx - Math.floor(headW / 2);
  const headY = torsoTop - headH;
  for (let hx = 0; hx < headW; hx++) {
    for (let hy = 0; hy < headH; hy++) {
      const rx = hx - headW / 2;
      const ry = hy - 6;
      const round = Math.sqrt((rx * rx) / ((headW / 2) ** 2) + (ry * ry) / ((headH / 1.6) ** 2));
      if (round < 1.05) D.px(headX + hx, headY + hy, bodyPal.base);
    }
  }
  for (let i = 0; i < headW; i++) D.px(headX + i, headY, bodyPal.high);
  for (let i = 0; i < headW; i++) D.px(headX + i, headY + headH - 1, bodyPal.shadow);

  // 7. Hair (back volume + front fringe/highlight) — more organic fill
  const hairBackY = headY + 6;
  for (let hx = -8; hx <= headW + 8; hx++) {
    for (let hy = 0; hy < 20; hy++) {
      if (Math.abs(hx - headW / 2) < (headW / 2 + 8) - hy / 1.6) {
        D.px(headX + Math.floor(hx), hairBackY + hy, hairPal.base);
      }
    }
  }
  // highlights
  for (let i = 0; i < 12; i++) D.px(headX + 10 + i, hairBackY + 4 + (i % 3 === 0 ? 0 : 1), hairPal.high);
  // fringe
  for (let fx = 10; fx < headW - 10; fx += 2) D.px(headX + fx, headY + 18, hairPal.base);

  // 8. Face details: eyes, nose, mouth — larger, more expressive
  const eyeY = headY + 22;
  const leftEyeX = cx - 12;
  const rightEyeX = cx + 9;
  // white area
  for (let ex = 0; ex < 5; ex++) D.px(leftEyeX - 2 + ex, eyeY, '#ffffff');
  for (let ex = 0; ex < 5; ex++) D.px(rightEyeX - 2 + ex, eyeY, '#ffffff');
  // iris (2x2)
  D.rect(leftEyeX, eyeY, 2, 2, iris);
  D.rect(rightEyeX, eyeY, 2, 2, iris);
  // pupils
  D.px(leftEyeX + 1, eyeY + 1, '#0c0f12');
  D.px(rightEyeX + 1, eyeY + 1, '#0c0f12');
  // brows
  D.hline(leftEyeX - 2, eyeY - 4, 7, hairPal.shadow);
  D.hline(rightEyeX - 2, eyeY - 4, 7, hairPal.shadow);
  // nose shading
  D.px(cx, eyeY + 8, bodyPal.mid);
  // mouth
  D.hline(cx - 4, eyeY + 14, 8, isFem ? '#d06874' : bodyPal.shadow);

  // 9. Cheeks for gender nuance
  if (isFem) {
    D.px(cx - 10, eyeY + 6, '#f0b0b7');
    D.px(cx + 10, eyeY + 6, '#f0b0b7');
  }

  // 10. Accessories: simple vest/colete
  if ((opts.uniforme as any)?.colete) {
    const ucol = (opts.uniforme as any).colete as string;
    D.rect(torsoX + 12, torsoTop + 12, torsoW - 24, torsoH - 40, ucol);
    D.hline(torsoX + 12, torsoTop + 12, torsoW - 24, shade(ucol, 12));
  }

  // Draw completed offscreen canvas to destination with nearest neighbor
  ctx.imageSmoothingEnabled = false;
  const drawX = Math.floor(x - baseW / 2);
  const drawY = Math.floor(y - baseH / 2);
  ctx.drawImage(off, drawX, drawY, baseW, baseH);
}
