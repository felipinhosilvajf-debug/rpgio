import type { Sexo } from "./types";

/** Genero aceito por uma peca ou penteado. */
export type CharacterGender = Sexo | "unissex";

/** Modelos superiores, incluindo a nova camisa regata. */
export type CharacterShirtStyle =
  | "camiseta"
  | "camisa"
  | "jaqueta"
  | "blusa"
  | "regata";

/** Modelos inferiores, incluindo shorts para ambos os generos. */
export type CharacterBottomStyle =
  | "calca"
  | "bermuda"
  | "shorts"
  | "saia";

/**
 * Catalogo ampliado de cabelos. Os estilos antigos foram preservados para
 * permitir migracao gradual dos avatares existentes.
 */
export type CharacterHairStyle =
  | "curto"
  | "social"
  | "cacheado"
  | "moicano"
  | "longo"
  | "longo_liso"
  | "coque"
  | "rabo"
  | "raspado"
  | "franja"
  | "ondulado"
  | "afro"
  | "trancas"
  | "bob";

export interface ClothingStyleDefinition {
  id: CharacterShirtStyle | CharacterBottomStyle;
  nome: string;
  slot: "camisa" | "inferior";
  genero: CharacterGender;
  description: string;
  /** Quanto da pele deve permanecer visivel nos bracos ou pernas. */
  exposedSkin: "nenhuma" | "baixa" | "media" | "alta";
  /** Ajustes que o futuro renderizador podera aplicar sem valores magicos. */
  shape: {
    shoulderCoverage?: number;
    sleeveLength?: number;
    legLength?: number;
    waistTaper?: number;
  };
}

export interface HairStyleDefinition {
  id: CharacterHairStyle;
  nome: string;
  genero: CharacterGender;
  description: string;
  length: "raspado" | "curto" | "medio" | "longo";
  texture: "liso" | "ondulado" | "cacheado" | "crespo" | "trancado";
  volume: number;
  /** Indica que o cabelo deve ser desenhado atras do tronco. */
  backLayer: boolean;
}

export const NEW_CLOTHING_STYLES: ClothingStyleDefinition[] = [
  {
    id: "regata",
    nome: "Camisa regata",
    slot: "camisa",
    genero: "unissex",
    description: "Regata com ombros e parte superior dos bracos expostos.",
    exposedSkin: "alta",
    shape: {
      shoulderCoverage: 0.56,
      sleeveLength: 0,
      waistTaper: 0.18,
    },
  },
  {
    id: "shorts",
    nome: "Shorts",
    slot: "inferior",
    genero: "unissex",
    description: "Shorts curto com pernas visiveis e acabamento esportivo.",
    exposedSkin: "alta",
    shape: {
      legLength: 0.42,
      waistTaper: 0.12,
    },
  },
];

export const NEW_HAIR_STYLES: HairStyleDefinition[] = [
  {
    id: "raspado",
    nome: "Raspado",
    genero: "unissex",
    description: "Cabelo muito curto, acompanhando o formato da cabeca.",
    length: "raspado",
    texture: "liso",
    volume: 0.2,
    backLayer: false,
  },
  {
    id: "franja",
    nome: "Franja",
    genero: "unissex",
    description: "Corte curto ou medio com franja sobre a testa.",
    length: "medio",
    texture: "liso",
    volume: 0.65,
    backLayer: false,
  },
  {
    id: "ondulado",
    nome: "Ondulado",
    genero: "unissex",
    description: "Cabelo medio com ondas e volume lateral suave.",
    length: "medio",
    texture: "ondulado",
    volume: 0.85,
    backLayer: true,
  },
  {
    id: "afro",
    nome: "Afro",
    genero: "unissex",
    description: "Cabelo crespo com volume arredondado ao redor da cabeca.",
    length: "medio",
    texture: "crespo",
    volume: 1.25,
    backLayer: true,
  },
  {
    id: "trancas",
    nome: "Trancas longas",
    genero: "unissex",
    description: "Trancas com mechas separadas descendo atras dos ombros.",
    length: "longo",
    texture: "trancado",
    volume: 0.8,
    backLayer: true,
  },
  {
    id: "bob",
    nome: "Corte bob",
    genero: "feminino",
    description: "Corte feminino medio, arredondado na altura do rosto.",
    length: "medio",
    texture: "liso",
    volume: 0.72,
    backLayer: true,
  },
];

export const getHairStylesForGender = (
  gender: Sexo,
): HairStyleDefinition[] =>
  NEW_HAIR_STYLES.filter(
    (style) => style.genero === "unissex" || style.genero === gender,
  );

export const getClothingStylesForGender = (
  gender: Sexo,
): ClothingStyleDefinition[] =>
  NEW_CLOTHING_STYLES.filter(
    (style) => style.genero === "unissex" || style.genero === gender,
  );