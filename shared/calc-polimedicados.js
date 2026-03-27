/**
 * Cálculos para la herramienta de polimedicados (revisión geriátrica)
 *
 * Fórmulas incluidas:
 *   - calcCKDEPI2021: CKD-EPI 2021 sin raza
 *     Ref: Inker LA et al. N Engl J Med. 2021;385:1737-1749.
 *   - calcCrCl: Aclaramiento de creatinina (Cockcroft-Gault simplificado)
 *     Ref: Cockcroft DW, Gault MH. Nephron. 1976;16(1):31-41.
 *   - calcCHA2DS2VA: Score CHA₂DS₂-VASc para FA
 *     Ref: Lip GY et al. Chest. 2010;137(2):263-272.
 */

/**
 * CKD-EPI 2021 — convención de sexo: 'male' | 'female'
 * @param {number} scr  - Creatinina sérica en mg/dL
 * @param {number} age  - Edad en años
 * @param {'male'|'female'} sex
 * @returns {number|null}
 */
export function calcCKDEPI2021(scr, age, sex) {
  if (!scr || !age) return null;
  const kappa = (sex === 'female') ? 0.7 : 0.9;
  const alpha = (sex === 'female') ? -0.241 : -0.302;
  const ratio = scr / kappa;
  let gfr = 142 * Math.pow(Math.min(ratio, 1), alpha) *
             Math.pow(Math.max(ratio, 1), -1.200) *
             Math.pow(0.9938, age);
  if (sex === 'female') gfr *= 1.012;
  return Math.round(gfr);
}

/**
 * Aclaramiento de creatinina — Cockcroft-Gault simplificado (sin ajuste por obesidad)
 * @param {number} age        - Edad en años
 * @param {number} weight     - Peso en kg
 * @param {number} creatinine - Creatinina sérica en mg/dL
 * @param {'male'|'female'} sex
 * @returns {number|null}
 */
export function calcCrCl(age, weight, creatinine, sex) {
  if (!age || !weight || !creatinine) return null;
  let v = ((140 - age) * weight) / (72 * creatinine);
  if (sex === 'female') v *= 0.85;
  return Math.floor(v);
}

/**
 * Score CHA₂DS₂-VASc para fibrilación auricular
 * @param {{
 *   ecv_ic?: boolean, hta?: boolean, age?: number, diabetes?: boolean,
 *   ecv_ictus?: boolean, sex?: 'male'|'female', fa?: boolean
 * }} inp - Datos clínicos del paciente
 * @returns {{score: number, breakdown: string[]}}
 */
export function calcCHA2DS2VA(inp) {
  let sc = 0, br = [];
  if (inp.ecv_ic)     { sc += 1; br.push('IC/ECV (+1)'); }
  if (inp.hta)        { sc += 1; br.push('HTA (+1)'); }
  if (inp.age >= 75)  { sc += 2; br.push('Edad ≥75 (+2)'); }
  else if (inp.age >= 65) { sc += 1; br.push('Edad 65-74 (+1)'); }
  if (inp.diabetes)   { sc += 1; br.push('Diabetes (+1)'); }
  if (inp.ecv_ictus)  { sc += 2; br.push('Ictus/AIT/TEP (+2)'); }
  if (inp.sex === 'female') { sc += 1; br.push('Sexo femenino (+1)'); }
  return { score: sc, breakdown: br };
}
