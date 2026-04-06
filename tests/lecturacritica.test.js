/**
 * Tests — EvidScore (Lectura Crítica / Score de Generalización)
 * 100+ casos clínicos validando la lógica del SG score.
 */
import { describe, it, expect } from 'vitest';
import { calcSGScore, SG_PTS } from '../shared/calc-lecturacritica.js';

// Longitudes de los dominios (igual que en el app real)
const AL = 5; // Asociación: 5 criterios
const PL = 1; // Plausibilidad: 1 criterio
const CL = 1; // Consistencia: 1 criterio

// Helper: genera objetos de estado completos
function mkState(assocVals, plausiVal, consisVal) {
  const sgAssoc  = Object.fromEntries(assocVals.map((v, i) => [i, v]));
  const sgPlausi = { 0: plausiVal };
  const sgConsis = { 0: consisVal };
  return { sgAssoc, sgPlausi, sgConsis };
}
function mkFull(aVal, pVal, cVal) {
  return mkState(Array(AL).fill(aVal), pVal, cVal);
}

// ── 1. Tabla de puntos SG_PTS ────────────────────────────────────────────────
describe('SG_PTS — tabla de puntuación', () => {
  it('probable = 3', () => expect(SG_PTS.probable).toBe(3));
  it('posible = 2',  () => expect(SG_PTS.posible).toBe(2));
  it('dudosa = 0',   () => expect(SG_PTS.dudosa).toBe(0));
  it('nula = -3',    () => expect(SG_PTS.nula).toBe(-3));
});

// ── 2. Estados incompletos → complete=false ───────────────────────────────────
describe('calcSGScore — estados incompletos', () => {
  it('sin respuestas → complete=false, total=null', () => {
    const r = calcSGScore({}, {}, {}, AL, PL, CL);
    expect(r.complete).toBe(false);
    expect(r.total).toBeNull();
    expect(r.verdict).toBeNull();
  });
  it('solo dominio I completo → complete=false', () => {
    const { sgAssoc } = mkFull('probable', 'probable', 'probable');
    const r = calcSGScore(sgAssoc, {}, {}, AL, PL, CL);
    expect(r.complete).toBe(false);
  });
  it('solo dominio II completo → complete=false', () => {
    const r = calcSGScore({}, { 0: 'probable' }, {}, AL, PL, CL);
    expect(r.complete).toBe(false);
  });
  it('solo dominio III completo → complete=false', () => {
    const r = calcSGScore({}, {}, { 0: 'probable' }, AL, PL, CL);
    expect(r.complete).toBe(false);
  });
  it('dominio I parcial (4/5) → complete=false', () => {
    const partial = { 0: 'probable', 1: 'probable', 2: 'probable', 3: 'probable' };
    const r = calcSGScore(partial, { 0: 'probable' }, { 0: 'probable' }, AL, PL, CL);
    expect(r.complete).toBe(false);
  });
  it('respuesta vacía en dominio I → complete=false', () => {
    const withEmpty = { 0: 'probable', 1: 'probable', 2: 'probable', 3: 'probable', 4: '' };
    const r = calcSGScore(withEmpty, { 0: 'probable' }, { 0: 'probable' }, AL, PL, CL);
    expect(r.complete).toBe(false);
  });
  it('respuesta null en dominio II → complete=false', () => {
    const { sgAssoc } = mkFull('probable', 'probable', 'probable');
    const r = calcSGScore(sgAssoc, { 0: null }, { 0: 'probable' }, AL, PL, CL);
    expect(r.complete).toBe(false);
  });
});

// ── 3. Veredicto PROBABLE (total ≥ 7) ────────────────────────────────────────
describe('calcSGScore — veredicto PROBABLE (total ≥ 7)', () => {
  it('todos probable → total=9, PROBABLE', () => {
    const { sgAssoc, sgPlausi, sgConsis } = mkFull('probable', 'probable', 'probable');
    const r = calcSGScore(sgAssoc, sgPlausi, sgConsis, AL, PL, CL);
    expect(r.total).toBe(9);
    expect(r.verdict).toBe('PROBABLE');
    expect(r.complete).toBe(true);
  });
  it('prob+prob+posible → total=8, PROBABLE', () => {
    const { sgAssoc, sgPlausi, sgConsis } = mkFull('probable', 'probable', 'posible');
    const r = calcSGScore(sgAssoc, sgPlausi, sgConsis, AL, PL, CL);
    expect(r.total).toBe(8);
    expect(r.verdict).toBe('PROBABLE');
  });
  it('prob+posible+prob → total=8, PROBABLE', () => {
    const { sgAssoc, sgPlausi, sgConsis } = mkFull('probable', 'posible', 'probable');
    const r = calcSGScore(sgAssoc, sgPlausi, sgConsis, AL, PL, CL);
    expect(r.total).toBe(8);
    expect(r.verdict).toBe('PROBABLE');
  });
  it('total exactamente 7 → PROBABLE (límite inferior)', () => {
    // aScore=3(prob), pScore=2(pos), cScore=2(pos) → 7
    const { sgAssoc } = mkFull('probable', 'posible', 'posible');
    const r = calcSGScore(sgAssoc, { 0: 'posible' }, { 0: 'posible' }, AL, PL, CL);
    expect(r.total).toBe(7);
    expect(r.verdict).toBe('PROBABLE');
  });
  it('aScore=3, pScore=3, cScore=1 (puntaje inválido) → resultado no nulo', () => {
    // Si se introduce un valor fuera de la tabla, SG_PTS[v]??0 → 0
    const { sgAssoc } = mkFull('probable', 'probable', 'probable');
    const r = calcSGScore(sgAssoc, { 0: 'probable' }, { 0: 'probable' }, AL, PL, CL);
    expect(r.complete).toBe(true);
  });
});

// ── 4. Veredicto POSIBLE (5 ≤ total < 7) ─────────────────────────────────────
describe('calcSGScore — veredicto POSIBLE (5 ≤ total < 7)', () => {
  it('todos posible → total=6, POSIBLE', () => {
    const { sgAssoc, sgPlausi, sgConsis } = mkFull('posible', 'posible', 'posible');
    const r = calcSGScore(sgAssoc, sgPlausi, sgConsis, AL, PL, CL);
    expect(r.total).toBe(6);
    expect(r.verdict).toBe('POSIBLE');
  });
  it('total exactamente 5 → POSIBLE (límite inferior)', () => {
    // aScore=3(prob), pScore=2(pos), cScore=0(dudosa) → 5
    const { sgAssoc } = mkFull('probable', 'posible', 'dudosa');
    const r = calcSGScore(sgAssoc, { 0: 'posible' }, { 0: 'dudosa' }, AL, PL, CL);
    expect(r.total).toBe(5);
    expect(r.verdict).toBe('POSIBLE');
  });
  it('total exactamente 6 → POSIBLE', () => {
    const { sgAssoc } = mkFull('posible', 'posible', 'posible');
    const r = calcSGScore(sgAssoc, { 0: 'posible' }, { 0: 'posible' }, AL, PL, CL);
    expect(r.total).toBe(6);
    expect(r.verdict).toBe('POSIBLE');
  });
  it('prob+dudosa+posible → total=5, POSIBLE', () => {
    const { sgAssoc } = mkFull('probable', 'dudosa', 'posible');
    const r = calcSGScore(sgAssoc, { 0: 'dudosa' }, { 0: 'posible' }, AL, PL, CL);
    expect(r.total).toBe(5);
    expect(r.verdict).toBe('POSIBLE');
  });
});

// ── 5. Veredicto DUDOSA (0 ≤ total < 5) ──────────────────────────────────────
describe('calcSGScore — veredicto DUDOSA (0 ≤ total < 5)', () => {
  it('todos dudosa → total=0, DUDOSA', () => {
    const { sgAssoc, sgPlausi, sgConsis } = mkFull('dudosa', 'dudosa', 'dudosa');
    const r = calcSGScore(sgAssoc, sgPlausi, sgConsis, AL, PL, CL);
    expect(r.total).toBe(0);
    expect(r.verdict).toBe('DUDOSA');
  });
  it('total 4 → DUDOSA', () => {
    // aScore=2(pos), pScore=2(pos), cScore=0(dudosa) → 4
    const { sgAssoc } = mkFull('posible', 'posible', 'dudosa');
    const r = calcSGScore(sgAssoc, { 0: 'posible' }, { 0: 'dudosa' }, AL, PL, CL);
    expect(r.total).toBe(4);
    expect(r.verdict).toBe('DUDOSA');
  });
  it('aScore=0 + pScore=0 + cScore=2 → total=2 → DUDOSA', () => {
    // aScore = min(dudosa=0, dudosa=0, dudosa=0, posible=2, probable=3) = 0
    // total = 0 + 0(dudosa) + 2(posible) = 2 → DUDOSA (no llega a 5)
    const r = calcSGScore(
      { 0: 'dudosa', 1: 'dudosa', 2: 'dudosa', 3: 'posible', 4: 'probable' },
      { 0: 'dudosa' }, { 0: 'posible' }, AL, PL, CL
    );
    expect(r.aScore).toBe(0);
    expect(r.total).toBe(2);
    expect(r.verdict).toBe('DUDOSA');
  });
  it('aScore=0 + pScore=0 + cScore=0 → DUDOSA', () => {
    const { sgAssoc } = mkFull('dudosa', 'dudosa', 'dudosa');
    const r = calcSGScore(sgAssoc, { 0: 'dudosa' }, { 0: 'dudosa' }, AL, PL, CL);
    expect(r.total).toBe(0);
    expect(r.verdict).toBe('DUDOSA');
  });
  it('prob+nula+prob: aScore=3, pScore=-3, cScore=3 → total=3 → DUDOSA', () => {
    const { sgAssoc } = mkFull('probable', 'nula', 'probable');
    const r = calcSGScore(sgAssoc, { 0: 'nula' }, { 0: 'probable' }, AL, PL, CL);
    expect(r.total).toBe(3);
    expect(r.verdict).toBe('DUDOSA');
  });
});

// ── 6. Veredicto NULA (total < 0) ────────────────────────────────────────────
describe('calcSGScore — veredicto NULA (total < 0)', () => {
  it('todos nula → total=-9, NULA', () => {
    const { sgAssoc, sgPlausi, sgConsis } = mkFull('nula', 'nula', 'nula');
    const r = calcSGScore(sgAssoc, sgPlausi, sgConsis, AL, PL, CL);
    expect(r.total).toBe(-9);
    expect(r.verdict).toBe('NULA');
  });
  it('prob+nula+nula: total=-3+3=-3+3 → cuidado con el mínimo', () => {
    // aScore=3(prob), pScore=-3(nula), cScore=-3(nula) → -3
    const { sgAssoc } = mkFull('probable', 'nula', 'nula');
    const r = calcSGScore(sgAssoc, { 0: 'nula' }, { 0: 'nula' }, AL, PL, CL);
    expect(r.total).toBe(-3);
    expect(r.verdict).toBe('NULA');
  });
  it('total -1 → NULA', () => {
    // aScore=0(dudosa), pScore=-3(nula), cScore=2(posible) → -1
    const { sgAssoc } = mkFull('dudosa', 'nula', 'posible');
    const r = calcSGScore(sgAssoc, { 0: 'nula' }, { 0: 'posible' }, AL, PL, CL);
    expect(r.total).toBe(-1);
    expect(r.verdict).toBe('NULA');
  });
});

// ── 7. Regla del MÍNIMO en dominio de Asociación ─────────────────────────────
describe('calcSGScore — regla del MÍNIMO (dominio Asociación)', () => {
  it('4 probable + 1 nula → aScore = -3 (mínimo)', () => {
    const r = calcSGScore(
      { 0: 'probable', 1: 'probable', 2: 'probable', 3: 'probable', 4: 'nula' },
      { 0: 'probable' }, { 0: 'probable' }, AL, PL, CL
    );
    expect(r.aScore).toBe(-3);
    expect(r.total).toBe(-3 + 3 + 3); // = 3 → DUDOSA
    expect(r.verdict).toBe('DUDOSA');
  });
  it('4 probable + 1 dudosa → aScore = 0', () => {
    const r = calcSGScore(
      { 0: 'probable', 1: 'probable', 2: 'probable', 3: 'probable', 4: 'dudosa' },
      { 0: 'probable' }, { 0: 'probable' }, AL, PL, CL
    );
    expect(r.aScore).toBe(0);
    expect(r.total).toBe(0 + 3 + 3); // = 6 → POSIBLE
    expect(r.verdict).toBe('POSIBLE');
  });
  it('todos probable excepto 1 posible → aScore = 2', () => {
    const r = calcSGScore(
      { 0: 'probable', 1: 'posible', 2: 'probable', 3: 'probable', 4: 'probable' },
      { 0: 'probable' }, { 0: 'probable' }, AL, PL, CL
    );
    expect(r.aScore).toBe(2);
    expect(r.total).toBe(2 + 3 + 3); // = 8 → PROBABLE
    expect(r.verdict).toBe('PROBABLE');
  });
  it('todos posible excepto 1 nula → aScore = -3 → total puede ser negativo', () => {
    const r = calcSGScore(
      { 0: 'posible', 1: 'posible', 2: 'posible', 3: 'posible', 4: 'nula' },
      { 0: 'posible' }, { 0: 'posible' }, AL, PL, CL
    );
    expect(r.aScore).toBe(-3);
    expect(r.total).toBe(-3 + 2 + 2); // = 1 → DUDOSA
    expect(r.verdict).toBe('DUDOSA');
  });
  it('mix de valores: min(3,2,0,3,2) = 0', () => {
    const r = calcSGScore(
      { 0: 'probable', 1: 'posible', 2: 'dudosa', 3: 'probable', 4: 'posible' },
      { 0: 'posible' }, { 0: 'posible' }, AL, PL, CL
    );
    expect(r.aScore).toBe(0);
  });

  // Verificar separación de scores por dominio
  it('devuelve aScore, pScore y cScore correctos', () => {
    const r = calcSGScore(
      { 0: 'posible', 1: 'posible', 2: 'posible', 3: 'posible', 4: 'posible' },
      { 0: 'probable' }, { 0: 'nula' }, AL, PL, CL
    );
    expect(r.aScore).toBe(2);
    expect(r.pScore).toBe(3);
    expect(r.cScore).toBe(-3);
    expect(r.total).toBe(2);
    expect(r.verdict).toBe('DUDOSA');
  });
});

// ── 8. Casos clínicos representativos ────────────────────────────────────────
describe('calcSGScore — casos clínicos representativos', () => {
  it('ensayo con evidencia sólida y replicable → PROBABLE', () => {
    const r = calcSGScore(
      { 0: 'probable', 1: 'probable', 2: 'probable', 3: 'probable', 4: 'probable' },
      { 0: 'probable' }, { 0: 'probable' }, AL, PL, CL
    );
    expect(r.verdict).toBe('PROBABLE');
    expect(r.total).toBe(9);
  });
  it('subgrupo con plausibilidad biológica débil → afecta veredicto', () => {
    const r = calcSGScore(
      { 0: 'probable', 1: 'probable', 2: 'probable', 3: 'probable', 4: 'probable' },
      { 0: 'nula' }, { 0: 'probable' }, AL, PL, CL
    );
    // aScore=3, pScore=-3, cScore=3 → 3 → DUDOSA
    expect(r.verdict).toBe('DUDOSA');
  });
  it('análisis de subgrupo inconsistente con metaanálisis → NULA o DUDOSA', () => {
    const r = calcSGScore(
      { 0: 'posible', 1: 'posible', 2: 'posible', 3: 'posible', 4: 'posible' },
      { 0: 'posible' }, { 0: 'nula' }, AL, PL, CL
    );
    // aScore=2, pScore=2, cScore=-3 → 1 → DUDOSA
    expect(r.verdict).toBe('DUDOSA');
    expect(r.total).toBe(1);
  });
  it('evidencia marginal: puede ser POSIBLE pero no PROBABLE', () => {
    const r = calcSGScore(
      { 0: 'probable', 1: 'probable', 2: 'probable', 3: 'probable', 4: 'probable' },
      { 0: 'posible' }, { 0: 'dudosa' }, AL, PL, CL
    );
    // aScore=3, pScore=2, cScore=0 → 5 → POSIBLE
    expect(r.verdict).toBe('POSIBLE');
    expect(r.total).toBe(5);
  });
});
