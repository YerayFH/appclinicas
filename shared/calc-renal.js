/**
 * Cálculos de función renal
 *
 * Fórmulas incluidas:
 *   - getBSA: Superficie corporal (Du Bois & Du Bois, 1916)
 *   - getCKDEPI: CKD-EPI 2021 sin raza
 *     Ref: Inker LA et al. New Creatinine- and Cystatin C–Based Equations to Estimate GFR
 *          without Race. N Engl J Med. 2021;385:1737-1749. DOI: 10.1056/NEJMoa2102953
 *   - calcCockcroft: Aclaramiento de creatinina (Cockcroft-Gault)
 *     Ref: Cockcroft DW, Gault MH. Prediction of creatinine clearance from serum creatinine.
 *          Nephron. 1976;16(1):31-41. DOI: 10.1159/000180580
 */

/**
 * Superficie corporal (Du Bois)
 * @param {number} w - Peso en kg
 * @param {number} h - Altura en cm
 * @returns {number|null} BSA en m²
 */
export function getBSA(w, h) {
  if (!w || !h) return null;
  return Math.sqrt((w * h) / 3600);
}

/**
 * CKD-EPI 2021 (sin raza)
 * @param {number} age - Edad en años
 * @param {'M'|'F'} sex - Sexo ('M' masculino, 'F' femenino)
 * @param {number} cr  - Creatinina sérica en mg/dL
 * @returns {number|null} FG estimado en mL/min/1.73m²
 */
export function getCKDEPI(age, sex, cr) {
  if (!age || !sex || !cr || cr <= 0) return null;
  const kappa = sex === 'F' ? 0.7 : 0.9;
  const alpha = sex === 'F' ? -0.241 : -0.302;
  const genderFactor = sex === 'F' ? 1.012 : 1;
  return Math.round(
    142 * Math.pow(Math.min(cr / kappa, 1), alpha) *
        Math.pow(Math.max(cr / kappa, 1), -1.200) *
        Math.pow(0.9938, age) * genderFactor
  );
}

/**
 * Aclaramiento de creatinina — Cockcroft-Gault con peso ajustado
 * Usa peso ideal (IBW) si el peso real supera 1.3× el IBW (obesidad).
 * @param {number} age  - Edad en años
 * @param {'M'|'F'} sex - Sexo
 * @param {number} cr   - Creatinina sérica en mg/dL
 * @param {number} [w]  - Peso en kg (opcional; usa 70 kg si no se aporta)
 * @param {number} [h]  - Altura en cm (opcional; necesario para ajuste por obesidad)
 * @param {string} [unit='mg/dL'] - Unidad de creatinina: 'mg/dL' o 'umol'
 * @returns {{val: number, epi: number|null, bsa: number|null, method: string}|null}
 */
export function calcCockcroft(age, sex, cr, w, h, unit = 'mg/dL') {
  if (!age || !sex || !cr || cr <= 0) return null;
  let crMg = cr;
  if (unit === 'umol') crMg = cr / 88.4;

  let pesoUso = w || 70;
  if (h && w) {
    const ibw = sex === 'M' ? 50 + 0.91 * (h - 152.4) : 45.5 + 0.91 * (h - 152.4);
    if (w > ibw * 1.3) pesoUso = ibw + 0.4 * (w - ibw);
  }
  let cg = ((140 - age) * pesoUso) / (72 * crMg);
  if (sex === 'F') cg *= 0.85;

  const epi = getCKDEPI(age, sex, crMg);
  const bsa = getBSA(w, h);
  return { val: Math.round(cg), epi, bsa, method: 'Cockcroft-Gault' };
}
