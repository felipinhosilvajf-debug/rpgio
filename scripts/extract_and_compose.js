/*
Script: extract_and_compose.js
- Usage (local):
  npm install canvas node-fetch@2 fs-extra
  node scripts/extract_and_compose.js <imagePathOrUrl> [outDir]

- What it does:
  1) Loads a spritesheet image (local file path or URL)
  2) Auto-detects a grid by scanning for non-transparent columns/rows and grouping contiguous spans
  3) Extracts each detected cell as a separate PNG in outDir/cells/
  4) Composes each cell onto a 256x512 canvas (centering & bottom-aligned) and writes to outDir/compose/

Notes:
- This is a best-effort auto-detection. If the sheet has variable spacing or overlapping art, manual slicing may be required.
- Run locally (this repo) in node. The script uses node-canvas which requires native build deps on your machine.
*/

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { createCanvas, loadImage } = require('canvas');
const mkdirp = require('fs-extra').mkdirp;

async function loadImg(src) {
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error('Failed to fetch ' + src + ' -> ' + res.status);
    const buf = await res.buffer();
    return await loadImage(buf);
  } else {
    return await loadImage(src);
  }
}

function columnProjection(imgData, w, h) {
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
function rowProjection(imgData, w, h) {
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

function spansFromProjection(proj) {
  const spans = [];
  let inSpan = false;
  let start = 0;
  for (let i = 0; i < proj.length; i++) {
    if (!inSpan && proj[i] > 0) { inSpan = true; start = i; }
    if (inSpan && proj[i] === 0) { inSpan = false; spans.push([start, i - 1]); }
  }
  if (inSpan) spans.push([start, proj.length - 1]);
  return spans;
}

async function extractCells(img, outDir) {
  const w = img.width, h = img.height;
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0,0,w,h);
  const cols = columnProjection(imgData, w, h);
  const rows = rowProjection(imgData, w, h);
  const colSpans = spansFromProjection(cols);
  const rowSpans = spansFromProjection(rows);

  if (colSpans.length === 0 || rowSpans.length === 0) {
    // fallback: treat whole image as single cell
    await mkdirp(path.join(outDir, 'cells'));
    const out = createCanvas(w,h);
    const octx = out.getContext('2d');
    octx.drawImage(img,0,0);
    const outPath = path.join(outDir, 'cells', 'cell_0_0.png');
    fs.writeFileSync(outPath, out.toBuffer('image/png'));
    return [{sx:0,sy:0,sw:w,sh:h}];
  }

  // Normalize spans: sometimes small noise creates many spans; merge spans that are very close
  function mergeClose(spans, gapTolerance=4) {
    if (!spans.length) return spans;
    const out = [];
    let [s,e] = spans[0];
    for (let i=1;i<spans.length;i++) {
      const [ns,ne] = spans[i];
      if (ns - e <= gapTolerance) {
        e = ne;
      } else { out.push([s,e]); s=ns; e=ne; }
    }
    out.push([s,e]);
    return out;
  }
  const mcol = mergeClose(colSpans, 6);
  const mrow = mergeClose(rowSpans, 6);

  await mkdirp(path.join(outDir, 'cells'));

  const cells = [];
  let idx = 0;
  for (let ry = 0; ry < mrow.length; ry++) {
    for (let cx = 0; cx < mcol.length; cx++) {
      const [sx,ex] = mcol[cx]; const [sy,ey] = mrow[ry];
      const sw = ex - sx + 1; const sh = ey - sy + 1;
      const out = createCanvas(sw, sh);
      const octx = out.getContext('2d');
      octx.imageSmoothingEnabled = false;
      octx.clearRect(0,0,sw,sh);
      octx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      const outPath = path.join(outDir, 'cells', `cell_${ry}_${cx}.png`);
      fs.writeFileSync(outPath, out.toBuffer('image/png'));
      cells.push({sx,sy,sw,sh, path: outPath});
      idx++;
    }
  }
  return cells;
}

async function composeCellToHD(cellPath, outPath, baseW=256, baseH=512) {
  const img = await loadImage(cellPath);
  const cW = img.width, cH = img.height;
  const canvas = createCanvas(baseW, baseH);
  const ctx = canvas.getContext('2d');
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
  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
}

async function run() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) { console.error('Usage: node scripts/extract_and_compose.js <imagePathOrUrl> [outDir]'); process.exit(2); }
  const src = argv[0];
  const outDir = argv[1] || 'hd-refactor-output';
  await mkdirp(outDir);
  console.log('Loading image', src);
  const img = await loadImg(src);
  console.log('Image size', img.width, 'x', img.height);
  console.log('Extracting cells...');
  const cells = await extractCells(img, outDir);
  console.log('Found', cells.length, 'cells');
  await mkdirp(path.join(outDir,'compose'));
  for (let i=0;i<cells.length;i++) {
    const cell = cells[i];
    const cellPath = cell.path || path.join(outDir,'cells',`cell_${i}.png`);
    const outPath = path.join(outDir, 'compose', 'comp_' + i + '.png');
    console.log('Composing', cellPath, '->', outPath);
    await composeCellToHD(cellPath, outPath, 256, 512);
  }
  console.log('Done. Outputs in', outDir);
}

if (require.main === module) run().catch(err=>{ console.error(err); process.exit(1); });
