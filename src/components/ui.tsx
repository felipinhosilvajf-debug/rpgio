import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";
import type { BottomStyle, HairStyle, ShirtArtTransform, ShirtStyle, ShoeStyle, Sexo } from "../game/types";

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
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-3 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
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

/* AVATAR PREMIUM — semi-realista com camadas modulares e cel-shading */
export interface FardaVisual { cor: string; colete?: string; capacete?: string; faixa?: string; }

export function Avatar({
  cor,
  cabelo,
  pele = "#f0c396",
  sexo = "masculino",
  size = 64,
  farda,
  insignia,
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
  insignia?: string;
  cabeloEstilo?: HairStyle;
  camisaModelo?: ShirtStyle;
  inferiorModelo?: BottomStyle;
  calcaCor?: string;
  sapatoModelo?: ShoeStyle;
  sapatoCor?: string;
  camisaImagem?: string;
  camisaTransform?: ShirtArtTransform;
}) {
  const u = size / 16;
  const isFem = sexo === "feminino";
  const roupa = farda?.cor ?? cor;
  const skinLuz = lighten(pele, 18);
  const skinSombra = darken(pele, 26);
  const skinDeep = darken(pele, 48);
  const roupaLuz = lighten(roupa, 24);
  const roupaSombra = darken(roupa, 28);
  const roupaDeep = darken(roupa, 48);
  const cabeloLuz = lighten(cabelo, 18);
  const cabeloSombra = darken(cabelo, 28);
  const pantsBase = farda ? darken(roupa, 35) : calcaCor;
  const pantsLuz = lighten(pantsBase, 16);
  const pantsSombra = darken(pantsBase, 20);

  const blocks: { x: number; y: number; w: number; h: number; c: string; r?: number }[] = [];
  const P = (x: number, y: number, w: number, h: number, c: string, r = 0) => blocks.push({ x, y, w, h, c, r });

  // ── CALÇADO ──
  const legH = isFem ? 4.5 : 5.5;
  const shoeY = 19.5 + legH;
  const shoeLight = lighten(sapatoCor, 18);
  const shoeDark = darken(sapatoCor, 24);
  if (sapatoModelo === "bota") {
    P(3.4, shoeY - 1.3, 4.2, 2.8, shoeDark, 0.8); P(3.7, shoeY - 1, 3.8, 2, sapatoCor, 0.7); P(3.8, shoeY - 0.8, 3.3, 0.5, shoeLight, 0.4);
    P(8.4, shoeY - 1.3, 4.2, 2.8, shoeDark, 0.8); P(8.7, shoeY - 1, 3.8, 2, sapatoCor, 0.7); P(8.8, shoeY - 0.8, 3.3, 0.5, shoeLight, 0.4);
  } else if (sapatoModelo === "social") {
    P(3.2, shoeY, 4.5, 1.5, shoeDark, 0.5); P(3.6, shoeY, 3.8, 0.6, shoeLight, 0.3);
    P(8.3, shoeY, 4.5, 1.5, shoeDark, 0.5); P(8.7, shoeY, 3.8, 0.6, shoeLight, 0.3);
  } else {
    P(3.2, shoeY, 4.5, 1.8, shoeDark, 0.8); P(3.5, shoeY, 3.8, 1.2, sapatoCor, 0.7); P(3.7, shoeY, 2.8, 0.5, shoeLight, 0.3);
    P(8.3, shoeY, 4.5, 1.8, shoeDark, 0.8); P(8.6, shoeY, 3.8, 1.2, sapatoCor, 0.7); P(8.8, shoeY, 2.8, 0.5, shoeLight, 0.3);
  }

  // ── PARTE INFERIOR: CALÇA / SHORTS / SAIA ──
  if (isFem && inferiorModelo === "saia" && !farda) {
    P(3.4, 18.2, 9.2, 4, pantsSombra, 1.1); P(3.8, 18, 8.4, 3.4, pantsBase, 1); P(4.2, 18, 7.6, 1, pantsLuz, 0.5);
    P(4.5, 21, 2.5, 3, pele, 0.8); P(9, 21, 2.5, 3, pele, 0.8);
  } else {
    const short = inferiorModelo === "shorts" || inferiorModelo === "bermuda";
    const h = short ? 3.5 : legH;
    P(3.6, 19.5, 3.8, h, pantsBase, 0.8); P(3.6, 19.5, 3.8, 1.3, pantsLuz, 0.5); P(3.6, 19.5 + h - 1.2, 3.8, 1.2, pantsSombra, 0.5);
    P(8.6, 19.5, 3.8, h, pantsBase, 0.8); P(8.6, 19.5, 3.8, 1.3, pantsLuz, 0.5); P(8.6, 19.5 + h - 1.2, 3.8, 1.2, pantsSombra, 0.5);
    if (short) { P(4, 23, 3, 1.4, pele, 0.6); P(9, 23, 3, 1.4, pele, 0.6); }
    P(3.5, 19.2, 9, 0.9, darken(pantsBase, 18), 0.4);
  }

  // ── TRONCO: masculino largo e rígido / feminino fino e delicado ──
  const torsoX = isFem ? 3.8 : 2.5;
  const torsoW = isFem ? 8.4 : 11;
  const torsoY = 12.2;
  P(torsoX - 0.4, torsoY - 0.4, torsoW + 0.8, 7.8, roupaDeep, isFem ? 1.8 : 1.1);
  P(torsoX, torsoY, torsoW, 7, roupa, isFem ? 1.7 : 1);
  P(torsoX + 0.3, torsoY, torsoW - 0.6, 2.2, roupaLuz, 0.8);
  P(torsoX + 0.2, torsoY + 5.2, torsoW - 0.4, 1.8, roupaSombra, 0.7);
  if (camisaModelo === "camisa") { P(7.7, torsoY + 1.2, 0.6, 5.2, roupaDeep); P(5.8, torsoY + 0.3, 4.4, 1.4, roupaSombra, 0.4); }
  if (camisaModelo === "jaqueta") { P(torsoX + 0.6, torsoY + 1.2, 1.2, 5.2, roupaSombra); P(torsoX + torsoW - 1.8, torsoY + 1.2, 1.2, 5.2, roupaSombra); }
  if (camisaModelo === "blusa" && isFem) { P(5, torsoY + 3, 6, 1, roupaSombra, 0.4); }
  if (farda?.colete) { P(4, 13.5, 8, 4, farda.colete, 0.8); P(4, 13.5, 8, 1, lighten(farda.colete, 14), 0.5); }
  if (farda?.faixa) P(3, 15.5, 10, 1, farda.faixa);
  if (insignia) P(9, 13, 3, 2, "#ffd980", 0.3);

  // braços: masculino mais grosso, feminino mais fino
  const armW = isFem ? 2 : 2.8;
  P(torsoX - armW, 13, armW, isFem ? 6.3 : 7, roupa, 0.9); P(torsoX - armW, 13, armW, 1.5, roupaLuz, 0.7);
  P(torsoX + torsoW, 13, armW, isFem ? 6.3 : 7, roupa, 0.9); P(torsoX + torsoW, 13, armW, 1.5, roupaLuz, 0.7);
  P(torsoX - armW, isFem ? 18.7 : 19, armW, 1.4, pele, 0.8); P(torsoX + torsoW, isFem ? 18.7 : 19, armW, 1.4, pele, 0.8);

  // pescoço
  P(6.2, 10.8, 3.6, 2.2, skinSombra, 0.8); P(6.5, 10.8, 3, 1, pele, 0.6);

  // cabeça: feminino menor/oval, masculino mais quadrado e forte
  const headX = isFem ? 3.1 : 2.7;
  const headW = isFem ? 9.8 : 10.6;
  P(headX - 0.4, 3.4, headW + 0.8, isFem ? 8 : 8.4, skinDeep, isFem ? 3 : 2);
  P(headX, 3.8, headW, isFem ? 7.2 : 7.6, pele, isFem ? 2.8 : 1.8);
  P(headX + 0.5, 3.8, headW - 1, 2, skinLuz, isFem ? 2 : 1);
  P(headX + 0.4, 9, headW - 0.8, 2, skinSombra, isFem ? 1.8 : 0.8);

  // rosto: feminino olhos maiores/linha leve; masculino sobrancelha forte e maxilar
  const eyeY = isFem ? 6.1 : 6.3;
  const eyeW = isFem ? 2.2 : 1.8;
  P(5, eyeY, eyeW, isFem ? 2 : 1.7, "#e7edf5", 0.5); P(9, eyeY, eyeW, isFem ? 2 : 1.7, "#e7edf5", 0.5);
  P(5.4, eyeY + 0.3, 1.2, 1.2, "#1a2030", 0.4); P(9.4, eyeY + 0.3, 1.2, 1.2, "#1a2030", 0.4);
  P(5.4, eyeY + 0.2, 0.45, 0.45, "#fff", 0.2); P(9.4, eyeY + 0.2, 0.45, 0.45, "#fff", 0.2);
  P(4.8, 5.3, 2.8, isFem ? 0.45 : 0.75, cabeloSombra, 0.3); P(8.8, 5.3, 2.8, isFem ? 0.45 : 0.75, cabeloSombra, 0.3);
  P(7.5, 7.6, isFem ? 0.7 : 1.1, isFem ? 0.7 : 1.2, skinSombra, 0.3);
  P(6.7, 9, 2.6, 0.6, darken(pele, 38), 0.4);
  if (isFem) { P(4, 8.3, 1.2, 0.5, "rgba(220,110,120,.22)", 0.3); P(10.8, 8.3, 1.2, 0.5, "rgba(220,110,120,.22)", 0.3); }

  // penteados por tipo
  const longHair = cabeloEstilo === "longo" || cabeloEstilo === "longo_liso";
  if (!farda?.capacete) {
    if (cabeloEstilo === "moicano") {
      P(6.2, -0.2, 3.6, 4.2, cabeloSombra, 1); P(6.6, 0, 2.8, 3.5, cabeloLuz, 0.8);
    } else if (cabeloEstilo === "coque") {
      P(3, 0, 10, 5, cabelo, 2); P(4, 0, 5, 1.3, cabeloLuz, 0.7); P(6, -2.2, 4, 3, cabelo, 1.5);
    } else if (cabeloEstilo === "rabo") {
      P(3, 0, 10, 5, cabelo, 2); P(4, 0, 5, 1.2, cabeloLuz, 0.7); P(12.5, 3, 2.5, 9, cabelo, 1); P(12.8, 3, 1.6, 3, cabeloLuz, 0.6);
    } else if (cabeloEstilo === "cacheado") {
      P(2, 0, 12, 5.5, cabelo, 2.2); P(3, 0, 4, 1.4, cabeloLuz, 0.7); P(1.5, 3, 2.5, isFem ? 8 : 5, cabelo, 1.2); P(12, 3, 2.5, isFem ? 8 : 5, cabelo, 1.2);
    } else if (cabeloEstilo === "social") {
      P(3, 0, 10, 4, cabelo, 1.5); P(3.5, 0, 7, 1.2, cabeloLuz, 0.6); P(2.5, 2, 1.5, 4, cabeloSombra, 0.6);
    } else {
      P(2.5, 0, 11, longHair ? 5.5 : 4.5, cabelo, 2); P(3.5, 0, 6, 1.3, cabeloLuz, 0.7); P(2, 2, 1.8, 4, cabeloSombra, 0.8); P(12.2, 2, 1.8, 4, cabeloSombra, 0.8);
      if (longHair) { P(1.5, 4, 2.5, 10, cabelo, 1); P(12, 4, 2.5, 10, cabelo, 1); P(2, 4, 1.5, 3, cabeloLuz, 0.5); P(12.5, 4, 1.5, 3, cabeloLuz, 0.5); }
    }
  }

  // capacete
  if (farda?.capacete) { P(1.5, -1, 13, 4.5, farda.capacete, 2); P(2, -1, 10, 1.3, lighten(farda.capacete, 16), 0.7); P(1.5, 2.5, 13, 1, darken(farda.capacete, 22), 0.4); }

  const totalH = shoeY + 2;

  return (
    <div style={{ position: "relative", width: size, height: (totalH / 16) * size, imageRendering: "pixelated" as const }}>
      {blocks.map((b, i) => (
        <div key={i} style={{ position: "absolute", left: b.x * u, top: (b.y + 1) * u, width: b.w * u, height: b.h * u, background: b.c, borderRadius: b.r ? b.r * u : undefined }} />
      ))}
      {camisaImagem && !farda?.colete && (
        <img src={camisaImagem} alt="estampa da camisa" style={{ position: "absolute", left: 4 * u, top: 13 * u, width: 8 * u, height: 5 * u, objectFit: "cover", imageRendering: "pixelated", opacity: 0.92, transformOrigin: "center", transform: `translate(${camisaTransform.x * u}px, ${camisaTransform.y * u}px) scale(${camisaTransform.scaleX}, ${camisaTransform.scaleY}) rotate(${camisaTransform.rotation}deg)` }} />
      )}
    </div>
  );
}

function darken(hex: string, amt: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, ((n >> 16) & 255) - amt);
  const g = Math.max(0, ((n >> 8) & 255) - amt);
  const b = Math.max(0, (n & 255) - amt);
  return `rgb(${r},${g},${b})`;
}

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((n >> 16) & 255) + amt);
  const g = Math.min(255, ((n >> 8) & 255) + amt);
  const b = Math.min(255, (n & 255) + amt);
  return `rgb(${r},${g},${b})`;
}

export const CORES = ["#3f7ad6", "#c4483f", "#3f9d5c", "#d8a13a", "#7a4fb5", "#2fa5a5", "#e07a3f", "#5d7a45", "#2f5fa8", "#b5455f", "#1a1a2e", "#e8e8e8"];
export const CABELOS = ["#3a2418", "#101010", "#8b5a2b", "#d8b25a", "#a83030", "#6b4f8a", "#dcdcdc", "#ff6b6b", "#2a9d8f", "#1d3557"];
export const PELES = ["#fde8cc", "#f0c396", "#d4a373", "#b07d5a", "#8b5e3c", "#6b4226"];

export const HAIR_STYLES: { id: HairStyle; nome: string; genero: Sexo | "unissex" }[] = [
  { id: "curto", nome: "Curto", genero: "unissex" },
  { id: "social", nome: "Social", genero: "masculino" },
  { id: "cacheado", nome: "Cacheado", genero: "unissex" },
  { id: "moicano", nome: "Moicano", genero: "masculino" },
  { id: "longo", nome: "Longo", genero: "feminino" },
  { id: "longo_liso", nome: "Longo liso", genero: "feminino" },
  { id: "coque", nome: "Coque", genero: "feminino" },
  { id: "rabo", nome: "Rabo de cavalo", genero: "feminino" },
];

export const SHIRT_STYLES: { id: ShirtStyle; nome: string; genero: Sexo | "unissex" }[] = [
  { id: "camiseta", nome: "Camiseta", genero: "unissex" },
  { id: "camisa", nome: "Camisa social", genero: "unissex" },
  { id: "jaqueta", nome: "Jaqueta", genero: "unissex" },
  { id: "blusa", nome: "Blusa", genero: "feminino" },
];

export const BOTTOM_STYLES: { id: BottomStyle; nome: string; genero: Sexo | "unissex" }[] = [
  { id: "calca", nome: "Calça", genero: "unissex" },
  { id: "bermuda", nome: "Bermuda", genero: "masculino" },
  { id: "shorts", nome: "Shorts", genero: "feminino" },
  { id: "saia", nome: "Saia", genero: "feminino" },
];

export const SHOE_STYLES: { id: ShoeStyle; nome: string }[] = [
  { id: "tenis", nome: "Tênis" },
  { id: "social", nome: "Social" },
  { id: "bota", nome: "Bota" },
];
