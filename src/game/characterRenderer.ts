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
 * Renderizador HD Pixel Art (Resolução Base 64x128 Proporcional)
 * - Proporções humanas detalhadas estilo RPG 32-bit / 64-bit.
 * - Sombreamento rico (Highlights, Midtones, Shadows, Outlines).
 * - Pixel-perfect (desenhado com blocos exatos sem interpolação).
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
  const step = Math.sin(anim * 6);
  const legOff = anim ? Math.floor(step * 4) : 0;
  const breathY = Math.floor(Math.sin(time * 0.003) * 1);

  // Helper Pixel Art
  const R = (dx: number, dy: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.floor(x + dx), Math.floor(y + dy), Math.floor(w), Math.floor(h));
  };

  const drawShirtStamp = (src: string, sx: number, sy: number, sw: number, sh: number, transform: ShirtArtTransform) => {
    let image = shirtImageCache.get(src);
    if (!image) { image = new Image(); image.src = src; shirtImageCache.set(src, image); }
    if (image.complete && image.naturalWidth > 0) {
      const t = transform;
      ctx.save();
      ctx.beginPath(); ctx.rect(Math.floor(x + sx), Math.floor(y + sy), sw, sh); ctx.clip();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.floor(x + sx + sw / 2 + t.x), Math.floor(y + sy + sh / 2 + t.y));
      ctx.rotate((t.rotation * Math.PI) / 180);
      ctx.scale(t.scaleX, t.scaleY);
      ctx.drawImage(image, -sw / 2, -sh / 2, sw, sh);
      ctx.restore();
    }
  };

  const u = uniforme ?? getUniform(emprego);
  const cor = u?.cor ?? opts.cor;
  const armed = armedItem === "arma_fogo" || armedItem === "municao";
  const regata = camisaModelo === "regata" && !u;
  const shortBottom = inferiorModelo === "shorts" || inferiorModelo === "bermuda";
  const saia = isFem && inferiorModelo === "saia" && !u;

  // Paleta HD (5 tons para profundidade 32/64-bit)
  const corH2 = shade(cor, 55);
  const corH  = shade(cor, 30);
  const corS  = shade(cor, -30);
  const corS2 = shade(cor, -55);
  const corD  = shade(cor, -80);

  const skH2 = shade(pele, 40);
  const skH  = shade(pele, 20);
  const sk   = pele;
  const skS  = shade(pele, -30);
  const skS2 = shade(pele, -50);
  const skD  = shade(pele, -75);

  const hHighlight = shade(opts.cabelo, 35);
  const hShadow    = shade(opts.cabelo, -40);
  const iris       = irisFromHair(opts.cabelo);

  const pB  = u ? shade(cor, -20) : calcaCor;
  const pH  = shade(pB, 25);
  const pS  = shade(pB, -30);
  const pS2 = shade(pB, -50);
  const pD  = shade(pB, -70);

  const armSwing = anim ? Math.floor(step * 3) : 0;

  // ── 0. SOMBRA PROJETADA NO CHÃO (Dithering HD) ──
  R(-22, 58, 44, 2, "rgba(0,0,0,0.15)");
  R(-18, 56, 36, 2, "rgba(0,0,0,0.25)");
  R(-14, 54, 28, 2, "rgba(0,0,0,0.40)");

  // ── 1. CABELO TRASEIRO ──
  const hY = -56 + breathY;
  const drawBackHair = () => {
    const isLong = ["longo", "longo_liso", "ondulado", "trancas", "bob"].includes(cabeloEstilo);
    if (dir === "up" || cabeloEstilo === "afro") {
      R(-14, hY + 8, 28, 20, opts.cabelo);
      R(-12, hY + 8, 24, 4, hHighlight);
    }
    if (dir !== "up" && isLong) {
      const len = cabeloEstilo === "bob" ? 18 : 36;
      R(-16, hY + 12, 6, len, opts.cabelo);
      R(-16, hY + 12, 2, len - 4, hHighlight);
      R(-16, hY + 12 + len - 4, 6, 4, hShadow);
      
      R(10, hY + 12, 6, len, opts.cabelo);
      R(14, hY + 12, 2, len - 4, hHighlight);
      R(10, hY + 12 + len - 4, 6, 4, hShadow);
    }
  };
  drawBackHair();

  // ── 2. SAPATOS E PÉS ──
  const sL = Math.max(0, legOff);
  const sR = Math.max(0, -legOff);
  const shoeD = shade(sapatoCor, -40);
  const shoeH = shade(sapatoCor, 30);
  const boot = sapatoModelo === "bota";
  const shH = boot ? 14 : 8;

  // Pé Esquerdo
  R(-13, 46 + sL - (boot ? 6 : 0), 10, shH, shoeD);
  R(-12, 47 + sL - (boot ? 6 : 0), 8, shH - 2, sapatoCor);
  R(-11, 47 + sL - (boot ? 6 : 0), 4, 2, shoeH);
  R(-13, 46 + sL + shH - 2, 10, 2, "#0a0d14"); // Sola

  // Pé Direito
  R(3, 46 + sR - (boot ? 6 : 0), 10, shH, shoeD);
  R(4, 47 + sR - (boot ? 6 : 0), 8, shH - 2, sapatoCor);
  R(5, 47 + sR - (boot ? 6 : 0), 4, 2, shoeH);
  R(3, 46 + sR + shH - 2, 10, 2, "#0a0d14");

  // ── 3. PERNAS / INFERIOR ──
  const legTop = 8;
  if (saia) {
    R(-15, legTop, 30, 20, pD);
    R(-14, legTop + 1, 28, 18, pB);
    R(-12, legTop + 1, 24, 4, pH);
    R(-14, legTop + 15, 28, 4, pS);
    // Pernas aparentes
    R(-10, legTop + 19 + sL, 7, 18, sk);
    R(3, legTop + 19 + sR, 7, 18, sk);
    R(-10, legTop + 19 + sL, 2, 18, skH);
    R(3, legTop + 19 + sR, 2, 18, skH);
  } else if (shortBottom) {
    R(-13, legTop + sL, 11, 14, pD);
    R(2, legTop + sR, 11, 14, pD);
    R(-12, legTop + sL, 9, 12, pB);
    R(3, legTop + sR, 9, 12, pB);
    // Pernas aparentes
    R(-11, legTop + 13 + sL, 8, 24, sk);
    R(3, legTop + 13 + sR, 8, 24, sk);
    R(-11, legTop + 13 + sL, 2, 24, skH);
    R(3, legTop + 13 + sR, 2, 24, skH);
  } else {
    // Calça Longa Detalhada
    R(-13, legTop + sL, 11, 38, pD);
    R(2, legTop + sR, 11, 38, pD);
    R(-12, legTop + 1 + sL, 9, 36, pB);
    R(3, legTop + 1 + sR, 9, 36, pB);
    // Highlights musculares / dobras nas pernas
    R(-12, legTop + 2 + sL, 3, 16, pH);
    R(3, legTop + 2 + sR, 3, 16, pH);
    R(-12, legTop + 20 + sL, 9, 2, pS); // Dobra joelho
    R(3, legTop + 20 + sR, 9, 2, pS);
    // Cinto
    R(-13, legTop, 26, 4, shade(pB, -30));
    R(-3, legTop, 6, 4, "#d8a838"); // Fivela de metal
  }

  // ── 4. TRONCO / ROUPA HD ──
  const tY = -24 + breathY;
  const tW = isFem ? 24 : 28;
  const tX = -tW / 2;

  // Base do tronco com anatomia HD
  R(tX - 1, tY - 1, tW + 2, 34, corD); // Outline
  R(tX, tY, tW, 32, cor);
  
  // Sombreamento tridimensional (Luz vindo de cima/esquerda)
  R(tX, tY, tW, 6, corH);
  R(tX, tY, 4, 30, corH2);
  R(tX, tY + 24, tW, 8, corS);
  R(tX + tW - 4, tY, 4, 32, corS2);

  if (isFem) {
    // Cintura fina / Curvatura feminina HD
    R(tX, tY + 12, 3, 14, corS2);
    R(tX + tW - 3, tY + 12, 3, 14, corS2);
  } else {
    // Peitoral e estrutura masculina HD
    R(tX + 2, tY + 12, 10, 2, corS);
    R(tX + 16, tY + 12, 10, 2, corS);
  }

  // Detalhes da Camisa
  if (!u) {
    if (camisaModelo === "camisa") {
      R(-2, tY, 4, 32, corD);
      R(-1, tY + 6, 2, 2, "#ffffff");
      R(-1, tY + 14, 2, 2, "#ffffff");
      R(-1, tY + 22, 2, 2, "#ffffff");
    } else if (camisaModelo === "jaqueta") {
      R(tX + 2, tY + 2, 6, 28, corS2);
      R(-tX - 8, tY + 2, 6, 28, corS2);
      R(-2, tY + 2, 4, 30, "#22252a");
    } else if (regata) {
      const ombroW = isFem ? 6 : 8;
      R(tX, tY, ombroW, 8, sk);
      R(-tX - ombroW, tY, ombroW, 8, sk);
    }
  } else if (u.colete) {
    R(-11, tY + 4, 22, 24, u.colete);
    R(-11, tY + 4, 22, 4, shade(u.colete, 30));
    R(-11, tY + 24, 22, 4, shade(u.colete, -30));
  }

  // Estampa
  if (camisaImagem && !u?.colete) {
    drawShirtStamp(camisaImagem, tX + 4, tY + 4, tW - 8, 22, camisaTransform);
  }

  // ── 5. BRAÇOS E MÃOS (HD Pixel Art) ──
  const bW = isFem ? 5 : 7;
  const armCor = regata ? sk : shade(cor, -15);
  const armHl  = regata ? skH : shade(cor, 20);

  // Braço Esquerdo
  R(tX - bW, tY + 2 + armSwing, bW, 26, armCor);
  R(tX - bW, tY + 2 + armSwing, 2, 20, armHl);
  if (!regata && camisaModelo !== "jaqueta") {
    R(tX - bW, tY + 18 + armSwing, bW, 8, sk); // Antebraço exposto
    R(tX - bW, tY + 18 + armSwing, 2, 8, skH);
  }
  R(tX - bW, tY + 28 + armSwing, bW, 5, sk); // Mão detalhada

  // Braço Direito
  R(tX + tW, tY + 2 - armSwing, bW, 26, armCor);
  R(tX + tW, tY + 2 - armSwing, 2, 20, armHl);
  if (!regata && camisaModelo !== "jaqueta") {
    R(tX + tW, tY + 18 - armSwing, bW, 8, sk);
    R(tX + tW, tY + 18 - armSwing, 2, 8, skH);
  }
  R(tX + tW, tY + 28 - armSwing, bW, 5, sk);

  // Arma equipada
  if (armed) {
    const ax = 12; const ay = tY + 14 - armSwing;
    R(ax, ay, 14, 6, "#1a1e28");
    R(ax + 2, ay + 2, 10, 2, "#4a5568");
    R(ax + 4, ay + 6, 4, 6, "#2d3748");
  }

  // ── 6. PESCOÇO ──
  R(-4, tY - 6, 8, 8, skS);
  R(-2, tY - 5, 4, 6, sk);

  // ── 7. CABEÇA E ROSTO (Proporção HD 24x28) ──
  const hW = isFem ? 22 : 24;
  const hH = 28;
  const hX = -hW / 2;
  const hYF = hY + 4;

  // Estrutura do crânio e sombreamento de pele
  R(hX - 1, hYF - 1, hW + 2, hH + 2, skD); // Outline
  R(hX, hYF, hW, hH, sk);
  R(hX + 2, hYF + 2, hW - 4, 6, skH2); // Testa iluminação
  R(hX, hYF + hH - 6, hW, 6, skS); // Mandíbula/Sombra do queixo
  R(hX, hYF + 10, 3, 10, skS); // Maçã do rosto esq.
  R(hX + hW - 3, hYF + 10, 3, 10, skS); // Maçã do rosto dir.

  if (isFem) {
    // Blush / Maquiagem
    R(-8, hYF + 16, 4, 2, "rgba(224,110,124,0.35)");
    R(4, hYF + 16, 4, 2, "rgba(224,110,124,0.35)");
  }

  // ── 8. CABELO FRONTAL HD ──
  if (dir !== "up") {
    const hh = hHighlight; const hs = hShadow;
    R(hX - 1, hYF - 2, hW + 2, 10, opts.cabelo);
    R(hX + 2, hYF - 2, hW - 4, 3, hh);
    
    // Franja / Mechas HD
    if (cabeloEstilo === "franja" || cabeloEstilo === "social" || cabeloEstilo === "curto") {
      R(hX + 2, hYF + 8, 8, 4, opts.cabelo);
      R(hX + 3, hYF + 8, 6, 2, hh);
      R(hX + 12, hYF + 8, 8, 3, hs);
    } else if (cabeloEstilo === "longo" || cabeloEstilo === "ondulado") {
      R(hX - 2, hYF + 8, 5, 18, opts.cabelo);
      R(hX - 2, hYF + 8, 2, 14, hh);
      R(hX + hW - 3, hYF + 8, 5, 18, opts.cabelo);
      R(hX + hW - 1, hYF + 8, 2, 14, hh);
    }
  } else {
    R(hX - 1, hYF - 1, hW + 2, hH + 1, opts.cabelo);
    R(hX + 4, hYF + 2, hW - 8, 6, hHighlight);
  }

  // Capacete / Boina
  if (u?.capacete) {
    R(hX - 2, hYF - 4, hW + 4, 12, u.capacete);
    R(hX + 2, hYF - 4, hW - 4, 3, shade(u.capacete, 25));
    R(hX - 3, hYF + 8, hW + 6, 3, shade(u.capacete, -35)); // Aba
  }

  // ── 9. OLHOS, BOCA E DETALHES FACIAIS HD ──
  if (dir !== "up") {
    const off = dir === "left" ? -3 : dir === "right" ? 3 : 0;
    const eyeY = hYF + 13;

    // Olho Esquerdo
    R(-8 + off, eyeY, 5, 4, "#ffffff");
    R(-7 + off, eyeY + 1, 3, 3, iris);
    R(-6 + off, eyeY + 1, 2, 2, "#0a0d14");
    R(-8 + off, eyeY, 5, 1, "#1a1e28"); // Cílios superiores
    R(-7 + off, eyeY + 1, 1, 1, "#ffffff"); // Brilho de luz

    // Olho Direito
    R(3 + off, eyeY, 5, 4, "#ffffff");
    R(4 + off, eyeY + 1, 3, 3, iris);
    R(4 + off, eyeY + 1, 2, 2, "#0a0d14");
    R(3 + off, eyeY, 5, 1, "#1a1e28");
    R(4 + off, eyeY + 1, 1, 1, "#ffffff");

    // Sobrancelhas HD
    R(-9 + off, eyeY - 3, 6, isFem ? 1 : 2, shade(opts.cabelo, -20));
    R(3 + off, eyeY - 3, 6, isFem ? 1 : 2, shade(opts.cabelo, -20));

    // Nariz HD
    R(-1 + off, eyeY + 3, 2, 4, skS);
    R(0 + off, eyeY + 6, 2, 1, skS2);

    // Boca HD
    if (dir === "down") {
      if (isFem) {
        R(-3 + off, eyeY + 9, 6, 2, "#c46a78");
        R(-1 + off, eyeY + 9, 2, 1, "#e594a0");
      } else {
        R(-3 + off, eyeY + 9, 6, 1, shade(pele, -45));
        R(-2 + off, eyeY + 10, 4, 1, shade(pele, -25));
      }
    }
  }

  // Indicador de Self
  if (self) {
    const bob = Math.floor(Math.sin(time * 0.005) * 3);
    R(-4, hYF - 12 + bob, 8, 3, "#7ee0ff");
  }
}