import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword, onAuthStateChanged, signInAnonymously,
  signInWithEmailAndPassword, signOut, updateProfile,
} from "firebase/auth";
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy,
  query, runTransaction, serverTimestamp, setDoc, updateDoc, where,
} from "firebase/firestore";
import { COL, auth, db, firebaseReady } from "../firebase";
import {
  DEFAULT_PLAYER, DEFAULT_TREASURY, DEFAULT_ECONOMY_CONFIG, type Application, type ChatMsg, type ClothingItem, type CustomObject, type DirectMsg, type MapEditCells,
  type OrgConfig, type PlayerData, type PropertyDoc, type SceneId, type Sexo, type ShirtStyle, type SignMap,
  type TransactionDoc, type TreasuryDoc, type TreasuryEntry, type Uniform, type EconomyConfig, type ShirtArtTransform, DEFAULT_SHIRT_ART_TRANSFORM, calculatePatrimony, customObjectId, generateRG,
} from "../game/types";
import { calcNivel, effectivePrice, effectiveSalary, getItem, getJob, getRank, isLeaderRank, JOBS } from "../game/jobs";
import { getProperty } from "../game/mapData";

export const ADMIN_CODE = "mas3510";
const LS_KEY = "pixelcity:offline-player";
const LS_MAP = "pixelcity:offline-map";

export interface Toast { id: number; msg: string; tone: "info" | "ok" | "warn" | "bad" | "money"; }

interface RegisterInfo { nome: string; sexo: Sexo; cor: string; cabelo: string; pele: string; dataNascimento: string; }

interface GameCtxValue {
  status: "loading" | "auth" | "playing";
  offline: boolean;
  authError: string | null;
  busy: boolean;
  player: PlayerData | null;
  others: PlayerData[];
  directory: PlayerData[];
  chat: ChatMsg[];
  properties: Record<string, PropertyDoc>;
  edits: Partial<Record<SceneId, MapEditCells>>;
  applications: Application[];
  orgConfigs: Record<string, OrgConfig>;
  priceOverrides: Record<string, number>;
  customObjects: CustomObject[];
  signs: Partial<Record<SceneId, SignMap>>;
  toasts: Toast[];
  notify: (msg: string, tone?: Toast["tone"]) => void;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, info: RegisterInfo) => Promise<void>;
  guest: (info: RegisterInfo) => Promise<void>;
  logout: () => Promise<void>;
  patch: (p: Partial<PlayerData>) => void;
  syncPosition: (x: number, y: number, dir: PlayerData["dir"], moving: boolean) => void;
  changeScene: (scene: SceneId, x: number, y: number) => void;
  addXp: (amount: number) => void;
  addMoney: (amount: number) => void;
  deposit: (amount: number) => void;
  withdraw: (amount: number) => void;
  buyItem: (itemId: string, qtd: number, useCredit?: boolean) => void;
  chargePayment: (valor: number, desc: string, opts?: { credit?: boolean; allowNegative?: boolean }) => { ok: boolean; msg?: string };
  payCardBill: (fromBank?: boolean) => void;
  hospitalPay: () => void;
  useItem: (itemId: string) => void;
  equipSlot: (slot: number, itemId: string | null) => void;
  useHotbarSlot: (slot: number) => void;
  collectSalary: () => void;
  applyForJob: (orgId: string) => Promise<void>;
  cancelApplication: (appId: string) => Promise<void>;
  reviewApplication: (appId: string, approved: boolean) => Promise<void>;
  fireFromOrg: (targetUid: string) => Promise<void>;
  quitJob: () => void;
  setPlayerJob: (targetUid: string, jobId: string, patente: string) => Promise<void>;
  buyProperty: (key: string, useCredit?: boolean) => Promise<void>;
  sellProperty: (propId: string, valor: number) => Promise<void>;
  saveMapCells: (scene: SceneId, cells: MapEditCells) => Promise<void>;
  clearMapEdits: (scene: SceneId) => Promise<void>;
  grantAdmin: (code: string) => boolean;
  sendChat: (text: string) => Promise<void>;
  adminSetPlayer: (uid: string, data: Partial<PlayerData>) => Promise<void>;
  adminBanPlayer: (uid: string, banido: boolean, motivo?: string) => Promise<void>;
  adminTeleportPlayer: (uid: string, scene: SceneId, x: number, y: number) => Promise<void>;
  adminSetOrgSalary: (jobId: string, rankId: string, salario: number) => Promise<void>;
  adminSetRecruitRank: (jobId: string, rankIndex: number) => Promise<void>;
  adminSetItemPrice: (itemId: string, price: number) => Promise<void>;
  adminLogout: () => Promise<void>;
  addCustomObject: (nome: string, image: string, w: number, h: number, preco: number, sellable: boolean) => Promise<void>;
  deleteCustomObject: (id: string) => Promise<void>;
  buyCustomObject: (objId: number, preco: number, useCredit?: boolean) => void;
  placeSign: (scene: SceneId, x: number, y: number, value: string) => Promise<void>;
  removeSign: (scene: SceneId, x: number, y: number) => Promise<void>;
  setLeader: (jobId: string, uid: string | null) => Promise<void>;
  transactions: TransactionDoc[];
  transferByRG: (rg: string, amount: number) => Promise<void>;
  requestCreditCard: () => void;
  payBill: (amount: number, description: string) => void;
  /* ── Cofre Nacional & Economia Global ── */
  treasury: TreasuryDoc;
  treasuryLedger: TreasuryEntry[];
  payServiceBill: () => Promise<void>;
  treasuryDeposit: (valor: number, desc: string) => Promise<void>;
  treasurySetConfig: (taxaServico: number, maxCiclos: number) => Promise<void>;
  economyConfig: EconomyConfig;
  adminSetEconomyConfig: (config: Partial<EconomyConfig>) => Promise<void>;
  claimAuxilioGov: () => Promise<void>;
  adminSetUniform: (jobId: string, rankId: string, uniform: Uniform) => Promise<void>;
  findUserByRG: (rg: string) => PlayerData | null;
  dms: DirectMsg[];
  addFriendByRG: (rg: string) => Promise<void>;
  removeFriend: (uid: string) => void;
  sendDM: (toUid: string, text: string) => Promise<void>;
  toggleHouseLock: (propId: string) => Promise<void>;
  saveHouseFurniture: (propId: string, cells: Record<string, string>) => Promise<void>;
  kickHouseGuest: (propId: string, targetUid: string) => Promise<void>;
  applyDamage: (targetUid: string, amount: number) => Promise<void>;
  healPlayer: (amount: number) => void;
  sendToHospital: (uid: string) => Promise<void>;
  setComa: (uid: string, fim: number) => Promise<void>;
  clothingItems: ClothingItem[];
  addClothing: (nome: string, preco: number, cor: string, colete?: string, capacete?: string) => Promise<void>;
  addClothingV2: (data: { nome: string; preco: number; cor: string; camisaModelo?: ShirtStyle; genero?: Sexo | "unissex"; image?: string; imageTransform?: ShirtArtTransform }) => Promise<void>;
  updateClothing: (id: string, data: Partial<ClothingItem>) => Promise<void>;
  deleteClothing: (id: string) => Promise<void>;
  wipeAllData: () => Promise<void>;
  buyClothing: (id: string, useCredit?: boolean) => void;
  equipClothing: (id: string) => void;
  adminSetDebt: (uid: string, campo: string, valor: number) => Promise<void>;
}

const Ctx = createContext<GameCtxValue | null>(null);
export const useGame = () => { const v = useContext(Ctx); if (!v) throw new Error("useGame fora do provider"); return v; };

async function reserveRG(db: import("firebase/firestore").Firestore, rg: string, uid: string): Promise<boolean> {
  try {
    return await runTransaction(db, async (tx) => {
      const ref = doc(db, COL.rgRegistry, rg);
      const snap = await tx.get(ref);
      if (snap.exists() && snap.data().uid !== uid) return false;
      tx.set(ref, { uid, reservedAt: Date.now() });
      return true;
    });
  } catch { return false; }
}

/** Reserva atomicamente um RG-XXXXX, evitando colisões entre cadastros simultâneos. */
async function uniqueRG(db: import("firebase/firestore").Firestore, uid: string): Promise<string> {
  for (let i = 0; i < 25; i++) {
    const rg = generateRG();
    if (await reserveRG(db, rg, uid)) return rg;
  }
  throw new Error("Não foi possível emitir um RG único.");
}

const errorMsg = (code: string) => {
  const map: Record<string, string> = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-not-found": "Conta não encontrada. Cadastre-se primeiro!",
    "auth/wrong-password": "Senha incorreta.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/email-already-in-use": "Este e-mail já possui uma conta.",
    "auth/weak-password": "A senha precisa ter ao menos 6 caracteres.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns instantes.",
    "auth/network-request-failed": "Sem conexão com o servidor.",
    "auth/operation-not-allowed": "Método de login indisponível.",
    "auth/admin-restricted-operation": "Entrada de visitante indisponível.",
    "auth/unauthorized-domain": "Este endereço não está autorizado.",
  };
  return map[code] ?? "Não foi possível conectar ao servidor.";
};

export function GameProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GameCtxValue["status"]>("loading");
  const [offline, setOffline] = useState(!firebaseReady);
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [others, setOthers] = useState<PlayerData[]>([]);
  const [directory, setDirectory] = useState<PlayerData[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [properties, setProperties] = useState<Record<string, PropertyDoc>>({});
  const [edits, setEdits] = useState<Partial<Record<SceneId, MapEditCells>>>({});
  const [applications, setApplications] = useState<Application[]>([]);
  const [orgConfigs, setOrgConfigs] = useState<Record<string, OrgConfig>>({});
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const [customObjects, setCustomObjects] = useState<CustomObject[]>([]);
  const [signs, setSigns] = useState<Partial<Record<SceneId, SignMap>>>({});
  const [transactions, setTransactions] = useState<TransactionDoc[]>([]);
  const [dms, setDms] = useState<DirectMsg[]>([]);
  const [clothingItems, setClothingItems] = useState<ClothingItem[]>([]);
  const [treasury, setTreasury] = useState<TreasuryDoc>(DEFAULT_TREASURY);
  const [treasuryLedger, setTreasuryLedger] = useState<TreasuryEntry[]>([]);
  const [economyConfig, setEconomyConfig] = useState<EconomyConfig>(DEFAULT_ECONOMY_CONFIG);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const playerRef = useRef<PlayerData | null>(null);
  const offlineRef = useRef(offline);
  const economyConfigRef = useRef(economyConfig);
  useEffect(() => { economyConfigRef.current = economyConfig; }, [economyConfig]);
  const pendingPos = useRef<{ x: number; y: number; dir: PlayerData["dir"]; moving: boolean } | null>(null);
  const lastPosWrite = useRef(0);
  const pendingProfile = useRef<RegisterInfo | null>(null);

  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { offlineRef.current = offline; }, [offline]);

  const notify = useCallback((msg: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-4), { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  /* OFFLINE */
  const startOffline = useCallback((info: RegisterInfo, admin = false) => {
    const saved = localStorage.getItem(LS_KEY);
    let p: PlayerData;
    if (saved) { try { p = { ...DEFAULT_PLAYER("local", info.nome), ...(JSON.parse(saved) as PlayerData), nome: info.nome }; } catch { p = DEFAULT_PLAYER("local", info.nome); } }
    else {
      p = DEFAULT_PLAYER("local", info.nome);
      p.saldoCarteira = economyConfigRef.current.saldoCarteiraInicial ?? 750;
      p.saldoBanco = economyConfigRef.current.saldoBancoInicial ?? 1500;
    }
    p.sexo = info.sexo; p.cor = info.cor; p.cabelo = info.cabelo; p.pele = info.pele; p.dataNascimento = info.dataNascimento;
    if (!saved) {
      p.cabeloEstilo = info.sexo === "feminino" ? "longo" : "curto";
      p.camisaModelo = info.sexo === "feminino" ? "blusa" : "camiseta";
      p.inferiorModelo = info.sexo === "feminino" ? "saia" : "calca";
    }
    if (admin) p.isAdmin = true;
    setOffline(true); setPlayer(p); setStatus("playing");
    localStorage.setItem(LS_KEY, JSON.stringify(p));
    try { const m = localStorage.getItem(LS_MAP); if (m) setEdits(JSON.parse(m)); } catch { /* */ }
    notify("Modo local ativado.", "warn");
  }, [notify]);

  const persistOffline = useCallback((p: PlayerData) => { localStorage.setItem(LS_KEY, JSON.stringify(p)); }, []);

  /* AUTH */
  useEffect(() => {
    if (!firebaseReady || !auth || !db) { setStatus("auth"); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setPlayer(null); setStatus("auth"); return; }
      const ref = doc(db!, COL.users, user.uid);
      try {
        const snap = await getDoc(ref);
        const prof = pendingProfile.current;
        if (!snap.exists()) {
          const base = DEFAULT_PLAYER(user.uid, prof?.nome || user.displayName || "Cidadão");
          base.saldoCarteira = economyConfigRef.current.saldoCarteiraInicial ?? 750;
          base.saldoBanco = economyConfigRef.current.saldoBancoInicial ?? 1500;
          if (prof) {
            base.sexo = prof.sexo; base.cor = prof.cor; base.cabelo = prof.cabelo; base.pele = prof.pele; base.dataNascimento = prof.dataNascimento;
            base.cabeloEstilo = prof.sexo === "feminino" ? "longo" : "curto";
            base.camisaModelo = prof.sexo === "feminino" ? "blusa" : "camiseta";
            base.inferiorModelo = prof.sexo === "feminino" ? "saia" : "calca";
          }
          // garante RG único no banco (formato RG-XXXXX)
          base.rg = await uniqueRG(db!, user.uid);
          await setDoc(ref, { ...base, criadoEm: serverTimestamp() });
        } else if (prof) {
          await updateDoc(ref, { nome: prof.nome, sexo: prof.sexo, cor: prof.cor, cabelo: prof.cabelo, pele: prof.pele, dataNascimento: prof.dataNascimento });
        }
        if (snap.exists()) {
          const current = snap.data() as Partial<PlayerData>;
          const valid = typeof current.rg === "string" && /^RG-\d{5}$/.test(current.rg);
          if (!valid || !(await reserveRG(db!, current.rg!, user.uid))) {
            await updateDoc(ref, { rg: await uniqueRG(db!, user.uid) });
          }
        }
        pendingProfile.current = null;
        setStatus("playing");
      } catch (e) {
        console.warn("[PixelCity] Firestore:", e);
        notify("Servidor indisponível — modo local.", "warn");
        const pp = pendingProfile.current;
        startOffline(pp ?? { nome: user.displayName || "Cidadão", sexo: "masculino", cor: "#3f7ad6", cabelo: "#3a2418", pele: "#f0c396", dataNascimento: "" });
      }
    }, () => setStatus("auth"));
    return unsub;
  }, [notify, startOffline]);

  /* REALTIME */
  const uid = auth?.currentUser?.uid ?? null;
  useEffect(() => {
    if (offline || !firebaseReady || !db || status !== "playing") return;
    const me = auth?.currentUser?.uid; if (!me) return;
    const unsubs: (() => void)[] = [];
    unsubs.push(onSnapshot(doc(db, COL.users, me), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as Partial<PlayerData>;
      setPlayer((prev) => ({ ...DEFAULT_PLAYER(me, "Cidadão"), ...prev, ...data, uid: me }));
    }, () => notify("Sem permissão de leitura.", "bad")));
    unsubs.push(onSnapshot(query(collection(db, COL.users), orderBy("lastSeen", "desc"), limit(300)), (snap) => {
      const now = Date.now(); const online: PlayerData[] = []; const all: PlayerData[] = [];
      snap.forEach((d) => {
        const p = { ...DEFAULT_PLAYER(d.id, "Cidadão"), ...(d.data() as PlayerData), uid: d.id };
        all.push(p);
        if (d.id !== me && p.lastSeen && now - p.lastSeen <= 60000) online.push(p);
      });
      setDirectory(all);
      setOthers(online);
    }, () => setOthers([])));
    unsubs.push(onSnapshot(collection(db, COL.mapEdits), (snap) => {
      const next: Partial<Record<SceneId, MapEditCells>> = {};
      snap.forEach((d) => { next[d.id as SceneId] = (d.data() as { cells?: MapEditCells }).cells ?? {}; });
      setEdits(next);
    }, () => undefined));
    unsubs.push(onSnapshot(collection(db, COL.properties), (snap) => {
      const next: Record<string, PropertyDoc> = {};
      snap.forEach((d) => { next[d.id] = { id: d.id, ...(d.data() as Omit<PropertyDoc, "id">) }; });
      setProperties(next);
    }, () => undefined));
    unsubs.push(onSnapshot(query(collection(db, COL.chat), orderBy("ts", "desc"), limit(40)), (snap) => {
      const list: ChatMsg[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<ChatMsg, "id">) }));
      setChat(list.reverse());
    }, () => undefined));
    unsubs.push(onSnapshot(collection(db, COL.applications), (snap) => {
      const list: Application[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Application, "id">) }));
      setApplications(list);
    }, () => undefined));
    unsubs.push(onSnapshot(collection(db, COL.organizations), (snap) => {
      const next: Record<string, OrgConfig> = {};
      snap.forEach((d) => { next[d.id] = d.data() as OrgConfig; });
      setOrgConfigs(next);
    }, () => undefined));
    unsubs.push(onSnapshot(doc(db, COL.shopConfig, "prices"), (snap) => {
      setPriceOverrides(snap.exists() ? (snap.data() as Record<string, number>) : {});
    }, () => undefined));
    unsubs.push(onSnapshot(doc(db, COL.shopConfig, "economy"), (snap) => {
      setEconomyConfig(snap.exists() ? { ...DEFAULT_ECONOMY_CONFIG, ...(snap.data() as EconomyConfig) } : DEFAULT_ECONOMY_CONFIG);
    }, () => undefined));
    unsubs.push(onSnapshot(collection(db, COL.customObjects), (snap) => {
      const list: CustomObject[] = [];
      snap.forEach((d) => { const data = d.data() as Omit<CustomObject, "id"> & { deletado?: boolean }; if (!data.deletado) list.push({ ...data, id: d.id }); });
      setCustomObjects(list);
    }, () => undefined));
    unsubs.push(onSnapshot(collection(db, COL.signs), (snap) => {
      const next: Partial<Record<SceneId, SignMap>> = {};
      snap.forEach((d) => { next[d.id as SceneId] = (d.data() as { cells?: SignMap }).cells ?? {}; });
      setSigns(next);
    }, () => undefined));
    unsubs.push(onSnapshot(query(collection(db, COL.transactions), orderBy("ts", "desc"), limit(80)), (snap) => {
      const list: TransactionDoc[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<TransactionDoc, "id">) }));
      setTransactions(list);
    }, () => undefined));
    unsubs.push(onSnapshot(query(collection(db, COL.dms), where("participants", "array-contains", me), limit(120)), (snap) => {
      const list: DirectMsg[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<DirectMsg, "id">) }));
      list.sort((a, b) => a.ts - b.ts);
      setDms(list);
    }, () => undefined));
    unsubs.push(onSnapshot(collection(db, COL.clothing), (snap) => {
      const list: ClothingItem[] = [];
      snap.forEach((d) => { const data = d.data() as Omit<ClothingItem, "id"> & { deletado?: boolean }; if (!data.deletado) list.push({ ...data, id: d.id }); });
      setClothingItems(list);
    }, () => undefined));
    /* ── COFRE NACIONAL (tempo real) ── */
    unsubs.push(onSnapshot(doc(db, COL.treasury, "national"), (snap) => {
      setTreasury(snap.exists() ? { ...DEFAULT_TREASURY, ...(snap.data() as Partial<TreasuryDoc>) } : DEFAULT_TREASURY);
    }, () => undefined));
    unsubs.push(onSnapshot(query(collection(db, COL.treasuryLedger), orderBy("ts", "desc"), limit(100)), (snap) => {
      const list: TreasuryEntry[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<TreasuryEntry, "id">) }));
      setTreasuryLedger(list);
    }, () => undefined));
    return () => unsubs.forEach((u) => u());
  }, [offline, status, uid, notify]);

  /* WRITE */
  const writeRemote = useCallback((data: Record<string, unknown>) => {
    const me = auth?.currentUser?.uid;
    if (offlineRef.current || !firebaseReady || !db || !me) return;
    updateDoc(doc(db, COL.users, me), data).catch((e) => console.warn("[PixelCity] write:", e));
  }, []);

  const patch = useCallback((p: Partial<PlayerData>) => {
    const cur = playerRef.current; if (cur) { const next = { ...cur, ...p }; playerRef.current = next; setPlayer(next); if (offlineRef.current) persistOffline(next); }
    if (!offlineRef.current) writeRemote({ ...p, lastSeen: Date.now() });
  }, [persistOffline, writeRemote]);

  /** Movimenta o Cofre Nacional de forma atômica e registra no extrato. */
  const treasuryMove = useCallback(async (entry: Omit<TreasuryEntry, "id" | "ts">) => {
    const ts = Date.now();
    if (!offlineRef.current && db) {
      try {
        await runTransaction(db, async (tx) => {
          const ref = doc(db!, COL.treasury, "national");
          const snap = await tx.get(ref);
          const atual = snap.exists() ? ((snap.data() as TreasuryDoc).saldo ?? 0) : 0;
          tx.set(ref, { saldo: atual + entry.valor, updatedAt: ts }, { merge: true });
        });
        const clean = Object.fromEntries(Object.entries({ ...entry, ts }).filter(([, v]) => v !== undefined));
        await addDoc(collection(db, COL.treasuryLedger), clean);
      } catch { return false; }
    } else {
      setTreasury((prev) => ({ ...prev, saldo: prev.saldo + entry.valor, updatedAt: ts }));
      setTreasuryLedger((prev) => [{ id: `local-${ts}`, ...entry, ts }, ...prev.slice(0, 99)]);
    }
    return true;
  }, []);

  const logTransaction = useCallback((t: Omit<TransactionDoc, "id" | "ts">) => {
    const p = playerRef.current;
    if (offlineRef.current || !db) {
      setTransactions((prev) => [{ id: `local-${Date.now()}`, ...t, ts: Date.now() }, ...prev.slice(0, 79)]);
      return;
    }
    addDoc(collection(db, COL.transactions), { ...t, ts: Date.now() }).catch(() => undefined);
    // adiciona otimista para feedback imediato no /me
    if (p) setTransactions((prev) => [{ id: `opt-${Date.now()}`, ...t, ts: Date.now() }, ...prev.slice(0, 79)]);
  }, []);

  /* POSITION */
  const syncPosition = useCallback((x: number, y: number, dir: PlayerData["dir"], moving: boolean) => { pendingPos.current = { x, y, dir, moving }; }, []);
  useEffect(() => {
    if (status !== "playing") return;
    const iv = setInterval(() => {
      const pos = pendingPos.current; const p = playerRef.current; if (!p) return;
      if (pos) {
        const moved = Math.hypot(pos.x - p.x, pos.y - p.y) > 2 || pos.dir !== p.dir || pos.moving !== p.moving;
        if (moved) {
          const next = { ...p, ...pos, lastSeen: Date.now() }; playerRef.current = next;
          if (offlineRef.current) persistOffline(next); else writeRemote({ x: pos.x, y: pos.y, dir: pos.dir, moving: pos.moving, lastSeen: Date.now() });
          lastPosWrite.current = Date.now(); return;
        }
      }
      if (!offlineRef.current && Date.now() - lastPosWrite.current > 20000) { lastPosWrite.current = Date.now(); writeRemote({ lastSeen: Date.now() }); }
    }, 700);
    return () => clearInterval(iv);
  }, [status, persistOffline, writeRemote]);

  useEffect(() => {
    if (status !== "playing") return;
    const iv = setInterval(() => {
      const p = playerRef.current; if (!p) return;
      const energia = Math.max(0, p.energia - 1);
      const fome = Math.max(0, (p.fome ?? 100) - 1);
      const sede = Math.max(0, (p.sede ?? 100) - 2);
      const saude = p.energia <= 0 || fome <= 0 || sede <= 0 ? Math.max(10, p.saude - 1) : p.saude;
      if (energia !== p.energia || saude !== p.saude || fome !== p.fome || sede !== p.sede) patch({ energia, saude, fome, sede });
    }, 45000);
    return () => clearInterval(iv);
  }, [status, patch]);

  /* ACTIONS */
  const login = useCallback(async (email: string, pass: string) => {
    setAuthError(null);
    if (!firebaseReady || !auth) return startOffline({ nome: "Cidadão", sexo: "masculino", cor: "#3f7ad6", cabelo: "#3a2418", pele: "#f0c396", dataNascimento: "" });
    setBusy(true);
    try { await signInWithEmailAndPassword(auth, email.trim(), pass); } catch (e) { setAuthError(errorMsg((e as { code?: string }).code ?? "")); } finally { setBusy(false); }
  }, [startOffline]);

  const register = useCallback(async (email: string, pass: string, info: RegisterInfo) => {
    setAuthError(null);
    if (!firebaseReady || !auth) return startOffline(info);
    setBusy(true);
    pendingProfile.current = { ...info, nome: info.nome.trim() || "Cidadão" };
    try { const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass); await updateProfile(cred.user, { displayName: info.nome.trim() || "Cidadão" }).catch(() => undefined); }
    catch (e) { setAuthError(errorMsg((e as { code?: string }).code ?? "")); pendingProfile.current = null; } finally { setBusy(false); }
  }, [startOffline]);

  const guest = useCallback(async (info: RegisterInfo) => {
    setAuthError(null);
    if (!firebaseReady || !auth) return startOffline({ ...info, nome: info.nome || "Visitante" });
    setBusy(true);
    pendingProfile.current = { ...info, nome: info.nome.trim() || "Visitante" };
    try { await signInAnonymously(auth); } catch { startOffline({ ...info, nome: info.nome || "Visitante" }); } finally { setBusy(false); }
  }, [startOffline]);

  const logout = useCallback(async () => {
    if (offlineRef.current) { setPlayer(null); setStatus("auth"); setOffline(!firebaseReady); return; }
    writeRemote({ lastSeen: 0 });
    if (auth) await signOut(auth).catch(() => undefined);
    setPlayer(null); setOthers([]); setStatus("auth");
  }, [writeRemote]);

  const addXp = useCallback((amount: number) => {
    const p = playerRef.current; if (!p) return;
    const xp = Math.max(0, p.xp + amount);
    const before = calcNivel(p.xp).nivel; const after = calcNivel(xp).nivel;
    patch({ xp, nivel: after });
    if (after > before) notify(`Você subiu para o nível ${after}!`, "ok");
  }, [patch, notify]);

  const addMoney = useCallback((amount: number) => { const p = playerRef.current; if (!p) return; patch({ saldoCarteira: Math.max(0, p.saldoCarteira + amount) }); }, [patch]);

  const deposit = useCallback((amount: number) => {
    const p = playerRef.current; if (!p || amount <= 0) return;
    if (p.saldoCarteira < amount) return notify("Saldo insuficiente na carteira.", "bad");
    patch({ saldoCarteira: p.saldoCarteira - amount, saldoBanco: p.saldoBanco + amount });
    logTransaction({ from: p.uid, fromNome: p.nome, tipo: "deposito", valor: amount, desc: "Depósito" });
    notify(`R$ ${amount.toLocaleString("pt-BR")} depositados.`, "money");
  }, [patch, notify, logTransaction]);

  const withdraw = useCallback((amount: number) => {
    const p = playerRef.current; if (!p || amount <= 0) return;
    if (p.saldoBanco < amount) return notify("Saldo insuficiente no banco.", "bad");
    patch({ saldoCarteira: p.saldoCarteira + amount, saldoBanco: p.saldoBanco - amount });
    logTransaction({ from: p.uid, fromNome: p.nome, tipo: "saque", valor: amount, desc: "Saque" });
    notify(`R$ ${amount.toLocaleString("pt-BR")} sacados.`, "money");
  }, [patch, notify, logTransaction]);

  /**
   * Cobrança unificada: à vista (carteira→banco) ou crédito.
   * - Crédito: aplica 2% imposto de uso, valida bloqueio por saldo negativo e limite disponível.
   * - À vista: consome carteira, depois banco. Permite ficar negativado APENAS quando `allowNegative=true`
   *   (usado pela taxa do hospital). Compras normais retornam false se faltar dinheiro.
   * Retorna { ok, mensagem } — o chamador decide como reagir.
   */
  const chargePayment = useCallback((valor: number, desc: string, opts: { credit?: boolean; allowNegative?: boolean } = {}): { ok: boolean; msg?: string } => {
    const p = playerRef.current; if (!p) return { ok: false, msg: "Sem jogador." };
    if (valor <= 0) return { ok: true };
    const negativo = (p.saldoCarteira < 0) || (p.saldoBanco < 0);

    if (opts.credit) {
      if (!p.cartaoCredito) return { ok: false, msg: "Você ainda não possui Cartão de Crédito." };
      if (negativo) return { ok: false, msg: "❌ Cartão bloqueado devido a saldo negativado. Quite sua dívida primeiro." };
      const imposto = Math.ceil(valor * 0.02);
      const totalCred = valor + imposto;
      const disponivel = (p.cartaoLimite || 0) - (p.cartaoFatura || 0);
      if (disponivel < totalCred) return { ok: false, msg: "❌ Saldo de crédito insuficiente. O banco negou a compra." };
      patch({ cartaoFatura: (p.cartaoFatura || 0) + totalCred });
      logTransaction({ from: p.uid, fromNome: p.nome, tipo: "credito", valor: totalCred, desc: `${desc} · crédito (imposto R$ ${imposto})` });
      notify(`💳 ${desc} — R$ ${valor.toLocaleString("pt-BR")} + R$ ${imposto} imposto`, "money");
      return { ok: true };
    }

    // À vista: carteira primeiro, banco depois
    const totalDisponivel = p.saldoCarteira + p.saldoBanco;
    if (!opts.allowNegative && totalDisponivel < valor) return { ok: false, msg: "Dinheiro insuficiente!" };

    let carteira = p.saldoCarteira;
    let banco = p.saldoBanco;
    if (carteira >= valor) {
      carteira -= valor;
    } else {
      const restante = valor - carteira;
      carteira = 0;
      if (banco >= restante) banco -= restante;
      else if (opts.allowNegative) {
        // negativa a carteira com o que sobrar
        const falta = restante - banco;
        banco = 0;
        carteira = -falta;
      } else {
        return { ok: false, msg: "Dinheiro insuficiente!" };
      }
    }
    patch({ saldoCarteira: carteira, saldoBanco: banco });
    logTransaction({ from: p.uid, fromNome: p.nome, tipo: "compra", valor, desc });
    return { ok: true };
  }, [patch, notify, logTransaction]);

  const buyItem = useCallback((itemId: string, qtd: number, useCredit = false) => {
    const p = playerRef.current; const item = getItem(itemId); if (!p || !item) return;
    const preco = effectivePrice(itemId, priceOverrides);
    const total = preco * qtd;
    const desc = `${qtd}x ${item.nome}`;
    const r = chargePayment(total, desc, { credit: useCredit });
    if (!r.ok) { notify(r.msg ?? "Falha na compra.", "bad"); return; }
    const inv = [...(p.inventario ?? [])]; const idx = inv.findIndex((i) => i.id === itemId);
    if (idx >= 0) inv[idx] = { ...inv[idx], qtd: inv[idx].qtd + qtd }; else inv.push({ id: itemId, qtd });
    patch({ inventario: inv });
    if (!useCredit) notify(`${desc} — R$ ${total.toLocaleString("pt-BR")}`, "money");
  }, [patch, notify, priceOverrides, chargePayment]);

  const useItem = useCallback((itemId: string) => {
    const p = playerRef.current; const item = getItem(itemId); if (!p || !item) return;
    const inv = [...(p.inventario ?? [])]; const idx = inv.findIndex((i) => i.id === itemId);
    if (idx < 0 || inv[idx].qtd <= 0) return notify("Você não possui este item.", "warn");
    if (!item.energia && !item.saude) return notify(`${item.nome} é equipamento — equipe na Hotbar.`, "info");
    inv[idx] = { ...inv[idx], qtd: inv[idx].qtd - 1 };
    const drink = ["refri", "cafe", "energetico"].includes(itemId);
    patch({
      inventario: inv.filter((i) => i.qtd > 0),
      energia: Math.min(100, p.energia + (item.energia ?? 0)),
      saude: Math.min(100, p.saude + (item.saude ?? 0)),
      fome: Math.min(100, (p.fome ?? 100) + (drink ? 4 : Math.max(8, item.energia ?? 0))),
      sede: Math.min(100, (p.sede ?? 100) + (drink ? Math.max(20, item.energia ?? 0) : 2)),
    });
    notify(`Você usou ${item.nome}.`, "ok");
  }, [patch, notify]);

  const equipSlot = useCallback((slot: number, itemId: string | null) => {
    const p = playerRef.current; if (!p) return;
    const eq = [...(p.equipped ?? [null, null, null, null, null, null])];
    while (eq.length < 6) eq.push(null);
    eq[slot] = itemId;
    patch({ equipped: eq });
    notify(itemId ? `${getItem(itemId)?.nome ?? itemId} equipado no slot ${slot + 1}.` : `Slot ${slot + 1} esvaziado.`, "ok");
  }, [patch, notify]);

  const useHotbarSlot = useCallback((slot: number) => {
    const p = playerRef.current; if (!p) return;
    const itemId = (p.equipped ?? [])[slot];
    if (!itemId) return;
    const item = getItem(itemId);
    if (!item) return;
    if (item.energia || item.saude) useItem(itemId);
    else notify(`🎒 ${item.nome} em uso (RP).`, "info");
  }, [useItem, notify]);

  const collectSalary = useCallback(() => {
    const p = playerRef.current; if (!p) return;
    if (p.emprego === "desempregado") return notify("Você precisa de um emprego!", "bad");
    const rank = getRank(p.emprego, p.patente); if (!rank) return notify("Patente inválida.", "bad");
    const wait = 90000; const elapsed = Date.now() - (p.lastSalary || 0);
    if (elapsed < wait) return notify(`Próximo turno em ${Math.ceil((wait - elapsed) / 1000)}s.`, "warn");
    if (p.energia < 15) return notify("Energia baixa! Coma algo.", "bad");
    const salario = effectiveSalary(p.emprego, p.patente, orgConfigs);
    const xp = 60 + Math.floor(salario / 60); const novoXp = p.xp + xp;
    // salário cai no BANCO e sai do Cofre Nacional
    patch({ saldoBanco: p.saldoBanco + salario, energia: Math.max(0, p.energia - 12), xp: novoXp, nivel: calcNivel(novoXp).nivel, lastSalary: Date.now(), hoursWorked: (p.hoursWorked || 0) + 1, patrulhas: (p.patrulhas || 0) + (p.emprego === "policia" || p.emprego === "exercito" ? 1 : 0) });
    treasuryMove({ tipo: "salario", org: p.emprego, valor: -salario, desc: `Salário · ${p.nome} (${p.patente})`, playerUid: p.uid, playerNome: p.nome });
    logTransaction({ to: p.uid, toNome: p.nome, tipo: "salario", valor: salario, desc: `Salário · ${p.patente} → conta bancária` });
    notify(`Turno concluído! +R$ ${salario.toLocaleString("pt-BR")} no banco e +${xp} XP`, "money");
  }, [patch, notify, orgConfigs, logTransaction, treasuryMove]);

  /* APPLICATION SYSTEM */
  const applyForJob = useCallback(async (orgId: string) => {
    const p = playerRef.current; if (!p) return;
    if (p.emprego === orgId) return notify("Você já trabalha nesta organização.", "info");
    const existing = applications.find((a) => a.userId === p.uid && a.organizationId === orgId && a.status === "pending");
    if (existing) return notify("Você já tem uma candidatura pendente.", "warn");
    const app: Omit<Application, "id"> = { userId: p.uid, userNome: p.nome, organizationId: orgId, status: "pending", submittedAt: Date.now() };
    if (!offlineRef.current && db) {
      await addDoc(collection(db, COL.applications), app).catch(() => notify("Erro ao enviar candidatura.", "bad"));
    } else {
      setApplications((prev) => [...prev, { ...app, id: `local-${Date.now()}` }]);
    }
    notify("📋 Candidatura enviada! Aguarde a aprovação do líder.", "ok");
  }, [applications, notify]);

  const reviewApplication = useCallback(async (appId: string, approved: boolean) => {
    const p = playerRef.current; if (!p) return;
    const app = applications.find((a) => a.id === appId);
    if (!app) return;
    if (!p.isAdmin && !(p.isLeader && p.emprego === app.organizationId)) return notify("Você não pode analisar esta candidatura.", "bad");
    if (!offlineRef.current && db) {
      const ref = doc(db, COL.applications, appId);
      await updateDoc(ref, { status: approved ? "approved" : "rejected", reviewedBy: p.uid, reviewedAt: Date.now() }).catch(() => undefined);
      if (approved) {
        const job = JOBS.find((j) => j.id === app.organizationId);
        if (job) {
          await updateDoc(doc(db, COL.users, app.userId), {
            emprego: job.id, organizationId: job.id, patente: job.ranks[0].nome, isLeader: false, lastSalary: 0, joinedAt: Date.now(),
          }).catch(() => undefined);
        }
      }
    } else {
      setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: approved ? "approved" : "rejected" } : a));
      if (approved) {
        const job = JOBS.find((j) => j.id === app.organizationId);
        if (job) setOthers((prev) => prev.map((o) => o.uid === app.userId ? { ...o, emprego: job.id, organizationId: job.id, patente: job.ranks[0].nome } : o));
      }
    }
    notify(approved ? `✅ ${app.userNome} foi aceito!` : `❌ Candidatura de ${app.userNome} recusada.`, approved ? "ok" : "warn");
  }, [applications, notify]);

  /** Jogador cancela a própria candidatura pendente */
  const cancelApplication = useCallback(async (appId: string) => {
    const p = playerRef.current; if (!p) return;
    const app = applications.find((a) => a.id === appId);
    if (!app) return;
    if (app.userId !== p.uid) return notify("Você só pode cancelar suas próprias candidaturas.", "bad");
    if (app.status !== "pending") return notify("Esta candidatura já foi processada.", "info");
    if (!offlineRef.current && db) {
      await updateDoc(doc(db, COL.applications, appId), { status: "rejected", reviewedBy: p.uid, reviewedAt: Date.now() }).catch(() => undefined);
    } else {
      setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: "rejected" as const } : a));
    }
    notify("📋 Candidatura cancelada.", "warn");
  }, [applications, notify]);

  /** Líder demite um membro da sua corporação */
  const fireFromOrg = useCallback(async (targetUid: string) => {
    const p = playerRef.current; if (!p) return;
    if (!p.isAdmin && !p.isLeader) return notify("Sem permissão.", "bad");
    const alvo = directory.find((m) => m.uid === targetUid);
    if (!alvo) return notify("Membro não encontrado.", "bad");
    if (!p.isAdmin && alvo.emprego !== p.emprego) return notify("Você só pode demitir membros da sua corporação.", "bad");
    if (alvo.uid === p.uid) return notify("Você não pode demitir a si mesmo.", "bad");
    const data = { emprego: "desempregado", organizationId: "", patente: "Civil", isLeader: false };
    if (!offlineRef.current && db) {
      await updateDoc(doc(db, COL.users, targetUid), data).catch(() => undefined);
    } else {
      setOthers((prev) => prev.map((o) => o.uid === targetUid ? { ...o, ...data } as PlayerData : o));
    }
    notify(`🚪 ${alvo.nome} foi demitido da corporação.`, "warn");
  }, [directory, notify]);

  const quitJob = useCallback(() => {
    patch({ emprego: "desempregado", organizationId: "", patente: "Civil", isLeader: false });
    notify("Você pediu demissão.", "warn");
  }, [patch, notify]);

  const setPlayerJob = useCallback(async (targetUid: string, jobId: string, patente: string) => {
    const actor = playerRef.current;
    if (!actor) return;
    // Líder só pode gerenciar membros da PRÓPRIA corporação
    if (!actor.isAdmin) {
      if (!actor.isLeader) return notify("Você não tem permissão para alterar cargos.", "bad");
      // Verifica se o alvo pertence à corporação do líder OU se está sendo recrutado para ela
      const alvo = directory.find((m) => m.uid === targetUid);
      const alvoNaCorporacao = alvo?.emprego === actor.emprego;
      const recrutandoParaMinha = jobId === actor.emprego;
      const demitindoDaMinha = jobId === "desempregado" && alvoNaCorporacao;
      if (!alvoNaCorporacao && !recrutandoParaMinha && !demitindoDaMinha) {
        return notify("Você só pode gerenciar membros da sua própria corporação.", "bad");
      }
    }
    const leader = isLeaderRank(jobId, patente);
    const data: Record<string, unknown> = { emprego: jobId, organizationId: jobId, patente, isLeader: leader };
    if (jobId === "desempregado") { data.organizationId = ""; data.patente = "Civil"; data.isLeader = false; }
    if (offlineRef.current || !db) { setOthers((list) => list.map((o) => (o.uid === targetUid ? { ...o, ...data } as PlayerData : o))); notify("Alteração local aplicada.", "ok"); return; }
    try { await updateDoc(doc(db, COL.users, targetUid), data); notify(`Cargo atualizado para ${patente}.`, "ok"); } catch { notify("Sem permissão.", "bad"); }
  }, [notify]);

  const buyProperty = useCallback(async (key: string, useCredit = false) => {
    const p = playerRef.current; if (!p) return;
    const [xs, ys] = key.split("_"); const def = getProperty(Number(xs), Number(ys));
    if (p.propriedadesCompradas?.includes(def.id)) return notify("Já é seu!", "info");
    // valida crédito ANTES de reservar a propriedade
    if (useCredit) {
      const negativo = p.saldoCarteira < 0 || p.saldoBanco < 0;
      if (!p.cartaoCredito) return notify("Você ainda não possui Cartão de Crédito.", "bad");
      if (negativo) return notify("❌ Cartão bloqueado devido a saldo negativado. Quite sua dívida primeiro.", "bad");
      const imposto = Math.ceil(def.preco * 0.02);
      const disponivel = (p.cartaoLimite || 0) - (p.cartaoFatura || 0);
      if (disponivel < def.preco + imposto) return notify("❌ Saldo de crédito insuficiente. O banco negou a compra.", "bad");
    } else {
      const total = p.saldoCarteira + p.saldoBanco;
      if (total < def.preco) return notify(`Precisa de R$ ${def.preco.toLocaleString("pt-BR")}.`, "bad");
    }
    // reserva na coleção properties
    if (!offlineRef.current && db) {
      try { await runTransaction(db, async (tx) => {
        const ref = doc(db!, COL.properties, def.id); const snap = await tx.get(ref);
        const owner = snap.exists() ? (snap.data() as PropertyDoc).ownerUid : null;
        if (owner && owner !== p.uid) throw new Error("vendido");
        tx.set(ref, { ownerUid: p.uid, ownerNome: p.nome, preco: def.preco, nome: def.nome, boughtAt: Date.now() });
      }); } catch (e) { return notify((e as Error).message === "vendido" ? "Vendido para outro!" : "Erro na compra.", "bad"); }
    } else { setProperties((prev) => ({ ...prev, [def.id]: { id: def.id, ownerUid: p.uid, ownerNome: p.nome, preco: def.preco, boughtAt: Date.now() } })); }
    // paga (à vista OU crédito com 2%)
    const r = chargePayment(def.preco, `Imóvel ${def.nome}`, { credit: useCredit });
    patch({ propriedadesCompradas: [...(p.propriedadesCompradas ?? []), def.id] });
    if (!useCredit && r.ok) notify(`🏠 ${def.nome} é sua! -R$ ${def.preco.toLocaleString("pt-BR")}`, "money");
    else if (useCredit) notify(`🏠 ${def.nome} adquirida no crédito!`, "money");
  }, [patch, notify, chargePayment]);

  const sellProperty = useCallback(async (propId: string, valor: number) => {
    const p = playerRef.current; if (!p) return;
    const property = properties[propId];
    if (!property || property.ownerUid !== p.uid) return notify("Apenas o proprietário pode vender este imóvel.", "bad");
    const imposto = Math.floor(valor * 0.2);
    const retorno = valor - imposto;
    if (!offlineRef.current && db) { await setDoc(doc(db, COL.properties, propId), { ownerUid: null, ownerNome: null, preco: valor, boughtAt: null, locked: false, furniture: {} }).catch(() => undefined); }
    else { setProperties((prev) => ({ ...prev, [propId]: { id: propId, ownerUid: null, ownerNome: null, preco: valor, boughtAt: null, locked: false, furniture: {} } })); }
    patch({
      saldoBanco: p.saldoBanco + retorno,
      propriedadesCompradas: (p.propriedadesCompradas ?? []).filter((i) => i !== propId),
      currentHouseId: p.currentHouseId === propId ? "" : p.currentHouseId,
    });
    await treasuryMove({
      tipo: "imposto",
      org: "imobiliario",
      valor: imposto,
      desc: `Taxa imobiliária de 20% · venda ${propId}`,
      playerUid: p.uid,
      playerNome: p.nome,
    });
    logTransaction({ to: p.uid, toNome: p.nome, tipo: "compra", valor: retorno, desc: `Venda de imóvel · líquido após taxa de R$ ${imposto.toLocaleString("pt-BR")}` });
    notify(`🏠 Imóvel vendido: R$ ${retorno.toLocaleString("pt-BR")} no banco · R$ ${imposto.toLocaleString("pt-BR")} ao Governo.`, "money");
  }, [patch, notify, properties, treasuryMove, logTransaction]);

  const saveMapCells = useCallback(async (scene: SceneId, cells: MapEditCells) => {
    setEdits((prev) => { const next = { ...prev, [scene]: { ...(prev[scene] ?? {}), ...cells } }; if (offlineRef.current) localStorage.setItem(LS_MAP, JSON.stringify(next)); return next; });
    if (offlineRef.current || !db) return;
    const payload: Record<string, unknown> = {}; for (const k of Object.keys(cells)) payload[`cells.${k}`] = cells[k];
    const ref = doc(db, COL.mapEdits, scene);
    try { await updateDoc(ref, { ...payload, updatedAt: Date.now(), updatedBy: playerRef.current?.nome ?? "?" }); }
    catch { await setDoc(ref, { cells, updatedAt: Date.now(), updatedBy: playerRef.current?.nome ?? "?" }, { merge: true }).catch(() => notify("Sem permissão.", "bad")); }
  }, [notify]);

  const clearMapEdits = useCallback(async (scene: SceneId) => {
    setEdits((prev) => { const next = { ...prev, [scene]: {} }; if (offlineRef.current) localStorage.setItem(LS_MAP, JSON.stringify(next)); return next; });
    if (offlineRef.current || !db) return;
    await setDoc(doc(db, COL.mapEdits, scene), { cells: {}, updatedAt: Date.now() }).catch(() => undefined);
    notify("Mapa restaurado.", "warn");
  }, [notify]);

  const grantAdmin = useCallback((code: string) => {
    if (code.trim() !== ADMIN_CODE) { notify("Código inválido.", "bad"); return false; }
    patch({ isAdmin: true }); notify("Admin liberado!", "ok"); return true;
  }, [patch, notify]);

  const changeScene = useCallback((scene: SceneId, x: number, y: number) => { patch({ scene, x, y }); }, [patch]);

  const sendChat = useCallback(async (text: string) => {
    const p = playerRef.current; const t = text.trim().slice(0, 120); if (!p || !t) return;
    const msg: ChatMsg = { id: `local-${Date.now()}`, uid: p.uid, nome: p.nome, text: t, ts: Date.now(), patente: p.patente };
    patch({ chat: { text: t, ts: Date.now() } });
    if (offlineRef.current || !db) { setChat((c) => [...c.slice(-39), msg]); return; }
    await addDoc(collection(db, COL.chat), { uid: p.uid, nome: p.nome, text: t, ts: Date.now(), patente: p.patente }).catch(() => setChat((c) => [...c.slice(-39), msg]));
  }, [patch]);

  const logAdmin = useCallback((action: string, target: string, data?: unknown) => {
    const p = playerRef.current; if (!p || offlineRef.current || !db) return;
    addDoc(collection(db, COL.adminLogs), { adminId: p.uid, adminNome: p.nome, action, target, data: data ?? null, timestamp: Date.now() }).catch(() => undefined);
  }, []);

  const transferByRG = useCallback(async (rg: string, amount: number) => {
    const p = playerRef.current; if (!p) return;
    if (amount <= 0) return notify("Valor inválido.", "bad");
    if (p.saldoBanco < amount) return notify("Saldo bancário insuficiente.", "bad");
    if (rg === p.rg) return notify("Você não pode transferir para si mesmo.", "bad");
    if (!offlineRef.current && db) {
      try {
        const q = await getDocs(query(collection(db, COL.users), where("rg", "==", rg.trim().toUpperCase()), limit(1)));
        if (q.empty) return notify("Nenhum cidadão encontrado com este RG.", "bad");
        const target = q.docs[0];
        const tdata = target.data() as PlayerData;
        const fromRef = doc(db, COL.users, p.uid);
        const toRef = doc(db, COL.users, target.id);
        await runTransaction(db, async (tx) => {
          const [fromSnap, toSnap] = await Promise.all([tx.get(fromRef), tx.get(toRef)]);
          const fromBalance = (fromSnap.data() as PlayerData | undefined)?.saldoBanco ?? 0;
          const toBalance = (toSnap.data() as PlayerData | undefined)?.saldoBanco ?? 0;
          if (fromBalance < amount) throw new Error("saldo");
          tx.update(fromRef, { saldoBanco: fromBalance - amount });
          tx.update(toRef, { saldoBanco: toBalance + amount });
        });
        const next = { ...p, saldoBanco: p.saldoBanco - amount };
        playerRef.current = next;
        setPlayer(next);
        logTransaction({ from: p.uid, fromNome: p.nome, to: target.id, toNome: tdata.nome, tipo: "transferencia", valor: amount, desc: `Para ${tdata.nome} (${rg})` });
        notify(`💸 Transferência de R$ ${amount.toLocaleString("pt-BR")} para ${tdata.nome} (${rg})!`, "money");
      } catch { notify("Erro ao transferir.", "bad"); }
    } else {
      const target = directory.find((o) => o.rg === rg.trim().toUpperCase());
      if (!target) return notify("Nenhum cidadão online com este RG.", "bad");
      patch({ saldoBanco: p.saldoBanco - amount });
      setOthers((prev) => prev.map((o) => o.uid === target.uid ? { ...o, saldoBanco: (o.saldoBanco || 0) + amount } : o));
      logTransaction({ from: p.uid, fromNome: p.nome, to: target.uid, toNome: target.nome, tipo: "transferencia", valor: amount, desc: `Para ${target.nome} (${rg})` });
      notify(`💸 Transferência local para ${target.nome}.`, "money");
    }
  }, [patch, notify, logTransaction, directory]);

  const requestCreditCard = useCallback(() => {
    const p = playerRef.current; if (!p) return;
    if (p.cartaoCredito) return notify("Você já possui Cartão de Crédito.", "info");
    if (p.nivel < 3) return notify("Nível mínimo 3 para solicitar o Cartão.", "bad");
    patch({ cartaoCredito: true, cartaoLimite: 5000 });
    logTransaction({ from: p.uid, fromNome: p.nome, tipo: "credito", valor: 0, desc: "Cartão de Crédito emitido — limite R$ 5.000" });
    notify("💳 Cartão de Crédito emitido! Limite R$ 5.000.", "ok");
  }, [patch, notify, logTransaction]);

  const payBill = useCallback((amount: number, description: string) => {
    const p = playerRef.current; if (!p) return;
    if (amount <= 0) return notify("Valor inválido.", "bad");
    if (p.saldoBanco < amount) return notify("Saldo bancário insuficiente.", "bad");
    patch({ saldoBanco: p.saldoBanco - amount });
    logTransaction({ from: p.uid, fromNome: p.nome, tipo: "compra", valor: amount, desc: description.trim() || "Pagamento de conta" });
    notify(`Conta paga: R$ ${amount.toLocaleString("pt-BR")}.`, "money");
  }, [patch, notify, logTransaction]);

  /* ═══════════════ COFRE NACIONAL ═══════════════ */

  /** Admin: deposita (ou retira, se negativo) no Cofre Nacional. */
  const treasuryDeposit = useCallback(async (valor: number, desc: string) => {
    const p = playerRef.current;
    if (!p || !p.isAdmin) return notify("Sem permissão.", "bad");
    if (!valor) return notify("Informe um valor.", "warn");
    const ok = await treasuryMove({
      tipo: valor > 0 ? "deposito" : "ajuste",
      valor,
      desc: desc.trim() || (valor > 0 ? "Depósito administrativo" : "Retirada administrativa"),
      playerUid: p.uid,
      playerNome: p.nome,
    });
    if (ok) {
      logAdmin("treasuryDeposit", "national", { valor, desc });
      notify(`🏛 Cofre Nacional ${valor > 0 ? "+" : ""}R$ ${valor.toLocaleString("pt-BR")}`, "money");
    }
  }, [notify, treasuryMove, logAdmin]);

  /** Admin: ajusta a taxa (%) por ciclo e o acúmulo máximo de horas. */
  const treasurySetConfig = useCallback(async (taxaServico: number, maxCiclos: number) => {
    const p = playerRef.current;
    if (!p || !p.isAdmin) return notify("Sem permissão.", "bad");
    const cfg = { taxaServico: Math.max(0, taxaServico), maxCiclos: Math.max(1, Math.round(maxCiclos)), updatedAt: Date.now() };
    if (!offlineRef.current && db) {
      await setDoc(doc(db, COL.treasury, "national"), cfg, { merge: true }).catch(() => notify("Erro ao salvar.", "bad"));
      logAdmin("treasuryConfig", "national", cfg);
    } else setTreasury((prev) => ({ ...prev, ...cfg }));
    notify("Regras do Cofre Nacional atualizadas.", "ok");
  }, [notify, logAdmin]);

  /** Jogador quita a conta de serviços — o valor entra no Cofre Nacional. */
  const payServiceBill = useCallback(async () => {
    const p = playerRef.current; if (!p) return;
    const valor = p.contaServicoAcumulada || 0;
    if (valor <= 0) return notify("✅ Você já está em dia com o Governo.", "ok");
    if (p.saldoBanco < valor) return notify(`Saldo bancário insuficiente (precisa de R$ ${valor.toLocaleString("pt-BR")}).`, "bad");
    patch({
      saldoBanco: p.saldoBanco - valor,
      contaServicoAcumulada: 0,
      contaServicoCiclos: 0,
      ultimaCobranca: Date.now(),
    });
    await treasuryMove({
      tipo: "imposto",
      org: p.emprego !== "desempregado" ? p.emprego : undefined,
      valor,
      desc: `Conta de serviços · ${p.nome} (${p.rg})`,
      playerUid: p.uid,
      playerNome: p.nome,
    });
    logTransaction({ from: p.uid, fromNome: p.nome, tipo: "compra", valor, desc: "Conta de serviços · Cofre Nacional" });
    notify("✅ Em dia com o Governo! Obrigado por contribuir.", "money");
  }, [patch, notify, treasuryMove, logTransaction]);

  /** Ciclo horário: acumula a conta de serviços (1% do patrimônio líquido por hora). */
  const processServiceBill = useCallback(() => {
    const p = playerRef.current; if (!p) return;
    const HOUR = 3600000;
    const now = Date.now();
    // primeira execução: apenas marca o início do ciclo
    if (!p.ultimaCobranca) { patch({ ultimaCobranca: now }); return; }
    const elapsed = now - p.ultimaCobranca;
    if (elapsed < HOUR) return;

    const maxCiclos = treasury.maxCiclos || 6;
    const jaAcumulado = p.contaServicoCiclos || 0;
    if (jaAcumulado >= maxCiclos) { patch({ ultimaCobranca: now }); return; }

    const decorridos = Math.floor(elapsed / HOUR);
    const novos = Math.min(maxCiclos - jaAcumulado, decorridos);
    const patrimonio = Math.max(0, calculatePatrimony(p, properties));
    const porCiclo = Math.ceil(patrimonio * ((treasury.taxaServico || 1) / 100));
    if (porCiclo <= 0 || novos <= 0) { patch({ ultimaCobranca: now }); return; }

    const cobranca = porCiclo * novos;
    patch({
      contaServicoAcumulada: (p.contaServicoAcumulada || 0) + cobranca,
      contaServicoCiclos: jaAcumulado + novos,
      ultimaCobranca: now,
    });
    notify(`🏛 Conta de serviços: +R$ ${cobranca.toLocaleString("pt-BR")} (${novos}h)`, "warn");
  }, [patch, notify, treasury.maxCiclos, treasury.taxaServico, properties]);

  const adminSetUniform = useCallback(async (jobId: string, rankId: string, uniform: Uniform) => {
    const p = playerRef.current;
    if (!p || (!p.isAdmin && !(p.isLeader && p.emprego === jobId))) return notify("Sem permissão.", "bad");
    const next: OrgConfig = { ...(orgConfigs[jobId] ?? {}), uniforms: { ...(orgConfigs[jobId]?.uniforms ?? {}), [rankId]: uniform } };
    if (!offlineRef.current && db) { await setDoc(doc(db, COL.organizations, jobId), next, { merge: true }).catch(() => notify("Erro ao salvar.", "bad")); logAdmin("setUniform", jobId, { rankId, uniform }); }
    else setOrgConfigs((prev) => ({ ...prev, [jobId]: next }));
    notify("Farda da patente atualizada.", "ok");
  }, [orgConfigs, notify, logAdmin]);

  const findUserByRG = useCallback((rg: string) => {
    const all = [playerRef.current, ...others].filter(Boolean) as PlayerData[];
    return all.find((u) => u.rg === rg.trim().toUpperCase()) ?? null;
  }, [others]);

  /* AMIGOS & MENSAGENS PRIVADAS */
  const addFriendByRG = useCallback(async (rg: string) => {
    const p = playerRef.current; if (!p) return;
    const clean = rg.trim().toUpperCase();
    if (!clean) return notify("Informe um RG.", "warn");
    if (clean === p.rg) return notify("Você não pode adicionar a si mesmo.", "warn");
    let targetUid: string | null = null;
    if (!offlineRef.current && db) {
      const q = await getDocs(query(collection(db, COL.users), where("rg", "==", clean), limit(1))).catch(() => null);
      if (q && !q.empty) targetUid = q.docs[0].id;
    } else {
      targetUid = directory.find((o) => o.rg === clean)?.uid ?? null;
    }
    if (!targetUid) return notify("Nenhum cidadão encontrado com este RG.", "bad");
    const amigos = [...(p.amigos ?? [])];
    if (amigos.includes(targetUid)) return notify("Este cidadão já está nos seus contatos.", "info");
    amigos.push(targetUid);
    patch({ amigos });
    notify("📱 Contato adicionado!", "ok");
  }, [patch, notify, directory]);

  const removeFriend = useCallback((uid: string) => {
    const p = playerRef.current; if (!p) return;
    patch({ amigos: (p.amigos ?? []).filter((a) => a !== uid) });
    notify("Contato removido.", "warn");
  }, [patch, notify]);

  const sendDM = useCallback(async (toUid: string, text: string) => {
    const p = playerRef.current; const t = text.trim().slice(0, 200);
    if (!p || !t) return;
    const msg: Omit<DirectMsg, "id"> = { participants: [p.uid, toUid], from: p.uid, fromNome: p.nome, to: toUid, text: t, ts: Date.now() };
    if (offlineRef.current || !db) {
      setDms((prev) => [...prev, { ...msg, id: `local-${Date.now()}` }]);
      return;
    }
    await addDoc(collection(db, COL.dms), msg).catch(() => notify("Falha ao enviar a mensagem.", "bad"));
  }, [notify]);

  /* CASAS: TRANCA E MOBÍLIA */
  const toggleHouseLock = useCallback(async (propId: string) => {
    const p = playerRef.current; if (!p) return;
    const prop = properties[propId];
    if (!prop || prop.ownerUid !== p.uid) return notify("Apenas o proprietário pode trancar/destrancar.", "bad");
    const locked = !prop.locked;
    setProperties((prev) => ({ ...prev, [propId]: { ...prev[propId], locked } }));
    if (!offlineRef.current && db) await setDoc(doc(db, COL.properties, propId), { locked }, { merge: true }).catch(() => undefined);
    notify(locked ? "🔒 Casa trancada." : "🔓 Casa destrancada — visitas liberadas.", locked ? "warn" : "ok");
  }, [properties, notify]);

  const saveHouseFurniture = useCallback(async (propId: string, cells: Record<string, string>) => {
    const p = playerRef.current; if (!p) return;
    const prop = properties[propId];
    if (!prop || prop.ownerUid !== p.uid) return notify("Apenas o proprietário pode decorar esta casa.", "bad");
    const furniture = { ...(prop.furniture ?? {}), ...cells };
    for (const k of Object.keys(furniture)) { if (furniture[k] === "") delete furniture[k]; }
    setProperties((prev) => ({ ...prev, [propId]: { ...prev[propId], furniture } }));
    if (!offlineRef.current && db) await setDoc(doc(db, COL.properties, propId), { furniture }, { merge: true }).catch(() => undefined);
  }, [properties, notify]);

  const kickHouseGuest = useCallback(async (propId: string, targetUid: string) => {
    const p = playerRef.current; if (!p) return;
    const property = properties[propId];
    if (!property || property.ownerUid !== p.uid) return notify("Apenas o anfitrião pode expulsar visitantes.", "bad");
    const guest = directory.find((member) => member.uid === targetUid);
    if (!guest || guest.currentHouseId !== propId) return notify("Este cidadão não está na sua casa.", "warn");
    const data = { scene: "city" as SceneId, x: 520, y: 330, currentHouseId: "" };
    if (!offlineRef.current && db) await updateDoc(doc(db, COL.users, targetUid), data).catch(() => undefined);
    setOthers((prev) => prev.map((member) => member.uid === targetUid ? { ...member, ...data } : member));
    notify(`🚪 ${guest.nome} foi expulso da residência.`, "warn");
  }, [properties, directory, notify]);

  /* SISTEMA DE COMBATE, HP E HOSPITAL */
  const setComa = useCallback(async (uid: string, fim: number) => {
    if (!offlineRef.current && db) {
      await updateDoc(doc(db, COL.users, uid), { coma: { ativo: true, fim }, saude: 0, scene: "house", x: 300, y: 200 }).catch(() => undefined);
    } else {
      setOthers((prev) => prev.map((o) => o.uid === uid ? { ...o, coma: { ativo: true, fim }, saude: 0 } as PlayerData : o));
    }
  }, []);

  const sendToHospital = useCallback(async (uid: string) => {
    const me = auth?.currentUser?.uid;
    // spawn no centro do hospital (16*16+8=264, 14*16+8=232)
    const hx = 264;
    const hy = 232;
    if (!offlineRef.current && db) {
      await updateDoc(doc(db, COL.users, uid), { scene: "hospital", x: hx, y: hy, saude: 40, coma: null }).catch(() => undefined);
    } else {
      setOthers((prev) => prev.map((o) => o.uid === uid ? { ...o, scene: "hospital", x: hx, y: hy, saude: 40, coma: null } as PlayerData : o));
    }
    if (me === uid) {
      const p = playerRef.current;
      if (p) {
        // Taxa médica R$ 10 — tenta banco → carteira → crédito → negativar banco
        const taxa = 10;
        let metodo = "";
        if (p.saldoBanco >= taxa) {
          patch({ saldoBanco: p.saldoBanco - taxa });
          metodo = "banco";
        } else if (p.saldoCarteira >= taxa) {
          patch({ saldoCarteira: p.saldoCarteira - taxa });
          metodo = "carteira";
        } else if (p.cartaoCredito && (p.cartaoLimite - (p.cartaoFatura || 0)) >= taxa) {
          patch({ cartaoFatura: (p.cartaoFatura || 0) + taxa });
          metodo = "crédito";
        } else {
          // negativar o banco
          patch({ saldoBanco: p.saldoBanco - taxa });
          metodo = "banco (negativado)";
        }
        logTransaction({ from: p.uid, fromNome: p.nome, tipo: "compra", valor: taxa, desc: `Taxa médica hospitalar (${metodo})` });
      }
      patch({ scene: "hospital", x: hx, y: hy, saude: 40, coma: null, currentHouseId: "" });
      notify("🏥 Você foi atendido no Hospital. Taxa médica: R$ 10.", "warn");
    }
  }, [patch, notify, logTransaction]);

  /** Chamado quando o próprio jogador morre — cobra R$10 e teleporta para o hospital */
  const hospitalPay = useCallback(() => {
    const p = playerRef.current; if (!p) return;
    sendToHospital(p.uid);
  }, [sendToHospital]);

  /** Quita a fatura do cartão: valor + 10% de juros. Aceita origem do banco (padrão) ou carteira. */
  const payCardBill = useCallback((fromBank = true) => {
    const p = playerRef.current; if (!p) return;
    const fatura = p.cartaoFatura || 0;
    if (fatura <= 0) return notify("Sua fatura está zerada.", "info");
    const juros = Math.ceil(fatura * 0.10);
    const total = fatura + juros;
    const saldo = fromBank ? p.saldoBanco : p.saldoCarteira;
    if (saldo < total) return notify(`Saldo insuficiente para quitar (R$ ${total.toLocaleString("pt-BR")} com juros).`, "bad");
    const upd: Partial<PlayerData> = { cartaoFatura: 0 };
    if (fromBank) upd.saldoBanco = p.saldoBanco - total;
    else upd.saldoCarteira = p.saldoCarteira - total;
    patch(upd);
    logTransaction({ from: p.uid, fromNome: p.nome, tipo: "credito", valor: total, desc: `Fatura do cartão (R$ ${fatura} + R$ ${juros} juros)` });
    // Juros do cartão vão para o Cofre Nacional
    treasuryMove({
      tipo: "imposto",
      org: "cartao_credito",
      valor: juros,
      desc: `Juros do cartão · ${p.nome} (${p.rg})`,
      playerUid: p.uid,
      playerNome: p.nome,
    });
    notify(`💳 Fatura quitada: R$ ${fatura.toLocaleString("pt-BR")} + R$ ${juros} de juros → Cofre.`, "money");
  }, [patch, notify, logTransaction, treasuryMove]);

  const applyDamage = useCallback(async (targetUid: string, amount: number) => {
    const p = playerRef.current; if (!p) return;
    if (amount <= 0) return;
    if (!offlineRef.current && db && targetUid !== p.uid) {
      try {
        const ref = doc(db, COL.users, targetUid);
        const snap = await getDoc(ref);
        const td = snap.data() as PlayerData;
        const newHp = Math.max(0, (td.saude ?? 100) - amount);
        const data: Record<string, unknown> = { saude: newHp };
        if (newHp <= 0) data.coma = { ativo: true, fim: Date.now() + 60000 };
        await updateDoc(ref, data);
        if (newHp <= 0) notify(`💥 ${td.nome} entrou em coma!`, "bad");
      } catch { /* */ }
      return;
    }
    if (targetUid === p.uid) {
      const newHp = Math.max(0, p.saude - amount);
      const data: Partial<PlayerData> = { saude: newHp };
      if (newHp <= 0) data.coma = { ativo: true, fim: Date.now() + 60000 };
      patch(data);
      return;
    }
    setOthers((prev) => prev.map((o) => o.uid === targetUid ? { ...o, saude: Math.max(0, (o.saude ?? 100) - amount) } as PlayerData : o));
  }, [patch, notify]);

  const healPlayer = useCallback((amount: number) => {
    const p = playerRef.current; if (!p) return;
    patch({ saude: Math.min(100, p.saude + amount), coma: null });
    notify(`❤️ +${amount} de saúde.`, "ok");
  }, [patch, notify]);

  /* LOJA DE ROUPAS CUSTOMIZÁVEIS */
  const addClothing = useCallback(async (nome: string, preco: number, cor: string, colete?: string, capacete?: string) => {
    const p = playerRef.current; if (!p || !p.isAdmin) return notify("Sem permissão.", "bad");
    if (!nome.trim()) return notify("Dê um nome à roupa.", "warn");
    if (!offlineRef.current && db) {
      try {
        const ref = doc(collection(db, COL.clothing));
        await setDoc(ref, { nome: nome.trim(), preco: Math.max(0, Math.round(preco)), cor, corColetes: colete, capacete, criadoPor: p.nome, criadoEm: Date.now() });
        logAdmin("createClothing", ref.id, { nome, preco, cor });
        notify(`👕 Roupa "${nome.trim()}" cadastrada!`, "ok");
      } catch { notify("Erro ao cadastrar.", "bad"); }
    } else {
      setClothingItems((prev) => [...prev, { id: `local-${Date.now()}`, nome: nome.trim(), preco, cor: cor, corColetes: colete, capacete, criadoPor: p.nome, criadoEm: Date.now() }]);
      notify("👕 Roupa cadastrada (local).", "ok");
    }
  }, [notify, logAdmin]);

  /** Cadastra uma camisa nova completa (com modelo, categoria de gênero e imagem opcional) */
  const addClothingV2 = useCallback(async (data: { nome: string; preco: number; cor: string; camisaModelo?: ShirtStyle; genero?: Sexo | "unissex"; image?: string; imageTransform?: ShirtArtTransform }) => {
    const p = playerRef.current; if (!p || !p.isAdmin) return notify("Sem permissão.", "bad");
    if (!data.nome.trim()) return notify("Dê um nome à roupa.", "warn");
    const docData = {
      nome: data.nome.trim(),
      preco: Math.max(0, Math.round(data.preco)),
      cor: data.cor,
      camisaModelo: data.camisaModelo ?? "camiseta",
      genero: data.genero ?? "unissex",
      image: data.image ?? "",
      imageTransform: { ...DEFAULT_SHIRT_ART_TRANSFORM, ...(data.imageTransform ?? {}) },
      criadoPor: p.nome,
      criadoEm: Date.now(),
    };
    if (!offlineRef.current && db) {
      try {
        const ref = doc(collection(db, COL.clothing));
        await setDoc(ref, docData);
        logAdmin("createClothingV2", ref.id, docData);
        notify(`👕 Camisa "${data.nome.trim()}" cadastrada com pré-visualização!`, "ok");
      } catch { notify("Erro ao cadastrar.", "bad"); }
    } else {
      setClothingItems((prev) => [...prev, { id: `local-${Date.now()}`, ...docData }]);
      notify("👕 Roupa cadastrada (local).", "ok");
    }
  }, [notify, logAdmin]);

  const updateClothing = useCallback(async (id: string, data: Partial<ClothingItem>) => {
    const p = playerRef.current; if (!p || !p.isAdmin) return notify("Sem permissão.", "bad");
    if (!offlineRef.current && db) {
      try {
        await setDoc(doc(db, COL.clothing, id), { ...data, atualizadoPor: p.nome, atualizadoEm: Date.now() }, { merge: true });
        logAdmin("updateClothing", id, data);
        notify("👕 Camisa atualizada!", "ok");
      } catch { notify("Erro ao atualizar a camisa.", "bad"); }
    } else {
      setClothingItems((prev) => prev.map((item) => item.id === id ? { ...item, ...data } : item));
      notify("👕 Camisa atualizada (local).", "ok");
    }
  }, [notify, logAdmin]);

  const deleteClothing = useCallback(async (id: string) => {
    const p = playerRef.current; if (!p || !p.isAdmin) return notify("Sem permissão.", "bad");
    if (!offlineRef.current && db) {
      try {
        await setDoc(doc(db, COL.clothing, id), { deletado: true, deletadoPor: p.nome, deletadoEm: Date.now() }, { merge: true });
        logAdmin("deleteClothing", id);
        notify("👕 Camisa removida da loja.", "warn");
      } catch { notify("Erro ao excluir a camisa.", "bad"); }
    } else {
      setClothingItems((prev) => prev.filter((item) => item.id !== id));
      notify("👕 Camisa removida (local).", "warn");
    }
  }, [notify, logAdmin]);

  /**
   * WIPE TOTAL DO SERVIDOR (apenas Admin):
   * - Apaga TODOS os jogadores (docs de `users`) → todos, inclusive admins,
   *   criam conta do zero no próximo login (novo RG, novos saldos).
   * - Apaga transações, ledger do Cofre, candidaturas, RG registry, chat e DMs.
   * - Reseta o saldo do Cofre Nacional para 0.
   * - Libera todas as propriedades (sem dono).
   * - Mantém conteúdo: roupas, loja, organizações, mapa, objetos, letreiros.
   */
  const wipeAllData = useCallback(async () => {
    const p = playerRef.current;
    if (!p || !p.isAdmin) return notify("Sem permissão.", "bad");
    if (!db || offlineRef.current) return notify("Wipe disponível apenas com Firestore conectado.", "bad");

    const deleteAllIn = async (name: string) => {
      try {
        const snap = await getDocs(query(collection(db!, name)));
        const refs = snap.docs.map((d) => d.ref);
        for (let i = 0; i < refs.length; i += 20) {
          await Promise.all(refs.slice(i, i + 20).map((r) => deleteDoc(r).catch(() => undefined)));
        }
      } catch { /* ignore */ }
    };

    notify("⏳ Wipe total iniciado... Apagando contas e saldos.", "warn");
    try {
      // 1. Apagar todos os jogadores (contas)
      await deleteAllIn(COL.users);
      // 2. Dados econômicos e temporários
      await Promise.all([
        deleteAllIn(COL.transactions),
        deleteAllIn(COL.treasuryLedger),
        deleteAllIn(COL.applications),
        deleteAllIn(COL.rgRegistry),
        deleteAllIn(COL.chat),
        deleteAllIn(COL.dms),
      ]);
      // 3. Liberar propriedades (sem dono)
      const propSnap = await getDocs(query(collection(db, COL.properties))).catch(() => null);
      if (propSnap) {
        for (const d of propSnap.docs) {
          await setDoc(d.ref, { ownerUid: null, ownerNome: null, boughtAt: null, locked: false }, { merge: true }).catch(() => undefined);
        }
      }
      // 4. Zerar Cofre Nacional
      await setDoc(doc(db, COL.treasury, "national"), { saldo: 0, updatedAt: Date.now() }, { merge: true }).catch(() => undefined);

      // 5. Registro do wipe (auditoria — mantém adminLogs)
      await addDoc(collection(db, COL.adminLogs), {
        adminId: p.uid, adminNome: p.nome, action: "WIPE_TOTAL", target: "SERVER",
        data: { mensagem: "Todas as contas e saldos foram apagados. Todos precisam criar conta do zero." },
        timestamp: Date.now(),
      }).catch(() => undefined);

      // 6. Limpar estado local e deslogar (usuário atual também perdeu a conta)
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(LS_MAP);
      setPlayer(null);
      setOthers([]);
      setDirectory([]);
      setStatus("auth");
      if (auth) await signOut(auth).catch(() => undefined);
      notify("💥 Wipe concluído! Todas as contas foram zeradas. Crie uma conta nova para começar.", "ok");
    } catch (e) {
      console.warn("[PixelCity] wipe:", e);
      notify("Erro ao executar o Wipe. Tente novamente.", "bad");
    }
  }, [notify, logAdmin]);

  const buyClothing = useCallback((id: string, useCredit = false) => {
    const p = playerRef.current; const item = clothingItems.find((c) => c.id === id); if (!p || !item) return;
    const r = chargePayment(item.preco, `Roupa ${item.nome}`, { credit: useCredit });
    if (!r.ok) { notify(r.msg ?? "Falha na compra.", "bad"); return; }
    const inv = [...(p.inventario ?? [])];
    const idx = inv.findIndex((i) => i.id === `clothes_${item.id}`);
    if (idx >= 0) inv[idx] = { ...inv[idx], qtd: inv[idx].qtd + 1 }; else inv.push({ id: `clothes_${item.id}`, qtd: 1 });
    patch({ inventario: inv });
    if (!useCredit) notify(`👕 ${item.nome} comprada! Encontra no provador.`, "ok");
  }, [patch, notify, clothingItems, chargePayment]);

  const equipClothing = useCallback((id: string) => {
    /// a roupa é aplicada no sprite (engine usa getUniform; aqui marcamos a peça)
    const p = playerRef.current; if (!p) return;
    const clothing = clothingItems.find((c) => c.id === id) ?? { id, nome: "Roupa", preco: 0, cor: p.cor, corColetes: undefined, capacete: undefined };
    patch({
      roupaEquipada: clothing.id,
      cor: clothing.cor || p.cor,
      camisaModelo: clothing.camisaModelo ?? p.camisaModelo,
      inferiorModelo: clothing.inferiorModelo ?? p.inferiorModelo,
      calcaCor: clothing.calcaCor ?? p.calcaCor,
      sapatoModelo: clothing.sapatoModelo ?? p.sapatoModelo,
      sapatoCor: clothing.sapatoCor ?? p.sapatoCor,
    });
    notify(`👕 você vestiu ${clothing.nome}.`, "ok");
  }, [patch, notify, clothingItems]);

  /* DEBT SYSTEM — ADMIN */
  const adminSetDebt = useCallback(async (uid: string, campo: string, valor: number) => {
    const p = playerRef.current; if (!p || !p.isAdmin) return notify("Sem permissão.", "bad");
    if (!["cartaoFatura", "cartaoLimite", "dividaImovel", "debito", "cartaoManutencao"].includes(campo)) return;
    if (uid === p.uid) { patch({ [campo]: Math.max(0, valor) } as Partial<PlayerData>); return; }
    if (!offlineRef.current && db) {
      await updateDoc(doc(db, COL.users, uid), { [campo]: Math.max(0, valor) }).catch(() => undefined);
      logAdmin("setDebt", uid, { campo, valor });
      notify("Dívida/campo atualizado.", "ok");
    } else {
      setOthers((prev) => prev.map((o) => o.uid === uid ? { ...o, [campo]: Math.max(0, valor) } as PlayerData : o));
      notify("Atualizado (local).", "ok");
    }
  }, [patch, notify, logAdmin]);

  const adminSetPlayer = useCallback(async (uid: string, data: Partial<PlayerData>) => {
    const p = playerRef.current; if (!p || !p.isAdmin) return notify("Sem permissão.", "bad");
    if (uid === p.uid) { patch(data); return; }
    if (!offlineRef.current && db) {
      try { await updateDoc(doc(db, COL.users, uid), data as Record<string, unknown>); notify("Jogador alterado.", "ok"); } catch { notify("Erro ao alterar.", "bad"); }
      logAdmin("editPlayer", uid, data);
    } else { setOthers((prev) => prev.map((o) => o.uid === uid ? { ...o, ...data } as PlayerData : o)); notify("Alterado (local).", "ok"); }
  }, [patch, notify, logAdmin]);

  const adminBanPlayer = useCallback(async (targetUid: string, banido: boolean, motivo?: string) => {
    const p = playerRef.current; if (!p || !p.isAdmin) return notify("Sem permissão.", "bad");
    await adminSetPlayer(targetUid, { banido, banMotivo: motivo ?? "" });
    logAdmin(banido ? "ban" : "unban", targetUid, { motivo });
    notify(banido ? "🚫 Jogador banido." : "✅ Jogador desbanido.", banido ? "bad" : "ok");
  }, [adminSetPlayer, notify, logAdmin]);

  const adminTeleportPlayer = useCallback(async (targetUid: string, scene: SceneId, x: number, y: number) => {
    const p = playerRef.current; if (!p || !p.isAdmin) return notify("Sem permissão.", "bad");
    await adminSetPlayer(targetUid, { scene, x, y });
    logAdmin("teleport", targetUid, { scene, x, y });
    notify("🚀 Jogador teleportado.", "ok");
  }, [adminSetPlayer, notify, logAdmin]);

  const adminSetOrgSalary = useCallback(async (jobId: string, rankId: string, salario: number) => {
    const p = playerRef.current; if (!p || !p.isAdmin) return notify("Sem permissão.", "bad");
    const next: OrgConfig = { ...(orgConfigs[jobId] ?? {}), salaries: { ...(orgConfigs[jobId]?.salaries ?? {}), [rankId]: salario } };
    if (!offlineRef.current && db) { await setDoc(doc(db, COL.organizations, jobId), next, { merge: true }).catch(() => notify("Erro ao salvar.", "bad")); logAdmin("setSalary", jobId, { rankId, salario }); }
    else setOrgConfigs((prev) => ({ ...prev, [jobId]: next }));
    notify(`Salário de ${getJob(jobId)?.nome} atualizado.`, "ok");
  }, [orgConfigs, notify, logAdmin]);

  const adminSetRecruitRank = useCallback(async (jobId: string, rankIndex: number) => {
    const p = playerRef.current; if (!p || !p.isAdmin) return notify("Sem permissão.", "bad");
    const next: OrgConfig = { ...(orgConfigs[jobId] ?? {}), recruitMinRankIndex: rankIndex };
    if (!offlineRef.current && db) { await setDoc(doc(db, COL.organizations, jobId), next, { merge: true }).catch(() => notify("Erro ao salvar.", "bad")); logAdmin("setRecruitRank", jobId, { rankIndex }); }
    else setOrgConfigs((prev) => ({ ...prev, [jobId]: next }));
    notify("Permissão de recrutamento atualizada.", "ok");
  }, [orgConfigs, notify, logAdmin]);

  const adminSetItemPrice = useCallback(async (itemId: string, price: number) => {
    const p = playerRef.current; if (!p || !p.isAdmin) return notify("Sem permissão.", "bad");
    if (!offlineRef.current && db) { await setDoc(doc(db, COL.shopConfig, "prices"), { [itemId]: price }, { merge: true }).catch(() => notify("Erro ao salvar.", "bad")); logAdmin("setPrice", itemId, { price }); }
    else setPriceOverrides((prev) => ({ ...prev, [itemId]: price }));
    notify(`Preço de ${getItem(itemId)?.nome} atualizado.`, "ok");
  }, [notify, logAdmin]);

  const adminLogout = useCallback(async () => {
    patch({ isAdmin: false });
    notify("Modo administrador desativado.", "warn");
  }, [patch, notify]);

  const addCustomObject = useCallback(async (nome: string, image: string, w: number, h: number, preco: number, sellable: boolean) => {
    const p = playerRef.current; if (!p || !p.isAdmin) return notify("Sem permissão.", "bad");
    if (!nome.trim()) return notify("Dê um nome ao objeto.", "warn");
    if (!offlineRef.current && db) {
      try {
        const ref = doc(collection(db, COL.customObjects));
        const objId = customObjectId(ref.id);
        await setDoc(ref, { objId, nome: nome.trim(), image, w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)), preco: Math.max(0, Math.round(preco)), sellable, criadoPor: p.nome, criadoEm: Date.now() });
        logAdmin("createCustomObject", ref.id, { nome, w, h, preco, sellable });
        notify(`🎨 Objeto "${nome.trim()}" criado!`, "ok");
      } catch { notify("Erro ao criar o objeto.", "bad"); }
    } else {
      const id = `local-${Date.now()}`;
      setCustomObjects((prev) => [...prev, { id, objId: customObjectId(id), nome: nome.trim(), image, w, h, preco, sellable, criadoPor: p.nome, criadoEm: Date.now() }]);
      notify("🎨 Objeto criado (local).", "ok");
    }
  }, [notify, logAdmin]);

  const deleteCustomObject = useCallback(async (id: string) => {
    const p = playerRef.current; if (!p || !p.isAdmin) return notify("Sem permissão.", "bad");
    if (!offlineRef.current && db) {
      try { await setDoc(doc(db, COL.customObjects, id), { deletado: true, deletadoPor: p.nome, deletadoEm: Date.now() }, { merge: true }); logAdmin("deleteCustomObject", id); notify("Objeto removido.", "ok"); }
      catch { notify("Erro ao remover.", "bad"); }
    } else { setCustomObjects((prev) => prev.filter((o) => o.id !== id)); notify("Objeto removido (local).", "ok"); }
  }, [notify, logAdmin]);

  const buyCustomObject = useCallback((objId: number, preco: number, useCredit = false) => {
    const p = playerRef.current; if (!p) return;
    const obj = customObjects.find((o) => o.objId === objId);
    if (!obj) return notify("Objeto não encontrado.", "bad");
    if (!obj.sellable) return notify("Este objeto não está à venda.", "warn");
    const r = chargePayment(preco, `Objeto ${obj.nome}`, { credit: useCredit });
    if (!r.ok) { notify(r.msg ?? "Falha na compra.", "bad"); return; }
    const owned = [...(p.propriedadesCompradas ?? [])];
    owned.push(`obj_${objId}`);
    patch({ propriedadesCompradas: owned });
    if (!useCredit) notify(`🖼️ Você comprou "${obj.nome}"!`, "ok");
  }, [patch, notify, customObjects, chargePayment]);

  const placeSign = useCallback(async (scene: SceneId, x: number, y: number, text: string) => {
    const p = playerRef.current; if (!p || !p.isAdmin) return notify("Sem permissão.", "bad");
    const key = `${x}_${y}`;
    const t = text.trim().slice(0, 180);
    setSigns((prev) => ({ ...prev, [scene]: { ...(prev[scene] ?? {}), [key]: t } }));
    if (offlineRef.current || !db) return;
    const ref = doc(db, COL.signs, scene);
    try { await updateDoc(ref, { [`cells.${key}`]: t, updatedAt: Date.now() }).catch(() => setDoc(ref, { cells: { [key]: t }, updatedAt: Date.now() }, { merge: true })); }
    catch { /* */ }
    if (p.isAdmin) logAdmin("placeSign", scene, { key, text: t });
  }, [notify, logAdmin]);

  const removeSign = useCallback(async (scene: SceneId, x: number, y: number) => {
    const p = playerRef.current; if (!p || !p.isAdmin) return notify("Sem permissão.", "bad");
    const key = `${x}_${y}`;
    setSigns((prev) => {
      const cur = prev[scene] ?? {};
      const next = { ...cur }; delete next[key];
      return { ...prev, [scene]: next };
    });
    if (offlineRef.current || !db) return;
    const ref = doc(db, COL.signs, scene);
    try { await updateDoc(ref, { [`cells.${key}`]: "" }); } catch { /* */ }
  }, [notify]);

  const setLeader = useCallback(async (jobId: string, uid: string | null) => {
    const p = playerRef.current; if (!p || !p.isAdmin) return notify("Sem permissão.", "bad");
    // limpa líderes antigos da organização e define o novo
    const me = auth?.currentUser?.uid;
    // atualiza todos os jogadores online daquela organização: desmarca isLeader
    const updateList = (list: PlayerData[]) => list.map((o) => (o.emprego === jobId ? { ...o, isLeader: o.uid === uid } : o));
    if (!offlineRef.current && db) {
      const querySnap = query(collection(db, COL.users), limit(500));
      const all = await getDocs(querySnap).catch(() => null);
      if (all) {
        for (const d of all.docs) {
          const data = d.data() as PlayerData;
          if (data.emprego === jobId) {
            await updateDoc(doc(db, COL.users, d.id), { isLeader: false }).catch(() => undefined);
          }
        }
      }
      if (uid) {
        const job = getJob(jobId);
        const topRank = job?.ranks[job.ranks.length - 1];
        await updateDoc(doc(db, COL.users, uid), {
          emprego: jobId,
          organizationId: jobId,
          patente: topRank?.nome ?? "Líder",
          isLeader: true,
        }).catch(() => undefined);
      }
      await setDoc(doc(db, COL.organizations, jobId), { directorId: uid, updatedAt: Date.now() }, { merge: true }).catch(() => undefined);
      logAdmin("setLeader", jobId, { uid });
      notify(uid ? "Líder definido!" : "Líder removido.", "ok");
      if (me && me === uid) {
        const ranks = getJob(jobId)?.ranks ?? [];
        patch({ emprego: jobId, organizationId: jobId, patente: ranks[ranks.length - 1]?.nome ?? "Líder", isLeader: true });
      }
    } else {
      setOthers(updateList);
      notify("Líder definido (local).", "ok");
      if (me && me === uid) {
        const ranks = getJob(jobId)?.ranks ?? [];
        patch({ emprego: jobId, organizationId: jobId, patente: ranks[ranks.length - 1]?.nome ?? "Líder", isLeader: true });
      }
    }
  }, [notify, logAdmin, patch]);

  const adminSetEconomyConfig = useCallback(async (cfg: Partial<EconomyConfig>) => {
    const p = playerRef.current; if (!p || !p.isAdmin) return notify("Sem permissão.", "bad");
    const next = { ...economyConfig, ...cfg };
    if (!offlineRef.current && db) {
      await setDoc(doc(db, COL.shopConfig, "economy"), next, { merge: true }).catch(() => notify("Erro ao salvar.", "bad"));
      logAdmin("setEconomyConfig", "economy", cfg);
    } else {
      setEconomyConfig(next);
    }
    notify("Configurações econômicas salvas!", "ok");
  }, [economyConfig, notify, logAdmin]);

  const claimAuxilioGov = useCallback(async () => {
    const p = playerRef.current; if (!p) return;
    if (p.emprego !== "desempregado") return notify("O Auxílio é exclusivo para cidadãos desempregados.", "bad");
    if (!economyConfig.auxilioAtivo) return notify("O Auxílio do Governo está desativado no momento.", "warn");

    const valor = economyConfig.auxilioValor ?? 300;
    const intervaloMs = (economyConfig.auxilioIntervaloMinutos ?? 60) * 60 * 1000;
    const proximoDisponivel = (p.lastAuxilio || 0) + intervaloMs;
    if (Date.now() < proximoDisponivel) {
      const faltamMin = Math.ceil((proximoDisponivel - Date.now()) / 60000);
      return notify(`Próximo Auxílio disponível em ${faltamMin} minuto(s).`, "warn");
    }

    if (treasury.saldo < valor) {
      return notify("O Cofre Nacional não possui verba suficiente no momento.", "bad");
    }

    await treasuryMove({
      tipo: "gasto",
      org: "prefeitura",
      valor: -valor,
      desc: `Auxílio do Governo · ${p.nome} (${p.rg})`,
      playerUid: p.uid,
      playerNome: p.nome,
    });

    patch({
      saldoBanco: p.saldoBanco + valor,
      lastAuxilio: Date.now(),
    });

    logTransaction({
      to: p.uid,
      toNome: p.nome,
      tipo: "salario",
      valor,
      desc: "Auxílio do Governo (desempregado)",
    });

    notify(`🏛 Auxílio do Governo de R$ ${valor.toLocaleString("pt-BR")} depositado em sua conta bancária!`, "money");
  }, [notify, treasury.saldo, treasuryMove, patch, logTransaction, economyConfig]);

  const value = useMemo<GameCtxValue>(() => ({
    status, offline, authError, busy, player, others, directory, chat, properties, edits, applications, orgConfigs, priceOverrides,
    customObjects, signs, transactions, toasts, notify,
    login, register, guest, logout, patch, syncPosition, changeScene, addXp, addMoney, deposit, withdraw,
    buyItem, useItem, equipSlot, useHotbarSlot, collectSalary, applyForJob, cancelApplication, reviewApplication, fireFromOrg, quitJob, setPlayerJob, buyProperty,
    sellProperty, saveMapCells, clearMapEdits, grantAdmin, sendChat, adminSetPlayer, adminBanPlayer, adminTeleportPlayer,
    adminSetOrgSalary, adminSetRecruitRank, adminSetItemPrice, adminLogout, addCustomObject, deleteCustomObject,
    buyCustomObject, placeSign, removeSign, setLeader, transferByRG, requestCreditCard, payBill, adminSetUniform, findUserByRG,
    dms, addFriendByRG, removeFriend, sendDM, toggleHouseLock, saveHouseFurniture, kickHouseGuest,
    applyDamage, healPlayer, sendToHospital, setComa, clothingItems, addClothing, addClothingV2, updateClothing, deleteClothing, wipeAllData, buyClothing, equipClothing, adminSetDebt,
    chargePayment, payCardBill, hospitalPay,
    treasury, treasuryLedger, payServiceBill, treasuryDeposit, treasurySetConfig,
    economyConfig, adminSetEconomyConfig, claimAuxilioGov,
  }), [status, offline, authError, busy, player, others, directory, chat, properties, edits, applications, orgConfigs, priceOverrides,
    customObjects, signs, transactions, clothingItems, toasts, notify,
    login, register, guest, logout, patch, syncPosition, changeScene, addXp, addMoney, deposit, withdraw,
    buyItem, useItem, equipSlot, useHotbarSlot, collectSalary, applyForJob, cancelApplication, reviewApplication, fireFromOrg, quitJob, setPlayerJob, buyProperty,
    sellProperty, saveMapCells, clearMapEdits, grantAdmin, sendChat, adminSetPlayer, adminBanPlayer, adminTeleportPlayer,
    adminSetOrgSalary, adminSetRecruitRank, adminSetItemPrice, adminLogout, addCustomObject, deleteCustomObject,
    buyCustomObject, placeSign, removeSign, setLeader, transferByRG, requestCreditCard, payBill, adminSetUniform, findUserByRG,
    dms, addFriendByRG, removeFriend, sendDM, toggleHouseLock, saveHouseFurniture, kickHouseGuest,
    applyDamage, healPlayer, sendToHospital, setComa, addClothing, addClothingV2, updateClothing, deleteClothing, wipeAllData, buyClothing, equipClothing, adminSetDebt,
    chargePayment, payCardBill, hospitalPay, economyConfig, adminSetEconomyConfig, claimAuxilioGov]);

  /* ── Ciclo horário da Conta de Serviços (verifica a cada 60s) ── */
  useEffect(() => {
    if (status !== "playing") return;
    processServiceBill();
    const iv = setInterval(() => processServiceBill(), 60000);
    return () => clearInterval(iv);
  }, [status, processServiceBill]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
