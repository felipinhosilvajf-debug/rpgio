import type {
  BottomStyle,
  Dir,
  HairStyle,
  ShirtArtTransform,
  ShirtStyle,
  ShoeStyle,
  Sexo,
  Uniform,
} from "./types";
import { getUniform } from "./jobs";
import { getGenderBodyStyle, toBodyGender } from "../utils/avatarHelpers";

/**
 * AvatarRenderCanvas V2
 *
 * Renderer em camadas para o RPGIO.
 *
 * IMPORTANTE:
 * - Mantém a mesma API drawCharacter(ctx, x, y, opts).
 * - Mantém CharacterOpts compatível com o renderer antigo.
 * - Não toca no Firebase, dados de usuário ou sistemas de jogo.
 * - Usa sprites PNG com nearest-neighbor quando disponíveis.
 * - Possui fallback procedural para o jogo continuar funcionando enquanto os assets
 *   não estiverem todos criados.
 *
 * Estrutura de assets esperada (pode ser alterada em AVATAR_ASSETS):
 * assets/avatar/base/{gender}/{dir}.png
 * assets/avatar/hair/{style}/{dir}.png
 * assets/avatar/clothes/{style}/{dir}.png
 * assets/avatar/bottom/{style}/{dir}.png
 * assets/avatar/shoes/{style}/{dir}.png
 * assets/avatar/uniform/{employment}/{dir}.png
 * assets/avatar/accessories/{item}/{dir}.png
 * assets/avatar/body/{gender}/{dir}.png
 *
 * Cada sprite deve ter o mesmo tamanho lógico, preferencialmente 48x64 ou 64x80.
 */

export interface CharacterOpts {
  cor: string;
  cabelo: string;
  pele?: string;
  sexo?: Sexo;
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
  dir?: Dir;
  anim?: number;
  self?: boolean;
  time?: number;
  /** Escala visual do avatar. 1 = tamanho nativo do asset. */
  scale?: number;
}

type LayerName =
  | "shadow"
  | "body"
  | "bottom"
  | "shoes"
  | "clothes"
  | "uniform"
  | "hairBack"
  | "hairFront"
  | "accessory"
  | "weapon"
  | "self";

interface AvatarAssetSet {
  root: string;
  width: number;
  height: number;
  pixelScale: number;
}

/**
 * Ajuste estes valores uma única vez quando os assets finais forem criados.
 * O renderer não depende de uma engine externa.
 */
export const AVATAR_ASSETS: AvatarAssetSet = {
  root: "/assets/avatar",
  width: 48,
  height: 64,
  pixelScale: 1,
};

const imageCache = new Map<string, HTMLImageElement>();
const failedAssets = new Set<string>();

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const shade = (hex: string, amt: number): string => {
  const n = parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(n)) return hex;
  const r = clamp(((n >> 16) & 255) + amt, 0, 255);
  const g = clamp(((n >> 8) & 255) + amt, 0, 255);
  const b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
};

const safe = (value: string | undefined | null, fallback: string) => {
  const v = String(value ?? fallback).trim();
  return v.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
};

const dirKey = (dir: Dir): string => {
  if (dir === "left") return "left";
  if (dir === "right") return "right";
  if (dir === "up") return "up";
  return "down";
};

const genderKey = (sexo: Sexo): string =>
  sexo === "feminino" ? "female" : "male";

const loadImage = (src: string): HTMLImageElement | null => {
  if (failedAssets.has(src)) return null;
  const cached = imageCache.get(src);
  if (cached) return cached;

  const image = new Image();
  image.decoding = "async";
  image.src = src;
  image.onerror = () => failedAssets.add(src);
  imageCache.set(src, image);
  return image;
};

const asset = (...parts: string[]) =>
  `${AVATAR_ASSETS.root}/${parts.map((p) => safe(p, "default")).join("/")}.png`;

const drawPixelImage = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 1,
) => {
  if (!image.complete || image.naturalWidth <= 0) return false;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.restore();
  return true;
};

const drawAssetLayer = (
  ctx: CanvasRenderingContext2D,
  src: string,
  x: number,
  y: number,
  scale: number,
  alpha = 1,
) => {
  const image = loadImage(src);
  if (!image) return false;
  return drawPixelImage(
    ctx,
    image,
    x - (AVATAR_ASSETS.width * scale) / 2,
    y - AVATAR_ASSETS.height * scale + 4 * scale,
    AVATAR_ASSETS.width * scale,
    AVATAR_ASSETS.height * scale,
    alpha,
  );
};

const drawShirtStamp = (
  ctx: CanvasRenderingContext2D,
  src: string,
  x: number,
  y: number,
  scale: number,
  transform: ShirtArtTransform,
) => {
  const image = loadImage(src);
  if (!image || !image.complete || image.naturalWidth <= 0) return;

  const t = transform;
  const bodyW = 28 * scale;
  const bodyH = 24 * scale;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.beginPath();
  ctx.rect(x - bodyW / 2, y - bodyH + 9 * scale, bodyW, bodyH);
  ctx.clip();
  ctx.globalAlpha = 0.95;
  ctx.translate(x + t.x * scale, y - bodyH / 2 + t.y * scale);
  ctx.rotate((t.rotation * Math.PI) / 180);
  ctx.scale(t.scaleX, t.scaleY);
  ctx.drawImage(image, -bodyW / 2, -3 * scale, bodyW, 8 * scale);
  ctx.restore();
};

/**
 * Fallback leve. Ele não é o renderer final: serve para manter compatibilidade
 * enquanto um asset específico ainda não existe.
 */
const drawFallback = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  opts: CharacterOpts,
) => {
  const pele = opts.pele ?? "#e8b487";
  const sexo = opts.sexo ?? "masculino";
  const emprego = opts.emprego ?? "desempregado";
  const uniforme = opts.uniforme ?? null;
  const dir = opts.dir ?? "down";
  const anim = opts.anim ?? 0;
  const time = opts.time ?? 0;
  const scale = opts.scale ?? 1;
  const isFem = sexo === "feminino";
  const body = getGenderBodyStyle(toBodyGender(sexo));
  const u = uniforme ?? getUniform(emprego);
  const cor = u?.cor ?? opts.cor;
  const step = Math.sin(anim * 6);
  const legOff = anim ? step * 2 * scale : 0;
  const breath = Math.sin(time * 0.0028) * 0.35 * scale;
  const sx = (n: number) => n * scale;
  const R = (dx: number, dy: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x + sx(dx) - sx(w) / 2), Math.round(y + sx(dy) + breath), Math.max(1, Math.round(sx(w))), Math.max(1, Math.round(sx(h))));
  };

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Sombra.
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.fillRect(Math.round(x - sx(9)), Math.round(y + sx(1)), Math.round(sx(18)), Math.max(1, Math.round(sx(3))));

  // Pernas e sapatos.
  const bottom = opts.inferiorModelo === "shorts" || opts.inferiorModelo === "bermuda" ? "#48556f" : (opts.calcaCor ?? "#2f3b57");
  R(-2.2, -7 + legOff, 4.2, 8, shade(bottom, -28));
  R(2.2, -7 - legOff, 4.2, 8, shade(bottom, -28));
  R(-2.2, -2.2 + legOff, 4, 2.3, opts.sapatoCor ?? "#171b25");
  R(2.2, -2.2 - legOff, 4, 2.3, opts.sapatoCor ?? "#171b25");

  // Tronco.
  const tw = isFem ? 10 : 12;
  R(0, -15, tw + 1.2, 12, shade(cor, -48));
  R(0, -15, tw, 10.5, cor);
  R(0, -14, tw - 1, 2.5, shade(cor, 35));
  R(0, -6.5, tw - 1, 2, shade(cor, -24));

  // Braços.
  const arm = shade(cor, -16);
  R(-tw / 2 - 1.2, -11, 2.5, 9, arm);
  R(tw / 2 + 1.2, -11, 2.5, 9, arm);
  R(-tw / 2 - 1.2, -6.4, 2.3, 2.4, pele);
  R(tw / 2 + 1.2, -6.4, 2.3, 2.4, pele);

  // Pescoço + cabeça.
  R(0, -21, 3, 2.2, shade(pele, -24));
  R(0, -26, isFem ? 8 : 9, 8.5, shade(pele, -42));
  R(0, -26, isFem ? 7.2 : 8.2, 7.7, pele);
  R(0, -29, isFem ? 6 : 7, 2, shade(pele, 20));

  // Cabelo.
  const hair = opts.cabelo ?? "#2b2020";
  R(0, -29, isFem ? 7.4 : 8.4, 3.4, hair);
  R(-3.1, -26, 1.5, 4, hair);
  R(3.1, -26, 1.5, 4, hair);

  // Rosto, somente quando olhando para frente/lado.
  if (dir !== "up") {
    const off = dir === "left" ? -1 : dir === "right" ? 1 : 0;
    R(-2.2 + off, -26.1, 1.5, 1.5, "#f3f5f7");
    R(2.2 + off, -26.1, 1.5, 1.5, "#f3f5f7");
    R(-2.2 + off, -26.1, 0.7, 1, "#252b35");
    R(2.2 + off, -26.1, 0.7, 1, "#252b35");
    R(off, -23.5, 0.8, 0.8, shade(pele, -28));
    R(off, -21.8, 2, 0.6, shade(pele, -36));
  }

  ctx.restore();
};

/**
 * Resolve o caminho dos sprites para uma camada.
 * A ordem é importante: o primeiro asset encontrado é usado.
 */
const resolveLayer = (
  layer: LayerName,
  opts: CharacterOpts,
  dir: Dir,
): string[] => {
  const d = dirKey(dir);
  const gender = genderKey(opts.sexo ?? "masculino");
  const hair = safe(opts.cabeloEstilo, "curto");
  const shirt = safe(opts.camisaModelo, "camiseta");
  const bottom = safe(opts.inferiorModelo, "calca");
  const shoe = safe(opts.sapatoModelo, "tenis");
  const job = safe(opts.emprego, "desempregado");
  const item = safe(opts.armedItem, "none");

  switch (layer) {
    case "shadow": return [asset("shadow", d)];
    case "body": return [asset("body", gender, d), asset("base", gender, d)];
    case "bottom": return [asset("bottom", bottom, gender, d), asset("bottom", bottom, d)];
    case "shoes": return [asset("shoes", shoe, d)];
    case "clothes": return [asset("clothes", shirt, gender, d), asset("clothes", shirt, d)];
    case "uniform": return opts.uniforme ? [asset("uniform", job, d), asset("uniform", "default", d)] : [];
    case "hairBack": return [asset("hair", hair, "back", gender, d)];
    case "hairFront": return [asset("hair", hair, "front", gender, d), asset("hair", hair, d)];
    case "accessory": return [];
    case "weapon": return opts.armedItem ? [asset("accessories", item, d)] : [];
    case "self": return [];
  }
};

/**
 * Renderer principal.
 * Mantém a assinatura antiga para minimizar alterações no restante do RPGIO.
 */
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  opts: CharacterOpts,
) {
  const dir = opts.dir ?? "down";
  const scale = opts.scale ?? 1;
  const sexo = opts.sexo ?? "masculino";
  const employmentUniform = opts.uniforme ?? getUniform(opts.emprego ?? "desempregado");

  // A composição inteira é desenhada em pixels inteiros.
  // Isso evita borramento em zooms não inteiros.
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // 1) Tenta renderização por sprites.
  const layers: LayerName[] = [
    "shadow",
    "body",
    "bottom",
    "shoes",
    "hairBack",
    "clothes",
    "uniform",
    "hairFront",
    "accessory",
    "weapon",
  ];

  let renderedAny = false;
  let renderedBody = false;
  let attemptedAny = false;

  for (const layer of layers) {
    const candidates = resolveLayer(layer, { ...opts, sexo, uniforme: employmentUniform }, dir);
    for (const src of candidates) {
      attemptedAny = true;
      if (drawAssetLayer(ctx, src, x, y, scale)) {
        renderedAny = true;
        if (layer === "body") renderedBody = true;
        break;
      }
    }
  }

  // Estampa de camisa continua funcionando com o sistema atual.
  if (opts.camisaImagem && !employmentUniform?.colete) {
    drawShirtStamp(
      ctx,
      opts.camisaImagem,
      x,
      y,
      scale,
      opts.camisaTransform ?? { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    );
    renderedAny = true;
  }

  // Indicador do próprio jogador.
  if (opts.self) {
    const bob = Math.sin((opts.time ?? 0) * 0.005) * 1.2 * scale;
    ctx.fillStyle = "#7ee0ff";
    ctx.fillRect(Math.round(x - 2 * scale), Math.round(y - 62 * scale + bob), Math.max(1, Math.round(4 * scale)), Math.max(1, Math.round(scale)));
  }

  ctx.restore();

  // 2) Fallback se ainda não houver sprites.
  // Isso permite migrar gradualmente, sem quebrar o jogo durante a criação dos assets.
  if (!renderedBody || !attemptedAny) {
    drawFallback(ctx, x, y, opts);
  }
}

/** Limpa o cache de imagens. Útil após trocar assets durante desenvolvimento. */
export function clearAvatarImageCache() {
  imageCache.clear();
  failedAssets.clear();
}

/** Pré-carrega um conjunto de URLs para reduzir pop-in ao entrar na cidade. */
export async function preloadAvatarAssets(urls: string[]) {
  await Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const image = loadImage(src);
          if (!image) return resolve();
          if (image.complete && image.naturalWidth > 0) return resolve();
          image.onload = () => resolve();
          image.onerror = () => {
            failedAssets.add(src);
            resolve();
          };
        }),
    ),
  );
}