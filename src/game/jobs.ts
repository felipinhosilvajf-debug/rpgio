import type { OrgConfig } from "./types";

export interface Rank {
  id: string;
  nome: string;
  salario: number;
  xpReq: number;
  leader?: boolean;
  insignia?: string;
}

export interface Uniform {
  cor: string;
  colete?: string;
  capacete?: string;
  faixa?: string;
}

export interface Job {
  id: string;
  nome: string;
  cor: string;
  icone: string;
  desc: string;
  local: string;
  uniforme?: Uniform;
  ranks: Rank[];
}

export const JOBS: Job[] = [
  {
    id: "exercito",
    nome: "Exército Nacional",
    cor: "#5d7a45",
    icone: "🎖️",
    local: "Quartel General",
    desc: "Defenda PixelCity. Suba de patente treinando no quartel e cumprindo turnos de serviço.",
    uniforme: { cor: "#4b5d3a", colete: "#38472b", capacete: "#3b4a2e" },
    ranks: [
      { id: "soldado", nome: "Soldado", salario: 500, xpReq: 0, insignia: "🥉" },
      { id: "cabo", nome: "Cabo", salario: 850, xpReq: 250, insignia: "🥉" },
      { id: "sargento", nome: "Sargento", salario: 1400, xpReq: 600, insignia: "🥈" },
      { id: "tenente", nome: "Tenente", salario: 2200, xpReq: 1200, insignia: "🥈" },
      { id: "capitao", nome: "Capitão", salario: 3500, xpReq: 2200, insignia: "🥇" },
      { id: "coronel", nome: "Coronel", salario: 5500, xpReq: 4000, leader: true, insignia: "⭐" },
    ],
  },
  {
    id: "policia",
    nome: "Polícia Militar",
    cor: "#2f5fa8",
    icone: "🚓",
    local: "Prefeitura",
    desc: "Mantenha a ordem nas ruas da cidade e prenda infratores.",
    uniforme: { cor: "#1f3a66", colete: "#16294d", capacete: "#16294d" },
    ranks: [
      { id: "recruta", nome: "Recruta", salario: 450, xpReq: 0, insignia: "🥉" },
      { id: "policial", nome: "Policial", salario: 900, xpReq: 300, insignia: "🥈" },
      { id: "investigador", nome: "Investigador", salario: 1600, xpReq: 900, insignia: "🥇" },
      { id: "delegado", nome: "Delegado", salario: 3000, xpReq: 2000, leader: true, insignia: "⭐" },
    ],
  },
  {
    id: "bombeiros",
    nome: "Corpo de Bombeiros",
    cor: "#c23b2e",
    icone: "🚒",
    local: "Quartel dos Bombeiros",
    desc: "Salve vidas, combata incêndios e realize resgates pela cidade.",
    uniforme: { cor: "#a8321f", colete: "#7a2417", capacete: "#8f2a20" },
    ranks: [
      { id: "recruta_bm", nome: "Recruta", salario: 470, xpReq: 0, insignia: "🥉" },
      { id: "bombeiro", nome: "Bombeiro", salario: 950, xpReq: 300, insignia: "🥈" },
      { id: "subtenente_bm", nome: "Sub-Tenente", salario: 1700, xpReq: 950, insignia: "🥇" },
      { id: "comandante_bm", nome: "Comandante", salario: 3200, xpReq: 2100, leader: true, insignia: "⭐" },
    ],
  },
  {
    id: "hospital",
    nome: "Hospital Central",
    cor: "#b5455f",
    icone: "🏥",
    local: "Hospital",
    desc: "Cuide da saúde dos cidadãos de PixelCity.",
    uniforme: { cor: "#e8e8f0", colete: "#c23b2e", faixa: "#c23b2e" },
    ranks: [
      { id: "enfermeiro", nome: "Enfermeiro", salario: 520, xpReq: 0, insignia: "🥉" },
      { id: "clinico", nome: "Clínico Geral", salario: 1100, xpReq: 400, insignia: "🥈" },
      { id: "cirurgiao", nome: "Cirurgião", salario: 2400, xpReq: 1500, insignia: "🥇" },
      { id: "diretor", nome: "Diretor Médico", salario: 4000, xpReq: 3000, leader: true, insignia: "⭐" },
    ],
  },
  {
    id: "comercio",
    nome: "Comércio",
    cor: "#c07c2a",
    icone: "🛒",
    local: "Mercado",
    desc: "Trabalhe no mercado da cidade vendendo itens aos moradores.",
    ranks: [
      { id: "atendente", nome: "Atendente", salario: 380, xpReq: 0, insignia: "🥉" },
      { id: "vendedor", nome: "Vendedor", salario: 700, xpReq: 250, insignia: "🥈" },
      { id: "gerente", nome: "Gerente", salario: 1500, xpReq: 1000, leader: true, insignia: "⭐" },
    ],
  },
];

export const UNEMPLOYED = { id: "desempregado", nome: "Desempregado", cor: "#5b6478", icone: "🧍", patente: "Civil" };

/** Siglas oficiais exibidas na tag acima do personagem: [EX] Soldado */
export const SIGLAS: Record<string, string> = {
  exercito: "EX",
  policia: "PM",
  bombeiros: "CB",
  hospital: "MED",
  comercio: "COM",
};

export function tagPatente(emprego: string, patente: string): string {
  const sigla = SIGLAS[emprego];
  return sigla ? `[${sigla}] ${patente}` : patente;
}

export function getJob(id: string): Job | null { return JOBS.find((j) => j.id === id) ?? null; }
export function getRank(jobId: string, patente: string): Rank | null { const job = getJob(jobId); return job?.ranks.find((r) => r.nome === patente || r.id === patente) ?? null; }
export function getRankIndex(jobId: string, patente: string): number { const job = getJob(jobId); if (!job) return -1; return job.ranks.findIndex((r) => r.nome === patente || r.id === patente); }
export function nextRank(jobId: string, patente: string): Rank | null {
  const job = getJob(jobId); if (!job) return null;
  const idx = getRankIndex(jobId, patente);
  if (idx < 0 || idx >= job.ranks.length - 1) return null;
  return job.ranks[idx + 1];
}
export function prevRank(jobId: string, patente: string): Rank | null {
  const job = getJob(jobId); if (!job) return null;
  const idx = getRankIndex(jobId, patente);
  if (idx <= 0) return null;
  return job.ranks[idx - 1];
}
export function salarioDe(jobId: string, patente: string): number { return getRank(jobId, patente)?.salario ?? 0; }
export function isLeaderRank(jobId: string, patente: string): boolean { return Boolean(getRank(jobId, patente)?.leader); }

/** Salário efetivo, considerando eventuais overrides definidos pelo Admin no Firestore (organizations/{jobId}) */
export function effectiveSalary(jobId: string, patente: string, orgConfigs?: Record<string, OrgConfig>): number {
  const rank = getRank(jobId, patente);
  if (!rank) return 0;
  const override = orgConfigs?.[jobId]?.salaries?.[rank.id];
  return typeof override === "number" ? override : rank.salario;
}

/** Verifica se a patente atual pode recrutar/gerenciar membros (padrão: só o líder máximo, mas Admin pode liberar patentes intermediárias) */
export function canRecruit(jobId: string, patente: string, orgConfigs?: Record<string, OrgConfig>): boolean {
  const job = getJob(jobId); if (!job) return false;
  const idx = getRankIndex(jobId, patente);
  if (idx < 0) return false;
  const minIdx = orgConfigs?.[jobId]?.recruitMinRankIndex ?? job.ranks.length - 1;
  return idx >= minIdx;
}

/** Farda efetiva: base da organização + override por patente configurado pelo líder/admin */
export function getUniform(jobId: string, patente?: string, orgConfigs?: Record<string, OrgConfig>): Uniform | null {
  const base = getJob(jobId)?.uniforme ?? null;
  const override = patente ? orgConfigs?.[jobId]?.uniforms?.[patente] : undefined;
  return override ?? base;
}

/* --------------------------------- ITENS --------------------------------- */

export interface ShopItem {
  id: string;
  nome: string;
  preco: number;
  icone: string;
  energia?: number;
  saude?: number;
  desc: string;
  loja: "mercado" | "arsenal";
  soJobs?: string[];
  equipavel?: boolean;
}

export const ITEMS: ShopItem[] = [
  { id: "pao", nome: "Pão Pixel", preco: 25, icone: "🍞", energia: 12, desc: "+12 de energia", loja: "mercado" },
  { id: "refri", nome: "Refrigerante", preco: 40, icone: "🥤", energia: 20, desc: "+20 de energia", loja: "mercado" },
  { id: "cafe", nome: "Café Forte", preco: 65, icone: "☕", energia: 30, saude: 4, desc: "+30 energia / +4 saúde", loja: "mercado" },
  { id: "marmita", nome: "Marmita Completa", preco: 110, icone: "🍱", energia: 55, saude: 8, desc: "+55 energia / +8 saúde", loja: "mercado" },
  { id: "medkit", nome: "Kit Médico", preco: 260, icone: "🧰", saude: 60, desc: "+60 de saúde", loja: "mercado", equipavel: true },
  { id: "energetico", nome: "Energético X", preco: 180, icone: "⚡", energia: 100, desc: "Energia cheia", loja: "mercado" },
  { id: "racao", nome: "Ração de Combate", preco: 90, icone: "🥫", energia: 45, saude: 10, desc: "+45 energia / +10 saúde", loja: "arsenal", soJobs: ["exercito", "policia", "bombeiros"] },
  { id: "colete", nome: "Colete Balístico", preco: 950, icone: "🦺", saude: 35, desc: "Equipamento militar", loja: "arsenal", soJobs: ["exercito", "policia"], equipavel: true },
  { id: "radio", nome: "Rádio Corporativo", preco: 450, icone: "📻", desc: "Comunicação da corporação", loja: "arsenal", soJobs: ["exercito", "policia", "bombeiros", "hospital"], equipavel: true },
  { id: "municao", nome: "Caixa de Munição", preco: 320, icone: "🔫", desc: "Suprimento do arsenal", loja: "arsenal", soJobs: ["exercito"], equipavel: true },
  { id: "algema", nome: "Algemas", preco: 180, icone: "⛓️", desc: "Item de contenção policial (RP)", loja: "arsenal", soJobs: ["policia"], equipavel: true },
  { id: "cassetete", nome: "Cassetete", preco: 260, icone: "🏏", desc: "Item de contenção (RP)", loja: "arsenal", soJobs: ["policia", "exercito"], equipavel: true },
  { id: "arma_fogo", nome: "Arma de Fogo", preco: 2200, icone: "🔫", desc: "Arma de serviço oficial", loja: "arsenal", soJobs: ["policia", "exercito"], equipavel: true },
];

export function getItem(id: string): ShopItem | null { return ITEMS.find((i) => i.id === id) ?? null; }

/** Preço efetivo considerando overrides do Admin (shop_config/prices) */
export function effectivePrice(itemId: string, overrides?: Record<string, number>): number {
  const item = getItem(itemId);
  if (!item) return 0;
  return overrides?.[itemId] ?? item.preco;
}

export function xpParaNivel(nivel: number): number { return Math.floor(180 * nivel * 1.35); }

export function calcNivel(xp: number): { nivel: number; atual: number; necessario: number } {
  let nivel = 1; let restante = xp;
  while (restante >= xpParaNivel(nivel) && nivel < 99) { restante -= xpParaNivel(nivel); nivel++; }
  return { nivel, atual: restante, necessario: xpParaNivel(nivel) };
}
