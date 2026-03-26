/**
 * Cálculos de scores de sepsis
 *
 * Scores incluidos:
 *   - newsSpO2Score: Componente SpO₂ del NEWS2
 *   - calcNEWS: National Early Warning Score 2 (NEWS2)
 *     Ref: Royal College of Physicians. National Early Warning Score (NEWS) 2. London: RCP, 2017.
 *   - calcSIRS: Criterios SIRS (Systemic Inflammatory Response Syndrome)
 *     Ref: Bone RC et al. Definitions for sepsis and organ failure.
 *          Chest. 1992;101(6):1644-1655.
 *   - sofaRespScore / sofaBD: Sequential Organ Failure Assessment (SOFA)
 *     Ref: Vincent JL et al. The SOFA (Sepsis-related Organ Failure Assessment) score.
 *          Intensive Care Med. 1996;22(7):707-710.
 */

/**
 * Puntuación del componente SpO₂ para NEWS2
 * @param {number} spo2   - Saturación de O₂ en %
 * @param {boolean} o2sup - ¿Recibe O₂ suplementario?
 * @param {boolean} scale2 - ¿Usar escala 2 (EPOC/hipercapnia)?
 * @returns {number} Puntuación 0–3
 */
export function newsSpO2Score(spo2, o2sup, scale2) {
  if (scale2) {
    if (spo2 >= 93 && o2sup)  return 3;
    if (spo2 >= 93 && !o2sup) return 0;
    if (spo2 >= 88) return 0;
    if (spo2 >= 86) return 1;
    if (spo2 >= 84) return 2;
    return 3;
  } else {
    if (spo2 <= 91) return 3;
    if (spo2 <= 93) return 2;
    if (spo2 <= 95) return 1;
    return 0;
  }
}

/**
 * National Early Warning Score 2 (NEWS2)
 * @param {{
 *   spo2: number, fr: number, tas: number, fc: number,
 *   temp: number, conc: string, o2sup: boolean, scale2: boolean
 * }} d - Constantes vitales del paciente
 * @returns {number} Puntuación total NEWS2
 */
export function calcNEWS(d) {
  const { spo2, fr, tas, fc, temp, conc, o2sup, scale2 } = d;
  let s = 0;
  s += newsSpO2Score(spo2, o2sup, scale2);
  s += fr <= 8 ? 3 : fr <= 11 ? 1 : fr <= 20 ? 0 : fr <= 24 ? 2 : 3;
  s += tas <= 90 ? 3 : tas <= 100 ? 2 : tas <= 110 ? 1 : tas <= 219 ? 0 : 3;
  s += fc <= 40 ? 3 : fc <= 50 ? 1 : fc <= 90 ? 0 : fc <= 110 ? 1 : fc <= 130 ? 2 : 3;
  s += temp <= 35 ? 3 : temp <= 36 ? 1 : temp <= 38 ? 0 : temp <= 39 ? 1 : 2;
  s += conc === 'Alerta' ? 0 : 3;
  s += o2sup ? 2 : 0;
  return s;
}

/**
 * Criterios SIRS — devuelve el número de criterios positivos (0–4)
 * @param {{temp: number, fc: number, fr: number, leucos: number}} d
 * @returns {number}
 */
export function calcSIRS(d) {
  return (
    ((d.temp > 38 || d.temp < 36) ? 1 : 0) +
    (d.fc > 90 ? 1 : 0) +
    (d.fr > 20 ? 1 : 0) +
    ((d.leucos > 12 || d.leucos < 4) ? 1 : 0)
  );
}

/**
 * Puntuación SOFA — componente respiratorio (PaO₂/FiO₂)
 * @param {number} pf         - Ratio PaO₂/FiO₂
 * @param {boolean} ventilated - ¿Con ventilación mecánica?
 * @returns {number} 0–4
 */
export function sofaRespScore(pf, ventilated) {
  if (pf <= 100) return ventilated ? 4 : 2;
  if (pf <= 200) return ventilated ? 3 : 2;
  if (pf <= 300) return 2;
  if (pf <= 400) return 1;
  return 0;
}

/**
 * Puntuación SOFA por dominios
 * @param {{
 *   pf: number, pla: number, bili: number, cv: string,
 *   pam: number, gcs: number, cr: number, di: number, ventilated: boolean
 * }} d
 * @returns {{res: number, plq: number, bl: number, cvs: number, neu: number, ren: number}}
 */
export function sofaBD(d) {
  const { pf, pla, bili, cv, pam, gcs, cr, di, ventilated } = d;
  let plq = 0, bl = 0, cvs = 0, neu = 0, ren = 0;
  const res = sofaRespScore(pf, ventilated);
  if (pla < 20) plq = 4; else if (pla < 50) plq = 3; else if (pla < 100) plq = 2; else if (pla < 150) plq = 1;
  if (bili >= 12) bl = 4; else if (bili >= 6) bl = 3; else if (bili >= 2) bl = 2; else if (bili >= 1.2) bl = 1;
  if (cv === 'dopa15' || cv === 'epiHigh' || cv === 'nrA') cvs = 4;
  else if (cv === 'dopa510' || cv === 'nrB' || cv === 'epiLow') cvs = 3;
  else if (cv === 'dopa5' || cv === 'dobu') cvs = 2;
  else if (pam < 70) cvs = 1;
  if (gcs < 6) neu = 4; else if (gcs < 10) neu = 3; else if (gcs < 13) neu = 2; else if (gcs < 15) neu = 1;
  if (cr >= 5 || di < 200) ren = 4;
  else if ((cr >= 3.5 && cr < 5) || (di >= 200 && di < 500)) ren = 3;
  else if (cr >= 2 && cr < 3.5) ren = 2;
  else if (cr >= 1.2 && cr < 2) ren = 1;
  return { res, plq, bl, cvs, neu, ren };
}
