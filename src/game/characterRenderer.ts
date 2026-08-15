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

const shade = (hex: string, amt: number): string => {
  const n = parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(n)) return hex;
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
};

const irisFromHair = (hair: string): string => {
  let h = 0;
  for (let i = 0; i < hair.length; i++) h = (h * 31 + hair.charCodeAt(i)) >>> 0;
  const palette = ["#506b90", "#44825d", "#7c5a3b", "#6a549a", "#4a4f5a", "#956236"];
  return palette[h % palette.length];
};

const shirtImageCache = new Map<string, HTMLImageElement>();

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
}

/**
 * Render Character HD v2
 *
 * IMPORTANTE:
 * - O tamanho NO MUNDO permanece praticamente o mesmo do renderer antigo.
 * - A arte é desenhada internamente em uma grade 4x maior e depois reduzida
 *   com nearest-neighbor. Isso cria mais detalhes sem deixar o personagem gigante.
 * - Não usa "scale(4)" no canvas principal.
 * - O resultado é um sprite pixel-art detalhado, não uma ampliação do sprite antigo.
 *
 * Perfil visual:
 * - 32/64-bit RPG pixel art
 * - rosto com olhos, sobrancelhas, nariz e boca
 * - cabelo com volume e vários tons
 * - uniforme com gola, lapelas, botões, bolsos, ombreiras e distintivos
 * - mãos e calçados definidos
 * - sombra e outline seletivos
 */
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  opts: CharacterOpts
) {
  const pele = opts.pele ?? "#f0c396";
  const sexo = opts.sexo ?? "masculino";
  const emprego = opts.emprego ?? "desempregado";
  const uniforme = opts.uniforme ?? null;
  const armedItem = opts.armedItem ?? null;
  const cabeloEstilo = opts.cabeloEstilo ?? "curto";
  const camisaModelo = opts.camisaModelo ?? "camiseta";
  const inferiorModelo = opts.inferiorModelo ?? "calca";
  const calcaCor = opts.calcaCor ?? "#2f3b57";
  const sapatoModelo = opts.sapatoModelo ?? "tenis";
  const sapatoCor = opts.sapatoCor ?? "#1a1f2c";
  const camisaImagem = opts.camisaImagem ?? "";
  const camisaTransform = opts.camisaTransform ?? {
    x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0,
  };
  const dir = opts.dir ?? "down";
  const anim = opts.anim ?? 0;
  const self = opts.self ?? false;
  const time = opts.time ?? 0;

  const isFem = sexo === "feminino";
  const body = getGenderBodyStyle(toBodyGender(sexo));
  const u = uniforme ?? getUniform(emprego);
  const cor = u?.cor ?? opts.cor;
  const armed = armedItem === "arma_fogo" || armedItem === "municao";

  const step = Math.sin(anim * 6);
  const legOff = anim ? step * 1.15 : 0;
  const armSwing = anim ? step * 0.75 : 0;
  const breathY = Math.sin(time * 0.0028) * 0.16;

  /*
   * Mantemos aproximadamente 24x34 unidades no canvas principal.
   * A arte interna é 4x: 96x136.
   */
  const S = 4;
  const W = 96;
  const H = 136;

  const off = document.createElement("canvas");
  off.width = W;
  off.height = H;

  const g = off.getContext("2d");
  if (!g) return;

  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, W, H);

  const P = (v: number) => Math.round(v * S);

  const R = (
    dx: number,
    dy: number,
    w: number,
    h: number,
    c: string
  ) => {
    g.fillStyle = c;
    g.fillRect(P(dx), P(dy), Math.max(1, P(w)), Math.max(1, P(h)));
  };

  const poly = (points: Array<[number, number]>, c: string) => {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(P(points[0][0]), P(points[0][1]));
    for (let i = 1; i < points.length; i++) {
      g.lineTo(P(points[i][0]), P(points[i][1]));
    }
    g.closePath();
    g.fill();
  };

  const corH = shade(cor, 34);
  const corH2 = shade(cor, 18);
  const corS = shade(cor, -24);
  const corD = shade(cor, -48);
  const corD2 = shade(cor, -66);

  const skH = shade(pele, 22);
  const sk = pele;
  const skS = shade(pele, -22);
  const skD = shade(pele, -42);

  const hair = opts.cabelo;
  const hH = shade(hair, 28);
  const hH2 = shade(hair, 12);
  const hS = shade(hair, -28);
  const hD = shade(hair, -46);
  const iris = irisFromHair(hair);

  const pB = u ? shade(cor, -34) : calcaCor;
  const pH = shade(pB, 20);
  const pS = shade(pB, -22);
  const pD = shade(pB, -46);

  const shoeH = shade(sapatoCor, 24);
  const shoeS = shade(sapatoCor, -24);
  const shoeD = shade(sapatoCor, -48);

  const cx = 12;
  const top = -0.15;

  // ─────────────────────────────────────────────
  // 0. Sombra no chão — pequena, para não aumentar o footprint
  // ─────────────────────────────────────────────
  R(cx - 7, 31.0, 14, 0.7, "rgba(0,0,0,0.20)");
  R(cx - 5, 30.4, 10, 0.7, "rgba(0,0,0,0.14)");
  R(cx - 3, 30.0, 6, 0.5, "rgba(0,0,0,0.10)");

  // ─────────────────────────────────────────────
  // 1. Pernas / calça
  // ─────────────────────────────────────────────
  const legTop = 20.0;
  const leftLeg = -3.8 + Math.max(0, legOff);
  const rightLeg = 0.2 + Math.max(0, -legOff);

  R(cx + leftLeg - 0.45, legTop, 4.25, 8.3, pD);
  R(cx + rightLeg - 0.45, legTop, 4.25, 8.3, pD);

  R(cx + leftLeg, legTop + 0.3, 3.35, 7.4, pB);
  R(cx + rightLeg, legTop + 0.3, 3.35, 7.4, pB);

  R(cx + leftLeg + 0.25, legTop + 0.45, 2.2, 1.15, pH);
  R(cx + rightLeg + 0.25, legTop + 0.45, 2.2, 1.15, pH);

  R(cx + leftLeg + 2.65, legTop + 1.2, 0.45, 5.9, pS);
  R(cx + rightLeg + 2.65, legTop + 1.2, 0.45, 5.9, pS);

  R(cx + leftLeg + 0.2, legTop + 6.5, 2.9, 0.65, pS);
  R(cx + rightLeg + 0.2, legTop + 6.5, 2.9, 0.65, pS);

  // Cinto
  R(cx - 4.5, legTop - 0.55, 9, 1.15, shade(pB, -18));
  R(cx - 0.65, legTop - 0.65, 1.3, 1.35, "#b89a4a");
  R(cx - 0.35, legTop - 0.42, 0.7, 0.75, "#e1c46b");

  // ─────────────────────────────────────────────
  // 2. Sapatos — desenho com sola, biqueira e brilho
  // ─────────────────────────────────────────────
  const drawShoe = (sx: number, sy: number, flip = false) => {
    const bx = cx + sx;
    R(bx - (flip ? 0.15 : 0.35), sy, 4.0, 2.15, shoeD);
    R(bx - (flip ? 0.05 : 0.2), sy - 0.35, 3.45, 1.7, sapatoCor);
    R(bx + (flip ? 0.2 : 0.0), sy - 0.2, 2.25, 0.48, shoeH);
    R(bx + (flip ? 2.5 : 0.3), sy + 0.8, 0.75, 0.42, shoeS);
    R(bx - 0.25, sy + 1.9, 4.4, 0.55, "#0b0e15");
    R(bx + 0.25, sy + 1.35, 2.7, 0.3, shade(sapatoCor, 12));
  };

  drawShoe(leftLeg - 0.15, 28.0 + Math.max(0, legOff) * 0.1, false);
  drawShoe(rightLeg + 0.25, 28.0 + Math.max(0, -legOff) * 0.1, true);

  // ─────────────────────────────────────────────
  // 3. Tronco
  // ─────────────────────────────────────────────
  const tY = 10.2 + breathY;
  const tW = isFem ? 9.2 : 11.2;
  const tX = cx - tW / 2;

  // Silhueta / outline
  R(tX - 0.65, tY - 0.5, tW + 1.3, 11.2, corD2);

  // Ombros
  poly([
    [tX - 0.55, tY + 0.1],
    [tX + 1.3, tY - 0.5],
    [tX + tW - 1.3, tY - 0.5],
    [tX + tW + 0.55, tY + 0.1],
    [tX + tW - 0.25, tY + 2.0],
    [tX + 0.25, tY + 2.0],
  ], corD);

  R(tX, tY, tW, 9.8, cor);
  R(tX + 0.45, tY + 0.35, tW - 0.9, 1.6, corH);
  R(tX + 0.4, tY + 7.2, tW - 0.8, 2.2, corS);

  // Contorno lateral e cintura
  R(tX, tY + 2, 0.65, 6.5, corH2);
  R(tX + tW - 0.65, tY + 2, 0.65, 6.5, corD);
  if (isFem) {
    R(tX + 0.6, tY + 4.4, 0.7, 2.5, corS);
    R(tX + tW - 1.3, tY + 4.4, 0.7, 2.5, corS);
  }

  // ─────────────────────────────────────────────
  // 4. Uniforme detalhado
  // ─────────────────────────────────────────────
  if (u) {
    // Gola
    R(cx - 3.25, tY - 0.25, 2.5, 1.2, corD);
    R(cx + 0.75, tY - 0.25, 2.5, 1.2, corD);
    poly([
      [cx - 3.0, tY + 0.4],
      [cx - 1.2, tY + 0.4],
      [cx - 0.5, tY + 2.2],
      [cx - 2.0, tY + 1.55],
    ], corH2);
    poly([
      [cx + 3.0, tY + 0.4],
      [cx + 1.2, tY + 0.4],
      [cx + 0.5, tY + 2.2],
      [cx + 2.0, tY + 1.55],
    ], corS);

    // Linha central / abertura
    R(cx - 0.42, tY + 1.2, 0.84, 7.8, corD);

    // Botões
    for (let i = 0; i < 4; i++) {
      const by = tY + 2.0 + i * 1.65;
      R(cx - 0.22, by, 0.44, 0.44, "#d6b65a");
      R(cx - 0.10, by + 0.08, 0.20, 0.20, "#f0d67b");
    }

    // Bolsos
    R(cx - 4.0, tY + 2.45, 3.0, 2.0, corD);
    R(cx - 3.65, tY + 2.72, 2.3, 1.25, corS);
    R(cx - 3.35, tY + 2.72, 1.7, 0.35, corH2);

    R(cx + 1.0, tY + 2.45, 3.0, 2.0, corD);
    R(cx + 1.35, tY + 2.72, 2.3, 1.25, corS);
    R(cx + 1.35, tY + 2.72, 1.7, 0.35, corH2);

    // Ombreiras
    R(tX - 0.45, tY + 0.1, 2.55, 1.0, corD);
    R(tX - 0.1, tY + 0.1, 1.9, 0.5, corH2);
    R(tX + tW - 2.1, tY + 0.1, 2.55, 1.0, corD);
    R(tX + tW - 1.8, tY + 0.1, 1.9, 0.5, corH2);

    // Insígnias / medalhas — pequenos blocos com leitura visual
    R(cx - 3.1, tY + 5.0, 1.0, 0.65, "#c9ad5a");
    R(cx - 2.8, tY + 5.15, 0.35, 0.35, "#e7d47c");
    R(cx - 1.85, tY + 5.0, 0.75, 0.65, "#4f76a8");
    R(cx - 1.6, tY + 5.15, 0.3, 0.35, "#9fc0e8");

    R(cx + 1.1, tY + 5.0, 1.0, 0.65, "#9b3939");
    R(cx + 1.35, tY + 5.15, 0.35, 0.35, "#d86565");
    R(cx + 2.35, tY + 5.0, 0.75, 0.65, "#4d8a65");

    // Faixa/colete existentes
    if (u.colete) {
      R(cx - 3.7, tY + 1.6, 7.4, 5.6, u.colete);
      R(cx - 3.7, tY + 1.6, 7.4, 0.8, shade(u.colete, 24));
      R(cx - 3.7, tY + 6.25, 7.4, 0.9, shade(u.colete, -22));
      // recoloca alguns elementos de destaque por cima do colete
      R(cx - 3.1, tY + 2.45, 2.1, 0.75, shade(u.colete, -30));
      R(cx + 1.0, tY + 2.45, 2.1, 0.75, shade(u.colete, -30));
    }
    if (u.faixa) {
      R(cx - 5.0, tY + 5.1, 10, 0.75, u.faixa);
    }
  } else {
    // Roupas civis detalhadas
    if (camisaModelo === "camisa") {
      R(cx - 3.2, tY + 0.4, 2.5, 1.4, corH);
      R(cx + 0.7, tY + 0.4, 2.5, 1.4, corH);
      R(cx - 0.38, tY + 1.2, 0.76, 8, corD);
      for (const by of [3.0, 5.0, 7.0]) R(cx - 0.25, tY + by, 0.5, 0.5, "#e7e7e7");
    } else if (camisaModelo === "jaqueta") {
      R(tX + 0.35, tY + 0.8, 1.45, 8.1, corS);
      R(tX + tW - 1.8, tY + 0.8, 1.45, 8.1, corS);
      R(cx - 0.4, tY + 0.8, 0.8, 8.1, "#c8ccd4");
    } else if (camisaModelo === "blusa") {
      R(tX + 0.55, tY + 3.6, tW - 1.1, 0.7, corS);
    } else {
      R(cx - 1.9, tY, 3.8, 1.2, corD);
      R(cx - 1.25, tY + 0.25, 2.5, 0.5, corH2);
    }
  }

  // Estampa, se existir
  if (camisaImagem && !u?.colete) {
    const image = shirtImageCache.get(camisaImagem) ??
      (() => {
        const img = new Image();
        img.src = camisaImagem;
        shirtImageCache.set(camisaImagem, img);
        return img;
      })();

    if (image.complete && image.naturalWidth > 0) {
      g.save();
      g.beginPath();
      g.rect(P(tX), P(tY), P(tW), P(10));
      g.clip();
      g.imageSmoothingEnabled = false;
      g.globalAlpha = 0.88;
      const tr = camisaTransform;
      g.translate(P(cx + tr.x), P(tY + 4.6 + tr.y));
      g.rotate((tr.rotation * Math.PI) / 180);
      g.scale(tr.scaleX, tr.scaleY);
      g.drawImage(image, -P((tW - 1.5) / 2), -P(2.8), P(tW - 1.5), P(5.6));
      g.restore();
    }
  }

  // ─────────────────────────────────────────────
  // 5. Braços — anatomia mais legível
  // ─────────────────────────────────────────────
  const bW = isFem ? 1.95 : 2.35;
  const armY = tY + 1.2;

  // Esquerdo
  R(tX - bW - 0.35, armY + armSwing, bW + 0.35, 7.2, corD);
  R(tX - bW, armY + 0.25 + armSwing, bW - 0.15, 5.8, cor);
  R(tX - bW + 0.35, armY + 0.4 + armSwing, 0.55, 4.6, corH2);
  R(tX - bW, armY + 6.0 + armSwing, bW - 0.15, 2.0, sk);
  R(tX - bW + 0.35, armY + 6.0 + armSwing, 0.7, 0.75, skH);
  R(tX - bW - 0.1, armY + 7.75 + armSwing, bW + 0.2, 0.55, skD);

  // Direito
  R(tX + tW - 0.05, armY - armSwing, bW + 0.35, 7.2, corD);
  R(tX + tW + 0.1, armY + 0.25 - armSwing, bW - 0.15, 5.8, cor);
  R(tX + tW + 0.1, armY + 0.4 - armSwing, 0.55, 4.6, corH2);
  R(tX + tW + 0.1, armY + 6.0 - armSwing, bW - 0.15, 2.0, sk);
  R(tX + tW + 0.1, armY + 6.0 - armSwing, 0.7, 0.75, skH);
  R(tX + tW - 0.1, armY + 7.75 - armSwing, bW + 0.2, 0.55, skD);

  // Arma
  if (armed) {
    const weaponX = dir === "left" ? cx - 8 : cx + 5.5;
    R(weaponX, tY + 4.8, 1.1, 6.0, "#11151d");
    R(weaponX - 0.4, tY + 4.3, 1.9, 1.1, "#313a47");
    R(weaponX + (dir === "left" ? -2.0 : 1.1), tY + 9.5, 1.5, 1.2, "#242b35");
  }

  // ─────────────────────────────────────────────
  // 6. Pescoço
  // ─────────────────────────────────────────────
  R(cx - 1.55 * body.neckScale, 8.25 + breathY, 3.1 * body.neckScale, 2.3, skD);
  R(cx - 1.15 * body.neckScale, 8.0 + breathY, 2.3 * body.neckScale, 2.1, sk);

  // ─────────────────────────────────────────────
  // 7. Cabeça — maior densidade de detalhes
  // ─────────────────────────────────────────────
  const hW = isFem ? 8.4 : 9.0;
  const hH = isFem ? 8.8 : 9.2;
  const hX = cx - hW / 2;
  const hY = 0.25 + breathY;

  // Silhueta
  R(hX - 0.55, hY + 0.55, hW + 1.1, hH - 0.1, hD);
  R(hX - 0.25, hY + 0.9, hW + 0.5, hH - 0.9, skD);

  // Face
  R(hX + 0.25, hY + 0.65, hW - 0.5, hH - 1.1, sk);
  R(hX + 0.75, hY + 0.8, hW - 1.5, 1.9, skH);
  R(hX + 0.45, hY + 6.8, hW - 0.9, 1.5, skS);

  // Laterais do rosto / mandíbula
  R(hX + 0.25, hY + 3.8, 0.7, 3.0, skS);
  R(hX + hW - 0.95, hY + 3.8, 0.7, 3.0, skS);
  R(hX + 1.2, hY + 7.5, hW - 2.4, 0.7, skD);

  // Orelhas
  R(hX - 0.85, hY + 3.6, 1.0, 2.5, skD);
  R(hX - 0.55, hY + 3.85, 0.65, 1.65, sk);
  R(hX + hW - 0.15, hY + 3.6, 1.0, 2.5, skD);
  R(hX + hW - 0.1, hY + 3.85, 0.65, 1.65, sk);

  // ─────────────────────────────────────────────
  // 8. Cabelo — volume, mechas e profundidade
  // ─────────────────────────────────────────────
  const hairFront = (style: HairStyle) => {
    // Base superior
    R(hX - 0.15, hY - 0.65, hW + 0.3, 3.2, hD);
    R(hX + 0.25, hY - 0.45, hW - 0.5, 2.45, hair);
    R(hX + 1.0, hY - 0.25, hW - 2.5, 0.65, hH);
    R(hX + 0.6, hY + 1.1, 1.2, 1.0, hH2);
    R(hX + hW - 1.8, hY + 1.1, 1.2, 1.0, hS);

    switch (style) {
      case "raspado":
        R(hX + 0.8, hY + 0.4, hW - 1.6, 1.1, hS);
        break;

      case "moicano":
        R(cx - 1.8, hY - 2.5, 3.6, 4.2, hD);
        R(cx - 1.25, hY - 2.3, 2.5, 3.8, hair);
        R(cx - 0.7, hY - 2.0, 1.2, 2.6, hH);
        break;

      case "afro":
        R(hX - 1.1, hY - 1.2, hW + 2.2, hH + 0.8, hD);
        R(hX - 0.55, hY - 0.85, hW + 1.1, hH - 0.1, hair);
        for (let i = 0; i < 8; i++) {
          const bx = hX - 0.2 + i * 1.25;
          R(bx, hY - 0.55 + (i % 2) * 0.25, 0.65, 0.55, i % 3 === 0 ? hH : hH2);
        }
        break;

      case "cacheado":
        for (let i = 0; i < 6; i++) {
          const bx = hX + 0.4 + i * 1.35;
          const by = hY + 0.8 + (i % 2) * 0.7;
          R(bx, by, 1.25, 1.25, i % 2 ? hH2 : hair);
          R(bx + 0.25, by, 0.55, 0.35, hH);
        }
        R(hX - 0.35, hY + 2.8, 1.25, 3.6, hair);
        R(hX + hW - 0.9, hY + 2.8, 1.25, 3.6, hS);
        break;

      case "ondulado":
        R(hX - 0.3, hY + 2.4, 1.5, 4.4, hair);
        R(hX + hW - 1.2, hY + 2.2, 1.5, 4.6, hS);
        R(hX + 1.1, hY + 2.3, 2.2, 0.8, hH2);
        R(hX + hW - 3.0, hY + 3.0, 1.8, 0.7, hH2);
        break;

      case "franja":
        poly([
          [hX + 0.35, hY + 1.3],
          [hX + hW - 0.45, hY + 1.3],
          [hX + hW - 1.3, hY + 3.55],
          [cx + 0.5, hY + 3.1],
          [cx - 0.2, hY + 2.6],
          [hX + 1.0, hY + 3.4],
        ], hair);
        R(hX + 1.0, hY + 1.3, 1.8, 0.5, hH);
        break;

      case "trancas":
        R(hX - 0.35, hY + 2.5, 1.5, 6.0, hair);
        R(hX + hW - 1.15, hY + 2.5, 1.5, 6.0, hS);
        for (let i = 0; i < 4; i++) {
          R(hX - 0.2, hY + 3 + i * 1.25, 1.15, 0.55, i % 2 ? hH : hS);
          R(hX + hW - 0.95, hY + 3 + i * 1.25, 1.15, 0.55, i % 2 ? hH2 : hS);
        }
        break;

      case "bob":
        R(hX - 0.45, hY + 2.5, 1.5, 4.7, hair);
        R(hX + hW - 1.05, hY + 2.5, 1.5, 4.7, hS);
        R(hX + 1.0, hY + 2.3, hW - 2.0, 0.7, hH2);
        break;

      case "coque":
        R(cx - 1.9, hY - 2.0, 3.8, 3.1, hD);
        R(cx - 1.45, hY - 1.75, 2.9, 2.6, hair);
        R(cx - 0.8, hY - 1.55, 1.2, 0.55, hH);
        break;

      case "rabo":
        R(hX + hW - 0.1, hY + 1.8, 2.4, 6.2, hD);
        R(hX + hW + 0.25, hY + 2.0, 1.7, 5.4, hair);
        R(hX + hW + 0.4, hY + 2.1, 0.6, 4.2, hH);
        break;

      default:
        // Corte curto / social / longo
        R(hX + 0.4, hY + 1.8, hW - 0.8, 1.15, hair);
        R(hX + 0.9, hY + 1.8, 2.0, 0.45, hH);
        R(hX + hW - 2.5, hY + 1.8, 1.35, 0.45, hS);

        if (style === "social") {
          R(hX + 0.5, hY + 2.3, 1.0, 2.7, hS);
          R(hX + 1.0, hY + 2.3, 0.55, 2.0, hH2);
        }

        if (style === "longo" || style === "longo_liso") {
          R(hX - 0.2, hY + 2.4, 1.5, 7.0, hair);
          R(hX + hW - 1.3, hY + 2.4, 1.5, 7.0, hS);
          R(hX + 0.05, hY + 7.5, 1.2, 1.4, hS);
          R(hX + hW - 1.05, hY + 7.5, 1.2, 1.4, hD);
        }
        break;
    }
  };

  if (dir !== "up") {
    hairFront(cabeloEstilo);
  } else {
    R(hX - 0.25, hY + 0.1, hW + 0.5, hH - 0.3, hD);
    R(hX + 0.25, hY + 0.15, hW - 0.5, hH - 1.0, hair);
    R(hX + 1.0, hY + 0.3, hW - 2.0, 0.7, hH);
  }

  // ─────────────────────────────────────────────
  // 9. Boina / capacete do uniforme
  // ─────────────────────────────────────────────
  if (u?.capacete) {
    R(hX - 0.75, hY - 1.0, hW + 1.5, 3.0, shade(u.capacete, -28));
    R(hX - 0.35, hY - 1.25, hW + 0.7, 2.45, u.capacete);
    R(hX + 0.5, hY - 0.95, hW - 1.7, 0.7, shade(u.capacete, 18));
    R(hX - 1.0, hY + 1.0, hW + 2.0, 0.7, shade(u.capacete, -35));

    // Insígnia central
    R(cx - 0.65, hY - 0.8, 1.3, 1.25, "#b89a4d");
    R(cx - 0.35, hY - 0.55, 0.7, 0.75, "#e2c86e");
    R(cx - 0.15, hY - 0.35, 0.3, 0.35, "#596b42");
  }

  // ─────────────────────────────────────────────
  // 10. Rosto — olhos, sobrancelhas, nariz e boca
  // ─────────────────────────────────────────────
  if (dir !== "up") {
    const faceOff = dir === "left" ? -1.0 : dir === "right" ? 1.0 : 0;
    const eyeY = hY + 4.55;

    const drawEye = (ex: number, brow: string) => {
      // Sombra / contorno
      R(ex - 0.95, eyeY - 0.8, 1.9, 1.65, skD);
      // Branco
      R(ex - 0.72, eyeY - 0.55, 1.45, 1.15, "#f4f3ed");
      // Íris
      R(ex - 0.28 + faceOff * 0.08, eyeY - 0.45, 0.68, 0.95, iris);
      // Pupila
      R(ex - 0.06 + faceOff * 0.08, eyeY - 0.35, 0.32, 0.72, "#10141b");
      // Brilho
      R(ex + 0.05 + faceOff * 0.08, eyeY - 0.3, 0.18, 0.18, "#ffffff");
      // Sobrancelha
      R(ex - 0.95, eyeY - 1.45, 1.9, isFem ? 0.38 : 0.55, brow);
    };

    drawEye(cx - 2.25 + faceOff, shade(hair, -18));
    drawEye(cx + 2.25 + faceOff, shade(hair, -18));

    // Nariz com luz e sombra
    R(cx - 0.25 + faceOff * 0.35, hY + 5.35, 0.55, 1.05, skS);
    R(cx + 0.15 + faceOff * 0.35, hY + 5.2, 0.35, 0.45, skH);

    // Bochechas
    if (isFem) {
      R(cx - 3.45 + faceOff, hY + 5.75, 0.8, 0.45, "rgba(224,110,124,0.34)");
      R(cx + 2.65 + faceOff, hY + 5.75, 0.8, 0.45, "rgba(224,110,124,0.34)");
    }

    // Boca
    R(cx - 1.0 + faceOff, hY + 6.9, 2.0, 0.48, shade(pele, -40));
    R(cx - 0.55 + faceOff, hY + 7.35, 1.1, 0.32, shade(pele, -16));
    if (isFem) {
      R(cx - 0.75 + faceOff, hY + 6.78, 1.5, 0.32, "#a55c62");
    }
  }

  // ─────────────────────────────────────────────
  // 11. Indicador self
  // ─────────────────────────────────────────────
  if (self) {
    const bob = Math.sin(time * 0.005) * 0.6;
    R(cx - 1.5, hY - 4.0 + bob, 3.0, 0.6, "#7ee0ff");
    R(cx - 0.7, hY - 3.35 + bob, 1.4, 0.35, "#b7f2ff");
  }

  // ─────────────────────────────────────────────
  // 12. Composição no canvas principal
  // ─────────────────────────────────────────────
  //
  // 24 x 34 unidades:
  // - mesma ordem de grandeza do renderer original;
  // - não escala o personagem 4x no mundo;
  // - a escala só aumenta a resolução interna da arte.
  //
  // A posição x/y continua sendo o centro/base do personagem.
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const drawW = 24;
  const drawH = 34;

  // Centraliza a arte no ponto original.
  ctx.drawImage(
    off,
    x - drawW / 2,
    y - drawH,
    drawW,
    drawH
  );

  ctx.restore();
}