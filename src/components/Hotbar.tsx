import { useEffect } from "react";
import { useGame } from "../state/GameContext";
import { getItem } from "../game/jobs";
import type { ModalId } from "./HUD";

export default function Hotbar({ locked, onOpenInventory }: { locked: boolean; onOpenInventory: (m: ModalId) => void }) {
  const { player, useHotbarSlot, equipSlot } = useGame();

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (locked) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 6) { e.preventDefault(); useHotbarSlot(n - 1); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [locked, useHotbarSlot]);

  if (!player) return null;
  const eq = player.equipped ?? [null, null, null, null, null, null];

  return (
    <div className="pointer-events-auto absolute bottom-3 left-1/2 z-20 -translate-x-1/2">
      <div className="hud-card flex items-end gap-1.5 p-2">
        {Array.from({ length: 6 }).map((_, i) => {
          const itemId = eq[i];
          const item = itemId ? getItem(itemId) : null;
          const invQtd = itemId ? player.inventario?.find((s) => s.id === itemId)?.qtd ?? 0 : 0;
          return (
            <button
              key={i}
              onClick={() => (item ? useHotbarSlot(i) : onOpenInventory("inv"))}
              onContextMenu={(e) => { e.preventDefault(); if (item) equipSlot(i, null); }}
              title={item ? `${item.nome} (clique direito para remover)` : `Slot ${i + 1} — clique para abrir a mochila`}
              className="slot relative flex h-14 w-14 flex-col items-center justify-center"
            >
              <span className="absolute left-1 top-0.5 font-pixel text-[7px] text-[#43dcff]">{i + 1}</span>
              {item ? (
                <>
                  <span className="text-2xl drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]">{item.icone}</span>
                  {invQtd > 0 && (
                    <span className="absolute bottom-0.5 right-1 min-w-4 border border-[#0a1024] bg-[#ffd65a] px-0.5 text-center font-pixel text-[7px] text-[#2c1e05]">
                      {invQtd}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-lg text-[#334a70]">+</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-1 text-center font-pixel text-[6px] text-[#3a4d70]">TECLAS 1-6 · CLIQUE DIREITO REMOVE</div>
    </div>
  );
}
