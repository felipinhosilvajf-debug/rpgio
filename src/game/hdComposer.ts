// hdComposer: experimental tools to extract avatars from a reference spritesheet and compose
// them into a single HD canvas (256x512) for testing the composition pipeline.

export async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = (e) => rej(new Error('Failed to load image: ' + url));
    img.src = url;
  });
}

export async function cropSpriteFromSheet(sheetUrl: string, cellW: number, cellH: number, cols: number, index: number) {
  const img = await loadImage(sheetUrl);
  const row = Math.floor(index / cols);
  const col = index % cols;
  const sx = col * cellW;
  const sy = row * cellH;
  const c = document.createElement('canvas');
  c.width = cellW; c.height = cellH;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.drawImage(img, sx, sy, cellW, cellH, 0, 0, cellW, cellH);
  return c;
}

export async function composeFromCrop(cropCanvas: HTMLCanvasElement, opts?: { baseW?: number; baseH?: number }) {
  const baseW = opts?.baseW ?? 256;
  const baseH = opts?.baseH ?? 512;
  const out = document.createElement('canvas');
  out.width = baseW; out.height = baseH;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Could not create output context');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, baseW, baseH);

  // background transparent by default

  // Compute scale to fit crop into torso+head area while leaving margin
  const maxW = Math.floor(baseW * 0.6);
  const maxH = Math.floor(baseH * 0.9);
  const scale = Math.min(maxW / cropCanvas.width, maxH / cropCanvas.height);
  const dw = Math.max(1, Math.floor(cropCanvas.width * scale));
  const dh = Math.max(1, Math.floor(cropCanvas.height * scale));

  // Draw centered horizontally, with bottom aligned at 85% of baseH
  const drawX = Math.floor((baseW - dw) / 2);
  const bottomY = Math.floor(baseH * 0.86);
  const drawY = Math.floor(bottomY - dh);

  ctx.drawImage(cropCanvas, 0, 0, cropCanvas.width, cropCanvas.height, drawX, drawY, dw, dh);
  return out;
}

export async function composeFromSheet(sheetUrl: string, cols: number, rows: number, cellW: number, cellH: number, index: number, opts?: { baseW?: number; baseH?: number }) {
  const crop = await cropSpriteFromSheet(sheetUrl, cellW, cellH, cols, index);
  return await composeFromCrop(crop, opts);
}

// helper to batch-generate multiple indices; returns array of canvases
export async function batchComposeFromSheet(sheetUrl: string, cols: number, rows: number, cellW: number, cellH: number, indices: number[], opts?: { baseW?: number; baseH?: number }) {
  const promises = indices.map(i => composeFromSheet(sheetUrl, cols, rows, cellW, cellH, i, opts));
  return await Promise.all(promises);
}
