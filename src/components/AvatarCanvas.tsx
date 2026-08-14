import { useEffect, useRef } from "react";
import { drawCharacter } from "../game/characterRenderer";
import type { BottomStyle, HairStyle, ShirtArtTransform, ShirtStyle, ShoeStyle, Sexo, Uniform } from "../game/types";
import type { FardaVisual } from "./ui";

/** Avatar desenhado com o MESMO renderizador do engine (drawCharacter), sincronizando /me e cidade. */
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
    const VW = 40;
    const VH = 48;
    canvas.width = VW * dpr;
    canvas.height = VH * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, VW, VH);

    const uniforme: Uniform | null = farda
      ? { cor: farda.cor, colete: farda.colete, capacete: farda.capacete, faixa: farda.faixa }
      : null;

    drawCharacter(ctx, VW / 2, VH - 8, {
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
      time: 0,
    });
  });

  return <canvas ref={ref} style={{ width: size, height: size * 1.2, imageRendering: "pixelated" }} />;
}
