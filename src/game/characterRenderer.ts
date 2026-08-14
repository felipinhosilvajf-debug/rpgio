import type { BottomStyle, Dir, HairStyle, ShirtArtTransform, ShirtStyle, ShoeStyle, Sexo, Uniform } from "./types";
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
 * Renderizador de Avatar Pixel Art Autêntico (Estilo Stardew Valley).
 * - Snap estrito de pixels inteiros (Grade Pixel-Perfect).
 * - Cabelos arredondados e volumosos via degraus de pixel (Pixel Steps).
 * - Diferenciação marcada entre feminino (delicado, acinturado) e masculino (robusto, reto).
 */
export function drawCharacter(ctx: CanvasRenderingContext2D, x: number, y: number, opts: CharacterOpts) {
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
  const dir = opts.dir ?? "down";
  const anim = opts.anim ?? 0;
  const self = opts.self ?? false;
  const time = opts.time ?? 0;

  const isFem = sexo === "feminino";
  const body = getGenderBodyStyle(toBodyGender(sexo));

  // Animação calculada em deslocamento de pixels inteiros (1px ou 2px)
  const step = Math.sin(anim * 6);
  const legOff = anim ? Math.round(step * 2) : 0;
  const breathY = Math.sin(time * 0.003) > 0.3 ? 1 : 0; // Bounce discreto de 1px

  // Garante Renderização Pixel Crisp
  ctx.imageSmoothingEnabled = false;

  // Função utilitária para alinhamento estrito à grade (Integer Snap)
  const R = (dx: number, dy: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(
      Math.floor(x + dx),
      Math.floor(y + dy),
      Math.max(1, Math.floor(w)),
      Math.max(1, Math.floor(h))
    );
  };

  const drawShirtStamp = (src: string, sx: number, sy: number, sw: number, sh: number) => {
    let image = shirtImageCache.get(src);
    if (!image) { image = new Image(); image.src = src; shirtImageCache.set(src, image); }
    if (image.complete && image.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(Math.floor(x + sx + 1), Math.floor(y + sy + 1), Math.floor(sw - 2), Math.floor(sh - 2));
      ctx.clip();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, Math.floor(x + sx + 1), Math.floor(y + sy + 1), Math.floor(sw - 2), Math.floor(sh - 2));
      ctx.restore();
    }
  };

  const u = uniforme ?? getUniform(emprego);
  const cor = u?.cor ?? opts.cor;
  const armed = armedItem === "arma_fogo" || armedItem === "municao";
  const regata = camisaModelo === "regata" && !u;
  const shortBottom = inferiorModelo === "shorts" || inferiorModelo === "bermuda";
  const saia = isFem && inferiorModelo === "saia" && !u;

  // Paleta de tons sólidos
  const corH = shade(cor, 35);
  const corS = shade(cor, -30);
  const corD = shade(cor, -60);
  const skH = shade(pele, 20);
  const sk = pele;
  const skS = shade(pele, -28);
  const skD = shade(pele, -50);
  const hHighlight = shade(opts.cabelo, 25);
  const hShadow = shade(opts.cabelo, -35);
  const iris = irisFromHair(opts.cabelo);

  const pB = u ? shade(cor, -35) : calcaCor;
  const pH = shade(pB, 20);
  const pS = shade(pB, -25);
  const pD = shade(pB, -45);
  const armSwing = anim ? Math.round(step * 1) : 0;

  // ── 0. SOMBRA PROJETADA EM PIXEL ART DITHERING ──
  R(-6, 3, 12, 1, "#1c1b24");
  R(-4, 2, 8, 1, "#282636");

  // ── 1. CABELO TRASEIRO (Volume & Caimento Arredondado) ──
  const hY = -28 + breathY;
  const drawBackHair = () => {
    const style = cabeloEstilo;
    const isLong = style === "longo" || style === "longo_liso" || style === "ondulado" || style === "trancas" || style === "bob";

    if (dir === "up" || style === "afro") {
      R(-6, hY + 3, 12, 1, opts.cabelo);
      R(-7, hY + 4, 14, 6, opts.cabelo);
      R(-5, hY + 4, 10, 2, hHighlight);
      R(-7, hY + 9, 14, 1, hShadow);
    }

    if (dir !== "up" && isLong) {
      const hairLen = style === "bob" ? 6 : 10;
      const volExtra = isFem ? 1 : 0;

      // Mecha esquerda volumosa
      R(-6 - volExtra, hY + 3, 3 + volExtra, hairLen, opts.cabelo);
      R(-6 - volExtra, hY + 3, 1, hairLen - 1, hHighlight);
      R(-6 - volExtra, hY + 3 + hairLen - 2, 3 + volExtra, 2, hShadow);

      // Mecha direita volumosa
      R(3, hY + 3, 3 + volExtra, hairLen, opts.cabelo);
      R(5 + volExtra, hY + 3, 1, hairLen - 1, hHighlight);
      R(3, hY + 3 + hairLen - 2, 3 + volExtra, 2, hShadow);
    }

    if (dir !== "up" && style === "rabo") {
      R(4, hY + 3, 4, 9, opts.cabelo);
      R(4, hY + 3, 1, 6, hHighlight);
      R(4, hY + 11, 4, 1, hShadow);
      R(4, hY + 3, 4, 1, "#e2e2ee"); // Elástico
    }
  };
  drawBackHair();

  // ── 2. SAPATOS (Blocky Stardew Style) ──
  const sL = Math.max(0, legOff);
  const sR = Math.max(0, -legOff);
  const shoeD = shade(sapatoCor, -30);
  const shoeH = shade(sapatoCor, 25);
  const boot = sapatoModelo === "bota";

  // Sapato Esquerdo
  R(-5, sL - (boot ? 1 : 0), 4, 2 + (boot ? 1 : 0), shoeD);
  R(-4, sL - (boot ? 1 : 0), 3, 1, sapatoCor);
  R(-4, sL - (boot ? 1 : 0), 1, 1, shoeH);
  R(-5, sL + 2, 4, 1, "#121318");

  // Sapato Direito
  R(1, sR - (boot ? 1 : 0), 4, 2 + (boot ? 1 : 0), shoeD);
  R(2, sR - (boot ? 1 : 0), 3, 1, sapatoCor);
  R(2, sR - (boot ? 1 : 0), 1, 1, shoeH);
  R(1, sR + 2, 4, 1, "#121318");

  // ── 3. PARTE INFERIOR ──
  const legTop = -8;
  if (saia) {
    R(-5, legTop, 10, 4, pD);
    R(-4, legTop, 8, 3, pB);
    R(-4, legTop, 8, 1, pH);
    R(-3, -4 + sL, 2, 3, sk);
    R(1, -4 + sR, 2, 3, sk);
  } else if (shortBottom) {
    R(-4, legTop + sL, 3, 3, pD);
    R(1, legTop + sR, 3, 3, pD);
    R(-3, legTop + sL, 2, 2, pB);
    R(2, legTop + sR, 2, 2, pB);
    R(-3, -4 + sL, 2, 3, sk);
    R(1, -4 + sR, 2, 3, sk);
  } else {
    R(-4, legTop + sL, 3, 6, pD);
    R(1, legTop + sR, 3, 6, pD);
    R(-3, legTop + sL, 2, 5, pB);
    R(2, legTop + sR, 2, 5, pB);
    R(-3, legTop + sL, 2, 1, pH);
    R(2, legTop + sR, 2, 1, pH);
    R(-4, legTop, 8, 1, shade(pB, -20));
    R(-3, legTop, 2, 1, shade(pB, 20));
  }

  // ── 4. TRONCO / CAMISA ──
  const tY = -17 + breathY;
  const tW = isFem ? 8 : 10;
  const tX = -tW / 2;

  R(tX - 1, tY - 1, tW + 2, 10, corD);
  R(tX, tY, tW, 9, cor);
  R(tX, tY, tW, 2, corH);
  R(tX, tY + 7, tW, 2, corS);

  if (isFem) {
    R(tX, tY + 3, 1, 3, corS);
    R(tX + tW - 1, tY + 3, 1, 3, corS);
  }

  if (!u) {
    if (camisaModelo === "camisa") {
      R(-2, tY, 4, 1, corH);
      R(0, tY + 1, 1, 7, corD);
      R(0, tY + 2, 1, 1, "#ffffff");
      R(0, tY + 5, 1, 1, "#ffffff");
    } else if (camisaModelo === "jaqueta") {
      R(tX + 1, tY, 1, 8, corS);
      R(-tX - 2, tY, 1, 8, corS);
      R(0, tY, 1, 8, "#b0b5c0");
    } else if (regata) {
      R(tX, tY, 2, 2, sk);
      R(-tX - 2, tY, 2, 2, sk);
    }
  } else if (u.colete) {
    R(-3, tY + 1, 6, 6, u.colete);
    R(-3, tY + 1, 6, 1, shade(u.colete, 20));
  }

  if (camisaImagem && !u?.colete) {
    drawShirtStamp(camisaImagem, tX, tY, tW, 9);
  }

  // ── 5. BRAÇOS ──
  const bW = isFem ? 2 : 3;
  const armCor = regata ? sk : shade(cor, -15);

  // Esquerdo
  R(tX - bW, tY + 1 + armSwing, bW, 7, armCor);
  R(tX - bW, tY + 8 + armSwing, bW, 2, sk);
  // Direito
  R(tX + tW, tY + 1 - armSwing, bW, 7, armCor);
  R(tX + tW, tY + 8 - armSwing, bW, 2, sk);

  if (armed) {
    const dx = dir === "left" ? -1 : dir === "right" ? 1 : 0;
    const dy = dir === "up" ? -1 : dir === "down" ? 1 : 0;
    R(5 + dx * 2, tY + 4 + dy * 2 - armSwing, 3, 3, "#282e3a");
  }

  // ── 6. PESCOÇO ──
  R(-1, tY - 2, 2, 2, skS);

  // ── 7. CABEÇA ──
  const hW = 8;
  const hH = 8;
  const hX = -4;
  const hYF = hY + 1;

  R(hX - 1, hYF - 1, hW + 2, hH + 2, skD);
  R(hX, hYF, hW, hH, sk);
  R(hX, hYF, hW, 1, skH);
  R(hX, hYF + hH - 1, hW, 1, skS);

  if (isFem) {
    R(-3, hYF + 4, 1, 1, "#e07b88");
    R(2, hYF + 4, 1, 1, "#e07b88");
  }

  // ── 8. CABELO FRONTAL (Arredondado Pixelated & Volumoso) ──
  if (dir !== "up") {
    const topW = isFem ? 6 : 8;
    const midW = isFem ? 10 : 8;

    // Degrau superior (Arredondamento do crânio)
    R(-topW / 2, hYF - 2, topW, 1, opts.cabelo);
    R(-topW / 2 + 1, hYF - 2, topW - 2, 1, hHighlight);

    // Camada principal no topo
    R(-midW / 2, hYF - 1, midW, 3, opts.cabelo);
    R(-midW / 2 + 1, hYF - 1, midW - 2, 1, hHighlight);

    switch (cabeloEstilo) {
      case "franja":
      case "social":
        R(-4, hYF + 1, 8, 2, opts.cabelo);
        R(-3, hYF + 2, 6, 1, hShadow);
        break;

      case "ondulado":
      case "longo":
      case "longo_liso":
        R(-5, hYF + 1, 3, 4, opts.cabelo);
        R(2, hYF + 1, 3, 4, opts.cabelo);
        R(-4, hYF + 1, 1, 3, hHighlight);
        R(3, hYF + 1, 1, 3, hHighlight);
        break;

      case "bob":
        R(-5, hYF + 1, 2, 5, opts.cabelo);
        R(3, hYF + 1, 2, 5, opts.cabelo);
        R(-4, hYF + 5, 2, 1, hShadow);
        R(2, hYF + 5, 2, 1, hShadow);
        break;

      case "coque":
        R(-2, hYF - 5, 4, 1, opts.cabelo);
        R(-3, hYF - 4, 6, 3, opts.cabelo);
        R(-2, hYF - 4, 3, 1, hHighlight);
        break;

      case "afro":
        R(-6, hYF - 3, 12, 1, opts.cabelo);
        R(-7, hYF - 2, 14, 6, opts.cabelo);
        R(-6, hYF + 4, 12, 1, hShadow);
        R(-5, hYF - 2, 10, 1, hHighlight);
        break;

      default:
        R(-4, hYF + 1, 8, 1, opts.cabelo);
        break;
    }
  } else {
    R(-3, hYF - 1, 6, 1, opts.cabelo);
    R(-4, hYF, 8, hH, opts.cabelo);
    R(-3, hYF, 6, 2, hHighlight);
  }

  if (u?.capacete) {
    R(hX - 1, hYF - 1, hW + 2, 3, u.capacete);
    R(hX, hYF - 1, hW, 1, shade(u.capacete, 20));
  }

  // ── 9. ROSTO (Olhos Pixelados) ──
  if (dir !== "up") {
    const off = dir === "left" ? -1 : dir === "right" ? 1 : 0;
    const eyeY = hYF + 3;

    // Olho Esquerdo
    R(-3 + off, eyeY, 2, 2, "#ffffff");
    R(-2 + off, eyeY, 1, 2, iris);
    R(-2 + off, eyeY + 1, 1, 1, "#11141c");

    // Olho Direito
    R(1 + off, eyeY, 2, 2, "#ffffff");
    R(2 + off, eyeY, 1, 2, iris);
    R(2 + off, eyeY + 1, 1, 1, "#11141c");

    // Sobrancelhas
    R(-3 + off, eyeY - 1, 2, 1, hShadow);
    R(1 + off, eyeY - 1, 2, 1, hShadow);

    // Boca Simples
    if (dir === "down") {
      R(-1 + off, hYF + 6, 2, 1, isFem ? "#d06874" : skS);
    }
  }

  // Indicador de Seleção / Self
  if (self) {
    const bob = Math.sin(time * 0.005) > 0 ? 1 : 0;
    R(-1, hYF - 5 + bob, 2, 2, "#50e3c2");
  }
}