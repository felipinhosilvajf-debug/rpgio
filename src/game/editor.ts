import { GROUND_DEFS, OBJ_DEFS, O, PREFABS, type SceneData } from "./mapData";
import type { CustomObject, MapEditCells } from "./types";

export type Brush =
  | { type: "ground"; id: number }
  | { type: "object"; id: number }
  | { type: "prefab"; id: string }
  | { type: "custom"; objId: number }
  | { type: "sign"; text: string; size?: number; color?: string; bg?: string; w?: number; h?: number }
  | { type: "erase" };

export const OBJ_ICON: Record<number, string> = {
  [O.NONE]: "🚫",
  [O.TREE]: "🌳",
  [O.PINE]: "🌲",
  [O.BUSH]: "🌿",
  [O.ROCK]: "🪨",
  [O.LAMP]: "🏮",
  [O.BENCH]: "🪑",
  [O.FENCE]: "🚧",
  [O.SIGN]: "🪧",
  [O.HYDRANT]: "🧯",
  [O.FLOWERPOT]: "🪴",
  [O.WALL_BRICK]: "🧱",
  [O.WALL_BEIGE]: "⬜",
  [O.WALL_GRAY]: "🔲",
  [O.WALL_BLUE]: "🟦",
  [O.WINDOW]: "🪟",
  [O.ROOF_RED]: "🔴",
  [O.ROOF_BLUE]: "🔵",
  [O.ROOF_GREEN]: "🟢",
  [O.ROOF_GRAY]: "⚫",
  [O.ROOF_ORANGE]: "🟠",
  [O.DOOR_HOUSE]: "🚪",
  [O.DOOR_SHOP]: "🏪",
  [O.DOOR_BANK]: "🏦",
  [O.DOOR_BARRACKS]: "🎖️",
  [O.DOOR_HOSPITAL]: "🏥",
  [O.DOOR_JOBS]: "🏛️",
  [O.DOOR_EXIT]: "🚪",
  [O.BED]: "🛏️",
  [O.TABLE]: "🪑",
  [O.CHAIR]: "💺",
  [O.SOFA]: "🛋️",
  [O.LOCKER]: "🗄️",
  [O.CRATE]: "📦",
  [O.SHELF]: "🗃️",
  [O.COUNTER]: "🧾",
  [O.DESK]: "🖥️",
  [O.ARSENAL]: "🔫",
  [O.DUMMY]: "🥋",
  [O.ATM]: "🏧",
  [O.TV]: "📺",
  [O.PLANT]: "🪴",
  [O.RUG]: "🟥",
  [O.FLAG]: "🚩",
};

export function brushSize(brush: Brush, customObjects?: CustomObject[]): { w: number; h: number } {
  if (brush.type === "prefab") {
    const p = PREFABS.find((x) => x.id === brush.id);
    return { w: p?.w ?? 1, h: p?.h ?? 1 };
  }
  if (brush.type === "custom") {
    const c = customObjects?.find((o) => o.objId === brush.objId);
    return { w: c?.w ?? 1, h: c?.h ?? 1 };
  }
  return { w: 1, h: 1 };
}

export function brushName(brush: Brush, customObjects?: CustomObject[]): string {
  switch (brush.type) {
    case "ground":
      return GROUND_DEFS[brush.id]?.nome ?? "Terreno";
    case "object":
      return brush.id === 0 ? "Remover objeto" : OBJ_DEFS[brush.id]?.nome ?? "Objeto";
    case "prefab":
      return PREFABS.find((p) => p.id === brush.id)?.nome ?? "Construção";
    case "custom":
      return customObjects?.find((o) => o.objId === brush.objId)?.nome ?? "Objeto customizado";
    case "sign":
      return brush.text ? `Letreiro: ${brush.text}` : "Letreiro";
    default:
      return "Borracha";
  }
}

/** Converte um clique do editor em células "x_y" => "ground|objeto" ('-' mantém o valor atual) */
export function brushCells(brush: Brush, x: number, y: number, scene: SceneData): MapEditCells {
  const out: MapEditCells = {};
  const inside = (px: number, py: number) => px >= 0 && py >= 0 && px < scene.w && py < scene.h;
  if (brush.type === "ground" && inside(x, y)) out[`${x}_${y}`] = `${brush.id}|-`;
  else if (brush.type === "object" && inside(x, y)) out[`${x}_${y}`] = `-|${brush.id}`;
  else if (brush.type === "erase" && inside(x, y)) out[`${x}_${y}`] = `-|0`;
  else if (brush.type === "prefab") {
    const p = PREFABS.find((f) => f.id === brush.id);
    if (!p) return out;
    const isRoad = (gx: number, gy: number) => {
      const g = scene.ground[gy]?.[gx];
      return g === 2 || g === 3 || g === 15; // ROAD, ROAD_LINE, CROSSWALK
    };
    const isStreetPrefab = p.id === "rua_h" || p.id === "rua_v";
    // bloqueia construção de prédios sobre ruas/faixas (ruas novas continuam permitidas)
    if (!isStreetPrefab) {
      for (const c of p.cells) {
        if (isRoad(x + c.dx, y + c.dy)) return out;
      }
    }
    for (const c of p.cells) {
      const px = x + c.dx;
      const py = y + c.dy;
      if (!inside(px, py)) continue;
      out[`${px}_${py}`] = `${c.g ?? "-"}|${c.o ?? "-"}`;
    }
  } else if (brush.type === "custom" && inside(x, y)) {
    out[`${x}_${y}`] = `-|${brush.objId}`;
  }
  // Letreiros NÃO tocam a matriz do mapa — são renderizados como overlay
  // separado da coleção `signs`. O App.tsx trata sign com return antecipado.
  return out;
}
