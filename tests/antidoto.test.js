/**
 * Tests — ToxoGuard (Guía de Antídotos y Toxicología)
 *
 * Esta aplicación es una guía de referencia clínica (lookup).
 * Los tests validan reglas de seguridad clínica puras: umbrales de dosis,
 * pares antídoto-tóxico y criterios de indicación basados en guías clínicas.
 *
 * Refs: POISINDEX, UpToDate, Mintegui et al. Emergencias 2019, AACT/EAPCCT.
 */
import { describe, it, expect } from 'vitest';

// ── Funciones auxiliares de validación toxicológica ───────────────────────────
// Estas funciones representan la lógica clínica que ToxoGuard ayuda a implementar.

/**
 * Dosis de N-acetilcisteína (NAC) para intoxicación por paracetamol
 * Protocolo IV 21h (Prescott): 150 mg/kg/h×1 + 50 mg/kg/h×4 + 100 mg/kg/h×16
 */
function calcNACDose(weightKg) {
  if (!weightKg || weightKg <= 0) return null;
  return {
    bolus:   Math.round(150 * weightKg),   // mg en 1 hora
    phase2:  Math.round(50  * weightKg),   // mg en 4 horas
    phase3:  Math.round(100 * weightKg),   // mg en 16 horas
    totalMg: Math.round(300 * weightKg),   // mg total 21h
  };
}

/**
 * Dosis de flumazenil para intoxicación por benzodiacepinas
 * Dosis estándar: 0.2 mg IV inicial; máx acumulado 1 mg.
 */
function isFlumazenilDoseSafe(mgDose) {
  if (mgDose == null || mgDose <= 0) return false;
  return mgDose <= 1.0; // máximo acumulado 1 mg
}

/**
 * Indicación de atropina en intoxicación organofosforada
 * Indicada si: miosis + bradicardia + hipersecreciones (síndrome muscarínico)
 * Dosis inicial: 2-4 mg IV, repetir cada 5-10 min hasta secar secreciones.
 */
function atropineDoseOK(mgDose) {
  if (mgDose == null || mgDose <= 0) return false;
  return mgDose >= 2 && mgDose <= 4; // rango dosis inicial estándar
}

/**
 * Criterio de Rumack-Matthew para NAC en paracetamol
 * Zona de tratamiento: nivel paracetamol > 150 mcg/mL a las 4h post-ingesta
 */
function needsNACByRumack(levelAt4h_mcgPerML) {
  if (levelAt4h_mcgPerML == null || isNaN(levelAt4h_mcgPerML)) return null;
  return levelAt4h_mcgPerML > 150;
}

/**
 * Dosis de glucagón en sobredosis de betabloqueantes/calcioantagonistas
 * Bolo: 5-10 mg IV, mantenimiento 2-5 mg/h
 */
function glucagonBolusOK(mgDose) {
  if (mgDose == null || mgDose <= 0) return false;
  return mgDose >= 5 && mgDose <= 10;
}

/**
 * Necesidad de descontaminación GI (carbón activado)
 * Indicado si: ingesta < 2h, vía aérea protegida, sin CI
 */
function charcoalIndicated(hoursPostIngestion, airwayProtected, contraindicated) {
  if (contraindicated) return false;
  if (!airwayProtected) return false;
  return hoursPostIngestion <= 2;
}

/**
 * Dosis de carbón activado en adulto
 * Estándar: 50-100 g VO / SNG (1 g/kg en pediatría, máx 50 g)
 */
function charcoalDoseAdultOK(gramDose) {
  return gramDose >= 50 && gramDose <= 100;
}

/**
 * Antídoto correcto para el tóxico dado (pares validados).
 */
const ANTIDOTE_MAP = {
  'paracetamol':      'N-acetilcisteina',
  'benzodiacepinas':  'flumazenil',
  'opioides':         'naloxona',
  'organofosforados': 'atropina + pralidoxima',
  'betabloqueantes':  'glucagon',
  'calcioantagonistas': 'calcio + glucagon + insulina',
  'digoxina':         'anticuerpos antidigoxina (Fab)',
  'warfarina':        'vitamina K + CCP',
  'heparina':         'protamina',
  'hierro':           'deferoxamina',
  'cianuro':          'hidroxicobalamina',
  'metanol':          'fomepizol o etanol',
  'monoxido_carbono': 'oxigeno al 100%',
};

function getAntidote(toxin) {
  return ANTIDOTE_MAP[toxin] ?? null;
}

// ── 1. N-Acetilcisteína (NAC) para paracetamol ───────────────────────────────
describe('NAC — intoxicación por paracetamol', () => {
  it('dosis bolo 70 kg → 10500 mg', () =>
    expect(calcNACDose(70).bolus).toBe(10500));
  it('dosis fase 2, 70 kg → 3500 mg', () =>
    expect(calcNACDose(70).phase2).toBe(3500));
  it('dosis fase 3, 70 kg → 7000 mg', () =>
    expect(calcNACDose(70).phase3).toBe(7000));
  it('dosis total 21h, 70 kg → 21000 mg', () =>
    expect(calcNACDose(70).totalMg).toBe(21000));
  it('dosis total = bolo + fase2 + fase3', () => {
    const d = calcNACDose(70);
    expect(d.totalMg).toBe(d.bolus + d.phase2 + d.phase3);
  });
  it('peso pediátrico 20 kg → dosis proporcional', () => {
    const d = calcNACDose(20);
    expect(d.bolus).toBe(3000);
    expect(d.totalMg).toBe(6000);
  });
  it('peso extremo bajo 40 kg → dosis menor', () => {
    const d40 = calcNACDose(40);
    const d70 = calcNACDose(70);
    expect(d40.totalMg).toBeLessThan(d70.totalMg);
  });
  it('peso extremo alto 120 kg → dosis proporcional', () => {
    const d = calcNACDose(120);
    expect(d.bolus).toBe(18000);
  });
  it('peso 0 → null', () => expect(calcNACDose(0)).toBeNull());
  it('peso null → null', () => expect(calcNACDose(null)).toBeNull());
  it('peso negativo → null', () => expect(calcNACDose(-10)).toBeNull());
});

// ── 2. Criterio de Rumack-Matthew ────────────────────────────────────────────
describe('Rumack-Matthew — indicación NAC en paracetamol', () => {
  it('nivel 200 mcg/mL a las 4h → tratamiento necesario', () =>
    expect(needsNACByRumack(200)).toBe(true));
  it('nivel exactamente 150 mcg/mL → no (>150, no ≥150)', () =>
    expect(needsNACByRumack(150)).toBe(false));
  it('nivel 151 mcg/mL → necesario', () =>
    expect(needsNACByRumack(151)).toBe(true));
  it('nivel 100 mcg/mL → no necesario', () =>
    expect(needsNACByRumack(100)).toBe(false));
  it('nivel 0 → no necesario', () =>
    expect(needsNACByRumack(0)).toBe(false));
  it('nivel null → null (indeterminado)', () =>
    expect(needsNACByRumack(null)).toBeNull());
  it('nivel NaN → null', () =>
    expect(needsNACByRumack(NaN)).toBeNull());
});

// ── 3. Flumazenil (benzodiacepinas) ──────────────────────────────────────────
describe('Flumazenil — dosis segura en intoxicación por BZD', () => {
  it('0.2 mg (dosis inicial estándar) → segura', () =>
    expect(isFlumazenilDoseSafe(0.2)).toBe(true));
  it('0.5 mg → segura', () =>
    expect(isFlumazenilDoseSafe(0.5)).toBe(true));
  it('1.0 mg (máximo acumulado) → segura en límite', () =>
    expect(isFlumazenilDoseSafe(1.0)).toBe(true));
  it('1.1 mg → excede límite acumulado → insegura', () =>
    expect(isFlumazenilDoseSafe(1.1)).toBe(false));
  it('2.0 mg → insegura', () =>
    expect(isFlumazenilDoseSafe(2.0)).toBe(false));
  it('0 mg → false', () =>
    expect(isFlumazenilDoseSafe(0)).toBe(false));
  it('null → false', () =>
    expect(isFlumazenilDoseSafe(null)).toBe(false));
});

// ── 4. Atropina (organofosforados) ───────────────────────────────────────────
describe('Atropina — dosis inicial en intoxicación organofosforada', () => {
  it('2 mg (mínimo) → OK', () =>
    expect(atropineDoseOK(2)).toBe(true));
  it('4 mg (máximo dosis inicial) → OK', () =>
    expect(atropineDoseOK(4)).toBe(true));
  it('3 mg → OK', () =>
    expect(atropineDoseOK(3)).toBe(true));
  it('1 mg → insuficiente', () =>
    expect(atropineDoseOK(1)).toBe(false));
  it('5 mg → excede dosis inicial estándar', () =>
    expect(atropineDoseOK(5)).toBe(false));
  it('0 mg → false', () =>
    expect(atropineDoseOK(0)).toBe(false));
});

// ── 5. Glucagón (betabloqueantes / calcioantagonistas) ───────────────────────
describe('Glucagón — bolo en intoxicación por betabloqueantes', () => {
  it('5 mg → OK (rango terapéutico)', () =>
    expect(glucagonBolusOK(5)).toBe(true));
  it('10 mg → OK (máximo rango estándar)', () =>
    expect(glucagonBolusOK(10)).toBe(true));
  it('7.5 mg → OK', () =>
    expect(glucagonBolusOK(7.5)).toBe(true));
  it('4 mg → por debajo del rango', () =>
    expect(glucagonBolusOK(4)).toBe(false));
  it('11 mg → excede rango bolo estándar', () =>
    expect(glucagonBolusOK(11)).toBe(false));
  it('0 mg → false', () =>
    expect(glucagonBolusOK(0)).toBe(false));
});

// ── 6. Carbón activado ────────────────────────────────────────────────────────
describe('Carbón activado — descontaminación GI', () => {
  it('ingesta <2h, vía aérea protegida, sin CI → indicado', () =>
    expect(charcoalIndicated(1.5, true, false)).toBe(true));
  it('ingesta exactamente 2h → indicado (límite)', () =>
    expect(charcoalIndicated(2, true, false)).toBe(true));
  it('ingesta >2h → NO indicado', () =>
    expect(charcoalIndicated(3, true, false)).toBe(false));
  it('vía aérea no protegida (riesgo aspiración) → NO indicado', () =>
    expect(charcoalIndicated(1, false, false)).toBe(false));
  it('contraindicación presente (íleo, perforación) → NO indicado', () =>
    expect(charcoalIndicated(1, true, true)).toBe(false));
  it('50 g → dosis adulto adecuada', () =>
    expect(charcoalDoseAdultOK(50)).toBe(true));
  it('100 g → dosis adulto adecuada (límite superior)', () =>
    expect(charcoalDoseAdultOK(100)).toBe(true));
  it('25 g → insuficiente en adulto', () =>
    expect(charcoalDoseAdultOK(25)).toBe(false));
});

// ── 7. Pares antídoto-tóxico ──────────────────────────────────────────────────
describe('Pares antídoto-tóxico — clínicamente correctos', () => {
  it('paracetamol → N-acetilcisteina', () =>
    expect(getAntidote('paracetamol')).toBe('N-acetilcisteina'));
  it('benzodiacepinas → flumazenil', () =>
    expect(getAntidote('benzodiacepinas')).toBe('flumazenil'));
  it('opioides → naloxona', () =>
    expect(getAntidote('opioides')).toBe('naloxona'));
  it('organofosforados → atropina + pralidoxima', () =>
    expect(getAntidote('organofosforados')).toBe('atropina + pralidoxima'));
  it('betabloqueantes → glucagon', () =>
    expect(getAntidote('betabloqueantes')).toBe('glucagon'));
  it('calcioantagonistas → calcio + glucagon + insulina', () =>
    expect(getAntidote('calcioantagonistas')).toBe('calcio + glucagon + insulina'));
  it('digoxina → anticuerpos antidigoxina (Fab)', () =>
    expect(getAntidote('digoxina')).toContain('Fab'));
  it('warfarina → vitamina K + CCP', () =>
    expect(getAntidote('warfarina')).toContain('vitamina K'));
  it('heparina → protamina', () =>
    expect(getAntidote('heparina')).toBe('protamina'));
  it('hierro → deferoxamina', () =>
    expect(getAntidote('hierro')).toBe('deferoxamina'));
  it('cianuro → hidroxicobalamina', () =>
    expect(getAntidote('cianuro')).toBe('hidroxicobalamina'));
  it('metanol → fomepizol o etanol', () =>
    expect(getAntidote('metanol')).toContain('fomepizol'));
  it('monoxido_carbono → oxigeno al 100%', () =>
    expect(getAntidote('monoxido_carbono')).toContain('oxigeno'));
  it('tóxico desconocido → null', () =>
    expect(getAntidote('veneno_desconocido')).toBeNull());
});
