/**
 * Cálculo del Score de Generalización (SG) — Lectura crítica
 *
 * Evalúa la validez externa de un ensayo clínico según tres dominios:
 *   I.  Asociación (mínimo de puntuaciones de los criterios de asociación)
 *   II. Plausibilidad biológica previa
 *   III. Consistencia con otros estudios/metaanálisis
 *
 * Escala de puntuación: probable=3, posible=2, dudosa=0, nula=-3
 * Total máximo: 9 | Interpretación: ≥7 Probable, ≥5 Posible, ≥0 Dudosa, <0 Nula
 *
 * Ref: Aplicación interna HUPR — Farmacia Hospitalaria.
 */

/** Tabla de puntos por categoría */
export const SG_PTS = { probable: 3, posible: 2, dudosa: 0, nula: -3 };

/**
 * Calcula el Score de Generalización dado el estado de los tres dominios.
 * @param {Record<number, string>} sgAssoc   - Respuestas del dominio I (índice → valor)
 * @param {Record<number, string>} sgPlausi  - Respuestas del dominio II (índice → valor)
 * @param {Record<number, string>} sgConsis  - Respuestas del dominio III (índice → valor)
 * @param {number} assocLen  - Número total de preguntas en dominio I
 * @param {number} plausiLen - Número total de preguntas en dominio II
 * @param {number} consisLen - Número total de preguntas en dominio III
 * @returns {{
 *   total: number, verdict: string,
 *   aScore: number, pScore: number, cScore: number,
 *   complete: boolean
 * }}
 */
export function calcSGScore(sgAssoc, sgPlausi, sgConsis, assocLen, plausiLen, consisLen) {
  const aFull = Object.keys(sgAssoc).length === assocLen && Object.values(sgAssoc).every(v => v);
  const pFull = Object.keys(sgPlausi).length === plausiLen && Object.values(sgPlausi).every(v => v);
  const cFull = Object.keys(sgConsis).length === consisLen && Object.values(sgConsis).every(v => v);

  if (!aFull || !pFull || !cFull) {
    return { total: null, verdict: null, aScore: null, pScore: null, cScore: null, complete: false };
  }

  const aScore = Math.min(...Object.values(sgAssoc).map(v => SG_PTS[v] ?? 0));
  const pScore = SG_PTS[sgPlausi[0]] ?? 0;
  const cScore = SG_PTS[sgConsis[0]] ?? 0;
  const total = aScore + pScore + cScore;

  let verdict;
  if (total >= 7)      verdict = 'PROBABLE';
  else if (total >= 5) verdict = 'POSIBLE';
  else if (total >= 0) verdict = 'DUDOSA';
  else                 verdict = 'NULA';

  return { total, verdict, aScore, pScore, cScore, complete: true };
}
