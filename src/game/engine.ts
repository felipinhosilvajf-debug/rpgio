import { G, O, OBJ_DEFS, GROUND_DEFS, TILE, isSolid, type SceneData } from "./mapData";
import type { BottomStyle, CustomObject, Dir, HairStyle, InteractTarget, ShirtArtTransform, ShirtStyle, ShoeStyle, Sexo, SignMap, Uniform } from "./types";
import { getUniform, tagPatente } from "./jobs";
import { CUSTOM_BASE, decodeSign } from "./types";

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
  private shirtImages = new Map<string, HTMLImageElement>();
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

  /* ------------------------------- lifecycle ------------------------------ */
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

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    this.setUserZoom(this.userZoom + delta);
  };

  setUserZoom(z: number) {
    this.userZoom = Math.max(this.zoomMin, Math.min(this.zoomMax, z));
    this.resize();
  }

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
    if (!keepPos) {
      this.player.x = spawn?.x ?? scene.spawn.x;
      this.player.y = spawn?.y ?? scene.spawn.y;
    } else if (spawn) {
      this.player.x = spawn.x;
      this.player.y = spawn.y;
    }
    this.resize();
  }

  setAppearance(a: Partial<typeof this.player>) {
    Object.assign(this.player, a);
  }

  setRemote(list: RemotePlayer[]) {
    this.remote = list;
  }

  setCustomObjects(list: CustomObject[]) {
    this.customMap = new Map();
    for (const c of list) {
      const img = new Image();
      img.src = c.image;
      this.customMap.set(c.objId, { img, w: c.w, h: c.h, name: c.nome });
    }
  }

  setSigns(signs: SignMap) {
    this.signs = signs;
  }

  setDamageHandler(fn: (targetUid: string, amount: number) => void) {
    this.onDamage = fn;
  }

  /** Dispara um projétil na direção do jogador */
  fire() {
    if (this.player.armedItem !== "arma_fogo" && this.player.armedItem !== "municao") return false;
    const speed = 9;
    let vx = 0; let vy = 0;
    if (this.player.dir === "left") vx = -speed;
    else if (this.player.dir === "right") vx = speed;
    else if (this.player.dir === "up") vy = -speed;
    else vy = speed;
    // pequena tolerância para dimensões
    this.projectiles.push({ x: this.player.x, y: this.player.y - 8, vx, vy, from: this.player.dir });
    return true;
  }

  setEditor(on: boolean, w = 1, h = 1, singleClick = false) {
    this.editor.on = on;
    this.editor.w = w;
    this.editor.h = h;
    this.editor.singleClick = singleClick;
  }

  teleport(x: number, y: number) {
    this.player.x = x;
    this.player.y = y;
  }

  /* --------------------------------- input -------------------------------- */
  private onKeyDown = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement | null;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d", "e"].includes(k)) e.preventDefault();
    if (this.inputLocked) return;
    if (k === "e") {
      this.cb.onInteract?.(this.target);
      return;
    }
    if (k === " " || k === "f") {
      // disparo com barra de espaço ou tecla F
      if (this.fire()) this.armedFlash = 1;
      return;
    }
    this.keys.add(k);
  };

  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());

  private cellFromEvent(e: MouseEvent) {
    const r = this.canvas.getBoundingClientRect();
    const lx = (e.clientX - r.left) / this.zoom + this.cam.x;
    const ly = (e.clientY - r.top) / this.zoom + this.cam.y;
    return { x: Math.floor(lx / TILE), y: Math.floor(ly / TILE) };
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.editor.on) return;
    const c = this.cellFromEvent(e);
    const changed = c.x !== this.editor.hover.x || c.y !== this.editor.hover.y;
    this.editor.hover = c;
    // no modo singleClick (ex: letreiro) NÃO pinta em drag — só no clique inicial
    if (this.editor.painting && !this.editor.singleClick && changed) {
      this.cb.onEditorPaint?.(c.x, c.y, e.buttons === 2 || e.shiftKey);
    }
  };

  private onMouseDown = (e: MouseEvent) => {
    if (!this.editor.on) return;
    e.preventDefault();
    this.editor.painting = true;
    const c = this.cellFromEvent(e);
    this.cb.onEditorPaint?.(c.x, c.y, e.button === 2 || e.shiftKey);
  };

  private onMouseUp = () => {
    this.editor.painting = false;
  };

  /* -------------------------------- physics ------------------------------- */
  private solidAt(px: number, py: number) {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (ty < 0 || tx < 0 || ty >= this.scene.h || tx >= this.scene.w) return true;
    return isSolid(this.scene.ground[ty][tx], this.scene.objects[ty][tx]);
  }

  private canStand(x: number, y: number) {
    const hw = 4.5;
    const top = y - 6;
    const bot = y + 1.5;
    return !(
      this.solidAt(x - hw, top) ||
      this.solidAt(x + hw, top) ||
      this.solidAt(x - hw, bot) ||
      this.solidAt(x + hw, bot)
    );
  }

  private updateProjectiles(dt: number) {
    const moved = (dt / 16.667) * 2.6;
    const still: typeof this.projectiles = [];
    for (const p of this.projectiles) {
      p.x += p.vx * moved;
      p.y += p.vy * moved;
      // colisão com parede/mapa
      const tx = Math.floor(p.x / TILE);
      const ty = Math.floor(p.y / TILE);
      const end = ty < 0 || tx < 0 || ty >= this.scene.h || tx >= this.scene.w || isSolid(this.scene.ground[ty]?.[tx], this.scene.objects[ty]?.[tx]);
      if (end) continue;
      // colisão com outros jogadores
      let hit = false;
      for (const other of this.remote) {
        if (other.uid === p.from) continue;
        if (Math.abs(p.x - other.x) < 10 && Math.abs(p.y - other.y) < 10) {
          this.onDamage?.(other.uid, 15);
          hit = true;
          break;
        }
      }
      if (!hit) still.push(p);
    }
    this.projectiles = still;
  }

  private drawProjectiles() {
    for (const p of this.projectiles) {
      const gx = p.x - this.cam.x;
      const gy = p.y - this.cam.y;
      this.ctx.fillStyle = "#ffd65a";
      this.ctx.fillRect(p.x - 1, p.y - 1, 3, 3);
      this.ctx.fillStyle = "#fff4c0";
      this.ctx.fillRect(p.x, p.y, 2, 2);
      void gx; void gy;
    }
  }

  private updateTarget() {
    const px = this.player.x;
    const py = this.player.y;
    const ctx = Math.floor(px / TILE);
    const cty = Math.floor(py / TILE);
    let best: InteractTarget | null = null;
    let bestD = Infinity;
    for (let y = cty - 2; y <= cty + 2; y++) {
      for (let x = ctx - 2; x <= ctx + 2; x++) {
        if (y < 0 || x < 0 || y >= this.scene.h || x >= this.scene.w) continue;
        const def = OBJ_DEFS[this.scene.objects[y][x]];
        if (!def?.interact) continue;
        const d = Math.hypot(x * TILE + 8 - px, y * TILE + 10 - py);
        if (d < bestD && d < TILE * 1.9) {
          bestD = d;
          best = { kind: def.interact, label: def.label ?? def.nome, x, y, meta: `${x}_${y}` };
        }
      }
    }
    const changed = best?.meta !== this.target?.meta || best?.kind !== this.target?.kind;
    this.target = best;
    if (changed) this.cb.onTarget?.(best);
  }

  /* --------------------------------- loop --------------------------------- */
  private loop = (now: number) => {
    if (this.destroyed) return;
    const dt = Math.min(50, now - this.last);
    this.last = now;
    this.time += dt;
    this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const step = (dt / 16.667) * 1.45;
    let dx = 0;
    let dy = 0;
    if (!this.inputLocked) {
      if (this.keys.has("arrowleft") || this.keys.has("a")) dx -= 1;
      if (this.keys.has("arrowright") || this.keys.has("d")) dx += 1;
      if (this.keys.has("arrowup") || this.keys.has("w")) dy -= 1;
      if (this.keys.has("arrowdown") || this.keys.has("s")) dy += 1;
    }
    const moving = dx !== 0 || dy !== 0;
    if (moving) {
      const len = Math.hypot(dx, dy) || 1;
      const nx = this.player.x + (dx / len) * step;
      const ny = this.player.y + (dy / len) * step;
      if (this.canStand(nx, this.player.y)) this.player.x = nx;
      if (this.canStand(this.player.x, ny)) this.player.y = ny;
      if (Math.abs(dx) > Math.abs(dy)) this.player.dir = dx > 0 ? "right" : "left";
      else this.player.dir = dy > 0 ? "down" : "up";
      this.player.anim += dt * 0.012;
    } else {
      this.player.anim = 0;
    }
    this.player.moving = moving;

    this.player.x = Math.max(6, Math.min(this.scene.w * TILE - 6, this.player.x));
    this.player.y = Math.max(10, Math.min(this.scene.h * TILE - 4, this.player.y));

    // projéteis / balística
    if (this.armedFlash > 0) this.armedFlash = Math.max(0, this.armedFlash - dt * 0.01);
    this.updateProjectiles(dt);

    this.updateTarget();

    this.moveAccum += dt;
    if (this.moveAccum > 120) {
      this.moveAccum = 0;
      this.cb.onMove?.(this.player.x, this.player.y, this.player.dir, moving);
    }

    // câmera
    const viewW = this.canvas.width / this.dpr / this.zoom;
    const viewH = this.canvas.height / this.dpr / this.zoom;
    const mapW = this.scene.w * TILE;
    const mapH = this.scene.h * TILE;
    let cx = this.player.x - viewW / 2;
    let cy = this.player.y - viewH / 2;
    cx = mapW <= viewW ? (mapW - viewW) / 2 : Math.max(0, Math.min(mapW - viewW, cx));
    cy = mapH <= viewH ? (mapH - viewH) / 2 : Math.max(0, Math.min(mapH - viewH, cy));
    this.cam.x = Math.round(cx * this.zoom) / this.zoom;
    this.cam.y = Math.round(cy * this.zoom) / this.zoom;
  }

  /* -------------------------------- render -------------------------------- */
  private render() {
    const { ctx } = this;
    const s = this.zoom * this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = this.scene.sky;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(s, 0, 0, s, -this.cam.x * s, -this.cam.y * s);

    const viewW = this.canvas.width / this.dpr / this.zoom;
    const viewH = this.canvas.height / this.dpr / this.zoom;
    const x0 = Math.max(0, Math.floor(this.cam.x / TILE) - 1);
    const y0 = Math.max(0, Math.floor(this.cam.y / TILE) - 1);
    const x1 = Math.min(this.scene.w - 1, Math.ceil((this.cam.x + viewW) / TILE));
    const y1 = Math.min(this.scene.h - 1, Math.ceil((this.cam.y + viewH) / TILE) + 2);

    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) this.drawGround(x, y);

    // sombra dos objetos + entidades ordenadas por linha
    const others = this.remote;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const id = this.scene.objects[y][x];
        if (id) this.drawObject(id, x, y);
      }
      for (const p of others) {
        if (Math.floor(p.y / TILE) === y) this.drawChar(p.x, p.y, p.dir, p.moving ? this.time * 0.012 : 0, p.cor, p.cabelo, false, p.pele, p.sexo, p.emprego, p.uniforme, p.armedItem, p.cabeloEstilo, p.camisaModelo, p.inferiorModelo, p.calcaCor, p.sapatoModelo, p.sapatoCor, p.camisaImagem, p.camisaTransform);
      }
      if (Math.floor(this.player.y / TILE) === y)
        this.drawChar(this.player.x, this.player.y, this.player.dir, this.player.anim, this.player.cor, this.player.cabelo, true, this.player.pele, this.player.sexo, this.player.emprego, this.player.uniforme, this.player.armedItem, this.player.cabeloEstilo, this.player.camisaModelo, this.player.inferiorModelo, this.player.calcaCor, this.player.sapatoModelo, this.player.sapatoCor, this.player.camisaImagem, this.player.camisaTransform);
    }

    if (this.target) this.drawTargetMarker(this.target.x, this.target.y);
    this.drawProjectiles();
    if (this.editor.on) this.drawEditorOverlay(x0, y0, x1, y1);
    this.drawSigns(x0, y0, x1, y1);

    // ------- camada de tela (nomes, balões) -------
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const p of others) this.drawTag(p.x, p.y, p.nome, p.patente ? tagPatente(p.emprego ?? "", p.patente) : p.patente, p.chat, false);
    this.drawTag(this.player.x, this.player.y, this.player.nome, this.player.patente ? tagPatente(this.player.emprego, this.player.patente) : this.player.patente, null, true);
  }

  private w2s(x: number, y: number) {
    return { x: (x - this.cam.x) * this.zoom, y: (y - this.cam.y) * this.zoom };
  }

  private drawTag(wx: number, wy: number, nome: string, patente?: string, chat?: { text: string; ts: number } | null, self = false) {
    const { ctx } = this;
    const p = this.w2s(wx, wy - 26);
    ctx.textAlign = "center";
    ctx.font = "700 11px Rubik, sans-serif";
    const label = nome.length > 14 ? nome.slice(0, 13) + "…" : nome;
    const wmeasure = ctx.measureText(label).width + 12;
    ctx.fillStyle = "rgba(8,12,24,0.78)";
    ctx.fillRect(p.x - wmeasure / 2, p.y - 14, wmeasure, 16);
    ctx.fillStyle = self ? "#7ee0ff" : "#e7ecf7";
    ctx.fillText(label, p.x, p.y - 2);
    if (patente && patente !== "Civil") {
      ctx.font = "700 9px Rubik, sans-serif";
      const pw = ctx.measureText(patente).width + 10;
      ctx.fillStyle = "rgba(93,122,69,0.92)";
      ctx.fillRect(p.x - pw / 2, p.y - 28, pw, 13);
      ctx.fillStyle = "#eaf5dc";
      ctx.fillText(patente, p.x, p.y - 18);
    }
    if (chat && Date.now() - chat.ts < 7000) {
      ctx.font = "500 12px Rubik, sans-serif";
      const t = chat.text.length > 46 ? chat.text.slice(0, 45) + "…" : chat.text;
      const bw = ctx.measureText(t).width + 18;
      const by = p.y - (patente && patente !== "Civil" ? 52 : 38);
      ctx.fillStyle = "rgba(250,250,255,0.96)";
      ctx.fillRect(p.x - bw / 2, by, bw, 22);
      ctx.fillStyle = "rgba(250,250,255,0.96)";
      ctx.fillRect(p.x - 4, by + 22, 8, 5);
      ctx.fillStyle = "#16203a";
      ctx.fillText(t, p.x, by + 15);
    }
  }

  /* ------------------------------ tiles do chão ---------------------------- */
  private px(x: number, y: number, w: number, h: number, c: string) {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(x, y, w, h);
  }

  private drawGround(tx: number, ty: number) {
    const id = this.scene.ground[ty][tx];
    const x = tx * TILE;
    const y = ty * TILE;
    const base = GROUND_DEFS[id]?.cor ?? "#57a049";
    const r = hash(tx, ty);
    this.px(x, y, TILE, TILE, base);

    switch (id) {
      case G.GRASS:
      case G.GRASS_DARK:
      case G.FLOWERS: {
        // grama premium: base + variação de tom + tufos com sombra
        this.px(x, y, TILE, TILE, base);
        // manchas de tom
        this.px(x, y + 8, TILE, 2, shade(base, -10));
        this.px(x, y + 14, TILE, 2, shade(base, -18));
        // tufos com sombra (2 tons por tufo)
        for (let i = 0; i < 3; i++) {
          const bx = ((r * (i * 47 + 31)) % 14) | 0;
          const by = ((r * (i * 71 + 13)) % 14) | 0;
          this.px(x + bx, y + by, 2, 1, shade(base, 22));
          this.px(x + bx, y + by + 1, 2, 1, shade(base, -18));
        }
        // gramíneas verticais
        this.px(x + ((r * 91) % 13 | 0), y + ((r * 53) % 13 | 0), 1, 3, shade(base, 12));
        if (id === G.FLOWERS) {
          const cols = ["#ffe166", "#ff7ea3", "#ffffff", "#c98bf0", "#ff9d3a"];
          const fx = ((r * 61) % 12 | 0) + 2;
          const fy = ((r * 43) % 12 | 0) + 2;
          this.px(x + fx, y + fy, 2, 2, cols[(r * 5) | 0]);
          this.px(x + fx, y + fy + 2, 2, 1, "#2f7a35"); // caule
        }
        break;
      }
      case G.ROAD:
      case G.ROAD_LINE:
      case G.CROSSWALK: {
        // asfalto premium: gradiente vertical + textura granulada
        this.px(x, y, TILE, TILE, "#3d4351");
        this.px(x, y, TILE, 2, "#4a5060"); // topo mais claro
        this.px(x, y + 14, TILE, 2, "#33384a"); // base mais escura
        // pontinhos aleatórios (textura de asfalto)
        for (let i = 0; i < 4; i++) {
          const px2 = ((r * (i * 31 + 7)) % 15) | 0;
          const py2 = ((r * (i * 47 + 11)) % 15) | 0;
          this.px(x + px2, y + py2, 1, 1, i % 2 ? "#535a6c" : "#2e3242");
        }
        if (id === G.ROAD_LINE) {
          const horiz = this.isRoadTile(tx - 1, ty) && this.isRoadTile(tx + 1, ty);
          if (horiz) {
            this.px(x + 1, y + 7, 6, 2, "#ffdd60");
            this.px(x + 9, y + 7, 6, 2, "#ffdd60");
          } else {
            this.px(x + 7, y + 1, 2, 6, "#ffdd60");
            this.px(x + 7, y + 9, 2, 6, "#ffdd60");
          }
        }
        if (id === G.CROSSWALK) {
          for (let i = 0; i < 4; i++) {
            this.px(x + i * 4, y, 2, TILE, "#f2f4f8");
            this.px(x + i * 4, y, 2, 1, "#ffffff"); // brilho topo
          }
        }
        break;
      }
      case G.SIDEWALK: {
        // calçada premium: bloquinhos com meio-fio
        const alt = (tx + ty) % 2 === 0;
        this.px(x, y, TILE, TILE, alt ? "#adb4c2" : "#a2a9b7");
        // linhas de junção horizontal/vertical
        this.px(x, y + 7, TILE, 1, "#8b93a3");
        this.px(x + 7, y, 1, TILE, "#8b93a3");
        // meio-fio (borda) quando adjacente à rua
        if (this.isRoadTile(tx, ty + 1)) this.px(x, y + 14, TILE, 2, "#7e8593");
        if (this.isRoadTile(tx, ty - 1)) this.px(x, y, TILE, 1, "#c8cfd8");
        if (this.isRoadTile(tx + 1, ty)) this.px(x + 14, y, 2, TILE, "#7e8593");
        if (this.isRoadTile(tx - 1, ty)) this.px(x, y, 1, TILE, "#c8cfd8");
        // pequenas rachaduras/detalhes
        if (r > 0.88) this.px(x + 3, y + 11, 3, 1, "#7c8492");
        if (r > 0.94) this.px(x + 10, y + 3, 1, 2, "#7c8492");
        break;
      }
      case G.PLAZA: {
        this.px(x, y, TILE, TILE, "#b8b1a2");
        this.px(x, y, 8, 8, "#c2bbac");
        this.px(x + 8, y + 8, 8, 8, "#c2bbac");
        this.px(x, y + 15, TILE, 1, "#a49d8f");
        break;
      }
      case G.WATER: {
        const t = this.time * 0.002;
        this.px(x, y, TILE, TILE, "#2f74b5");
        this.px(x, y, TILE, 8, "#3480c4");
        const off = Math.sin(t + tx * 0.7 + ty * 0.4) * 3;
        this.px(x + 3 + off, y + 4, 6, 1, "#7fc4ef");
        this.px(x + 7 - off, y + 10, 5, 1, "#5aa5df");
        break;
      }
      case G.SAND: {
        this.px(x, y, TILE, TILE, "#d8c48c");
        this.px(x + ((r * 13) | 0), y + ((r * 31) % 13 | 0), 2, 1, "#c9b47c");
        this.px(x + ((r * 53) % 14 | 0), y + ((r * 19) % 14 | 0), 1, 1, "#e6d5a4");
        break;
      }
      case G.DIRT: {
        this.px(x, y, TILE, TILE, "#8c6a44");
        this.px(x + ((r * 12) | 0), y + ((r * 23) % 12 | 0), 3, 2, "#7a5b39");
        break;
      }
      case G.WOOD: {
        this.px(x, y, TILE, TILE, "#a9743f");
        this.px(x, y + 5, TILE, 1, "#8d5f33");
        this.px(x, y + 11, TILE, 1, "#8d5f33");
        this.px(x + (r > 0.5 ? 5 : 11), y, 1, 5, "#8d5f33");
        this.px(x, y + 1, TILE, 1, "#b9834b");
        break;
      }
      case G.TILEFLOOR: {
        const alt = (tx + ty) % 2 === 0;
        this.px(x, y, TILE, TILE, alt ? "#c9ccd8" : "#dfe2ec");
        this.px(x, y, TILE, 1, "#eef0f6");
        this.px(x, y + 15, TILE, 1, "#b3b7c4");
        break;
      }
      case G.CARPET: {
        this.px(x, y, TILE, TILE, "#8e3b3b");
        this.px(x, y, TILE, 1, "#a24747");
        this.px(x + ((r * 14) | 0), y + ((r * 29) % 14 | 0), 2, 2, "#7d3333");
        break;
      }
      case G.MILFLOOR: {
        this.px(x, y, TILE, TILE, "#7e8467");
        this.px(x, y + 7, TILE, 1, "#727858");
        this.px(x + 7, y, 1, TILE, "#727858");
        if (r > 0.9) this.px(x + 4, y + 3, 4, 2, "#8c9174");
        break;
      }
      case G.CONCRETE: {
        this.px(x, y, TILE, TILE, "#8d9199");
        this.px(x, y + 7, TILE, 1, "#82868e");
        if (r > 0.82) this.px(x + 3, y + 10, 5, 1, "#797d85");
        break;
      }
      case G.WALL: {
        this.px(x, y, TILE, TILE, "#6d7280");
        this.px(x, y, TILE, 3, "#848a99");
        this.px(x, y + 13, TILE, 3, "#575c69");
        for (let i = 0; i < 2; i++) this.px(x + (i % 2 ? 8 : 0), y + 4 + i * 5, 7, 4, "#767c8a");
        break;
      }
      default:
        break;
    }
  }

  private isRoadTile(x: number, y: number) {
    const g = this.scene.ground[y]?.[x];
    return g === G.ROAD || g === G.ROAD_LINE || g === G.CROSSWALK;
  }

  /* -------------------------------- objetos -------------------------------- */
  private drawObject(id: number, tx: number, ty: number) {
    const x = tx * TILE;
    const y = ty * TILE;
    if (id >= CUSTOM_BASE) {
      const c = this.customMap.get(id);
      if (c && c.img.complete && c.img.naturalWidth > 0) {
        const wpx = c.w * TILE;
        const hpx = c.h * TILE;
        // sombra
        this.ctx.fillStyle = "rgba(0,0,0,0.22)";
        this.ctx.fillRect(x + 1, y + hpx - 3, wpx - 2, 3);
        this.ctx.drawImage(c.img, x, y + 2 - hpx, wpx, hpx);
      } else {
        // fallback enquanto carrega
        this.ctx.fillStyle = "#7a5ca8";
        this.ctx.fillRect(x, y - 8, TILE, TILE);
      }
      return;
    }
    const r = hash(tx * 3 + 7, ty * 5 + 11);
    const P = (a: number, b: number, w: number, h: number, c: string) => this.px(x + a, y + b, w, h, c);

    const wallLike = (c1: string, c2: string, c3: string) => {
      P(0, 0, 16, 16, c1);
      P(0, 0, 16, 1, c2);
      P(0, 15, 16, 1, c3);
      P(0, 5, 16, 1, c3);
      P(0, 10, 16, 1, c3);
      P(7, 0, 1, 5, c3);
      P(3, 5, 1, 5, c3);
      P(11, 10, 1, 5, c3);
    };
    const roofLike = (c1: string, c2: string) => {
      P(0, 0, 16, 16, c1);
      for (let i = 0; i < 4; i++) P(0, i * 4, 16, 1, c2);
      for (let i = 0; i < 4; i++) P(((i * 5) % 16) + 1, ((i * 4) % 16) + 2, 3, 1, shade(c1, 16));
    };
    const doorLike = (frame: string, panel: string, glyph: string) => {
      P(0, 0, 16, 16, frame);
      P(0, 0, 16, 2, shade(frame, 20));
      P(3, 3, 10, 13, "#2a1c12");
      P(4, 4, 8, 12, panel);
      P(4, 4, 8, 1, shade(panel, 28));
      P(10, 10, 2, 2, "#f3d67a");
      this.ctx.fillStyle = glyph;
      P(6, 6, 4, 3, glyph);
    };

    switch (id) {
      case O.TREE: {
        P(6, 8, 4, 8, "#6b4a2a");
        P(6, 8, 1, 8, "#815b36");
        this.px(x - 3, y - 8, 22, 16, "#2f7a35");
        this.px(x - 1, y - 11, 18, 6, "#37903d");
        this.px(x + 1, y - 12, 14, 4, "#3f9d45");
        this.px(x + 2, y - 9, 6, 3, "#4bb050");
        this.px(x - 3, y + 4, 22, 3, "#276b2c");
        break;
      }
      case O.PINE: {
        P(7, 10, 3, 6, "#6b4a2a");
        this.px(x + 1, y + 2, 14, 9, "#256b32");
        this.px(x + 3, y - 4, 10, 8, "#2c7c39");
        this.px(x + 5, y - 10, 6, 8, "#348a41");
        this.px(x + 6, y - 12, 4, 3, "#3d9a49");
        break;
      }
      case O.BUSH: {
        P(1, 6, 14, 9, "#2f7a35");
        P(3, 4, 10, 4, "#37903d");
        P(5, 5, 4, 2, "#4bb050");
        P(1, 14, 14, 2, "#276b2c");
        break;
      }
      case O.ROCK: {
        P(2, 7, 12, 8, "#8e939c");
        P(4, 5, 8, 4, "#a3a8b1");
        P(5, 6, 3, 2, "#bcc1c9");
        P(2, 14, 12, 2, "#6f747d");
        break;
      }
      case O.LAMP: {
        // poste com base + haste + lanterna
        P(6, 4, 3, 12, "#2d323d");
        P(7, 4, 1, 12, "#4a5060"); // brilho vertical
        P(4, 14, 8, 2, "#2d323d");
        P(4, 15, 8, 1, "#1c2029");
        // lanterna
        this.px(x + 3, y - 10, 9, 3, "#2d323d");
        this.px(x + 3, y - 8, 9, 6, "#454c5c");
        this.px(x + 4, y - 6, 7, 4, "#ffe08a");
        this.px(x + 5, y - 6, 5, 2, "#ffffff"); // núcleo
        // halo de luz suave sobre o chão (pixel art)
        const glow = (r + Math.sin(this.time * 0.002)) > 0 ? 0.14 : 0.11;
        this.ctx.fillStyle = `rgba(255, 224, 138, ${glow})`;
        this.ctx.beginPath();
        this.ctx.ellipse(x + 8, y + 12, 22, 10, 0, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      }
      case O.BENCH: {
        P(1, 8, 14, 3, "#a5713d");
        P(1, 11, 14, 2, "#8b5c30");
        P(2, 13, 2, 3, "#5c5f68");
        P(12, 13, 2, 3, "#5c5f68");
        this.px(x + 1, y + 2, 14, 3, "#a5713d");
        break;
      }
      case O.FENCE: {
        P(1, 6, 14, 2, "#b08b57");
        P(1, 11, 14, 2, "#b08b57");
        P(2, 4, 3, 12, "#8d6c40");
        P(11, 4, 3, 12, "#8d6c40");
        break;
      }
      case O.SIGN: {
        P(7, 8, 2, 8, "#7a5a35");
        this.px(x + 1, y - 2, 14, 11, "#c9a15c");
        this.px(x + 2, y - 1, 12, 9, "#e0be7d");
        this.px(x + 4, y + 1, 8, 1, "#8a6a3a");
        this.px(x + 4, y + 4, 6, 1, "#8a6a3a");
        break;
      }
      case O.HYDRANT: {
        P(5, 7, 6, 9, "#c33d3d");
        P(4, 9, 8, 2, "#e05555");
        P(6, 5, 4, 3, "#a83030");
        P(5, 15, 6, 1, "#7d2424");
        break;
      }
      case O.FLOWERPOT: {
        P(4, 9, 8, 7, "#b06a44");
        P(3, 8, 10, 2, "#c87d52");
        P(5, 4, 6, 5, "#3f9d45");
        P(6, 3, 2, 2, "#ef7f9d");
        P(9, 4, 2, 2, "#f5e26b");
        break;
      }
      case O.WALL_BRICK:
        wallLike("#b05a45", "#c4715b", "#8f4436");
        break;
      case O.WALL_BEIGE:
        wallLike("#d8c9a8", "#e7dbc0", "#b7a685");
        break;
      case O.WALL_GRAY:
        wallLike("#8b8f7d", "#9ba08c", "#6f7364");
        break;
      case O.WALL_BLUE:
        wallLike("#5f7fae", "#7593bd", "#4a6389");
        break;
      case O.WINDOW: {
        wallLike("#b6ac93", "#c6bda6", "#948b76");
        P(2, 3, 12, 10, "#3a4a63");
        P(3, 4, 10, 8, "#79b6e0");
        P(3, 4, 5, 4, "#a6d6f2");
        P(7, 4, 1, 8, "#3a4a63");
        P(3, 8, 10, 1, "#3a4a63");
        P(1, 13, 14, 2, "#8b8271");
        break;
      }
      case O.ROOF_RED:
        roofLike("#b8443c", "#98342e");
        break;
      case O.ROOF_BLUE:
        roofLike("#3f6ba8", "#325686");
        break;
      case O.ROOF_GREEN:
        roofLike("#3d7c52", "#2f6440");
        break;
      case O.ROOF_GRAY:
        roofLike("#6c705f", "#565a4c");
        break;
      case O.ROOF_ORANGE:
        roofLike("#cf8236", "#a9682a");
        break;
      case O.DOOR_BARRACKS:
        doorLike("#8b8f7d", "#5e6a3f", "#c8cf9a");
        break;
      case O.DOOR_SHOP:
        doorLike("#b05a45", "#3f6ba8", "#ffd980");
        break;
      case O.DOOR_BANK:
        doorLike("#d8c9a8", "#3f8f7c", "#f6e9a8");
        break;
      case O.DOOR_HOUSE:
        doorLike("#d8c9a8", "#8b5a2b", "#f0d7a8");
        break;
      case O.DOOR_HOSPITAL:
        doorLike("#d8c9a8", "#c8d6e6", "#e05555");
        break;
      case O.DOOR_JOBS:
        doorLike("#5f7fae", "#2f4d75", "#f0e2a8");
        break;
      case O.DOOR_EXIT: {
        P(0, 0, 16, 16, "#5c5f68");
        P(3, 2, 10, 14, "#2a1c12");
        P(4, 3, 8, 13, "#8b5a2b");
        P(10, 9, 2, 2, "#f3d67a");
        this.px(x + 2, y - 6, 12, 6, "#20304d");
        this.px(x + 3, y - 5, 10, 4, "#59e08a");
        break;
      }
      case O.BED: {
        P(1, 2, 14, 14, "#7a5433");
        P(2, 3, 12, 5, "#e9eef5");
        P(2, 8, 12, 7, "#3f6ba8");
        P(2, 8, 12, 1, "#5580c0");
        P(3, 4, 6, 3, "#ffffff");
        break;
      }
      case O.TABLE: {
        P(1, 4, 14, 7, "#a5713d");
        P(1, 4, 14, 2, "#c08a4f");
        P(2, 11, 3, 5, "#7a5433");
        P(11, 11, 3, 5, "#7a5433");
        break;
      }
      case O.CHAIR: {
        P(4, 2, 8, 8, "#8b5a2b");
        P(4, 9, 8, 3, "#a5713d");
        P(4, 12, 2, 4, "#6d4522");
        P(10, 12, 2, 4, "#6d4522");
        break;
      }
      case O.SOFA: {
        P(1, 5, 14, 9, "#4b5b86");
        P(1, 3, 14, 3, "#5c6f9f");
        P(1, 12, 14, 2, "#3b4a70");
        P(2, 7, 5, 4, "#6176a8");
        break;
      }
      case O.LOCKER: {
        P(2, 1, 12, 15, "#5b6b56");
        P(2, 1, 12, 2, "#6c7d66");
        P(7, 3, 1, 12, "#43503f");
        P(5, 8, 1, 2, "#c9cf9a");
        P(10, 8, 1, 2, "#c9cf9a");
        break;
      }
      case O.CRATE: {
        P(1, 4, 14, 12, "#a8763f");
        P(1, 4, 14, 2, "#c08a4f");
        P(1, 9, 14, 1, "#7d5729");
        P(7, 4, 1, 12, "#7d5729");
        break;
      }
      case O.SHELF: {
        P(1, 0, 14, 16, "#8b5a2b");
        P(2, 2, 12, 3, "#e0b463");
        P(2, 7, 12, 3, "#7fc4ef");
        P(2, 12, 12, 3, "#c96b6b");
        break;
      }
      case O.COUNTER: {
        P(0, 5, 16, 10, "#a5713d");
        P(0, 4, 16, 2, "#d0a05e");
        P(0, 14, 16, 2, "#7a5433");
        break;
      }
      case O.DESK: {
        P(0, 4, 16, 9, "#6f4a2a");
        P(0, 3, 16, 2, "#8b5f36");
        P(1, 13, 3, 3, "#553a20");
        P(12, 13, 3, 3, "#553a20");
        P(4, 0, 8, 4, "#2b3a4f");
        P(5, 1, 6, 2, "#7fc4ef");
        break;
      }
      case O.ARSENAL: {
        P(1, 1, 14, 15, "#4d5546");
        P(1, 1, 14, 2, "#5f6857");
        P(3, 4, 2, 10, "#2b2f26");
        P(7, 4, 2, 10, "#2b2f26");
        P(11, 4, 2, 10, "#2b2f26");
        P(3, 7, 10, 1, "#8a9377");
        break;
      }
      case O.DUMMY: {
        P(6, 10, 4, 6, "#7a5433");
        P(4, 15, 8, 1, "#5c3f26");
        P(3, 2, 10, 9, "#c2a06a");
        P(1, 4, 14, 2, "#a8865a");
        P(6, 4, 4, 4, "#c33d3d");
        P(7, 5, 2, 2, "#e9e2cf");
        break;
      }
      case O.ATM: {
        P(2, 1, 12, 15, "#3f8f7c");
        P(3, 3, 10, 6, "#0f1a2c");
        P(4, 4, 8, 4, "#59e08a");
        P(4, 11, 8, 3, "#d6dbe4");
        break;
      }
      case O.TV: {
        P(1, 2, 14, 10, "#22262f");
        P(2, 3, 12, 8, r > 0.5 ? "#3a6ea8" : "#2f5f96");
        P(3, 4, 5, 3, "#7fc4ef");
        P(6, 12, 4, 3, "#22262f");
        P(4, 15, 8, 1, "#171a21");
        break;
      }
      case O.PLANT: {
        P(5, 10, 6, 6, "#b06a44");
        P(4, 9, 8, 2, "#c87d52");
        this.px(x + 3, y + 1, 10, 9, "#2f7a35");
        this.px(x + 5, y - 2, 6, 5, "#37903d");
        this.px(x + 6, y - 1, 2, 2, "#4bb050");
        break;
      }
      case O.RUG: {
        P(0, 2, 16, 12, "#8e3b3b");
        P(2, 4, 12, 8, "#a95050");
        P(5, 6, 6, 4, "#c9a15c");
        break;
      }
      case O.FLAG: {
        P(6, 2, 2, 14, "#8a8f9c");
        const wave = Math.sin(this.time * 0.004 + tx) * 1.5;
        this.px(x + 8, y + 1 + wave, 8, 6, "#3d7c52");
        this.px(x + 8, y + 3 + wave, 8, 2, "#e8e2c8");
        break;
      }
      default:
        break;
    }
  }

  /* ------------------------------- personagem ------------------------------ */
  private drawChar(
    wx: number,
    wy: number,
    dir: Dir,
    anim: number,
    corBase: string,
    cabelo: string,
    self: boolean,
    pele = "#f0c396",
    sexo: Sexo = "masculino",
    emprego = "desempregado",
    uniforme?: Uniform | null,
    armedItem?: string | null,
    cabeloEstilo: HairStyle = "curto",
    camisaModelo: ShirtStyle = "camiseta",
    inferiorModelo: BottomStyle = "calca",
    calcaCor = "#2f3b57",
    sapatoModelo: ShoeStyle = "tenis",
    sapatoCor = "#1a1f2c",
    camisaImagem = "",
    camisaTransform: ShirtArtTransform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
  ) {
    const x = Math.round(wx);
    const y = Math.round(wy);
    const { ctx } = this;
    const step = Math.sin(anim * 6);
    const legOff = anim ? step * 2.6 : 0;
    const breath = Math.sin(this.time * 0.0028) * 0.6;
    const R = (a: number, b: number, w: number, h: number, c: string, rad = 0) => {
      ctx.fillStyle = c;
      if (rad > 0) { ctx.beginPath(); ctx.roundRect(x + a, y + b, w, h, rad); ctx.fill(); }
      else ctx.fillRect(x + a, y + b, w, h);
    };
    const E = (cx2: number, cy2: number, rx: number, ry: number, c: string) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x + cx2, y + cy2, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
    const isFem = sexo === "feminino";
    const u = uniforme ?? getUniform(emprego);
    const cor = u?.cor ?? corBase;
    const armed = armedItem === "arma_fogo" || armedItem === "municao";

    // ── paleta premium 4 tons por peça (hue shift: luz quente → sombra fria) ──
    const corH = shade(cor, 38);        // highlight
    const corS = shade(cor, -30);       // shadow
    const corD = shade(cor, -52);       // deep outline
    const skH = shade(pele, 24);
    const sk = pele;
    const skS = shade(pele, -28);
    const skD = shade(pele, -50);
    const hH = shade(cabelo, 22);
    const hS = shade(cabelo, -32);
    const pB = u ? shade(cor, -38) : calcaCor;
    const pH = shade(pB, 20);
    const pS = shade(pB, -24);
    const pD = shade(pB, -42);
    const armS = anim ? step * 1.8 : 0;

    // ═══ LAYER 0: SOMBRA NO CHÃO ═══
    E(0, 3, 10, 4, "rgba(0,0,0,0.10)");
    E(0, 2.5, 8, 3.2, "rgba(0,0,0,0.18)");
    E(0, 2, 6, 2.4, "rgba(0,0,0,0.26)");

    // ═══ LAYER 1: SAPATOS (tênis / social / bota) ═══
    const sL = Math.max(0, legOff);
    const sR = Math.max(0, -legOff);
    const shoeD = shade(sapatoCor, -28);
    const shoeH = shade(sapatoCor, 22);
    const boot = sapatoModelo === "bota";
    const social = sapatoModelo === "social";
    const shoeHeight = boot ? 3.5 : social ? 2 : 2.5;
    R(-4.8, sL - (boot ? 2 : 1), 4.8, shoeHeight, shoeD, social ? 0.4 : 1.1);
    R(0.5, sR - (boot ? 2 : 1), 4.8, shoeHeight, shoeD, social ? 0.4 : 1.1);
    R(-4.4, sL - (boot ? 1.7 : 0.8), 4, shoeHeight - 0.8, sapatoCor, 0.8);
    R(0.9, sR - (boot ? 1.7 : 0.8), 4, shoeHeight - 0.8, sapatoCor, 0.8);
    R(-4, sL - (boot ? 1.7 : 0.8), 3, 0.7, shoeH, 0.4);
    R(1.3, sR - (boot ? 1.7 : 0.8), 3, 0.7, shoeH, 0.4);
    R(-4.8, sL + 0.6, 4.8, 0.8, "#10141d", 0.4);
    R(0.5, sR + 0.6, 4.8, 0.8, "#10141d", 0.4);
    if (!social) { R(-2.7, sL - 0.2, 0.7, 1.3, shoeH); R(2.8, sR - 0.2, 0.7, 1.3, shoeH); }

    // ═══ LAYER 2: CALÇA / PERNAS (anatômicas com costura) ═══
    const shortBottom = inferiorModelo === "shorts" || inferiorModelo === "bermuda";
    const skirt = isFem && inferiorModelo === "saia" && !u;
    const lH = shortBottom ? 4.5 : isFem ? 7 : 8;
    if (skirt) {
      R(-5, -9, 10.5, 5, pD, 1.3);
      R(-4.5, -8.5, 9.5, 4.2, pB, 1.1);
      R(-4, -8.3, 8.5, 1.4, pH, 0.6);
    }
    // perna esquerda — outline suave
    R(-5, -8 + sL, 5, lH, skirt ? skD : pD, 1);
    R(-4.5, -7.5 + sL, 4, lH - 1, skirt ? sk : pB, 1);
    R(-4.5, -7.5 + sL, 4, 2.5, skirt ? skH : pH);
    R(-4.5, -8 + sL + lH - 2.5, 4, 2, skirt ? skS : pS);
    if (!skirt) R(-2, -7.5 + sL, 0.8, lH - 1, pS);
    // perna direita
    R(0.5, -8 + sR, 5, lH, skirt ? skD : pD, 1);
    R(1, -7.5 + sR, 4, lH - 1, skirt ? sk : pB, 1);
    R(1, -7.5 + sR, 4, 2.5, skirt ? skH : pH);
    R(1, -8 + sR + lH - 2.5, 4, 2, skirt ? skS : pS);
    if (!skirt) R(3.5, -7.5 + sR, 0.8, lH - 1, pS);
    // cinto
    R(-5, -8, 10.5, 1.5, shade(pB, -18), 0.5);
    R(-4, -8, 1.5, 1.5, shade(pB, 10));       // fivela

    // ═══ LAYER 3: TRONCO / CAMISA (masculino forte, feminino delicado) ═══
    const tY = -17 + breath;
    const torsoW = isFem ? 10 : 13;
    const torsoX = -torsoW / 2;
    const shoulderR = isFem ? 1.8 : 2.8;
    E(0, tY + 5.5, torsoW / 2 + 0.7, 6, corD);
    R(torsoX, tY, torsoW, 11, cor, isFem ? 2 : 1.2);
    // iluminação 3 faixas
    R(torsoX + 0.5, tY + 0.5, torsoW - 1, 3, corH);
    R(torsoX + 0.5, tY + 4, torsoW - 1, 3, cor);
    R(torsoX + 0.5, tY + 8, torsoW - 1, 3, corS);
    // plano lateral escuro + filete de luz: volume pseudo-3D/isométrico
    R(torsoX + torsoW - 1.4, tY + 2, 1.4, 6, corD, 0.4);
    R(torsoX + 0.8, tY + 2.2, 0.8, 5, shade(corH, 8), 0.3);
    // ombros arredondados
    E(torsoX, tY + 2.5, shoulderR, isFem ? 2.6 : 3.4, cor);
    E(-torsoX, tY + 2.5, shoulderR, isFem ? 2.6 : 3.4, cor);
    E(torsoX, tY + 1.5, shoulderR - 0.4, 1.8, corH);
    E(-torsoX, tY + 1.5, shoulderR - 0.4, 1.8, corH);
    // gola em V
    if (camisaModelo === "camiseta" || camisaModelo === "blusa") {
      R(-2, tY, 4, 2, corD, 0.8); R(-1.5, tY + 0.5, 3, 1.5, shade(cor, -15), 0.6); R(-0.5, tY + 1.5, 1, 1, skS);
    } else if (camisaModelo === "camisa") {
      R(-2.5, tY, 2.5, 2, corH, 0.4); R(0, tY, 2.5, 2, corH, 0.4); R(-0.3, tY + 2, 0.6, 7, corD);
      R(-0.6, tY + 3, 1.2, 1.2, "#d8dbe2", 0.5); R(-0.6, tY + 6, 1.2, 1.2, "#d8dbe2", 0.5);
    } else if (camisaModelo === "jaqueta") {
      R(torsoX + 0.5, tY + 1, 1.3, 8, corS); R(-torsoX - 1.8, tY + 1, 1.3, 8, corS); R(-0.4, tY + 1, 0.8, 9, "#b9c2ce");
    }
    // costura central camisa
    if (camisaModelo !== "camisa" && camisaModelo !== "jaqueta") R(-0.3, tY + 3, 0.6, 6, corD);
    // bolso
    if (!u?.colete && !isFem && camisaModelo !== "jaqueta") { R(2, tY + 3, 2.5, 2, corS, 0.5); R(2, tY + 3, 2.5, 0.5, corD); }
    if (isFem && camisaModelo === "blusa") R(-3.5, tY + 4.2, 7, 1, corS, 0.5);
    // manga (dobra)
    R(-6.5, tY + 5, 2, 1, corS);
    R(4.5, tY + 5, 2, 1, corS);
    // colete / farda overlay
    if (u?.colete) {
      R(-4, tY + 2, 8, 6, u.colete, 1);
      R(-4, tY + 2, 8, 1.5, shade(u.colete, 22));
      R(-4, tY + 6, 8, 2, shade(u.colete, -18));
      R(-0.3, tY + 2, 0.6, 6, shade(u.colete, -30));
    }
    if (u?.faixa) R(-5.5, tY + 5.5, 11, 1, u.faixa);
    if (camisaImagem && !u?.colete) this.drawShirtImage(camisaImagem, torsoX, tY, torsoW, 8, camisaTransform);

    // ═══ LAYER 4: BRAÇOS / MANGAS (com volume e mãos detalhadas) ═══
    // esquerdo
    R(-8.5, tY + 1 + armS, 3, 9, shade(cor, -14), 1);
    R(-8.5, tY + 1 + armS, 3, 2.5, shade(cor, 10));
    R(-8, tY + 5 + armS, 2, 1, corS);
    // mão esquerda
    E(-7, tY + 10.5 + armS, 2, 1.8, sk);
    E(-7, tY + 10 + armS, 1.5, 1.2, skH);
    // direito
    R(5.5, tY + 1 - armS, 3, 9, shade(cor, -14), 1);
    R(5.5, tY + 1 - armS, 3, 2.5, shade(cor, 10));
    R(6, tY + 5 - armS, 2, 1, corS);
    // mão direita
    E(7, tY + 10.5 - armS, 2, 1.8, sk);
    E(7, tY + 10 - armS, 1.5, 1.2, skH);

    // ═══ ARMA ═══
    if (armed) {
      const dx = dir === "left" ? -1 : dir === "right" ? 1 : 0;
      const dy = dir === "up" ? -1 : dir === "down" ? 1 : 0;
      const ax = 7 + dx * 3;
      const ay = tY + 6 + dy * 3 - armS;
      R(ax + dx * 3, ay + dy * 3, dx ? 7 : 2, dy ? 7 : 2, "#1a1e28", 0.5);
      R(ax + dx * 5, ay + dy * 5, dx ? 3 : 1, dy ? 3 : 1, "#2e3642");
      R(ax, ay, 3, 3.5, "#3a4450", 0.5);
      R(ax + 0.5, ay, 2, 1, "#4e5a68");
    }

    // ═══ LAYER 5: PESCOÇO ═══
    R(-2, -19 + breath, 4, 2.5, skS, 0.5);
    R(-1.5, -19 + breath, 3, 1, sk);

    // ═══ LAYER 6: CABEÇA (oval, cel-shading, selective outline) ═══
    const hY = -28.5 + breath;
    const headRx = isFem ? 6.2 : 6.8;
    const headRy = isFem ? 6.2 : 6;
    E(0, hY + 6, headRx + 0.5, headRy + 0.5, skD);
    E(0, hY + 6, headRx, headRy, sk);
    E(0, hY + 3.5, headRx - 1, 3.5, skH);
    E(0, hY + 9.5, isFem ? 4.4 : 5.3, isFem ? 2.2 : 2.5, skS);
    // plano facial lateral (profundidade sem perder a leitura pixel)
    R(headRx - 1.5, hY + 5, 1.2, 4.5, skS, 0.6);
    R(-headRx + 0.4, hY + 4.5, 0.8, 3.5, skH, 0.4);
    // maçãs do rosto
    E(-3.5, hY + 7, 1.5, 1, shade(pele, -8));
    E(3.5, hY + 7, 1.5, 1, shade(pele, -8));

    // ═══ LAYER 7: CABELO (volumétrico com mechas e brilho) ═══
    const isLong = cabeloEstilo === "longo" || cabeloEstilo === "longo_liso";
    if (dir !== "up") {
      if (cabeloEstilo === "moicano") {
        R(-2, hY - 2, 4, 6, hS, 1.2); R(-1.5, hY - 2, 3, 5, hH, 1);
      } else if (cabeloEstilo === "coque") {
        E(0, hY + 2.5, 7, 4, cabelo); E(0, hY + 1.8, 6, 3, hH); E(0, hY - 1.5, 3.5, 3, cabelo); E(0, hY - 2, 2.5, 2, hH);
      } else if (cabeloEstilo === "rabo") {
        E(0, hY + 2.5, 7, 4, cabelo); E(0, hY + 1.8, 6, 3, hH); R(5.5, hY + 3, 3, 11, cabelo, 1.2); R(6, hY + 3, 2, 4, hH, 0.8); R(5.8, hY + 12, 2.5, 2, hS, 0.8);
      } else if (cabeloEstilo === "cacheado") {
        E(0, hY + 2.5, 7.5, 4.5, cabelo); E(-2, hY + 1.3, 3, 2.5, hH); E(2.5, hY + 2, 2.5, 2, hH);
        R(-7.2, hY + 3, 2.6, isFem ? 9 : 5, cabelo, 1.2); R(4.6, hY + 3, 2.6, isFem ? 9 : 5, cabelo, 1.2);
      } else if (cabeloEstilo === "social") {
        E(0, hY + 2.3, 7, 3.8, cabelo); E(-1.5, hY + 1.2, 5, 2.3, hH); R(-6.5, hY + 2, 1.7, 5, hS, 0.8);
      } else {
        E(0, hY + 2.5, 7, 4, cabelo); E(0, hY + 1.8, 6, 3, hH); E(-1, hY + 1, 2, 1.5, shade(hH, 12));
        R(-6.5, hY + 2.5, 2, 6, cabelo, 1); R(4.5, hY + 2.5, 2, 6, cabelo, 1);
        if (isLong) {
          R(-7.5, hY + 4, 2.5, 12, cabelo, 1.2); R(5, hY + 4, 2.5, 12, cabelo, 1.2);
          R(-7.2, hY + 4, 1.5, 4, hH, 0.8); R(5.5, hY + 4, 1.5, 4, hH, 0.8);
          R(-7, hY + 14, 2, 2, hS, 0.8); R(5, hY + 14, 2, 2, hS, 0.8);
        }
      }
      if (dir === "left") { R(-6.5, hY + 5, 3, 4, cabelo, 1); R(-6.5, hY + 5, 3, 1, hH); }
      if (dir === "right") { R(3.5, hY + 5, 3, 4, cabelo, 1); R(3.5, hY + 5, 3, 1, hH); }
    } else {
      E(0, hY + 5.5, 7, 6, cabelo); E(0, hY + 3.5, 6, 4, hH);
      if (isLong || cabeloEstilo === "rabo") { R(-7.5, hY + 4, 2, 12, cabelo, 1); R(5.5, hY + 4, 2, 12, cabelo, 1); }
    }

    // ═══ LAYER 8: CAPACETE / BOINA ═══
    if (u?.capacete) {
      E(0, hY + 2.5, 7.5, 4, u.capacete);
      E(0, hY + 1.5, 6.5, 3, shade(u.capacete, 20));
      R(-7.5, hY + 4, 15, 1.2, shade(u.capacete, -28));
    }

    // ═══ LAYER 9: ROSTO (olhos realistas, nariz, boca) ═══
    if (dir !== "up") {
      const off = dir === "left" ? -2 : dir === "right" ? 2 : 0;
      // branco dos olhos
      const eyeRx = isFem ? 1.9 : 1.55;
      const eyeRy = isFem ? 1.55 : 1.3;
      E(-2.5 + off, hY + 5.8, eyeRx, eyeRy, "#e8eef5");
      E(2.5 + off, hY + 5.8, eyeRx, eyeRy, "#e8eef5");
      // íris
      E(-2.5 + off, hY + 6, 1.3, 1.2, "#3a5a8a");
      E(2.5 + off, hY + 6, 1.3, 1.2, "#3a5a8a");
      // pupilas
      E(-2.5 + off, hY + 6.2, 0.7, 0.7, "#111825");
      E(2.5 + off, hY + 6.2, 0.7, 0.7, "#111825");
      // brilho
      E(-2 + off, hY + 5.5, 0.5, 0.5, "#ffffff");
      E(2 + off, hY + 5.5, 0.5, 0.5, "#ffffff");
      // cílios / delineado
      R(-3.8 + off, hY + 5, 2.8, 0.6, hS);
      R(1.2 + off, hY + 5, 2.8, 0.6, hS);
      // sobrancelhas
      R(-3.8 + off, hY + 4, 3, isFem ? 0.55 : 0.9, shade(cabelo, -20));
      R(1 + off, hY + 4, 3, isFem ? 0.55 : 0.9, shade(cabelo, -20));
      // nariz
      if (dir === "down" || dir === "left" || dir === "right") {
        R(0 + off * 0.3, hY + 7.5, isFem ? 0.7 : 1.1, isFem ? 0.8 : 1.3, skS);
        R(0.3 + off * 0.3, hY + 7.5, 0.5, 0.6, skH);
      }
      // boca
      if (dir === "down") {
        R(-1.5 + off, hY + 9, 3, 0.6, shade(pele, -42));
        R(-1 + off, hY + 8.6, 2, 0.4, shade(pele, -15));
        // lábio inferior sutil
        E(0 + off, hY + 9.5, 1.5, 0.5, shade(pele, -12));
      }
      if (isFem) {
        E(-4.2, hY + 8.2, 1.3, 0.6, "rgba(214,104,124,0.20)");
        E(4.2, hY + 8.2, 1.3, 0.6, "rgba(214,104,124,0.20)");
      }
    }

    // ═══ INDICADOR DO JOGADOR ═══
    if (self) {
      const bob = Math.sin(this.time * 0.005) * 1.5;
      const iy = hY - 5 + bob;
      E(0, iy, 3.5, 1.8, "rgba(126,224,255,0.6)");
      E(0, iy - 0.5, 2, 1, "rgba(126,224,255,0.9)");
    }
  }

  private drawShirtImage(src: string, x: number, y: number, w: number, h: number, transform: ShirtArtTransform) {
    let image = this.shirtImages.get(src);
    if (!image) {
      image = new Image();
      image.src = src;
      this.shirtImages.set(src, image);
    }
    if (!image.complete || image.naturalWidth === 0) return;
    const t = transform;
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.roundRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), 1.2);
    this.ctx.clip();
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.globalAlpha = 0.9;
    const cx = x + w / 2 + t.x;
    const cy = y + h / 2 + t.y;
    this.ctx.translate(cx, cy);
    this.ctx.rotate((t.rotation * Math.PI) / 180);
    this.ctx.scale(t.scaleX, t.scaleY);
    this.ctx.drawImage(image, -w / 2, -h / 2, w, h);
    this.ctx.globalAlpha = 1;
    this.ctx.restore();
  }

  private drawTargetMarker(tx: number, ty: number) {
    const x = tx * TILE;
    const y = ty * TILE;
    const pulse = (Math.sin(this.time * 0.006) + 1) / 2;
    this.ctx.strokeStyle = `rgba(126,224,255,${0.5 + pulse * 0.5})`;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    this.px(x, y - 5 - pulse * 2, 4, 2, "#7ee0ff");
    this.px(x + 12, y - 5 - pulse * 2, 4, 2, "#7ee0ff");
  }

  private drawSigns(x0: number, y0: number, x1: number, y1: number) {
    for (const key of Object.keys(this.signs)) {
      const raw = this.signs[key];
      if (!raw) continue;
      const [xs, ys] = key.split("_");
      const tx = Number(xs);
      const ty = Number(ys);
      if (tx < x0 || tx > x1 || ty < y0 || ty > y1) continue;
      const { text, size, color, bg, w, h } = decodeSign(raw);
      if (!text) continue;
      const x = tx * TILE;
      const y = ty * TILE;
      const cx = x + TILE / 2;
      const charW = Math.max(3.4, size * 0.52);
      const pw = Math.max(12, text.length * charW + 8);
      const bw = pw * w;
      const bh = (size + 6) * h;
      // placa
      this.ctx.fillStyle = bg;
      this.ctx.fillRect(cx - bw / 2, y - bh - 4, bw, bh);
      this.ctx.fillStyle = "rgba(255,255,255,0.14)";
      this.ctx.fillRect(cx - bw / 2, y - bh - 4, bw, 2);
      this.ctx.fillStyle = "rgba(0,0,0,0.35)";
      this.ctx.fillRect(cx - bw / 2, y - 5, bw, 2);
      // texto pixel
      this.ctx.font = `700 ${size}px Rubik, monospace`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillStyle = color;
      this.ctx.fillText(text.toUpperCase(), cx, y - bh / 2 - 2);
      this.ctx.textBaseline = "alphabetic";
    }
  }

  private drawEditorOverlay(x0: number, y0: number, x1: number, y1: number) {
    const { ctx } = this;
    ctx.strokeStyle = "rgba(126,224,255,0.13)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = x0; x <= x1 + 1; x++) {
      ctx.moveTo(x * TILE, y0 * TILE);
      ctx.lineTo(x * TILE, (y1 + 1) * TILE);
    }
    for (let y = y0; y <= y1 + 1; y++) {
      ctx.moveTo(x0 * TILE, y * TILE);
      ctx.lineTo((x1 + 1) * TILE, y * TILE);
    }
    ctx.stroke();
    const h = this.editor.hover;
    if (h.x >= 0 && h.y >= 0) {
      ctx.fillStyle = "rgba(126,224,255,0.22)";
      ctx.fillRect(h.x * TILE, h.y * TILE, TILE * this.editor.w, TILE * this.editor.h);
      ctx.strokeStyle = "#7ee0ff";
      ctx.lineWidth = 1;
      ctx.strokeRect(h.x * TILE + 0.5, h.y * TILE + 0.5, TILE * this.editor.w - 1, TILE * this.editor.h - 1);
    }
  }
}
