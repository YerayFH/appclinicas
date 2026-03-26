import { describe, it, expect } from 'vitest';
import { calcSGScore, SG_PTS } from '../shared/calc-lecturacritica.js';

// Simulamos la longitud de los dominios del app real
const ASSOC_LEN  = 5; // SG_ASSOC tiene 5 criterios
const PLAUSI_LEN = 1; // SG_PLAUSI tiene 1 criterio
const CONSIS_LEN = 1; // SG_CONSIS tiene 1 criterio

function makeFullState(assocVal, plausiVal, consisVal) {
  const sgAssoc  = Object.fromEntries([...Array(ASSOC_LEN)].map((_, i) => [i, assocVal]));
  const sgPlausi = { 0: plausiVal };
  const sgConsis = { 0: consisVal };
  return { sgAssoc, sgPlausi, sgConsis };
}

describe('SG_PTS', () => {
  it('probable = 3', () => expect(SG_PTS.probable).toBe(3));
  it('posible = 2',  () => expect(SG_PTS.posible).toBe(2));
  it('dudosa = 0',   () => expect(SG_PTS.dudosa).toBe(0));
  it('nula = -3',    () => expect(SG_PTS.nula).toBe(-3));
});

describe('calcSGScore', () => {
  it('estado incompleto → complete=false, total=null', () => {
    const r = calcSGScore({}, {}, {}, ASSOC_LEN, PLAUSI_LEN, CONSIS_LEN);
    expect(r.complete).toBe(false);
    expect(r.total).toBeNull();
  });

  it('todos probable → total=9, verdict=PROBABLE', () => {
    const { sgAssoc, sgPlausi, sgConsis } = makeFullState('probable', 'probable', 'probable');
    const r = calcSGScore(sgAssoc, sgPlausi, sgConsis, ASSOC_LEN, PLAUSI_LEN, CONSIS_LEN);
    expect(r.complete).toBe(true);
    expect(r.total).toBe(9);
    expect(r.verdict).toBe('PROBABLE');
  });

  it('todos posible → total=6, verdict=PROBABLE (≥5 puede ser POSIBLE pero ≥7 es PROBABLE)', () => {
    const { sgAssoc, sgPlausi, sgConsis } = makeFullState('posible', 'posible', 'posible');
    const r = calcSGScore(sgAssoc, sgPlausi, sgConsis, ASSOC_LEN, PLAUSI_LEN, CONSIS_LEN);
    expect(r.total).toBe(6);
    expect(r.verdict).toBe('POSIBLE');
  });

  it('todos dudosa → total=0, verdict=DUDOSA', () => {
    const { sgAssoc, sgPlausi, sgConsis } = makeFullState('dudosa', 'dudosa', 'dudosa');
    const r = calcSGScore(sgAssoc, sgPlausi, sgConsis, ASSOC_LEN, PLAUSI_LEN, CONSIS_LEN);
    expect(r.total).toBe(0);
    expect(r.verdict).toBe('DUDOSA');
  });

  it('todos nula → total=-9, verdict=NULA', () => {
    const { sgAssoc, sgPlausi, sgConsis } = makeFullState('nula', 'nula', 'nula');
    const r = calcSGScore(sgAssoc, sgPlausi, sgConsis, ASSOC_LEN, PLAUSI_LEN, CONSIS_LEN);
    expect(r.total).toBe(-9);
    expect(r.verdict).toBe('NULA');
  });

  it('el aScore usa el MÍNIMO de los criterios de asociación', () => {
    const sgAssoc = { 0: 'probable', 1: 'probable', 2: 'probable', 3: 'probable', 4: 'nula' };
    const r = calcSGScore(sgAssoc, { 0: 'probable' }, { 0: 'probable' }, ASSOC_LEN, PLAUSI_LEN, CONSIS_LEN);
    // aScore = min(3,3,3,3,-3) = -3
    expect(r.aScore).toBe(-3);
    // total = -3 + 3 + 3 = 3 → DUDOSA (≥0)
    expect(r.verdict).toBe('DUDOSA');
  });

  it('umbral PROBABLE: total ≥7', () => {
    // aScore=3(probable), pScore=2(posible), cScore=3(probable) → total=8
    const sgAssoc = Object.fromEntries([...Array(ASSOC_LEN)].map((_, i) => [i, 'probable']));
    const r = calcSGScore(sgAssoc, { 0: 'posible' }, { 0: 'probable' }, ASSOC_LEN, PLAUSI_LEN, CONSIS_LEN);
    expect(r.total).toBe(8);
    expect(r.verdict).toBe('PROBABLE');
  });
});
