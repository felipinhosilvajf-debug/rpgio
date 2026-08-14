import { G, O, OBJ_DEFS, GROUND_DEFS, TILE, isSolid, type SceneData } from "./mapData";
import type { BottomStyle, CustomObject, Dir, HairStyle, InteractTarget, ShirtArtTransform, ShirtStyle, ShoeStyle, Sexo, SignMap, Uniform } from "./types";
import { getUniform, tagPatente } from "./jobs";
import { CUSTOM_BASE, decodeSign } from "./types";
import { drawCharacter } from "./characterRenderer";

export interface RemotePlayer {
  uid: string;
  nome: string;
  x: number;
  y: number;
  dir: Dir;
  moving: boolean;
  cor: string;
  cabelo: string;
  pele?: string;
  sexo?: Sexo;
  patente?: string;
  emprego?: string;
  uniforme?: Uniform | null;
  armedItem?: string | null;
  cabeloEstilo?: HairStyle;
  camisaModelo?: ShirtStyle;
  inferiorModelo?: BottomStyle;
  calcaCor?: string;
  sapatoModelo?: ShoeStyle;
  sapatoCor?: string;
  camisaImagem?: string;
  camisaTransform?: ShirtArtTransform;
  chat?: { text: string; ts: number } | null;
}

export interface EngineCallbacks {
  onTarget?: (t: InteractTarget | null) => void;
  onInteract?: (t: InteractTarget | null) => void;
  onMove?: (x: number, y: number, dir: Dir, moving: boolean) => void;
  onEditorPaint?: (x: number, y: number, erase: boolean) => void;
}

const hash = (x: number, y: number) => {
  let n = x * 374761393 + y * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
};

const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
};

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cb: EngineCallbacks;
  scene: SceneData;
  zoom = 3;
  dpr = 1;
  cam = { x: 0, y: 0 };
  player = { x: 0, y: 0, dir: "down" as Dir, moving: false, anim: 0, cor: "#3f7ad6", cabelo: "#3a2418", cabeloEstilo: "curto" as HairStyle, pele: "#f0c396", sexo: "masculino" as Sexo, camisaModelo: "camiseta" as ShirtStyle, inferiorModelo: "calca" as BottomStyle, calcaCor: "#2f3b57", sapatoModelo: "tenis" as ShoeStyle, sapatoCor: "#1a1f2c", camisaImagem: "", camisaTransform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 } as ShirtArtTransform, nome: "Você", patente: "Civil", emprego: "desempregado", uniforme: null as Uniform | null, armedItem: null as string | null };
  // shirtImages mantido para compat (characterRenderer tem seu próprio cache)
  remote: RemotePlayer[] = [];
  keys = new Set<string>();
  inputLocked = false;
  editor = { on: false, w: 1, h: 1, hover: { x: -1, y: -1 }, painting: false, singleClick: false };
  target: InteractTarget | null = null;
  userZoom = 1;
  private zoomMin = 0.55;
  private zoomMax = 2.4;
  customMap = new Map<number, { img: HTMLImageElement; w: number; h: number; name: string }>();
  signs: SignMap = {};
  private projectiles: { x: number; y: number; vx: number; vy: number; from: string }[] = [];
  private onDamage?: (targetUid: string, amount: number) => void;
  armedFlash = 0;
  private raf = 0;
  private last = 0;
  private time = 0;
  private moveAccum = 0;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, scene: SceneData, cb: EngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.scene = scene;
    this.cb = cb;
    this.player.x = scene.spawn.x;
    this.player.y = scene.spawn.y;
    this.bind();
    this.resize();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("blur", this.onBlur);
    this.canvas.removeEventListener("wheel", this.onWheel);
  }

  private bind() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("resize", this.resize);
    window.addEventListener("blur", this.onBlur);
    this.canvas.addEventListener("mousemove", this.onMouseMove);
    this.canvas.addEventListener("mousedown", this.onMouseDown);
    this.canvas.addEventListener("mouseup", this.onMouseUp);
    this.canvas.addEventListener("mouseleave", this.onMouseUp);
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
  }

  private onBlur = () => this.keys.clear();

  private onWheel = (e: WheelEvent) => { e.preventDefault(); this.setUserZoom(this.userZoom + (e.deltaY > 0 ? -0.1 : 0.1)); };
  setUserZoom(z: number) { this.userZoom = Math.max(this.zoomMin, Math.min(this.zoomMax, z)); this.resize(); }
  zoomIn() { this.setUserZoom(this.userZoom + 0.15); }
  zoomOut() { this.setUserZoom(this.userZoom - 0.15); }

  resize = () => {
    const cw = this.canvas.clientWidth || window.innerWidth;
    const ch = this.canvas.clientHeight || window.innerHeight;
    this.dpr = Math.min(2, Math.max(1, Math.floor(window.devicePixelRatio || 1)));
    this.canvas.width = Math.floor(cw * this.dpr);
    this.canvas.height = Math.floor(ch * this.dpr);
    const target = this.scene.w < 30 ? 22 : 30;
    const base = Math.max(2, Math.min(5, Math.round(cw / (target * TILE))));
    this.zoom = Math.max(1, base * this.userZoom);
  };

  setScene(scene: SceneData, spawn?: { x: number; y: number }) {
    const keepPos = this.scene.id === scene.id;
    this.scene = scene;
    if (!keepPos) { this.player.x = spawn?.x ?? scene.spawn.x; this.player.y = spawn?.y ?? scene.spawn.y; }
    else if (spawn) { this.player.x = spawn.x; this.player.y = spawn.y; }
    this.resize();
  }

  setAppearance(a: Partial<typeof this.player>) { Object.assign(this.player, a); }
  setRemote(list: RemotePlayer[]) { this.remote = list; }
  setCustomObjects(list: CustomObject[]) { this.customMap = new Map(); for (const c of list) { const img = new Image(); img.src = c.image; this.customMap.set(c.objId, { img, w: c.w, h: c.h, name: c.nome }); } }
  setSigns(signs: SignMap) { this.signs = signs; }
  setDamageHandler(fn: (targetUid: string, amount: number) => void) { this.onDamage = fn; }
  setEditor(on: boolean, w = 1, h = 1, singleClick = false) { this.editor.on = on; this.editor.w = w; this.editor.h = h; this.editor.singleClick = singleClick; }
  teleport(x: number, y: number) { this.player.x = x; this.player.y = y; }

  fire() {
    if (this.player.armedItem !== "arma_fogo" && this.player.armedItem !== "municao") return false;
    const speed = 9; let vx = 0; let vy = 0;
    if (this.player.dir === "left") vx = -speed; else if (this.player.dir === "right") vx = speed;
    else if (this.player.dir === "up") vy = -speed; else vy = speed;
    this.projectiles.push({ x: this.player.x, y: this.player.y - 8, vx, vy, from: this.player.dir });
    return true;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement | null;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d", "e"].includes(k)) e.preventDefault();
    if (this.inputLocked) return;
    if (k === "e") { this.cb.onInteract?.(this.target); return; }
    if (k === " " || k === "f") { if (this.fire()) this.armedFlash = 1; return; }
    this.keys.add(k);
  };
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());

  private cellFromEvent(e: MouseEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: Math.floor(((e.clientX - r.left) / this.zoom + this.cam.x) / TILE), y: Math.floor(((e.clientY - r.top) / this.zoom + this.cam.y) / TILE) };
  }
  private onMouseMove = (e: MouseEvent) => {
    if (!this.editor.on) return;
    const c = this.cellFromEvent(e); const changed = c.x !== this.editor.hover.x || c.y !== this.editor.hover.y;
    this.editor.hover = c;
    if (this.editor.painting && !this.editor.singleClick && changed) this.cb.onEditorPaint?.(c.x, c.y, e.buttons === 2 || e.shiftKey);
  };
  private onMouseDown = (e: MouseEvent) => { if (!this.editor.on) return; e.preventDefault(); this.editor.painting = true; const c = this.cellFromEvent(e); this.cb.onEditorPaint?.(c.x, c.y, e.button === 2 || e.shiftKey); };
  private onMouseUp = () => { this.editor.painting = false; };

  private solidAt(px: number, py: number) {
    const tx = Math.floor(px / TILE); const ty = Math.floor(py / TILE);
    if (ty < 0 || tx < 0 || ty >= this.scene.h || tx >= this.scene.w) return true;
    return isSolid(this.scene.ground[ty][tx], this.scene.objects[ty][tx]);
  }
  private canStand(x: number, y: number) {
    const hw = 4.5; const top = y - 6; const bot = y + 1.5;
    return !(this.solidAt(x - hw, top) || this.solidAt(x + hw, top) || this.solidAt(x - hw, bot) || this.solidAt(x + hw, bot));
  }

  private updateProjectiles(dt: number) {
    const moved = (dt / 16.667) * 2.6;
    const still: typeof this.projectiles = [];
    for (const p of this.projectiles) {
      p.x += p.vx * moved; p.y += p.vy * moved;
      const tx = Math.floor(p.x / TILE); const ty = Math.floor(p.y / TILE);
      if (ty < 0 || tx < 0 || ty >= this.scene.h || tx >= this.scene.w || isSolid(this.scene.ground[ty]?.[tx], this.scene.objects[ty]?.[tx])) continue;
      let hit = false;
      for (const other of this.remote) {
        if (other.uid === p.from) continue;
        if (Math.abs(p.x - other.x) < 10 && Math.abs(p.y - other.y) < 10) { this.onDamage?.(other.uid, 15); hit = true; break; }
      }
      if (!hit) still.push(p);
    }
    this.projectiles = still;
  }

  private drawProjectiles() {
    for (const p of this.projectiles) {
      this.ctx.fillStyle = "#ffd65a"; this.ctx.fillRect(p.x - 1, p.y - 1, 3, 3);
      this.ctx.fillStyle = "#fff4c0"; this.ctx.fillRect(p.x, p.y, 2, 2);
    }
  }

  private updateTarget() {
    const px = this.player.x; const py = this.player.y;
    const ctx = Math.floor(px / TILE); const cty = Math.floor(py / TILE);
    let best: InteractTarget | null = null; let bestD = Infinity;
    for (let y = cty - 2; y <= cty + 2; y++) {
      for (let x = ctx - 2; x <= ctx + 2; x++) {
        if (y < 0 || x < 0 || y >= this.scene.h || x >= this.scene.w) continue;
        const def = OBJ_DEFS[this.scene.objects[y][x]];
        if (!def?.interact) continue;
        const d = Math.hypot(x * TILE + 8 - px, y * TILE + 10 - py);
        if (d < bestD && d < TILE * 1.9) { bestD = d; best = { kind: def.interact, label: def.label ?? def.nome, x, y, meta: `${x}_${y}` }; }
      }
    }
    const changed = best?.meta !== this.target?.meta || best?.kind !== this.target?.kind;
    this.target = best; if (changed) this.cb.onTarget?.(best);
  }

  private loop = (now: number) => {
    if (this.destroyed) return;
    const dt = Math.min(50, now - this.last); this.last = now; this.time += dt;
    this.update(dt); this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const step = (dt / 16.667) * 1.45;
    let dx = 0; let dy = 0;
    if (!this.inputLocked) {
      if (this.keys.has("arrowleft") || this.keys.has("a")) dx -= 1;
      if (this.keys.has("arrowright") || this.keys.has("d")) dx += 1;
      if (this.keys.has("arrowup") || this.keys.has("w")) dy -= 1;
      if (this.keys.has("arrowdown") || this.keys.has("s")) dy += 1;
    }
    const moving = dx !== 0 || dy !== 0;
    if (moving) {
      const len = Math.hypot(dx, dy) || 1;
      const nx = this.player.x + (dx / len) * step; const ny = this.player.y + (dy / len) * step;
      if (this.canStand(nx, this.player.y)) this.player.x = nx;
      if (this.canStand(this.player.x, ny)) this.player.y = ny;
      if (Math.abs(dx) > Math.abs(dy)) this.player.dir = dx > 0 ? "right" : "left";
      else this.player.dir = dy > 0 ? "down" : "up";
      this.player.anim += dt * 0.012;
    } else { this.player.anim = 0; }
    this.player.moving = moving;
    this.player.x = Math.max(6, Math.min(this.scene.w * TILE - 6, this.player.x));
    this.player.y = Math.max(10, Math.min(this.scene.h * TILE - 4, this.player.y));
    if (this.armedFlash > 0) this.armedFlash = Math.max(0, this.armedFlash - dt * 0.01);
    this.updateProjectiles(dt); this.updateTarget();
    this.moveAccum += dt;
    if (this.moveAccum > 120) { this.moveAccum = 0; this.cb.onMove?.(this.player.x, this.player.y, this.player.dir, moving); }
    const viewW = this.canvas.width / this.dpr / this.zoom; const viewH = this.canvas.height / this.dpr / this.zoom;
    const mapW = this.scene.w * TILE; const mapH = this.scene.h * TILE;
    let cx = this.player.x - viewW / 2; let cy = this.player.y - viewH / 2;
    cx = mapW <= viewW ? (mapW - viewW) / 2 : Math.max(0, Math.min(mapW - viewW, cx));
    cy = mapH <= viewH ? (mapH - viewH) / 2 : Math.max(0, Math.min(mapH - viewH, cy));
    this.cam.x = Math.round(cx * this.zoom) / this.zoom; this.cam.y = Math.round(cy * this.zoom) / this.zoom;
  }

  private render() {
    const { ctx } = this; const s = this.zoom * this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = this.scene.sky; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(s, 0, 0, s, -this.cam.x * s, -this.cam.y * s);
    const viewW = this.canvas.width / this.dpr / this.zoom; const viewH = this.canvas.height / this.dpr / this.zoom;
    const x0 = Math.max(0, Math.floor(this.cam.x / TILE) - 1); const y0 = Math.max(0, Math.floor(this.cam.y / TILE) - 1);
    const x1 = Math.min(this.scene.w - 1, Math.ceil((this.cam.x + viewW) / TILE)); const y1 = Math.min(this.scene.h - 1, Math.ceil((this.cam.y + viewH) / TILE) + 2);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.drawGround(x, y);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) { const id = this.scene.objects[y][x]; if (id) this.drawObject(id, x, y); }
      for (const p of this.remote) {
        if (Math.floor(p.y / TILE) === y) this.drawChar(p.x, p.y, p.dir, p.moving ? this.time * 0.012 : 0, p.cor, p.cabelo, false, p.pele, p.sexo, p.emprego, p.uniforme, p.armedItem, p.cabeloEstilo, p.camisaModelo, p.inferiorModelo, p.calcaCor, p.sapatoModelo, p.sapatoCor, p.camisaImagem, p.camisaTransform);
      }
      if (Math.floor(this.player.y / TILE) === y)
        this.drawChar(this.player.x, this.player.y, this.player.dir, this.player.anim, this.player.cor, this.player.cabelo, true, this.player.pele, this.player.sexo, this.player.emprego, this.player.uniforme, this.player.armedItem, this.player.cabeloEstilo, this.player.camisaModelo, this.player.inferiorModelo, this.player.calcaCor, this.player.sapatoModelo, this.player.sapatoCor, this.player.camisaImagem, this.player.camisaTransform);
    }
    if (this.target) this.drawTargetMarker(this.target.x, this.target.y);
    this.drawProjectiles();
    if (this.editor.on) this.drawEditorOverlay(x0, y0, x1, y1);
    this.drawSigns(x0, y0, x1, y1);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const p of this.remote) this.drawTag(p.x, p.y, p.nome, p.patente ? tagPatente(p.emprego ?? "", p.patente) : p.patente, p.chat, false);
    this.drawTag(this.player.x, this.player.y, this.player.nome, this.player.patente ? tagPatente(this.player.emprego, this.player.patente) : this.player.patente, null, true);
  }

  private w2s(x: number, y: number) { return { x: (x - this.cam.x) * this.zoom, y: (y - this.cam.y) * this.zoom }; }
  private drawTag(wx: number, wy: number, nome: string, patente?: string, chat?: { text: string; ts: number } | null, self = false) {
    const { ctx } = this; const p = this.w2s(wx, wy - 26);
    ctx.textAlign = "center"; ctx.font = "700 11px Rubik, sans-serif";
    const label = nome.length > 14 ? nome.slice(0, 13) + "…" : nome;
    const wmeasure = ctx.measureText(label).width + 12;
    ctx.fillStyle = "rgba(8,12,24,0.78)"; ctx.fillRect(p.x - wmeasure / 2, p.y - 14, wmeasure, 16);
    ctx.fillStyle = self ? "#7ee0ff" : "#e7ecf7"; ctx.fillText(label, p.x, p.y - 2);
    if (patente && patente !== "Civil") {
      ctx.font = "700 9px Rubik, sans-serif"; const pw = ctx.measureText(patente).width + 10;
      ctx.fillStyle = "rgba(93,122,69,0.92)"; ctx.fillRect(p.x - pw / 2, p.y - 28, pw, 13);
      ctx.fillStyle = "#eaf5dc"; ctx.fillText(patente, p.x, p.y - 18);
    }
    if (chat && Date.now() - chat.ts < 7000) {
      ctx.font = "500 12px Rubik, sans-serif";
      const t = chat.text.length > 46 ? chat.text.slice(0, 45) + "…" : chat.text;
      const bw = ctx.measureText(t).width + 18; const by = p.y - (patente && patente !== "Civil" ? 52 : 38);
      ctx.fillStyle = "rgba(250,250,255,0.96)"; ctx.fillRect(p.x - bw / 2, by, bw, 22);
      ctx.fillStyle = "rgba(250,250,255,0.96)"; ctx.fillRect(p.x - 4, by + 22, 8, 5);
      ctx.fillStyle = "#16203a"; ctx.fillText(t, p.x, by + 15);
    }
  }

  private px(x: number, y: number, w: number, h: number, c: string) { this.ctx.fillStyle = c; this.ctx.fillRect(x, y, w, h); }

  private drawGround(tx: number, ty: number) {
    const id = this.scene.ground[ty][tx]; const x = tx * TILE; const y = ty * TILE;
    const base = GROUND_DEFS[id]?.cor ?? "#57a049"; const r = hash(tx, ty);
    this.px(x, y, TILE, TILE, base);
    switch (id) {
      case G.GRASS: case G.GRASS_DARK: case G.FLOWERS: {
        this.px(x, y, TILE, TILE, base);
        this.px(x, y + 8, TILE, 2, shade(base, -10));
        this.px(x, y + 14, TILE, 2, shade(base, -18));
        for (let i = 0; i < 3; i++) {
          const bx = ((r * (i * 47 + 31)) % 14) | 0; const by = ((r * (i * 71 + 13)) % 14) | 0;
          this.px(x + bx, y + by, 2, 1, shade(base, 22)); this.px(x + bx, y + by + 1, 2, 1, shade(base, -18));
        }
        this.px(x + ((r * 91) % 13 | 0), y + ((r * 53) % 13 | 0), 1, 3, shade(base, 12));
        if (id === G.FLOWERS) {
          const cols = ["#ffe166", "#ff7ea3", "#ffffff", "#c98bf0", "#ff9d3a"];
          const fx = ((r * 61) % 12 | 0) + 2; const fy = ((r * 43) % 12 | 0) + 2;
          this.px(x + fx, y + fy, 2, 2, cols[(r * 5) | 0]); this.px(x + fx, y + fy + 2, 2, 1, "#2f7a35");
        }
        break;
      }
      case G.ROAD: case G.ROAD_LINE: case G.CROSSWALK: {
        this.px(x, y, TILE, TILE, "#3d4351"); this.px(x, y, TILE, 2, "#4a5060"); this.px(x, y + 14, TILE, 2, "#33384a");
        for (let i = 0; i < 4; i++) { this.px(x + ((r * (i * 31 + 7)) % 15) | 0, y + ((r * (i * 47 + 11)) % 15) | 0, 1, 1, i % 2 ? "#535a6c" : "#2e3242"); }
        if (id === G.ROAD_LINE) {
          if (this.isRoadTile(tx - 1, ty) && this.isRoadTile(tx + 1, ty)) { this.px(x + 1, y + 7, 6, 2, "#ffdd60"); this.px(x + 9, y + 7, 6, 2, "#ffdd60"); }
          else { this.px(x + 7, y + 1, 2, 6, "#ffdd60"); this.px(x + 7, y + 9, 2, 6, "#ffdd60"); }
        }
        if (id === G.CROSSWALK) { for (let i = 0; i < 4; i++) { this.px(x + i * 4, y, 2, TILE, "#f2f4f8"); this.px(x + i * 4, y, 2, 1, "#ffffff"); } }
        break;
      }
      case G.SIDEWALK: {
        const alt = (tx + ty) % 2 === 0;
        this.px(x, y, TILE, TILE, alt ? "#adb4c2" : "#a2a9b7");
        this.px(x, y + 7, TILE, 1, "#8b93a3"); this.px(x + 7, y, 1, TILE, "#8b93a3");
        if (this.isRoadTile(tx, ty + 1)) this.px(x, y + 14, TILE, 2, "#7e8593");
        if (this.isRoadTile(tx, ty - 1)) this.px(x, y, TILE, 1, "#c8cfd8");
        if (this.isRoadTile(tx + 1, ty)) this.px(x + 14, y, 2, TILE, "#7e8593");
        if (this.isRoadTile(tx - 1, ty)) this.px(x, y, 1, TILE, "#c8cfd8");
        break;
      }
      case G.WATER: { const t = this.time * 0.002; this.px(x, y, TILE, TILE, "#2f74b5"); this.px(x, y, TILE, 8, "#3480c4"); const off = Math.sin(t + tx * 0.7 + ty * 0.4) * 3; this.px(x + 3 + off, y + 4, 6, 1, "#7fc4ef"); this.px(x + 7 - off, y + 10, 5, 1, "#5aa5df"); break; }
      case G.WOOD: { this.px(x, y, TILE, TILE, "#a9743f"); this.px(x, y + 5, TILE, 1, "#8d5f33"); this.px(x, y + 11, TILE, 1, "#8d5f33"); break; }
      case G.WALL: { this.px(x, y, TILE, TILE, "#6d7280"); this.px(x, y, TILE, 3, "#848a99"); this.px(x, y + 13, TILE, 3, "#575c69"); break; }
      default: break;
    }
  }

  private isRoadTile(x: number, y: number) { const g = this.scene.ground[y]?.[x]; return g === G.ROAD || g === G.ROAD_LINE || g === G.CROSSWALK; }

  private drawObject(id: number, tx: number, ty: number) {
    const x = tx * TILE; const y = ty * TILE;
    if (id >= CUSTOM_BASE) {
      const c = this.customMap.get(id);
      if (c && c.img.complete && c.img.naturalWidth > 0) {
        const wpx = c.w * TILE; const hpx = c.h * TILE;
        this.ctx.fillStyle = "rgba(0,0,0,0.22)"; this.ctx.fillRect(x + 1, y + hpx - 3, wpx - 2, 3);
        this.ctx.drawImage(c.img, x, y + 2 - hpx, wpx, hpx);
      } else { this.ctx.fillStyle = "#7a5ca8"; this.ctx.fillRect(x, y - 8, TILE, TILE); }
      return;
    }
    const r = hash(tx * 3 + 7, ty * 5 + 11);
    const P = (a: number, b: number, w: number, h: number, c: string) => this.px(x + a, y + b, w, h, c);
    const wallLike = (c1: string, c2: string, c3: string) => { P(0, 0, 16, 16, c1); P(0, 0, 16, 1, c2); P(0, 15, 16, 1, c3); P(0, 5, 16, 1, c3); P(0, 10, 16, 1, c3); P(7, 0, 1, 5, c3); P(3, 5, 1, 5, c3); P(11, 10, 1, 5, c3); };
    const roofLike = (c1: string, c2: string) => { P(0, 0, 16, 16, c1); for (let i = 0; i < 4; i++) P(0, i * 4, 16, 1, c2); };
    const doorLike = (frame: string, panel: string, _glyph: string) => { P(0, 0, 16, 16, frame); P(0, 0, 16, 2, shade(frame, 20)); P(3, 3, 10, 13, "#2a1c12"); P(4, 4, 8, 12, panel); P(4, 4, 8, 1, shade(panel, 28)); P(10, 10, 2, 2, "#f3d67a"); };
    switch (id) {
      case O.TREE: { P(6, 8, 4, 8, "#6b4a2a"); this.px(x - 3, y - 8, 22, 16, "#2f7a35"); this.px(x - 1, y - 11, 18, 6, "#37903d"); this.px(x + 1, y - 12, 14, 4, "#3f9d45"); this.px(x + 2, y - 9, 6, 3, "#4bb050"); break; }
      case O.PINE: { P(7, 10, 3, 6, "#6b4a2a"); this.px(x + 1, y + 2, 14, 9, "#256b32"); this.px(x + 3, y - 4, 10, 8, "#2c7c39"); this.px(x + 5, y - 10, 6, 8, "#348a41"); break; }
      case O.BUSH: { P(1, 6, 14, 9, "#2f7a35"); P(3, 4, 10, 4, "#37903d"); break; }
      case O.ROCK: { P(2, 7, 12, 8, "#8e939c"); P(4, 5, 8, 4, "#a3a8b1"); break; }
      case O.LAMP: { P(6, 4, 3, 12, "#2d323d"); P(4, 14, 8, 2, "#2d323d"); this.px(x + 3, y - 10, 9, 3, "#2d323d"); this.px(x + 4, y - 6, 7, 4, "#ffe08a"); this.px(x + 5, y - 6, 5, 2, "#ffffff"); const glow = (r + Math.sin(this.time * 0.002)) > 0 ? 0.14 : 0.11; this.ctx.fillStyle = `rgba(255, 224, 138, ${glow})`; this.ctx.beginPath(); this.ctx.ellipse(x + 8, y + 12, 22, 10, 0, 0, Math.PI * 2); this.ctx.fill(); break; }
      case O.WALL_BRICK: wallLike("#b05a45", "#c4715b", "#8f4436"); break;
      case O.WALL_BEIGE: wallLike("#d8c9a8", "#e7dbc0", "#b7a685"); break;
      case O.WALL_GRAY: wallLike("#8b8f7d", "#9ba08c", "#6f7364"); break;
      case O.WALL_BLUE: wallLike("#5f7fae", "#7593bd", "#4a6389"); break;
      case O.ROOF_RED: roofLike("#b8443c", "#98342e"); break;
      case O.ROOF_BLUE: roofLike("#3f6ba8", "#325686"); break;
      case O.ROOF_GREEN: roofLike("#3d7c52", "#2f6440"); break;
      case O.ROOF_GRAY: roofLike("#6c705f", "#565a4c"); break;
      case O.ROOF_ORANGE: roofLike("#cf8236", "#a9682a"); break;
      case O.DOOR_BARRACKS: doorLike("#8b8f7d", "#5e6a3f", "#c8cf9a"); break;
      case O.DOOR_SHOP: doorLike("#b05a45", "#3f6ba8", "#ffd980"); break;
      case O.DOOR_BANK: doorLike("#d8c9a8", "#3f8f7c", "#f6e9a8"); break;
      case O.DOOR_HOUSE: doorLike("#d8c9a8", "#8b5a2b", "#f0d7a8"); break;
      case O.DOOR_HOSPITAL: doorLike("#d8c9a8", "#c8d6e6", "#e05555"); break;
      case O.DOOR_JOBS: doorLike("#5f7fae", "#2f4d75", "#f0e2a8"); break;
      case O.DOOR_EXIT: { P(0, 0, 16, 16, "#5c5f68"); P(3, 2, 10, 14, "#2a1c12"); P(4, 3, 8, 13, "#8b5a2b"); P(10, 9, 2, 2, "#f3d67a"); this.px(x + 2, y - 6, 12, 6, "#20304d"); this.px(x + 3, y - 5, 10, 4, "#59e08a"); break; }
      case O.BED: { P(1, 2, 14, 14, "#7a5433"); P(2, 3, 12, 5, "#e9eef5"); P(2, 8, 12, 7, "#3f6ba8"); break; }
      case O.TABLE: { P(1, 4, 14, 7, "#a5713d"); P(2, 11, 3, 5, "#7a5433"); P(11, 11, 3, 5, "#7a5433"); break; }
      case O.COUNTER: { P(0, 5, 16, 10, "#a5713d"); P(0, 4, 16, 2, "#d0a05e"); break; }
      case O.DUMMY: { P(6, 10, 4, 6, "#7a5433"); P(3, 2, 10, 9, "#c2a06a"); P(6, 4, 4, 4, "#c33d3d"); break; }
      case O.ATM: { P(2, 1, 12, 15, "#3f8f7c"); P(4, 4, 8, 4, "#59e08a"); break; }
      case O.FLAG: { P(6, 2, 2, 14, "#8a8f9c"); const wave = Math.sin(this.time * 0.004 + tx) * 1.5; this.px(x + 8, y + 1 + wave, 8, 6, "#3d7c52"); this.px(x + 8, y + 3 + wave, 8, 2, "#e8e2c8"); break; }
      default: break;
    }
  }

  /* Personagem — delega para drawCharacter (characterRenderer.ts) */
  private drawChar(
    wx: number, wy: number, dir: Dir, anim: number, corBase: string, cabelo: string, self: boolean,
    pele = "#f0c396", sexo: Sexo = "masculino", emprego = "desempregado",
    uniforme?: Uniform | null, armedItem?: string | null,
    cabeloEstilo: HairStyle = "curto", camisaModelo: ShirtStyle = "camiseta",
    inferiorModelo: BottomStyle = "calca", calcaCor = "#2f3b57",
    sapatoModelo: ShoeStyle = "tenis", sapatoCor = "#1a1f2c",
    camisaImagem = "", camisaTransform: ShirtArtTransform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
  ) {
    const x = Math.round(wx); const y = Math.round(wy);
    this.ctx.save();
    this.ctx.translate(x, y);
    drawCharacter(this.ctx, 0, 0, {
      cor: (uniforme ?? getUniform(emprego))?.cor ?? corBase,
      cabelo, pele, sexo, emprego, uniforme, armedItem, cabeloEstilo, camisaModelo,
      inferiorModelo, calcaCor, sapatoModelo, sapatoCor, camisaImagem, camisaTransform,
      dir, anim, self, time: this.time,
    });
    this.ctx.restore();
  }

  private drawTargetMarker(tx: number, ty: number) {
    const x = tx * TILE; const y = ty * TILE;
    const pulse = (Math.sin(this.time * 0.006) + 1) / 2;
    this.ctx.strokeStyle = `rgba(126,224,255,${0.5 + pulse * 0.5})`;
    this.ctx.lineWidth = 1; this.ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    this.px(x, y - 5 - pulse * 2, 4, 2, "#7ee0ff"); this.px(x + 12, y - 5 - pulse * 2, 4, 2, "#7ee0ff");
  }

  private drawSigns(x0: number, y0: number, x1: number, y1: number) {
    for (const key of Object.keys(this.signs)) {
      const raw = this.signs[key]; if (!raw) continue;
      const [xs, ys] = key.split("_"); const tx = Number(xs); const ty = Number(ys);
      if (tx < x0 || tx > x1 || ty < y0 || ty > y1) continue;
      const { text, size, color, bg, w, h } = decodeSign(raw); if (!text) continue;
      const sx = tx * TILE; const sy = ty * TILE; const cx = sx + TILE / 2;
      const charW = Math.max(3.4, size * 0.52);
      const pw = Math.max(12, text.length * charW + 8);
      const bw = pw * w; const bh = (size + 6) * h;
      this.ctx.fillStyle = bg; this.ctx.fillRect(cx - bw / 2, sy - bh - 4, bw, bh);
      this.ctx.fillStyle = "rgba(255,255,255,0.14)"; this.ctx.fillRect(cx - bw / 2, sy - bh - 4, bw, 2);
      this.ctx.fillStyle = "rgba(0,0,0,0.35)"; this.ctx.fillRect(cx - bw / 2, sy - 5, bw, 2);
      this.ctx.font = `700 ${size}px Rubik, monospace`;
      this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle";
      this.ctx.fillStyle = color; this.ctx.fillText(text.toUpperCase(), cx, sy - bh / 2 - 2);
      this.ctx.textBaseline = "alphabetic";
    }
  }

  private drawEditorOverlay(x0: number, y0: number, x1: number, y1: number) {
    const { ctx } = this;
    ctx.strokeStyle = "rgba(126,224,255,0.13)"; ctx.lineWidth = 0.5; ctx.beginPath();
    for (let x = x0; x <= x1 + 1; x++) { ctx.moveTo(x * TILE, y0 * TILE); ctx.lineTo(x * TILE, (y1 + 1) * TILE); }
    for (let y = y0; y <= y1 + 1; y++) { ctx.moveTo(x0 * TILE, y * TILE); ctx.lineTo((x1 + 1) * TILE, y * TILE); }
    ctx.stroke();
    const h = this.editor.hover;
    if (h.x >= 0 && h.y >= 0) {
      ctx.fillStyle = "rgba(126,224,255,0.22)"; ctx.fillRect(h.x * TILE, h.y * TILE, TILE * this.editor.w, TILE * this.editor.h);
      ctx.strokeStyle = "#7ee0ff"; ctx.lineWidth = 1; ctx.strokeRect(h.x * TILE + 0.5, h.y * TILE + 0.5, TILE * this.editor.w - 1, TILE * this.editor.h - 1);
    }
  }
}
