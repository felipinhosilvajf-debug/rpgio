import { useState } from "react";
import { useGame } from "../../state/GameContext";
import { ITEMS, effectivePrice, getItem, getJob } from "../../game/jobs";
import { Bar, Btn, Card, Label, Modal, money } from "../ui";
import Wardrobe from "../Wardrobe";

export default function ShopModal({
  loja, onClose, startTab = "loja",
}: { loja: "mercado" | "arsenal"; onClose: () => void; startTab?: "loja" | "inventario" }) {
  const { player, buyItem, useItem, equipSlot, priceOverrides, customObjects, buyCustomObject, clothingItems, buyClothing } = useGame();
  const [tab, setTab] = useState<"loja" | "inventario" | "objetos" | "roupas">(startTab === "inventario" ? "inventario" : "loja");
  const [qtd, setQtd] = useState<Record<string, number>>({});
  const [useCredit, setUseCredit] = useState(false);
  if (!player) return null;

  const disponiveis = ITEMS.filter((i) => i.loja === loja);
  const titulo = loja === "arsenal" ? "Arsenal Corporativo" : "Mercado PixelCity";
  const semAcesso = (soJobs?: string[]) => Boolean(soJobs && soJobs.length > 0 && !soJobs.includes(player.emprego));

  const equipNextSlot = (itemId: string) => {
    const eq = [...(player.equipped ?? [null, null, null, null, null, null])];
    const free = eq.findIndex((s) => !s);
    const slot = free >= 0 ? free : 0;
    equipSlot(slot, itemId);
  };

  return (
    <Modal
      title={tab === "loja" ? titulo : "Mochila / Inventário"}
      icon={loja === "arsenal" ? "🎖️" : "🛒"}
      accent={loja === "arsenal" ? "#5d7a45" : "#c07c2a"}
      onClose={onClose}
      width="max-w-3xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-pixel text-[9px] text-[#ffd980]">💵 CARTEIRA: {money(player.saldoCarteira)}</div>
          <div className="flex items-center gap-3 text-[11px] text-[#8fa3c8]">
            <span className="flex items-center gap-1.5">⚡ <Bar value={player.energia} color="#ffd980" className="w-24" /> {Math.round(player.energia)}</span>
            <span className="flex items-center gap-1.5">❤️ <Bar value={player.saude} color="#e0574c" className="w-24" /> {Math.round(player.saude)}</span>
          </div>
        </div>
      }
    >
      <div className="mb-3 flex gap-2">
        <Btn tone={tab === "loja" ? "blue" : "slate"} size="sm" onClick={() => setTab("loja")}>Comprar</Btn>
        <Btn tone={tab === "inventario" ? "blue" : "slate"} size="sm" onClick={() => setTab("inventario")}>
          Meus itens ({(player.inventario ?? []).reduce((a, b) => a + b.qtd, 0)})
        </Btn>
        <Btn tone={tab === "objetos" ? "purple" : "slate"} size="sm" onClick={() => setTab("objetos")}>
          Objetos
        </Btn>
        <Btn tone={tab === "roupas" ? "cyan" : "slate"} size="sm" onClick={() => setTab("roupas")}>
          Roupas
        </Btn>
      </div>

      {tab !== "inventario" && (
        <div className="mb-3 flex items-center justify-between gap-2 border border-[#263b60] bg-[#0c1a2d] px-3 py-2">
          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-[#c9d6ee]">
            <input type="checkbox" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} className="h-4 w-4 accent-[#43dcff]" />
            💳 <b>Pagar com Cartão de Crédito</b> <span className="text-[9px] text-[#8fa3c8]">(+2% imposto)</span>
          </label>
          {player.cartaoCredito && (
            <span className="font-pixel text-[7px] text-[#43dcff]">Limite disponível: {money(Math.max(0, (player.cartaoLimite ?? 0) - (player.cartaoFatura ?? 0)))}</span>
          )}
        </div>
      )}

      {tab === "loja" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {disponiveis.map((item) => {
            const q = qtd[item.id] ?? 1;
            const bloqueado = semAcesso(item.soJobs);
            const preco = effectivePrice(item.id, priceOverrides);
            return (
              <Card key={item.id} className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-[#0a1024] bg-[#18233d]"><span className="text-2xl">{item.icone}</span></div>
                <div className="min-w-0 flex-1">
                  <div className="font-pixel text-[9px] text-white">{item.nome}</div>
                  <div className="text-[11px] text-[#8fa3c8]">{item.desc}</div>
                  <div className="mt-0.5 text-[11px] font-bold text-[#ffd980]">{money(preco)}</div>
                  {bloqueado && (
                    <div className="text-[10px] text-[#ff9a90]">
                      Exclusivo de: {item.soJobs?.map((j) => getJob(j)?.nome).join(", ")}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center">
                    <button className="pixel-btn bg-[#3a4763] px-2 py-1 text-xs text-white" onClick={() => setQtd({ ...qtd, [item.id]: Math.max(1, q - 1) })}>−</button>
                    <span className="w-7 text-center font-pixel text-[9px] text-white">{q}</span>
                    <button className="pixel-btn bg-[#3a4763] px-2 py-1 text-xs text-white" onClick={() => setQtd({ ...qtd, [item.id]: Math.min(99, q + 1) })}>+</button>
                  </div>
                  <Btn tone={useCredit ? "purple" : "green"} size="sm" disabled={bloqueado || (!useCredit && player.saldoCarteira + player.saldoBanco < preco * q)} onClick={() => buyItem(item.id, q, useCredit)}>
                    {useCredit ? "💳 Comprar" : "Comprar"}
                  </Btn>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "inventario" && (
        <div>
          {(player.inventario ?? []).filter((s) => !s.id.startsWith("clothes_")).length === 0 ? (
            <Card className="text-center text-sm text-[#8fa3c8]">Sua mochila está vazia. Visite o mercado da cidade! 🛒</Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(player.inventario ?? []).map((slot) => {
                if (slot.id.startsWith("clothes_")) return null;
                const item = getItem(slot.id);
                if (!item) return null;
                const jaEquipado = (player.equipped ?? []).includes(slot.id);
                return (
                  <Card key={slot.id} className="flex flex-col items-center gap-2 text-center">
                    <div className="relative flex h-16 w-16 items-center justify-center border-2 border-[#0a1024] bg-[#18233d]">
                      <span className="text-3xl">{item.icone}</span>
                      <span className="absolute -bottom-1 -right-1 border-2 border-[#0a1024] bg-[#3f7ad6] px-1.5 font-pixel text-[8px] text-white">{slot.qtd}</span>
                    </div>
                    <div className="font-pixel text-[8px] text-white">{item.nome}</div>
                    <div className="text-[10px] text-[#8fa3c8]">{item.desc}</div>
                    <div className="flex w-full gap-1.5">
                      {(item.energia || item.saude) && (
                        <Btn tone="green" size="sm" full onClick={() => useItem(slot.id)}>Usar</Btn>
                      )}
                      <Btn tone={jaEquipado ? "slate" : "cyan"} size="sm" full onClick={() => equipNextSlot(slot.id)} disabled={jaEquipado}>
                        {jaEquipado ? "Na Hotbar" : "🎯 Equipar"}
                      </Btn>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          <div className="mt-4">
            <Label>Status do personagem</Label>
            <Card className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#9fb2d4]">⚡ Energia <Bar value={player.energia} color="#ffd980" /> <span className="w-8 text-right">{Math.round(player.energia)}</span></div>
              <div className="flex items-center gap-2 text-xs text-[#9fb2d4]">❤️ Saúde <Bar value={player.saude} color="#e0574c" /> <span className="w-8 text-right">{Math.round(player.saude)}</span></div>
            </Card>
          </div>

          <div className="mt-4 border-t border-[#263b60] pt-4">
            <Wardrobe compact />
          </div>
        </div>
      )}

      {tab === "roupas" && (
        <ClothesShopSection clothingItems={clothingItems} player={player} useCredit={useCredit} buyClothing={buyClothing} />
      )}

      {tab === "objetos" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {customObjects.filter((o) => o.sellable).length === 0 && (
            <Card className="sm:col-span-2 text-center text-sm text-[#8fa3c8]">Nenhum objeto especial à venda no momento.</Card>
          )}
          {customObjects.filter((o) => o.sellable).map((o) => {
            const owned = (player.propriedadesCompradas ?? []).includes(`obj_${o.objId}`);
            return (
              <Card key={o.id} className="flex items-center gap-3">
                <img src={o.image} alt={o.nome} className="h-16 w-16 border-2 border-[#0a1024] object-contain" style={{ imageRendering: "pixelated" }} />
                <div className="min-w-0 flex-1">
                  <div className="font-pixel text-[8px] text-white">{o.nome}</div>
                  <div className="text-[10px] text-[#8fa3c8]">{o.w}x{o.h} tiles</div>
                  <div className="mt-1 text-xs font-bold text-[#ffd980]">{money(o.preco)}</div>
                </div>
                <Btn tone={owned ? "slate" : useCredit ? "purple" : "green"} size="sm" disabled={owned || (!useCredit && player.saldoCarteira + player.saldoBanco < o.preco)} onClick={() => buyCustomObject(o.objId, o.preco, useCredit)}>
                  {owned ? "Comprado" : useCredit ? "💳 Comprar" : "Comprar"}
                </Btn>
              </Card>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

function ClothesShopSection({ clothingItems, player, useCredit, buyClothing }: {
  clothingItems: import("../../game/types").ClothingItem[];
  player: NonNullable<ReturnType<typeof useGame>["player"]>;
  useCredit: boolean;
  buyClothing: (id: string, useCredit: boolean) => void;
}) {
  const [filtro, setFiltro] = useState<"todas" | "masculino" | "feminino" | "unissex">("todas");
  const items = clothingItems.filter((item) => {
    const gen = (item as unknown as { genero?: string }).genero ?? "unissex";
    if (filtro === "todas") return true;
    if (filtro === "unissex") return gen === "unissex";
    return gen === filtro;
  });
  const genLabels: Record<string, string> = { todas: "Todas", masculino: "♂ Masculinas", feminino: "♀ Femininas", unissex: "Unissex" };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(["todas", "masculino", "feminino", "unissex"] as const).map((f) => (
          <Btn key={f} tone={filtro === f ? "blue" : "slate"} size="sm" onClick={() => setFiltro(f)}>{genLabels[f]}</Btn>
        ))}
      </div>
      {items.length === 0 ? (
        <Card className="text-center text-sm text-[#8fa3c8]">Nenhuma camisa disponível nesta categoria ainda.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const gen = (item as unknown as { genero?: string }).genero ?? "unissex";
            const owned = (player.inventario ?? []).some((i) => i.id === `clothes_${item.id}`);
            return (
              <Card key={item.id} className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden border-2 border-[#0a1024]" style={{ background: item.cor }}>
                  {item.image && <img src={item.image} alt="estampa" className="h-full w-full object-contain" style={{ imageRendering: "pixelated" }} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-pixel text-[9px] text-white">{item.nome}</div>
                  <div className="text-[10px] text-[#8fa3c8]">{item.camisaModelo ?? "camiseta"} · {gen}</div>
                  <div className="mt-0.5 text-[11px] font-bold text-[#ffd980]">{money(item.preco)}</div>
                </div>
                <div className="flex flex-col gap-1">
                  {!owned ? (
                    <Btn tone={useCredit ? "purple" : "green"} size="sm" disabled={!useCredit && player.saldoCarteira + player.saldoBanco < item.preco} onClick={() => buyClothing(item.id, useCredit)}>
                      {useCredit ? "💳 Comprar" : "Comprar"}
                    </Btn>
                  ) : (
                    <span className="font-pixel text-[6px] text-[#55e294]">COMPRADA</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
