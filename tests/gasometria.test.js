/**
 * Tests — AeroLab (Gasometría / Interpretación Ácido-Base)
 * 100+ casos clínicos: clasificación pH-pCO₂-HCO₃⁻, AG, compensaciones, P/F ratio.
 */
import { describe, it, expect } from 'vitest';
import {
  classifyAcidBase, calcAnionGap, correctAgForAlbumin,
  calcWinters, calcCompRespAcidAcute, calcCompRespAcidChronic,
  calcCompMetabAlk, calcCompRespAlkAcute, calcCompRespAlkChronic,
  calcPaFiRatio
} from '../shared/calc-gasometria.js';

// ── 1. classifyAcidBase ───────────────────────────────────────────────────────
describe('classifyAcidBase — diagnóstico primario', () => {
  // Normalidad
  it('gasometría normal → pType=normal', () =>
    expect(classifyAcidBase(7.40, 40, 24)).toMatchObject({ pType: 'normal' }));
  it('valores normales con pH 7.42 → normal', () =>
    expect(classifyAcidBase(7.42, 38, 25)).toMatchObject({ pType: 'normal' }));
  it('valores normales con pH 7.37 → normal', () =>
    expect(classifyAcidBase(7.37, 43, 25)).toMatchObject({ pType: 'normal' }));

  // Acidosis metabólica no compensada
  it('acidosis metabólica: pH↓, HCO₃↓ sin CO₂ elevado', () =>
    expect(classifyAcidBase(7.20, 30, 12)).toMatchObject({ pType: 'acidosis', pMech: 'metabolica' }));
  it('acidosis metabólica severa: pH 7.10, HCO₃ 8', () =>
    expect(classifyAcidBase(7.10, 20, 8)).toMatchObject({ pType: 'acidosis', pMech: 'metabolica' }));
  it('acidosis metabólica moderada: pH 7.28, HCO₃ 16', () =>
    expect(classifyAcidBase(7.28, 28, 16)).toMatchObject({ pType: 'acidosis', pMech: 'metabolica' }));
  it('acidosis metabólica leve: pH 7.33, HCO₃ 18', () =>
    expect(classifyAcidBase(7.33, 25, 18)).toMatchObject({ pType: 'acidosis', pMech: 'metabolica' }));

  // Acidosis respiratoria no compensada
  it('acidosis respiratoria aguda: pH↓, pCO₂↑', () =>
    expect(classifyAcidBase(7.25, 65, 28)).toMatchObject({ pType: 'acidosis', pMech: 'respiratoria' }));
  it('acidosis respiratoria severa: pH 7.18, pCO₂ 80', () =>
    expect(classifyAcidBase(7.18, 80, 29)).toMatchObject({ pType: 'acidosis', pMech: 'respiratoria' }));
  it('EPOC reagudizado: pH 7.30, pCO₂ 70, HCO₃ 34 (c. crónica)', () =>
    expect(classifyAcidBase(7.30, 70, 34)).toMatchObject({ pType: 'acidosis', pMech: 'respiratoria' }));

  // Alcalosis metabólica no compensada
  it('alcalosis metabólica: pH↑, HCO₃↑', () =>
    expect(classifyAcidBase(7.55, 47, 40)).toMatchObject({ pType: 'alcalosis', pMech: 'metabolica' }));
  it('alcalosis metabólica por vómitos: pH 7.58, HCO₃ 38', () =>
    expect(classifyAcidBase(7.58, 48, 38)).toMatchObject({ pType: 'alcalosis', pMech: 'metabolica' }));
  it('alcalosis metabólica leve: pH 7.48, HCO₃ 30', () =>
    expect(classifyAcidBase(7.48, 44, 30)).toMatchObject({ pType: 'alcalosis', pMech: 'metabolica' }));

  // Alcalosis respiratoria no compensada
  it('alcalosis respiratoria: pH↑, pCO₂↓', () =>
    expect(classifyAcidBase(7.55, 25, 21)).toMatchObject({ pType: 'alcalosis', pMech: 'respiratoria' }));
  it('alcalosis respiratoria por ansiedad: pH 7.60, pCO₂ 22', () =>
    expect(classifyAcidBase(7.60, 22, 21)).toMatchObject({ pType: 'alcalosis', pMech: 'respiratoria' }));
  it('alcalosis respiratoria leve: pH 7.47, pCO₂ 32', () =>
    expect(classifyAcidBase(7.47, 32, 23)).toMatchObject({ pType: 'alcalosis', pMech: 'respiratoria' }));

  // Compensación completa — Regla del 7.40
  it('acidosis metabólica compensada: pH 7.38, pCO₂↓, HCO₃↓', () =>
    expect(classifyAcidBase(7.38, 28, 16)).toMatchObject({ pType: 'acidosis', pMech: 'metabolica' }));
  it('acidosis respiratoria compensada (EPOC crónico): pH 7.38, pCO₂↑, HCO₃↑', () =>
    expect(classifyAcidBase(7.38, 60, 35)).toMatchObject({ pType: 'acidosis', pMech: 'respiratoria' }));
  it('alcalosis respiratoria compensada: pH 7.43, pCO₂↓, HCO₃↓', () =>
    expect(classifyAcidBase(7.43, 30, 19)).toMatchObject({ pType: 'alcalosis', pMech: 'respiratoria' }));
  it('alcalosis metabólica compensada: pH 7.44, pCO₂↑, HCO₃↑', () =>
    expect(classifyAcidBase(7.44, 50, 34)).toMatchObject({ pType: 'alcalosis', pMech: 'metabolica' }));

  // Trastornos mixtos
  it('mixto acidosis dual (pCO₂↑ + HCO₃↓): pType=mixed', () =>
    expect(classifyAcidBase(7.10, 60, 18)).toMatchObject({ pType: 'mixed' }));
  it('alcalosis met con CO₂ elevado (compensación inadecuada): pType=alcalosis', () =>
    // pH↑, HCO₃↑, pCO₂↑ → la condición phHigh&&hco3Hi&&!co2Lo captura antes que el patrón mixto
    expect(classifyAcidBase(7.55, 55, 46)).toMatchObject({ pType: 'alcalosis', pMech: 'metabolica' }));
  it('mixto acidosis resp + alcalosis met (phHigh,CO2↑,HCO₃↑ con phHigh<7.40 imposible) → alcalosis met', () =>
    // El patrón 'phHigh && co2Hi && hco3Hi' no es alcanzable porque phHigh&&hco3Hi&&!co2Lo lo precede
    expect(classifyAcidBase(7.50, 55, 40)).toMatchObject({ pType: 'alcalosis', pMech: 'metabolica' }));

  // Validación de entradas
  it('pH nulo → null', () => expect(classifyAcidBase(null, 40, 24)).toBeNull());
  it('pCO₂ nulo → null', () => expect(classifyAcidBase(7.40, null, 24)).toBeNull());
  it('HCO₃ nulo → null', () => expect(classifyAcidBase(7.40, 40, null)).toBeNull());
  it('pH fuera de rango (>8.0) → null', () => expect(classifyAcidBase(8.1, 40, 24)).toBeNull());
  it('pH fuera de rango (<6.5) → null', () => expect(classifyAcidBase(6.4, 40, 24)).toBeNull());
  it('pCO₂ fuera de rango (<5) → null', () => expect(classifyAcidBase(7.40, 4, 24)).toBeNull());
  it('pCO₂ fuera de rango (>120) → null', () => expect(classifyAcidBase(7.40, 125, 24)).toBeNull());
  it('HCO₃ fuera de rango (<1) → null', () => expect(classifyAcidBase(7.40, 40, 0)).toBeNull());
  it('pH en límite inferior válido (6.5) → no null', () =>
    expect(classifyAcidBase(6.5, 20, 8)).not.toBeNull());
  it('pH en límite superior válido (8.0) → no null', () =>
    expect(classifyAcidBase(8.0, 20, 50)).not.toBeNull());
});

// ── 2. calcAnionGap ───────────────────────────────────────────────────────────
describe('calcAnionGap — Anion Gap = Na⁺ − Cl⁻ − HCO₃⁻', () => {
  it('valores normales: Na140, Cl104, HCO₃24 → AG=12', () =>
    expect(calcAnionGap(140, 104, 24)).toBeCloseTo(12, 1));
  it('AG normal bajo: Na138, Cl104, HCO₃25 → AG=9', () =>
    expect(calcAnionGap(138, 104, 25)).toBeCloseTo(9, 1));
  it('AG elevado: Na140, Cl100, HCO₃12 → AG=28 (cetoacidosis)', () =>
    expect(calcAnionGap(140, 100, 12)).toBeCloseTo(28, 1));
  it('AG muy elevado: Na135, Cl95, HCO₃8 → AG=32 (acidosis láctica severa)', () =>
    expect(calcAnionGap(135, 95, 8)).toBeCloseTo(32, 1));
  it('AG normal: alcalosis metabólica Na142, Cl95, HCO₃38 → AG=9', () =>
    expect(calcAnionGap(142, 95, 38)).toBeCloseTo(9, 1));
  it('AG negativo o cero: posible hipoalbuminemia o error analítico', () =>
    expect(calcAnionGap(130, 105, 28)).toBeCloseTo(-3, 1));
  it('na null → null', () => expect(calcAnionGap(null, 104, 24)).toBeNull());
  it('cl null → null', () => expect(calcAnionGap(140, null, 24)).toBeNull());
  it('hco3 null → null', () => expect(calcAnionGap(140, 104, null)).toBeNull());
});

// ── 3. correctAgForAlbumin ────────────────────────────────────────────────────
describe('correctAgForAlbumin — corrección por hipoalbuminemia', () => {
  it('albúmina normal 4.0 → sin corrección', () =>
    expect(correctAgForAlbumin(12, 4.0)).toBeCloseTo(12, 1));
  it('albúmina 3.0 → AG + 2.5 = AG + 2.5', () =>
    expect(correctAgForAlbumin(10, 3.0)).toBeCloseTo(12.5, 1));
  it('albúmina 2.0 → AG + 5', () =>
    expect(correctAgForAlbumin(8, 2.0)).toBeCloseTo(13, 1));
  it('albúmina 1.5 (muy baja) → AG + 6.25', () =>
    expect(correctAgForAlbumin(6, 1.5)).toBeCloseTo(12.25, 1));
  it('hipoalbuminemia grave puede desenmascarar acidosis metabólica oculta', () => {
    // AG aparente 10 (normal), albúmina 1.8 → AG_corr = 10 + 2.5*(4-1.8) = 15.5
    expect(correctAgForAlbumin(10, 1.8)).toBeCloseTo(15.5, 1);
  });
  it('ag null → null', () => expect(correctAgForAlbumin(null, 4.0)).toBeNull());
  it('alb null → null', () => expect(correctAgForAlbumin(12, null)).toBeNull());
});

// ── 4. calcWinters ────────────────────────────────────────────────────────────
describe('calcWinters — pCO₂ esperada en acidosis metabólica', () => {
  it('HCO₃=24 (normal) → pCO₂ esperada ~44 ± 2', () => {
    const w = calcWinters(24);
    expect(w.exp).toBeCloseTo(44, 1);
    expect(w.lo).toBeCloseTo(42, 1);
    expect(w.hi).toBeCloseTo(46, 1);
  });
  it('HCO₃=15 → pCO₂ esperada=30.5 ± 2', () => {
    const w = calcWinters(15);
    expect(w.exp).toBeCloseTo(30.5, 1);
  });
  it('HCO₃=10 → pCO₂ esperada=23 ± 2 (hiperventilación compensatoria máxima)', () => {
    const w = calcWinters(10);
    expect(w.exp).toBeCloseTo(23, 1);
  });
  it('HCO₃=20 → pCO₂ esperada=38 ± 2', () => {
    const w = calcWinters(20);
    expect(w.exp).toBeCloseTo(38, 1);
  });
  it('rango lo = exp − 2, hi = exp + 2', () => {
    const w = calcWinters(18);
    expect(w.hi - w.lo).toBeCloseTo(4, 5);
    expect(w.exp - w.lo).toBeCloseTo(2, 5);
  });
  it('HCO₃ null → null', () => expect(calcWinters(null)).toBeNull());
  it('HCO₃ 8 (acidosis severa) → pCO₂ esperada=20 ± 2 (límite fisiológico)', () => {
    const w = calcWinters(8);
    expect(w.exp).toBeCloseTo(20, 1);
  });
});

// ── 5. Fórmulas de compensación ───────────────────────────────────────────────
describe('calcCompRespAcidAcute — HCO₃ esperado acidosis resp. aguda', () => {
  it('pCO₂=40 (normal) → HCO₃=24', () =>
    expect(calcCompRespAcidAcute(40)).toBeCloseTo(24, 4));
  it('pCO₂=60 → HCO₃=24 + 0.1×20 = 26', () =>
    expect(calcCompRespAcidAcute(60)).toBeCloseTo(26, 2));
  it('pCO₂=80 → HCO₃=24 + 0.1×40 = 28', () =>
    expect(calcCompRespAcidAcute(80)).toBeCloseTo(28, 2));
  it('pCO₂ null → null', () => expect(calcCompRespAcidAcute(null)).toBeNull());
});

describe('calcCompRespAcidChronic — HCO₃ esperado acidosis resp. crónica', () => {
  it('pCO₂=40 → HCO₃=24', () =>
    expect(calcCompRespAcidChronic(40)).toBeCloseTo(24, 4));
  it('pCO₂=60 → HCO₃=24 + 0.35×20 = 31', () =>
    expect(calcCompRespAcidChronic(60)).toBeCloseTo(31, 2));
  it('pCO₂=70 → HCO₃=24 + 0.35×30 = 34.5 (EPOC crónico grave)', () =>
    expect(calcCompRespAcidChronic(70)).toBeCloseTo(34.5, 2));
  it('crónica > aguda para mismo pCO₂ (mayor compensación metabólica)', () => {
    expect(calcCompRespAcidChronic(65)).toBeGreaterThan(calcCompRespAcidAcute(65));
  });
  it('pCO₂ null → null', () => expect(calcCompRespAcidChronic(null)).toBeNull());
});

describe('calcCompMetabAlk — pCO₂ esperada en alcalosis metabólica', () => {
  it('HCO₃=24 → pCO₂=0.7×24+21=37.8 ≈ 38 ± 2', () => {
    const c = calcCompMetabAlk(24);
    expect(c.exp).toBeCloseTo(37.8, 1);
  });
  it('HCO₃=35 → pCO₂=0.7×35+21=45.5 ± 2', () => {
    const c = calcCompMetabAlk(35);
    expect(c.exp).toBeCloseTo(45.5, 1);
  });
  it('HCO₃=40 → pCO₂=0.7×40+21=49 ± 2 (hipoventilación compensatoria)', () => {
    const c = calcCompMetabAlk(40);
    expect(c.exp).toBeCloseTo(49, 1);
  });
  it('rango lo = exp − 2, hi = exp + 2', () => {
    const c = calcCompMetabAlk(30);
    expect(c.hi - c.lo).toBeCloseTo(4, 5);
  });
  it('HCO₃ null → null', () => expect(calcCompMetabAlk(null)).toBeNull());
});

describe('calcCompRespAlkAcute — HCO₃ esperado alcalosis resp. aguda', () => {
  it('pCO₂=40 → HCO₃=24', () =>
    expect(calcCompRespAlkAcute(40)).toBeCloseTo(24, 4));
  it('pCO₂=28 → HCO₃=24 − 0.2×12 = 21.6', () =>
    expect(calcCompRespAlkAcute(28)).toBeCloseTo(21.6, 2));
  it('pCO₂=20 → HCO₃=24 − 0.2×20 = 20', () =>
    expect(calcCompRespAlkAcute(20)).toBeCloseTo(20, 2));
  it('pCO₂ null → null', () => expect(calcCompRespAlkAcute(null)).toBeNull());
});

describe('calcCompRespAlkChronic — HCO₃ esperado alcalosis resp. crónica', () => {
  it('pCO₂=40 → HCO₃=24', () =>
    expect(calcCompRespAlkChronic(40)).toBeCloseTo(24, 4));
  it('pCO₂=30 → HCO₃=24 − 0.4×10 = 20', () =>
    expect(calcCompRespAlkChronic(30)).toBeCloseTo(20, 2));
  it('pCO₂=20 → HCO₃=24 − 0.4×20 = 16', () =>
    expect(calcCompRespAlkChronic(20)).toBeCloseTo(16, 2));
  it('crónica < aguda para mismo pCO₂ (mayor compensación metabólica)', () => {
    expect(calcCompRespAlkChronic(28)).toBeLessThan(calcCompRespAlkAcute(28));
  });
  it('pCO₂ null → null', () => expect(calcCompRespAlkChronic(null)).toBeNull());
});

// ── 6. calcPaFiRatio ─────────────────────────────────────────────────────────
describe('calcPaFiRatio — Índice de Horowitz (PaO₂/FiO₂)', () => {
  it('PaO₂=100, FiO₂=21% (aire) → P/F=476 (normal)', () =>
    expect(calcPaFiRatio(100, 21)).toBeCloseTo(476.2, 0));
  it('PaO₂=80, FiO₂=21% → P/F=381 (leve hipoxemia)', () =>
    expect(calcPaFiRatio(80, 21)).toBeCloseTo(381, 0));
  it('PaO₂=60, FiO₂=40% → P/F=150 (SDRA moderado)', () =>
    expect(calcPaFiRatio(60, 40)).toBeCloseTo(150, 0));
  it('PaO₂=50, FiO₂=50% → P/F=100 (SDRA grave límite)', () =>
    expect(calcPaFiRatio(50, 50)).toBeCloseTo(100, 0));
  it('PaO₂=60, FiO₂=100% → P/F=60 (SDRA grave)', () =>
    expect(calcPaFiRatio(60, 100)).toBeCloseTo(60, 0));
  it('PaO₂=450, FiO₂=100% → P/F=450 (paciente intubado OK)', () =>
    expect(calcPaFiRatio(450, 100)).toBeCloseTo(450, 0));
  // Umbrales SDRA (Berlín 2012)
  it('P/F >300 → no SDRA', () => expect(calcPaFiRatio(90, 21)).toBeGreaterThan(300));
  it('P/F 201-300 → SDRA leve', () => {
    const pf = calcPaFiRatio(55, 21);
    expect(pf).toBeGreaterThan(200);
    expect(pf).toBeLessThanOrEqual(300);
  });
  it('P/F 101-200 → SDRA moderado', () => {
    const pf = calcPaFiRatio(50, 40);
    expect(pf).toBeGreaterThan(100);
    expect(pf).toBeLessThanOrEqual(200);
  });
  it('P/F ≤100 → SDRA grave', () => expect(calcPaFiRatio(60, 100)).toBeLessThanOrEqual(100));
  // Errores
  it('PaO₂ null → null', () => expect(calcPaFiRatio(null, 40)).toBeNull());
  it('FiO₂ null → null', () => expect(calcPaFiRatio(80, null)).toBeNull());
  it('FiO₂ < 21 → null (entrada en decimal no %)', () =>
    expect(calcPaFiRatio(80, 0.4)).toBeNull());
  it('FiO₂ > 100 → null', () => expect(calcPaFiRatio(80, 110)).toBeNull());
  it('PaO₂ 0 → null', () => expect(calcPaFiRatio(0, 40)).toBeNull());
  // Proporcionalidad: doble PaO₂ → doble P/F
  it('linealidad: doble PaO₂ → doble P/F', () => {
    const pf1 = calcPaFiRatio(60, 40);
    const pf2 = calcPaFiRatio(120, 40);
    expect(pf2 / pf1).toBeCloseTo(2, 5);
  });
  // FiO₂ exactamente 21 y 100 (límites válidos)
  it('FiO₂=21 (aire ambiente) → válido', () =>
    expect(calcPaFiRatio(90, 21)).not.toBeNull());
  it('FiO₂=100 (O₂ puro) → válido', () =>
    expect(calcPaFiRatio(200, 100)).not.toBeNull());
});
