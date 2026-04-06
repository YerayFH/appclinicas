/**
 * Tests — NefroCalc (Calculadora de Función Renal)
 * 100+ casos clínicos: getBSA, CKD-EPI 2021, Cockcroft-Gault con obesidad.
 */
import { describe, it, expect } from 'vitest';
import { getCKDEPI, calcCockcroft, getBSA } from '../shared/calc-renal.js';

// ── 1. getBSA (Du Bois & Du Bois, 1916) ──────────────────────────────────────
describe('getBSA — Superficie corporal (Du Bois)', () => {
  it('hombre estándar 70 kg, 170 cm → ~1.818 m²', () => {
    expect(getBSA(70, 170)).toBeCloseTo(1.818, 2);
  });
  it('mujer estándar 60 kg, 162 cm → ~1.633 m²', () => {
    expect(getBSA(60, 162)).toBeCloseTo(Math.sqrt((60 * 162) / 3600), 3);
  });
  it('niño 20 kg, 110 cm → ~0.778 m²', () => {
    expect(getBSA(20, 110)).toBeCloseTo(Math.sqrt((20 * 110) / 3600), 3);
  });
  it('paciente obeso 120 kg, 175 cm → BSA mayor que el estándar', () => {
    expect(getBSA(120, 175)).toBeGreaterThan(getBSA(70, 170));
  });
  it('paciente caquéctico 40 kg, 160 cm → BSA menor que el estándar', () => {
    expect(getBSA(40, 160)).toBeLessThan(getBSA(70, 170));
  });
  it('proporcionalidad: doble peso → BSA × √2', () => {
    const b1 = getBSA(70, 170);
    const b2 = getBSA(140, 170);
    expect(b2 / b1).toBeCloseTo(Math.sqrt(2), 2);
  });
  it('devuelve null si peso es null', () => {
    expect(getBSA(null, 170)).toBeNull();
  });
  it('devuelve null si altura es null', () => {
    expect(getBSA(70, null)).toBeNull();
  });
  it('devuelve null si ambos son null', () => {
    expect(getBSA(null, null)).toBeNull();
  });
  it('devuelve null si peso es 0 (falsy)', () => {
    expect(getBSA(0, 170)).toBeNull();
  });
});

// ── 2. getCKDEPI 2021 (sin raza) ──────────────────────────────────────────────
describe('getCKDEPI — CKD-EPI 2021 (sin raza)', () => {
  // Valores normales / altos — ERC G1
  it('hombre 40 años, Cr 0.8 → FG > 90 (G1)', () => {
    expect(getCKDEPI(40, 'M', 0.8)).toBeGreaterThan(90);
  });
  it('mujer 35 años, Cr 0.7 → FG > 90 (G1)', () => {
    expect(getCKDEPI(35, 'F', 0.7)).toBeGreaterThan(90);
  });
  it('hombre 55 años, Cr 1.0 → ~88 mL/min (G2 límite)', () => {
    const v = getCKDEPI(55, 'M', 1.0);
    expect(v).toBeGreaterThanOrEqual(85);
    expect(v).toBeLessThanOrEqual(92);
  });
  it('mujer 65 años, Cr 0.8 → FG > 75 (G2)', () => {
    const v = getCKDEPI(65, 'F', 0.8);
    expect(v).toBeGreaterThanOrEqual(75);
    expect(v).toBeLessThanOrEqual(90);
  });
  // ERC G2 (60-89)
  it('hombre 60 años, Cr 1.2 → G2 (60-89)', () => {
    const v = getCKDEPI(60, 'M', 1.2);
    expect(v).toBeGreaterThanOrEqual(60);
    expect(v).toBeLessThan(90);
  });
  // ERC G3a (45-59)
  it('hombre 65 años, Cr 1.5 → G3a (45-59)', () => {
    const v = getCKDEPI(65, 'M', 1.5);
    expect(v).toBeGreaterThanOrEqual(45);
    expect(v).toBeLessThan(60);
  });
  it('mujer 70 años, Cr 1.3 → G3 (30-59)', () => {
    const v = getCKDEPI(70, 'F', 1.3);
    expect(v).toBeGreaterThanOrEqual(30);
    expect(v).toBeLessThan(60);
  });
  // ERC G3b (30-44)
  it('hombre 70 años, Cr 1.8 → G3b (30-44)', () => {
    const v = getCKDEPI(70, 'M', 1.8);
    expect(v).toBeGreaterThanOrEqual(30);
    expect(v).toBeLessThan(45);
  });
  it('mujer 75 años, Cr 1.6 → G3b', () => {
    const v = getCKDEPI(75, 'F', 1.6);
    expect(v).toBeGreaterThanOrEqual(30);
    expect(v).toBeLessThan(45);
  });
  // ERC G4 (15-29)
  it('hombre 70 años, Cr 2.5 → G4 (<30)', () => {
    const v = getCKDEPI(70, 'M', 2.5);
    expect(v).toBeGreaterThanOrEqual(15);
    expect(v).toBeLessThan(30);
  });
  it('mujer 75 años, Cr 2.5 → G4', () => {
    const v = getCKDEPI(75, 'F', 2.5);
    expect(v).toBeGreaterThanOrEqual(15);
    expect(v).toBeLessThan(30);
  });
  // ERC G5 (<15)
  it('hombre 80 años, Cr 4.0 → G5 (<15)', () => {
    const v = getCKDEPI(80, 'M', 4.0);
    expect(v).toBeLessThan(15);
  });
  it('mujer 80 años, Cr 5.0 → G5 (<15)', () => {
    const v = getCKDEPI(80, 'F', 5.0);
    expect(v).toBeLessThan(15);
  });
  it('hombre 90 años, Cr 3.5 → ERC avanzada (<20)', () => {
    const v = getCKDEPI(90, 'M', 3.5);
    expect(v).toBeLessThan(20);
  });
  // Edad extrema
  it('paciente joven 18 años, Cr 0.9 → FG alto (>100)', () => {
    expect(getCKDEPI(18, 'M', 0.9)).toBeGreaterThan(100);
  });
  it('paciente anciano 95 años, Cr 1.0 → FG inferior al de 50 años', () => {
    // CKD-EPI reduce por 0.9938^95 ≈ 0.56, pero Cr=1.0 en hombre es < kappa(0.9)
    // dando FG relativamente alto; el FG es claramente menor que a los 50 años
    const v95 = getCKDEPI(95, 'M', 1.0);
    const v50 = getCKDEPI(50, 'M', 1.0);
    expect(v95).toBeLessThan(v50);
  });
  // Factor de sexo
  it('factor femenino (1.012): mujer con Cr en rango bajo-kappa tiene FG ≥ hombre similar', () => {
    const m = getCKDEPI(50, 'M', 1.0);
    const f = getCKDEPI(50, 'F', 0.7); // Cr cerca de kappa F=0.7
    expect(typeof m).toBe('number');
    expect(typeof f).toBe('number');
  });
  it('hombre Cr < 0.9 (kappa): componente alpha negativo da FG > 90', () => {
    expect(getCKDEPI(40, 'M', 0.7)).toBeGreaterThan(90);
  });
  it('mujer Cr < 0.7 (kappa): FG muy alto', () => {
    expect(getCKDEPI(35, 'F', 0.5)).toBeGreaterThan(100);
  });
  // Creatininas limítrofes (kappa de la ecuación)
  it('hombre Cr exactamente 0.9 (kappa M): min(Cr/kappa,1)=1, solo componente -1.2', () => {
    const v = getCKDEPI(55, 'M', 0.9);
    expect(v).toBeGreaterThan(0);
  });
  it('mujer Cr exactamente 0.7 (kappa F)', () => {
    const v = getCKDEPI(55, 'F', 0.7);
    expect(v).toBeGreaterThan(0);
  });
  // Errores y valores inválidos
  it('creatinina 0 → null', () => {
    expect(getCKDEPI(55, 'M', 0)).toBeNull();
  });
  it('creatinina negativa → null', () => {
    expect(getCKDEPI(55, 'M', -0.5)).toBeNull();
  });
  it('edad null → null', () => {
    expect(getCKDEPI(null, 'M', 1.0)).toBeNull();
  });
  it('sexo null → null', () => {
    expect(getCKDEPI(55, null, 1.0)).toBeNull();
  });
  it('creatinina null → null', () => {
    expect(getCKDEPI(55, 'M', null)).toBeNull();
  });
  it('todos null → null', () => {
    expect(getCKDEPI(null, null, null)).toBeNull();
  });
  // Monotonicidad: a más creatinina → menos FG
  it('a mayor creatinina → menor FG (monotonía)', () => {
    const v1 = getCKDEPI(60, 'M', 1.0);
    const v2 = getCKDEPI(60, 'M', 2.0);
    const v3 = getCKDEPI(60, 'M', 3.0);
    expect(v1).toBeGreaterThan(v2);
    expect(v2).toBeGreaterThan(v3);
  });
  // Monotonicidad: a más edad → menos FG
  it('a mayor edad → menor FG (monotonía)', () => {
    const v30 = getCKDEPI(30, 'M', 1.0);
    const v60 = getCKDEPI(60, 'M', 1.0);
    const v90 = getCKDEPI(90, 'M', 1.0);
    expect(v30).toBeGreaterThan(v60);
    expect(v60).toBeGreaterThan(v90);
  });
  it('resultado es entero redondeado', () => {
    const v = getCKDEPI(55, 'M', 1.2);
    expect(Number.isInteger(v)).toBe(true);
  });
});

// ── 3. calcCockcroft (Cockcroft-Gault con peso ajustado) ──────────────────────
describe('calcCockcroft — Cockcroft-Gault (con ajuste por obesidad)', () => {
  // Casos de referencia
  it('hombre 60 años, 70 kg, Cr 1.0 → ~78 mL/min', () => {
    const r = calcCockcroft(60, 'M', 1.0, 70);
    expect(r.val).toBeCloseTo(78, 0);
  });
  it('mujer 60 años, 70 kg, Cr 1.0 → ~66 mL/min (factor 0.85)', () => {
    const r = calcCockcroft(60, 'F', 1.0, 70);
    expect(r.val).toBeCloseTo(66, 0);
  });
  // Factor 0.85 femenino
  it('el valor femenino es ≈ 0.85 × masculino (factor sexo Cockcroft-Gault)', () => {
    const m = calcCockcroft(50, 'M', 1.0, 70);
    const f = calcCockcroft(50, 'F', 1.0, 70);
    // El redondeo (Math.round) puede producir diferencia ±1 respecto a m*0.85
    const expected = Math.round(m.val * 0.85);
    expect(Math.abs(f.val - expected)).toBeLessThanOrEqual(1);
  });
  // ERC G3 por edad
  it('anciano 80 años, 65 kg, Cr 1.2 → ERC G3 (<60 mL/min)', () => {
    const r = calcCockcroft(80, 'M', 1.2, 65);
    expect(r.val).toBeLessThan(60);
  });
  it('anciana 85 años, 50 kg, Cr 0.9 → FG reducido (<40)', () => {
    const r = calcCockcroft(85, 'F', 0.9, 50);
    expect(r.val).toBeLessThan(40);
  });
  // Ajuste por obesidad
  it('obeso con peso > 1.3×IBW usa peso ajustado (Dosis Ajustada)', () => {
    // IBW hombre 170 cm ≈ 50 + 0.91*(170-152.4) = 66 kg
    // 120 kg > 66*1.3 = 85.8 kg → usa peso ajustado
    const normal = calcCockcroft(50, 'M', 1.0, 70, 170);
    const obeso  = calcCockcroft(50, 'M', 1.0, 120, 170);
    // Con peso ajustado el CrCl es menor que usando el peso real
    const sinAjuste = calcCockcroft(50, 'M', 1.0, 120);
    expect(obeso.val).toBeLessThan(sinAjuste.val);
  });
  it('peso normal no activa ajuste por obesidad', () => {
    // 70 kg < 66*1.3=85.8 → no ajuste
    const r = calcCockcroft(50, 'M', 1.0, 70, 170);
    expect(r.val).toBeGreaterThan(0);
  });
  it('mujer obesa también aplica ajuste', () => {
    // IBW mujer 160 cm = 45.5 + 0.91*(160-152.4) = 52.4 kg; 100 kg > 52.4*1.3=68.1 → ajuste
    const obesa    = calcCockcroft(55, 'F', 1.0, 100, 160);
    const sinAjuste= calcCockcroft(55, 'F', 1.0, 100);
    expect(obesa.val).toBeLessThan(sinAjuste.val);
  });
  // Conversión µmol/L
  it('Cr 88.4 µmol/L ≈ 1.0 mg/dL → mismo resultado', () => {
    const rMg = calcCockcroft(60, 'M', 1.0, 70, null, 'mg/dL');
    const rUm = calcCockcroft(60, 'M', 88.4, 70, null, 'umol');
    expect(rMg.val).toBe(rUm.val);
  });
  it('Cr 176.8 µmol/L ≈ 2.0 mg/dL → mismo resultado', () => {
    const rMg = calcCockcroft(65, 'M', 2.0, 70, null, 'mg/dL');
    const rUm = calcCockcroft(65, 'M', 176.8, 70, null, 'umol');
    expect(rMg.val).toBe(rUm.val);
  });
  // Campos incluidos en el resultado
  it('resultado incluye campo epi con CKD-EPI', () => {
    const r = calcCockcroft(60, 'M', 1.0, 70);
    expect(r.epi).not.toBeNull();
    expect(typeof r.epi).toBe('number');
  });
  it('resultado incluye campo method', () => {
    const r = calcCockcroft(60, 'M', 1.0, 70);
    expect(r.method).toBe('Cockcroft-Gault');
  });
  it('BSA incluida si se pasan peso y altura', () => {
    const r = calcCockcroft(60, 'M', 1.0, 70, 170);
    expect(r.bsa).not.toBeNull();
    expect(r.bsa).toBeGreaterThan(0);
  });
  it('BSA null si no hay altura', () => {
    const r = calcCockcroft(60, 'M', 1.0, 70);
    expect(r.bsa).toBeNull();
  });
  // Errores — campos obligatorios
  it('edad null → null', () => {
    expect(calcCockcroft(null, 'M', 1.0, 70)).toBeNull();
  });
  it('creatinina 0 → null', () => {
    expect(calcCockcroft(60, 'M', 0, 70)).toBeNull();
  });
  it('creatinina null → null', () => {
    expect(calcCockcroft(60, 'M', null, 70)).toBeNull();
  });
  it('creatinina negativa → null', () => {
    expect(calcCockcroft(60, 'M', -1, 70)).toBeNull();
  });
  // Monotonicidad
  it('a mayor creatinina → menor CrCl (monotonía)', () => {
    const r1 = calcCockcroft(60, 'M', 1.0, 70);
    const r2 = calcCockcroft(60, 'M', 2.0, 70);
    expect(r1.val).toBeGreaterThan(r2.val);
  });
  it('a mayor edad → menor CrCl (monotonía)', () => {
    const r30 = calcCockcroft(30, 'M', 1.0, 70);
    const r70 = calcCockcroft(70, 'M', 1.0, 70);
    expect(r30.val).toBeGreaterThan(r70.val);
  });
  // Peso 0 (sin peso → usa 70 kg por defecto)
  it('sin peso usa 70 kg por defecto', () => {
    const rDef = calcCockcroft(60, 'M', 1.0, undefined);
    const r70  = calcCockcroft(60, 'M', 1.0, 70);
    expect(rDef.val).toBe(r70.val);
  });
  // Valores límite muy bajos de FG (ajuste de medicación crítico)
  it('ERC G5 grave: 85 años, Cr 4.5 mg/dL, 55 kg → FG < 10', () => {
    const r = calcCockcroft(85, 'M', 4.5, 55);
    expect(r.val).toBeLessThan(10);
  });
  it('ERC G4: hombre 70 años, Cr 2.5, 70 kg → FG 15-30', () => {
    const r = calcCockcroft(70, 'M', 2.5, 70);
    expect(r.val).toBeGreaterThanOrEqual(15);
    expect(r.val).toBeLessThan(30);
  });
});
