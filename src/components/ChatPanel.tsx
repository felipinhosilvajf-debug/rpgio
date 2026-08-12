import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../state/GameContext";
import { SIGLAS } from "../game/jobs";

export default function ChatPanel({ onFocus }: { onFocus: (focused: boolean) => void }) {
  const { chat, sendChat, player, offline, others, directory } = useGame();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const roster = useMemo(() => {
    const map: Record<string, { emprego?: string; cor?: string }> = {};
    for (const p of [...directory, ...others]) map[p.uid] = { emprego: p.emprego, cor: p.cor };
    if (player) map[player.uid] = { emprego: player.emprego, cor: player.cor };
    return map;
  }, [directory, others, player]);

  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [chat, open]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter" && document.activeElement !== inputRef.current) {
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 30);
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) inputRef.current?.blur();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendChat(text);
    setText("");
  };

  return (
    <div className="pointer-events-auto w-[340px] max-w-[80vw]">
      {open ? (
        <div className="hud-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[#1a2740] bg-gradient-to-r from-[#0f1a30] to-[#152441] px-3 py-1.5">
            <span className="text-sm">💬</span>
            <span className="font-pixel flex-1 text-[8px] text-[#c9d6ee]">CHAT DA CIDADE</span>
            {offline && <span className="border border-[#8a4a1c] bg-[#c07c2a] px-1.5 py-0.5 font-pixel text-[6px] text-white">LOCAL</span>}
            <button onClick={() => setOpen(false)} className="pixel-btn bg-[#3a4763] px-1.5 py-0.5 font-pixel text-[7px] text-white">_</button>
          </div>
          <div ref={listRef} className="scroll-thin h-[152px] space-y-1.5 overflow-y-auto bg-gradient-to-b from-[#0a1120] to-[#0b1526] p-2.5">
            {chat.length === 0 && <div className="text-[11px] italic text-[#5c6b8a]">Pressione Enter e diga olá para a cidade! 👋</div>}
            {chat.map((m) => {
              const meta = roster[m.uid];
              const sigla = meta?.emprego ? SIGLAS[meta.emprego] : null;
              const isSelf = m.uid === player?.uid;
              return (
                <div key={m.id} className="chat-bubble text-[12px] leading-snug">
                  {sigla && <span className="mr-1 border border-[#0a1024] bg-[#3a5a8f] px-1 font-pixel text-[7px] text-white">{sigla}</span>}
                  <span className={isSelf ? "font-bold text-[#43dcff] drop-shadow-[0_0_4px_rgba(67,220,255,0.35)]" : "font-bold"} style={!isSelf ? { color: meta?.cor ?? "#ffd980" } : undefined}>{m.nome}</span>
                  {m.patente && m.patente !== "Civil" && <span className="text-[10px] text-[#8fa3c8]"> · {m.patente}</span>}
                  <span className="text-[#c9d6ee]">: {m.text}</span>
                </div>
              );
            })}
          </div>
          <form onSubmit={submit} className="flex gap-1 border-t border-[#1a2740] bg-[#0d1727] p-1.5">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => onFocus(true)}
              onBlur={() => onFocus(false)}
              maxLength={120}
              placeholder="Digite e pressione Enter..."
              className="hud-inset flex-1 px-2.5 py-1.5 text-[12px] text-[#e8eefb] outline-none placeholder:text-[#3a4d70]"
            />
            <button type="submit" className="pixel-btn bg-gradient-to-r from-[#43dcff] to-[#3178c8] px-3 font-pixel text-[8px] text-white shadow-[0_0_10px_rgba(67,220,255,0.4)]">▶</button>
          </form>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="pixel-btn bg-gradient-to-r from-[#16233f] to-[#1c2f4e] px-3 py-2 font-pixel text-[8px] text-[#c9d6ee] shadow-[0_0_10px_rgba(67,220,255,0.2)]">💬 CHAT</button>
      )}
    </div>
  );
}
