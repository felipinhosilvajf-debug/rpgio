import { useRef, useState } from "react";
import { GROUND_DEFS, GROUND_PALETTE, OBJECT_PALETTE, OBJ_DEFS, PREFABS } from "../game/mapData";
import { OBJ_ICON, brushName, type Brush } from "../game/editor";
import { useGame } from "../state/GameContext";
import { Btn, Input, Label } from "./ui";
import { decodeSign } from "../game/types";
import type { SceneId } from "../game/types";

export default function EditorPanel({
  scene,
  brush,
  setBrush,
  onClear,
  onClose,
  edits,
  online,
}: {
  scene: SceneId;
  brush: Brush;
  setBrush: (b: Brush) => void;
  onClear: () => void;
  onClose: () => void;
  edits: number;
  online: boolean;
}) {
  const { customObjects, addCustomObject, deleteCustomObject, placeSign, removeSign, signs, notify } = useGame();
  const [tab, setTab] = useState<"construcoes" | "terreno" | "objetos" | "custom" | "letreiro">("construcoes");
  // estado de upload
  const [nome, setNome] = useState("");
  const [lw, setLw] = useState("1");
  const [lh, setLh] = useState("1");
  const [preco, setPreco] = useState("0");
  const [sellable, setSellable] = useState(false);
  const [img, setImg] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  // letreiro
  const [signText, setSignText] = useState("");
  const [signSize, setSignSize] = useState(7);
  const [signColor, setSignColor] = useState("#fff6d8");
  const [signBg, setSignBg] = useState("#0c1020");
  const [signW, setSignW] = useState(1);
  const [signH, setSignH] = useState(1);
  const [selectedSign, setSelectedSign] = useState<string | null>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return notify("Envie uma imagem PNG/JPG.", "bad");
    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result);
      const picture = new Image();
      picture.onload = () => {
        const scale = Math.min(1, 256 / Math.max(picture.width, picture.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(picture.width * scale));
        canvas.height = Math.max(1, Math.round(picture.height * scale));
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(picture, 0, 0, canvas.width, canvas.height);
        setImg(canvas.toDataURL("image/png"));
      };
      picture.src = source;
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = () => {
    if (!img) return notify("Selecione uma imagem primeiro.", "warn");
    addCustomObject(nome, img, Number(lw) || 1, Number(lh) || 1, Number(preco) || 0, sellable);
    setNome(""); setImg(""); setPreco("0");
    if (fileRef.current) fileRef.current.value = "";
  };

  const sceneSigns = signs[scene] ?? {};
  const signKeys = Object.keys(sceneSigns);

  const useSignBrush = () => setBrush({ type: "sign", text: signText, size: signSize, color: signColor, bg: signBg, w: signW, h: signH });
  const moveSign = async (dx: number, dy: number) => {
    if (!selectedSign) return;
    const raw = sceneSigns[selectedSign];
    if (!raw) return;
    const [xs, ys] = selectedSign.split("_");
    const x = Number(xs); const y = Number(ys);
    const nx = Math.max(0, x + dx); const ny = Math.max(0, y + dy);
    await removeSign(scene, x, y);
    await placeSign(scene, nx, ny, raw);
    setSelectedSign(`${nx}_${ny}`);
  };

  return (
    <div className="pixel-panel pointer-events-auto absolute right-3 top-20 bottom-3 z-30 flex w-[320px] flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b-[3px] border-[#0a1024] bg-gradient-to-b from-[#7a4fb5] to-[#5c3a8c] px-3 py-2.5">
        <span className="text-lg">🛠️</span>
        <div className="flex-1">
          <div className="font-pixel text-[9px] uppercase text-white">Modo Editor</div>
          <div className="text-[10px] text-[#d9c9f5]">Cena: {scene}</div>
        </div>
        <button onClick={onClose} className="pixel-btn bg-[#c4483f] px-2 py-1 font-pixel text-[8px] text-white">X</button>
      </div>

      <div className="border-b-2 border-[#0a1024] bg-[#101a30] p-2">
        <div className="pixel-inset flex items-center gap-2 p-2">
          <span className="text-lg">
            {brush.type === "prefab" ? PREFABS.find((p) => p.id === brush.id)?.icone
              : brush.type === "custom" ? "🖼️"
              : brush.type === "sign" ? "🪧"
              : brush.type === "object" ? OBJ_ICON[brush.id] ?? "❔"
              : brush.type === "erase" ? "🧽" : "🎨"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-pixel text-[7px] text-[#8fa3c8]">PINCEL ATUAL</div>
            <div className="truncate text-[11px] text-white">{brushName(brush, customObjects)}</div>
          </div>
          {brush.type === "ground" && <div className="h-6 w-6 border-2 border-[#0a1024]" style={{ background: GROUND_DEFS[brush.id]?.cor }} />}
        </div>
      </div>

      <div className="flex gap-1 border-b-2 border-[#0a1024] bg-[#0f172b] p-2">
        {(["construcoes", "terreno", "objetos", "custom", "letreiro"] as const).map((id) => (
          <Btn key={id} tone={tab === id ? "purple" : "slate"} size="sm" onClick={() => setTab(id)} className="!px-1 !py-1.5 !text-[7px]">
            {id === "construcoes" ? "Prédios" : id === "terreno" ? "Chão" : id === "objetos" ? "Objetos" : id === "custom" ? "🖼️ Custom" : "🪧 Letreiro"}
          </Btn>
        ))}
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto p-2">
        {tab === "construcoes" && (
          <div className="space-y-1.5">
            {PREFABS.map((p) => {
              const active = brush.type === "prefab" && brush.id === p.id;
              return (
                <button key={p.id} onClick={() => setBrush({ type: "prefab", id: p.id })}
                  className={`pixel-inset flex w-full items-center gap-2 p-2 text-left transition ${active ? "ring-2 ring-[#7ee0ff]" : "hover:brightness-125"}`}>
                  <span className="text-xl">{p.icone}</span>
                  <div className="flex-1"><div className="text-[12px] text-white">{p.nome}</div><div className="text-[10px] text-[#8fa3c8]">{p.w}×{p.h} tiles</div></div>
                </button>
              );
            })}
          </div>
        )}

        {tab === "terreno" && (
          <div className="grid grid-cols-4 gap-1.5">
            {GROUND_PALETTE.map((id) => {
              const d = GROUND_DEFS[id];
              const active = brush.type === "ground" && brush.id === id;
              return (
                <button key={id} title={d.nome} onClick={() => setBrush({ type: "ground", id })}
                  className={`pixel-btn h-14 w-full ${active ? "ring-2 ring-[#7ee0ff]" : ""}`} style={{ background: d.cor }}>
                  <span className="block truncate px-0.5 text-[7px] font-bold text-black/70">{d.nome}</span>
                </button>
              );
            })}
          </div>
        )}

        {tab === "objetos" && (
          <div className="grid grid-cols-4 gap-1.5">
            {OBJECT_PALETTE.map((id) => {
              const active = brush.type === "object" && brush.id === id;
              return (
                <button key={id} title={id === 0 ? "Nenhum (limpar)" : OBJ_DEFS[id]?.nome} onClick={() => setBrush({ type: "object", id })}
                  className={`pixel-inset flex h-12 items-center justify-center text-xl transition hover:brightness-125 ${active ? "ring-2 ring-[#7ee0ff]" : ""}`}>
                  {OBJ_ICON[id] ?? "❔"}
                </button>
              );
            })}
          </div>
        )}

        {tab === "custom" && (
          <div className="space-y-3">
            <Card2>
              <div className="font-pixel mb-2 text-[8px] text-[#7ee0ff]">🖼️ NOVO OBJETO CUSTOMIZADO</div>
              <Label>Imagem (PNG/JPG)</Label>
              <input ref={fileRef} type="file" accept="image/*" onChange={onFile}
                className="pixel-inset w-full px-2 py-2 text-[10px] text-[#e8eefb] file:mr-2 file:bg-[#3f7ad6] file:px-2 file:py-1 file:border-0 file:text-[10px] file:text-white" />
              {img && <div className="mt-1 pixel-inset flex h-16 items-center justify-center p-1"><img src={img} alt="prev" className="max-h-full max-w-full" style={{ imageRendering: "pixelated" }} /></div>}
              <div className="mt-2 space-y-2">
                <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Estátua, Carro" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Largura (tiles)</Label><Input type="number" value={lw} onChange={(e) => setLw(e.target.value)} /></div>
                  <div><Label>Altura (tiles)</Label><Input type="number" value={lh} onChange={(e) => setLh(e.target.value)} /></div>
                </div>
                <div><Label>Preço na loja (R$)</Label><Input type="number" value={preco} onChange={(e) => setPreco(e.target.value)} /></div>
                <label className="flex items-center gap-2 text-[11px] text-[#c9d6ee]">
                  <input type="checkbox" checked={sellable} onChange={(e) => setSellable(e.target.checked)} className="h-4 w-4 accent-[#3f7ad6]" />
                  Colocar à venda para os jogadores
                </label>
                <Btn tone="purple" size="sm" full onClick={handleAdd} disabled={!img || !nome.trim()}>💾 Criar objeto</Btn>
              </div>
            </Card2>

            <div className="font-pixel text-[8px] text-[#8fa3c8]">OBJETOS CUSTOMIZADOS ({customObjects.length})</div>
            {customObjects.length === 0 && <div className="text-[11px] text-[#5c6b8a]">Nenhum objeto criado ainda.</div>}
            <div className="space-y-1.5">
              {customObjects.map((o) => {
                const active = brush.type === "custom" && brush.objId === o.objId;
                return (
                  <div key={o.id} className={`pixel-inset flex items-center gap-2 p-1.5 ${active ? "ring-2 ring-[#7ee0ff]" : ""}`}>
                    <img src={o.image} alt={o.nome} className="h-8 w-8 border border-[#0a1024]" style={{ imageRendering: "pixelated" }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] text-white">{o.nome}</div>
                      <div className="text-[9px] text-[#8fa3c8]">{o.w}×{o.h} · {o.preco > 0 ? `R$ ${o.preco.toLocaleString("pt-BR")}` : "Decor"}</div>
                    </div>
                    <Btn tone="cyan" size="sm" onClick={() => setBrush({ type: "custom", objId: o.objId })}>Usar</Btn>
                    <Btn tone="red" size="sm" onClick={() => deleteCustomObject(o.id)}>🗑</Btn>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "letreiro" && (
          <div className="space-y-3">
            <Card2>
              <div className="font-pixel mb-2 text-[8px] text-[#7ee0ff]">🪧 ADICIONAR LETREIRO / TEXTO</div>
              <Label>Texto do letreiro</Label>
              <Input value={signText} onChange={(e) => setSignText(e.target.value)} placeholder="Ex: POLÍCIA CIVIL" maxLength={32} />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div><Label>Cor do texto</Label><input type="color" value={signColor} onChange={(e) => setSignColor(e.target.value)} className="pixel-inset h-9 w-full" /></div>
                <div><Label>Cor de fundo</Label><input type="color" value={signBg} onChange={(e) => setSignBg(e.target.value)} className="pixel-inset h-9 w-full" /></div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div><Label>Fonte: {signSize}px</Label><div className="flex gap-1"><Btn tone="slate" size="sm" full onClick={() => setSignSize((v) => Math.max(5, v - 1))}>A-</Btn><Btn tone="cyan" size="sm" full onClick={() => setSignSize((v) => Math.min(16, v + 1))}>A+</Btn></div></div>
                <div><Label>Largura / Altura</Label><div className="flex gap-1"><Btn tone="slate" size="sm" onClick={() => setSignW((v) => Math.max(0.6, +(v - 0.2).toFixed(1)))}>W-</Btn><Btn tone="cyan" size="sm" onClick={() => setSignW((v) => Math.min(3, +(v + 0.2).toFixed(1)))}>W+</Btn><Btn tone="cyan" size="sm" onClick={() => setSignH((v) => Math.min(2.5, +(v + 0.2).toFixed(1)))}>H+</Btn></div></div>
              </div>
              <Btn tone="purple" size="sm" full className="mt-2" disabled={!signText.trim()} onClick={useSignBrush}>
                ✍️ Usar pincel de letreiro
              </Btn>
              <p className="mt-1 text-[10px] text-[#5c6b8a]">Selecione o pincel e clique sobre um prédio para posicionar o letreiro.</p>
              {brush.type === "sign" && (
                <Btn tone="slate" size="sm" full className="mt-1" onClick={() => setBrush({ type: "sign", text: "" })}>Limpar letreiro</Btn>
              )}
            </Card2>
            <div className="font-pixel text-[8px] text-[#8fa3c8]">LETREIROS NA CENA ({signKeys.length})</div>
            {signKeys.length === 0 && <div className="text-[11px] text-[#5c6b8a]">Nenhum letreiro nesta cena.</div>}
            <div className="space-y-1.5">
              {signKeys.map((k) => (
                <div key={k} onClick={() => setSelectedSign(k)} className={`pixel-inset flex cursor-pointer items-center gap-2 p-1.5 ${selectedSign === k ? "ring-2 ring-[#7ee0ff]" : ""}`}>
                  <span className="text-sm">🪧</span>
                  <div className="min-w-0 flex-1"><div className="truncate text-[11px] text-[#ffd980]">{decodeSign(sceneSigns[k]).text}</div><div className="text-[9px] text-[#5c6b8a]">tile {k}</div></div>
                  <Btn tone="red" size="sm" onClick={() => { const [x, y] = k.split("_"); removeSign(scene, Number(x), Number(y)); }}>🗑</Btn>
                </div>
              ))}
            </div>
            {selectedSign && (
              <Card2>
                <Label>Alinhamento preciso</Label>
                <div className="grid grid-cols-3 gap-1">
                  <span /><Btn tone="slate" size="sm" onClick={() => moveSign(0, -1)}>↑</Btn><span />
                  <Btn tone="slate" size="sm" onClick={() => moveSign(-1, 0)}>←</Btn><span className="flex items-center justify-center text-[8px] text-[#5c6b8a]">{selectedSign}</span><Btn tone="slate" size="sm" onClick={() => moveSign(1, 0)}>→</Btn>
                  <span /><Btn tone="slate" size="sm" onClick={() => moveSign(0, 1)}>↓</Btn><span />
                </div>
              </Card2>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2 border-t-[3px] border-[#0a1024] bg-[#101a30] p-2">
        <div className="flex gap-1.5">
          <Btn tone={brush.type === "erase" ? "red" : "slate"} size="sm" full onClick={() => setBrush({ type: "erase" })}>🧽 Borracha</Btn>
          <Btn tone="red" size="sm" full onClick={onClear}>♻ Resetar</Btn>
        </div>
        <div className="text-[10px] leading-relaxed text-[#8fa3c8]">
          Clique no mapa para construir · <b className="text-[#c9d6ee]">Shift+clique</b> ou botão direito apaga.
          <br />{online ? <span className="text-[#59e08a]">☁ {edits} células · tempo real</span> : <span className="text-[#ffcf6b]">💾 {edits} células locais</span>}
        </div>
      </div>
    </div>
  );
}

function Card2({ children }: { children: React.ReactNode }) {
  return <div className="pixel-inset p-2.5">{children}</div>;
}
