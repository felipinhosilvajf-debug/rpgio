import { useState } from "react";
import { useGame } from "../state/GameContext";
import { ITEMS, JOBS, calcNivel, effectivePrice, effectiveSalary, getItem, getJob, getUniform, nextRank, prevRank } from "../game/jobs";
import { Avatar, Bar, Btn, Card, Input, Label, money, BOTTOM_STYLES, CABELOS, CORES, HAIR_STYLES, PELES, SHIRT_STYLES, SHOE_STYLES } from "./ui";
import { AdminModal } from "./HUD";
import Wardrobe from "./Wardrobe";
import AvatarCanvas from "./AvatarCanvas";
import { calculatePatrimony } from "../game/types";
import { PROPERTIES } from "../game/mapData";

type PortalTab = "character" | "inventory" | "shop" | "jobs" | "bank" | "staff" | "settings" | "control";

const TABS: { id: PortalTab; label: string; icon: string }[] = [
  { id: "character", label: "Meu Personagem", icon: "👤" },
  { id: "inventory", label: "Inventário", icon: "🎒" },
  { id: "shop", label: "Loja & Objetos", icon: "🛍" },
  { id: "jobs", label: "Organizações", icon: "💼" },
  { id: "bank", label: "Banco Digital", icon: "🏦" },
  { id: "staff", label: "Equipe Staff", icon: "👥" },
  { id: "settings", label: "Configurações", icon: "⚙" },
];

export default function MePage({ onPlay }: { onPlay: () => void }) {
  const { player, logout } = useGame();
  const [tab, setTab] = useState<PortalTab>("character");
  const [showControl, setShowControl] = useState(false);
  if (!player) return null;
  const menu = player.isAdmin ? [...TABS, { id: "control" as PortalTab, label: "Painel de Controle", icon: "🛡" }] : TABS;

  return (
    <div className="portal-shell h-screen overflow-y-auto bg-[#070b14] text-[#e8eefb]">
      <header className="sticky top-0 z-30 border-b border-[#263759] bg-[#080d18]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1380px] flex-wrap items-center gap-4 px-4 py-3 lg:px-8">
          <button onClick={() => setTab("character")} className="font-pixel text-[13px] text-[#ffd65a] drop-shadow-[0_0_14px_rgba(255,214,90,0.55)]">
            PIXELCITY <span className="text-[#4ae8ff]">/ME</span>
          </button>
          <nav className="scroll-thin flex min-w-0 flex-1 gap-1 overflow-x-auto pb-1">
            {menu.map((item) => (
              <button key={item.id} onClick={() => item.id === "control" ? setShowControl(true) : setTab(item.id)}
                className={`shrink-0 border px-3 py-2 text-[11px] transition ${tab === item.id ? "border-[#43dcff] bg-[#123047] text-white shadow-[0_0_14px_rgba(67,220,255,0.25)]" : "border-transparent text-[#7184a8] hover:border-[#2c4268] hover:text-white"}`}>
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
          <Btn tone="green" onClick={onPlay}>Entrar na cidade</Btn>
          <Btn tone="red" size="sm" onClick={logout}>Sair</Btn>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1380px] px-4 py-7 lg:px-8">
        <div className="pointer-events-none absolute left-0 top-0 h-72 w-72 rounded-full bg-[#124e8a]/20 blur-[100px]" />
        <div className="pointer-events-none absolute right-10 top-20 h-64 w-64 rounded-full bg-[#397743]/15 blur-[100px]" />
        <div className="relative">
          {tab === "character" && <CharacterTab />}
          {tab === "inventory" && <InventoryTab />}
          {tab === "shop" && <ShopTab />}
          {tab === "jobs" && <OrganizationsTab />}
          {tab === "bank" && <BankTab />}
          {tab === "staff" && <StaffTab />}
          {tab === "settings" && <SettingsTab onOpenControl={() => setShowControl(true)} />}
        </div>
      </main>
      {showControl && player.isAdmin && <AdminModal onClose={() => setShowControl(false)} />}
    </div>
  );
}

function CharacterTab() {
  const { player, properties, transactions, orgConfigs, sellProperty, clothingItems } = useGame();
  const [sellingPropId, setSellingPropId] = useState<string | null>(null);
  if (!player) return null;
  const job = getJob(player.emprego);
  const clothing = player.roupaEquipada ? clothingItems.find((c) => c.id === player.roupaEquipada) : null;
  const level = calcNivel(player.xp);
  const patrimony = calculatePatrimony(player, properties);
  const service = transactions.filter((t) => (t.from === player.uid || t.to === player.uid) && t.tipo === "salario").slice(0, 6);

  // Mapeamento de imóveis do jogador
  const ownedProps = Object.values(properties).filter((p) => p.ownerUid === player.uid);
  const totalImoveisValor = ownedProps.reduce((sum, p) => sum + (p.preco ?? 0), 0);

  return <div className="space-y-6">
    <Heading eyebrow="PORTAL DO CIDADÃO · PERFIL SINCRONIZADO" title={`Bem-vindo, ${player.nome}.`} subtitle="Sua identidade, carreira e economia em um único painel." />
    <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
      <section className="neon-panel overflow-hidden">
        <div className="flex flex-wrap gap-6 bg-gradient-to-br from-[#152642] to-[#0b1426] p-6">
          <div className="pixel-inset flex h-[154px] w-[122px] shrink-0 items-center justify-center bg-[#080d18]">
            <AvatarCanvas
              cor={clothing?.cor ?? player.cor}
              cabelo={player.cabelo}
              cabeloEstilo={player.cabeloEstilo}
              pele={player.pele}
              sexo={player.sexo}
              camisaModelo={clothing?.camisaModelo ?? player.camisaModelo}
              inferiorModelo={clothing?.inferiorModelo ?? player.inferiorModelo}
              calcaCor={clothing?.calcaCor ?? player.calcaCor}
              sapatoModelo={clothing?.sapatoModelo ?? player.sapatoModelo}
              sapatoCor={clothing?.sapatoCor ?? player.sapatoCor}
              camisaImagem={clothing?.image ?? player.camisaImagem ?? ""}
              camisaTransform={clothing?.imageTransform ?? player.camisaTransform}
              size={96}
              farda={!clothing ? getUniform(player.emprego, player.patente, orgConfigs) : null}
            />
          </div>
          <div className="min-w-[240px] flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="font-pixel text-[16px] leading-relaxed text-white">{player.nome}</h2>{player.isLeader && <span className="bg-[#d6a72e] px-2 py-1 font-pixel text-[6px] text-[#241803]">LÍDER</span>}</div>
            <div className="mt-3 inline-flex border border-[#43dcff]/40 bg-[#071522] px-3 py-2 font-pixel text-[12px] text-[#43dcff] shadow-[0_0_18px_rgba(67,220,255,0.18)]">{player.rg}</div>
            <div className="mt-4 grid gap-2 text-xs text-[#9fb0ce] sm:grid-cols-2">
              <span>{player.sexo === "feminino" ? "♀ Feminino" : "♂ Masculino"}</span><span>Nascimento: {player.dataNascimento || "Não informado"}</span>
              <span>{job?.icone ?? "👤"} {job?.nome ?? "Civil"}</span><span>Cargo: <b className="text-[#ffd65a]">{player.patente}</b></span>
              <span>Salário: {money(effectiveSalary(player.emprego, player.patente, orgConfigs))}</span><span>Horas fardado: {player.hoursWorked ?? 0}h</span>
            </div>
            <div className="mt-4 flex items-center gap-3"><span className="font-pixel text-[7px] text-[#43dcff]">NV {level.nivel}</span><Bar value={level.atual} max={level.necessario} color="#43dcff" className="h-3 flex-1" /><span className="text-[10px] text-[#7184a8]">{player.xp} XP</span></div>
          </div>
        </div>
        <div className="grid gap-px bg-[#263759] sm:grid-cols-3"><MoneyMetric label="Carteira" value={money(player.saldoCarteira)} color="#ffd65a" /><MoneyMetric label="Conta bancária" value={money(player.saldoBanco)} color="#55e294" /><MoneyMetric label="Patrimônio" value={money(patrimony)} color="#43dcff" /></div>
      </section>
      <section className="neon-panel p-5"><div className="font-pixel text-[8px] text-[#ffd65a]">STATUS DO CIDADÃO</div><div className="mt-5 space-y-4"><Need label="Saúde" icon="♥" value={player.saude} color="#ef5d65" /><Need label="Energia" icon="⚡" value={player.energia} color="#ffd65a" /><Need label="Fome" icon="●" value={player.fome ?? 100} color="#f19a4b" /><Need label="Sede" icon="◆" value={player.sede ?? 100} color="#43bfff" /><Need label="Reputação RP" icon="★" value={Math.min(100, player.reputacao ?? 0)} color="#a77cff" /></div></section>
    </div>

    {/* COMPOSIÇÃO DO PATRIMÔNIO & IMÓVEIS */}
    <div className="grid gap-5 md:grid-cols-2">
      {/* DETALHAMENTO DO PATRIMÔNIO */}
      <section className="neon-panel p-5 space-y-3">
        <div className="font-pixel text-[8px] text-[#43dcff]">💎 COMPOSIÇÃO DO PATRIMÔNIO</div>
        <div className="space-y-2 text-xs text-[#c9d6ee]">
          <div className="flex justify-between border-b border-[#1c2a45] pb-1.5">
            <span className="flex items-center gap-2">🏠 Casas / Imóveis</span>
            <b className="text-[#ffd65a]">{money(totalImoveisValor)}</b>
          </div>
          <div className="flex justify-between border-b border-[#1c2a45] pb-1.5">
            <span className="flex items-center gap-2">🏦 Saldo Bancário</span>
            <b className="text-[#55e294]">{money(player.saldoBanco)}</b>
          </div>
          <div className="flex justify-between border-b border-[#1c2a45] pb-1.5">
            <span className="flex items-center gap-2">💵 Carteira</span>
            <b className="text-[#ffd65a]">{money(player.saldoCarteira)}</b>
          </div>
          <div className="flex justify-between border-b border-[#1c2a45] pb-1.5">
            <span className="flex items-center gap-2">💳 Crédito (Limite Total)</span>
            <b className="text-[#7ee0ff]">{money(player.cartaoLimite ?? 0)}</b>
          </div>
          <div className="flex justify-between pt-1 font-bold text-sm">
            <span className="font-pixel text-[9px] text-white">= PATRIMÔNIO TOTAL</span>
            <span className="font-pixel text-[11px] text-[#43dcff]">{money(patrimony)}</span>
          </div>
        </div>
      </section>

      {/* IMÓVEIS POSSUÍDOS + BOTÃO DE VENDA E CONFIRMAÇÃO */}
      <section className="neon-panel p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-pixel text-[8px] text-[#ffd65a]">🏠 PROPRIEDADES POSSUÍDAS ({ownedProps.length})</div>
        </div>
        {ownedProps.length === 0 ? (
          <div className="text-xs text-[#52698e] italic py-2">Nenhum imóvel registrado em seu nome no momento.</div>
        ) : (
          <div className="space-y-3">
            {ownedProps.map((prop) => {
              const preco = prop.preco ?? 0;
              const taxa = Math.floor(preco * 0.20);
              const liquido = preco - taxa;
              const isConfirming = sellingPropId === prop.id;
              const propDef = PROPERTIES[prop.id] ?? Object.values(PROPERTIES).find((d) => d.id === prop.id);
              const propName = propDef?.nome ?? prop.id;

              return (
                <div key={prop.id} className="pixel-inset p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-pixel text-[9px] text-white">🏠 {propName}</div>
                      <div className="text-[10px] text-[#8fa3c8]">Lote: {prop.id} · Valor de mercado: {money(preco)}</div>
                    </div>
                    {!isConfirming && (
                      <Btn tone="red" size="sm" onClick={() => setSellingPropId(prop.id)}>
                        💸 Vender
                      </Btn>
                    )}
                  </div>

                  {/* CAIXA DE CONFIRMAÇÃO DE VENDA */}
                  {isConfirming && (
                    <div className="mt-2 border-t border-[#ef5d65]/40 pt-2 space-y-2 bg-[#2c110d]/50 p-2.5 rounded-sm">
                      <div className="font-pixel text-[8px] text-[#ff9a90]">⚠️ CONFIRMAR VENDA DO IMÓVEL</div>
                      <div className="space-y-1 text-[11px] text-[#c9d6ee]">
                        <div className="flex justify-between">
                          <span>Valor combinado:</span>
                          <b>{money(preco)}</b>
                        </div>
                        <div className="flex justify-between text-[#ff9a90]">
                          <span>Taxa do Governo (20% para o Cofre Nacional):</span>
                          <b>- {money(taxa)}</b>
                        </div>
                        <div className="flex justify-between text-[#55e294] font-bold border-t border-[#3b1a16] pt-1">
                          <span>Valor Líquido (Saldo do Banco):</span>
                          <b>+ {money(liquido)}</b>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Btn
                          tone="red"
                          size="sm"
                          full
                          onClick={async () => {
                            await sellProperty(prop.id, preco);
                            setSellingPropId(null);
                          }}
                        >
                          ✅ Confirmar Venda
                        </Btn>
                        <Btn tone="slate" size="sm" onClick={() => setSellingPropId(null)}>
                          Cancelar
                        </Btn>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>

    <div className="grid gap-5 md:grid-cols-2">
      <section className="neon-panel p-5"><div className="font-pixel text-[8px] text-[#43dcff]">EXTRATO DE SERVIÇO</div><div className="mt-4 grid grid-cols-3 gap-2"><MiniMetric label="Horas" value={String(player.hoursWorked ?? 0)} /><MiniMetric label="Patrulhas" value={String(player.patrulhas ?? 0)} /><MiniMetric label="Prisões" value={String(player.prisoes ?? 0)} /></div><div className="mt-4 text-xs text-[#7184a8]">{service.length ? `${service.length} pagamentos de serviço recentes.` : "Nenhum pagamento de serviço registrado ainda."}</div></section>
      <section className="neon-panel p-5"><div className="flex items-center justify-between"><div className="font-pixel text-[8px] text-[#43dcff]">CARTÃO DE CRÉDITO</div><span className={`text-[10px] ${player.cartaoCredito ? "text-[#55e294]" : "text-[#7184a8]"}`}>{player.cartaoCredito ? "ATIVO" : "NÃO SOLICITADO"}</span></div><div className="mt-4 rounded-sm border border-[#32476f] bg-gradient-to-br from-[#182d50] to-[#0b1426] p-4"><div className="font-pixel text-[9px] text-white">PIXEL BLACK</div><div className="mt-6 font-pixel text-[7px] text-[#9fb0ce]">LIMITE DISPONÍVEL</div><div className="mt-1 text-xl font-bold text-[#ffd65a]">{money(player.cartaoLimite ?? 0)}</div></div></section>
    </div>
  </div>;
}

function InventoryTab() {
  const { player, useItem, equipSlot } = useGame(); if (!player) return null;
  const equipped = player.equipped ?? [];
  return <PortalSection title="Inventário & Equipamento" subtitle="Gerencie a mochila, os seis atalhos e o armário de roupas.">
    <div className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => { const item = equipped[i] ? getItem(equipped[i]!) : null; return <button key={i} onClick={() => item && equipSlot(i, null)} className="neon-panel flex h-20 flex-col items-center justify-center gap-1 hover:border-[#43dcff]"><span className="font-pixel text-[6px] text-[#52698e]">SLOT {i + 1}</span><span className="text-2xl">{item?.icone ?? "+"}</span><span className="max-w-full truncate px-1 text-[9px] text-[#9fb0ce]">{item?.nome ?? "Vazio"}</span></button>; })}</div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(player.inventario ?? []).map((slot) => { if (slot.id.startsWith("clothes_")) return null; const item = getItem(slot.id); if (!item) return null; const inBar = equipped.includes(slot.id); return <Card key={slot.id} className="flex flex-col gap-3"><div className="flex items-center gap-3"><span className="text-3xl">{item.icone}</span><div><div className="font-pixel text-[8px] text-white">{item.nome}</div><div className="text-[10px] text-[#7184a8]">Quantidade: {slot.qtd}</div></div></div><p className="text-[11px] text-[#9fb0ce]">{item.desc}</p><div className="mt-auto flex gap-2">{(item.energia || item.saude) && <Btn tone="green" size="sm" full onClick={() => useItem(slot.id)}>Usar</Btn>}<Btn tone={inBar ? "slate" : "cyan"} size="sm" full disabled={inBar} onClick={() => equipSlot(equipped.findIndex((s) => !s) >= 0 ? equipped.findIndex((s) => !s) : 0, slot.id)}>{inBar ? "Equipado" : "Hotbar"}</Btn></div></Card>; })}</div>
    <div className="mt-6">
      <Wardrobe />
    </div>
  </PortalSection>;
}

function ShopTab() {
  const { player, buyItem, customObjects, buyCustomObject, priceOverrides } = useGame();
  const [useCredit, setUseCredit] = useState(false);
  if (!player) return null;
  const disp = Math.max(0, (player.cartaoLimite ?? 0) - (player.cartaoFatura ?? 0));
  return <PortalSection title="Loja & Objetos" subtitle="Catálogo de itens, serviços e decorações especiais.">
    <label className="mb-4 flex cursor-pointer items-center justify-between gap-2 border border-[#263b60] bg-[#0c1a2d] px-3 py-2 text-[11px] text-[#c9d6ee]">
      <span className="flex items-center gap-2">
        <input type="checkbox" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} className="h-4 w-4 accent-[#43dcff]" />
        💳 <b>Pagar com Cartão de Crédito</b> <span className="text-[9px] text-[#7184a8]">(+2% imposto)</span>
      </span>
      {player.cartaoCredito && <span className="font-pixel text-[7px] text-[#43dcff]">Disp.: {money(disp)}</span>}
    </label>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ITEMS.filter((i) => i.loja === "mercado").map((item) => {
        const price = effectivePrice(item.id, priceOverrides);
        return <Card key={item.id} className="flex items-center gap-3"><span className="text-3xl">{item.icone}</span><div className="min-w-0 flex-1"><div className="font-pixel text-[8px] text-white">{item.nome}</div><div className="text-[10px] text-[#7184a8]">{item.desc}</div><div className="mt-1 text-[#ffd65a]">{money(price)}</div></div><Btn tone={useCredit ? "purple" : "green"} size="sm" disabled={!useCredit && player.saldoCarteira + player.saldoBanco < price} onClick={() => buyItem(item.id, 1, useCredit)}>{useCredit ? "💳" : "Comprar"}</Btn></Card>;
      })}
      {customObjects.filter((o) => o.sellable).map((obj) => {
        const owned = (player.propriedadesCompradas ?? []).includes(`obj_${obj.objId}`);
        return <Card key={obj.id} className="flex items-center gap-3"><img src={obj.image} alt={obj.nome} className="h-14 w-14 object-contain" style={{ imageRendering: "pixelated" }} /><div className="min-w-0 flex-1"><div className="font-pixel text-[8px] text-white">{obj.nome}</div><div className="text-[10px] text-[#7184a8]">Objeto {obj.w}x{obj.h}</div><div className="mt-1 text-[#ffd65a]">{money(obj.preco)}</div></div><Btn tone={owned ? "slate" : useCredit ? "purple" : "green"} size="sm" disabled={owned || (!useCredit && player.saldoCarteira + player.saldoBanco < obj.preco)} onClick={() => buyCustomObject(obj.objId, obj.preco, useCredit)}>{owned ? "Comprado" : useCredit ? "💳" : "Comprar"}</Btn></Card>;
      })}
    </div>
  </PortalSection>;
}

function OrganizationsTab() {
  const { player, directory, applications, applyForJob, cancelApplication, reviewApplication, fireFromOrg, setPlayerJob, orgConfigs, adminSetUniform } = useGame();
  const [open, setOpen] = useState<string | null>(null); if (!player) return null;
  const safeApps = applications ?? [];
  return <PortalSection title="Organizações & Empregos" subtitle="Conheça as corporações, consulte vagas e envie seu currículo.">
    <div className="grid gap-4 lg:grid-cols-2">{JOBS.map((job) => {
      const members = directory.filter((p) => p.emprego === job.id);
      const leader = members.find((p) => p.isLeader) ?? directory.find((p) => p.uid === orgConfigs[job.id]?.directorId);
      const pendingApp = safeApps.find((a) => a.userId === player.uid && a.organizationId === job.id && a.status === "pending");
      const pending = Boolean(pendingApp);
      return <section key={job.id} className="neon-panel overflow-hidden">
        <div className="h-2" style={{ background: job.cor }} />
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center border border-white/10 text-2xl" style={{ background: `${job.cor}55` }}>{job.icone}</div>
            <div><h3 className="font-pixel text-[10px] text-white">{job.nome}</h3><p className="mt-1 text-[10px] text-[#7184a8]">{job.local}</p></div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[#9fb0ce]">{job.desc}</p>
          <div className="mt-3 border-l-2 border-[#ffd65a] pl-3 text-[11px] text-[#9fb0ce]">Líder: <b className="text-[#ffd65a]">{leader ? `${leader.nome} · ${leader.rg}` : "Cargo vago"}</b></div>
          <button onClick={() => setOpen(open === job.id ? null : job.id)} className="mt-3 text-[10px] text-[#43dcff]">{open === job.id ? "Ocultar quadro" : "Ver cargos, ocupantes e vagas"}</button>
          {open === job.id && <div className="mt-3 space-y-1 border-t border-[#263759] pt-3">{job.ranks.map((rank) => { const holders = members.filter((m) => m.patente === rank.nome); return <div key={rank.id} className="flex justify-between gap-3 text-[10px]"><span className="text-[#9fb0ce]">{rank.nome}</span><span className={holders.length ? "text-white" : "text-[#55e294]"}>{holders.length ? holders.map((h) => h.nome).join(", ") : "Vaga disponível"}</span></div>; })}</div>}
          <div className="mt-4">
            {pending ? (
              <div className="flex gap-2">
                <Btn tone="gold" full disabled>📋 Currículo em análise</Btn>
                <Btn tone="red" size="sm" onClick={() => pendingApp && cancelApplication(pendingApp.id)}>✕ Cancelar</Btn>
              </div>
            ) : (
              <Btn tone="green" full disabled={player.emprego !== "desempregado"} onClick={() => applyForJob(job.id)}>
                {player.emprego !== "desempregado" ? "Você já está empregado" : "📋 Enviar currículo"}
              </Btn>
            )}
          </div>
        </div>
      </section>;
    })}</div>
    {player.isLeader && player.emprego !== "desempregado" && <CorporationPanel jobId={player.emprego} members={directory.filter((p) => p.emprego === player.emprego)} applications={safeApps.filter((a) => a.organizationId === player.emprego && a.status === "pending")} onReview={reviewApplication} onSetJob={setPlayerJob} onSetUniform={adminSetUniform} onFire={fireFromOrg} />}
  </PortalSection>;
}

function CorporationPanel({ jobId, members, applications, onReview, onSetJob, onSetUniform, onFire }: { jobId: string; members: NonNullable<ReturnType<typeof useGame>["player"]>[]; applications: ReturnType<typeof useGame>["applications"]; onReview: (id: string, approved: boolean) => Promise<void>; onSetJob: (uid: string, job: string, patente: string) => Promise<void>; onSetUniform: ReturnType<typeof useGame>["adminSetUniform"]; onFire: (uid: string) => Promise<void> }) {
  const { player } = useGame();
  const job = getJob(jobId); if (!job || !player) return null;
  return <section className="neon-panel mt-6 p-5"><div className="font-pixel text-[9px] text-[#ffd65a]">PAINEL DA CORPORAÇÃO · {job.nome}</div><div className="mt-4 grid gap-5 lg:grid-cols-2"><div><Label>Membros ativos</Label><div className="space-y-2">{members.map((member) => { const up = nextRank(jobId, member.patente); const down = prevRank(jobId, member.patente); const isSelf = member.uid === player.uid; return <div key={member.uid} className="pixel-inset flex flex-wrap items-center gap-2 p-2"><div className="min-w-0 flex-1"><div className="text-xs text-white">{member.nome}</div><div className="text-[10px] text-[#7184a8]">{member.rg} · {member.patente} · {money(effectiveSalary(jobId, member.patente))}</div></div><Btn tone="green" size="sm" disabled={!up} onClick={() => up && onSetJob(member.uid, jobId, up.nome)}>Promover</Btn><Btn tone="red" size="sm" disabled={!down} onClick={() => down && onSetJob(member.uid, jobId, down.nome)}>Rebaixar</Btn>{!isSelf && <Btn tone="slate" size="sm" onClick={() => onFire(member.uid)}>🚪 Demitir</Btn>}</div>; })}</div></div><div><Label>Candidaturas pendentes</Label><div className="space-y-2">{applications.length === 0 && <div className="pixel-inset p-3 text-xs text-[#7184a8]">Nenhum currículo aguardando análise.</div>}{applications.map((app) => <div key={app.id} className="pixel-inset flex items-center gap-2 p-2"><div className="flex-1"><div className="text-xs text-white">{app.userNome}</div><div className="text-[10px] text-[#7184a8]">Currículo enviado</div></div><Btn tone="green" size="sm" onClick={() => onReview(app.id, true)}>Aprovar</Btn><Btn tone="red" size="sm" onClick={() => onReview(app.id, false)}>Recusar</Btn></div>)}</div></div></div><div className="mt-5"><Label>Fardamento por patente</Label><div className="flex flex-wrap gap-2">{job.ranks.map((rank) => <label key={rank.id} className="pixel-inset flex items-center gap-2 p-2 text-[10px] text-[#9fb0ce]">{rank.nome}<input type="color" defaultValue={job.uniforme?.cor ?? job.cor} onChange={(e) => onSetUniform(jobId, rank.nome, { ...(job.uniforme ?? { cor: job.cor }), cor: e.target.value })} /></label>)}</div></div></section>;
}

function BankTab() {
  const { player, deposit, withdraw, transferByRG, requestCreditCard, payCardBill, transactions } = useGame();
  const [amount, setAmount] = useState(500); const [rg, setRg] = useState(""); if (!player) return null;
  const fatura = player.cartaoFatura ?? 0;
  const juros = Math.ceil(fatura * 0.1);
  const totalFatura = fatura + juros;
  const disp = Math.max(0, (player.cartaoLimite ?? 0) - fatura);
  const negativo = player.saldoCarteira < 0 || player.saldoBanco < 0;
  const history = transactions.filter((t) => t.from === player.uid || t.to === player.uid).slice(0, 12); const chart = history.slice(0, 8).reverse(); const max = Math.max(1, ...chart.map((t) => t.valor));
  return <PortalSection title="Banco Digital" subtitle="PIX por RG, movimentações, contas e cartão de crédito."><div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]"><div className="space-y-4"><section className="neon-panel p-5"><div className="text-[10px] text-[#7184a8]">SALDO EM CONTA</div><div className="mt-2 text-3xl font-bold text-[#55e294]">{money(player.saldoBanco)}</div><div className="mt-1 text-xs text-[#7184a8]">Carteira: {money(player.saldoCarteira)}</div><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-4" /><div className="mt-2 grid grid-cols-2 gap-2"><Btn tone="green" onClick={() => deposit(amount)}>Depositar</Btn><Btn tone="gold" onClick={() => withdraw(amount)}>Sacar</Btn></div></section><section className="neon-panel p-5"><Label>PIX por RG</Label><Input value={rg} onChange={(e) => setRg(e.target.value.toUpperCase())} placeholder="RG-12345" /><Btn tone="cyan" full className="mt-2" onClick={() => transferByRG(rg, amount)}>Transferir {money(amount)}</Btn></section><AuxilioGovSection /><ServiceBillCard /></div><div className="space-y-4"><section className="neon-panel p-5"><div className="flex items-center justify-between"><Label>Movimentação recente</Label><span className="text-[10px] text-[#7184a8]">ENTRADAS / SAÍDAS</span></div><div className="mt-4 flex h-32 items-end gap-2 border-b border-[#263759]">{chart.length === 0 && <div className="m-auto text-xs text-[#52698e]">Sem movimentações ainda</div>}{chart.map((t) => { const incoming = t.to === player.uid || t.tipo === "deposito"; return <div key={t.id} title={`${t.desc ?? t.tipo}: ${money(t.valor)}`} className={`min-w-3 flex-1 ${incoming ? "bg-[#55e294]" : "bg-[#ef5d65]"}`} style={{ height: `${Math.max(8, (t.valor / max) * 100)}%`, opacity: 0.82 }} />; })}</div></section><section className="neon-panel overflow-hidden"><div className="bg-gradient-to-br from-[#17365f] to-[#0c1428] p-5"><div className="flex items-center justify-between"><div className="font-pixel text-[9px] text-white">PIXEL BLACK · {player.rg}</div><span className={`font-pixel text-[7px] ${player.cartaoCredito ? (negativo ? "text-[#ef5d65]" : "text-[#55e294]") : "text-[#7184a8]"}`}>{player.cartaoCredito ? (negativo ? "BLOQUEADO" : "ATIVO") : "SEM CARTÃO"}</span></div><div className="mt-5 grid grid-cols-2 gap-2 text-[10px]"><div><span className="text-[#7184a8]">Limite:</span> <b className="text-[#c9d6ee]">{money(player.cartaoLimite ?? 0)}</b></div><div><span className="text-[#7184a8]">Disponível:</span> <b className="text-[#55e294]">{money(disp)}</b></div><div><span className="text-[#7184a8]">Fatura:</span> <b className="text-[#ffd65a]">{money(fatura)}</b></div><div><span className="text-[#7184a8]">+ juros 10%:</span> <b className="text-[#ff9a90]">{money(juros)}</b></div></div></div>{!player.cartaoCredito && <div className="p-3"><Btn tone="gold" full onClick={requestCreditCard}>Solicitar cartão</Btn></div>}{player.cartaoCredito && <div className="p-3"><Btn tone="gold" full disabled={fatura <= 0 || player.saldoBanco < totalFatura} onClick={() => payCardBill(true)}>💳 Quitar fatura · {money(totalFatura)}</Btn>{negativo && <div className="mt-2 border-l-2 border-[#ef5d65] pl-2 text-[9px] text-[#ff9a90]">Regularize seu saldo para reativar o cartão.</div>}</div>}</section><section className="neon-panel p-5"><Label>Extrato</Label><div className="mt-2 divide-y divide-[#263759]">{history.map((t) => { const incoming = t.to === player.uid || t.tipo === "deposito"; return <div key={t.id} className="flex items-center justify-between py-2 text-[11px]"><div><div className="text-white">{t.desc ?? t.tipo}</div><div className="text-[#52698e]">{new Date(t.ts).toLocaleString("pt-BR")}</div></div><span className={incoming ? "text-[#55e294]" : "text-[#ef5d65]"}>{incoming ? "+" : "-"}{money(t.valor)}</span></div>; })}</div></section></div></div></PortalSection>;
}

function StaffTab() {
  const { player, directory } = useGame(); if (!player) return null; const team = directory.filter((p) => p.isAdmin || p.isLeader);
  return <PortalSection title="Equipe & Lideranças" subtitle="Cidadãos responsáveis pelo suporte e pelas corporações."><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{team.length === 0 && <Card className="text-sm text-[#7184a8]">Nenhum membro da equipe visível agora.</Card>}{team.map((member) => <Card key={member.uid} className="flex items-center gap-3"><Avatar cor={member.cor} cabelo={member.cabelo} pele={member.pele} sexo={member.sexo} size={42} farda={getJob(member.emprego)?.uniforme} /><div><div className="font-pixel text-[8px] text-white">{member.nome}</div><div className="mt-1 text-[10px] text-[#ffd65a]">{member.isAdmin ? "Equipe de Controle" : `${getJob(member.emprego)?.nome} · ${member.patente}`}</div><div className="text-[9px] text-[#7184a8]">{member.rg}</div></div></Card>)}</div></PortalSection>;
}

function SettingsTab({ onOpenControl }: { onOpenControl: () => void }) {
  const { player, patch, grantAdmin, adminLogout } = useGame();
  const [code, setCode] = useState("");
  if (!player) return null;
  const genderOptions = <T extends { genero: string }>(items: T[]) => items.filter((item) => item.genero === "unissex" || item.genero === player.sexo);
  return (
    <PortalSection title="Configurações" subtitle="Personalize cabelo, rosto e roupas em camadas independentes.">
      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="neon-panel p-5">
          <div className="grid gap-6 md:grid-cols-[180px_1fr]">
            <div className="pixel-inset flex min-h-72 items-center justify-center bg-[#07101d]">
              <AvatarCanvas cor={player.cor} cabelo={player.cabelo} cabeloEstilo={player.cabeloEstilo} pele={player.pele} sexo={player.sexo} camisaModelo={player.camisaModelo} inferiorModelo={player.inferiorModelo} calcaCor={player.calcaCor} sapatoModelo={player.sapatoModelo} sapatoCor={player.sapatoCor} camisaImagem={player.camisaImagem ?? ""} camisaTransform={player.camisaTransform} size={120} />
            </div>
            <div className="space-y-4">
              <div><Label>Corpo / gênero</Label><div className="grid grid-cols-2 gap-1.5">{(["masculino", "feminino"] as const).map((sexo) => <button key={sexo} onClick={() => patch(sexo === "feminino" ? { sexo, cabeloEstilo: "longo", camisaModelo: "blusa", inferiorModelo: "saia" } : { sexo, cabeloEstilo: "curto", camisaModelo: "camiseta", inferiorModelo: "calca" })} className={`pixel-btn px-2 py-2 text-[10px] ${player.sexo === sexo ? "bg-[#3f7ad6] text-white ring-1 ring-[#7ee0ff]" : "bg-[#1c2a4a] text-[#9fb0ce]"}`}>{sexo === "feminino" ? "♀ Feminino" : "♂ Masculino"}</button>)}</div></div>
              <div><Label>Tipo de cabelo</Label><div className="grid grid-cols-2 gap-1.5">{genderOptions(HAIR_STYLES).map((style) => <button key={style.id} onClick={() => patch({ cabeloEstilo: style.id })} className={`pixel-btn px-2 py-2 text-[10px] ${player.cabeloEstilo === style.id ? "bg-[#3f7ad6] text-white ring-1 ring-[#7ee0ff]" : "bg-[#1c2a4a] text-[#9fb0ce]"}`}>{style.nome}</button>)}</div></div>
              <ColorPicker label="Cor do cabelo" values={CABELOS} current={player.cabelo} onPick={(cabelo) => patch({ cabelo })} />
              <ColorPicker label="Tom de pele" values={PELES} current={player.pele} onPick={(pele) => patch({ pele })} />
              <div><Label>Camisa / parte superior</Label><div className="flex flex-wrap gap-1.5">{genderOptions(SHIRT_STYLES).map((style) => <Btn key={style.id} tone={player.camisaModelo === style.id ? "cyan" : "slate"} size="sm" onClick={() => patch({ camisaModelo: style.id })}>{style.nome}</Btn>)}</div></div>
              <ColorPicker label="Cor da camisa" values={CORES} current={player.cor} onPick={(cor) => patch({ cor })} />
              <div><Label>Calça / saia / shorts</Label><div className="flex flex-wrap gap-1.5">{genderOptions(BOTTOM_STYLES).map((style) => <Btn key={style.id} tone={player.inferiorModelo === style.id ? "purple" : "slate"} size="sm" onClick={() => patch({ inferiorModelo: style.id })}>{style.nome}</Btn>)}</div></div>
              <ColorPicker label="Cor da parte inferior" values={CORES} current={player.calcaCor} onPick={(calcaCor) => patch({ calcaCor })} />
              <div><Label>Sapatos</Label><div className="flex gap-1.5">{SHOE_STYLES.map((style) => <Btn key={style.id} tone={player.sapatoModelo === style.id ? "gold" : "slate"} size="sm" onClick={() => patch({ sapatoModelo: style.id })}>{style.nome}</Btn>)}</div></div>
              <ColorPicker label="Cor dos sapatos" values={["#11151f", "#4a2d1f", "#e7e7e7", "#7a2430", "#253d68"]} current={player.sapatoCor} onPick={(sapatoCor) => patch({ sapatoCor })} />
            </div>
          </div>
        </section>
        <section className="neon-panel p-5">
          <Label>Acesso restrito</Label>
          {player.isAdmin ? <div className="space-y-3"><div className="border-l-2 border-[#55e294] pl-3 text-sm text-[#55e294]">Modo de controle ativo.</div><Btn tone="purple" full onClick={onOpenControl}>Abrir Painel de Controle</Btn><Btn tone="red" full onClick={adminLogout}>Desativar modo de controle</Btn></div> : <div className="space-y-2"><Input type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código de acesso" /><Btn tone="slate" full onClick={() => grantAdmin(code) && setCode("")}>Ativar acesso</Btn></div>}
        </section>
      </div>
    </PortalSection>
  );
}

/* ═══ AUXÍLIO DO GOVERNO ═══ */
function AuxilioGovSection() {
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
    <section className="neon-panel p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-pixel text-[8px] text-[#43dcff]">🏛 AUXÍLIO DO GOVERNO</div>
        <span className={`font-pixel text-[7px] ${!ativo ? "text-[#8fa3c8]" : isDesempregado && !emCooldown && !cofreSemVerba ? "text-[#55e294]" : "text-[#ffd65a]"}`}>
          {!ativo ? "DESATIVADO" : isDesempregado ? (emCooldown ? `DISPONÍVEL EM ${faltamMin}m` : "ELEGÍVEL") : "EXCLUSIVO DESEMPREGADOS"}
        </span>
      </div>

      <p className="text-xs text-[#c9d6ee]">
        Benefício financeiro pago diretamente pelo <b className="text-[#43dcff]">Cofre Nacional</b> para cidadãos desempregados.
      </p>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-[#7184a8]">Valor do benefício:</span> <b className="text-[#ffd65a]">{money(valor)}</b></div>
        <div><span className="text-[#7184a8]">Intervalo:</span> <b className="text-[#7ee0ff]">{intervaloMin} minuto(s)</b></div>
      </div>

      {!isDesempregado ? (
        <div className="text-[11px] text-[#7184a8]">
          Cidadãos empregados não têm direito a este benefício.
        </div>
      ) : !ativo ? (
        <div className="text-[11px] text-[#ffcf6b]">
          O benefício está temporariamente desativado no momento.
        </div>
      ) : cofreSemVerba ? (
        <div className="text-[11px] text-[#ff9a90]">
          O Cofre Nacional não possui verba suficiente para pagar o auxílio.
        </div>
      ) : emCooldown ? (
        <div className="text-[11px] text-[#ffd65a]">
          Próxima solicitação disponível em {faltamMin} minuto(s).
        </div>
      ) : (
        <div className="text-[11px] text-[#55e294]">
          Você cumpre os requisitos! O valor será depositado na sua conta bancária.
        </div>
      )}

      <Btn
        tone="cyan"
        full
        disabled={!isDesempregado || !ativo || emCooldown || cofreSemVerba}
        onClick={claimAuxilioGov}
      >
        🏛 Solicitar Auxílio do Governo · {money(valor)}
      </Btn>
    </section>
  );
}

/* ═══ CONTA DE SERVIÇOS · COFRE NACIONAL ═══ */
function ServiceBillCard() {
  const { player, treasury, payServiceBill, properties } = useGame();
  const [showInfo, setShowInfo] = useState(false);
  if (!player) return null;

  const devendo = player.contaServicoAcumulada ?? 0;
  const ciclos = player.contaServicoCiclos ?? 0;
  const maxCiclos = treasury.maxCiclos || 6;
  const taxa = treasury.taxaServico || 1;
  const patrimonio = Math.max(0, calculatePatrimony(player, properties));
  const proximaCobranca = Math.ceil(patrimonio * (taxa / 100));
  const emDia = devendo <= 0;
  const noLimite = ciclos >= maxCiclos;

  return (
    <section className={`neon-panel overflow-hidden ${!emDia ? "border-[#8a6810]" : ""}`}>
      <div className={`px-5 py-3 ${emDia ? "bg-gradient-to-r from-[#0f2b1c] to-[#0b1426]" : noLimite ? "bg-gradient-to-r from-[#3a1410] to-[#0b1426]" : "bg-gradient-to-r from-[#332405] to-[#0b1426]"}`}>
        <div className="flex items-center justify-between">
          <div className="font-pixel text-[8px] text-[#ffd65a]">🏛 CONTA DE SERVIÇOS</div>
          <span className={`font-pixel text-[7px] ${emDia ? "text-[#55e294]" : noLimite ? "text-[#ef5d65]" : "text-[#ffd65a]"}`}>
            {emDia ? "✓ EM DIA" : noLimite ? "LIMITE ATINGIDO" : "PENDENTE"}
          </span>
        </div>
        {emDia ? (
          <div className="mt-2 text-[11px] text-[#55e294]">Você está em dia com o Governo. Obrigado por contribuir!</div>
        ) : (
          <div className="mt-2 text-2xl font-bold text-[#ffd65a]">{money(devendo)}</div>
        )}
      </div>

      {/* saldo do cofre — visível para todos */}
      <div className="border-t border-[#1c2a45] px-5 py-2 flex items-center justify-between bg-[#06101c]">
        <span className="font-pixel text-[7px] text-[#52698e]">🏛 VALOR DO COFRE NACIONAL</span>
        <span className="font-pixel text-[10px] text-[#55e294]">{money(treasury.saldo)}</span>
      </div>

      <div className="space-y-2 p-4">
        {/* medidor de ciclos acumulados */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: maxCiclos }).map((_, i) => (
            <div key={i} className="h-1.5 flex-1" style={{ background: i < ciclos ? (noLimite ? "#ef5d65" : "#ffd65a") : "#263759" }} />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-[#7184a8]">
          <span>{ciclos}/{maxCiclos} horas acumuladas</span>
          <span>Próxima: {money(proximaCobranca)}/h</span>
        </div>

        <Btn tone={emDia ? "slate" : "purple"} full disabled={emDia || player.saldoBanco < devendo} onClick={payServiceBill}>
          {emDia ? "✓ Em dia com o Governo" : `🏛 Pagar ao Cofre · ${money(devendo)}`}
        </Btn>
        {!emDia && player.saldoBanco < devendo && (
          <div className="border-l-2 border-[#ef5d65] pl-2 text-[9px] text-[#ff9a90]">Saldo bancário insuficiente.</div>
        )}

        <button onClick={() => setShowInfo((v) => !v)} className="w-full text-left text-[10px] text-[#43dcff] hover:text-white">
          {showInfo ? "▾ Ocultar" : "▸ Como funciona o sistema?"}
        </button>
        {showInfo && (
          <div className="space-y-1.5 border-t border-[#263759] pt-2 text-[10px] leading-relaxed text-[#8fa3c8]">
            <div>• A cada <b className="text-[#c9d6ee]">1 hora</b>, o Governo cobra <b className="text-[#ffd65a]">{taxa}%</b> do seu patrimônio (carteira + banco + crédito + imóveis).</div>
            <div>• Exemplo: com R$ 10.000 você paga <b className="text-[#ffd65a]">R$ {Math.ceil(10000 * (taxa / 100))}</b> por hora.</div>
            <div>• A dívida acumula por até <b className="text-[#c9d6ee]">{maxCiclos} horas</b>. Após isso, para de crescer.</div>
            <div>• O valor pago vai direto para o <b className="text-[#43dcff]">Cofre Nacional</b>, que financia os salários públicos.</div>
            <div>• Quitando, você fica <b className="text-[#55e294]">Em dia com o Governo</b>.</div>
          </div>
        )}
      </div>
    </section>
  );
}

function PortalSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <div><Heading eyebrow="PIXELCITY · PAINEL DO CIDADÃO" title={title} subtitle={subtitle} />{children}</div>; }
function Heading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) { return <div className="mb-6"><div className="font-pixel text-[8px] text-[#43dcff]">{eyebrow}</div><h1 className="mt-2 text-3xl font-extrabold text-white">{title}</h1><p className="mt-1 text-sm text-[#7184a8]">{subtitle}</p></div>; }
function Need({ label, icon, value, color }: { label: string; icon: string; value: number; color: string }) { return <div><div className="mb-1.5 flex justify-between text-xs"><span className="text-[#9fb0ce]">{icon} {label}</span><span style={{ color }}>{Math.round(value)}%</span></div><Bar value={value} color={color} className="h-2.5" /></div>; }
function MoneyMetric({ label, value, color }: { label: string; value: string; color: string }) { return <div className="bg-[#0b1426] p-4"><div className="font-pixel text-[6px] text-[#52698e]">{label}</div><div className="mt-2 font-pixel text-[10px]" style={{ color }}>{value}</div></div>; }
function MiniMetric({ label, value }: { label: string; value: string }) { return <div className="pixel-inset p-3 text-center"><div className="font-pixel text-[13px] text-white">{value}</div><div className="mt-1 text-[9px] text-[#7184a8]">{label}</div></div>; }
function ColorPicker({ label, values, current, onPick }: { label: string; values: string[]; current: string; onPick: (v: string) => void }) { return <div><div className="mb-1 text-[10px] text-[#7184a8]">{label}</div><div className="flex flex-wrap gap-1">{values.map((v) => <button key={v} onClick={() => onPick(v)} className={`h-5 w-5 border ${current === v ? "border-[#43dcff] shadow-[0_0_8px_#43dcff]" : "border-[#263759]"}`} style={{ background: v }} />)}</div></div>; }