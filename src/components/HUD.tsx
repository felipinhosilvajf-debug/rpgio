import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "../state/GameContext";
import { calcNivel, getItem, getJob, getRank, getUniform, ITEMS, JOBS } from "../game/jobs";
import { getProperty as getPropertyDef } from "../game/mapData";
import { calculatePatrimony } from "../game/types";
import { Avatar, Bar, Btn, Card, Input, Label, Modal, money, BOTTOM_STYLES, CABELOS, CORES, HAIR_STYLES, PELES, SHIRT_STYLES, SHOE_STYLES } from "./ui";
import type { InteractTarget, PlayerData, SceneId, Sexo, ShirtArtTransform, ShirtStyle } from "../game/types";

export type ModalId = null | "jobs" | "shop" | "arsenal" | "bank" | "prop" | "inv" | "settings" | "help" | "profile" | "admin";

const SCENE_NAME: Record<SceneId, string> = { city: "PixelCity — Centro", barracks: "Quartel General", house: "Interior da Residência", clothing: "Loja de Roupas", hospital: "Hospital Central" };

export default function HUD({ target, scene, onOpen, onToggleEditor, editorOn, onInteract, onZoomIn, onZoomOut, onGoMe, onTutorial, canEdit }: {
  target: InteractTarget | null; scene: SceneId; onOpen: (m: ModalId) => void; onToggleEditor: () => void; editorOn: boolean; onInteract: () => void;
  onZoomIn: () => void; onZoomOut: () => void; onGoMe: () => void; onTutorial: () => void; canEdit?: boolean;
}) {
  const { player, others, offline, toasts, collectSalary, orgConfigs, patch } = useGame();
  const [showPlayers, setShowPlayers] = useState(false);
  if (!player) return null;
  const job = getJob(player.emprego);
  const rank = getRank(player.emprego, player.patente);
  const lv = calcNivel(player.xp);
  const nearby = others.filter((o) => o.scene === scene);

  return (<>
    {/* PROFILE CARD — Premium HUD (top left) */}
    <div className="pointer-events-auto absolute left-3 top-3 z-20 w-[300px] max-w-[85vw]">
      <button onClick={() => onOpen("profile")} className="hud-card w-full p-3 text-left transition hover:scale-[1.01]">
        <div className="flex gap-3">
          {/* Avatar frame com brilho */}
          <div className="relative shrink-0">
            <div className="hud-inset flex h-[74px] w-[58px] items-center justify-center">
              <Avatar cor={player.cor} cabelo={player.cabelo} cabeloEstilo={player.cabeloEstilo} pele={player.pele || "#f0c396"} sexo={player.sexo || "masculino"} camisaModelo={player.camisaModelo} inferiorModelo={player.inferiorModelo} calcaCor={player.calcaCor} sapatoModelo={player.sapatoModelo} sapatoCor={player.sapatoCor} size={44} farda={getUniform(player.emprego, player.patente, orgConfigs)} insignia={rank?.insignia} />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center border border-[#0a1024] bg-gradient-to-br from-[#43dcff] to-[#3178c8] px-1 font-pixel text-[7px] text-white shadow-[0_0_8px_rgba(67,220,255,0.6)]">{lv.nivel}</div>
          </div>
          {/* Coluna direita: nome, RG, patente, barras */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-pixel text-[11px] text-white drop-shadow-[0_1px_0_#000]">{player.nome}</span>
              {player.isAdmin && <span className="border border-[#4c2b7a] bg-[#7a4fb5] px-1 font-pixel text-[5px] text-white">ADM</span>}
              {player.isLeader && <span className="border border-[#9a7318] bg-[#d8a13a] px-1 font-pixel text-[5px] text-[#2c1e05]">LÍDER</span>}
            </div>
            <div className="mt-0.5 flex items-center gap-1">
              <span className="font-pixel text-[6px] text-[#43dcff] drop-shadow-[0_0_4px_rgba(67,220,255,0.6)]">🪪 {player.rg}</span>
            </div>
            <div className="mt-1 truncate text-[10px]" style={{ color: job?.cor ?? "#8fa3c8" }}>
              {job ? `${job.icone} ${player.patente}` : "🧍 Civil"}
            </div>
            <div className="mt-1.5 flex items-center gap-1">
              <span className="text-[10px]" title="Saúde">❤</span>
              <div className="hud-inset h-2 flex-1"><div className="status-bar" style={{ width: `${player.saude}%`, background: "#ef5d65" }} /></div>
            </div>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-[10px]" title="Energia">⚡</span>
              <div className="hud-inset h-2 flex-1"><div className="status-bar" style={{ width: `${player.energia}%`, background: "#ffd65a" }} /></div>
            </div>
            <div className="mt-1 flex items-center gap-1">
              <span className="font-pixel text-[6px] text-[#43dcff]">XP</span>
              <div className="hud-inset h-1.5 flex-1"><div className="status-bar" style={{ width: `${(lv.atual / Math.max(1, lv.necessario)) * 100}%`, background: "#43dcff" }} /></div>
            </div>
          </div>
        </div>
        {/* Barra financeira */}
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <div className="hud-inset flex items-center gap-1.5 px-2 py-1">
            <span className="text-[10px]">💵</span>
            <div className="min-w-0"><div className="font-pixel text-[6px] text-[#7184a8]">CARTEIRA</div><div className="font-pixel truncate text-[9px] text-[#ffd65a]">{money(player.saldoCarteira)}</div></div>
          </div>
          <div className="hud-inset flex items-center gap-1.5 px-2 py-1">
            <span className="text-[10px]">🏦</span>
            <div className="min-w-0"><div className="font-pixel text-[6px] text-[#7184a8]">BANCO</div><div className="font-pixel truncate text-[9px] text-[#55e294]">{money(player.saldoBanco)}</div></div>
          </div>
        </div>
      </button>
      <div className="mt-1 flex items-center gap-1">
        <span className={`pixel-btn px-2 py-0.5 font-pixel text-[6px] ${offline ? "bg-[#c07c2a] text-white" : "bg-gradient-to-r from-[#2f6b4a] to-[#41946a] text-white"}`}>{offline ? "● LOCAL" : "● ONLINE"}</span>
        <span className="pixel-btn bg-[#0f1a2e] px-2 py-0.5 font-pixel text-[6px] text-[#8fa3c8]">{SCENE_NAME[scene]}</span>
      </div>
    </div>

    {/* TOP RIGHT — menu com hierarquia visual */}
    <div className="pointer-events-auto absolute right-3 top-3 z-20 flex flex-wrap justify-end gap-1.5">
      <HudButton icon="💰" tone="gold" title="Bater ponto e receber salário" onClick={collectSalary} />
      <HudButton icon="💼" tone="army" title="Empregos & Organizações" onClick={() => onOpen("jobs")} />
      <HudButton icon="🏦" tone="blue" title="Banco" onClick={() => onOpen("bank")} />
      <HudButton icon="🎒" tone="slate" title="Mochila" onClick={() => onOpen("inv")} />
      {(player.isAdmin || canEdit) && <HudButton icon="🛠" tone={editorOn ? "red" : "purple"} title={player.isAdmin ? "Modo Editor" : "Decorar minha casa"} onClick={onToggleEditor} />}
      {player.isAdmin && <HudButton icon="🛡" tone="purple" title="Painel Administrativo" onClick={() => onOpen("admin")} />}
      <HudButton icon="❔" tone="slate" title="Tutorial" onClick={onTutorial} />
      <HudButton icon="⚙" tone="slate" title="Configurações" onClick={() => onOpen("settings")} />
      <HudButton icon="🌐" label="/ME" tone="cyan" title="Voltar ao portal" onClick={onGoMe} />
    </div>

    {/* ZOOM CONTROLS */}
    <div className="pointer-events-auto absolute right-3 top-[calc(50%-32px)] z-20 flex flex-col gap-1">
      <Btn tone="slate" size="sm" onClick={onZoomIn} title="Aproximar (ou role o mouse)">➕</Btn>
      <Btn tone="slate" size="sm" onClick={onZoomOut} title="Afastar (ou role o mouse)">➖</Btn>
    </div>

    {/* PLAYERS ONLINE */}
    <div className="pointer-events-auto absolute right-3 top-[48px] z-10 w-[190px]">
      {showPlayers ? (
        <div className="pixel-panel overflow-hidden">
          <button onClick={() => setShowPlayers(false)} className="flex w-full items-center gap-2 border-b-2 border-[#0a1024] bg-[#16233f] px-2.5 py-1.5">
            <span className="font-pixel flex-1 text-left text-[7px] text-[#8fa3c8]">👥 ONLINE ({others.length + 1})</span>
            <span className="font-pixel text-[6px] text-[#5c6b8a]">▲</span>
          </button>
          <div className="scroll-thin max-h-[140px] overflow-y-auto bg-[#0c1428]/85 p-1">
            <div className="flex items-center gap-2 px-1 py-0.5">
              <div className="h-2.5 w-2.5 border border-[#0a1024]" style={{ background: player.cor }} />
              <span className="flex-1 truncate text-[10px] text-[#7ee0ff]">{player.nome}</span>
            </div>
            {others.map((o) => (
              <div key={o.uid} className="flex items-center gap-2 px-1 py-0.5">
                <div className="h-2.5 w-2.5 border border-[#0a1024]" style={{ background: o.cor }} />
                <span className="flex-1 truncate text-[10px] text-[#c9d6ee]">{o.nome}</span>
                <span className="text-[8px] text-[#5c6b8a]">{o.scene === scene ? "aqui" : o.scene === "barracks" ? "quartel" : o.scene === "house" ? "casa" : "cidade"}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button onClick={() => setShowPlayers(true)} className="pixel-btn ml-auto block bg-[#16233f] px-2 py-1 font-pixel text-[7px] text-[#8fa3c8]">👥 {others.length + 1}</button>
      )}
    </div>

    {/* GUIA IMOBILIÁRIO / GPS */}
    {player.gpsTarget && (
      <div className="pointer-events-auto absolute right-3 top-1/2 z-20 w-52 -translate-y-1/2">
        <div className="hud-card p-3">
          <div className="flex items-center gap-2"><span className="pulse-glow text-lg">📍</span><div className="min-w-0 flex-1"><div className="font-pixel text-[7px] text-[#43dcff]">GUIA ATIVO</div><div className="mt-1 truncate text-[11px] text-white">{player.gpsTarget.label}</div></div></div>
          <div className="mt-2 flex justify-between text-[9px] text-[#7184a8]"><span>Distância aproximada</span><span className="text-[#ffd65a]">{Math.round(Math.hypot(player.x - player.gpsTarget.x, player.y - player.gpsTarget.y) / 16)} tiles</span></div>
          <Btn tone="slate" size="sm" full className="mt-2" onClick={() => patch({ gpsTarget: null })}>Encerrar guia</Btn>
        </div>
      </div>
    )}

    {/* INTERACT */}
    {target && (
      <div className="pointer-events-auto absolute bottom-32 left-1/2 z-20 -translate-x-1/2">
        <button onClick={onInteract} className="pixel-panel key-bounce flex flex-col items-center px-4 py-2.5">
          <span className="flex items-center gap-3">
            <span className="pixel-btn bg-[#ffd980] px-2.5 py-1.5 font-pixel text-[11px] text-[#2c1e05]">E</span>
            <span className="font-pixel text-[9px] text-white">{target.label}</span>
          </span>
          {target.kind === "house" && <HouseInfo x={target.x} y={target.y} />}
        </button>
      </div>
    )}

    {/* AVISO DE ARMA EQUIPADA */}
    {(() => {
      const armed = (player.equipped ?? []).some((e) => e === "arma_fogo" || e === "municao");
      if (!armed) return null;
      return (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-30 -translate-x-1/2">
          <div className="hud-card flex items-center gap-2 px-3 py-2 shadow-[0_0_16px_rgba(239,93,101,0.25)]">
            <span className="flex h-6 w-6 items-center justify-center border border-[#ef5d65] bg-[#2c110d] font-pixel text-[10px] text-[#ef5d65]">F</span>
            <span className="font-pixel text-[8px] text-[#ffcf6b]">Aperte F para atirar</span>
          </div>
        </div>
      );
    })()}

    {/* AVISO DE SALDO NEGATIVO */}
    {(player.saldoCarteira < 0 || player.saldoBanco < 0) && (
      <div className="pointer-events-none absolute top-[122px] left-3 z-30 w-[280px] max-w-[82vw]">
        <div className="border border-[#8a2a20] bg-[#2c110d] px-3 py-2 shadow-[0_0_12px_rgba(239,93,101,0.3)]">
          <div className="font-pixel text-[7px] text-[#ff9a90]">⚠ SALDO NEGATIVO</div>
          <div className="mt-1 text-[10px] text-[#ffcf6b]">Cartão de Crédito bloqueado até você quitar a dívida.</div>
        </div>
      </div>
    )}

    {/* TOASTS PREMIUM */}
    <div className="pointer-events-none absolute left-1/2 top-4 z-40 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => {
        const conf = t.tone === "money" ? { color: "#ffd65a", border: "#8a6810", icon: "💰", bg: "linear-gradient(180deg,#3a2a10,#241a05)" }
          : t.tone === "ok" ? { color: "#55e294", border: "#1e6b3f", icon: "✓", bg: "linear-gradient(180deg,#0f2b1c,#081912)" }
          : t.tone === "bad" ? { color: "#ff9a90", border: "#8a2a20", icon: "!", bg: "linear-gradient(180deg,#2c110d,#1a0906)" }
          : t.tone === "warn" ? { color: "#ffcf6b", border: "#7a5310", icon: "⚠", bg: "linear-gradient(180deg,#2c1f05,#1a1204)" }
          : { color: "#cfe0ff", border: "#2b3f60", icon: "i", bg: "linear-gradient(180deg,#0f1a2e,#08111c)" };
        return (
          <div key={t.id} className="toast-item flex items-center gap-2 border px-3 py-1.5 text-[12px] font-bold shadow-lg" style={{ background: conf.bg, borderColor: conf.border, color: conf.color, boxShadow: `0 6px 16px rgba(0,0,0,0.5), 0 0 12px ${conf.color}22` }}>
            <span className="flex h-5 w-5 items-center justify-center border" style={{ borderColor: conf.border, background: "rgba(0,0,0,0.35)" }}>{conf.icon}</span>
            <span>{t.msg}</span>
          </div>
        );
      })}
    </div>

    {nearby.length > 0 && <div className="pointer-events-none absolute bottom-24 right-3 z-10 font-pixel text-[7px] text-[#3a4d70]">{nearby.length} JOGADOR(ES) AQUI</div>}
  </>);
}

/* Botão HUD premium — usado no menu superior direito */
function HudButton({ icon, label, tone = "slate", title, onClick }: { icon: string; label?: string; tone?: "gold" | "army" | "blue" | "slate" | "red" | "purple" | "cyan"; title?: string; onClick: () => void }) {
  const styles: Record<string, string> = {
    gold: "from-[#c99118] to-[#7a5410] text-white border-[#3b2905]",
    army: "from-[#5d7a45] to-[#3d5225] text-white border-[#22301a]",
    blue: "from-[#3f7ad6] to-[#255494] text-white border-[#0f2649]",
    slate: "from-[#2a3a5a] to-[#182338] text-[#d8dfef] border-[#0a1329]",
    red: "from-[#c4483f] to-[#7a231d] text-white border-[#3b0a08]",
    purple: "from-[#7a4fb5] to-[#4a2c76] text-white border-[#2a175b]",
    cyan: "from-[#43dcff] to-[#1c7ba5] text-white border-[#083248]",
  };
  return (
    <button
      onClick={onClick}
      title={title}
      className={`group relative flex h-9 items-center gap-1 border bg-gradient-to-b px-2.5 font-pixel text-[10px] transition hover:brightness-110 hover:-translate-y-px active:translate-y-0 ${styles[tone]}`}
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 0 rgba(0,0,0,0.4)" }}
    >
      <span className="text-sm drop-shadow-[0_1px_0_rgba(0,0,0,0.5)]">{icon}</span>
      {label && <span className="text-[8px] tracking-wider">{label}</span>}
    </button>
  );
}

/* Placa de informações do imóvel exibida na frente da casa */
function HouseInfo({ x, y }: { x: number; y: number }) {
  const { player, properties } = useGame();
  const def = getPropertyDef(x, y);
  const prop = properties[def.id];
  if (!player) return null;
  const mine = prop?.ownerUid === player.uid || player.propriedadesCompradas?.includes(def.id);
  return (
    <span className="mt-1.5 border-t border-[#24345a] pt-1.5 text-[10px]">
      {mine ? (
        <span className="text-[#7ee0ff]">🏠 {def.nome} · Sua casa {prop?.locked ? "· 🔒 trancada" : "· 🔓 aberta"}</span>
      ) : prop?.ownerUid ? (
        <span className="text-[#ffcf6b]">🏠 {def.nome} · Proprietário: {prop.ownerNome} {prop.locked ? "· 🔒 trancada" : "· 🔓 visitas abertas"}</span>
      ) : (
        <span className="text-[#59e08a]">🏠 {def.nome} · À VENDA · {money(def.preco)}</span>
      )}
    </span>
  );
}

/* PROFILE MODAL — /me — Carteira de Identidade RP */
export function ProfileModal({ onClose }: { onClose: () => void }) {
  const { player, properties, offline, orgConfigs } = useGame();
  if (!player) return null;
  const job = getJob(player.emprego);
  const rank = job ? getRank(job.id, player.patente) : null;
  const lv = calcNivel(player.xp);
  const meuImoveis = Object.values(properties).filter((p) => p.ownerUid === player.uid);
  const patrimonio = calculatePatrimony(player, properties);
  const idade = player.dataNascimento ? Math.max(0, Math.floor((Date.now() - new Date(player.dataNascimento).getTime()) / 3.15576e10)) : null;

  return (
    <Modal title="Carteira de Identidade RP" icon="🪪" accent="#1c2a4a" onClose={onClose} width="max-w-3xl">
      <div className="space-y-4">
        {/* CARTÃO DE RG PIXELADO */}
        <div className="pixel-panel overflow-hidden" style={{ background: "linear-gradient(135deg,#1c2a4a,#0e1729)" }}>
          <div className="flex items-center gap-2 border-b-2 border-[#0a1024] bg-[#0a1024] px-4 py-2">
            <span className="text-lg">🪪</span>
            <span className="font-pixel text-[9px] text-[#ffd980]">REPÚBLICA DE PIXELCITY — CARTEIRA DE CIDADÃO</span>
            <span className="ml-auto font-pixel text-[7px] text-[#5c6b8a]">{offline ? "🔴 LOCAL" : "🟢 VÁLIDA · SINCRONIZADA"}</span>
          </div>
          <div className="flex flex-wrap gap-5 p-5">
            <div className="pixel-inset flex h-[130px] w-[104px] shrink-0 items-center justify-center bg-[#0a1024]">
              <Avatar cor={player.cor} cabelo={player.cabelo} cabeloEstilo={player.cabeloEstilo} pele={player.pele || "#f0c396"} sexo={player.sexo || "masculino"} camisaModelo={player.camisaModelo} inferiorModelo={player.inferiorModelo} calcaCor={player.calcaCor} sapatoModelo={player.sapatoModelo} sapatoCor={player.sapatoCor} size={84} farda={getUniform(player.emprego, player.patente, orgConfigs)} insignia={rank?.insignia} />
            </div>
            <div className="min-w-[220px] flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="font-pixel text-[14px] text-white">{player.nome}</h3>
                {player.isAdmin && <span className="bg-[#7a4fb5] px-1.5 py-0.5 font-pixel text-[7px] text-white">ADMIN</span>}
                {player.isLeader && <span className="bg-[#d8a13a] px-1.5 py-0.5 font-pixel text-[7px] text-[#2c1e05]">LÍDER</span>}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-[#c9d6ee]">
                <div>RG: <span className="text-[#7ee0ff]">{player.rg}</span></div>
                <div>Sexo: {player.sexo === "feminino" ? "Feminino" : "Masculino"}</div>
                <div>Nasc.: {player.dataNascimento || "—"} {idade !== null && <span className="text-[#8fa3c8]">({idade}a)</span>}</div>
                <div>Nível: <b className="text-[#7ee0ff]">{lv.nivel}</b></div>
              </div>
              <div className="pixel-inset mt-1 flex items-center gap-2 px-2 py-1.5">
                <span className="text-lg">{job?.icone ?? "🧍"}</span>
                <div className="text-[11px] text-[#c9d6ee]">
                  <div><b className="text-[#ffd980]">{player.patente}</b> {job && `· ${job.nome}`}</div>
                  {rank && <div className="text-[#8fa3c8]">Salário: {money(rank.salario)}/turno</div>}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Bar value={lv.atual} max={lv.necessario} color="#7ee0ff" className="h-2.5 flex-1" />
                <span className="font-pixel text-[7px] text-[#7ee0ff]">{lv.atual}/{lv.necessario} XP</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t-2 border-[#0a1024] bg-[#0a1024] px-4 py-1.5">
            <div className="flex gap-0.5">{Array.from({ length: 22 }).map((_, i) => (<div key={i} className="h-3 w-[3px]" style={{ background: i % 3 === 0 ? "#0a1024" : "#7ee0ff55" }} />))}</div>
            <span className="font-pixel text-[6px] text-[#3a4d70]">DOC-{player.uid.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([
            ["💵 Carteira", money(player.saldoCarteira), "#ffd980"],
            ["🏦 Banco", money(player.saldoBanco), "#59e08a"],
            ["💎 Patrimônio", money(patrimonio), "#7ee0ff"],
            ["🏠 Imóveis", `${meuImoveis.length}`, "#c9d6ee"],
            ["⏱ Turnos trabalhados", `${player.hoursWorked || 0}`, "#c9d6ee"],
            ["❤️ Saúde", `${Math.round(player.saude)}%`, "#e0574c"],
            ["⚡ Energia", `${Math.round(player.energia)}%`, "#ffd980"],
            ["🏅 Insígnias", `${(player.insignias ?? []).length}`, "#d8a13a"],
          ] as const).map(([lbl, val, clr]) => (
            <Card key={lbl} className="text-center">
              <div className="text-[10px] text-[#8fa3c8]">{lbl}</div>
              <div className="font-pixel mt-1 text-[10px]" style={{ color: clr }}>{val}</div>
            </Card>
          ))}
        </div>

        {/* INVENTÁRIO */}
        <Card>
          <Label>Inventário ({(player.inventario ?? []).reduce((a, b) => a + b.qtd, 0)} itens)</Label>
          {(player.inventario ?? []).length === 0 ? (
            <div className="text-xs text-[#5c6b8a]">Mochila vazia</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(player.inventario ?? []).map((slot) => {
                const item = getItem(slot.id);
                return (
                  <div key={slot.id} className="pixel-inset flex items-center gap-1.5 px-2 py-1">
                    <span className="text-sm">{item?.icone ?? "📦"}</span>
                    <span className="text-[10px] text-[#c9d6ee]">{item?.nome ?? slot.id}</span>
                    <span className="font-pixel text-[7px] text-[#ffd980]">x{slot.qtd}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="text-[11px] text-[#5c6b8a]">Registro digital: <code className="text-[#7ee0ff]">{player.rg}</code> · perfil sincronizado</Card>
      </div>
    </Modal>
  );
}

/* SETTINGS */
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { player, patch, grantAdmin, adminLogout, logout, offline } = useGame();
  const [nome, setNome] = useState(player?.nome ?? "");
  const [nascimento, setNascimento] = useState(player?.dataNascimento ?? "");
  const [code, setCode] = useState("");
  if (!player) return null;

  return (
    <Modal title="Configurações" icon="⚙" accent="#3a4763" onClose={onClose} width="max-w-lg">
      <div className="space-y-4">
        <Card className="flex items-center gap-4">
          <Avatar cor={player.cor} cabelo={player.cabelo} cabeloEstilo={player.cabeloEstilo} pele={player.pele || "#f0c396"} sexo={player.sexo || "masculino"} camisaModelo={player.camisaModelo} inferiorModelo={player.inferiorModelo} calcaCor={player.calcaCor} sapatoModelo={player.sapatoModelo} sapatoCor={player.sapatoCor} size={56} />
          <div className="flex-1 space-y-2">
            <div><Label>Nome</Label><Input value={nome} maxLength={22} onChange={(e) => setNome(e.target.value)} /></div>
            <div><Label>Data de nascimento</Label><Input type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} /></div>
            <Btn tone="green" size="sm" onClick={() => patch({ nome: nome.trim() || player.nome, dataNascimento: nascimento })}>Salvar</Btn>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Gênero</Label>
            <div className="flex gap-1.5">
              {(["masculino", "feminino"] as const).map((s) => (
                <button key={s} onClick={() => patch(s === "feminino" ? { sexo: s, cabeloEstilo: "longo", camisaModelo: "blusa", inferiorModelo: "saia" } : { sexo: s, cabeloEstilo: "curto", camisaModelo: "camiseta", inferiorModelo: "calca" })} className={`pixel-btn flex-1 py-2 font-pixel text-[8px] ${player.sexo === s ? "bg-[#3f7ad6] text-white ring-1 ring-[#7ee0ff]" : "bg-[#1c2a4a] text-[#8fa3c8]"}`}>
                  {s === "feminino" ? "♀" : "♂"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Pele</Label>
            <div className="flex flex-wrap gap-1">
              {PELES.map((c) => (<button key={c} onClick={() => patch({ pele: c })} className={`pixel-btn h-6 w-6 rounded-full ${(player.pele || "#f0c396") === c ? "ring-2 ring-[#7ee0ff]" : ""}`} style={{ background: c }} />))}
            </div>
          </div>
        </div>

        <div><Label>Roupa</Label><div className="flex flex-wrap gap-1.5">{CORES.map((c) => (<button key={c} onClick={() => patch({ cor: c })} className={`pixel-btn h-7 w-7 ${player.cor === c ? "ring-2 ring-[#7ee0ff]" : ""}`} style={{ background: c }} />))}</div></div>
        <div><Label>Cabelo</Label><div className="flex flex-wrap gap-1.5">{CABELOS.map((c) => (<button key={c} onClick={() => patch({ cabelo: c })} className={`pixel-btn h-7 w-7 ${player.cabelo === c ? "ring-2 ring-[#7ee0ff]" : ""}`} style={{ background: c }} />))}</div></div>
        <div><Label>Penteado</Label><div className="flex flex-wrap gap-1.5">{HAIR_STYLES.filter((s) => s.genero === "unissex" || s.genero === player.sexo).map((s) => <Btn key={s.id} tone={player.cabeloEstilo === s.id ? "cyan" : "slate"} size="sm" onClick={() => patch({ cabeloEstilo: s.id })}>{s.nome}</Btn>)}</div></div>
        <div><Label>Modelo da camisa</Label><div className="flex flex-wrap gap-1.5">{SHIRT_STYLES.filter((s) => s.genero === "unissex" || s.genero === player.sexo).map((s) => <Btn key={s.id} tone={player.camisaModelo === s.id ? "blue" : "slate"} size="sm" onClick={() => patch({ camisaModelo: s.id })}>{s.nome}</Btn>)}</div></div>
        <div><Label>Calça / Saia</Label><div className="flex flex-wrap gap-1.5">{BOTTOM_STYLES.filter((s) => s.genero === "unissex" || s.genero === player.sexo).map((s) => <Btn key={s.id} tone={player.inferiorModelo === s.id ? "purple" : "slate"} size="sm" onClick={() => patch({ inferiorModelo: s.id })}>{s.nome}</Btn>)}</div></div>
        <div><Label>Sapatos</Label><div className="flex flex-wrap gap-1.5">{SHOE_STYLES.map((s) => <Btn key={s.id} tone={player.sapatoModelo === s.id ? "gold" : "slate"} size="sm" onClick={() => patch({ sapatoModelo: s.id })}>{s.nome}</Btn>)}</div></div>

        {/* ADMIN CODE — only here, never elsewhere */}
        <div className="border-t-2 border-[#0a1024] pt-3">
          <Label>🛡️ Acesso restrito</Label>
          {player.isAdmin ? (
            <div className="space-y-2">
              <Card className="text-xs text-[#59e08a]">✅ Modo administrador ativo.</Card>
              <Btn tone="red" full size="sm" onClick={adminLogout}>Deslogar do Modo Admin</Btn>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código de administrador" type="password" />
              <Btn tone="purple" onClick={() => grantAdmin(code) && setCode("")}>Ativar</Btn>
            </div>
          )}
        </div>

        <Card className="text-[11px] text-[#5c6b8a]">
          <div>UID: <code className="text-[#7ee0ff]">{player.uid}</code></div>
          <div>Status: {offline ? <span className="text-[#ffcf6b]">modo local</span> : <span className="text-[#59e08a]">servidor online · sincronizado</span>}</div>
        </Card>

        <Btn tone="red" full size="lg" onClick={logout}>🚪 Sair da conta</Btn>
      </div>
    </Modal>
  );
}

/* ADMIN PANEL — SUPREMO */
export function AdminModal({ onClose }: { onClose: () => void }) {
  const {
    player, directory, adminSetPlayer, adminBanPlayer, adminTeleportPlayer, adminSetOrgSalary,
    adminSetRecruitRank, adminSetItemPrice, properties, orgConfigs, priceOverrides, notify,
    setLeader, adminSetUniform, economyConfig, adminSetEconomyConfig, addClothingV2, updateClothing, deleteClothing, clothingItems, wipeAllData,
  } = useGame();
  const [tab, setTab] = useState<"players" | "orgs" | "economy" | "treasury" | "world" | "roupas" | "sistema">("players");
  const [sel, setSel] = useState<string>("");
  const [field, setField] = useState<string>("saldoCarteira");
  const [val, setVal] = useState<string>("10000");
  const [banReason, setBanReason] = useState("");
  const [teleScene, setTeleScene] = useState<SceneId>("city");
  const [giveItem, setGiveItem] = useState("medkit");
  const [giveQty, setGiveQty] = useState(1);
  if (!player || !player.isAdmin) return null;

  const allPlayers = [player, ...directory.filter((p) => p.uid !== player.uid)];
  const target = allPlayers.find((p) => p.uid === sel);

  const applyEdit = () => {
    if (!sel) return notify("Selecione um jogador.", "warn");
    let parsed: unknown = val;
    if (["saldoCarteira", "saldoBanco", "xp", "nivel", "saude", "energia", "hoursWorked"].includes(field)) parsed = Number(val) || 0;
    else if (val === "true") parsed = true; else if (val === "false") parsed = false;
    adminSetPlayer(sel, { [field]: parsed } as Partial<PlayerData>);
  };

  return (
    <Modal title="Painel Administrativo Supremo" icon="🛡️" accent="#7a4fb5" onClose={onClose} width="max-w-5xl">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(["players", "orgs", "economy", "treasury", "world", "roupas", "sistema"] as const).map((t) => (
          <Btn key={t} tone={tab === t ? "purple" : "slate"} size="sm" onClick={() => setTab(t)}>
            {t === "players" ? "👥 Jogadores" : t === "orgs" ? "🏢 Organizações" : t === "economy" ? "💰 Economia/Lojas" : t === "treasury" ? "🏛 Cofre Nacional" : t === "world" ? "🌍 Mundo" : t === "roupas" ? "👕 Roupas" : "⚠️ Sistema"}
          </Btn>
        ))}
      </div>

      {tab === "players" && (
        <div className="space-y-3">
          <Card className="border-l-4 border-[#7a4fb5]"><p className="text-xs text-[#c9d6ee]">Controle total: cadastro, economia, cargos, ban e teleporte. Todas as ações são sincronizadas e auditadas.</p></Card>
          <select value={sel} onChange={(e) => setSel(e.target.value)} className="pixel-inset w-full px-3 py-2.5 text-sm text-[#e8eefb] outline-none">
            <option value="">— Selecionar jogador —</option>
            {allPlayers.map((p) => (<option key={p.uid} value={p.uid}>{p.nome} ({p.patente}) {p.uid === player.uid ? "(VOCÊ)" : ""} {p.banido ? "🚫" : ""}</option>))}
          </select>
          {target && (
            <>
              <Card>
                <div className="mb-2 flex items-center gap-2 font-pixel text-[10px] text-white">
                  {target.nome} — LV{target.nivel} · {target.patente} {target.banido && <span className="bg-[#c4483f] px-1.5 py-0.5 text-[7px]">BANIDO</span>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#8fa3c8]">
                  <div>💵 Carteira: {money(target.saldoCarteira)}</div>
                  <div>🏦 Banco: {money(target.saldoBanco)}</div>
                  <div>⚡ Energia: {Math.round(target.energia)}</div>
                  <div>❤️ Saúde: {Math.round(target.saude)}</div>
                  <div>🎖 Emprego: {target.emprego}</div>
                  <div>📊 XP: {target.xp}</div>
                  <div>🆔 RG: {target.rg}</div>
                  <div>🎂 Nasc.: {target.dataNascimento || "—"}</div>
                </div>
              </Card>

              <div className="grid gap-3 md:grid-cols-2">
                <Card>
                  <Label>Profissão e patente</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      value={target.emprego}
                      onChange={(e) => {
                        const job = getJob(e.target.value);
                        adminSetPlayer(target.uid, {
                          emprego: e.target.value,
                          organizationId: e.target.value === "desempregado" ? "" : e.target.value,
                          patente: job?.ranks[0]?.nome ?? "Civil",
                          isLeader: false,
                        });
                      }}
                      className="pixel-inset px-2 py-2 text-xs text-[#e8eefb] outline-none"
                    >
                      <option value="desempregado">Desempregado</option>
                      {JOBS.map((job) => <option key={job.id} value={job.id}>{job.nome}</option>)}
                    </select>
                    <select
                      value={target.patente}
                      disabled={!getJob(target.emprego)}
                      onChange={(e) => adminSetPlayer(target.uid, { patente: e.target.value, isLeader: Boolean(getRank(target.emprego, e.target.value)?.leader) })}
                      className="pixel-inset px-2 py-2 text-xs text-[#e8eefb] outline-none disabled:opacity-50"
                    >
                      {!getJob(target.emprego) && <option value="Civil">Civil</option>}
                      {getJob(target.emprego)?.ranks.map((rank) => <option key={rank.id} value={rank.nome}>{rank.nome}</option>)}
                    </select>
                  </div>
                </Card>
                <Card>
                  <Label>Ajustes financeiros rápidos</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><div className="text-[10px] text-[#8fa3c8]">Carteira</div><div className="flex gap-1"><Btn tone="red" size="sm" onClick={() => adminSetPlayer(target.uid, { saldoCarteira: Math.max(0, target.saldoCarteira - 1000) })}>-1000</Btn><Btn tone="green" size="sm" onClick={() => adminSetPlayer(target.uid, { saldoCarteira: target.saldoCarteira + 1000 })}>+1000</Btn></div></div>
                    <div className="space-y-1"><div className="text-[10px] text-[#8fa3c8]">Banco</div><div className="flex gap-1"><Btn tone="red" size="sm" onClick={() => adminSetPlayer(target.uid, { saldoBanco: Math.max(0, target.saldoBanco - 1000) })}>-1000</Btn><Btn tone="green" size="sm" onClick={() => adminSetPlayer(target.uid, { saldoBanco: target.saldoBanco + 1000 })}>+1000</Btn></div></div>
                  </div>
                </Card>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div><Label>Campo</Label>
                  <select value={field} onChange={(e) => setField(e.target.value)} className="pixel-inset w-full px-2 py-2 text-xs text-[#e8eefb] outline-none">
                    {["saldoCarteira", "saldoBanco", "xp", "nivel", "saude", "energia", "emprego", "patente", "isAdmin", "isLeader", "hoursWorked", "organizationId", "nome", "sexo", "dataNascimento"].map((f) => (<option key={f} value={f}>{f}</option>))}
                  </select>
                </div>
                <div><Label>Valor</Label><Input value={val} onChange={(e) => setVal(e.target.value)} /></div>
                <div className="flex items-end"><Btn tone="purple" full onClick={applyEdit}>Aplicar campo</Btn></div>
              </div>

              <Card>
                <Label>🚀 Teleportar jogador</Label>
                <div className="flex gap-2">
                  <select value={teleScene} onChange={(e) => setTeleScene(e.target.value as SceneId)} className="pixel-inset flex-1 px-2 py-2 text-xs text-[#e8eefb] outline-none">
                    <option value="city">Cidade</option>
                    <option value="barracks">Quartel</option>
                    <option value="house">Residência</option>
                  </select>
                  <Btn tone="cyan" onClick={() => adminTeleportPlayer(target.uid, teleScene, 400, 300)}>Teleportar</Btn>
                </div>
              </Card>

              <Card>
                <Label>🚫 Banimento</Label>
                <div className="flex gap-2">
                  <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Motivo (opcional)" />
                  {target.banido ? (
                    <Btn tone="green" onClick={() => adminBanPlayer(target.uid, false)}>Desbanir</Btn>
                  ) : (
                    <Btn tone="red" onClick={() => adminBanPlayer(target.uid, true, banReason)}>Banir</Btn>
                  )}
                </div>
              </Card>
              <Card>
                <Label>Gerador de itens</Label>
                <div className="flex flex-wrap gap-2">
                  <select value={giveItem} onChange={(e) => setGiveItem(e.target.value)} className="pixel-inset min-w-0 flex-1 px-2 py-2 text-xs text-[#e8eefb] outline-none">
                    {ITEMS.map((item) => <option key={item.id} value={item.id}>{item.icone} {item.nome}</option>)}
                  </select>
                  <Input type="number" min={1} value={giveQty} onChange={(e) => setGiveQty(Math.max(1, Number(e.target.value)))} className="w-24" />
                  <Btn tone="purple" onClick={() => {
                    const inventory = [...(target.inventario ?? [])];
                    const index = inventory.findIndex((slot) => slot.id === giveItem);
                    if (index >= 0) inventory[index] = { ...inventory[index], qtd: inventory[index].qtd + giveQty };
                    else inventory.push({ id: giveItem, qtd: giveQty });
                    adminSetPlayer(target.uid, { inventario: inventory });
                  }}>Entregar</Btn>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {tab === "orgs" && (
        <OrgManager
          players={allPlayers}
          orgConfigs={orgConfigs}
          setLeader={setLeader}
          adminSetOrgSalary={adminSetOrgSalary}
          adminSetRecruitRank={adminSetRecruitRank}
          adminSetUniform={adminSetUniform}
        />
      )}

      {tab === "economy" && (
        <div className="space-y-3">
          <Card className="border-l-4 border-[#43dcff] space-y-3">
            <div className="font-pixel text-[9px] text-[#43dcff]">💵 CADASTRO · DINHEIRO INICIAL DE NOVOS JOGADORES</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Saldo Inicial de Carteira (R$)</Label>
                <input
                  type="number"
                  defaultValue={economyConfig.saldoCarteiraInicial ?? 750}
                  onBlur={(e) => adminSetEconomyConfig({ saldoCarteiraInicial: Math.max(0, Number(e.target.value) || 0) })}
                  className="pixel-inset w-full px-3 py-2 text-xs text-[#ffd65a] outline-none"
                />
              </div>
              <div>
                <Label>Saldo Inicial do Banco (R$)</Label>
                <input
                  type="number"
                  defaultValue={economyConfig.saldoBancoInicial ?? 1500}
                  onBlur={(e) => adminSetEconomyConfig({ saldoBancoInicial: Math.max(0, Number(e.target.value) || 0) })}
                  className="pixel-inset w-full px-3 py-2 text-xs text-[#55e294] outline-none"
                />
              </div>
            </div>
            <p className="text-[10px] text-[#8fa3c8]">Valores que todo novo cidadão recebe ao registrar sua conta.</p>
          </Card>

          <Card className="border-l-4 border-[#ffd65a] space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-pixel text-[9px] text-[#ffd65a]">🏛 AUXÍLIO DO GOVERNO (DESEMPREGADOS)</div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={economyConfig.auxilioAtivo ?? true}
                  onChange={(e) => adminSetEconomyConfig({ auxilioAtivo: e.target.checked })}
                  className="accent-[#ffd65a] h-4 w-4"
                />
                <span className="text-[#c9d6ee] font-bold">{economyConfig.auxilioAtivo ? "ATIVO" : "INATIVO"}</span>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Valor do Benefício (R$)</Label>
                <input
                  type="number"
                  defaultValue={economyConfig.auxilioValor ?? 300}
                  onBlur={(e) => adminSetEconomyConfig({ auxilioValor: Math.max(0, Number(e.target.value) || 0) })}
                  className="pixel-inset w-full px-3 py-2 text-xs text-[#ffd65a] outline-none"
                />
              </div>
              <div>
                <Label>Intervalo de Solicitação (Minutos)</Label>
                <input
                  type="number"
                  defaultValue={economyConfig.auxilioIntervaloMinutos ?? 60}
                  onBlur={(e) => adminSetEconomyConfig({ auxilioIntervaloMinutos: Math.max(1, Number(e.target.value) || 60) })}
                  className="pixel-inset w-full px-3 py-2 text-xs text-[#7ee0ff] outline-none"
                />
              </div>
            </div>
            <p className="text-[10px] text-[#8fa3c8]">O valor sai diretamente do Cofre Nacional e é depositado na conta bancária do cidadão desempregado.</p>
          </Card>

          <Label>Visão geral da economia</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            <Card className="text-center"><div className="text-[10px] text-[#8fa3c8]">👥 Jogadores registrados</div><div className="font-pixel text-[12px] text-[#7ee0ff]">{allPlayers.length}</div></Card>
            <Card className="text-center"><div className="text-[10px] text-[#8fa3c8]">💰 Total em circulação</div><div className="font-pixel text-[12px] text-[#ffd980]">{money(allPlayers.reduce((a, p) => a + p.saldoCarteira + p.saldoBanco, 0))}</div></Card>
            <Card className="text-center"><div className="text-[10px] text-[#8fa3c8]">🏠 Imóveis vendidos</div><div className="font-pixel text-[12px] text-[#59e08a]">{Object.values(properties).filter((p) => p.ownerUid).length}</div></Card>
          </div>
          <Label>💲 Preços de produtos (lojas)</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {["pao", "refri", "cafe", "marmita", "medkit", "energetico", "racao", "colete", "radio", "municao", "algema", "cassetete", "arma_fogo"].map((id) => {
              const item = getItem(id); if (!item) return null;
              const cur = priceOverrides[id] ?? item.preco;
              return (
                <div key={id} className="pixel-inset flex items-center gap-2 p-2">
                  <span className="text-lg">{item.icone}</span>
                  <span className="flex-1 truncate text-[11px] text-[#c9d6ee]">{item.nome}</span>
                  <input type="number" defaultValue={cur} className="w-20 bg-transparent text-right text-[11px] text-[#ffd980] outline-none"
                    onBlur={(e) => { const v = Number(e.target.value); if (v >= 0) adminSetItemPrice(id, v); }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "treasury" && <TreasuryPanel />}

      {tab === "world" && (
        <div className="space-y-3">
          <Card><p className="text-xs text-[#9fb2d4]">Use o 🛠 Modo Editor para construir e expandir a cidade. As edições aparecem em tempo real para todos os jogadores.</p></Card>
          <Card className="text-[11px] text-[#8fa3c8]">
            <div>📊 Mundo, economia, cidadãos e organizações estão sincronizados.</div>
          </Card>
        </div>
      )}

      {tab === "roupas" && (
        <ClothingCreatorPanel
          addClothingV2={addClothingV2}
          updateClothing={updateClothing}
          deleteClothing={deleteClothing}
          existingItems={clothingItems}
        />
      )}

      {tab === "sistema" && (
        <WipePanel wipeAllData={wipeAllData} notify={notify} />
      )}
    </Modal>
  );
}

/* HELP */
export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Como jogar" icon="❔" accent="#3f7ad6" onClose={onClose} width="max-w-2xl">
      <div className="space-y-3 text-sm text-[#c9d6ee]">
        <Card>
          <div className="font-pixel mb-2 text-[9px] text-[#ffd980]">CONTROLES</div>
          <p>🎮 <b>WASD/setas</b> andar · <b>E</b> interagir · <b>Enter</b> chat · <b>1-6</b> hotbar · <b>Scroll</b> zoom · <b>Esc</b> fechar.</p>
        </Card>
        <Card>
          <div className="font-pixel mb-2 text-[9px] text-[#ffd980]">CARTEIRA DE IDENTIDADE</div>
          <p>Acesse seu <b>🪪 Cartão de RG</b> clicando no perfil (canto superior esquerdo). Ele mostra emprego, patente, salário, patrimônio e insígnias.</p>
        </Card>
        <Card>
          <div className="font-pixel mb-2 text-[9px] text-[#ffd980]">SISTEMA DE CANDIDATURA</div>
          <p>Para entrar no Exército, Polícia, Bombeiros, Hospital ou Comércio, envie sua <b>candidatura</b> na Central de Empregos. O líder da organização aprova ou recusa. Ao ser aceito, você recebe a <b>farda oficial</b> automaticamente.</p>
        </Card>
        <Card>
          <div className="font-pixel mb-2 text-[9px] text-[#ffd980]">HOTBAR</div>
          <p>Equipe itens da mochila na Hotbar (barra inferior) e use com as teclas <b>1-6</b>. Clique direito num slot para desequipar.</p>
        </Card>
      </div>
    </Modal>
  );
}

/* ═══════════ COFRE NACIONAL (ADMIN) ═══════════ */
function TreasuryPanel() {
  const { treasury, treasuryLedger, treasuryDeposit, treasurySetConfig, directory } = useGame();
  const [valor, setValor] = useState(50000);
  const [desc, setDesc] = useState("Aporte do Tesouro");
  const [taxa, setTaxa] = useState(treasury.taxaServico ?? 1);
  const [ciclos, setCiclos] = useState(treasury.maxCiclos ?? 6);
  const [filtroOrg, setFiltroOrg] = useState("");

  const porOrg = JOBS.map((j) => ({
    job: j,
    entradas: treasuryLedger.filter((e) => e.org === j.id && e.valor > 0).reduce((s, e) => s + e.valor, 0),
    saidas: treasuryLedger.filter((e) => e.org === j.id && e.valor < 0).reduce((s, e) => s + Math.abs(e.valor), 0),
    membros: directory.filter((p) => p.emprego === j.id).length,
  }));
  const totalImpostos = treasuryLedger.filter((e) => e.tipo === "imposto").reduce((s, e) => s + e.valor, 0);
  const totalSalarios = treasuryLedger.filter((e) => e.tipo === "salario").reduce((s, e) => s + Math.abs(e.valor), 0);
  const totalDepositos = treasuryLedger.filter((e) => e.tipo === "deposito").reduce((s, e) => s + e.valor, 0);
  const extrato = filtroOrg ? treasuryLedger.filter((e) => e.org === filtroOrg) : treasuryLedger;

  return (
    <div className="space-y-3">
      <div className="hud-card overflow-hidden">
        <div className="bg-gradient-to-r from-[#14331f] to-[#0b1426] px-5 py-4">
          <div className="font-pixel text-[8px] text-[#55e294]">🏛 SALDO DO COFRE NACIONAL</div>
          <div className={`mt-2 text-3xl font-bold ${treasury.saldo < 0 ? "text-[#ef5d65]" : "text-[#55e294]"}`}>{money(treasury.saldo)}</div>
          <div className="mt-1 text-[10px] text-[#7184a8]">{treasury.updatedAt ? `Atualizado ${new Date(treasury.updatedAt).toLocaleString("pt-BR")}` : "Sem movimentações"}</div>
        </div>
        <div className="grid gap-px bg-[#263759] sm:grid-cols-3">
          <div className="bg-[#0b1426] p-3"><div className="font-pixel text-[6px] text-[#52698e]">IMPOSTOS RECEBIDOS</div><div className="mt-1 font-pixel text-[10px] text-[#55e294]">+{money(totalImpostos)}</div></div>
          <div className="bg-[#0b1426] p-3"><div className="font-pixel text-[6px] text-[#52698e]">SALÁRIOS PAGOS</div><div className="mt-1 font-pixel text-[10px] text-[#ef5d65]">−{money(totalSalarios)}</div></div>
          <div className="bg-[#0b1426] p-3"><div className="font-pixel text-[6px] text-[#52698e]">APORTES ADMIN</div><div className="mt-1 font-pixel text-[10px] text-[#43dcff]">+{money(totalDepositos)}</div></div>
        </div>
      </div>

      <Card className="border-l-4 border-[#55e294]">
        <Label>Depositar no Cofre Nacional</Label>
        <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
          <Input type="number" value={valor} onChange={(e) => setValor(Number(e.target.value))} />
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição do aporte" />
          <Btn tone="green" onClick={() => treasuryDeposit(Math.abs(valor), desc)}>Depositar</Btn>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[10000, 50000, 100000, 500000].map((v) => (<Btn key={v} tone="slate" size="sm" onClick={() => setValor(v)}>{money(v)}</Btn>))}
          <Btn tone="red" size="sm" onClick={() => treasuryDeposit(-Math.abs(valor), `Retirada · ${desc}`)}>− Retirar</Btn>
        </div>
      </Card>

      <Card className="border-l-4 border-[#ffd65a]">
        <Label>Regras da Conta de Serviços</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          <div><div className="text-[10px] text-[#8fa3c8]">Taxa por hora (%)</div><Input type="number" step="0.1" value={taxa} onChange={(e) => setTaxa(Number(e.target.value))} /></div>
          <div><div className="text-[10px] text-[#8fa3c8]">Acúmulo máximo (horas)</div><Input type="number" value={ciclos} onChange={(e) => setCiclos(Number(e.target.value))} /></div>
          <div className="flex items-end"><Btn tone="gold" full onClick={() => treasurySetConfig(taxa, ciclos)}>Salvar regras</Btn></div>
        </div>
        <div className="mt-2 text-[10px] text-[#7184a8]">Um cidadão com R$ 10.000 pagará <b className="text-[#ffd65a]">{money(Math.ceil(10000 * (taxa / 100)))}</b> por hora, acumulando até {ciclos}h.</div>
      </Card>

      <Label>Movimentação por organização</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {porOrg.map(({ job, entradas, saidas, membros }) => (
          <button key={job.id} onClick={() => setFiltroOrg(filtroOrg === job.id ? "" : job.id)}
            className={`pixel-inset p-3 text-left transition hover:brightness-125 ${filtroOrg === job.id ? "ring-2 ring-[#43dcff]" : ""}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{job.icone}</span>
              <span className="flex-1 truncate text-[11px] text-white">{job.nome}</span>
              <span className="font-pixel text-[7px] text-[#7184a8]">{membros} membros</span>
            </div>
            <div className="mt-2 flex gap-3 text-[10px]">
              <span className="text-[#55e294]">+{money(entradas)}</span>
              <span className="text-[#ef5d65]">−{money(saidas)}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Label>Extrato {filtroOrg ? `· ${getJob(filtroOrg)?.nome}` : "geral"}</Label>
        {filtroOrg && <Btn tone="slate" size="sm" onClick={() => setFiltroOrg("")}>Limpar filtro</Btn>}
      </div>
      <div className="scroll-thin max-h-[280px] divide-y divide-[#1c2a45] overflow-y-auto">
        {extrato.length === 0 && <div className="pixel-inset p-3 text-center text-xs text-[#52698e]">Nenhuma movimentação registrada.</div>}
        {extrato.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-3 px-1 py-2 text-[11px]">
            <div className="min-w-0">
              <div className="truncate text-[#c9d6ee]">
                <span className="mr-1.5 border border-[#263759] bg-[#0c1a2d] px-1 font-pixel text-[6px] text-[#7184a8]">{e.tipo.toUpperCase()}</span>
                {e.desc}
              </div>
              <div className="text-[9px] text-[#52698e]">{new Date(e.ts).toLocaleString("pt-BR")}</div>
            </div>
            <span className={e.valor >= 0 ? "text-[#55e294]" : "text-[#ef5d65]"}>{e.valor >= 0 ? "+" : "−"}{money(Math.abs(e.valor))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ATELIÊ DE CAMISAS (Admin) — desenho, upload, texto e preview modular */
function ClothingCreatorPanel({ addClothingV2, updateClothing, deleteClothing, existingItems }: {
  addClothingV2: (data: { nome: string; preco: number; cor: string; camisaModelo?: ShirtStyle; genero?: Sexo | "unissex"; image?: string; imageTransform?: ShirtArtTransform }) => Promise<void>;
  updateClothing: (id: string, data: Partial<import("../game/types").ClothingItem>) => Promise<void>;
  deleteClothing: (id: string) => Promise<void>;
  existingItems: import("../game/types").ClothingItem[];
}) {
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("800");
  const [cor, setCor] = useState("#3f7ad6");
  const [modelo, setModelo] = useState<ShirtStyle>("camiseta");
  const [genero, setGenero] = useState<"unissex" | "masculino" | "feminino">("unissex");
  const [previewSexo, setPreviewSexo] = useState<Sexo>("masculino");
  const [design, setDesign] = useState("");
  const [transform, setTransform] = useState<ShirtArtTransform>({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Card className="border-l-4 border-[#7a4fb5]">
        <p className="text-xs text-[#c9d6ee]">Ateliê de camisas: pinte, desenhe, envie uma imagem ou escreva texto antes de publicar na loja. A arte é compactada em pixel art para manter o jogo leve.</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_210px]">
        <Card className="space-y-3">
          <div>
            <Label>Nome da camisa</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Camisa Tropical" maxLength={28} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><Label>Modelo base</Label><select value={modelo} onChange={(e) => setModelo(e.target.value as ShirtStyle)} className="pixel-inset w-full px-2 py-2 text-xs text-[#e8eefb] outline-none"><option value="camiseta">Camiseta</option><option value="camisa">Camisa social</option><option value="jaqueta">Jaqueta</option><option value="blusa">Blusa</option></select></div>
            <div><Label>Categoria</Label><select value={genero} onChange={(e) => setGenero(e.target.value as typeof genero)} className="pixel-inset w-full px-2 py-2 text-xs text-[#e8eefb] outline-none"><option value="unissex">Unissex</option><option value="masculino">Masculina</option><option value="feminino">Feminina</option></select></div>
            <div><Label>Preço (R$)</Label><Input type="number" value={preco} onChange={(e) => setPreco(e.target.value)} min={0} /></div>
          </div>
          <div><Label>Cor do tecido</Label><div className="flex flex-wrap gap-1.5">{CORES.map((c) => <button key={c} onClick={() => setCor(c)} className={`pixel-btn h-8 w-10 ${cor === c ? "ring-2 ring-[#7ee0ff]" : ""}`} style={{ background: c }} />)}</div><input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="pixel-inset mt-1.5 h-8 w-full cursor-pointer" /></div>

          <ShirtDesignCanvas color={cor} initialImage={design} onChange={setDesign} />

          <div className="grid gap-3 border-t border-[#263759] pt-3 sm:grid-cols-2">
            <div><Label>Posição X: {transform.x}px</Label><input type="range" min="-8" max="8" value={transform.x} onChange={(e) => setTransform((t) => ({ ...t, x: Number(e.target.value) }))} className="w-full" /></div>
            <div><Label>Posição Y: {transform.y}px</Label><input type="range" min="-8" max="8" value={transform.y} onChange={(e) => setTransform((t) => ({ ...t, y: Number(e.target.value) }))} className="w-full" /></div>
            <div><Label>Esticar X: {transform.scaleX.toFixed(2)}x</Label><input type="range" min="0.3" max="2.5" step="0.05" value={transform.scaleX} onChange={(e) => setTransform((t) => ({ ...t, scaleX: Number(e.target.value) }))} className="w-full" /></div>
            <div><Label>Esticar Y: {transform.scaleY.toFixed(2)}x</Label><input type="range" min="0.3" max="2.5" step="0.05" value={transform.scaleY} onChange={(e) => setTransform((t) => ({ ...t, scaleY: Number(e.target.value) }))} className="w-full" /></div>
            <div className="sm:col-span-2"><Label>Rotação: {transform.rotation}°</Label><input type="range" min="-180" max="180" step="1" value={transform.rotation} onChange={(e) => setTransform((t) => ({ ...t, rotation: Number(e.target.value) }))} className="w-full" /></div>
          </div>
          <Btn tone="slate" size="sm" onClick={() => setTransform({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 })}>Resetar transformação</Btn>

          <Btn tone="purple" full size="lg" disabled={!nome.trim()} onClick={async () => {
            const data = { nome, preco: Number(preco), cor, camisaModelo: modelo, genero, image: design, imageTransform: transform };
            if (editingId) await updateClothing(editingId, data); else await addClothingV2(data);
            setNome(""); setPreco("800"); setDesign(""); setTransform({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }); setEditingId(null);
          }}>
            {editingId ? "💾 Salvar alterações" : "👕 Publicar camisa na loja"}
          </Btn>
        </Card>

        <Card className="flex flex-col items-center gap-2">
          <Label>Pré-visualização viva</Label>
          <div className="pixel-inset flex h-[210px] w-full items-center justify-center bg-[#0a1024]">
            <Avatar cor={cor} cabelo="#3a2418" cabeloEstilo={previewSexo === "feminino" ? "longo" : "social"} pele="#f0c396" sexo={previewSexo} camisaModelo={modelo} inferiorModelo={previewSexo === "feminino" ? "saia" : "calca"} camisaImagem={design} camisaTransform={transform} size={132} />
          </div>
          <div className="flex gap-1.5"><Btn tone={previewSexo === "masculino" ? "blue" : "slate"} size="sm" onClick={() => setPreviewSexo("masculino")}>♂</Btn><Btn tone={previewSexo === "feminino" ? "cyan" : "slate"} size="sm" onClick={() => setPreviewSexo("feminino")}>♀</Btn></div>
          <div className="text-center text-[10px] text-[#8fa3c8]">{modelo} · {genero} · {money(Number(preco))}</div>
        </Card>
      </div>

      <Card>
        <Label>Camisas cadastradas ({existingItems.length})</Label>
        {existingItems.length === 0 && <div className="text-xs text-[#5c6b8a]">Nenhuma camisa criada ainda.</div>}
        <div className="grid gap-1.5 sm:grid-cols-2">
          {existingItems.map((item) => <div key={item.id} className="pixel-inset flex items-center gap-2 p-2"><div className="relative h-9 w-9 border border-[#0a1024]" style={{ background: item.cor }}>{item.image && <img src={item.image} alt="" className="h-full w-full object-contain" style={{ imageRendering: "pixelated" }} />}</div><div className="min-w-0 flex-1"><div className="font-pixel text-[8px] text-white">{item.nome}</div><div className="text-[9px] text-[#8fa3c8]">{item.camisaModelo ?? "camiseta"} · {item.genero ?? "unissex"} · {money(item.preco)}</div></div><Btn tone="cyan" size="sm" onClick={() => { setEditingId(item.id); setNome(item.nome); setPreco(String(item.preco)); setCor(item.cor); setModelo(item.camisaModelo ?? "camiseta"); setGenero(item.genero ?? "unissex"); setDesign(item.image ?? ""); setTransform(item.imageTransform ?? { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }); }}>Editar</Btn><Btn tone="red" size="sm" onClick={() => deleteClothing(item.id)}>Excluir</Btn></div>)}
        </div>
      </Card>
    </div>
  );
}

/* ⚠️ WIPE TOTAL — zera contas, saldos e todos os valores */
function WipePanel({ wipeAllData, notify }: { wipeAllData: () => Promise<void>; notify: (msg: string, tone?: "info" | "ok" | "warn" | "bad" | "money") => void }) {
  const [confirmText, setConfirmText] = useState("");
  const [arming, setArming] = useState(false);
  const [executing, setExecuting] = useState(false);

  const handleWipe = async () => {
    if (confirmText.trim().toUpperCase() !== "WIPE") {
      notify("Digite WIPE para confirmar.", "bad");
      return;
    }
    if (!arming) {
      setArming(true);
      notify("⚠️ Primeira confirmação recebida. Clique NOVAMENTE para executar o WIPE TOTAL.", "warn");
      return;
    }
    setExecuting(true);
    await wipeAllData();
    setExecuting(false);
    setArming(false);
    setConfirmText("");
  };

  return (
    <div className="space-y-3">
      <Card className="border-l-4 border-[#ef5d65] space-y-3">
        <div className="font-pixel text-[9px] text-[#ef5d65]">⚠️ WIPE TOTAL DO SERVIDOR</div>
        <p className="text-xs leading-relaxed text-[#ffcf6b]">
          <b>IRREVERSÍVEL.</b> Apaga <b>todas as contas de jogadores</b> (inclusive administradores), zera carteiras,
          bancos, cartões de crédito, dívidas, transações, candidaturas, RGs registrados, chat e mensagens privadas.
          Também libera todas as propriedades e zera o saldo do Cofre Nacional.
        </p>
        <div className="grid gap-2 text-[11px] text-[#c9d6ee] sm:grid-cols-2">
          <div className="pixel-inset p-2"><b className="text-[#ef5d65]">SERÁ APAGADO/ZERADO:</b><br />users, transactions, treasury_ledger, applications, rg_registry, chat, dms, saldo do Cofre, donos de propriedades.</div>
          <div className="pixel-inset p-2"><b className="text-[#55e294]">SERÁ MANTIDO:</b><br />roupas cadastradas, loja, preços, organizações, mapa, objetos customizados, letreiros e logs de auditoria.</div>
        </div>
        <p className="text-[11px] text-[#ff9a90]">
          Após o Wipe, <b>todos os jogadores (incluindo você) precisam criar uma conta nova do zero</b> — o sistema
          faz logout automático ao concluir.
        </p>
        <div className="flex gap-2">
          <Input
            value={confirmText}
            onChange={(e) => { setConfirmText(e.target.value); setArming(false); }}
            placeholder="Digite WIPE para confirmar"
            className="flex-1"
          />
          <Btn tone="red" size="lg" disabled={executing} onClick={handleWipe}>
            {executing ? "Executando..." : arming ? "⚠️ Confirmar WIPE" : "💥 Executar WIPE"}
          </Btn>
        </div>
        {arming && <div className="border-l-2 border-[#ef5d65] pl-2 text-[10px] text-[#ff9a90]">⚠️ Última confirmação! Esta ação não pode ser desfeita.</div>}
      </Card>
    </div>
  );
}

function ShirtDesignCanvas({ color, initialImage, onChange }: { color: string; initialImage: string; onChange: (data: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const painting = useRef(false);
  const [brush, setBrush] = useState("#ffffff");
  const [size, setSize] = useState(4);
  const [eraser, setEraser] = useState(false);
  const [text, setText] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(11);
  const [status, setStatus] = useState("Tela transparente: pinte ou envie uma arte.");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!initialImage) {
      canvas.getContext("2d")?.clearRect(0, 0, 64, 64);
      return;
    }
    const image = new Image();
    image.onload = () => {
      const activeCanvas = canvasRef.current; if (!activeCanvas) return;
      const ctx = activeCanvas.getContext("2d")!;
      ctx.clearRect(0, 0, 64, 64);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, 0, 64, 64);
    };
    image.src = initialImage;
  }, [initialImage]);

  const emit = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  }, [onChange]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * canvas.width, y: ((e.clientY - r.top) / r.height) * canvas.height };
  };

  const dot = (e: React.PointerEvent<HTMLCanvasElement>, drag = false) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const p = point(e);
    ctx.save();
    ctx.globalCompositeOperation = eraser ? "destination-out" : "source-over";
    ctx.fillStyle = brush;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (!drag) emit();
  };

  const onUpload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const source = new Image();
      source.onload = () => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        const ratio = Math.min(48 / source.width, 48 / source.height);
        const w = Math.max(1, Math.round(source.width * ratio));
        const h = Math.max(1, Math.round(source.height * ratio));
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(source, (64 - w) / 2, (64 - h) / 2, w, h);
        emit(); setStatus("Imagem adaptada à área da camisa.");
      };
      source.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const addText = () => {
    if (!text.trim()) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${textSize}px monospace`;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(text.slice(0, 10), 33, 34);
    ctx.fillStyle = textColor;
    ctx.fillText(text.slice(0, 10), 32, 33);
    ctx.restore();
    emit(); setStatus("Texto aplicado no peito da camisa.");
  };

  return (
    <div className="space-y-2 border-t border-[#263759] pt-3">
      <Label>Ateliê de estampa — pintar, texto e imagem</Label>
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <div className="relative mx-auto h-[180px] w-[180px] overflow-hidden border-2 border-[#0a1024] bg-[radial-gradient(circle_at_50%_35%,#35557c_0%,#0a1024_70%)]">
          {/* molde visual, não é salvo: ajuda a posicionar a arte */}
          <div className="pointer-events-none absolute left-[36px] top-[30px] h-[118px] w-[108px] rounded-t-[34px] border border-dashed border-[#43dcff]/50" style={{ background: color, opacity: 0.38 }} />
          <canvas ref={canvasRef} width={64} height={64} className="absolute inset-0 h-full w-full cursor-crosshair" style={{ imageRendering: "pixelated" }} onPointerDown={(e) => { painting.current = true; e.currentTarget.setPointerCapture(e.pointerId); dot(e); }} onPointerMove={(e) => { if (painting.current) dot(e, true); }} onPointerUp={() => { if (painting.current) { painting.current = false; emit(); } }} />
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">{["#ffffff", "#111827", "#ef4444", "#facc15", "#22c55e", "#38bdf8", "#a855f7", "#f97316"].map((c) => <button key={c} onClick={() => { setBrush(c); setEraser(false); }} className={`h-7 w-7 border ${brush === c && !eraser ? "ring-2 ring-[#7ee0ff]" : "border-[#0a1024]"}`} style={{ background: c }} />)}<Btn tone={eraser ? "red" : "slate"} size="sm" onClick={() => setEraser((v) => !v)}>Borracha</Btn></div>
          <div className="flex gap-2 text-[10px] text-[#8fa3c8]">Pincel <input type="range" min="2" max="14" value={size} onChange={(e) => setSize(Number(e.target.value))} className="flex-1" /> {size}px</div>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => onUpload(e.target.files?.[0])} className="pixel-inset w-full px-2 py-2 text-[10px] text-[#e8eefb] file:mr-2 file:border-0 file:bg-[#3f7ad6] file:px-2 file:py-1 file:text-white" />
          <div className="grid grid-cols-[1fr_auto_auto] gap-1"><Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Texto na camisa" maxLength={10} /><input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-9 w-9" /><Btn tone="cyan" size="sm" onClick={addText}>Texto</Btn></div>
          <div className="flex items-center gap-2 text-[10px] text-[#8fa3c8]">Fonte <input type="range" min="7" max="22" value={textSize} onChange={(e) => setTextSize(Number(e.target.value))} className="flex-1" /> {textSize}px</div>
          <div className="flex gap-2"><Btn tone="slate" size="sm" full onClick={() => { const c = canvasRef.current; if (c) { c.getContext("2d")?.clearRect(0, 0, 64, 64); emit(); setStatus("Estampa limpa."); } }}>Limpar arte</Btn></div>
          <div className="text-[9px] text-[#55e294]">● {status}</div>
        </div>
      </div>
    </div>
  );
}

function OrgManager({
  players,
  orgConfigs,
  setLeader,
  adminSetOrgSalary,
  adminSetRecruitRank,
  adminSetUniform,
}: {
  players: PlayerData[];
  orgConfigs: Record<string, import("../game/types").OrgConfig>;
  setLeader: (jobId: string, uid: string | null) => Promise<void>;
  adminSetOrgSalary: (jobId: string, rankId: string, salario: number) => Promise<void>;
  adminSetRecruitRank: (jobId: string, rankIndex: number) => Promise<void>;
  adminSetUniform: (jobId: string, rankId: string, uniform: import("../game/types").Uniform) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const filtered = players.filter((p) => `${p.nome} ${p.rg ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-3">
      <Card className="border-l-4 border-[#7a4fb5] text-xs text-[#c9d6ee]">
        Defina líderes por nome ou RG e ajuste salários, fardas e permissão de recrutamento em tempo real.
      </Card>
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cidadão por nome ou RG..." />

      {JOBS.map((job) => {
        const leader = players.find((p) => p.emprego === job.id && p.isLeader);
        return (
          <Card key={job.id}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xl">{job.icone}</span>
              <span className="font-pixel text-[9px] text-white">{job.nome}</span>
              <span className="ml-auto text-[10px] text-[#ffd980]">
                {leader ? `Líder: ${leader.nome} (${leader.rg})` : "Sem líder nomeado"}
              </span>
            </div>

            <div className="mb-3 flex gap-2">
              <select
                value=""
                onChange={(e) => e.target.value && setLeader(job.id, e.target.value)}
                className="pixel-inset min-w-0 flex-1 px-2 py-2 text-xs text-[#e8eefb] outline-none"
              >
                <option value="">Nomear líder...</option>
                {filtered.map((p) => <option key={p.uid} value={p.uid}>{p.nome} · {p.rg}</option>)}
              </select>
              {leader && <Btn tone="red" size="sm" onClick={() => setLeader(job.id, null)}>Remover</Btn>}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {job.ranks.map((rank) => {
                const base = job.uniforme ?? { cor: job.cor };
                const uniform = orgConfigs[job.id]?.uniforms?.[rank.nome] ?? base;
                const salary = orgConfigs[job.id]?.salaries?.[rank.id] ?? rank.salario;
                return (
                  <div key={rank.id} className="pixel-inset p-2">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-[#c9d6ee]">
                      <span>{rank.nome} {rank.leader && "★"}</span>
                      <span className="text-[#5c6b8a]">salário / farda</span>
                    </div>
                    <input
                      type="number"
                      defaultValue={salary}
                      onBlur={(e) => Number(e.target.value) > 0 && adminSetOrgSalary(job.id, rank.id, Number(e.target.value))}
                      className="mb-2 w-full bg-transparent text-[12px] text-[#ffd980] outline-none"
                    />
                    <div className="flex items-center gap-2 text-[9px] text-[#8fa3c8]">
                      Roupa <input type="color" value={uniform.cor} onChange={(e) => adminSetUniform(job.id, rank.nome, { ...uniform, cor: e.target.value })} />
                      Colete <input type="color" value={uniform.colete ?? "#333333"} onChange={(e) => adminSetUniform(job.id, rank.nome, { ...uniform, colete: e.target.value })} />
                      Boina <input type="color" value={uniform.capacete ?? "#222222"} onChange={(e) => adminSetUniform(job.id, rank.nome, { ...uniform, capacete: e.target.value })} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#8fa3c8]">
              Recrutamento a partir de
              <select
                value={orgConfigs[job.id]?.recruitMinRankIndex ?? job.ranks.length - 1}
                onChange={(e) => adminSetRecruitRank(job.id, Number(e.target.value))}
                className="pixel-inset px-2 py-1.5 text-xs text-[#e8eefb] outline-none"
              >
                {job.ranks.map((rank, index) => <option key={rank.id} value={index}>{rank.nome}</option>)}
              </select>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
