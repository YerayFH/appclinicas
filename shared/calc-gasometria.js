/**
 * Cálculos de gasometría arterial / venosa — AeroLab
 *
 * Funciones puras de clasificación ácido-base y cálculo de compensaciones.
 * Diseñadas para ser importadas por los tests sin dependencias de DOM.
 *
 * Refs:
 *   - Winters RW et al. Arch Intern Med. 1967;120(3):311-316 (Winters)
 *   - Narins RG, Emmett M. Ann Intern Med. 1980;92(4):533-543
 *   - Kellum JA. Crit Care Med. 2000;28(6):1986-1992
 */

/**
 * Clasifica el trastorno ácido-base primario a partir de los tres valores esenciales.
 * Reproduce la lógica del motor diagnóstico de AeroLab.
 *
 * @param {number} ph   - pH arterial (rango clínico válido: 6.5–8.0)
 * @param {number} pco2 - pCO₂ en mmHg (válido: 5–120)
 * @param {number} hco3 - HCO₃⁻ en mEq/L (válido: 1–60)
 * @returns {{ pType: string, pMech: string } | null}
 *   pType: 'normal' | 'acidosis' | 'alcalosis' | 'mixed'
 *   pMech: '' | 'metabolica' | 'respiratoria' | 'acidosis_dual' | 'alc_met_acid_resp' | 'complex'
 */
export function classifyAcidBase(ph, pco2, hco3) {
  if (ph == null || pco2 == null || hco3 == null) return null;
  if (isNaN(ph) || isNaN(pco2) || isNaN(hco3)) return null;
  if (ph < 6.5 || ph > 8.0 || pco2 < 5 || pco2 > 120 || hco3 < 1 || hco3 > 60) return null;

  const phLow  = ph < 7.35;
  const phHigh = ph > 7.45;
  const phNorm = !phLow && !phHigh;
  const co2Lo  = pco2 < 35;
  const co2Hi  = pco2 > 45;
  const hco3Lo = hco3 < 22;
  const hco3Hi = hco3 > 26;

  // Normalidad
  if (phNorm && !co2Lo && !co2Hi && !hco3Lo && !hco3Hi)
    return { pType: 'normal', pMech: '' };

  // Compensaciones completas (Regla del 7.40)
  if (phNorm && co2Lo && hco3Lo)
    return ph < 7.40
      ? { pType: 'acidosis', pMech: 'metabolica' }
      : { pType: 'alcalosis', pMech: 'respiratoria' };

  if (phNorm && co2Hi && hco3Hi)
    return ph < 7.40
      ? { pType: 'acidosis', pMech: 'respiratoria' }
      : { pType: 'alcalosis', pMech: 'metabolica' };

  // Trastornos primarios no compensados / parcialmente compensados
  if (phLow  && co2Hi && !hco3Lo) return { pType: 'acidosis',  pMech: 'respiratoria' };
  if (phLow  && hco3Lo && !co2Hi) return { pType: 'acidosis',  pMech: 'metabolica' };
  if (phHigh && co2Lo && !hco3Hi) return { pType: 'alcalosis', pMech: 'respiratoria' };
  if (phHigh && hco3Hi && !co2Lo) return { pType: 'alcalosis', pMech: 'metabolica' };

  // Trastornos mixtos
  if (phLow  && co2Hi && hco3Lo) return { pType: 'mixed', pMech: 'acidosis_dual' };
  if (phHigh && co2Hi && hco3Hi) return { pType: 'mixed', pMech: 'alc_met_acid_resp' };

  return { pType: 'mixed', pMech: 'complex' };
}

/**
 * Anion Gap estándar: Na⁺ − Cl⁻ − HCO₃⁻
 * Valor normal sin corrección: 8–12 mEq/L
 *
 * @param {number} na   - Sodio sérico (mEq/L)
 * @param {number} cl   - Cloro sérico (mEq/L)
 * @param {number} hco3 - Bicarbonato sérico (mEq/L)
 * @returns {number | null}
 */
export function calcAnionGap(na, cl, hco3) {
  if (na == null || cl == null || hco3 == null) return null;
  if (isNaN(na) || isNaN(cl) || isNaN(hco3)) return null;
  return na - cl - hco3;
}

/**
 * Corrección del AG por hipoalbuminemia
 * AG_corr = AG + 2.5 × (4.0 − albúmina)
 * Valor normal corregido: 10–12 mEq/L
 *
 * @param {number} ag  - Anion Gap sin corregir
 * @param {number} alb - Albúmina sérica (g/dL)
 * @returns {number | null}
 */
export function correctAgForAlbumin(ag, alb) {
  if (ag == null || alb == null) return null;
  if (isNaN(ag) || isNaN(alb)) return null;
  return ag + 2.5 * (4.0 - alb);
}

/**
 * Fórmula de Winters: pCO₂ esperada en acidosis metabólica
 * pCO₂_esperada = 1.5 × HCO₃⁻ + 8 ± 2
 *
 * @param {number} hco3 - Bicarbonato actual (mEq/L)
 * @returns {{ exp: number, lo: number, hi: number } | null}
 */
export function calcWinters(hco3) {
  if (hco3 == null || isNaN(hco3)) return null;
  const exp = 1.5 * hco3 + 8;
  return { exp, lo: exp - 2, hi: exp + 2 };
}

/**
 * HCO₃⁻ esperado en acidosis respiratoria AGUDA
 * HCO₃⁻ = 24 + 0.1 × ΔpCO₂   (ΔpCO₂ = pCO₂ − 40)
 *
 * @param {number} pco2 - pCO₂ actual (mmHg)
 * @returns {number | null}
 */
export function calcCompRespAcidAcute(pco2) {
  if (pco2 == null || isNaN(pco2)) return null;
  return 24 + 0.1 * (pco2 - 40);
}

/**
 * HCO₃⁻ esperado en acidosis respiratoria CRÓNICA
 * HCO₃⁻ = 24 + 0.35 × ΔpCO₂
 *
 * @param {number} pco2 - pCO₂ actual (mmHg)
 * @returns {number | null}
 */
export function calcCompRespAcidChronic(pco2) {
  if (pco2 == null || isNaN(pco2)) return null;
  return 24 + 0.35 * (pco2 - 40);
}

/**
 * pCO₂ esperada en alcalosis metabólica
 * pCO₂ = 0.7 × HCO₃⁻ + 21 ± 2
 *
 * @param {number} hco3 - Bicarbonato actual (mEq/L)
 * @returns {{ exp: number, lo: number, hi: number } | null}
 */
export function calcCompMetabAlk(hco3) {
  if (hco3 == null || isNaN(hco3)) return null;
  const exp = 0.7 * hco3 + 21;
  return { exp, lo: exp - 2, hi: exp + 2 };
}

/**
 * HCO₃⁻ esperado en alcalosis respiratoria AGUDA
 * HCO₃⁻ = 24 − 0.2 × ΔpCO₂   (ΔpCO₂ = 40 − pCO₂)
 *
 * @param {number} pco2 - pCO₂ actual (mmHg)
 * @returns {number | null}
 */
export function calcCompRespAlkAcute(pco2) {
  if (pco2 == null || isNaN(pco2)) return null;
  return 24 - 0.2 * (40 - pco2);
}

/**
 * HCO₃⁻ esperado en alcalosis respiratoria CRÓNICA
 * HCO₃⁻ = 24 − 0.4 × ΔpCO₂
 *
 * @param {number} pco2 - pCO₂ actual (mmHg)
 * @returns {number | null}
 */
export function calcCompRespAlkChronic(pco2) {
  if (pco2 == null || isNaN(pco2)) return null;
  return 24 - 0.4 * (40 - pco2);
}

/**
 * Ratio PaO₂/FiO₂ (Índice de Horowitz / P/F ratio)
 * Normal: > 400 mmHg | SDRA leve: 200–300 | SDRA moderado: 100–200 | SDRA grave: ≤100
 *
 * @param {number} po2  - PaO₂ en mmHg
 * @param {number} fio2 - FiO₂ en porcentaje (21–100)
 * @returns {number | null}
 */
export function calcPaFiRatio(po2, fio2) {
  if (po2 == null || fio2 == null) return null;
  if (isNaN(po2) || isNaN(fio2)) return null;
  if (fio2 < 21 || fio2 > 100 || po2 <= 0) return null;
  return (po2 / fio2) * 100;
}
