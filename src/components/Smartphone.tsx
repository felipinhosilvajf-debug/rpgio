import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "../state/GameContext";
import { JOBS, getJob } from "../game/jobs";
import { PROPERTIES } from "../game/mapData";
import { Btn, Input, Label, money } from "./ui";

type AppId = "home" | "pix" | "services" | "jobs" | "gps" | "realestate" | "contacts" | "settings";

/* ────────── hook de arraste genérico ────────── */
function useDrag(initial: { x: number; y: number }) {
  const [pos, setPos] = useState(initial);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const onDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    dragging.current = true;
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    offset.current = { x: cx - pos.x, y: cy - pos.y };
  }, [pos]);

  useEffect(() => {
    const move = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const cx = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const cy = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      setPos({ x: cx - offset.current.x, y: cy - offset.current.y });
    };
    const up = () => { dragging.current = false; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, []);

  return { pos, onDown, isDragging: dragging };
}

/* ────────── componente principal ────────── */
export default function Smartphone({ onGoMe, onZoomIn, onZoomOut, onOpenChange }: {
  onGoMe: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const { player, transferByRG, sendChat, notify, applications, applyForJob } = useGame();
  const [open, setOpen] = useState(false);
  const [app, setApp] = useState<AppId>("home");
  const [rg, setRg] = useState("");
  const [amount, setAmount] = useState(500);

  // posição padrão do ícone: canto inferior direito, ao lado da hotbar
  const iconDrag = useDrag({
    x: typeof window !== "undefined" ? window.innerWidth - 68 : 700,
    y: typeof window !== "undefined" ? window.innerHeight - 68 : 500,
  });

  // posição padrão da janela: acima do ícone, canto inferior direito
  const windowDrag = useDrag({
    x: typeof window !== "undefined" ? window.innerWidth - 340 : 400,
    y: typeof window !== "undefined" ? window.innerHeight - 600 : 60,
  });

  // tecla M
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.key.toLowerCase() === "m") { e.preventDefault(); setOpen((v) => !v); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  useEffect(() => onOpenChange(open), [open, onOpenChange]);

  if (!player) return null;

  return (
    <>
      {/* ═══ ÍCONE DO CELULAR (arrastável) ═══ */}
      <div
        className="pointer-events-auto fixed z-30"
        style={{ left: iconDrag.pos.x, top: iconDrag.pos.y }}
      >
        <button
          onMouseDown={(e) => {
            // clique curto → toggle / arraste longo → mover
            const startX = e.clientX;
            const startY = e.clientY;
            const onUp = (ev: MouseEvent) => {
              window.removeEventListener("mouseup", onUp);
              if (Math.abs(ev.clientX - startX) < 5 && Math.abs(ev.clientY - startY) < 5) {
                setOpen((v) => !v);
              }
            };
            window.addEventListener("mouseup", onUp);
            iconDrag.onDown(e);
          }}
          onTouchStart={iconDrag.onDown}
          className="flex h-14 w-14 cursor-grab items-center justify-center rounded-2xl border-2 border-[#263b60] bg-gradient-to-br from-[#1a2e50] to-[#0e1a2e] text-2xl text-white shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_18px_rgba(67,220,255,0.3)] transition active:scale-95 active:cursor-grabbing"
          title="Celular SmartRP (M) · arraste para mover"
        >
          📱
        </button>
      </div>

      {/* ═══ JANELA DO SMARTPHONE (arrastável pela barra) ═══ */}
      <div
        className={`pointer-events-auto fixed z-50 w-[320px] transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        style={{ left: windowDrag.pos.x, top: windowDrag.pos.y }}
      >
        <div className="overflow-hidden rounded-[28px] border-[4px] border-[#0b0f18] bg-[#101827] shadow-[0_18px_60px_rgba(0,0,0,0.7),0_0_28px_rgba(67,220,255,0.15)]">
          {/* ── barra superior arrastável ── */}
          <div
            onMouseDown={windowDrag.onDown}
            onTouchStart={windowDrag.onDown}
            className="flex cursor-grab items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#141f35] to-[#0f1a2e] px-4 py-2 active:cursor-grabbing"
          >
            <span className="select-none text-[10px] text-[#9fb0ce]">SmartRP · {player.rg}</span>
            <div className="flex items-center gap-2">
              <span className="select-none text-[10px] text-[#52698e]">{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
              <button onClick={() => setOpen(false)} className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ef5d65] text-[10px] font-bold text-white hover:bg-[#ff7a7a]">✕</button>
            </div>
          </div>

          {/* ── conteúdo do telefone ── */}
          <div className="flex h-[480px] flex-col bg-gradient-to-br from-[#10233d] to-[#090e19]">
            <div className="scroll-thin flex-1 overflow-y-auto p-4">
              {app === "home" && <PhoneHome onOpen={setApp} />}
              {app === "pix" && <div className="space-y-3"><PhoneTitle title="Banco PIX" onBack={() => setApp("home")} /><div className="text-xs text-[#7184a8]">Saldo: <b className="text-[#55e294]">{money(player.saldoBanco)}</b></div><div><Label>RG de destino</Label><Input value={rg} onChange={(e) => setRg(e.target.value.toUpperCase())} placeholder="RG-12345" /></div><div><Label>Valor</Label><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div><Btn tone="green" full onClick={() => transferByRG(rg, amount)}>Enviar PIX</Btn></div>}
              {app === "services" && <div className="space-y-3"><PhoneTitle title="Emergência" onBack={() => setApp("home")} />{[["Polícia", "policia"], ["Ambulância", "hospital"], ["Exército", "exercito"]].map(([name, id]) => <button key={id} onClick={() => { sendChat(`[EMERGÊNCIA] Solicito ${name} na minha localização.`); notify(`Chamado enviado para ${name}.`, "ok"); }} className="pixel-inset flex w-full items-center gap-3 p-3 text-left"><span className="text-xl">{getJob(id)?.icone}</span><span className="text-sm text-white">Chamar {name}</span></button>)}</div>}
              {app === "jobs" && <div className="space-y-3"><PhoneTitle title="Empregos" onBack={() => setApp("home")} />{JOBS.map((job) => { const pending = (applications ?? []).some((a) => a.userId === player.uid && a.organizationId === job.id && a.status === "pending"); return <div key={job.id} className="pixel-inset p-3"><div className="flex items-center gap-2"><span>{job.icone}</span><span className="text-xs text-white">{job.nome}</span></div><Btn tone={pending ? "gold" : "green"} size="sm" full className="mt-2" disabled={pending || player.emprego !== "desempregado"} onClick={() => applyForJob(job.id)}>{pending ? "Em análise" : "Candidatar"}</Btn></div>; })}</div>}
              {app === "gps" && <div className="space-y-3"><PhoneTitle title="GPS" onBack={() => setApp("home")} />{[["Quartel General", "norte da avenida central"], ["Hospital", "zona sul"], ["Mercado", "centro comercial"], ["Banco", "praça central"]].map(([name, area]) => <button key={name} onClick={() => notify(`Rota marcada: ${name}, ${area}.`, "info")} className="pixel-inset w-full p-3 text-left"><div className="text-xs text-white">📍 {name}</div><div className="mt-1 text-[10px] text-[#7184a8]">{area}</div></button>)}</div>}
              {app === "realestate" && <RealEstateApp onBack={() => setApp("home")} />}
              {app === "contacts" && <ContactsApp onBack={() => setApp("home")} />}
              {app === "settings" && <div className="space-y-3"><PhoneTitle title="Ajustes" onBack={() => setApp("home")} /><div className="grid grid-cols-2 gap-2"><Btn tone="slate" onClick={onZoomOut}>Zoom −</Btn><Btn tone="slate" onClick={onZoomIn}>Zoom +</Btn></div><Btn tone="gold" full onClick={onGoMe}>Voltar ao painel /me</Btn></div>}
            </div>
            {/* botão home do smartphone */}
            <button onClick={() => app === "home" ? setOpen(false) : setApp("home")} className="mx-auto mb-2 h-1.5 w-20 rounded-full bg-[#52627c] transition hover:bg-[#7080a0]" />
          </div>
        </div>
      </div>
    </>
  );
}

/* ────────── sub-componentes (inalterados) ────────── */

function PhoneHome({ onOpen }: { onOpen: (id: AppId) => void }) {
  const apps: [AppId, string, string][] = [["pix", "💸", "Banco PIX"], ["contacts", "💬", "Contatos"], ["services", "🚨", "Emergência"], ["jobs", "💼", "Empregos"], ["realestate", "🏠", "Imobiliária"], ["gps", "📍", "GPS"], ["settings", "⚙", "Ajustes"]];
  return (
    <div>
      <div className="mb-5">
        <div className="text-[10px] text-[#7184a8]">Bem-vindo ao</div>
        <div className="font-pixel mt-1 text-[11px] text-white">SmartRP</div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {apps.map(([id, icon, name]) => (
          <button key={id} onClick={() => onOpen(id)} className="flex flex-col items-center gap-2 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#19304f] text-2xl shadow-lg transition hover:scale-105 hover:border-[#43dcff]/40">{icon}</span>
            <span className="text-[9px] text-[#c0cbe0]">{name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PhoneTitle({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <button onClick={onBack} className="text-lg text-[#43dcff] transition hover:text-white">‹</button>
      <div className="font-pixel text-[9px] text-white">{title}</div>
    </div>
  );
}

/* ────────── IMOBILIÁRIA + GUIA GPS ────────── */
function RealEstateApp({ onBack }: { onBack: () => void }) {
  const { player, properties, patch, buyProperty } = useGame();
  const [tab, setTab] = useState<"available" | "sold" | "mine">("available");
  const [credit, setCredit] = useState(false);
  if (!player) return null;

  const entries = Object.entries(PROPERTIES);
  const filtered = entries.filter(([, definition]) => {
    const property = properties[definition.id];
    if (tab === "available") return !property?.ownerUid;
    if (tab === "mine") return property?.ownerUid === player.uid;
    return Boolean(property?.ownerUid);
  });

  const guide = (key: string, name: string) => {
    const [x, y] = key.split("_").map(Number);
    patch({ gpsTarget: { x: x * 16 + 8, y: y * 16 + 8, label: name } });
  };

  return (
    <div className="space-y-3">
      <PhoneTitle title="Imobiliária" onBack={onBack} />
      <div className="grid grid-cols-3 gap-1">
        <button onClick={() => setTab("available")} className={`px-1 py-1.5 text-[9px] ${tab === "available" ? "bg-[#1c6b47] text-white" : "bg-[#16243a] text-[#8fa3c8]"}`}>Disponíveis</button>
        <button onClick={() => setTab("sold")} className={`px-1 py-1.5 text-[9px] ${tab === "sold" ? "bg-[#7a4b2a] text-white" : "bg-[#16243a] text-[#8fa3c8]"}`}>Vendidas</button>
        <button onClick={() => setTab("mine")} className={`px-1 py-1.5 text-[9px] ${tab === "mine" ? "bg-[#3469a8] text-white" : "bg-[#16243a] text-[#8fa3c8]"}`}>Minhas</button>
      </div>
      {tab === "available" && (
        <label className="flex items-center gap-2 text-[9px] text-[#8fa3c8]"><input type="checkbox" checked={credit} onChange={(e) => setCredit(e.target.checked)} className="accent-[#43dcff]" /> Comprar no crédito (+2%)</label>
      )}
      <div className="space-y-2">
        {filtered.length === 0 && <div className="pixel-inset p-3 text-center text-[10px] text-[#52698e]">Nenhum imóvel nesta categoria.</div>}
        {filtered.map(([key, definition]) => {
          const property = properties[definition.id];
          const mine = property?.ownerUid === player.uid;
          return (
            <div key={definition.id} className="pixel-inset p-3">
              <div className="flex items-start gap-2">
                <span className="text-xl">🏠</span>
                <div className="min-w-0 flex-1"><div className="font-pixel truncate text-[8px] text-white">{definition.nome}</div><div className="mt-1 text-[9px] text-[#7184a8]">{definition.quartos} quartos · lote {key}</div><div className="mt-1 font-bold text-[#ffd65a]">{money(property?.preco ?? definition.preco)}</div></div>
              </div>
              {property?.ownerUid ? (
                <div className="mt-2 text-[9px] text-[#c9d6ee]">Proprietário: <b className={mine ? "text-[#43dcff]" : "text-[#ffd65a]"}>{property.ownerNome ?? "Não informado"}</b> · {property.locked ? "🔒" : "🔓"}</div>
              ) : (
                <div className="mt-2 text-[9px] text-[#55e294]">● Disponível para compra</div>
              )}
              <div className="mt-2 grid grid-cols-2 gap-1">
                <Btn tone="cyan" size="sm" full onClick={() => guide(key, definition.nome)}>📍 Guiar</Btn>
                {!property?.ownerUid && <Btn tone={credit ? "purple" : "green"} size="sm" full onClick={() => buyProperty(key, credit)}>{credit ? "💳 Comprar" : "Comprar"}</Btn>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ────────── CONTATOS + MENSAGENS PRIVADAS ────────── */
function ContactsApp({ onBack }: { onBack: () => void }) {
  const { player, directory, dms, addFriendByRG, removeFriend, sendDM } = useGame();
  const [rg, setRg] = useState("");
  const [chatWith, setChatWith] = useState<string | null>(null);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [dms, chatWith]);
  if (!player) return null;

  const friends = (player.amigos ?? []).map((uid) => directory.find((d) => d.uid === uid)).filter(Boolean) as NonNullable<ReturnType<typeof directory.find>>[];

  if (chatWith) {
    const friend = directory.find((d) => d.uid === chatWith);
    const thread = dms.filter((m) => m.participants.includes(chatWith));
    return (
      <div className="flex h-full flex-col">
        <PhoneTitle title={friend?.nome ?? "Conversa"} onBack={() => setChatWith(null)} />
        <div className="scroll-thin flex-1 space-y-2 overflow-y-auto pb-2">
          {thread.length === 0 && <div className="text-center text-[10px] text-[#52698e]">Envie a primeira mensagem 👋</div>}
          {thread.map((m) => (
            <div key={m.id} className={`max-w-[85%] rounded px-2.5 py-1.5 text-[11px] ${m.from === player.uid ? "ml-auto bg-[#1c4a72] text-white" : "bg-[#1a2439] text-[#c9d6ee]"}`}>
              {m.text}
              <div className="mt-0.5 text-right text-[8px] text-[#7184a8]">{new Date(m.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form className="mt-2 flex gap-1" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { sendDM(chatWith, text); setText(""); } }}>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder="Mensagem..." className="pixel-inset min-w-0 flex-1 px-2 py-2 text-[11px] text-white outline-none" />
          <Btn tone="cyan" size="sm" type="submit">▶</Btn>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PhoneTitle title="Contatos" onBack={onBack} />
      <div className="flex gap-1">
        <Input value={rg} onChange={(e) => setRg(e.target.value.toUpperCase())} placeholder="Adicionar por RG-12345" />
        <Btn tone="green" size="sm" onClick={() => { addFriendByRG(rg); setRg(""); }}>+</Btn>
      </div>
      {friends.length === 0 && <div className="pixel-inset p-3 text-center text-[10px] text-[#7184a8]">Nenhum contato. Adicione pelo RG.</div>}
      {friends.map((f) => {
        const unread = dms.filter((m) => m.from === f.uid).length;
        return (
          <div key={f.uid} className="pixel-inset flex items-center gap-2 p-2">
            <div className="h-3 w-3 border border-[#0a1024]" style={{ background: f.cor }} />
            <button onClick={() => setChatWith(f.uid)} className="min-w-0 flex-1 text-left">
              <div className="truncate text-[11px] text-white">{f.nome}</div>
              <div className="text-[9px] text-[#7184a8]">{f.rg} {unread > 0 && `· ${unread} msg`}</div>
            </button>
            <Btn tone="cyan" size="sm" onClick={() => setChatWith(f.uid)}>💬</Btn>
            <Btn tone="red" size="sm" onClick={() => removeFriend(f.uid)}>✕</Btn>
          </div>
        );
      })}
    </div>
  );
}
