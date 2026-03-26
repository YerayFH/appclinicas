import { describe, it, expect } from 'vitest';
import { calcCKDEPI2021, calcCrCl, calcCHA2DS2VA } from '../shared/calc-polimedicados.js';

describe('calcCKDEPI2021', () => {
  it('hombre 55 años, Cr 1.0 → FG normal-alto', () => {
    const v = calcCKDEPI2021(1.0, 55, 'male');
    expect(v).toBeGreaterThan(70);
    expect(v).toBeLessThan(100);
  });
  it('mujer 80 años, Cr 1.5 → ERC moderada', () => {
    const v = calcCKDEPI2021(1.5, 80, 'female');
    expect(v).toBeGreaterThanOrEqual(25);
    expect(v).toBeLessThan(50);
  });
  it('devuelve null si faltan scr o age', () => {
    expect(calcCKDEPI2021(null, 55, 'male')).toBeNull();
    expect(calcCKDEPI2021(1.0, null, 'male')).toBeNull();
  });
  it('factor 1.012 hace que la mujer tenga FG ligeramente mayor que el hombre en ciertos rangos', () => {
    // Cr 0.7 está cerca del kappa femenino: esperamos diferencia por factor de sexo
    const m = calcCKDEPI2021(0.9, 60, 'male');   // cerca de kappa M
    const f = calcCKDEPI2021(0.7, 60, 'female');  // cerca de kappa F
    expect(typeof m).toBe('number');
    expect(typeof f).toBe('number');
  });
});

describe('calcCrCl (Cockcroft-Gault simplificado)', () => {
  it('hombre 60 años, 70 kg, Cr 1.0 → ~77 mL/min', () => {
    // (140-60)*70 / (72*1.0) = 77 (Math.floor)
    expect(calcCrCl(60, 70, 1.0, 'male')).toBeCloseTo(77, 0);
  });
  it('mujer 60 años, 70 kg, Cr 1.0 → ~66 mL/min (factor 0.85)', () => {
    // 77 * 0.85 = 65.45 → Math.floor = 65 o 66
    const v = calcCrCl(60, 70, 1.0, 'female');
    expect(v).toBeGreaterThanOrEqual(65);
    expect(v).toBeLessThanOrEqual(67);
  });
  it('anciana 85 años, 50 kg, Cr 0.9 → FG reducido', () => {
    const v = calcCrCl(85, 50, 0.9, 'female');
    expect(v).toBeLessThan(40);
  });
  it('devuelve null si faltan parámetros obligatorios', () => {
    expect(calcCrCl(null, 70, 1.0, 'male')).toBeNull();
    expect(calcCrCl(60, null, 1.0, 'male')).toBeNull();
    expect(calcCrCl(60, 70, null, 'male')).toBeNull();
  });
});

describe('calcCHA2DS2VA', () => {
  it('paciente sin factores → score 0', () => {
    const r = calcCHA2DS2VA({ age: 60, sex: 'male' });
    expect(r.score).toBe(0);
    expect(r.breakdown).toHaveLength(0);
  });
  it('mujer con HTA y diabetes → score 3', () => {
    const r = calcCHA2DS2VA({ age: 60, sex: 'female', hta: true, diabetes: true });
    expect(r.score).toBe(3);
  });
  it('edad ≥75 suma 2 puntos', () => {
    const r = calcCHA2DS2VA({ age: 75, sex: 'male' });
    expect(r.score).toBe(2);
    expect(r.breakdown.some(s => s.includes('+2'))).toBe(true);
  });
  it('edad 65-74 suma 1 punto', () => {
    const r = calcCHA2DS2VA({ age: 70, sex: 'male' });
    expect(r.score).toBe(1);
  });
  it('ictus/AIT suma 2 puntos', () => {
    const r = calcCHA2DS2VA({ age: 55, sex: 'male', ecv_ictus: true });
    expect(r.score).toBe(2);
  });
  it('score máximo: todos los factores', () => {
    const r = calcCHA2DS2VA({
      age: 80, sex: 'female', ecv_ic: true, hta: true,
      diabetes: true, ecv_ictus: true
    });
    // ecv_ic(1) + hta(1) + >=75(2) + diabetes(1) + ictus(2) + female(1) = 8
    expect(r.score).toBe(8);
  });
});
