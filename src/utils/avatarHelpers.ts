/**
 * Helpers puros de estilo corporal por gênero.
 * Arquivo isolado para evitar tocar no engine.ts durante refinamentos.
 */

export type BodyGender = "male" | "female";

export interface BodyStyle {
  shoulderWidthRatio: number;
  waistCurve: boolean;
  neckScale: number;
  /** tom de pele levemente mais suave no feminino */
  skinSoftness: number;
  /** intensidade do maxilar (mais alto = mais marcado) */
  jawStrength: number;
  /** curvatura de cintura (0 = reto, 1 = bem marcada) */
  waistTaper: number;
  /** arredondamento dos ombros */
  shoulderRound: number;
}

export const getGenderBodyStyle = (gender: BodyGender): BodyStyle => {
  if (gender === "female") {
    return {
      shoulderWidthRatio: 0.8,
      waistCurve: true,
      neckScale: 0.9,
      skinSoftness: 1.15,
      jawStrength: 0.45,
      waistTaper: 0.85,
      shoulderRound: 2.4,
    };
  }
  return {
    shoulderWidthRatio: 1.0,
    waistCurve: false,
    neckScale: 1.0,
    skinSoftness: 1.0,
    jawStrength: 1.0,
    waistTaper: 0.25,
    shoulderRound: 1.6,
  };
};

/** Converte Sexo do jogo para o tipo usado pelos helpers */
export const toBodyGender = (sexo: "masculino" | "feminino"): BodyGender =>
  sexo === "feminino" ? "female" : "male";
