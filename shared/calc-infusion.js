/**
 * Cálculos de infusión continua — InfuCalc
 *
 * Fórmulas de conversión dosis ↔ ritmo de bomba de infusión.
 * Ref: Ficha técnica de cada fármaco y bibliografía farmacológica estándar.
 *
 * Verificación Noradrenalina (vialUnit='mg', unit='mcg/kg/min'):
 *   conc = 16mg/250mL = 0.064 mg/mL → concDose = 64 mcg/mL
 *   dose=0.1 mcg/kg/min, peso=70 kg
 *   dose_h = 0.1 × 70 × 60 = 420 mcg/h  →  mL/h = 420/64 = 6.56 ✓
 *
 * Verificación Isoprenalina (vialUnit='mg', unit='mcg/min'):
 *   Vial: 0.2mg/100mL = 0.002 mg/mL → concDose = 2 mcg/mL
 *   Ritmo bomba: 60 mL/h → dose = 60×2/60 = 2 mcg/min ✓
 */

/**
 * Convierte la concentración del vial a la unidad usada en la fórmula de dosis.
 * @param {{vialUnit: string, unit: string}} d - Descriptor del fármaco
 * @param {number} conc - Concentración en vialUnit/mL
 * @returns {number} Concentración en unidad_base_dosis/mL
 */
export function getConcInDoseUnit(d, conc) {
  const vU = d.vialUnit.toLowerCase();
  const dU = d.unit.toLowerCase();
  if (vU === 'mg' && dU.includes('mcg')) return conc * 1000;
  if (vU === 'mcg' && dU.includes('mg') && !dU.includes('mcg')) return conc / 1000;
  return conc; // UI, mEq, misma unidad → sin conversión
}

/**
 * Calcula el ritmo de bomba (mL/h) a partir de la dosis prescrita.
 * @param {{unit: string, vialUnit: string}} d - Descriptor del fármaco
 * @param {number} doseIn  - Dosis en la unidad nativa del fármaco (d.unit)
 * @param {number} weight  - Peso del paciente en kg
 * @param {number} conc    - Concentración del vial preparado en vialUnit/mL
 * @returns {number} Ritmo en mL/h
 */
export function computeRate(d, doseIn, weight, conc) {
  let doseH = doseIn;
  if (d.unit.includes('/kg')) doseH *= weight;
  if (d.unit.includes('/min')) doseH *= 60;
  const concDose = getConcInDoseUnit(d, conc);
  return doseH / concDose;
}

/**
 * Calcula la dosis recibida a partir del ritmo de bomba.
 * @param {{unit: string, vialUnit: string}} d - Descriptor del fármaco
 * @param {number} rate    - Ritmo de bomba en mL/h
 * @param {number} weight  - Peso del paciente en kg (usado solo si /kg en d.unit)
 * @param {number} conc    - Concentración del vial preparado en vialUnit/mL
 * @returns {number} Dosis en la unidad nativa del fármaco (d.unit)
 */
export function computeDose(d, rate, weight, conc) {
  const concDose = getConcInDoseUnit(d, conc);
  return rate * concDose;
}
