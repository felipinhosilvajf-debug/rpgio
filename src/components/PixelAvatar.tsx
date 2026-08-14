import { useEffect, useRef } from "react";
import type { Dir, HairStyle, BottomStyle, ShoeStyle, Sexo, Uniform } from "../game/types";
import { shade } from "../game/engine";

interface AvatarProps {
  size?: number; // em pixels (default: 100)
  cor: string;
  cabelo: string;
  pele?: string;
  sexo?: Sexo;
  cabeloEstilo?: HairStyle;
  inferiorModelo?: BottomStyle;
  calcaCor?: string;
  sapatoModelo?: ShoeStyle;
  sapatoCor?: string;
  emprego?: string;
  uniforme?: Uniform | null;
  armedItem?: string | null;
  className?: string;
}

/**
 * Avatar em estilo Pixel Art Stardew Valley
 * Renderiza em canvas em alta qualidade
 */
export function PixelAvatar({
  size = 100,
  cor,
  cabelo,
  pele = "#f0c396",
  sexo = "masculino",
  cabeloEstilo = "curto",
  inferiorModelo = "calca",
  calcaCor = "#2f3b57",
  sapatoModelo = "tenis",
  sapatoCor = "#1a1f2c",
  emprego,
  uniforme,
  armedItem,
  className,
}: AvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Configurar canvas com DPR
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    // Cores
    const corDark = shade(cor, -38);
    const corLight = shade(cor, 18);
    const skinDark = shade(pele, -32);
    const skinLight = shade(pele, 16);
    const hairDark = shade(cabelo, -24);
    const pantsColor = uniforme ? shade(cor, -30) : calcaCor;
    const pantsDark = shade(pantsColor, -20);
    const shoeDark = shade(sapatoCor, -20);

    const isFem = sexo === "feminino";
    const isLongHair = cabeloEstilo === "longo" || cabeloEstilo === "longo_liso";

    // Funções auxiliares
    const px = (x: number, y: number, w: number, h: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };

    const pxCircle = (cx: number, cy: number, r: number, c: string) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    };

    // Centro do canvas
    const cx = size / 2;
    const cy = size / 2;

    // Escala (proporcional ao tamanho)
    const scale = size / 100; // Baseado em 100px como referência

    // ═════ SOMBRA ═════
    pxCircle(cx, cy + 2 * scale, 5 * scale, "rgba(0,0,0,0.25)");

    // ═════ SAPATOS ═════
    px(cx - 3 * scale, cy + 0.5 * scale, 3 * scale, 2 * scale, shoeDark);
    px(cx - 3 * scale, cy + 2 * scale, 3 * scale, 1 * scale, sapatoCor);
    px(cx + 0.5 * scale, cy + 0.5 * scale, 3 * scale, 2 * scale, shoeDark);
    px(cx + 0.5 * scale, cy + 2 * scale, 3 * scale, 1 * scale, sapatoCor);

    // ═════ PERNAS ═════
    const shortPants = inferiorModelo === "shorts" || inferiorModelo === "bermuda";
    const pantHeight = shortPants ? 3 * scale : 6 * scale;

    px(cx - 3 * scale, cy - pantHeight, 2 * scale, pantHeight, pantsDark);
    px(cx - 2.5 * scale, cy - pantHeight + 1 * scale, 1.5 * scale, pantHeight - 1 * scale, pantsColor);
    px(cx + 0.5 * scale, cy - pantHeight, 2 * scale, pantHeight, pantsDark);
    px(cx + 1 * scale, cy - pantHeight + 1 * scale, 1.5 * scale, pantHeight - 1 * scale, pantsColor);

    // ═════ TRONCO ═════
    const torsoHeight = 8 * scale;
    px(cx - 3 * scale, cy - pantHeight - torsoHeight, 6 * scale, torsoHeight, corDark);
    px(cx - 3 * scale, cy - pantHeight - torsoHeight + 1 * scale, 6 * scale, torsoHeight - 1 * scale, cor);
    px(cx - 3 * scale, cy - pantHeight - torsoHeight + 1 * scale, 6 * scale, 1 * scale, corLight);

    // ═════ BRAÇOS ═════
    px(cx - 4.5 * scale, cy - pantHeight - torsoHeight + 2 * scale, 1.5 * scale, 4 * scale, shade(cor, -14));
    px(cx + 3.5 * scale, cy - pantHeight - torsoHeight + 2 * scale, 1.5 * scale, 4 * scale, shade(cor, -14));
    pxCircle(cx - 4.5 * scale, cy - pantHeight - torsoHeight + 6 * scale, 1 * scale, pele);
    pxCircle(cx + 4 * scale, cy - pantHeight - torsoHeight + 6 * scale, 1 * scale, pele);

    // ═════ PESCOÇO ═════
    px(cx - 1.5 * scale, cy - pantHeight - torsoHeight - 1.5 * scale, 3 * scale, 1.5 * scale, pele);

    // ═════ CABEÇA ═════
    const headY = cy - pantHeight - torsoHeight - 5 * scale;
    const headW = 5 * scale;
    const headH = 5 * scale;

    px(cx - headW / 2 - 0.5 * scale, headY - 0.5 * scale, headW + 1 * scale, headH + 1 * scale, skinDark);
    px(cx - headW / 2, headY, headW, headH, pele);
    px(cx - headW / 2, headY, headW, 1 * scale, skinLight);

    // ═════ CABELO ═════
    px(cx - headW / 2 - 1 * scale, headY, 1 * scale, 3 * scale, cabelo);
    px(cx + headW / 2, headY, 1 * scale, 3 * scale, cabelo);
    px(cx - headW / 2, headY - 1 * scale, headW, 1 * scale, cabelo);
    px(cx - headW / 2 + 0.5 * scale, headY - 2 * scale, headW - 1 * scale, 1 * scale, hairDark);

    if (isLongHair) {
      px(cx - headW / 2 - 1.5 * scale, headY + 2 * scale, 1 * scale, 4 * scale, cabelo);
      px(cx + headW / 2 + 0.5 * scale, headY + 2 * scale, 1 * scale, 4 * scale, cabelo);
    }

    // ═════ ROSTO ═════
    const eyeY = headY + 1.5 * scale;

    // Olhos
    pxCircle(cx - 1 * scale, eyeY, 0.6 * scale, "#ffffff");
    pxCircle(cx + 1.5 * scale, eyeY, 0.6 * scale, "#ffffff");

    // Pupilas
    pxCircle(cx - 1 * scale, eyeY, 0.3 * scale, "#1a1a2e");
    pxCircle(cx + 1.5 * scale, eyeY, 0.3 * scale, "#1a1a2e");

    // Nariz
    px(cx, headY + 2.5 * scale, 0.5 * scale, 1 * scale, skinDark);

    // Boca
    px(cx - 0.8 * scale, headY + 3.5 * scale, 1.5 * scale, 0.5 * scale, shade(pele, -28));

    // ═════ ARMA ═════
    if (armedItem === "arma_fogo" || armedItem === "municao") {
      px(cx + 3 * scale, cy - pantHeight - torsoHeight + 4 * scale, 4 * scale, 1 * scale, "#2a2a3e");
      px(cx + 4 * scale, cy - pantHeight - torsoHeight + 5 * scale, 2 * scale, 0.5 * scale, "#4a4a5e");
    }
  }, [size, cor, cabelo, pele, sexo, cabeloEstilo, inferiorModelo, calcaCor, sapatoModelo, sapatoCor, uniforme, armedItem]);

  return <canvas ref={canvasRef} className={className} />;
}
