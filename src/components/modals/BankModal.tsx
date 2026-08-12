import { useState } from "react";
import { doc, increment, updateDoc } from "firebase/firestore";
import { db, COL } from "../../firebase";
import { useGame } from "../../state/GameContext";
import { Btn, Card, Label, Modal, money } from "../ui";
import { PROPERTIES } from "../../game/mapData";
import { calculatePatrimony } from "../../game/types";

export default function BankModal({ onClose }: { onClose: () => void }) {
  const { player, others, deposit, withdraw, properties, patch, notify, offline } = useGame();
  const [valor, setValor] = useState(500);
  const [alvo, setAlvo] = useState("");
  const [tab, setTab] = useState<"conta" | "transferir" | "patrimonio">("conta");
  if (!player) return null;

  const meus = Object.values(properties).filter((p) => p.ownerUid === player.uid);
  const patrimonio = calculatePatrimony(player, properties);

  const transferir = async () => {
    const destino = others.find((o) => o.uid === alvo);
    if (!destino) return notify("Selecione um jogador online.", "bad");
    if (valor <= 0 || player.saldoBanco < valor) return notify("Saldo bancário insuficiente.", "bad");
    if (!offline && db) {
      try {
        await updateDoc(doc(db, COL.users, destino.uid), { saldoBanco: increment(valor) });
      } catch {
        return notify("Não foi possível transferir agora.", "bad");
      }
    }
    patch({ saldoBanco: player.saldoBanco - valor });
    notify(`Transferência de ${money(valor)} para ${destino.nome} concluída!`, "money");
  };

  return (
    <Modal title="Banco Central de PixelCity" icon="🏦" accent="#3f8f7c" onClose={onClose} width="max-w-2xl">
      <div className="mb-4 flex flex-wrap gap-2">
        {([["conta", "Conta"], ["transferir", "Transferir"], ["patrimonio", "Patrimônio"]] as const).map(([id, l]) => (
          <Btn key={id} tone={tab === id ? "blue" : "slate"} size="sm" onClick={() => setTab(id)}>
            {l}
          </Btn>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Card className="border-l-4 border-[#ffd980]">
          <Label>Carteira</Label>
          <div className="font-pixel text-[13px] text-[#ffd980]">{money(player.saldoCarteira)}</div>
        </Card>
        <Card className="border-l-4 border-[#59e08a]">
          <Label>Conta bancária</Label>
          <div className="font-pixel text-[13px] text-[#59e08a]">{money(player.saldoBanco)}</div>
        </Card>
      </div>

      {tab === "conta" && (
        <div className="space-y-3">
          <Label>Valor da operação</Label>
          <input
            type="number"
            min={0}
            value={valor}
            onChange={(e) => setValor(Math.max(0, Number(e.target.value)))}
            className="pixel-inset w-full px-3 py-2.5 text-lg font-bold text-[#e8eefb] outline-none"
          />
          <div className="flex flex-wrap gap-2">
            {[100, 500, 1000, 5000].map((v) => (
              <Btn key={v} tone="slate" size="sm" onClick={() => setValor(v)}>
                {money(v)}
              </Btn>
            ))}
            <Btn tone="slate" size="sm" onClick={() => setValor(player.saldoCarteira)}>
              Tudo da carteira
            </Btn>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Btn tone="green" size="lg" onClick={() => deposit(valor)}>
              ⬇ Depositar
            </Btn>
            <Btn tone="gold" size="lg" onClick={() => withdraw(valor)}>
              ⬆ Sacar
            </Btn>
          </div>
          <Card className="text-[11px] leading-relaxed text-[#8fa3c8]">
            💡 Dinheiro na carteira pode ser perdido em confrontos. Guarde no banco — o saldo fica sincronizado em tempo real
            com sua conta de cidadão.
          </Card>

          <CardBillBox />

          <AuxilioGovCard />
        </div>
      )}

      {tab === "transferir" && (
        <div className="space-y-3">
          <Label>Jogador de destino ({others.length} online)</Label>
          <select
            value={alvo}
            onChange={(e) => setAlvo(e.target.value)}
            className="pixel-inset w-full px-3 py-2.5 text-sm text-[#e8eefb] outline-none"
          >
            <option value="">— selecione —</option>
            {others.map((o) => (
              <option key={o.uid} value={o.uid}>
                {o.nome} ({o.patente})
              </option>
            ))}
          </select>
          <Label>Valor</Label>
          <input
            type="number"
            min={0}
            value={valor}
            onChange={(e) => setValor(Math.max(0, Number(e.target.value)))}
            className="pixel-inset w-full px-3 py-2.5 text-lg font-bold text-[#e8eefb] outline-none"
          />
          <Btn tone="green" size="lg" full onClick={transferir} disabled={!alvo}>
            💸 Enviar transferência
          </Btn>
        </div>
      )}

      {tab === "patrimonio" && (
        <div className="space-y-3">
          <Card className="flex items-center justify-between">
            <span className="font-pixel text-[9px] text-[#8fa3c8]">PATRIMÔNIO TOTAL</span>
            <span className="font-pixel text-[13px] text-[#ffd980]">{money(patrimonio)}</span>
          </Card>
          <Card className="grid grid-cols-2 gap-2 text-[11px] text-[#8fa3c8]">
            <div>💵 Carteira <b className="text-[#ffd980]">{money(player.saldoCarteira)}</b></div>
            <div>🏦 Banco <b className="text-[#59e08a]">{money(player.saldoBanco)}</b></div>
            <div>💳 Limite de crédito <b className="text-[#7ee0ff]">{money(player.cartaoLimite ?? 0)}</b></div>
            <div>🏠 Imóveis <b className="text-[#c9d6ee]">{money(meus.reduce((sum, property) => sum + (property.preco ?? 0), 0))}</b></div>
          </Card>
          <Label>Imóveis registrados em seu nome</Label>
          {meus.length === 0 && <Card className="text-sm text-[#8fa3c8]">Nenhum imóvel ainda. Procure as casas com placa de venda 🏠</Card>}
          {meus.map((p) => {
            const def = Object.values(PROPERTIES).find((d) => d.id === p.id);
            return (
              <Card key={p.id} className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-pixel text-[9px] text-white">🏠 {def?.nome ?? p.id}</div>
                  <div className="text-[11px] text-[#8fa3c8]">Valor de mercado: {money(p.preco ?? 0)}</div>
                </div>
                <span className="font-pixel text-[8px] text-[#59e08a]">QUITADO</span>
              </Card>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

function CardBillBox() {
  const { player, payCardBill, requestCreditCard } = useGame();
  if (!player) return null;
  if (!player.cartaoCredito) {
    return (
      <Card className="border-l-4 border-[#43dcff]">
        <Label>💳 Cartão de Crédito</Label>
        <p className="mt-1 text-[11px] text-[#8fa3c8]">Solicite seu cartão a partir do nível 3 e pague no crédito nas lojas da cidade.</p>
        <Btn tone="cyan" size="sm" className="mt-2" onClick={requestCreditCard}>Solicitar cartão</Btn>
      </Card>
    );
  }
  const fatura = player.cartaoFatura ?? 0;
  const juros = Math.ceil(fatura * 0.10);
  const total = fatura + juros;
  const disponivel = Math.max(0, (player.cartaoLimite ?? 0) - fatura);
  const negativo = player.saldoCarteira < 0 || player.saldoBanco < 0;
  return (
    <Card className="border-l-4 border-[#ffd65a]">
      <Label>💳 Cartão de Crédito · PIXEL BLACK</Label>
      <div className="mt-1 grid grid-cols-2 gap-2 text-[11px]">
        <div><span className="text-[#8fa3c8]">Limite total:</span> <b className="text-[#c9d6ee]">{money(player.cartaoLimite ?? 0)}</b></div>
        <div><span className="text-[#8fa3c8]">Disponível:</span> <b className="text-[#55e294]">{money(disponivel)}</b></div>
        <div><span className="text-[#8fa3c8]">Fatura atual:</span> <b className="text-[#ffd65a]">{money(fatura)}</b></div>
        <div><span className="text-[#8fa3c8]">+ juros (10%):</span> <b className="text-[#ff9a90]">{money(juros)}</b></div>
      </div>
      {negativo && <div className="mt-2 border-l-2 border-[#ef5d65] pl-2 text-[10px] text-[#ff9a90]">❌ Cartão bloqueado — regularize seu saldo primeiro.</div>}
      <Btn tone="gold" size="sm" full className="mt-2" disabled={fatura <= 0 || player.saldoBanco < total} onClick={() => payCardBill(true)}>
        Quitar fatura · {money(total)}
      </Btn>
    </Card>
  );
}

function AuxilioGovCard() {
  const { player, economyConfig, claimAuxilioGov, treasury } = useGame();
  if (!player) return null;

  const isDesempregado = player.emprego === "desempregado";
  const ativo = economyConfig?.auxilioAtivo ?? true;
  const valor = economyConfig?.auxilioValor ?? 300;
  const intervaloMin = economyConfig?.auxilioIntervaloMinutos ?? 60;
  const intervaloMs = intervaloMin * 60 * 1000;
  const proximoDisponivel = (player.lastAuxilio || 0) + intervaloMs;
  const emCooldown = Date.now() < proximoDisponivel;
  const faltamMin = emCooldown ? Math.ceil((proximoDisponivel - Date.now()) / 60000) : 0;
  const cofreSemVerba = (treasury?.saldo ?? 0) < valor;

  return (
    <Card className="border-l-4 border-[#43dcff] space-y-2">
      <div className="flex items-center justify-between">
        <Label>🏛 AUXÍLIO DO GOVERNO</Label>
        <span className={`font-pixel text-[7px] ${!ativo ? "text-[#8fa3c8]" : isDesempregado && !emCooldown && !cofreSemVerba ? "text-[#55e294]" : "text-[#ffd65a]"}`}>
          {!ativo ? "DESATIVADO" : isDesempregado ? (emCooldown ? `DISPONÍVEL EM ${faltamMin}m` : "ELEGÍVEL") : "EXCLUSIVO DESEMPREGADOS"}
        </span>
      </div>

      <div className="text-xs text-[#c9d6ee]">
        Valor do benefício: <b className="text-[#ffd65a]">{money(valor)}</b>
      </div>

      {!isDesempregado ? (
        <div className="text-[10px] text-[#8fa3c8]">
          Cidadãos empregados não têm direito ao Auxílio do Governo.
        </div>
      ) : !ativo ? (
        <div className="text-[10px] text-[#ffcf6b]">
          O Auxílio do Governo está temporariamente desativado pela administração.
        </div>
      ) : cofreSemVerba ? (
        <div className="text-[10px] text-[#ff9a90]">
          O Cofre Nacional não possui verba suficiente no momento.
        </div>
      ) : emCooldown ? (
        <div className="text-[10px] text-[#ffd65a]">
          Aguarde {faltamMin} minuto(s) para solicitar novamente.
        </div>
      ) : (
        <div className="text-[10px] text-[#55e294]">
          Você cumpre todos os requisitos para solicitar o Auxílio!
        </div>
      )}

      <Btn
        tone="cyan"
        size="sm"
        full
        disabled={!isDesempregado || !ativo || emCooldown || cofreSemVerba}
        onClick={claimAuxilioGov}
      >
        🏛 Solicitar Auxílio · {money(valor)}
      </Btn>
    </Card>
  );
}
