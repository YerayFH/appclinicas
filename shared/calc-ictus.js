/**
 * Cálculos para StrokePilot — Protocolo de Ictus Agudo
 *
 * Funciones puras exportadas para tests unitarios.
 *
 * Refs:
 *   - Brott T et al. Stroke 1989;20(7):864-870 (NIHSS)
 *   - Hacke W et al. N Engl J Med. 2008;359(13):1317-1329 (tPA)
 *   - Nogueira RG et al. N Engl J Med. 2018;378(1):11-21 (EVT DAWN)
 *   - Albers GW et al. N Engl J Med. 2018;378(8):708-718 (EVT DEFUSE-3)
 */

/**
 * Definición completa de los 15 ítems NIHSS con sus valores máximos.
 * Total máximo posible: 42 puntos.
 */
export const NIHSS_ITEMS = [
  { key: 'n1a', label: '1a. Nivel de conciencia',     max: 3 },
  { key: 'n1b', label: '1b. Preguntas (mes/edad)',    max: 2 },
  { key: 'n1c', label: '1c. Órdenes',                max: 2 },
  { key: 'n2',  label: '2. Mirada conjugada',         max: 2 },
  { key: 'n3',  label: '3. Campos visuales',          max: 3 },
  { key: 'n4',  label: '4. Parálisis facial',         max: 3 },
  { key: 'n5a', label: '5a. Motor brazo izq.',        max: 4 },
  { key: 'n5b', label: '5b. Motor brazo der.',        max: 4 },
  { key: 'n6a', label: '6a. Motor pierna izq.',       max: 4 },
  { key: 'n6b', label: '6b. Motor pierna der.',       max: 4 },
  { key: 'n7',  label: '7. Ataxia',                   max: 2 },
  { key: 'n8',  label: '8. Sensibilidad',             max: 2 },
  { key: 'n9',  label: '9. Lenguaje / Afasia',        max: 3 },
  { key: 'n10', label: '10. Disartria',               max: 2 },
  { key: 'n11', label: '11. Extinción / Negligencia', max: 2 },
];

/**
 * Calcula la puntuación NIHSS total.
 * Aplica clamping al máximo de cada ítem (valor introducido > max → se usa max).
 *
 * @param {Record<string, string | number>} nihssItems - Mapa clave → valor (string numérico o número)
 * @returns {number} Puntuación total NIHSS (0–42)
 */
export function calcNihss(nihssItems) {
  return NIHSS_ITEMS.reduce(
    (acc, it) => acc + Math.min(parseInt(nihssItems[it.key]) || 0, it.max),
    0
  );
}

/**
 * Clasifica la gravedad del ictus según la escala NIHSS.
 * Ref: Adams HP Jr et al. Stroke 1999;30(1):207-212
 *
 * @param {number} n - Puntuación NIHSS
 * @returns {{ label: string, color: string }}
 */
export function nihssCategory(n) {
  if (n === 0) return { label: 'Sin déficit',  color: '#22c55e' };
  if (n <= 3)  return { label: 'Ictus menor',  color: '#84cc16' };
  if (n <= 5)  return { label: 'Leve',          color: '#eab308' };
  if (n <= 14) return { label: 'Moderado',      color: '#f97316' };
  if (n <= 24) return { label: 'Grave',         color: '#ef4444' };
  return              { label: 'Muy grave',     color: '#dc2626' };
}

/**
 * Determina si existe mismatch penumbral significativo.
 * Criterios (DAWN/DEFUSE-3): core ≤ 70 mL, ratio penumbra/core ≥ 1.8, diferencia ≥ 15 mL.
 *
 * @param {'auto' | 'manual'} mismatchMode
 * @param {string | number} core      - Volumen de core isquémico (mL), solo modo manual
 * @param {string | number} penumbra  - Volumen de penumbra (mL), solo modo manual
 * @param {boolean} autoConfirm       - Confirmación por imagen en modo auto
 * @returns {boolean}
 */
export function getMismatch(mismatchMode, core, penumbra, autoConfirm) {
  if (mismatchMode === 'auto' && autoConfirm === true) return true;
  if (mismatchMode === 'manual' && core !== '' && penumbra !== '') {
    const c = parseFloat(core);
    const p = parseFloat(penumbra);
    if (isNaN(c) || isNaN(p)) return false;
    if (c > 70) return false;                                   // Core demasiado grande
    const ratio = c > 0 ? p / c : Infinity;
    return ratio >= 1.8 && (p - c) >= 15;
  }
  return false;
}

/**
 * Determina la ventana terapéutica basada en el tiempo desde el inicio.
 *
 * @param {string} lkw              - Last Known Well (ISO datetime string)
 * @param {string} llegada          - Tiempo de llegada al hospital (ISO datetime string)
 * @param {boolean} tiempoDesconocido - ¿Inicio desconocido / Wake-up stroke?
 * @returns {{ label: string, color: string, zona: string, h?: number } | null}
 *   zona: 'desconocido' | 'temprana' | 'extendida' | 'tardia' | 'fuera'
 */
export function getVentanaInfo(lkw, llegada, tiempoDesconocido) {
  if (tiempoDesconocido === true)
    return { label: 'Tiempo desconocido / Wake-up', color: '#a855f7', zona: 'desconocido' };

  if (!lkw || !llegada) return null;

  const a = new Date(lkw);
  const b = new Date(llegada);
  const diff = (b - a) / 60000; // minutos
  if (isNaN(diff) || diff < 0) return null;

  const vh = diff / 60; // horas
  if (vh <= 4.5) return { label: '≤4.5 h',  color: '#22c55e', zona: 'temprana',  h: vh };
  if (vh <= 9)   return { label: '4.5–9 h',  color: '#eab308', zona: 'extendida', h: vh };
  if (vh <= 24)  return { label: '9–24 h',   color: '#f97316', zona: 'tardia',    h: vh };
  return               { label: '>24 h',     color: '#ef4444', zona: 'fuera',     h: vh };
}
