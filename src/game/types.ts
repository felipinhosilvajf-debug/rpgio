export type SceneId = "city" | "barracks" | "house" | "clothing" | "hospital";
export type Dir = "down" | "up" | "left" | "right";
export type Sexo = "masculino" | "feminino";
export type HairStyle = "curto" | "social" | "cacheado" | "moicano" | "longo" | "longo_liso" | "coque" | "rabo";
export type ShirtStyle = "camiseta" | "camisa" | "jaqueta" | "blusa";
export type BottomStyle = "calca" | "bermuda" | "shorts" | "saia";
export type ShoeStyle = "tenis" | "social" | "bota";

export interface InventoryItem {
  id: string;
  qtd: number;
}

export interface Application {
  id: string;
  userId: string;
  userNome: string;
  organizationId: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: number;
  reviewedBy?: string;
  reviewedAt?: number;
}

export interface PlayerData {
  uid: string;
  nome: string;
  sexo: Sexo;
  rg: string;
  dataNascimento: string;
  saldoCarteira: number;
  saldoBanco: number;
  nivel: number;
  xp: number;
  saude: number;
  energia: number;
  fome: number;
  sede: number;
  reputacao: number;
  emprego: string;
  organizationId: string;
  patente: string;
  inventario: InventoryItem[];
  equipped: (string | null)[];
  insignias: string[];
  propriedadesCompradas: string[];
  isLeader: boolean;
  isAdmin: boolean;
  banido: boolean;
  banMotivo?: string;
  cartaoCredito: boolean;
  cartaoLimite: number;
  cartaoFatura: number;
  cartaoManutencao: number;
  dividaImovel: number;
  debito: number;
  roupaEquipada: string;
  coma: { ativo: boolean; fim: number } | null;
  hpFull: boolean;
  cor: string;
  cabelo: string;
  cabeloEstilo: HairStyle;
  pele: string;
  camisaModelo: ShirtStyle;
  inferiorModelo: BottomStyle;
  calcaCor: string;
  sapatoModelo: ShoeStyle;
  sapatoCor: string;
  scene: SceneId;
  x: number;
  y: number;
  dir: Dir;
  moving: boolean;
  lastSeen: number;
  lastSalary: number;
  joinedAt: number;
  hoursWorked: number;
  patrulhas: number;
  prisoes: number;
  tutorialDone: boolean;
  amigos: string[];
  currentHouseId: string;
  gpsTarget: { x: number; y: number; label: string } | null;
  /* ── Conta de Serviços (Cofre Nacional) ── */
  contaServicoAcumulada: number;
  contaServicoCiclos: number;
  ultimaCobranca: number;
  lastAuxilio: number;
  chat?: { text: string; ts: number } | null;
  criadoEm?: unknown;
}

/** Saldo do Cofre Nacional (documento único) */
export interface TreasuryDoc {
  saldo: number;
  taxaServico: number;   // % cobrada por ciclo (padrão 1)
  maxCiclos: number;     // acúmulo máximo (padrão 6)
  updatedAt: number;
}

export const DEFAULT_TREASURY: TreasuryDoc = { saldo: 0, taxaServico: 1, maxCiclos: 6, updatedAt: 0 };

/** Registro de entrada/saída do Cofre Nacional */
export interface TreasuryEntry {
  id: string;
  tipo: "imposto" | "salario" | "deposito" | "ajuste" | "gasto";
  org?: string;          // organização relacionada (exercito, policia...)
  valor: number;         // positivo = entrada, negativo = saída
  desc: string;
  playerUid?: string;
  playerNome?: string;
  ts: number;
}

export interface ChatMsg {
  id: string;
  uid: string;
  nome: string;
  text: string;
  ts: number;
  patente?: string;
}

export interface PropertyDoc {
  id: string;
  ownerUid: string | null;
  ownerNome: string | null;
  boughtAt: number | null;
  preco: number;
  locked?: boolean;
  furniture?: Record<string, string>;
}

/**
 * Fonte única do patrimônio do cidadão:
 * carteira + banco + limite total de crédito + valor dos imóveis registrados.
 * Objetos decorativos guardados em propriedadesCompradas não entram no cálculo.
 */
export function calculatePatrimony(player: PlayerData, properties: Record<string, PropertyDoc>): number {
  const propertyValue = Object.values(properties)
    .filter((property) => property.ownerUid === player.uid)
    .reduce((sum, property) => sum + Math.max(0, property.preco ?? 0), 0);
  return (player.saldoCarteira || 0) + (player.saldoBanco || 0) + Math.max(0, player.cartaoLimite || 0) + propertyValue;
}

export interface ClothingItem {
  id: string;
  nome: string;
  preco: number;
  cor: string;
  corColetes?: string;
  capacete?: string;
  genero?: Sexo | "unissex";
  camisaModelo?: ShirtStyle;
  inferiorModelo?: BottomStyle;
  calcaCor?: string;
  sapatoModelo?: ShoeStyle;
  sapatoCor?: string;
  image?: string;
  imageTransform?: ShirtArtTransform;
  desc?: string;
  criadoPor?: string;
  criadoEm?: number;
}

/** Transformação da estampa aplicada na área do torso da camisa. */
export interface ShirtArtTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

export const DEFAULT_SHIRT_ART_TRANSFORM: ShirtArtTransform = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
};

export interface DirectMsg {
  id: string;
  participants: string[];
  from: string;
  fromNome: string;
  to: string;
  text: string;
  ts: number;
}

export type MapEditCells = Record<string, string>;

/** Letreiro/texto customizado posicionado no mapa: "x_y" => texto */
export type SignMap = Record<string, string>;

/** Objeto customizado criado por upload (imagem PNG) */
export interface CustomObject {
  id: string;
  objId: number;
  nome: string;
  image: string; // dataURL
  w: number;
  h: number;
  preco: number;
  sellable: boolean;
  criadoPor?: string;
  criadoEm?: number;
}

/** Faixa reservada para IDs numéricos de objetos customizados na matriz do mapa */
export const CUSTOM_BASE = 5000;

/** Gera um objId numérico estável a partir do doc id */
export function customObjectId(docId: string): number {
  let h = 0;
  for (let i = 0; i < docId.length; i++) { h = (h * 31 + docId.charCodeAt(i)) >>> 0; }
  return CUSTOM_BASE + (h % 2000);
}

export interface OrgConfig {
  salaries?: Record<string, number>;
  recruitMinRankIndex?: number;
  active?: boolean;
  uniforms?: Record<string, Uniform>;
  directorId?: string | null;
  updatedAt?: number;
}

export interface EconomyConfig {
  saldoCarteiraInicial: number;
  saldoBancoInicial: number;
  auxilioValor: number;
  auxilioIntervaloMinutos: number;
  auxilioAtivo: boolean;
}

export const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  saldoCarteiraInicial: 750,
  saldoBancoInicial: 1500,
  auxilioValor: 300,
  auxilioIntervaloMinutos: 60,
  auxilioAtivo: true,
};

export interface Uniform { cor: string; colete?: string; capacete?: string; faixa?: string; }

export interface TransactionDoc {
  id: string;
  from?: string;
  fromNome?: string;
  to?: string;
  toNome?: string;
  tipo: "deposito" | "saque" | "transferencia" | "compra" | "salario" | "credito" | "admin";
  valor: number;
  ts: number;
  desc?: string;
}

export interface InteractTarget {
  kind:
    | "barracks"
    | "shop"
    | "bank"
    | "hospital"
    | "jobs"
    | "house"
    | "exit"
    | "arsenal"
    | "bed"
    | "command"
    | "training"
    | "atm"
    | "clothing"
    | "hospital_in"
    | "fitter";
  label: string;
  x: number;
  y: number;
  meta?: string;
}

/** Gera um RG aleatório no formato "RG-XXXXX" (a unicidade é garantida no Firestore) */
export function generateRG(): string {
  return `RG-${Math.floor(10000 + Math.random() * 90000)}`;
}

export interface SignOpts {
  size?: number;
  color?: string;
  bg?: string;
  w?: number;
  h?: number;
}

/** Codifica um letreiro com opções de estilo em um valor persistido */
export function encodeSign(text: string, o: SignOpts = {}): string {
  const size = o.size ?? 7;
  const color = o.color ?? "#fff6d8";
  const bg = o.bg ?? "rgba(12,16,32,0.92)";
  const w = o.w ?? 1;
  const h = o.h ?? 1;
  return [text.slice(0, 32), size, color, bg, w, h].join("|");
}

/** Decodifica um valor de letreiro (compatível com letreiros antigos de texto puro) */
export function decodeSign(v: string): { text: string; size: number; color: string; bg: string; w: number; h: number } {
  const p = v.split("|");
  return {
    text: p[0] ?? "",
    size: Number(p[1]) || 7,
    color: p[2] || "#fff6d8",
    bg: p[3] || "rgba(12,16,32,0.92)",
    w: Number(p[4]) || 1,
    h: Number(p[5]) || 1,
  };
}

export const DEFAULT_PLAYER = (uid: string, nome: string): PlayerData => ({
  uid,
  nome,
  sexo: "masculino",
  rg: generateRG(),
  dataNascimento: "",
  saldoCarteira: 750,
  saldoBanco: 1500,
  nivel: 1,
  xp: 0,
  saude: 100,
  energia: 100,
  fome: 100,
  sede: 100,
  reputacao: 0,
  emprego: "desempregado",
  organizationId: "",
  patente: "Civil",
  inventario: [
    { id: "pao", qtd: 2 },
    { id: "refri", qtd: 1 },
  ],
  equipped: [null, null, null, null, null, null],
  insignias: [],
  propriedadesCompradas: [],
  isLeader: false,
  isAdmin: false,
  banido: false,
  cartaoCredito: false,
  cartaoLimite: 0,
  cartaoFatura: 0,
  cartaoManutencao: 0,
  dividaImovel: 0,
  debito: 0,
  roupaEquipada: "",
  coma: null,
  hpFull: true,
  cor: "#3f7ad6",
  cabelo: "#3a2418",
  cabeloEstilo: "curto",
  pele: "#f0c396",
  camisaModelo: "camiseta",
  inferiorModelo: "calca",
  calcaCor: "#2f3b57",
  sapatoModelo: "tenis",
  sapatoCor: "#1a1f2c",
  scene: "city",
  x: 32 * 16 + 8,
  y: 20 * 16 + 8,
  dir: "down",
  moving: false,
  lastSeen: Date.now(),
  lastSalary: 0,
  joinedAt: 0,
  hoursWorked: 0,
  patrulhas: 0,
  prisoes: 0,
  tutorialDone: false,
  amigos: [],
  currentHouseId: "",
  gpsTarget: null,
  contaServicoAcumulada: 0,
  contaServicoCiclos: 0,
  ultimaCobranca: 0,
  lastAuxilio: 0,
});
