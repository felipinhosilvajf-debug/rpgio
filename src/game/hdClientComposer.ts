// Client-side HD composer utilities (runs in browser)
// Extracts cells from a spritesheet image (Image or File) and composes 256x512 canvases.

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); rej(new Error('failed to load')); };
    img.src = url;
  });
}

export async function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = (e) => rej(new Error('failed to load ' + url));
    img.src = url;
  });
}

function columnProjection(imgData: ImageData, w: number, h: number) {
  const cols = new Array(w).fill(0);
  const data = imgData.data;
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = 0; y < h; y++) {
      const idx = (y * w + x) * 4 + 3; // alpha
      if (data[idx] > 8) sum++;
    }
    cols[x] = sum;
  }
  return cols;
}
function rowProjection(imgData: ImageData, w: number, h: number) {
  const rows = new Array(h).fill(0);
  const data = imgData.data;
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4 + 3;
      if (data[idx] > 8) sum++;
    }
    rows[y] = sum;
  }
  return rows;
}

function spansFromProjection(proj: number[]) {
  const spans: [number, number][] = [];
  let inSpan = false;
  let start = 0;
  for (let i = 0; i < proj.length; i++) {
    if (!inSpan && proj[i] > 0) { inSpan = true; start = i; }
    if (inSpan && proj[i] === 0) { inSpan = false; spans.push([start, i - 1]); }
  }
  if (inSpan) spans.push([start, proj.length - 1]);
  return spans;
}

function mergeClose(spans: [number, number][], gapTolerance = 6) {
  if (!spans.length) return spans;
  const out: [number, number][] = [];
  let [s, e] = spans[0];
  for (let i = 1; i < spans.length; i++) {
    const [ns, ne] = spans[i];
    if (ns - e <= gapTolerance) { e = ne; } else { out.push([s, e]); s = ns; e = ne; }
  }
  out.push([s, e]);
  return out;
}

export function extractCellsFromImage(img: HTMLImageElement) {
  const w = img.width, h = img.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const cols = columnProjection(imgData, w, h);
  const rows = rowProjection(imgData, w, h);
  let colSpans = spansFromProjection(cols);
  let rowSpans = spansFromProjection(rows);
  colSpans = mergeClose(colSpans, 6);
  rowSpans = mergeClose(rowSpans, 6);
  if (colSpans.length === 0 || rowSpans.length === 0) {
    // fallback: whole image
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const octx = out.getContext('2d')!; octx.drawImage(img, 0, 0);
    return [{ canvas: out, sx: 0, sy: 0, sw: w, sh: h }];
  }
  const cells: { canvas: HTMLCanvasElement, sx: number, sy: number, sw: number, sh: number }[] = [];
  for (let ry = 0; ry < rowSpans.length; ry++) {
    for (let cx = 0; cx < colSpans.length; cx++) {
      const [sx, ex] = colSpans[cx]; const [sy, ey] = rowSpans[ry];
      const sw = ex - sx + 1; const sh = ey - sy + 1;
      const out = document.createElement('canvas'); out.width = sw; out.height = sh;
      const octx = out.getContext('2d')!; octx.imageSmoothingEnabled = false; octx.clearRect(0,0,sw,sh);
      octx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      cells.push({ canvas: out, sx, sy, sw, sh });
    }
  }
  return cells;
}

export function composeCellToHDCanvas(cellCanvas: HTMLCanvasElement, baseW = 256, baseH = 512) {
  const img = cellCanvas;
  const cW = img.width, cH = img.height;
  const canvas = document.createElement('canvas');
  canvas.width = baseW; canvas.height = baseH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0,0,baseW,baseH);
  const maxW = Math.floor(baseW * 0.6);
  const maxH = Math.floor(baseH * 0.9);
  const scale = Math.min(maxW / cW, maxH / cH);
  const dw = Math.max(1, Math.floor(cW * scale));
  const dh = Math.max(1, Math.floor(cH * scale));
  const drawX = Math.floor((baseW - dw) / 2);
  const bottomY = Math.floor(baseH * 0.86);
  const drawY = Math.floor(bottomY - dh);
  ctx.drawImage(img, 0, 0, cW, cH, drawX, drawY, dw, dh);
  return canvas;
}

export async function batchComposeFromFileOrUrl(source: File | string) {
  let img: HTMLImageElement;
  if (typeof source === 'string') img = await loadImageFromUrl(source);
  else img = await loadImageFromFile(source);
  const cells = extractCellsFromImage(img);
  const composed = cells.map(c => composeCellToHDCanvas(c.canvas));
  return composed; // array of canvases
}
