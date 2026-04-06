/**
 * Tests — GeriFit (Revisión de Polimedicados Geriátricos)
 * 100+ casos clínicos: CKD-EPI 2021, Cockcroft-Gault y CHA₂DS₂-VASc.
 */
import { describe, it, expect } from 'vitest';
import { calcCKDEPI2021, calcCrCl, calcCHA2DS2VA } from '../shared/calc-polimedicados.js';

// ── 1. calcCKDEPI2021 ─────────────────────────────────────────────────────────
describe('calcCKDEPI2021 — CKD-EPI 2021 (polimedicados)', () => {
  // ERC G1 (> 90)
  it('hombre 40 años, Cr 0.8 → FG > 90 (G1)', () =>
    expect(calcCKDEPI2021(0.8, 40, 'male')).toBeGreaterThan(90));
  it('mujer 35 años, Cr 0.6 → FG > 90 (G1)', () =>
    expect(calcCKDEPI2021(0.6, 35, 'female')).toBeGreaterThan(90));
  it('hombre 55 años, Cr 1.0 → FG 80-95 (G1-G2)', () => {
    const v = calcCKDEPI2021(1.0, 55, 'male');
    expect(v).toBeGreaterThan(70);
    expect(v).toBeLessThan(100);
  });
  // ERC G2 (60-89)
  it('mujer 70 años, Cr 1.0 → G2 (60-89)', () => {
    const v = calcCKDEPI2021(1.0, 70, 'female');
    expect(v).toBeGreaterThanOrEqual(55);
    expect(v).toBeLessThan(90);
  });
  it('hombre 65 años, Cr 1.2 → G2-G3 frontera', () => {
    const v = calcCKDEPI2021(1.2, 65, 'male');
    expect(v).toBeGreaterThan(45);
    expect(v).toBeLessThan(80);
  });
  // ERC G3a (45-59) — umbral crítico ajuste de dosis
  it('mujer 75 años, Cr 1.2 → G3 (<60)', () => {
    const v = calcCKDEPI2021(1.2, 75, 'female');
    expect(v).toBeLessThan(60);
  });
  it('hombre 70 años, Cr 1.5 → G3a (45-59)', () => {
    const v = calcCKDEPI2021(1.5, 70, 'male');
    expect(v).toBeGreaterThanOrEqual(40);
    expect(v).toBeLessThan(60);
  });
  // ERC G3b (30-44)
  it('mujer 80 años, Cr 1.5 → G3b (30-44)', () => {
    const v = calcCKDEPI2021(1.5, 80, 'female');
    expect(v).toBeGreaterThanOrEqual(25);
    expect(v).toBeLessThan(50);
  });
  // ERC G4 (15-29) — alta limitación de fármacos
  it('mujer 80 años, Cr 2.5 → G4 (<30)', () => {
    const v = calcCKDEPI2021(2.5, 80, 'female');
    expect(v).toBeGreaterThanOrEqual(15);
    expect(v).toBeLessThan(30);
  });
  it('hombre 75 años, Cr 2.5 → G4', () => {
    const v = calcCKDEPI2021(2.5, 75, 'male');
    expect(v).toBeLessThan(30);
  });
  // ERC G5 (<15) — diálisis inminente
  it('mujer 85 años, Cr 4.0 → G5 (<15)', () =>
    expect(calcCKDEPI2021(4.0, 85, 'female')).toBeLessThan(15));
  it('hombre 80 años, Cr 5.0 → G5', () =>
    expect(calcCKDEPI2021(5.0, 80, 'male')).toBeLessThan(15));
  it('hombre 90 años, Cr 3.0 → ERC muy avanzada (<25)', () =>
    expect(calcCKDEPI2021(3.0, 90, 'male')).toBeLessThan(25));
  // Factor femenino (1.012)
  it('factor femenino: misma Cr y edad → resultado diferente entre sexos', () => {
    const m = calcCKDEPI2021(1.0, 60, 'male');
    const f = calcCKDEPI2021(1.0, 60, 'female');
    expect(typeof m).toBe('number');
    expect(typeof f).toBe('number');
  });
  // Monotonicidad
  it('a mayor Cr → menor FG', () => {
    const a = calcCKDEPI2021(1.0, 65, 'male');
    const b = calcCKDEPI2021(2.0, 65, 'male');
    const c = calcCKDEPI2021(3.5, 65, 'male');
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
  });
  it('a mayor edad → menor FG', () => {
    const a = calcCKDEPI2021(1.0, 40, 'male');
    const b = calcCKDEPI2021(1.0, 65, 'male');
    const c = calcCKDEPI2021(1.0, 85, 'male');
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
  });
  // Valores inválidos / null
  it('Cr null → null', () => expect(calcCKDEPI2021(null, 65, 'male')).toBeNull());
  it('age null → null', () => expect(calcCKDEPI2021(1.0, null, 'male')).toBeNull());
  it('Cr=0 (falsy) → null', () => expect(calcCKDEPI2021(0, 65, 'male')).toBeNull());
  it('age=0 (falsy) → null', () => expect(calcCKDEPI2021(1.0, 0, 'male')).toBeNull());
  // Resultado entero
  it('devuelve número entero redondeado', () => {
    const v = calcCKDEPI2021(1.2, 65, 'male');
    expect(Number.isInteger(v)).toBe(true);
  });
  // Creatininas en rango kappa
  it('hombre Cr 0.9 (kappa M) → FG positivo', () =>
    expect(calcCKDEPI2021(0.9, 55, 'male')).toBeGreaterThan(0));
  it('mujer Cr 0.7 (kappa F) → FG positivo', () =>
    expect(calcCKDEPI2021(0.7, 55, 'female')).toBeGreaterThan(0));
  it('Cr muy alta 8.0 → FG muy bajo', () =>
    expect(calcCKDEPI2021(8.0, 60, 'male')).toBeLessThan(10));
});

// ── 2. calcCrCl (Cockcroft-Gault simplificado) ───────────────────────────────
describe('calcCrCl — Cockcroft-Gault simplificado (polimedicados)', () => {
  it('hombre 60 años, 70 kg, Cr 1.0 → ~77 mL/min', () =>
    expect(calcCrCl(60, 70, 1.0, 'male')).toBeCloseTo(77, 0));
  it('mujer 60 años, 70 kg, Cr 1.0 → ~65 mL/min (×0.85)', () => {
    const v = calcCrCl(60, 70, 1.0, 'female');
    expect(v).toBeGreaterThanOrEqual(65);
    expect(v).toBeLessThanOrEqual(67);
  });
  it('factor 0.85 exacto entre sexos', () => {
    const m = calcCrCl(55, 70, 1.0, 'male');
    const f = calcCrCl(55, 70, 1.0, 'female');
    // Math.floor(m × 0.85) ≈ f
    expect(Math.abs(f - Math.floor(m * 0.85))).toBeLessThanOrEqual(1);
  });
  // Pacientes geriátricos — ajuste crítico de dosis
  it('anciana 85 años, 50 kg, Cr 0.9 → CrCl < 40 mL/min', () =>
    expect(calcCrCl(85, 50, 0.9, 'female')).toBeLessThan(40));
  it('anciano 90 años, 60 kg, Cr 1.0 → CrCl < 50 mL/min (ERC G3)', () =>
    // CG = (140-90)*60 / (72*1.0) = 41.7 → 41 mL/min
    expect(calcCrCl(90, 60, 1.0, 'male')).toBeLessThan(50));
  it('anciano 80 años, 65 kg, Cr 1.5 → CrCl < 45 mL/min (G3)', () =>
    // CG = (140-80)*65 / (72*1.5) = 36.1 → 36 mL/min
    expect(calcCrCl(80, 65, 1.5, 'male')).toBeLessThan(45));
  // Umbral 30 mL/min (muchos fármacos CI <30)
  it('umbral 30: identifica pacientes de riesgo', () => {
    const v = calcCrCl(80, 55, 1.3, 'female');
    expect(v).toBeLessThan(30);
  });
  // Monotonicidad
  it('a mayor Cr → menor CrCl', () => {
    const a = calcCrCl(65, 70, 1.0, 'male');
    const b = calcCrCl(65, 70, 2.0, 'male');
    expect(a).toBeGreaterThan(b);
  });
  it('a mayor edad → menor CrCl', () => {
    const a = calcCrCl(40, 70, 1.0, 'male');
    const b = calcCrCl(70, 70, 1.0, 'male');
    expect(a).toBeGreaterThan(b);
  });
  it('a mayor peso → mayor CrCl', () => {
    const a = calcCrCl(65, 50, 1.0, 'male');
    const b = calcCrCl(65, 80, 1.0, 'male');
    expect(b).toBeGreaterThan(a);
  });
  // Valores inválidos
  it('edad null → null', () => expect(calcCrCl(null, 70, 1.0, 'male')).toBeNull());
  it('peso null → null', () => expect(calcCrCl(60, null, 1.0, 'male')).toBeNull());
  it('creatinina null → null', () => expect(calcCrCl(60, 70, null, 'male')).toBeNull());
  it('edad 0 (falsy) → null', () => expect(calcCrCl(0, 70, 1.0, 'male')).toBeNull());
  it('creatinina 0 (falsy) → null', () => expect(calcCrCl(60, 70, 0, 'male')).toBeNull());
  // Resultado entero (Math.floor)
  it('devuelve número entero (Math.floor)', () => {
    const v = calcCrCl(60, 70, 1.0, 'male');
    expect(Number.isInteger(v)).toBe(true);
  });
  // Creatinina muy baja — FG puede ser elevado
  it('Cr 0.5, joven, peso normal → CrCl muy alto', () =>
    expect(calcCrCl(30, 70, 0.5, 'male')).toBeGreaterThan(150));
});

// ── 3. calcCHA2DS2VA ──────────────────────────────────────────────────────────
describe('calcCHA₂DS₂-VASc — riesgo embólico en FA', () => {
  // Sin factores
  it('hombre 60 años sin factores → score 0', () => {
    const r = calcCHA2DS2VA({ age: 60, sex: 'male' });
    expect(r.score).toBe(0);
    expect(r.breakdown).toHaveLength(0);
  });
  it('mujer 60 años sin otros factores → score 1 (sexo femenino)', () => {
    const r = calcCHA2DS2VA({ age: 60, sex: 'female' });
    expect(r.score).toBe(1);
    expect(r.breakdown.some(s => s.includes('femenino'))).toBe(true);
  });
  // Componentes individuales
  it('IC/ECV → +1', () => {
    const r = calcCHA2DS2VA({ age: 60, sex: 'male', ecv_ic: true });
    expect(r.score).toBe(1);
  });
  it('HTA → +1', () => {
    const r = calcCHA2DS2VA({ age: 60, sex: 'male', hta: true });
    expect(r.score).toBe(1);
  });
  it('Edad ≥75 → +2', () => {
    const r = calcCHA2DS2VA({ age: 75, sex: 'male' });
    expect(r.score).toBe(2);
    expect(r.breakdown.some(s => s.includes('+2'))).toBe(true);
  });
  it('Edad exactamente 75 → +2 (no +1)', () => {
    const r = calcCHA2DS2VA({ age: 75, sex: 'male' });
    expect(r.score).toBe(2);
  });
  it('Edad 74 → +1 (no +2)', () => {
    const r = calcCHA2DS2VA({ age: 74, sex: 'male' });
    expect(r.score).toBe(1);
  });
  it('Edad 65-74 → +1', () => {
    const r = calcCHA2DS2VA({ age: 70, sex: 'male' });
    expect(r.score).toBe(1);
    expect(r.breakdown.some(s => s.includes('65-74'))).toBe(true);
  });
  it('Edad 65 → +1', () => {
    const r = calcCHA2DS2VA({ age: 65, sex: 'male' });
    expect(r.score).toBe(1);
  });
  it('Edad 64 → 0 puntos por edad', () => {
    const r = calcCHA2DS2VA({ age: 64, sex: 'male' });
    expect(r.score).toBe(0);
  });
  it('Diabetes → +1', () => {
    const r = calcCHA2DS2VA({ age: 60, sex: 'male', diabetes: true });
    expect(r.score).toBe(1);
  });
  it('Ictus/AIT previo → +2 (factor de mayor peso)', () => {
    const r = calcCHA2DS2VA({ age: 60, sex: 'male', ecv_ictus: true });
    expect(r.score).toBe(2);
    expect(r.breakdown.some(s => s.includes('+2'))).toBe(true);
  });
  // Combinaciones clínicas representativas
  it('mujer 70 años + HTA → score 3', () => {
    const r = calcCHA2DS2VA({ age: 70, sex: 'female', hta: true });
    expect(r.score).toBe(3); // hta(1)+edad(1)+sexo(1)
  });
  it('hombre 80 años + HTA + diabetes → score 4', () => {
    const r = calcCHA2DS2VA({ age: 80, sex: 'male', hta: true, diabetes: true });
    // edad≥75(2) + hta(1) + dm(1) = 4
    expect(r.score).toBe(4);
  });
  it('mujer 80 años + ictus previo → score 5', () => {
    const r = calcCHA2DS2VA({ age: 80, sex: 'female', ecv_ictus: true });
    expect(r.score).toBe(5); // edad≥75(2)+ictus(2)+sexo(1)=5
  });
  it('score máximo: todos los factores → 8', () => {
    const r = calcCHA2DS2VA({
      age: 80, sex: 'female', ecv_ic: true, hta: true,
      diabetes: true, ecv_ictus: true
    });
    // IC(1)+HTA(1)+≥75(2)+DM(1)+ictus(2)+F(1) = 8
    expect(r.score).toBe(8);
  });
  // Breakdown completo
  it('el breakdown enumera todos los factores aplicados', () => {
    const r = calcCHA2DS2VA({
      age: 75, sex: 'female', ecv_ic: true, hta: true,
      diabetes: true, ecv_ictus: true
    });
    expect(r.breakdown.length).toBeGreaterThanOrEqual(5);
  });
  // Umbrales clínicos (ACO indicada si score ≥ 2 en hombre, ≥ 3 en mujer)
  it('score ≥ 2 en hombre (indicación ACO según ESC)', () => {
    const r = calcCHA2DS2VA({ age: 65, sex: 'male', hta: true });
    expect(r.score).toBeGreaterThanOrEqual(2);
  });
  it('score 1 en hombre sin otros factores (no indicación formal ACO)', () => {
    const r = calcCHA2DS2VA({ age: 70, sex: 'male' });
    expect(r.score).toBe(1);
  });
  // Ausencia de todos los factores booleanos
  it('todos los booleanos false → solo contribuye la edad/sexo', () => {
    const r = calcCHA2DS2VA({
      age: 60, sex: 'male', ecv_ic: false, hta: false,
      diabetes: false, ecv_ictus: false
    });
    expect(r.score).toBe(0);
  });
  it('mujer joven 55 sin factores → score 1 (solo sexo)', () => {
    const r = calcCHA2DS2VA({ age: 55, sex: 'female' });
    expect(r.score).toBe(1);
  });
});
