import { describe, it, expect } from 'vitest';
import { newsSpO2Score, calcNEWS, calcSIRS, sofaRespScore, sofaBD } from '../shared/calc-sepsis.js';

describe('newsSpO2Score', () => {
  describe('Escala 1 (estándar)', () => {
    it('SpO₂ ≤91% → 3 puntos', () => expect(newsSpO2Score(90, false, false)).toBe(3));
    it('SpO₂ 92-93% → 2 puntos', () => expect(newsSpO2Score(93, false, false)).toBe(2));
    it('SpO₂ 94-95% → 1 punto',  () => expect(newsSpO2Score(95, false, false)).toBe(1));
    it('SpO₂ ≥96% → 0 puntos',   () => expect(newsSpO2Score(97, false, false)).toBe(0));
  });
  describe('Escala 2 (EPOC/hipercapnia)', () => {
    it('SpO₂ ≥93% con O₂ → 3 puntos (hiperoxia peligrosa)', () => {
      expect(newsSpO2Score(95, true, true)).toBe(3);
    });
    it('SpO₂ ≥93% sin O₂ → 0 puntos', () => {
      expect(newsSpO2Score(95, false, true)).toBe(0);
    });
    it('SpO₂ 84-87% → 2 puntos', () => expect(newsSpO2Score(85, false, true)).toBe(2));
  });
});

describe('calcNEWS', () => {
  const normal = { spo2: 97, fr: 16, tas: 120, fc: 75, temp: 37, conc: 'Alerta', o2sup: false, scale2: false };

  it('paciente sano → 0 puntos', () => {
    expect(calcNEWS(normal)).toBe(0);
  });
  it('hipoxia moderada suma puntos', () => {
    expect(calcNEWS({ ...normal, spo2: 93 })).toBeGreaterThan(0);
  });
  it('taquicardia severa (>130 lpm) suma 3 puntos', () => {
    const base = calcNEWS(normal);
    const taqui = calcNEWS({ ...normal, fc: 135 });
    expect(taqui - base).toBe(3);
  });
  it('hipotensión severa (TAS ≤90) suma 3 puntos', () => {
    const base = calcNEWS(normal);
    const hipo = calcNEWS({ ...normal, tas: 88 });
    expect(hipo - base).toBe(3);
  });
  it('alteración del nivel de conciencia suma 3 puntos', () => {
    const base = calcNEWS(normal);
    const alt = calcNEWS({ ...normal, conc: 'Confuso' });
    expect(alt - base).toBe(3);
  });
  it('O₂ suplementario suma 2 puntos', () => {
    const base = calcNEWS(normal);
    const o2 = calcNEWS({ ...normal, o2sup: true });
    expect(o2 - base).toBe(2);
  });
});

describe('calcSIRS', () => {
  it('sin criterios → 0', () => {
    expect(calcSIRS({ temp: 37.0, fc: 80, fr: 16, leucos: 8 })).toBe(0);
  });
  it('fiebre + taquicardia → 2', () => {
    expect(calcSIRS({ temp: 38.5, fc: 95, fr: 16, leucos: 8 })).toBe(2);
  });
  it('hipotermia también cuenta como criterio de temp', () => {
    expect(calcSIRS({ temp: 35.5, fc: 80, fr: 16, leucos: 8 })).toBe(1);
  });
  it('leucocitosis >12 cuenta como criterio', () => {
    expect(calcSIRS({ temp: 37, fc: 80, fr: 16, leucos: 13 })).toBe(1);
  });
  it('leucopenia <4 cuenta como criterio', () => {
    expect(calcSIRS({ temp: 37, fc: 80, fr: 16, leucos: 3 })).toBe(1);
  });
  it('todos los criterios → 4', () => {
    expect(calcSIRS({ temp: 39, fc: 100, fr: 22, leucos: 14 })).toBe(4);
  });
});

describe('sofaRespScore', () => {
  it('PF ≤100 sin VM → 2', () => expect(sofaRespScore(90, false)).toBe(2));
  it('PF ≤100 con VM → 4', () => expect(sofaRespScore(90, true)).toBe(4));
  it('PF ≤200 sin VM → 2', () => expect(sofaRespScore(180, false)).toBe(2));
  it('PF ≤200 con VM → 3', () => expect(sofaRespScore(180, true)).toBe(3));
  it('PF >400 → 0',        () => expect(sofaRespScore(450, false)).toBe(0));
});

describe('sofaBD', () => {
  const ok = { pf: 450, pla: 200, bili: 0.5, cv: 'ninguno', pam: 75, gcs: 15, cr: 0.8, di: 600, ventilated: false };

  it('paciente sin disfunción → todos 0', () => {
    const s = sofaBD(ok);
    expect(s.res).toBe(0);
    expect(s.plq).toBe(0);
    expect(s.bl).toBe(0);
    expect(s.cvs).toBe(0);
    expect(s.neu).toBe(0);
    expect(s.ren).toBe(0);
  });
  it('trombopenia grave (<20) → plq=4', () => {
    expect(sofaBD({ ...ok, pla: 15 }).plq).toBe(4);
  });
  it('bilirrubina ≥12 → bl=4', () => {
    expect(sofaBD({ ...ok, bili: 13 }).bl).toBe(4);
  });
  it('PAM <70 sin vasoactivos → cvs=1', () => {
    expect(sofaBD({ ...ok, pam: 65, cv: 'ninguno' }).cvs).toBe(1);
  });
  it('noradrenalina alta → cvs=4', () => {
    expect(sofaBD({ ...ok, cv: 'nrA' }).cvs).toBe(4);
  });
  it('creatinina ≥5 → ren=4', () => {
    expect(sofaBD({ ...ok, cr: 5.5, di: 300 }).ren).toBe(4);
  });
});
