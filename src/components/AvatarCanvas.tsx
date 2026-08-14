import { useEffect, useRef } from "react";
import { drawHDCharacter } from "../game/hdCharacterRenderer";
import type { BottomStyle, HairStyle, ShirtArtTransform, ShirtStyle, ShoeStyle, Sexo, Uniform } from "../game/types";
import type { FardaVisual } from "./ui";

/** AvatarCanvas agora usa o renderer HD por padrão (32/64-bit style) */
export default function AvatarCanvas({
  cor,
  cabelo,
  pele = "#f0c396",
  sexo = "masculino",
  size = 64,
  farda = null,
  cabeloEstilo = "curto",
  camisaModelo = "camiseta",
  inferiorModelo = "calca",
  calcaCor = "#2f3b57",
  sapatoModelo = "tenis",
  sapatoCor = "#1a1f2c",
  camisaImagem = "",
  camisaTransform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
}: {
  cor: string;
  cabelo: string;
  pele?: string;
  sexo?: Sexo;
  size?: number;
  farda?: FardaVisual | null;
  cabeloEstilo?: HairStyle;
  camisaModelo?: ShirtStyle;
  inferiorModelo?: BottomStyle;
  calcaCor?: string;
  sapatoModelo?: ShoeStyle;
  sapatoCor?: string;
  camisaImagem?: string;
  camisaTransform?: ShirtArtTransform;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    // We render HD at 128x256 logical pixels and then scale to the canvas size
    const baseW = 128;
    const baseH = 256;
    // set canvas to desired display size based on `size` prop while keeping aspect
    const displayW = size;
    const displayH = Math.round(size * 1.2);

    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    const uniforme: Uniform | null = farda
      ? { cor: farda.cor, colete: farda.colete, capacete: farda.capacete, faixa: farda.faixa }
      : null;

    // drawHDCharacter draws into the provided ctx using logical pixels (128x256). It expects x,y in logical pixel units.
    // We'll create a temporary scaling so the renderer draws at logical resolution, then we scale the result to the canvas.
    // Approach: create an offscreen temporary context with size baseW x baseH, let drawHDCharacter draw into it, then draw scaled to visible canvas.

    const off = document.createElement('canvas');
    off.width = baseW;
    off.height = baseH;
    const offCtx = off.getContext('2d');
    if (!offCtx) return;

    offCtx.clearRect(0, 0, baseW, baseH);
    offCtx.imageSmoothingEnabled = false;

    (async () => {
      await drawHDCharacter(offCtx, baseW / 2, Math.floor(baseH * 0.55), {
        cor,
        cabelo,
        pele,
        sexo,
        uniforme,
        armedItem: null,
        cabeloEstilo,
        camisaModelo,
        inferiorModelo,
        calcaCor,
        sapatoModelo,
        sapatoCor,
        camisaImagem,
        camisaTransform,
        dir: "down",
        anim: 0,
        self: false,
        time: Date.now(),
      });

      // draw offscreen scaled to visible canvas with nearest-neighbor
      ctx.imageSmoothingEnabled = false;
      const sx = canvas.width / baseW;
      const sy = canvas.height / baseH;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(sx, sy);
      ctx.drawImage(off, 0, 0);
      ctx.restore();
    })();
  }, [cor, cabelo, pele, sexo, size, farda, cabeloEstilo, camisaModelo, inferiorModelo, calcaCor, sapatoModelo, sapatoCor, camisaImagem, camisaTransform]);

  return <canvas ref={ref} style={{ width: size, height: Math.round(size * 1.2), imageRendering: "pixelated" }} />;
}
