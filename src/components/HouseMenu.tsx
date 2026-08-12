import { useState } from "react";
import { useGame } from "../state/GameContext";
import { PROPERTIES } from "../game/mapData";
import { Btn, Card, Label, money } from "./ui";

export default function HouseMenu({ propId, onLeave }: { propId: string; onLeave: () => void }) {
  const { player, properties, directory, toggleHouseLock, sellProperty, kickHouseGuest } = useGame();
  const [open, setOpen] = useState(false);
  if (!player) return null;
  const property = properties[propId];
  if (!property || property.ownerUid !== player.uid) return null;
  const def = Object.values(PROPERTIES).find((entry) => entry.id === propId);
  const price = property.preco || def?.preco || 0;
  const tax = Math.floor(price * 0.2);
  const liquid = price - tax;
  const guests = directory.filter((member) => member.uid !== player.uid && member.scene === "house" && member.currentHouseId === propId);

  const sell = async () => {
    if (!window.confirm(`Vender ${def?.nome ?? "este imóvel"}? Você receberá ${money(liquid)} e ${money(tax)} irá para o Cofre Nacional.`)) return;
    await sellProperty(propId, price);
    onLeave();
  };

  return (
    <div className="pointer-events-auto absolute right-3 bottom-24 z-30 w-[290px]">
      {open ? (
        <div className="hud-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[#263759] bg-gradient-to-r from-[#2d2211] to-[#101827] px-3 py-2.5">
            <span>🏠</span>
            <div className="min-w-0 flex-1"><div className="font-pixel truncate text-[8px] text-[#ffd65a]">{def?.nome ?? "Minha residência"}</div><div className="mt-0.5 text-[9px] text-[#7184a8]">Painel do anfitrião</div></div>
            <button onClick={() => setOpen(false)} className="text-xs text-[#7184a8] hover:text-white">✕</button>
          </div>
          <div className="scroll-thin max-h-[430px] space-y-3 overflow-y-auto p-3">
            <div className="grid grid-cols-2 gap-2">
              <Btn tone={property.locked ? "gold" : "green"} size="sm" full onClick={() => toggleHouseLock(propId)}>{property.locked ? "🔒 Trancada" : "🔓 Aberta"}</Btn>
              <Btn tone="slate" size="sm" full onClick={onLeave}>🚪 Sair</Btn>
            </div>

            <Card>
              <Label>Visitantes dentro da casa ({guests.length})</Label>
              {guests.length === 0 && <div className="text-[10px] text-[#52698e]">Nenhum visitante no momento.</div>}
              <div className="space-y-1.5">
                {guests.map((guest) => (
                  <div key={guest.uid} className="flex items-center gap-2 border-t border-[#1c2a45] pt-1.5">
                    <div className="h-3 w-3 border border-[#0a1024]" style={{ background: guest.cor }} />
                    <div className="min-w-0 flex-1"><div className="truncate text-[10px] text-white">{guest.nome}</div><div className="text-[8px] text-[#7184a8]">{guest.rg}</div></div>
                    <Btn tone="red" size="sm" onClick={() => kickHouseGuest(propId, guest.uid)}>Expulsar</Btn>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="border-l-4 border-[#ef5d65]">
              <Label>Venda do imóvel</Label>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between text-[#9fb0ce]"><span>Valor original</span><span>{money(price)}</span></div>
                <div className="flex justify-between text-[#ef5d65]"><span>Taxa do Governo (20%)</span><span>− {money(tax)}</span></div>
                <div className="flex justify-between border-t border-[#263759] pt-1 font-bold text-[#55e294]"><span>Você recebe no banco</span><span>{money(liquid)}</span></div>
              </div>
              <Btn tone="red" size="sm" full className="mt-2" onClick={sell}>💸 Vender e liberar casa</Btn>
            </Card>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="pixel-btn ml-auto flex items-center gap-2 bg-gradient-to-r from-[#8b5a2b] to-[#5f3719] px-3 py-2 font-pixel text-[8px] text-white">🏠 Minha casa</button>
      )}
    </div>
  );
}