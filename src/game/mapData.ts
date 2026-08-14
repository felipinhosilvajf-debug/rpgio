import type { SceneId, MapEditCells } from "./types";

export const TILE = 16;

/* -------------------------------- GROUND -------------------------------- */
export const G = {
  GRASS: 0,
  GRASS_DARK: 1,
  ROAD: 2,
  ROAD_LINE: 3,
  SIDEWALK: 4,
  WATER: 5,
  SAND: 6,
  DIRT: 7,
  WOOD: 8,
  TILEFLOOR: 9,
  WALL: 10,
  CONCRETE: 11,
  CARPET: 12,
  PLAZA: 13,
  FLOWERS: 14,
  CROSSWALK: 15,
  MILFLOOR: 16,
} as const;

export interface GroundDef {
  id: number;
  nome: string;
  cor: string;
  solid?: boolean;
}

export const GROUND_DEFS: Record<number, GroundDef> = {
  [G.GRASS]: { id: G.GRASS, nome: "Grama", cor: "#5f9c3f" },
  [G.GRASS_DARK]: { id: G.GRASS_DARK, nome: "Grama Escura", cor: "#4a7a30" },
  [G.ROAD]: { id: G.ROAD, nome: "Asfalto", cor: "#6b5b47" },
  [G.ROAD_LINE]: { id: G.ROAD_LINE, nome: "Asfalto (faixa)", cor: "#77674f" },
  [G.SIDEWALK]: { id: G.SIDEWALK, nome: "Calçada", cor: "#c2b49a" },
  [G.WATER]: { id: G.WATER, nome: "Água", cor: "#4d9ec0", solid: true },
  [G.SAND]: { id: G.SAND, nome: "Areia", cor: "#e0c68e" },
  [G.DIRT]: { id: G.DIRT, nome: "Terra", cor: "#a3763f" },
  [G.WOOD]: { id: G.WOOD, nome: "Piso Madeira", cor: "#b07a44" },
  [G.TILEFLOOR]: { id: G.TILEFLOOR, nome: "Piso Cerâmico", cor: "#d8c9a8" },
  [G.WALL]: { id: G.WALL, nome: "Parede", cor: "#8a7f6e", solid: true },
  [G.CONCRETE]: { id: G.CONCRETE, nome: "Concreto", cor: "#a29a8c" },
  [G.CARPET]: { id: G.CARPET, nome: "Carpete", cor: "#a04b3e" },
  [G.PLAZA]: { id: G.PLAZA, nome: "Praça", cor: "#cdb896" },
  [G.FLOWERS]: { id: G.FLOWERS, nome: "Grama Florida", cor: "#6da94e" },
  [G.CROSSWALK]: { id: G.CROSSWALK, nome: "Faixa Pedestre", cor: "#8a7f6b" },
  [G.MILFLOOR]: { id: G.MILFLOOR, nome: "Piso Militar", cor: "#8b8a67" },
};

/* -------------------------------- OBJECTS -------------------------------- */
export const O = {
  NONE: 0,
  TREE: 100,
  PINE: 101,
  BUSH: 102,
  ROCK: 103,
  LAMP: 104,
  BENCH: 105,
  FENCE: 106,
  FLOWERPOT: 107,
  SIGN: 108,
  HYDRANT: 109,
  WALL_BRICK: 110,
  WALL_BEIGE: 111,
  WALL_GRAY: 112,
  WALL_BLUE: 113,
  WINDOW: 114,
  ROOF_RED: 115,
  ROOF_BLUE: 116,
  ROOF_GREEN: 117,
  ROOF_GRAY: 118,
  ROOF_ORANGE: 119,
  DOOR_BARRACKS: 120,
  DOOR_SHOP: 121,
  DOOR_BANK: 122,
  DOOR_HOUSE: 123,
  DOOR_EXIT: 124,
  DOOR_HOSPITAL: 125,
  DOOR_JOBS: 126,
  DOOR_CLOTHING: 127,
  BED: 130,
  TABLE: 131,
  CHAIR: 132,
  ARSENAL: 133,
  DESK: 134,
  CRATE: 135,
  FLAG: 136,
  RUG: 137,
  PLANT: 138,
  TV: 139,
  ATM: 140,
  SHELF: 141,
  COUNTER: 142,
  DUMMY: 143,
  LOCKER: 144,
  SOFA: 145,
} as const;

export type InteractKind =
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

export interface ObjDef {
  id: number;
  nome: string;
  solid: boolean;
  cat: "natureza" | "estrutura" | "porta" | "movel";
  interact?: InteractKind;
  label?: string;
}

export const OBJ_DEFS: Record<number, ObjDef> = {
  [O.TREE]: { id: O.TREE, nome: "Árvore", solid: true, cat: "natureza" },
  [O.PINE]: { id: O.PINE, nome: "Pinheiro", solid: true, cat: "natureza" },
  [O.BUSH]: { id: O.BUSH, nome: "Arbusto", solid: true, cat: "natureza" },
  [O.ROCK]: { id: O.ROCK, nome: "Pedra", solid: true, cat: "natureza" },
  [O.LAMP]: { id: O.LAMP, nome: "Poste de Luz", solid: true, cat: "estrutura" },
  [O.BENCH]: { id: O.BENCH, nome: "Banco de Praça", solid: true, cat: "estrutura" },
  [O.FENCE]: { id: O.FENCE, nome: "Cerca", solid: true, cat: "estrutura" },
  [O.FLOWERPOT]: { id: O.FLOWERPOT, nome: "Vaso de Flor", solid: true, cat: "movel" },
  [O.SIGN]: { id: O.SIGN, nome: "Placa", solid: true, cat: "estrutura" },
  [O.HYDRANT]: { id: O.HYDRANT, nome: "Hidrante", solid: true, cat: "estrutura" },
  [O.WALL_BRICK]: { id: O.WALL_BRICK, nome: "Parede Tijolo", solid: true, cat: "estrutura" },
  [O.WALL_BEIGE]: { id: O.WALL_BEIGE, nome: "Parede Bege", solid: true, cat: "estrutura" },
  [O.WALL_GRAY]: { id: O.WALL_GRAY, nome: "Parede Concreto", solid: true, cat: "estrutura" },
  [O.WALL_BLUE]: { id: O.WALL_BLUE, nome: "Parede Azul", solid: true, cat: "estrutura" },
  [O.WINDOW]: { id: O.WINDOW, nome: "Janela", solid: true, cat: "estrutura" },
  [O.ROOF_RED]: { id: O.ROOF_RED, nome: "Telhado Vermelho", solid: true, cat: "estrutura" },
  [O.ROOF_BLUE]: { id: O.ROOF_BLUE, nome: "Telhado Azul", solid: true, cat: "estrutura" },
  [O.ROOF_GREEN]: { id: O.ROOF_GREEN, nome: "Telhado Verde", solid: true, cat: "estrutura" },
  [O.ROOF_GRAY]: { id: O.ROOF_GRAY, nome: "Telhado Militar", solid: true, cat: "estrutura" },
  [O.ROOF_ORANGE]: { id: O.ROOF_ORANGE, nome: "Telhado Laranja", solid: true, cat: "estrutura" },
  [O.DOOR_BARRACKS]: { id: O.DOOR_BARRACKS, nome: "Porta do Quartel", solid: true, cat: "porta", interact: "barracks", label: "Entrar no Quartel do Exército" },
  [O.DOOR_SHOP]: { id: O.DOOR_SHOP, nome: "Porta do Mercado", solid: true, cat: "porta", interact: "shop", label: "Abrir o Mercado" },
  [O.DOOR_BANK]: { id: O.DOOR_BANK, nome: "Porta do Banco", solid: true, cat: "porta", interact: "bank", label: "Entrar no Banco" },
  [O.DOOR_HOUSE]: { id: O.DOOR_HOUSE, nome: "Porta de Residência", solid: true, cat: "porta", interact: "house", label: "Ver imóvel" },
  [O.DOOR_EXIT]: { id: O.DOOR_EXIT, nome: "Porta de Saída", solid: true, cat: "porta", interact: "exit", label: "Sair para a rua" },
  [O.DOOR_HOSPITAL]: { id: O.DOOR_HOSPITAL, nome: "Porta do Hospital", solid: true, cat: "porta", interact: "hospital_in", label: "Entrar no Hospital (UTI)" },
  [O.DOOR_JOBS]: { id: O.DOOR_JOBS, nome: "Porta da Prefeitura", solid: true, cat: "porta", interact: "jobs", label: "Central de Empregos" },
  [O.DOOR_CLOTHING]: { id: O.DOOR_CLOTHING, nome: "Porta da Loja de Roupas", solid: true, cat: "porta", interact: "clothing", label: "Entrar na Loja de Roupas" },
  [O.BED]: { id: O.BED, nome: "Beliche", solid: true, cat: "movel", interact: "bed", label: "Descansar" },
  [O.TABLE]: { id: O.TABLE, nome: "Mesa", solid: true, cat: "movel" },
  [O.CHAIR]: { id: O.CHAIR, nome: "Cadeira", solid: true, cat: "movel" },
  [O.ARSENAL]: { id: O.ARSENAL, nome: "Arsenal", solid: true, cat: "movel", interact: "arsenal", label: "Abrir o Arsenal" },
  [O.DESK]: { id: O.DESK, nome: "Mesa de Comando", solid: true, cat: "movel", interact: "command", label: "Sala do Comando" },
  [O.CRATE]: { id: O.CRATE, nome: "Caixote", solid: true, cat: "movel" },
  [O.FLAG]: { id: O.FLAG, nome: "Bandeira", solid: true, cat: "estrutura" },
  [O.RUG]: { id: O.RUG, nome: "Tapete", solid: false, cat: "movel" },
  [O.PLANT]: { id: O.PLANT, nome: "Planta", solid: true, cat: "movel" },
  [O.TV]: { id: O.TV, nome: "Televisão", solid: true, cat: "movel" },
  [O.ATM]: { id: O.ATM, nome: "Caixa Eletrônico", solid: true, cat: "movel", interact: "atm", label: "Usar caixa eletrônico" },
  [O.SHELF]: { id: O.SHELF, nome: "Prateleira", solid: true, cat: "movel" },
  [O.COUNTER]: { id: O.COUNTER, nome: "Balcão", solid: true, cat: "movel" },
  [O.DUMMY]: { id: O.DUMMY, nome: "Boneco de Treino", solid: true, cat: "movel", interact: "training", label: "Treinar (+XP)" },
  [O.LOCKER]: { id: O.LOCKER, nome: "Armário", solid: true, cat: "movel" },
  [O.SOFA]: { id: O.SOFA, nome: "Sofá", solid: true, cat: "movel" },
};

export function isSolid(ground: number, obj: number): boolean {
  if (obj && OBJ_DEFS[obj]?.solid) return true;
  return Boolean(GROUND_DEFS[ground]?.solid);
}

/* -------------------------------- SCENES -------------------------------- */
export interface SceneData {
  id: SceneId;
  nome: string;
  w: number;
  h: number;
  ground: number[][];
  objects: number[][];
  spawn: { x: number; y: number };
  exitTo?: SceneId;
  sky: string;
}

const grid = (w: number, h: number, v: number) => Array.from({ length: h }, () => new Array(w).fill(v));

function rect(m: number[][], x: number, y: number, w: number, h: number, v: number) {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) if (m[j] && m[j][i] !== undefined) m[j][i] = v;
}

interface BuildOpts {
  wall: number;
  roof: number;
  door?: number;
  doorDx?: number;
  windows?: boolean;
}

/** Desenha um prédio no layer de objetos: 2 linhas de telhado + paredes + porta na base */
function building(objs: number[][], x: number, y: number, w: number, h: number, opt: BuildOpts) {
  const roofH = Math.min(2, h - 1);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const gx = x + i;
      const gy = y + j;
      if (!objs[gy] || objs[gy][gx] === undefined) continue;
      if (j < roofH) objs[gy][gx] = opt.roof;
      else {
        const isWindowRow = (j - roofH) % 2 === 1;
        const isWindowCol = i % 2 === 1 && i > 0 && i < w - 1;
        objs[gy][gx] = opt.windows !== false && isWindowRow && isWindowCol ? O.WINDOW : opt.wall;
      }
    }
  }
  if (opt.door) {
    const dx = x + (opt.doorDx ?? Math.floor(w / 2));
    const dy = y + h - 1;
    if (objs[dy] && objs[dy][dx] !== undefined) objs[dy][dx] = opt.door;
  }
}

/* ------------------------------- PROPRIEDADES ------------------------------ */
export interface PropertyDef {
  id: string;
  nome: string;
  preco: number;
  desc: string;
  quartos: number;
}

export const PROPERTIES: Record<string, PropertyDef> = {
  "46_14": { id: "casa_1", nome: "Chalé da Colina", preco: 18000, desc: "Casa simples com quintal, ótima para começar.", quartos: 2 },
  "52_14": { id: "casa_2", nome: "Residência Pixel", preco: 26500, desc: "Sobrado de esquina com garagem coberta.", quartos: 3 },
  "46_28": { id: "casa_3", nome: "Casa dos Ventos", preco: 34000, desc: "Vista para a praça central da cidade.", quartos: 3 },
  "52_28": { id: "casa_4", nome: "Vila Nascente", preco: 47500, desc: "Reformada, com piso de madeira e lareira.", quartos: 4 },
  "46_40": { id: "casa_5", nome: "Mansão Sul", preco: 68000, desc: "Amplo terreno próximo ao hospital.", quartos: 5 },
  "52_40": { id: "casa_6", nome: "Palacete Dourado", preco: 96000, desc: "O imóvel mais cobiçado de PixelCity.", quartos: 6 },
};

export function getProperty(x: number, y: number): PropertyDef {
  const key = `${x}_${y}`;
  if (PROPERTIES[key]) return PROPERTIES[key];
  const seed = (x * 31 + y * 17) % 9;
  return {
    id: `casa_${x}_${y}`,
    nome: `Residência #${x}-${y}`,
    preco: 15000 + seed * 6500,
    desc: "Imóvel construído recentemente pelo departamento de urbanismo.",
    quartos: 2 + (seed % 4),
  };
}

/* --------------------------------- CIDADE --------------------------------- */
function buildCity(): SceneData {
  const w = 64;
  const h = 48;
  const g = grid(w, h, G.GRASS);
  const o = grid(w, h, O.NONE);

  const hRoads = [6, 20, 32, 44];
  const vRoads = [6, 22, 40, 56];

  // asfalto
  for (const r of hRoads) rect(g, 0, r, w, 3, G.ROAD);
  for (const c of vRoads) rect(g, c, 0, 3, h, G.ROAD);
  for (const r of hRoads) for (let x = 0; x < w; x++) g[r + 1][x] = G.ROAD_LINE;
  for (const c of vRoads) for (let y = 0; y < h; y++) if (g[y][c + 1] !== G.ROAD_LINE) g[y][c + 1] = G.ROAD_LINE;
  // cruzamentos limpos
  for (const r of hRoads) for (const c of vRoads) rect(g, c, r, 3, 3, G.ROAD);

  // calçadas ao redor das ruas
  const isRoad = (x: number, y: number) => g[y]?.[x] === G.ROAD || g[y]?.[x] === G.ROAD_LINE;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isRoad(x, y)) continue;
      const near = isRoad(x - 1, y) || isRoad(x + 1, y) || isRoad(x, y - 1) || isRoad(x, y + 1);
      if (near) g[y][x] = G.SIDEWALK;
    }
  }
  // faixas de pedestre
  const crossings: [number, number][] = [
    [32, 19], [32, 23], [16, 19], [16, 23], [48, 19], [48, 23],
    [32, 31], [32, 35], [16, 31], [16, 35], [48, 31], [48, 35],
  ];
  for (const [cx, cy] of crossings) {
    if (g[cy]?.[cx] !== undefined) g[cy][cx] = G.CROSSWALK;
  }

  // ---- QUARTEL DO EXÉRCITO (bloco central norte) ----
  rect(g, 26, 10, 13, 9, G.MILFLOOR);
  building(o, 27, 10, 12, 9, { wall: O.WALL_GRAY, roof: O.ROOF_GRAY, door: O.DOOR_BARRACKS, doorDx: 5 });
  o[19][30] = O.FLAG;
  o[19][35] = O.FLAG;
  o[19][28] = O.CRATE;
  o[19][37] = O.CRATE;
  g[19][32] = G.MILFLOOR;
  o[9][27] = O.FENCE;
  o[9][38] = O.FENCE;

  // ---- BANCO CENTRAL ----
  rect(g, 26, 24, 13, 7, G.PLAZA);
  building(o, 27, 24, 6, 6, { wall: O.WALL_BEIGE, roof: O.ROOF_BLUE, door: O.DOOR_BANK, doorDx: 2 });
  o[30][31] = O.ATM;
  o[30][27] = O.PLANT;

  // ---- MERCADO ----
  building(o, 34, 24, 5, 5, { wall: O.WALL_BRICK, roof: O.ROOF_ORANGE, door: O.DOOR_SHOP, doorDx: 2 });
  o[29][34] = O.SIGN;
  o[29][38] = O.PLANT;

  // ---- HOSPITAL ----
  rect(g, 10, 36, 11, 7, G.PLAZA);
  building(o, 10, 36, 7, 6, { wall: O.WALL_BEIGE, roof: O.ROOF_RED, door: O.DOOR_HOSPITAL, doorDx: 3 });
  o[42][10] = O.PLANT;
  o[42][16] = O.PLANT;

  // ---- LOJA DE ROUPAS & BARBEARIA (ao lado do hospital, fora da rua) ----
  rect(g, 17, 36, 5, 6, G.PLAZA);
  building(o, 17, 36, 5, 5, { wall: O.WALL_BRICK, roof: O.ROOF_ORANGE, door: O.DOOR_CLOTHING, doorDx: 2 });
  o[41][18] = O.SIGN;
  o[41][20] = O.SIGN;

  // ---- PREFEITURA / CENTRAL DE EMPREGOS ----
  rect(g, 26, 36, 13, 7, G.PLAZA);
  building(o, 27, 36, 8, 6, { wall: O.WALL_BLUE, roof: O.ROOF_GREEN, door: O.DOOR_JOBS, doorDx: 3 });
  o[42][27] = O.FLAG;
  o[42][34] = O.FLAG;

  // ---- CASAS À VENDA ----
  const casas: [number, number][] = [
    [44, 10], [50, 10], [44, 24], [50, 24], [44, 36], [50, 36],
  ];
  const roofs = [O.ROOF_RED, O.ROOF_BLUE, O.ROOF_ORANGE, O.ROOF_GREEN, O.ROOF_RED, O.ROOF_BLUE];
  casas.forEach(([cx, cy], i) => {
    rect(g, cx - 1, cy - 1, 7, 7, G.GRASS_DARK);
    building(o, cx, cy, 5, 5, {
      wall: i % 2 === 0 ? O.WALL_BEIGE : O.WALL_BRICK,
      roof: roofs[i],
      door: O.DOOR_HOUSE,
      doorDx: 2,
    });
    o[cy + 5][cx] = O.FLOWERPOT;
    o[cy + 5][cx + 4] = O.BUSH;
  });

  // ---- PARQUE (bloco noroeste) ----
  rect(g, 10, 10, 11, 9, G.GRASS);
  rect(g, 12, 12, 5, 4, G.WATER);
  rect(g, 11, 11, 7, 6, G.SAND);
  rect(g, 12, 12, 5, 4, G.WATER);
  o[10][10] = O.TREE;
  o[10][20] = O.TREE;
  o[18][10] = O.PINE;
  o[18][20] = O.TREE;
  o[17][13] = O.BENCH;
  o[17][15] = O.BENCH;
  o[11][19] = O.PINE;
  o[15][19] = O.BUSH;
  rect(g, 14, 17, 1, 2, G.DIRT);

  // ---- PRAÇA CENTRAL ----
  rect(g, 10, 24, 11, 7, G.PLAZA);
  o[27][15] = O.ROCK;
  o[26][14] = O.BUSH;
  o[26][16] = O.BUSH;
  o[24][11] = O.TREE;
  o[24][19] = O.TREE;
  o[29][11] = O.TREE;
  o[29][19] = O.TREE;
  o[27][12] = O.BENCH;
  o[27][18] = O.BENCH;

  // ---- ÁREA VERDE SUL / floresta de borda ----
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const border = x < 5 || x > 58 || y < 4 || y > 46;
      if (border && g[y][x] === G.GRASS) {
        const n = (x * 7 + y * 13) % 5;
        if (n === 0) o[y][x] = O.TREE;
        else if (n === 1) o[y][x] = O.PINE;
        else if (n === 2) g[y][x] = G.FLOWERS;
      }
    }
  }
  rect(g, 36, 36, 3, 7, G.GRASS);
  o[37][37] = O.TREE;
  o[40][37] = O.PINE;

  // ---- postes / hidrantes nas calçadas ----
  for (let x = 4; x < w - 4; x += 7) {
    for (const r of [5, 19, 31, 43]) {
      if (g[r]?.[x] === G.SIDEWALK && o[r][x] === O.NONE) o[r][x] = (x + r) % 14 === 0 ? O.HYDRANT : O.LAMP;
    }
  }
  for (let y = 4; y < h - 4; y += 8) {
    for (const c of [5, 21, 39, 55]) {
      if (g[y]?.[c] === G.SIDEWALK && o[y][c] === O.NONE) o[y][c] = O.LAMP;
    }
  }

  return {
    id: "city",
    nome: "PixelCity — Centro",
    w,
    h,
    ground: g,
    objects: o,
    spawn: { x: 32 * TILE + 8, y: 19 * TILE + 8 },
    sky: "#6ba7c8",
  };
}

/* ------------------------------ QUARTEL (INT) ------------------------------ */
function buildBarracks(): SceneData {
  const w = 34;
  const h = 24;
  const g = grid(w, h, G.MILFLOOR);
  const o = grid(w, h, O.NONE);

  // paredes externas
  for (let x = 0; x < w; x++) {
    g[0][x] = G.WALL;
    g[1][x] = G.WALL;
    g[h - 1][x] = G.WALL;
  }
  for (let y = 0; y < h; y++) {
    g[y][0] = G.WALL;
    g[y][w - 1] = G.WALL;
  }

  // DORMITÓRIO (esquerda)
  rect(g, 1, 2, 10, 11, G.WOOD);
  for (let y = 3; y <= 11; y += 3) {
    o[y][1] = O.BED;
    o[y][2] = O.LOCKER;
    o[y][9] = O.BED;
    o[y][8] = O.LOCKER;
  }
  o[12][5] = O.PLANT;

  // parede divisória dormitório
  for (let y = 2; y <= 13; y++) g[y][11] = G.WALL;
  g[7][11] = G.MILFLOOR;
  g[8][11] = G.MILFLOOR;
  for (let x = 1; x <= 10; x++) g[13][x] = G.WALL;

  // SALA DO COMANDO (centro-norte)
  rect(g, 12, 2, 10, 7, G.CARPET);
  o[3][16] = O.DESK;
  o[3][17] = O.DESK;
  o[2][16] = O.FLAG;
  o[2][18] = O.FLAG;
  o[5][15] = O.CHAIR;
  o[5][18] = O.CHAIR;
  o[7][13] = O.TABLE;
  o[7][20] = O.PLANT;
  for (let x = 12; x <= 21; x++) g[9][x] = G.WALL;
  g[9][16] = G.CARPET;
  g[9][17] = G.CARPET;

  // ARSENAL (direita)
  rect(g, 23, 2, 10, 11, G.CONCRETE);
  for (let x = 24; x <= 31; x += 2) {
    o[2][x] = O.ARSENAL;
    o[12][x] = O.CRATE;
  }
  o[5][32] = O.LOCKER;
  o[7][32] = O.LOCKER;
  o[9][32] = O.LOCKER;
  o[6][27] = O.COUNTER;
  o[6][28] = O.COUNTER;
  for (let y = 2; y <= 13; y++) g[y][22] = G.WALL;
  g[7][22] = G.CONCRETE;
  g[8][22] = G.CONCRETE;
  for (let x = 23; x <= 32; x++) g[13][x] = G.WALL;

  // PÁTIO DE TREINO (sul)
  rect(g, 1, 14, 32, 9, G.CONCRETE);
  for (let x = 6; x <= 27; x += 5) o[17][x] = O.DUMMY;
  o[20][4] = O.CRATE;
  o[20][6] = O.CRATE;
  o[20][28] = O.CRATE;
  o[21][16] = O.RUG;
  o[15][2] = O.FLAG;
  o[15][31] = O.FLAG;

  // porta de saída
  o[h - 1][16] = O.DOOR_EXIT;
  g[h - 1][16] = G.CONCRETE;

  return {
    id: "barracks",
    nome: "Quartel General do Exército",
    w,
    h,
    ground: g,
    objects: o,
    spawn: { x: 16 * TILE + 8, y: 21 * TILE + 8 },
    exitTo: "city",
    sky: "#2a2a1c",
  };
}

/* -------------------------------- CASA (INT) ------------------------------- */
function buildHouse(): SceneData {
  const w = 22;
  const h = 15;
  const g = grid(w, h, G.WOOD);
  const o = grid(w, h, O.NONE);

  for (let x = 0; x < w; x++) {
    g[0][x] = G.WALL;
    g[1][x] = G.WALL;
    g[h - 1][x] = G.WALL;
  }
  for (let y = 0; y < h; y++) {
    g[y][0] = G.WALL;
    g[y][w - 1] = G.WALL;
  }
  rect(g, 13, 2, 8, 6, G.TILEFLOOR);

  o[2][2] = O.BED;
  o[2][3] = O.LOCKER;
  o[4][2] = O.PLANT;
  o[6][4] = O.RUG;
  o[6][5] = O.RUG;
  o[7][3] = O.SOFA;
  o[7][4] = O.SOFA;
  o[5][8] = O.TV;
  o[9][8] = O.TABLE;
  o[9][9] = O.CHAIR;
  o[10][6] = O.CHAIR;
  o[2][14] = O.COUNTER;
  o[2][15] = O.COUNTER;
  o[2][16] = O.SHELF;
  o[4][20] = O.PLANT;
  o[6][14] = O.TABLE;
  o[6][15] = O.CHAIR;
  o[11][19] = O.PLANT;
  o[11][2] = O.FLOWERPOT;

  o[h - 1][11] = O.DOOR_EXIT;
  g[h - 1][11] = G.WOOD;

  return {
    id: "house",
    nome: "Interior da Residência",
    w,
    h,
    ground: g,
    objects: o,
    spawn: { x: 11 * TILE + 8, y: 12 * TILE + 8 },
    exitTo: "city",
    sky: "#3b2c1e",
  };
}

export const BASE_SCENES: Record<SceneId, SceneData> = {
  city: buildCity(),
  barracks: buildBarracks(),
  house: buildHouse(),
  clothing: buildClothingStore(),
  hospital: buildHospital(),
};

/* ------------------------- LOJA DE ROUPAS (INTERIOR) ------------------------- */
function buildClothingStore(): SceneData {
  const w = 26;
  const h = 18;
  const g = grid(w, h, G.TILEFLOOR);
  const o = grid(w, h, O.NONE);

  for (let x = 0; x < w; x++) { g[0][x] = G.WALL; g[1][x] = G.WALL; g[h - 1][x] = G.WALL; }
  for (let y = 0; y < h; y++) { g[y][0] = G.WALL; g[y][w - 1] = G.WALL; }

  // balcão + provadores + prateleiras de roupa
  o[3][2] = O.COUNTER; o[3][3] = O.COUNTER; o[3][4] = O.COUNTER;
  o[3][14] = O.LOCKER; o[3][15] = O.LOCKER; o[3][16] = O.LOCKER;
  o[3][20] = O.LOCKER; o[3][21] = O.LOCKER; o[3][22] = O.LOCKER;
  o[10][2] = O.SHELF; o[10][3] = O.SHELF; o[10][4] = O.SHELF;
  o[10][20] = O.SHELF; o[10][21] = O.SHELF; o[10][22] = O.SHELF;
  o[11][5] = O.DUMMY; o[11][15] = O.DUMMY; o[11][19] = O.DUMMY;
  o[6][8] = O.TABLE; o[6][9] = O.TABLE; o[7][8] = O.TABLE; o[7][9] = O.TABLE;
  rect(g, 6, 8, 2, 2, G.CARPET);
  o[5][13] = O.PLANT; o[5][16] = O.FLOWERPOT;
  o[h - 1][12] = O.DOOR_EXIT; g[h - 1][12] = G.TILEFLOOR;

  return {
    id: "clothing",
    nome: "Loja de Roupas & Barbearia",
    w, h, ground: g, objects: o,
    spawn: { x: 12 * TILE + 8, y: 15 * TILE + 8 },
    exitTo: "city", sky: "#4a3a32",
  };
}

/* ----------------------------- HOSPITAL (UTI/EXTERNO) ----------------------------- */
function buildHospital(): SceneData {
  const w = 32;
  const h = 22;
  const g = grid(w, h, G.TILEFLOOR);
  const o = grid(w, h, O.NONE);

  for (let x = 0; x < w; x++) { g[0][x] = G.WALL; g[1][x] = G.WALL; g[h - 1][x] = G.WALL; }
  for (let y = 0; y < h; y++) { g[y][0] = G.WALL; g[y][w - 1] = G.WALL; }
  // UTI com leitos
  for (let y = 3; y <= 8; y += 3) {
    o[y][3] = O.BED; o[y][4] = O.BED; o[y][26] = O.BED; o[y][27] = O.BED;
  }
  rect(g, 3, 3, 5, 8, G.WOOD);
  rect(g, 25, 3, 5, 8, G.WOOD);
  // recepção
  o[10][15] = O.COUNTER; o[11][15] = O.COUNTER;
  // sala de emergência
  rect(g, 12, 11, 8, 6, G.WOOD);
  o[13][11] = O.COUNTER; o[13][12] = O.COUNTER;
  o[19][15] = O.TV; o[17][12] = O.PLANT;
  o[h - 1][16] = O.DOOR_EXIT; g[h - 1][16] = G.TILEFLOOR;

  return {
    id: "hospital",
    nome: "Hospital Central",
    w, h, ground: g, objects: o,
    spawn: { x: 16 * TILE + 8, y: 19 * TILE + 8 },
    exitTo: "city", sky: "#e3f0f6",
  };
}

export function cloneScene(s: SceneData): SceneData {
  return { ...s, ground: s.ground.map((r) => [...r]), objects: s.objects.map((r) => [...r]) };
}

/** Aplica as edições vindas do Firestore (map_edits) sobre o mapa base */
export function applyEdits(base: SceneData, cells?: MapEditCells): SceneData {
  if (!cells || Object.keys(cells).length === 0) return base;
  const s = cloneScene(base);
  for (const key of Object.keys(cells)) {
    const [xs, ys] = key.split("_");
    const x = Number(xs);
    const y = Number(ys);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (!s.ground[y] || s.ground[y][x] === undefined) continue;
    const [gs, os] = String(cells[key]).split("|");
    const gv = Number(gs);
    const ov = Number(os);
    if (Number.isFinite(gv) && gs !== "" && gs !== "-") s.ground[y][x] = gv;
    if (Number.isFinite(ov) && os !== undefined && os !== "" && os !== "-") s.objects[y][x] = ov;
  }
  return s;
}

/* --------------------------- PALETA DO MODO EDITOR -------------------------- */
export const GROUND_PALETTE = [
  G.GRASS, G.GRASS_DARK, G.FLOWERS, G.ROAD, G.ROAD_LINE, G.CROSSWALK, G.SIDEWALK,
  G.PLAZA, G.CONCRETE, G.MILFLOOR, G.DIRT, G.SAND, G.WATER, G.WOOD, G.TILEFLOOR, G.CARPET, G.WALL,
];

export const OBJECT_PALETTE = [
  O.NONE, O.TREE, O.PINE, O.BUSH, O.ROCK, O.LAMP, O.BENCH, O.FENCE, O.SIGN, O.HYDRANT, O.FLOWERPOT,
  O.WALL_BRICK, O.WALL_BEIGE, O.WALL_GRAY, O.WALL_BLUE, O.WINDOW,
  O.ROOF_RED, O.ROOF_BLUE, O.ROOF_GREEN, O.ROOF_GRAY, O.ROOF_ORANGE,
  O.DOOR_HOUSE, O.DOOR_SHOP, O.DOOR_BANK, O.DOOR_BARRACKS, O.DOOR_HOSPITAL, O.DOOR_JOBS, O.DOOR_CLOTHING, O.DOOR_EXIT,
  O.BED, O.TABLE, O.CHAIR, O.SOFA, O.LOCKER, O.CRATE, O.SHELF, O.COUNTER, O.DESK, O.ARSENAL,
  O.DUMMY, O.ATM, O.TV, O.PLANT, O.RUG, O.FLAG,
];

export interface Prefab {
  id: string;
  nome: string;
  w: number;
  h: number;
  icone: string;
  cells: { dx: number; dy: number; g?: number; o?: number }[];
}

function prefabBuilding(id: string, nome: string, icone: string, w: number, h: number, wall: number, roof: number, door: number, ground: number): Prefab {
  const objs = grid(w, h, O.NONE);
  building(objs, 0, 0, w, h, { wall, roof, door, doorDx: Math.floor(w / 2) });
  const cells: Prefab["cells"] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells.push({ dx: x, dy: y, g: ground, o: objs[y][x] });
  return { id, nome, w, h, icone, cells };
}

export const PREFABS: Prefab[] = [
  prefabBuilding("casa", "Casa à Venda", "🏠", 5, 5, O.WALL_BEIGE, O.ROOF_RED, O.DOOR_HOUSE, G.GRASS_DARK),
  prefabBuilding("sobrado", "Sobrado", "🏡", 6, 7, O.WALL_BRICK, O.ROOF_BLUE, O.DOOR_HOUSE, G.GRASS_DARK),
  prefabBuilding("loja", "Loja / Mercado", "🏪", 5, 5, O.WALL_BRICK, O.ROOF_ORANGE, O.DOOR_SHOP, G.PLAZA),
  prefabBuilding("banco", "Agência Bancária", "🏦", 6, 6, O.WALL_BEIGE, O.ROOF_BLUE, O.DOOR_BANK, G.PLAZA),
  prefabBuilding("quartel", "Posto Militar", "🎖️", 8, 7, O.WALL_GRAY, O.ROOF_GRAY, O.DOOR_BARRACKS, G.MILFLOOR),
  prefabBuilding("predio", "Prédio Comercial", "🏢", 7, 9, O.WALL_GRAY, O.ROOF_GREEN, O.DOOR_JOBS, G.CONCRETE),
  {
    id: "rua_h",
    nome: "Rua Horizontal",
    icone: "🛣️",
    w: 6,
    h: 5,
    cells: Array.from({ length: 5 }, (_, dy) =>
      Array.from({ length: 6 }, (_, dx) => ({
        dx,
        dy,
        g: dy === 0 || dy === 4 ? G.SIDEWALK : dy === 2 ? G.ROAD_LINE : G.ROAD,
        o: O.NONE,
      })),
    ).flat(),
  },
  {
    id: "rua_v",
    nome: "Rua Vertical",
    icone: "🛤️",
    w: 5,
    h: 6,
    cells: Array.from({ length: 6 }, (_, dy) =>
      Array.from({ length: 5 }, (_, dx) => ({
        dx,
        dy,
        g: dx === 0 || dx === 4 ? G.SIDEWALK : dx === 2 ? G.ROAD_LINE : G.ROAD,
        o: O.NONE,
      })),
    ).flat(),
  },
  {
    id: "praca",
    nome: "Praça com Árvores",
    icone: "🌳",
    w: 5,
    h: 5,
    cells: Array.from({ length: 5 }, (_, dy) =>
      Array.from({ length: 5 }, (_, dx) => ({
        dx,
        dy,
        g: G.PLAZA,
        o: (dx === 0 || dx === 4) && (dy === 0 || dy === 4) ? O.TREE : dx === 2 && dy === 2 ? O.ROCK : O.NONE,
      })),
    ).flat(),
  },
];
