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
 * Renderizador de Avatar Pixel Art Reestilizado (Estilo 16-bit orgânico).
 * - Cabelo Ultra-Arredondado por degraus suaves (Pixel Step Art).
 * - Pernas e Canelas contínuas (Preenchimento total sem transparências).
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

  // Passo de animação do andar
  const step = Math.sin(anim * 6);
  const legOff = anim ? Math.round(step * 2) : 0;
  const breathY = Math.sin(time * 0.003) > 0.3 ? 1 : 0;

  ctx.imageSmoothingEnabled = false;

  // Função utilitária com integer snap
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

  // Cores & Sombras
  const corH = shade(cor, 35);
  const corS = shade(cor, -30);
  const corD = shade(cor, -60);
  const skH = shade(pele, 20);
  const sk = pele;
  const skS = shade(pele, -28);
  const skD = shade(pele, -50);
  const hHighlight = shade(opts.cabelo, 30);
  const hShadow = shade(opts.cabelo, -35);
  const iris = irisFromHair(opts.cabelo);

  const pB = u ? shade(cor, -35) : calcaCor;
  const pH = shade(pB, 20);
  const pS = shade(pB, -25);
  const pD = shade(pB, -45);
  const armSwing = anim ? Math.round(step * 1) : 0;

  // Base Y
  const footY = 2; // Posição fixa de assentamento dos pés
  const legTopY = -8; // Topo das pernas/quadril

  // ── 0. SOMBRA NO CHÃO ──
  R(-5, footY + 2, 10, 1, "#1c1b24");
  R(-4, footY + 1, 8, 1, "#282636");

  // ── 1. CABELO TRASEIRO (Silhueta Arredondada em Degraus) ──
  const hY = -28 + breathY;
  const drawBackHair = () => {
    const style = cabeloEstilo;
    const isLong = style === "longo" || style === "longo_liso" || style === "ondulado" || style === "trancas" || style === "bob";

    if (dir === "up" || style === "afro") {
      // Formato Esférico Suave (Degraus: 4 -> 8 -> 12 -> 14 -> 12 -> 8)
      R(-2, hY + 1, 4, 1, opts.cabelo);
      R(-4, hY + 2, 8, 1, opts.cabelo);
      R(-6, hY + 3, 12, 2, opts.cabelo);
      R(-7, hY + 5, 14, 4, opts.cabelo);
      R(-6, hY + 9, 12, 1, opts.cabelo);
      R(-4, hY + 10, 8, 1, hShadow);

      // Brilho Redondo
      R(-3, hY + 3, 6, 1, hHighlight);
    }

    if (dir !== "up" && isLong) {
      const hairLen = style === "bob" ? 7 : 11;
      const vol = isFem ? 2 : 0;

      // Mecha Esquerda Arredondada
      R(-5 - vol, hY + 3, 3 + vol, 1, opts.cabelo);
      R(-6 - vol, hY + 4, 4 + vol, hairLen - 2, opts.cabelo);
      R(-5 - vol, hY + 3 + hairLen - 2, 3 + vol, 1, hShadow);
      R(-4 - vol, hY + 3 + hairLen - 1, 2 + vol, 1, hShadow); // Ponta arredondada
      R(-5 - vol, hY + 4, 1, hairLen - 3, hHighlight);

      // Mecha Direita Arredondada
      R(2, hY + 3, 3 + vol, 1, opts.cabelo);
      R(2, hY + 4, 4 + vol, hairLen - 2, opts.cabelo);
      R(2, hY + 3 + hairLen - 2, 3 + vol, 1, hShadow);
      R(2, hY + 3 + hairLen - 1, 2 + vol, 1, hShadow); // Ponta arredondada
      R(4 + vol, hY + 4, 1, hairLen - 3, hHighlight);
    }

    if (dir !== "up" && style === "rabo") {
      // Coque / Rabo de Cavalo Arredondado
      R(3, hY + 2, 3, 1, opts.cabelo);
      R(3, hY + 3, 5, 6, opts.cabelo);
      R(4, hY + 9, 3, 2, hShadow);
      R(3, hY + 3, 1, 5, hHighlight);
      R(3, hY + 3, 3, 1, "#e2e2ee"); // Laço/Elástico
    }
  };
  drawBackHair();

  // ── 2. PERNAS E CANELAS (Garantia de Preenchimento Completo) ──
  const sL = Math.max(0, legOff);
  const sR = Math.max(0, -legOff);

  // Posições das duas pernas (Esquerda e Direita)
  const leftX = -4;
  const rightX = 1;
  const legW = 3;

  if (saia) {
    // Saia em A com caimento curvo
    R(-5, legTopY, 10, 1, pH);
    R(-6, legTopY + 1, 12, 3, pB);
    R(-6, legTopY + 4, 12, 1, pD);

    // Canelas visíveis e sólidas preenchendo até a boca do sapato
    R(leftX + 1, legTopY + 4 + sL, 2, footY - (legTopY + 4), sk);
    R(leftX + 1, legTopY + 4 + sL, 1, footY - (legTopY + 4), skS); // Sombra da canela

    R(rightX, legTopY + 4 + sR, 2, footY - (legTopY + 4), sk);
    R(rightX, legTopY + 4 + sR, 1, footY - (legTopY + 4), skS);
  } else if (shortBottom) {
    // Shorts
    R(leftX, legTopY + sL, legW, 3, pB);
    R(rightX, legTopY + sR, legW, 3, pB);
    R(leftX, legTopY + 2 + sL, legW, 1, pD);
    R(rightX, legTopY + 2 + sR, legW, 1, pD);

    // Canela exposta 100% preenchida sem vácuos até o pé
    const skinStartY = legTopY + 3;
    const skinHeight = footY - skinStartY;

    R(leftX, skinStartY + sL, legW, skinHeight, sk);
    R(leftX, skinStartY + sL, 1, skinHeight, skS);

    R(rightX, skinStartY + sR, legW, skinHeight, sk);
    R(rightX, skinStartY + sR, 1, skinHeight, skS);
  } else {
    // Calça comprida contínua preenchendo até o pé
    const pantHeight = footY - legTopY;

    R(leftX, legTopY + sL, legW, pantHeight, pB);
    R(leftX, legTopY + sL, 1, pantHeight, pH);
    R(leftX + legW - 1, legTopY + sL, 1, pantHeight, pD);

    R(rightX, legTopY + sR, legW, pantHeight, pB);
    R(rightX, legTopY + sR, 1, pantHeight, pH);
    R(rightX + legW - 1, legTopY + sR, 1, pantHeight, pD);

    // Cinto/Cintura
    R(-4, legTopY, 8, 1, shade(pB, -20));
  }

  // ── 3. SAPATOS (Conectados às Pernas/Canelas) ──
  const shoeD = shade(sapatoCor, -30);
  const shoeH = shade(sapatoCor, 25);
  const boot = sapatoModelo === "bota";

  // Sapato Esquerdo
  R(leftX - 1, footY - (boot ? 1 : 0) + sL, 4, 2 + (boot ? 1 : 0), shoeD);
  R(leftX, footY - (boot ? 1 : 0) + sL, 3, 1, sapatoCor);
  R(leftX, footY - (boot ? 1 : 0) + sL, 1, 1, shoeH);
  R(leftX - 1, footY + 2 + sL, 4, 1, "#121318");

  // Sapato Direito
  R(rightX, footY - (boot ? 1 : 0) + sR, 4, 2 + (boot ? 1 : 0), shoeD);
  R(rightX + 1, footY - (boot ? 1 : 0) + sR, 3, 1, sapatoCor);
  R(rightX + 1, footY - (boot ? 1 : 0) + sR, 1, 1, shoeH);
  R(rightX, footY + 2 + sR, 4, 1, "#121318");

  // ── 4. TRONCO / CAMISA ──
  const tY = -17 + breathY;
  const tW = isFem ? 8 : 10;
  const tX = -tW / 2;

  R(tX - 1, tY - 1, tW + 2, 10, corD);
  R(tX, tY, tW, 9, cor);
  R(tX, tY, tW, 2, corH);
  R(tX, tY + 7, tW, 2, corS);

  if (isFem) {
    // Ajuste de cintura delicada
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

  R(tX - bW, tY + 1 + armSwing, bW, 7, armCor);
  R(tX - bW, tY + 8 + armSwing, bW, 2, sk);

  R(tX + tW, tY + 1 - armSwing, bW, 7, armCor);
  R(tX + tW, tY + 8 - armSwing, bW, 2, sk);

  if (armed) {
    const dx = dir === "left" ? -1 : dir === "right" ? 1 : 0;
    const dy = dir === "up" ? -1 : dir === "down" ? 1 : 0;
    R(5 + dx * 2, tY + 4 + dy * 2 - armSwing, 3, 3, "#282e3a");
  }

  // ── 6. PESCOÇO ──
  R(-1, tY - 2, 2, 2, skS);

  // ── 7. CABEÇA ARREDONDADA ──
  const hYF = hY + 1;

  // Formato do rosto em arco
  R(-3, hYF - 1, 6, 1, skD);
  R(-4, hYF, 8, 7, sk);
  R(-3, hYF + 7, 6, 1, skS); // Queixo curvo
  R(-4, hYF, 8, 1, skH);

  if (isFem) {
    // Blush
    R(-3, hYF + 4, 1, 1, "#e07b88");
    R(2, hYF + 4, 1, 1, "#e07b88");
  }

  // ── 8. CABELO FRONTAL ULTRA-ARREDONDADO ──
  if (dir !== "up") {
    // Curvatura Superior do Crânio (Degraus: 4px -> 8px -> 10px)
    R(-2, hYF - 3, 4, 1, opts.cabelo);
    R(-4, hYF - 2, 8, 1, opts.cabelo);
    R(-3, hYF - 2, 6, 1, hHighlight);

    R(-5, hYF - 1, 10, 2, opts.cabelo);
    R(-4, hYF - 1, 8, 1, hHighlight);

    switch (cabeloEstilo) {
      case "franja":
      case "social":
        // Franja arredondada caindo em arco
        R(-4, hYF + 1, 8, 1, opts.cabelo);
        R(-3, hYF + 2, 6, 1, opts.cabelo);
        R(-2, hYF + 2, 4, 1, hShadow);
        break;

      case "ondulado":
      case "longo":
      case "longo_liso":
        // Franjas laterais curvas moldando a bochecha
        R(-5, hYF + 1, 3, 2, opts.cabelo);
        R(-6, hYF + 3, 3, 3, opts.cabelo);
        R(-5, hYF + 6, 2, 1, hShadow); // Ponta arredondada pra dentro

        R(2, hYF + 1, 3, 2, opts.cabelo);
        R(3, hYF + 3, 3, 3, opts.cabelo);
        R(3, hYF + 6, 2, 1, hShadow);

        R(-4, hYF + 1, 1, 3, hHighlight);
        R(3, hYF + 1, 1, 3, hHighlight);
        break;

      case "bob":
        R(-5, hYF + 1, 3, 3, opts.cabelo);
        R(-5, hYF + 4, 2, 2, opts.cabelo);
        R(2, hYF + 1, 3, 3, opts.cabelo);
        R(3, hYF + 4, 2, 2, opts.cabelo);
        break;

      case "coque":
        // Coque redondo no topo
        R(-2, hYF - 6, 4, 1, opts.cabelo);
        R(-3, hYF - 5, 6, 3, opts.cabelo);
        R(-2, hYF - 3, 4, 1, hShadow);
        R(-2, hYF - 5, 3, 1, hHighlight);
        break;

      case "afro":
        R(-5, hYF - 4, 10, 1, opts.cabelo);
        R(-7, hYF - 3, 14, 2, opts.cabelo);
        R(-8, hYF - 1, 16, 6, opts.cabelo);
        R(-7, hYF + 5, 14, 1, hShadow);
        R(-5, hYF + 6, 10, 1, hShadow);
        R(-6, hYF - 3, 12, 1, hHighlight);
        break;

      default:
        R(-4, hYF + 1, 8, 1, opts.cabelo);
        break;
    }
  } else {
    // Parte traseira da cabeça arredondada
    R(-2, hYF - 2, 4, 1, opts.cabelo);
    R(-4, hYF - 1, 8, 8, opts.cabelo);
    R(-3, hYF + 7, 6, 1, hShadow);
    R(-3, hYF - 1, 6, 2, hHighlight);
  }

  if (u?.capacete) {
    R(-4, hYF - 2, 8, 1, u.capacete);
    R(-5, hYF - 1, 10, 3, u.capacete);
    R(-4, hYF - 1, 8, 1, shade(u.capacete, 25));
  }

  // ── 9. ROSTO E OLHOS ──
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

    // Cílios/Sobrancelhas
    R(-3 + off, eyeY - 1, 2, 1, hShadow);
    R(1 + off, eyeY - 1, 2, 1, hShadow);

    // Boca
    if (dir === "down") {
      R(-1 + off, hYF + 6, 2, 1, isFem ? "#d06874" : skS);
    }
  }

  // Indicador Self
  if (self) {
    const bob = Math.sin(time * 0.005) > 0 ? 1 : 0;
    R(-1, hYF - 6 + bob, 2, 2, "#50e3c2");
  }
}