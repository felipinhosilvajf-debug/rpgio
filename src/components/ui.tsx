import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../utils/cn";
import type { BottomStyle, HairStyle, ShirtArtTransform, ShirtStyle, ShoeStyle, Sexo } from "../game/types";
import { drawCharacter } from "../game/characterRenderer";

export const money = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

const TONES: Record<string, string> = {
  blue: "bg-[#3f7ad6] text-white",
  green: "bg-[#3f9d5c] text-white",
  red: "bg-[#c4483f] text-white",
  gold: "bg-[#d8a13a] text-[#2c1e05]",
  slate: "bg-[#3a4763] text-[#dbe3f2]",
  army: "bg-[#5d7a45] text-white",
  purple: "bg-[#7a4fb5] text-white",
  orange: "bg-[#e07a3f] text-white",
  cyan: "bg-[#2fa5a5] text-white",
};

export function Btn({
  children, tone = "blue", className, full, size = "md", ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: keyof typeof TONES; full?: boolean; size?: "sm" | "md" | "lg" }) {
  return (
    <button {...rest} className={cn(
      "pixel-btn font-pixel uppercase tracking-tight",
      size === "sm" ? "px-2.5 py-2 text-[8px]" : size === "lg" ? "px-5 py-3.5 text-[11px]" : "px-3.5 py-2.5 text-[9px]",
      TONES[tone], full && "w-full", className,
    )}>{children}</button>
  );
}

export function Bar({ value, max = 100, color, className }: { value: number; max?: number; color: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (<div className={cn("bar-track h-3.5 w-full", className)}><div className="bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} /></div>);
}

export function Modal({ title, icon, onClose, children, width = "max-w-3xl", accent = "#3f7ad6", footer }: {
  title: string; icon: string; onClose: () => void; children: ReactNode; width?: string; accent?: string; footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-3 backdrop-blur-[2px]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={cn("pixel-panel pop-in flex max-h-[88vh] w-full flex-col overflow-hidden", width)} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b-[3px] border-[#0a1024] px-4 py-3" style={{ background: `linear-gradient(180deg, ${accent}, ${accent}bb)` }}>
          <span className="text-xl drop-shadow">{icon}</span>
          <h2 className="font-pixel flex-1 text-[11px] uppercase text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]">{title}</h2>
          <button onClick={onClose} className="pixel-btn bg-[#c4483f] px-2.5 py-1.5 font-pixel text-[9px] text-white" aria-label="Fechar">X</button>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="border-t-[3px] border-[#0a1024] bg-[#101a30] px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("pixel-inset p-3", className)}>{children}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="font-pixel mb-1.5 text-[8px] uppercase text-[#8fa3c8]">{children}</div>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (<input {...props} className={cn("pixel-inset w-full px-3 py-2.5 text-sm text-[#e8eefb] outline-none placeholder:text-[#5c6b8a] focus:ring-2 focus:ring-[#3f7ad6]", props.className)} />);
}

/* AVATAR — canvas com drawCharacter (mesmo renderer da cidade → sync total /me ↔ cidade) */
export interface FardaVisual { cor: string; colete?: string; capacete?: string; faixa?: string; }

export function Avatar({
  cor, cabelo, pele = "#f0c396", sexo = "masculino", size = 64, farda, insignia,
  cabeloEstilo = "curto", camisaModelo = "camiseta", inferiorModelo = "calca",
  calcaCor = "#2f3b57", sapatoModelo = "tenis", sapatoCor = "#1a1f2c",
  camisaImagem = "", camisaTransform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
}: {
  cor: string; cabelo: string; pele?: string; sexo?: Sexo; size?: number; farda?: FardaVisual | null; insignia?: string;
  cabeloEstilo?: HairStyle; camisaModelo?: ShirtStyle; inferiorModelo?: BottomStyle; calcaCor?: string;
  sapatoModelo?: ShoeStyle; sapatoCor?: string; camisaImagem?: string; camisaTransform?: ShirtArtTransform;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const VW = 40; const VH = 46;
    canvas.width = VW * dpr; canvas.height = VH * dpr;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, VW, VH);
    const uniforme = farda ? { cor: farda.cor, colete: farda.colete, capacete: farda.capacete, faixa: farda.faixa } : null;
    drawCharacter(ctx, VW / 2, VH - 6, {
      cor, cabelo, pele, sexo, uniforme, cabeloEstilo, camisaModelo, inferiorModelo, calcaCor, sapatoModelo, sapatoCor,
      camisaImagem, camisaTransform, dir: "down", anim: 0, self: Boolean(insignia),
    });
  });
  return <canvas ref={ref} style={{ width: size, height: size * 1.15, imageRendering: "pixelated" }} />;
}

export const CORES = ["#3f7ad6", "#c4483f", "#3f9d5c", "#d8a13a", "#7a4fb5", "#2fa5a5", "#e07a3f", "#5d7a45", "#2f5fa8", "#b5455f", "#1a1a2e", "#e8e8e8"];
export const CABELOS = ["#3a2418", "#101010", "#8b5a2b", "#d8b25a", "#a83030", "#6b4f8a", "#dcdcdc", "#ff6b6b", "#2a9d8f", "#1d3557"];
export const PELES = ["#fde8cc", "#f0c396", "#d4a373", "#b07d5a", "#8b5e3c", "#6b4226"];

export const HAIR_STYLES: { id: HairStyle; nome: string; genero: Sexo | "unissex" }[] = [
  { id: "curto", nome: "Curto", genero: "unissex" },
  { id: "raspado", nome: "Raspado", genero: "unissex" },
  { id: "franja", nome: "Franja", genero: "unissex" },
  { id: "social", nome: "Social", genero: "masculino" },
  { id: "cacheado", nome: "Cacheado", genero: "unissex" },
  { id: "ondulado", nome: "Ondulado", genero: "unissex" },
  { id: "afro", nome: "Afro", genero: "unissex" },
  { id: "moicano", nome: "Moicano", genero: "masculino" },
  { id: "trancas", nome: "Trancas", genero: "unissex" },
  { id: "longo", nome: "Longo", genero: "feminino" },
  { id: "longo_liso", nome: "Longo liso", genero: "feminino" },
  { id: "coque", nome: "Coque", genero: "feminino" },
  { id: "rabo", nome: "Rabo de cavalo", genero: "feminino" },
  { id: "bob", nome: "Corte bob", genero: "feminino" },
];

export const SHIRT_STYLES: { id: ShirtStyle; nome: string; genero: Sexo | "unissex" }[] = [
  { id: "camiseta", nome: "Camiseta", genero: "unissex" },
  { id: "regata", nome: "Regata", genero: "unissex" },
  { id: "camisa", nome: "Camisa social", genero: "unissex" },
  { id: "jaqueta", nome: "Jaqueta", genero: "unissex" },
  { id: "blusa", nome: "Blusa", genero: "feminino" },
];

export const BOTTOM_STYLES: { id: BottomStyle; nome: string; genero: Sexo | "unissex" }[] = [
  { id: "calca", nome: "Calça", genero: "unissex" },
  { id: "bermuda", nome: "Bermuda", genero: "unissex" },
  { id: "shorts", nome: "Shorts", genero: "unissex" },
  { id: "saia", nome: "Saia", genero: "feminino" },
];

export const SHOE_STYLES: { id: ShoeStyle; nome: string }[] = [
  { id: "tenis", nome: "Tênis" },
  { id: "social", nome: "Social" },
  { id: "bota", nome: "Bota" },
];
