import { useMemo, useState } from "react";
import { useGame } from "../../state/GameContext";
import { JOBS, getJob, getRank, nextRank, prevRank, canRecruit, effectiveSalary } from "../../game/jobs";
import { Bar, Btn, Card, Label, Modal, money } from "../ui";
import type { PlayerData } from "../../game/types";

export default function JobsModal({ onClose, startTab = "meu" }: { onClose: () => void; startTab?: "meu" | "vagas" | "comando" }) {
  const { player, others, applications, orgConfigs, applyForJob, reviewApplication, quitJob, collectSalary, patch, setPlayerJob, notify } = useGame();
  const [tab, setTab] = useState(startTab);
  const [filtro, setFiltro] = useState("");
  if (!player) return null;

  const job = getJob(player.emprego);
  const rank = job ? getRank(job.id, player.patente) : null;
  const prox = job ? nextRank(job.id, player.patente) : null;
  const isCmd = player.isAdmin || canRecruit(player.emprego, player.patente, orgConfigs);
  const podePromover = Boolean(prox && player.xp >= prox.xpReq);

  const promoverSe = () => {
    if (!job || !prox) return;
    patch({ patente: prox.nome, isLeader: Boolean(prox.leader) });
    notify(`Promovido a ${prox.nome}!`, "ok");
  };

  const lista = useMemo(() => {
    const base = (others ?? []).filter((o) => (o.nome ?? "").toLowerCase().includes(filtro.toLowerCase()));
    // Líder não-admin só vê membros da própria corporação
    if (!player.isAdmin && player.isLeader && player.emprego !== "desempregado") {
      return base.filter((o) => o.emprego === player.emprego || o.emprego === "desempregado");
    }
    return base;
  }, [others, filtro, player.isAdmin, player.isLeader, player.emprego]);

  const pendingApps = (applications ?? []).filter((a) => a && a.status === "pending");
  const myPending = pendingApps.filter((a) => a.userId === player.uid);
  const leaderApps = isCmd ? pendingApps.filter((a) => a.organizationId === player.emprego) : [];

  const TABS: [typeof tab, string][] = [
    ["meu", "Minha carreira"],
    ["vagas", "Organizações"],
    ...(isCmd ? ([["comando", `🎖 Comando (${leaderApps.length})`]] as [typeof tab, string][]) : []),
  ];

  return (
    <Modal title="Central de Empregos" icon="💼" onClose={onClose} accent={job?.cor ?? "#3f7ad6"} width="max-w-4xl">
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(([id, nome]) => (<Btn key={id} tone={tab === id ? "blue" : "slate"} size="sm" onClick={() => setTab(id)}>{nome}</Btn>))}
      </div>

      {tab === "meu" && (
        <div className="space-y-4">
          <Card className="flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center border-2 border-[#0a1024] text-3xl" style={{ background: job?.cor ?? "#5b6478" }}>
              {job?.icone ?? "🧍"}
            </div>
            <div className="min-w-[200px] flex-1">
              <div className="font-pixel text-[11px] text-white">{job?.nome ?? "Desempregado"}</div>
              <div className="mt-1 text-sm text-[#9fb2d4]">
                Patente: <b className="text-[#ffd980]">{player.patente}</b>
                {rank && <> · {money(effectiveSalary(player.emprego, player.patente, orgConfigs))}/turno</>}
              </div>
              <div className="mt-2"><Label>XP {player.xp.toLocaleString("pt-BR")} {prox ? `/ ${prox.xpReq.toLocaleString("pt-BR")} → ${prox.nome}` : "· MAX"}</Label>
                <Bar value={prox ? Math.min(100, (player.xp / prox.xpReq) * 100) : 100} color="#7ee0ff" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Btn tone="green" onClick={collectSalary} disabled={!job}>💰 Bater ponto</Btn>
              {prox && <Btn tone="gold" onClick={promoverSe} disabled={!podePromover}>⬆ Promoção</Btn>}
              {job && <Btn tone="red" size="sm" onClick={quitJob}>Demitir-se</Btn>}
            </div>
          </Card>

          {myPending.length > 0 && (
            <Card className="border-l-4 border-[#ffd980]">
              <Label>Suas candidaturas pendentes</Label>
              {myPending.map((a) => {
                const j = getJob(a.organizationId);
                return (
                  <div key={a.id} className="flex items-center gap-2 py-1 text-sm text-[#c9d6ee]">
                    <span className="text-lg">{j?.icone ?? "📋"}</span>
                    <span>{j?.nome ?? a.organizationId}</span>
                    <span className="ml-auto font-pixel text-[8px] text-[#ffd980]">⏳ AGUARDANDO</span>
                  </div>
                );
              })}
            </Card>
          )}

          {job && (
            <div>
              <Label>Hierarquia — {job.nome}</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {job.ranks.map((r, i) => {
                  const atual = r.nome === player.patente;
                  const alcancado = player.xp >= r.xpReq;
                  return (
                    <div key={r.id} className={`pixel-inset flex items-center gap-3 p-2.5 ${atual ? "ring-2 ring-[#ffd980]" : ""}`} style={atual ? { background: "#1b2545" } : undefined}>
                      <div className="flex h-9 w-9 items-center justify-center border-2 border-[#0a1024] font-pixel text-[9px]" style={{ background: alcancado ? job.cor : "#2a3550", color: "#fff" }}>{i + 1}</div>
                      <div className="flex-1">
                        <div className="font-pixel text-[9px] text-white">{r.nome} {r.leader && "👑"} {r.insignia}</div>
                        <div className="text-[11px] text-[#8fa3c8]">{money(effectiveSalary(job.id, r.nome, orgConfigs))} · {r.xpReq.toLocaleString("pt-BR")} XP</div>
                      </div>
                      {atual && <span className="font-pixel text-[7px] text-[#ffd980]">ATUAL</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "vagas" && (
        <div className="space-y-4">
          <Card className="border-l-4 border-[#7ee0ff]">
            <p className="text-xs text-[#c9d6ee]">
              📋 Para entrar em uma organização, envie sua <b>candidatura</b>. O líder máximo (Coronel, Delegado, Diretor, Gerente) irá <b>aprovar ou recusar</b> sua entrada.
            </p>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2">
            {JOBS.map((j) => {
              const mine = player.emprego === j.id;
              const pending = myPending.some((a) => a.organizationId === j.id);
              return (
                <Card key={j.id} className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center border-2 border-[#0a1024] text-2xl" style={{ background: j.cor }}>{j.icone}</div>
                    <div>
                      <div className="font-pixel text-[10px] text-white">{j.nome}</div>
                      <div className="text-[11px] text-[#8fa3c8]">📍 {j.local} · Líder: {j.ranks[j.ranks.length - 1].nome}</div>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-[#9fb2d4]">{j.desc}</p>
                  <div className="text-[11px] text-[#7ee0ff]">
                    Entrada: {j.ranks[0].nome} ({money(j.ranks[0].salario)}) → Topo: {j.ranks[j.ranks.length - 1].nome} ({money(j.ranks[j.ranks.length - 1].salario)})
                  </div>
                  {mine ? (
                    <Btn tone="slate" disabled>✅ Você trabalha aqui</Btn>
                  ) : pending ? (
                    <Btn tone="gold" disabled>⏳ Candidatura enviada</Btn>
                  ) : (
                    <Btn tone="green" onClick={() => applyForJob(j.id)} disabled={player.emprego !== "desempregado"}>
                      {player.emprego !== "desempregado" ? "Peça demissão primeiro" : "📋 Candidatar-se"}
                    </Btn>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {tab === "comando" && isCmd && (
        <div className="space-y-4">
          <Card className="border-l-4 border-[#ffd980]">
            <div className="font-pixel text-[9px] text-[#ffd980]">👑 PAINEL DE COMANDO — {player.patente}</div>
            <p className="mt-1 text-xs text-[#9fb2d4]">Gerencie candidaturas, promova, rebaixe e transfira membros em tempo real.</p>
          </Card>

          {/* Candidaturas */}
          {leaderApps.length > 0 && (
            <div>
              <Label>📋 Candidaturas pendentes ({leaderApps.length})</Label>
              <div className="space-y-2">
                {leaderApps.map((a) => (
                  <Card key={a.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-pixel text-[9px] text-white">{a.userNome}</div>
                      <div className="text-[10px] text-[#8fa3c8]">Quer entrar em {getJob(a.organizationId)?.nome ?? a.organizationId}</div>
                    </div>
                    <Btn tone="green" size="sm" onClick={() => reviewApplication(a.id, true)}>✅ Aceitar</Btn>
                    <Btn tone="red" size="sm" onClick={() => reviewApplication(a.id, false)}>❌ Recusar</Btn>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Membros */}
          <div>
            <Label>Gerenciar membros online</Label>
            <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar jogador..." className="pixel-inset mb-2 w-full px-3 py-2 text-sm text-[#e8eefb] outline-none placeholder:text-[#5c6b8a]" />
            {lista.length === 0 && <Card className="text-center text-sm text-[#8fa3c8]">Nenhum jogador online.</Card>}
            <div className="space-y-2">
              {lista.map((p) => <MemberRow key={p.uid} p={p} me={player} onSet={setPlayerJob} />)}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function MemberRow({ p, me, onSet }: { p: PlayerData; me: PlayerData; onSet: (uid: string, job: string, patente: string) => Promise<void> }) {
  const pj = getJob(p.emprego);
  const up = nextRank(p.emprego, p.patente);
  const down = prevRank(p.emprego, p.patente);
  const myJob = getJob(me.emprego);
  const isAdmin = me.isAdmin;
  // líder não-admin: só promove/rebaixa dentro da própria corporação
  const membroDaMinha = p.emprego === me.emprego;
  const podePromover = isAdmin || membroDaMinha;

  return (
    <Card className="flex flex-wrap items-center gap-3">
      <div className="h-9 w-9 border-2 border-[#0a1024]" style={{ background: p.cor }} />
      <div className="min-w-[120px] flex-1">
        <div className="font-pixel text-[9px] text-white">{p.nome}</div>
        <div className="text-[11px] text-[#8fa3c8]">
          {pj ? `${pj.icone} ${pj.nome}` : "🧍 Civil"} · <b className="text-[#ffd980]">{p.patente}</b> · Nv {p.nivel}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Recrutar: líder recruta só para SUA corporação */}
        {myJob && p.emprego !== myJob.id && p.emprego === "desempregado" && (
          <Btn tone="army" size="sm" onClick={() => onSet(p.uid, myJob.id, myJob.ranks[0].nome)}>➕ Recrutar</Btn>
        )}
        {podePromover && <Btn tone="green" size="sm" disabled={!up} onClick={() => up && onSet(p.uid, p.emprego, up.nome)}>⬆</Btn>}
        {podePromover && <Btn tone="red" size="sm" disabled={!down} onClick={() => down && onSet(p.uid, p.emprego, down.nome)}>⬇</Btn>}
        {/* Demitir: líder só demite da própria corporação */}
        {podePromover && membroDaMinha && (
          <Btn tone="slate" size="sm" onClick={() => onSet(p.uid, "desempregado", "Civil")}>Demitir</Btn>
        )}
        {/* Select de todas orgs: só para Admin */}
        {isAdmin && (
          <select value={p.emprego} onChange={(e) => { const j = getJob(e.target.value); onSet(p.uid, e.target.value, j ? j.ranks[0].nome : "Civil"); }} className="pixel-inset px-2 py-2 text-[11px] text-[#e8eefb] outline-none">
            <option value="desempregado">Demitir</option>
            {JOBS.map((j) => (<option key={j.id} value={j.id}>{j.nome}</option>))}
          </select>
        )}
        {pj && podePromover && (
          <select value={p.patente} onChange={(e) => onSet(p.uid, p.emprego, e.target.value)} className="pixel-inset px-2 py-2 text-[11px] text-[#e8eefb] outline-none">
            {pj.ranks.map((r) => (<option key={r.id} value={r.nome}>{r.nome}</option>))}
          </select>
        )}
      </div>
    </Card>
  );
}
