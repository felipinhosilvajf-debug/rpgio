import { useGame } from "../state/GameContext";
import { Avatar, Btn, Card, Label, money } from "./ui";
import type { ClothingItem } from "../game/types";

/**
 * Armário / Guarda-Roupa — exibe todas as roupas compradas pelo jogador
 * e permite equipar a peça atual. Reutilizável no /me e na cidade.
 */
export default function Wardrobe({ compact = false }: { compact?: boolean }) {
  const { player, clothingItems, equipClothing } = useGame();
  if (!player) return null;

  const ownedIds = (player.inventario ?? [])
    .filter((slot) => slot.id.startsWith("clothes_"))
    .map((slot) => slot.id.replace("clothes_", ""));

  const owned: (ClothingItem & { qtd: number })[] = ownedIds
    .map((id) => {
      const item = clothingItems.find((c) => c.id === id);
      if (!item) return null;
      const qtd = (player.inventario ?? []).find((s) => s.id === `clothes_${id}`)?.qtd ?? 1;
      return { ...item, qtd };
    })
    .filter(Boolean) as (ClothingItem & { qtd: number })[];

  const equipadaId = player.roupaEquipada;
  const equipada = clothingItems.find((c) => c.id === equipadaId);

  return (
    <div className="space-y-3">
      {/* resumo do que está vestindo agora */}
      <Card className="flex items-center gap-4 border-l-4 border-[#43dcff]">
        <div className="pixel-inset flex h-[92px] w-[76px] shrink-0 items-center justify-center bg-[#07101d]">
          {equipada ? (
            <Avatar
              cor={equipada.cor}
              cabelo="#3a2418"
              pele={player.pele}
              sexo={equipada.genero === "feminino" ? "feminino" : equipada.genero === "masculino" ? "masculino" : player.sexo}
              camisaModelo={equipada.camisaModelo ?? "camiseta"}
              camisaImagem={equipada.image}
              camisaTransform={equipada.imageTransform}
              size={60}
            />
          ) : (
            <span className="text-2xl text-[#334a70]">👕</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-pixel text-[8px] text-[#43dcff]">VESTINDO AGORA</div>
          {equipada ? (
            <>
              <div className="font-pixel mt-1 text-[10px] text-white">{equipada.nome}</div>
              <div className="text-[10px] text-[#7184a8]">{equipada.camisaModelo ?? "camiseta"} · {equipada.genero ?? "unissex"}</div>
            </>
          ) : (
            <div className="mt-1 text-[11px] text-[#7184a8]">Nenhuma roupa equipada — você está com o look básico.</div>
          )}
        </div>
      </Card>

      {/* lista de peças possuídas */}
      <div>
        <Label>Armário de roupas ({owned.length} peça(s))</Label>
        {owned.length === 0 ? (
          <Card className="text-center text-sm text-[#8fa3c8]">
            Seu armário está vazio. Compre camisas na aba <b className="text-[#c9d6ee]">Roupas</b> da loja! 👕
          </Card>
        ) : (
          <div className={`grid gap-3 ${compact ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
            {owned.map((item) => {
              const equipada = item.id === equipadaId;
              return (
                <Card key={item.id} className={`flex flex-col items-center gap-2 text-center ${equipada ? "ring-2 ring-[#43dcff] shadow-[0_0_14px_rgba(67,220,255,0.15)]" : ""}`}>
                  <div className="pixel-inset flex h-[86px] w-full items-center justify-center bg-[#0a1024]">
                    <Avatar
                      cor={item.cor}
                      cabelo="#3a2418"
                      pele={player.pele}
                      sexo={item.genero === "feminino" ? "feminino" : item.genero === "masculino" ? "masculino" : player.sexo}
                      camisaModelo={item.camisaModelo ?? "camiseta"}
                      camisaImagem={item.image}
                      camisaTransform={item.imageTransform}
                      size={54}
                    />
                  </div>
                  <div className="font-pixel text-[8px] text-white">{item.nome}</div>
                  <div className="text-[9px] text-[#7184a8]">{item.camisaModelo ?? "camiseta"} · {item.genero ?? "unissex"} · {money(item.preco)}</div>
                  {item.qtd > 1 && <div className="font-pixel text-[7px] text-[#ffd65a]">x{item.qtd}</div>}
                  <Btn
                    tone={equipada ? "slate" : "cyan"}
                    size="sm"
                    full
                    disabled={equipada}
                    onClick={() => equipClothing(item.id)}
                  >
                    {equipada ? "✓ Equipada" : "Vestir"}
                  </Btn>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
