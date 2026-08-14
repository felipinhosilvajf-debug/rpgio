import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameProvider, useGame } from "./state/GameContext";
import { GameEngine, type RemotePlayer } from "./game/engine";
import { BASE_SCENES, TILE, applyEdits, getProperty } from "./game/mapData";
import { brushCells, brushSize, type Brush } from "./game/editor";
import { getUniform } from "./game/jobs";
import { encodeSign } from "./game/types";
import type { Dir, InteractTarget, MapEditCells, SceneId } from "./game/types";
import AuthScreen from "./components/AuthScreen";
import HUD, { HelpModal, SettingsModal, ProfileModal, AdminModal, type ModalId } from "./components/HUD";
import ChatPanel from "./components/ChatPanel";
import EditorPanel from "./components/EditorPanel";
import Hotbar from "./components/Hotbar";
import HouseMenu from "./components/HouseMenu";
import JobsModal from "./components/modals/JobsModal";
import ShopModal from "./components/modals/ShopModal";
import BankModal from "./components/modals/BankModal";
import PropertyModal from "./components/modals/PropertyModal";
import MePage from "./components/MePage";
import Smartphone from "./components/Smartphone";
import TutorialOverlay from "./components/TutorialOverlay";
import { Btn } from "./components/ui";

function Loading() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#0a0f1c]">
      <div className="font-pixel animate-pulse text-[15px] text-[#ffd980]">PIXELCITY</div>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-3 w-3 animate-bounce bg-[#3f7ad6]" style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
      <div className="font-pixel text-[8px] text-[#5c6b8a]">CONECTANDO AO SERVIDOR...</div>
    </div>
  );
}

function BannedScreen() {
  const { player, logout } = useGame();
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#1a0a0a] p-6 text-center">
      <div className="text-5xl">🚫</div>
      <div className="font-pixel text-[15px] text-[#ff9a90]">CONTA BANIDA</div>
      <p className="max-w-md text-sm text-[#c9d6ee]">Sua conta foi banida por um administrador de PixelCity.</p>
      {player?.banMotivo && <p className="pixel-inset px-3 py-2 text-xs text-[#ffcf6b]">Motivo: {player.banMotivo}</p>}
      <Btn tone="slate" onClick={logout}>Sair</Btn>
    </div>
  );
}

function Game({ onGoMe }: { onGoMe: () => void }) {
  const game = useGame();
  const { player, others, edits, saveMapCells, clearMapEdits, changeScene, syncPosition, patch, notify, addXp, offline, customObjects, signs, placeSign, removeSign, orgConfigs } = game;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [scene, setScene] = useState<SceneId>(player?.scene ?? "city");
  const [target, setTarget] = useState<InteractTarget | null>(null);
  const [modal, setModal] = useState<ModalId>(null);
  const [propKey, setPropKey] = useState("46_14");
  const [jobsTab, setJobsTab] = useState<"meu" | "vagas" | "comando">("meu");
  const [chatFocused, setChatFocused] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const tutorialInitialized = useRef(false);
  const [editorOn, setEditorOn] = useState(false);
  const [brush, setBrush] = useState<Brush>({ type: "prefab", id: "casa" });
  const [localCells, setLocalCells] = useState<Partial<Record<SceneId, MapEditCells>>>({});

  const returnPos = useRef<{ x: number; y: number }>({ x: 32 * TILE + 8, y: 19 * TILE + 8 });
  const currentHouse = useRef<string | null>(player?.currentHouseId || null);
  const lastTrain = useRef(0);
  const pending = useRef<MapEditCells>({});
  const flushT = useRef<number | null>(null);
  const handlers = useRef({
    onTarget: (_t: InteractTarget | null): void => undefined,
    onInteract: (_t: InteractTarget | null): void => undefined,
    onMove: (_x: number, _y: number, _d: Dir, _m: boolean): void => undefined,
    onPaint: (_x: number, _y: number, _e: boolean): void => undefined,
  });

  const sceneData = useMemo(() => {
    const base = applyEdits(BASE_SCENES[scene], edits[scene]);
    const withLocal = applyEdits(base, localCells[scene]);
    // mobília da casa atual (por imóvel, salva no documento da propriedade)
    if (scene === "house" && currentHouse.current) {
      const furniture = game.properties[currentHouse.current]?.furniture;
      if (furniture && Object.keys(furniture).length) return applyEdits(withLocal, furniture);
    }
    return withLocal;
  }, [scene, edits, localCells, game.properties]);
  const sceneRef = useRef(sceneData);
  useEffect(() => { sceneRef.current = sceneData; }, [sceneData]);
  useEffect(() => {
    if (player && !tutorialInitialized.current) {
      tutorialInitialized.current = true;
      setTutorialOpen(!player.tutorialDone);
    }
  }, [player]);

  const goTo = useCallback((dest: SceneId, x?: number, y?: number) => {
    const t = BASE_SCENES[dest]; const px = x ?? t.spawn.x; const py = y ?? t.spawn.y;
    setScene(dest); changeScene(dest, px, py);
    engineRef.current?.setScene(applyEdits(BASE_SCENES[dest], edits[dest]), { x: px, y: py });
    engineRef.current?.teleport(px, py);
  }, [changeScene, edits]);

  const doInteract = useCallback((t: InteractTarget | null) => {
    if (!t || !player) return;
    switch (t.kind) {
      case "barracks":
        returnPos.current = { x: t.x * TILE + 8, y: (t.y + 1) * TILE + 10 };
        goTo("barracks"); notify("🎖️ Você entrou no Quartel.", "ok"); break;
      case "clothing":
        returnPos.current = { x: t.x * TILE + 8, y: (t.y + 1) * TILE + 10 };
        goTo("clothing"); notify("👕 Bem-vindo à Loja de Roupas!", "ok"); break;
      case "hospital_in":
        returnPos.current = { x: t.x * TILE + 8, y: (t.y + 1) * TILE + 10 };
        goTo("hospital"); notify("🏥 Você entrou no Hospital Central.", "ok"); break;
      case "house": {
        const def = getProperty(t.x, t.y);
        const docProp = game.properties[def.id];
        const meu = player.propriedadesCompradas?.includes(def.id) || docProp?.ownerUid === player.uid;
        if (meu) {
          returnPos.current = { x: t.x * TILE + 8, y: (t.y + 1) * TILE + 10 };
          currentHouse.current = def.id;
          patch({ currentHouseId: def.id });
          goTo("house"); notify("🏠 Bem-vindo à sua casa!", "ok");
        } else if (docProp?.ownerUid && docProp.locked) {
          notify(`🔒 Casa trancada. Proprietário: ${docProp.ownerNome ?? "desconhecido"}.`, "warn");
        } else if (docProp?.ownerUid && !docProp.locked) {
          returnPos.current = { x: t.x * TILE + 8, y: (t.y + 1) * TILE + 10 };
          currentHouse.current = def.id;
          patch({ currentHouseId: def.id });
          goTo("house"); notify(`🚪 Você entrou como visita na casa de ${docProp.ownerNome}.`, "info");
        } else {
          setPropKey(t.meta ?? `${t.x}_${t.y}`); setModal("prop");
        }
        break;
      }
      case "exit": currentHouse.current = null; patch({ currentHouseId: "" }); goTo("city", returnPos.current.x, returnPos.current.y); break;
      case "shop": setModal("shop"); break;
      case "arsenal": setModal("arsenal"); break;
      case "bank": case "atm": setModal("bank"); break;
      case "jobs": setJobsTab("vagas"); setModal("jobs"); break;
      case "command":
        setJobsTab(player.isLeader || player.isAdmin ? "comando" : player.emprego === "exercito" ? "meu" : "vagas");
        setModal("jobs"); break;
      case "hospital": {
        if (player.saude >= 100) return notify("Saúde cheia!", "info");
        if (player.saldoCarteira < 200) return notify("Atendimento: R$ 200.", "bad");
        patch({ saldoCarteira: player.saldoCarteira - 200, saude: 100 }); notify("🏥 Saúde restaurada!", "ok"); break;
      }
      case "bed":
        if (player.energia >= 100) return notify("Não está cansado.", "info");
        patch({ energia: Math.min(100, player.energia + 45), saude: Math.min(100, player.saude + 10) });
        notify("😴 +45 energia", "ok"); break;
      case "training":
        if (Date.now() - lastTrain.current < 2500) return; lastTrain.current = Date.now();
        if (player.energia < 8) return notify("Sem energia!", "bad");
        if (player.emprego === "desempregado") return notify("Você precisa de um emprego para treinar.", "warn");
        patch({ energia: Math.max(0, player.energia - 8) }); addXp(35); notify("🥋 +35 XP", "ok"); break;
    }
  }, [player, goTo, notify, patch, addXp, game.properties]);

  const flushPaint = useCallback(() => {
    const cells = pending.current; pending.current = {}; flushT.current = null;
    if (Object.keys(cells).length) saveMapCells(sceneRef.current.id, cells);
  }, [saveMapCells]);

  const doPaint = useCallback((x: number, y: number, erase: boolean) => {
    const b: Brush = erase ? { type: "erase" } : brush;
    // letreiro é armazenado separadamente
    if (b.type === "sign") {
      if (erase) removeSign(sceneRef.current.id, x, y);
      else if (b.text) placeSign(sceneRef.current.id, x, y, encodeSign(b.text, { size: b.size, color: b.color, bg: b.bg, w: b.w, h: b.h }));
      return;
    }
    const cells = brushCells(b, x, y, sceneRef.current);
    if (!Object.keys(cells).length) return;
    // proprietário decorando a própria casa → mobília salva no imóvel (não no mapa global)
    const houseId = currentHouse.current;
    if (sceneRef.current.id === "house" && houseId && game.properties[houseId]?.ownerUid === player?.uid && !player?.isAdmin) {
      const furniture: Record<string, string> = {};
      for (const k of Object.keys(cells)) furniture[k] = erase ? "" : cells[k];
      game.saveHouseFurniture(houseId, furniture);
      return;
    }
    const sid = sceneRef.current.id;
    setLocalCells((prev) => ({ ...prev, [sid]: { ...(prev[sid] ?? {}), ...cells } }));
    Object.assign(pending.current, cells);
    if (flushT.current === null) flushT.current = window.setTimeout(flushPaint, 260);
  }, [brush, flushPaint, placeSign, removeSign, game, player?.uid, player?.isAdmin]);

  handlers.current.onTarget = (t) => setTarget(t);
  handlers.current.onInteract = (t) => doInteract(t);
  handlers.current.onMove = (x, y, dir, moving) => syncPosition(x, y, dir, moving);
  handlers.current.onPaint = (x, y, erase) => doPaint(x, y, erase);

  useEffect(() => {
    if (!canvasRef.current || engineRef.current || !player) return;
    const start = applyEdits(BASE_SCENES[player.scene ?? "city"], edits[player.scene ?? "city"]);
    const eng = new GameEngine(canvasRef.current, start, {
      onTarget: (t) => handlers.current.onTarget(t),
      onInteract: (t) => handlers.current.onInteract(t),
      onMove: (x, y, d, m) => handlers.current.onMove(x, y, d, m),
      onEditorPaint: (x, y, e) => handlers.current.onPaint(x, y, e),
    });
    const okPos = player.x > 8 && player.y > 8 && player.x < start.w * TILE && player.y < start.h * TILE;
    eng.teleport(okPos ? player.x : start.spawn.x, okPos ? player.y : start.spawn.y);
    const initialClothing = player.roupaEquipada ? game.clothingItems.find((item) => item.id === player.roupaEquipada) : null;
    eng.setAppearance({ cor: player.cor, cabelo: player.cabelo, cabeloEstilo: player.cabeloEstilo, pele: player.pele || "#f0c396", sexo: player.sexo || "masculino", camisaModelo: initialClothing?.camisaModelo ?? player.camisaModelo, inferiorModelo: initialClothing?.inferiorModelo ?? player.inferiorModelo, calcaCor: initialClothing?.calcaCor ?? player.calcaCor, sapatoModelo: initialClothing?.sapatoModelo ?? player.sapatoModelo, sapatoCor: initialClothing?.sapatoCor ?? player.sapatoCor, camisaImagem: initialClothing?.image ?? player.camisaImagem ?? "", camisaTransform: initialClothing?.imageTransform ?? player.camisaTransform ?? { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }, nome: player.nome, patente: player.patente, emprego: player.emprego, uniforme: getUniform(player.emprego, player.patente, orgConfigs), armedItem: (player.equipped ?? []).find((e) => e === "arma_fogo" || e === "municao") ?? null });
    eng.setDamageHandler((targetUid, amount) => game.applyDamage(targetUid, amount));
    engineRef.current = eng;
    setScene(player.scene ?? "city");
    return () => { eng.destroy(); engineRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(player)]);

  useEffect(() => { engineRef.current?.setScene(sceneData); }, [sceneData]);

  // Mudanças externas (expulsão, teleporte administrativo, hospital) chegam em tempo real.
  useEffect(() => {
    if (!player?.scene || player.scene === scene) return;
    setScene(player.scene);
    currentHouse.current = player.currentHouseId || null;
    const next = applyEdits(BASE_SCENES[player.scene], edits[player.scene]);
    engineRef.current?.setScene(next, { x: player.x, y: player.y });
    engineRef.current?.teleport(player.x, player.y);
  }, [player?.scene, player?.currentHouseId, player?.x, player?.y, scene, edits]);

  useEffect(() => {
    if (!player) return;
    // roupa da loja, se equipada, sobrepõe a farda
    const clothing = player.roupaEquipada ? game.clothingItems.find((c) => c.id === player.roupaEquipada) : null;
    const uniforme = clothing
      ? { cor: clothing.cor, colete: clothing.corColetes, capacete: clothing.capacete }
      : getUniform(player.emprego, player.patente, orgConfigs);
    const armedItem = (player.equipped ?? []).find((e) => e === "arma_fogo" || e === "municao") ?? null;
    engineRef.current?.setAppearance({ cor: player.cor, cabelo: player.cabelo, cabeloEstilo: player.cabeloEstilo, pele: player.pele || "#f0c396", sexo: player.sexo || "masculino", camisaModelo: clothing?.camisaModelo ?? player.camisaModelo, inferiorModelo: clothing?.inferiorModelo ?? player.inferiorModelo, calcaCor: clothing?.calcaCor ?? player.calcaCor, sapatoModelo: clothing?.sapatoModelo ?? player.sapatoModelo, sapatoCor: clothing?.sapatoCor ?? player.sapatoCor, camisaImagem: clothing?.image ?? player.camisaImagem ?? "", camisaTransform: clothing?.imageTransform ?? player.camisaTransform ?? { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }, nome: player.nome, patente: player.patente, emprego: player.emprego, uniforme, armedItem });
  }, [player?.cor, player?.cabelo, player?.cabeloEstilo, player?.pele, player?.sexo, player?.camisaModelo, player?.inferiorModelo, player?.calcaCor, player?.sapatoModelo, player?.sapatoCor, player?.nome, player?.patente, player?.emprego, player?.roupaEquipada, player?.equipped, orgConfigs, game.clothingItems]);

  useEffect(() => {
    const list: RemotePlayer[] = others
      .filter((o) => (o.scene ?? "city") === scene && (scene !== "house" || (o.currentHouseId || "") === (currentHouse.current || player?.currentHouseId || "")))
      .map((o) => ({
        uid: o.uid, nome: o.nome, x: o.x, y: o.y,
        dir: o.dir ?? "down", moving: o.moving ?? false,
        cor: o.cor ?? "#3f7ad6", cabelo: o.cabelo ?? "#3a2418",
        pele: o.pele || "#f0c396", sexo: o.sexo || "masculino",
        patente: o.patente, emprego: o.emprego, uniforme: getUniform(o.emprego, o.patente, orgConfigs), armedItem: (o.equipped ?? []).find((e) => e === "arma_fogo" || e === "municao") ?? null, cabeloEstilo: o.cabeloEstilo, camisaModelo: o.camisaModelo, inferiorModelo: o.inferiorModelo, calcaCor: o.calcaCor, sapatoModelo: o.sapatoModelo, sapatoCor: o.sapatoCor, camisaImagem: o.roupaEquipada ? game.clothingItems.find((item) => item.id === o.roupaEquipada)?.image : "", camisaTransform: o.roupaEquipada ? game.clothingItems.find((item) => item.id === o.roupaEquipada)?.imageTransform : undefined, chat: o.chat ?? null,
      }));
    engineRef.current?.setRemote(list);
  }, [others, scene, orgConfigs, player?.currentHouseId]);

  useEffect(() => { if (engineRef.current) engineRef.current.inputLocked = Boolean(modal) || chatFocused || phoneOpen || tutorialOpen; }, [modal, chatFocused, phoneOpen, tutorialOpen]);
  useEffect(() => { const s = brushSize(brush, customObjects); engineRef.current?.setEditor(editorOn, s.w, s.h, brush.type === "sign"); }, [editorOn, brush, customObjects]);
  useEffect(() => { engineRef.current?.setCustomObjects(customObjects); }, [customObjects]);
  useEffect(() => { engineRef.current?.setSigns(signs[scene] ?? {}); }, [signs, scene]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") setModal(null); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, []);

  // ── morte automática: HP = 0 → hospital + taxa R$ 10 (pode negativar) ──
  const morrendo = useRef(false);
  useEffect(() => {
    if (!player) return;
    if (player.saude <= 0 && !morrendo.current) {
      morrendo.current = true;
      game.hospitalPay();
      setTimeout(() => { morrendo.current = false; }, 3000);
    }
  }, [player?.saude, game.hospitalPay]);

  const editCount = Object.keys(edits[scene] ?? {}).length;
  const inOwnHouse = scene === "house" && Boolean(currentHouse.current) && game.properties[currentHouse.current!]?.ownerUid === player?.uid;
  const canEdit = Boolean(player?.isAdmin) || inOwnHouse;
  if (!player) return <Loading />;
  if (player.banido) return <BannedScreen />;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0f1c]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="canvas-atmosphere" />

      <HUD target={editorOn ? null : target} scene={scene} canEdit={canEdit}
        onOpen={(m) => { if (m === "jobs") setJobsTab("meu"); setModal(m); }}
        onToggleEditor={() => setEditorOn((v) => !v)} editorOn={editorOn}
        onInteract={() => doInteract(target)}
        onZoomIn={() => engineRef.current?.zoomIn()}
        onZoomOut={() => engineRef.current?.zoomOut()}
        onGoMe={onGoMe}
        onTutorial={() => setTutorialOpen(true)} />

      <div className="absolute bottom-24 left-3 z-20"><ChatPanel onFocus={setChatFocused} /></div>

      <Hotbar locked={Boolean(modal) || chatFocused || phoneOpen || tutorialOpen} onOpenInventory={(m) => setModal(m)} />
      <Smartphone
        onGoMe={onGoMe}
        onZoomIn={() => engineRef.current?.zoomIn()}
        onZoomOut={() => engineRef.current?.zoomOut()}
        onOpenChange={setPhoneOpen}
      />
      {inOwnHouse && currentHouse.current && (
        <HouseMenu
          propId={currentHouse.current}
          onLeave={() => {
            currentHouse.current = null;
            patch({ currentHouseId: "" });
            goTo("city", returnPos.current.x, returnPos.current.y);
          }}
        />
      )}

      {editorOn && canEdit && (
        <EditorPanel scene={scene} brush={brush} setBrush={setBrush} edits={editCount} online={!offline}
          onClear={() => {
            if (inOwnHouse && !player.isAdmin && currentHouse.current) {
              const prop = game.properties[currentHouse.current];
              const cleared: Record<string, string> = {};
              for (const k of Object.keys(prop?.furniture ?? {})) cleared[k] = "";
              game.saveHouseFurniture(currentHouse.current, cleared);
            } else {
              clearMapEdits(scene); setLocalCells((p) => ({ ...p, [scene]: {} }));
            }
          }}
          onClose={() => setEditorOn(false)} />
      )}

      {modal === "jobs" && <JobsModal startTab={jobsTab} onClose={() => setModal(null)} />}
      {modal === "shop" && <ShopModal loja="mercado" onClose={() => setModal(null)} />}
      {modal === "arsenal" && <ShopModal loja="arsenal" onClose={() => setModal(null)} />}
      {modal === "inv" && <ShopModal loja="mercado" startTab="inventario" onClose={() => setModal(null)} />}
      {modal === "bank" && <BankModal onClose={() => setModal(null)} />}
      {modal === "prop" && (
        <PropertyModal propKey={propKey} onClose={() => setModal(null)}
          onEnter={() => {
            const [xs, ys] = propKey.split("_");
            returnPos.current = { x: Number(xs) * TILE + 8, y: (Number(ys) + 1) * TILE + 10 };
            const definition = getProperty(Number(xs), Number(ys));
            currentHouse.current = definition.id;
            patch({ currentHouseId: definition.id });
            setModal(null); goTo("house");
          }} />
      )}
      {modal === "profile" && <ProfileModal onClose={() => setModal(null)} />}
      {modal === "settings" && <SettingsModal onClose={() => setModal(null)} />}
      {modal === "admin" && <AdminModal onClose={() => setModal(null)} />}
      {modal === "help" && <HelpModal onClose={() => setModal(null)} />}
      {tutorialOpen && <TutorialOverlay onFinish={() => { setTutorialOpen(false); patch({ tutorialDone: true }); }} />}
    </div>
  );
}

function Root() {
  const { status, player } = useGame();
  const [screen, setScreen] = useState<"me" | "game">(() => window.location.pathname === "/cidade" ? "game" : "me");
  useEffect(() => {
    const pop = () => setScreen(window.location.pathname === "/cidade" ? "game" : "me");
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    if (status === "auth") {
      setScreen("me");
      window.history.replaceState({}, "", "/");
    }
  }, [status]);
  const go = (next: "me" | "game") => {
    setScreen(next);
    window.history.pushState({}, "", next === "me" ? "/me" : "/cidade");
  };
  if (status === "loading") return <Loading />;
  if (status === "auth") return <AuthScreen />;
  if (player && screen === "me") return <MePage onPlay={() => go("game")} />;
  return <Game onGoMe={() => go("me")} />;
}

export default function App() {
  return (<GameProvider><Root /></GameProvider>);
}
