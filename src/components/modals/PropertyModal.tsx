import { useState } from "react";
import { useGame } from "../../state/GameContext";
import { getProperty, PROPERTIES } from "../../game/mapData";
import { Btn, Card, Label, Modal, money } from "../ui";

export default function PropertyModal({
  propKey,
  onClose,
  onEnter,
}: {
  propKey: string;
  onClose: () => void;
  onEnter: () => void;
}) {
  const { player, properties, buyProperty, sellProperty, toggleHouseLock } = useGame();
  const [useCredit, setUseCredit] = useState(false);
  if (!player) return null;

  const [xs, ys] = propKey.split("_");
  const def = getProperty(Number(xs), Number(ys));
  const doc = properties[def.id];
  const dono = doc?.ownerUid ?? null;
  const meu = dono === player.uid || player.propriedadesCompradas?.includes(def.id);
  const disponivel = !dono;
  const total = player.saldoCarteira + player.saldoBanco;
  const meusImoveis = Object.values(properties).filter((p) => p.ownerUid === player.uid);

  return (
    <Modal title="Imobiliária PixelCity" icon="🏠" accent="#8b5a2b" onClose={onClose} width="max-w-2xl">
      <div className="space-y-4">
        <Card className="flex flex-wrap items-start gap-4">
          <div className="relative h-28 w-32 shrink-0 border-2 border-[#0a1024]" style={{ background: "linear-gradient(180deg,#79b6e0 0%,#79b6e0 55%,#57a049 55%)" }}>
            <div className="absolute left-4 top-8 h-14 w-24" style={{ background: "#d8c9a8" }} />
            <div className="absolute left-2 top-3 h-6 w-28" style={{ background: "#b8443c" }} />
            <div className="absolute left-12 top-14 h-8 w-6" style={{ background: "#8b5a2b" }} />
            <div className="absolute left-6 top-11 h-4 w-4" style={{ background: "#79b6e0", boxShadow: "inset 0 0 0 1px #3a4a63" }} />
            <div className="absolute left-[86px] top-11 h-4 w-4" style={{ background: "#79b6e0", boxShadow: "inset 0 0 0 1px #3a4a63" }} />
            {!disponivel && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55 font-pixel text-[8px] text-[#ff9a90]">
                {meu ? "SUA CASA" : "VENDIDA"}
              </div>
            )}
          </div>
          <div className="min-w-[200px] flex-1">
            <div className="font-pixel text-[11px] text-white">{def.nome}</div>
            <div className="mt-1 text-xs text-[#9fb2d4]">{def.desc}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#8fa3c8]">
              <span className="pixel-inset px-2 py-1">🛏 {def.quartos} quartos</span>
              <span className="pixel-inset px-2 py-1">📍 Lote {xs}/{ys}</span>
              <span className="pixel-inset px-2 py-1 text-[#ffd980]">{money(def.preco)}</span>
            </div>
            {dono && !meu && (
              <div className="mt-2 text-xs text-[#ff9a90]">Proprietário atual: <b>{doc?.ownerNome}</b></div>
            )}
          </div>
        </Card>

        {disponivel && (
          <div className="space-y-2">
            <Card className="flex items-center justify-between text-xs text-[#9fb2d4]">
              <span>Seu poder de compra (carteira + banco)</span>
              <b className={total >= def.preco ? "text-[#59e08a]" : "text-[#ff9a90]"}>{money(total)}</b>
            </Card>
            <label className="flex cursor-pointer items-center gap-2 border border-[#263b60] bg-[#0c1a2d] px-3 py-2 text-[11px] text-[#c9d6ee]">
              <input type="checkbox" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} className="h-4 w-4 accent-[#43dcff]" />
              💳 <b>Pagar com Cartão de Crédito</b> <span className="text-[9px] text-[#8fa3c8]">(+2% imposto)</span>
              {player.cartaoCredito && <span className="ml-auto font-pixel text-[7px] text-[#43dcff]">Disp.: {money(Math.max(0, (player.cartaoLimite ?? 0) - (player.cartaoFatura ?? 0)))}</span>}
            </label>
            <Btn tone={useCredit ? "purple" : "green"} size="lg" full disabled={!useCredit && total < def.preco} onClick={() => buyProperty(propKey, useCredit)}>
              {useCredit ? "💳" : "🔑"} Comprar por {money(def.preco)}
            </Btn>
            {total < def.preco && (
              <div className="text-center text-[11px] text-[#ff9a90]">
                Faltam {money(def.preco - total)} — trabalhe mais alguns turnos!
              </div>
            )}
          </div>
        )}

        {meu && (
          <div className="grid gap-2 sm:grid-cols-3">
            <Btn tone="blue" size="lg" onClick={onEnter}>
              🚪 Entrar em casa
            </Btn>
            <Btn tone={doc?.locked ? "gold" : "slate"} size="lg" onClick={() => toggleHouseLock(def.id)}>
              {doc?.locked ? "🔓 Destrancar" : "🔒 Trancar"}
            </Btn>
            <Btn tone="red" size="lg" onClick={() => sellProperty(def.id, def.preco)}>
              💸 Vender · taxa Governo 20%
            </Btn>
          </div>
        )}
        {meu && (
          <Card className="text-[11px] text-[#8fa3c8]">
            🛋 <b className="text-[#c9d6ee]">Mobília:</b> entre na casa e use o botão 🛠 para posicionar os objetos comprados na loja.
            {doc?.furniture && Object.keys(doc.furniture).length > 0 && <> · {Object.keys(doc.furniture).length} móveis colocados</>}
          </Card>
        )}

        {!disponivel && !meu && (
          <Card className="text-center text-sm text-[#8fa3c8]">
            Este imóvel já pertence a outro cidadão. Procure outra placa de venda pela cidade!
          </Card>
        )}

        <div>
          <Label>Mercado imobiliário — {Object.keys(PROPERTIES).length} lotes oficiais</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(PROPERTIES).map(([k, d]) => {
              const st = properties[d.id];
              const owned = Boolean(st?.ownerUid);
              const mine = st?.ownerUid === player.uid;
              return (
                <div key={k} className={`pixel-inset flex items-center justify-between gap-2 p-2 ${k === propKey ? "ring-2 ring-[#7ee0ff]" : ""}`}>
                  <div>
                    <div className="font-pixel text-[8px] text-white">{d.nome}</div>
                    <div className="text-[10px] text-[#8fa3c8]">{money(d.preco)}</div>
                  </div>
                  <span className={`font-pixel text-[7px] ${mine ? "text-[#7ee0ff]" : owned ? "text-[#ff9a90]" : "text-[#59e08a]"}`}>
                    {mine ? "SUA" : owned ? "VENDIDA" : "À VENDA"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {meusImoveis.length > 0 && (
          <Card className="text-[11px] text-[#8fa3c8]">
            🏘 Você possui <b className="text-[#7ee0ff]">{meusImoveis.length}</b> imóvel(is) registrado(s) oficialmente em seu nome.
          </Card>
        )}
      </div>
    </Modal>
  );
}
