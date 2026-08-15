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
 * Renderizador de Avatar Premium (Estilo Stardew Valley / Ragnarok).
 * - Usa EXCLUSIVAMENTE blocos de retângulos (R) e coordenadas pixel-art precisas.
 * - Zero elipses ou círculos vetoriais arredondados.
 * - Sombra projetada em dithering pixel-art.
 * - Diferenciação extrema de fisionomia masculina (rígida/robusta) vs feminina (delicada/curva).
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
  const camisaTransform = opts.camisaTransform ?? { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
  const dir = opts.dir ?? "down";
  const anim = opts.anim ?? 0;
  const self = opts.self ?? false;
  const time = opts.time ?? 0;

  const isFem = sexo === "feminino";
  const body = getGenderBodyStyle(toBodyGender(sexo));

  const step = Math.sin(anim * 6);
  const legOff = anim ? step * 2.4 : 0;
  const breathY = Math.sin(time * 0.0028) * 0.45;

  const R = (dx: number, dy: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + dx, y + dy, w, h);
  };

  const drawShirtStamp = (src: string, sx: number, sy: number, sw: number, sh: number, transform: ShirtArtTransform) => {
    let image = shirtImageCache.get(src);
    if (!image) { image = new Image(); image.src = src; shirtImageCache.set(src, image); }
    if (image.complete && image.naturalWidth > 0) {
      const t = transform;
      ctx.save();
      ctx.beginPath(); ctx.rect(x + sx + 0.6, y + sy + 1, sw - 1.2, sh - 2); ctx.clip();
      ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 0.9;
      ctx.translate(x + t.x, y + sy + 4.5 + t.y);
      ctx.rotate((t.rotation * Math.PI) / 180);
      ctx.scale(t.scaleX, t.scaleY);
      ctx.drawImage(image, -(sw - 2.5) / 2, -3, sw - 2.5, 6);
      ctx.globalAlpha = 1; ctx.restore();
    }
  };

  const u = uniforme ?? getUniform(emprego);
  const cor = u?.cor ?? opts.cor;
  const armed = armedItem === "arma_fogo" || armedItem === "municao";
  const regata = camisaModelo === "regata" && !u;
  const shortBottom = inferiorModelo === "shorts" || inferiorModelo === "bermuda";
  const saia = isFem && inferiorModelo === "saia" && !u;

  // Paleta de tons com Hue Shifting
  const corH = shade(cor, 42); // Highlight
  const corS = shade(cor, -28); // Shadow
  const corD = shade(cor, -52); // Outline seletivo
  const skH = shade(pele, 24);
  const sk = pele;
  const skS = shade(pele, -26);
  const skD = shade(pele, -48);
  const hHighlight = shade(opts.cabelo, 22);
  const hShadow = shade(opts.cabelo, -30);
  const iris = irisFromHair(opts.cabelo);

  const pB = u ? shade(cor, -38) : calcaCor;
  const pH = shade(pB, 20);
  const pS = shade(pB, -24);
  const pD = shade(pB, -42);
  const armSwing = anim ? step * 1.5 : 0;

  // ── 0. SOMBRA PROJETADA EM PIXEL-ART DITHERING ──
  R(-7, 3, 14, 1, "rgba(0,0,0,0.14)");
  R(-5, 2, 10, 1, "rgba(0,0,0,0.22)");
  R(-3, 1, 6, 1, "rgba(0,0,0,0.30)");

  // ── 1. CABELO TRASEIRO (Cai atrás do tronco — Stardew Style) ──
  const hY = -28 + breathY;
  const drawBackHair = () => {
    const style = cabeloEstilo;
    const isLong = style === "longo" || style === "longo_liso" || style === "ondulado" || style === "trancas" || style === "bob";
    if (dir === "up" || style === "afro") {
      R(-5, hY + 4, 10, 6, opts.cabelo);
      R(-4, hY + 4, 8, 2, hHighlight);
    }
    if (dir !== "up" && isLong) {
      const hairLen = style === "bob" ? 5 : 10;
      // Mecha esquerda
      R(-5.5, hY + 4, 2, hairLen, opts.cabelo);
      R(-5.5, hY + 4, 1, hairLen - 1, hHighlight);
      R(-5.5, hY + 4 + hairLen - 1.5, 2, 1.5, hShadow);
      // Mecha direita
      R(3.5, hY + 4, 2, hairLen, opts.cabelo);
      R(4.5, hY + 4, 1, hairLen - 1, hHighlight);
      R(3.5, hY + 4 + hairLen - 1.5, 2, 1.5, hShadow);
      if (style === "trancas") {
        // Detalhe de amarração/separador de trança
        R(-5.5, hY + 4 + hairLen - 3, 2, 1, hShadow);
        R(3.5, hY + 4 + hairLen - 3, 2, 1, hShadow);
      }
    }
    if (dir !== "up" && style === "rabo") {
      R(3.5, hY + 4, 2.5, 9, opts.cabelo);
      R(3.5, hY + 4, 1, 6, hHighlight);
      R(3.5, hY + 11.5, 2.5, 1.5, hShadow);
      R(3.5, hY + 4, 2.5, 0.8, "#d8d8e8"); // Elástico
    }
  };
  drawBackHair();

  // ── 2. SAPATOS (Estrutura blocky com sola) ──
  const sL = Math.max(0, legOff);
  const sR = Math.max(0, -legOff);
  const shoeD = shade(sapatoCor, -28);
  const shoeH = shade(sapatoCor, 22);
  const boot = sapatoModelo === "bota";
  const social = sapatoModelo === "social";
  const shH = boot ? 3.5 : social ? 1.8 : 2.2;
  
  // Sapato Esquerdo
  R(-4.5, sL - (boot ? 1.5 : 0.8), 4, shH, shoeD);
  R(-4.1, sL - (boot ? 1.2 : 0.5), 3.2, shH - 0.5, sapatoCor);
  R(-3.8, sL - (boot ? 1.2 : 0.5), 2, 0.6, shoeH); // Brilho bico
  R(-4.5, sL + 0.5, 4, 0.6, "#10131b"); // Sola

  // Sapato Direito
  R(0.5, sR - (boot ? 1.5 : 0.8), 4, shH, shoeD);
  R(0.9, sR - (boot ? 1.2 : 0.5), 3.2, shH - 0.5, sapatoCor);
  R(1.2, sR - (boot ? 1.2 : 0.5), 2, 0.6, shoeH);
  R(0.5, sR + 0.5, 4, 0.6, "#10141d");

  // ── 3. PARTE INFERIOR (Calça / Saia / Shorts com fisionomia correspondente) ──
  const legTop = -8.5;
  if (saia) {
    // Saia feminina: blocky evasê
    R(-5, legTop, 10, 4.5, pD);
    R(-4.5, legTop + 0.4, 9, 3.8, pB);
    R(-4.1, legTop + 0.4, 8.2, 1, pH);
    R(-4.5, legTop + 3.4, 9, 0.8, pS);
    // Pernas de pele visíveis embaixo
    R(-3.6, -4.2 + sL, 2.6, 2.4, sk);
    R(1, -4.4 + sR, 2.6, 2.4, sk);
  } else if (shortBottom) {
    // Shorts/Bermuda: exibe coxa/joelho de pele
    R(-4.1, legTop + sL, 3.6, 3.2, pD);
    R(0.5, legTop + sR, 3.6, 3.2, pD);
    R(-3.7, legTop + 0.3 + sL, 2.8, 2.6, pB);
    R(0.9, legTop + 0.3 + sR, 2.8, 2.6, pB);
    // Pele
    R(-3.6, -4.4 + sL, 2.6, 2.8, sk);
    R(1, -4.4 + sR, 2.6, 2.8, sk);
    R(-3.6, -4.2 + sL, 2.2, 1, skH);
    R(1.2, -4.2 + sR, 2.2, 1, skH);
  } else {
    // Calça comprida: pernas paralelas e sólidas
    R(-4.4, legTop + sL, 3.8, 6.8, pD);
    R(0.6, legTop + sR, 3.8, 6.8, pD);
    R(-4, legTop + 0.4 + sL, 3, 5.8, pB);
    R(1, legTop + 0.4 + sR, 3, 5.8, pB);
    R(-4, legTop + 0.6 + sL, 3, 1.2, pH);
    R(1, legTop + 0.6 + sR, 3, 1.2, pH);
    R(-4, -2.8 + sL, 3, 1, pS);
    R(1, -2.8 + sR, 3, 1, pS);
    R(-2.2, legTop + 0.6 + sL, 0.6, 4.8, pS); // Costura lateral
    R(1.6, legTop + 0.6 + sR, 0.6, 4.8, pS);
    // Cinto
    R(-4.4, legTop, 8.8, 1.2, shade(pB, -16));
    R(-3.5, legTop, 1.4, 1.2, shade(pB, 14)); // Fivela
  }

  // ── 4. TRONCO / CAMISA (Masculino robusto, Feminino delicado) ──
  const tY = -17 + breathY;
  const tW = isFem ? 9 : 11; // Feminino mais estreito na cintura (delicado)
  const tX = -tW / 2;

  // Outline
  R(tX - 0.4, tY - 0.4, tW + 0.8, 10.8, corD);
  // Base
  R(tX, tY, tW, 10, cor);
  // Highlight e sombra
  R(tX, tY, tW, 2.5, corH);
  R(tX, tY + 7.5, tW, 2.5, corS);
  // Curvatura de cintura (Stardew Style)
  if (isFem) {
    R(tX, tY + 4, 0.8, 3, corS);
    R(tX + tW - 0.8, tY + 4, 0.8, 3, corS);
  } else {
    // Ombros masculinos largos e marcados (robustez)
    R(tX - 0.8, tY, 0.8, 4, corD);
    R(tX - 0.4, tY, 0.8, 3.6, cor);
    R(tX - 0.4, tY, 0.8, 1.2, corH);
    R(tX + tW, tY, 0.8, 4, corD);
    R(tX + tW - 0.4, tY, 0.8, 3.6, cor);
    R(tX + tW - 0.4, tY, 0.8, 1.2, corH);
  }

  // Modelos de camisa
  if (!u) {
    if (camisaModelo === "camisa") {
      R(-2.2, tY, 2, 1.6, corH); R(0.2, tY, 2, 1.6, corH);
      R(-0.3, tY + 1.6, 0.6, 7.8, corD);
      R(-0.5, tY + 2.8, 1, 1, "#e8e8ea"); R(-0.5, tY + 5.2, 1, 1, "#e8e8ea");
    } else if (camisaModelo === "jaqueta") {
      R(tX + 0.4, tY + 0.6, 1.2, 8.2, corS); R(-tX - 1.6, tY + 0.6, 1.2, 8.2, corS); R(-0.4, tY + 0.6, 0.8, 8.2, "#c8ccd4");
    } else if (camisaModelo === "blusa") {
      R(tX + 0.4, tY + 3.8, tW - 0.8, 0.8, corS);
    } else if (camisaModelo === "camiseta") {
      R(-1.6, tY, 3.2, 1.4, corD);
    } else if (regata) {
      // Ombro de pele visível na regata
      const ombroW = isFem ? 1.6 : 2.2;
      R(tX, tY, ombroW, 2.2, sk);
      R(-tX - ombroW, tY, ombroW, 2.2, sk);
      R(tX, tY, ombroW, 0.8, skH);
      R(-tX - ombroW, tY, ombroW, 0.8, skH);
      // Alças
      R(tX + ombroW, tY, 1.1, 2, corD);
      R(-tX - ombroW - 1.1, tY, 1.1, 2, corD);
    }
  } else {
    if (u.colete) {
      R(-3.8, tY + 1.4, 7.6, 5.8, u.colete);
      R(-3.8, tY + 1.4, 7.6, 1.2, shade(u.colete, 22));
      R(-3.8, tY + 5.6, 7.6, 1.6, shade(u.colete, -18));
    }
    if (u.faixa) R(-5, tY + 5, 10, 1, u.faixa);
  }

  // Estampa transformável
  if (camisaImagem && !u?.colete) {
    drawShirtStamp(camisaImagem, tX, tY, tW, 10, camisaTransform);
  }

  // ── 5. BRAÇOS (Masculino grosso/forte, Feminino fino/delicado) ──
  const bW = isFem ? 2 : 2.6;
  const armCor = regata ? sk : shade(cor, -14);
  const armHl = regata ? skH : shade(cor, 12);
  // Esquerdo
  R(tX - bW, tY + 1 + armSwing, bW, 8.2, armCor);
  if (!regata) {
    R(tX - bW, tY + 1.2 + armSwing, 0.8, 5.8, armHl);
    // Pele visível se manga curta
    if (camisaModelo !== "jaqueta") R(tX - bW, tY + 6.8 + armSwing, bW, 2.4, sk);
  }
  R(tX - bW, tY + 8.8 + armSwing, bW, 1.4, sk); // Mão
  // Direito
  R(tX + tW, tY + 1 - armSwing, bW, 8.2, armCor);
  if (!regata) {
    R(tX + tW, tY + 1.2 - armSwing, 0.8, 5.8, armHl);
    if (camisaModelo !== "jaqueta") R(tX + tW, tY + 6.8 - armSwing, bW, 2.4, sk);
  }
  R(tX + tW, tY + 8.8 - armSwing, bW, 1.4, sk);

  if (armed) {
    const dx = dir === "left" ? -1 : dir === "right" ? 1 : 0;
    const dy = dir === "up" ? -1 : dir === "down" ? 1 : 0;
    const ax = 6 + dx * 2.8; const ay = tY + 5.5 + dy * 2.8 - armSwing;
    R(ax + dx * 2.8, ay + dy * 2.8, dx ? 6.5 : 1.8, dy ? 6.5 : 1.8, "#1a1e28");
    R(ax, ay, 2.6, 3, "#3a4450");
  }

  // ── 6. PESCOÇO ──
  R(-1.5, tY - 1.4, 3 * body.neckScale, 1.8, skS);
  R(-1, tY - 1.2, 2 * body.neckScale, 1, sk);

  // ── 7. CABEÇA (Formato Stardew Valley — blocky, corte nos cantos) ──
  const hW = isFem ? 7 : 8; // Cabeça feminina menor/fina
  const hH = isFem ? 7 : 8;
  const hX = -hW / 2;
  const hYF = hY + 1.5;

  // Crânio principal (Rosto menos redondo, mais blocky e estruturado)
  R(hX, hYF, hW, hH, skD); // Outline
  R(hX + 0.4, hYF + 0.4, hW - 0.8, hH - 0.8, sk); // Base pele
  R(hX + 0.8, hYF + 0.4, hW - 1.6, 2, skH); // Testa iluminada
  R(hX + 0.8, hYF + hH - 1.8, hW - 1.6, 1.4, skS); // Queixo
  // Maçãs do rosto (Sombra lateral)
  R(hX + 0.4, hYF + 4, 0.8, 3, skS);
  R(hX + hW - 1.2, hYF + 4, 0.8, 3, skS);

  if (isFem) {
    // Blush feminino Stardew Style
    R(-2.8, hYF + 5, 1, 0.6, "rgba(224,110,124,0.30)");
    R(1.8, hYF + 5, 1, 0.6, "rgba(224,110,124,0.30)");
  }

  // ── 8. CABELO FRONTAL (Estilos clássicos Stardew/Ragnarok) ──
  const hairFront = (estilo: HairStyle) => {
    const hh = hHighlight; const hs = hShadow;
    switch (estilo) {
      case "raspado":
        R(hX + 0.8, hYF, hW - 1.6, 1.5, hs);
        break;
      case "moicano":
        R(-1.5, hYF - 2, 3, 5, hs);
        R(-1, hYF - 2, 2, 4.4, opts.cabelo);
        R(-0.5, hYF - 1.8, 1, 3.4, hh);
        break;
      case "coque":
        R(hX + 0.8, hYF, hW - 1.6, 3, opts.cabelo);
        R(hX + 1.6, hYF, hW - 3.2, 1, hh);
        R(-1.5, hYF - 2, 3, 3, opts.cabelo); // Coque alto
        break;
      case "afro":
        R(hX - 0.8, hYF - 0.8, hW + 1.6, hH - 1.6, opts.cabelo);
        R(hX, hYF - 0.4, hW, 1.5, hh);
        break;
      case "cacheado": {
        R(hX + 0.4, hYF, hW - 0.8, 3, opts.cabelo);
        for (let i = 0; i < 4; i++) {
          const bx = hX + 1 + i * (hW - 3) / 3;
          R(bx, hYF + 2.2 + (i % 2) * 0.6, 1.4, 1.4, i % 2 ? hh : opts.cabelo);
        }
        R(hX - 0.4, hYF + 3.2, 1.2, 3, opts.cabelo);
        R(hX + hW - 0.8, hYF + 3.2, 1.2, 3, opts.cabelo);
        break;
      }
      case "ondulado":
        R(hX + 0.4, hYF, hW - 0.8, 3, opts.cabelo);
        R(hX - 0.4, hYF + 3.2, 1.4, 4, opts.cabelo);
        R(hX + hW - 1, hYF + 3.2, 1.4, 4, opts.cabelo);
        break;
      case "franja":
        R(hX + 0.4, hYF, hW - 0.8, 3, opts.cabelo);
        R(hX + 0.8, hYF + 2.8, hW - 1.6, 1.2, opts.cabelo); // Franja reta
        R(hX + 1.2, hYF + 3.8, 1.5, 0.6, hs);
        break;
      case "trancas":
        R(hX + 0.4, hYF, hW - 0.8, 3, opts.cabelo);
        R(-1.5, hYF + 3.6, 3, 1.2, opts.cabelo);
        break;
      case "bob":
        R(hX - 0.2, hYF, hW + 0.4, 3, opts.cabelo);
        R(hX - 0.2, hYF + 3, 1.6, 3.2, opts.cabelo);
        R(hX + hW - 1.4, hYF + 3, 1.6, 3.2, opts.cabelo);
        break;
      case "social":
        R(hX + 0.4, hYF, hW - 0.8, 3, opts.cabelo);
        R(hX + 0.8, hYF, 4, 1, hh);
        R(hX + 0.4, hYF + 3, 1.2, 3.6, hs); // Partido
        break;
      case "rabo":
        R(hX + 0.4, hYF, hW - 0.8, 3, opts.cabelo);
        break;
      case "longo":
      case "longo_liso":
      default:
        R(hX + 0.4, hYF, hW - 0.8, 3.2, opts.cabelo);
        R(hX + 1.2, hYF, 4, 1, hh);
        if (estilo === "longo") {
          R(hX + 0.6, hYF + 3.8, 1.4, 2, opts.cabelo);
          R(hX + hW - 2, hYF + 3.8, 1.4, 2, opts.cabelo);
        }
        break;
    }
  };
  if (dir !== "up") hairFront(cabeloEstilo);
  else {
    R(hX, hYF, hW, hH, opts.cabelo);
    R(hX + 1.2, hYF, hW - 2.4, 3, hHighlight);
  }

  // ── 8b. Capacete / Boina ──
  if (u?.capacete) {
    R(hX - 0.4, hYF, hW + 0.8, 3.2, u.capacete);
    R(hX + 0.4, hYF, hW - 0.8, 1.2, shade(u.capacete, 16));
    R(hX - 0.6, hYF + 3.2, hW + 1.2, 1, shade(u.capacete, -24));
  }

  // ── 9. ROSTO (Diferença marcante M/F Stardew Style) ──
  if (dir !== "up") {
    const off = dir === "left" ? -1.4 : dir === "right" ? 1.4 : 0;
    const eyeY = hYF + 3.8;
    const eyeW = isFem ? 1.4 : 1.2;
    const eyeH = isFem ? 1.4 : 1.1;

    // Olho Esquerdo (Desenho pixel-art blocky, não vetorial)
    R(-2.2 + off - eyeW/2, eyeY - eyeH/2, Math.ceil(eyeW), Math.ceil(eyeH), "#f2f5f8");
    R(-2.2 + off - eyeW/2 + 0.3, eyeY - eyeH/2 + 0.1, Math.ceil(eyeW * 0.68), Math.ceil(eyeH * 0.85), iris);
    R(-2.2 + off - eyeW/2 + 0.5, eyeY - eyeH/2 + 0.3, 0.6, 0.7, "#141824");
    R(-2.4 + off, eyeY - 0.4, 0.4, 0.4, "#ffffff"); // Brilho pupila
    R(-2.2 + off - eyeW, eyeY - eyeH + 0.1, eyeW * 2, 0.5, shade(pele, -18)); // Cílio superior

    // Olho Direito
    R(2.2 + off - eyeW/2, eyeY - eyeH/2, Math.ceil(eyeW), Math.ceil(eyeH), "#f2f5f8");
    R(2.2 + off - eyeW/2 + 0.3, eyeY - eyeH/2 + 0.1, Math.ceil(eyeW * 0.68), Math.ceil(eyeH * 0.85), iris);
    R(2.2 + off - eyeW/2 + 0.5, eyeY - eyeH/2 + 0.3, 0.6, 0.7, "#141824");
    R(2.0 + off, eyeY - 0.4, 0.4, 0.4, "#ffffff");
    R(2.2 + off - eyeW, eyeY - eyeH + 0.1, eyeW * 2, 0.5, shade(pele, -18));

    // Sobrancelhas: feminina fina, masculina grossa
    R(-2.8 + off, hYF + 2.5, 2, isFem ? 0.4 : 0.7, shade(opts.cabelo, -18));
    R(0.8 + off, hYF + 2.5, 2, isFem ? 0.4 : 0.7, shade(opts.cabelo, -18));

    // Nariz sutil
    R(off * 0.4, hYF + 5.2, isFem ? 0.6 : 0.8, isFem ? 0.8 : 1, skS);

    // Boca
    if (dir === "down") {
      if (isFem) {
        // Lábio rosado
        R(-1 + off, hYF + 6.6, 2, 0.5, shade(pele, -38));
        R(-0.5 + off, hYF + 7, 1, 0.4, shade(pele, -12));
      } else {
        // Traço firme
        R(-1.1 + off, hYF + 6.7, 2.2, 0.5, shade(pele, -35));
      }
    }
  }

  // Indicador de self
  if (self) {
    const bob = Math.sin(time * 0.005) * 1.2;
    R(-1.5, hYF - 4.5 + bob, 3, 1, "#7ee0ff");
  }
}
