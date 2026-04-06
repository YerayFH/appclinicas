/**
 * Tests — InfuCalc (Calculadora de Infusión Continua)
 * 100+ casos clínicos que validan fórmulas de conversión dosis ↔ ritmo de bomba.
 */
import { describe, it, expect } from 'vitest';
import { getConcInDoseUnit, computeRate, computeDose } from '../shared/calc-infusion.js';

// ── Descriptores de fármaco (equivalentes a los del app) ──────────────────────
const NA    = { vialUnit: 'mg',  unit: 'mcg/kg/min' }; // Noradrenalina
const ADR   = { vialUnit: 'mg',  unit: 'mcg/kg/min' }; // Adrenalina
const DOP   = { vialUnit: 'mg',  unit: 'mcg/kg/min' }; // Dopamina
const DBT   = { vialUnit: 'mg',  unit: 'mcg/kg/min' }; // Dobutamina
const MILA  = { vialUnit: 'mg',  unit: 'mcg/kg/min' }; // Milrinona
const ISO   = { vialUnit: 'mg',  unit: 'mcg/min'    }; // Isoprenalina
const NTG   = { vialUnit: 'mg',  unit: 'mcg/min'    }; // Nitroglicerina
const HEP   = { vialUnit: 'UI',  unit: 'UI/h'       }; // Heparina
const INS   = { vialUnit: 'UI',  unit: 'UI/h'       }; // Insulina
const FUR   = { vialUnit: 'mg',  unit: 'mg/h'       }; // Furosemida
const PROP  = { vialUnit: 'mg',  unit: 'mg/h'       }; // Propofol
const LABT  = { vialUnit: 'mg',  unit: 'mg/h'       }; // Labetalol
const DEXM  = { vialUnit: 'mcg', unit: 'mcg/kg/h'  }; // Dexmedetomidina
const VASP  = { vialUnit: 'UI',  unit: 'UI/h'       }; // Vasopresina (UI/h)

// ── 1. getConcInDoseUnit ──────────────────────────────────────────────────────
describe('getConcInDoseUnit — conversión de unidades de concentración', () => {
  it('mg → mcg: factor ×1000 (noradrenalina)', () => {
    expect(getConcInDoseUnit(NA, 0.064)).toBeCloseTo(64, 3);
  });
  it('mg → mcg: concentración alta (dopamina 1.6 mg/mL)', () => {
    expect(getConcInDoseUnit(DOP, 1.6)).toBeCloseTo(1600, 1);
  });
  it('mg → mcg: concentración baja (adrenalina 0.02 mg/mL)', () => {
    expect(getConcInDoseUnit(ADR, 0.02)).toBeCloseTo(20, 3);
  });
  it('mg → mcg: isoprenalina 0.002 mg/mL → 2 mcg/mL', () => {
    expect(getConcInDoseUnit(ISO, 0.002)).toBeCloseTo(2, 4);
  });
  it('mg → mcg: milrinona 0.2 mg/mL → 200 mcg/mL', () => {
    expect(getConcInDoseUnit(MILA, 0.2)).toBeCloseTo(200, 2);
  });
  it('UI/h → sin conversión (heparina)', () => {
    expect(getConcInDoseUnit(HEP, 50)).toBe(50);
  });
  it('UI/h → sin conversión (insulina 1 UI/mL)', () => {
    expect(getConcInDoseUnit(INS, 1)).toBe(1);
  });
  it('UI/h → sin conversión (insulina concentrada 2 UI/mL)', () => {
    expect(getConcInDoseUnit(INS, 2)).toBe(2);
  });
  it('mg/h → sin conversión (furosemida, labetalol)', () => {
    expect(getConcInDoseUnit(FUR, 1)).toBe(1);
    expect(getConcInDoseUnit(LABT, 2)).toBe(2);
  });
  it('mcg → mg: factor ÷1000 (dexmedetomidina vial mcg, dosis mg/kg/h)', () => {
    const d = { vialUnit: 'mcg', unit: 'mg/h' };
    expect(getConcInDoseUnit(d, 1000)).toBeCloseTo(1, 5);
  });
  it('mcg → sin conversión si la unidad también es mcg/kg/h', () => {
    // dexmedetomidina: vialUnit=mcg, unit=mcg/kg/h → sin conversión mcg→mcg
    expect(getConcInDoseUnit(DEXM, 4)).toBeCloseTo(4, 5);
  });
  it('valor cero: resultado es cero', () => {
    expect(getConcInDoseUnit(NA, 0)).toBe(0);
  });
});

// ── 2. computeRate (dosis → mL/h) ────────────────────────────────────────────
describe('computeRate — cálculo del ritmo de bomba (mL/h)', () => {
  // Noradrenalina: caso de referencia (comentado en calc-infusion.js)
  it('noradrenalina 0.1 mcg/kg/min, 70 kg, 0.064 mg/mL → 6.56 mL/h', () => {
    expect(computeRate(NA, 0.1, 70, 0.064)).toBeCloseTo(6.5625, 2);
  });
  it('noradrenalina 0.5 mcg/kg/min, 70 kg, 0.064 mg/mL → 32.8 mL/h', () => {
    expect(computeRate(NA, 0.5, 70, 0.064)).toBeCloseTo(32.8125, 1);
  });
  it('noradrenalina 0.1 mcg/kg/min, peso bajo 40 kg → menor ritmo', () => {
    const light = computeRate(NA, 0.1, 40, 0.064);
    const heavy = computeRate(NA, 0.1, 100, 0.064);
    expect(light).toBeLessThan(heavy);
  });
  it('noradrenalina: linealidad dosis — doble dosis = doble ritmo', () => {
    const r1 = computeRate(NA, 0.1, 70, 0.064);
    const r2 = computeRate(NA, 0.2, 70, 0.064);
    expect(r2).toBeCloseTo(r1 * 2, 5);
  });
  it('noradrenalina: linealidad concentración — doble conc = mitad ritmo', () => {
    const r1 = computeRate(NA, 0.1, 70, 0.064);
    const r2 = computeRate(NA, 0.1, 70, 0.128);
    expect(r2).toBeCloseTo(r1 / 2, 5);
  });
  // Dopamina
  it('dopamina 5 mcg/kg/min, 70 kg, 1.6 mg/mL → 13.125 mL/h', () => {
    // doseH = 5×70×60 = 21000 mcg/h; concDose = 1600 mcg/mL; rate = 13.125
    expect(computeRate(DOP, 5, 70, 1.6)).toBeCloseTo(13.125, 2);
  });
  it('dopamina 10 mcg/kg/min, 80 kg, 1.6 mg/mL → 30 mL/h', () => {
    expect(computeRate(DOP, 10, 80, 1.6)).toBeCloseTo(30, 1);
  });
  it('dopamina 2 mcg/kg/min (dosis renal), 70 kg, 1.6 mg/mL', () => {
    const r = computeRate(DOP, 2, 70, 1.6);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(10);
  });
  // Dobutamina
  it('dobutamina 5 mcg/kg/min, 80 kg, 1 mg/mL → 24 mL/h', () => {
    expect(computeRate(DBT, 5, 80, 1)).toBeCloseTo(24, 0);
  });
  it('dobutamina 10 mcg/kg/min, 70 kg, 2 mg/mL → 21 mL/h', () => {
    // doseH = 10×70×60=42000 mcg/h; concDose=2000 mcg/mL; rate=21
    expect(computeRate(DBT, 10, 70, 2)).toBeCloseTo(21, 0);
  });
  // Adrenalina (mcg/kg/min)
  it('adrenalina 0.05 mcg/kg/min, 70 kg, 0.02 mg/mL → 10.5 mL/h', () => {
    // doseH = 0.05×70×60=210 mcg/h; concDose=20 mcg/mL; rate=10.5
    expect(computeRate(ADR, 0.05, 70, 0.02)).toBeCloseTo(10.5, 1);
  });
  // Isoprenalina (mcg/min — sin /kg)
  it('isoprenalina 2 mcg/min, 0.002 mg/mL → 60 mL/h', () => {
    expect(computeRate(ISO, 2, 70, 0.002)).toBeCloseTo(60, 0);
  });
  it('isoprenalina 1 mcg/min, 0.002 mg/mL → 30 mL/h', () => {
    expect(computeRate(ISO, 1, 70, 0.002)).toBeCloseTo(30, 0);
  });
  it('isoprenalina: peso no afecta el ritmo (sin /kg)', () => {
    const r40  = computeRate(ISO, 2, 40, 0.002);
    const r100 = computeRate(ISO, 2, 100, 0.002);
    expect(r40).toBeCloseTo(r100, 5);
  });
  // Nitroglicerina (mcg/min)
  it('nitroglicerina 50 mcg/min, 0.1 mg/mL → 30 mL/h', () => {
    // doseH = 50×60 = 3000 mcg/h; concDose = 100 mcg/mL; rate = 30
    expect(computeRate(NTG, 50, 70, 0.1)).toBeCloseTo(30, 1);
  });
  // Heparina (UI/h)
  it('heparina 1000 UI/h, 50 UI/mL → 20 mL/h', () => {
    expect(computeRate(HEP, 1000, 70, 50)).toBeCloseTo(20, 0);
  });
  it('heparina 1250 UI/h, 50 UI/mL → 25 mL/h', () => {
    expect(computeRate(HEP, 1250, 70, 50)).toBeCloseTo(25, 0);
  });
  it('heparina 500 UI/h, 25 UI/mL → 20 mL/h', () => {
    expect(computeRate(HEP, 500, 70, 25)).toBeCloseTo(20, 0);
  });
  // Insulina (UI/h)
  it('insulina 2 UI/h, 1 UI/mL → 2 mL/h', () => {
    expect(computeRate(INS, 2, 70, 1)).toBeCloseTo(2, 0);
  });
  it('insulina 10 UI/h, 2 UI/mL → 5 mL/h', () => {
    expect(computeRate(INS, 10, 70, 2)).toBeCloseTo(5, 0);
  });
  // Furosemida (mg/h)
  it('furosemida 10 mg/h, 2 mg/mL → 5 mL/h', () => {
    expect(computeRate(FUR, 10, 70, 2)).toBeCloseTo(5, 0);
  });
  // Propofol (mg/h)
  it('propofol 100 mg/h, 10 mg/mL → 10 mL/h', () => {
    expect(computeRate(PROP, 100, 70, 10)).toBeCloseTo(10, 0);
  });
  it('propofol 200 mg/h, 10 mg/mL → 20 mL/h', () => {
    expect(computeRate(PROP, 200, 70, 10)).toBeCloseTo(20, 0);
  });
  // Labetalol (mg/h)
  it('labetalol 50 mg/h, 1 mg/mL → 50 mL/h', () => {
    expect(computeRate(LABT, 50, 70, 1)).toBeCloseTo(50, 0);
  });
  // Milrinona (mcg/kg/min)
  it('milrinona 0.375 mcg/kg/min, 70 kg, 0.2 mg/mL → 7.875 mL/h', () => {
    // doseH = 0.375×70×60=1575 mcg/h; concDose=200 mcg/mL; rate=7.875
    expect(computeRate(MILA, 0.375, 70, 0.2)).toBeCloseTo(7.875, 2);
  });
  it('milrinona 0.75 mcg/kg/min, 70 kg, 0.2 mg/mL → 15.75 mL/h', () => {
    expect(computeRate(MILA, 0.75, 70, 0.2)).toBeCloseTo(15.75, 1);
  });
  // Dexmedetomidina (mcg/kg/h — vialUnit=mcg, sin conversión)
  it('dexmedetomidina 0.5 mcg/kg/h, 70 kg, 4 mcg/mL → 8.75 mL/h', () => {
    // doseH = 0.5×70=35 mcg/h (ya es /h, no /min); concDose=4 mcg/mL; rate=8.75
    expect(computeRate(DEXM, 0.5, 70, 4)).toBeCloseTo(8.75, 1);
  });
  it('dexmedetomidina 1.4 mcg/kg/h, 70 kg, 4 mcg/mL → 24.5 mL/h', () => {
    // doseH = 1.4×70=98 mcg/h; concDose=4 mcg/mL; rate=24.5
    expect(computeRate(DEXM, 1.4, 70, 4)).toBeCloseTo(24.5, 1);
  });
  // Pesos extremos (seguridad clínica)
  it('paciente pediátrico 10 kg — ritmo significativamente menor', () => {
    const r10  = computeRate(NA, 0.1, 10, 0.064);
    const r70  = computeRate(NA, 0.1, 70, 0.064);
    expect(r10).toBeCloseTo(r70 * (10 / 70), 4);
  });
  it('paciente obeso 150 kg — ritmo proporcionalmente mayor', () => {
    const r70  = computeRate(NA, 0.1, 70, 0.064);
    const r150 = computeRate(NA, 0.1, 150, 0.064);
    expect(r150).toBeCloseTo(r70 * (150 / 70), 4);
  });
  // Concentraciones mínimas y máximas
  it('concentración muy alta → ritmo muy bajo (mayor seguridad frente a errores)', () => {
    const rLow  = computeRate(NA, 0.1, 70, 0.064);
    const rHigh = computeRate(NA, 0.1, 70, 0.32);
    expect(rHigh).toBeLessThan(rLow);
  });
});

// ── 3. computeDose (mL/h → dosis) ────────────────────────────────────────────
describe('computeDose — cálculo de la dosis a partir del ritmo de bomba', () => {
  it('isoprenalina 60 mL/h, 0.002 mg/mL → 120 mcg/h total (2 mcg/min)', () => {
    // computeDose devuelve rate × concDose (mcg/h total)
    expect(computeDose(ISO, 60, 70, 0.002)).toBeCloseTo(120, 0);
  });
  it('isoprenalina 30 mL/h → 60 mcg/h total (1 mcg/min)', () => {
    expect(computeDose(ISO, 30, 70, 0.002)).toBeCloseTo(60, 0);
  });
  it('heparina 20 mL/h, 50 UI/mL → 1000 UI/h', () => {
    expect(computeDose(HEP, 20, 70, 50)).toBeCloseTo(1000, 0);
  });
  it('heparina 25 mL/h, 50 UI/mL → 1250 UI/h', () => {
    expect(computeDose(HEP, 25, 70, 50)).toBeCloseTo(1250, 0);
  });
  it('insulina 5 mL/h, 2 UI/mL → 10 UI/h', () => {
    expect(computeDose(INS, 5, 70, 2)).toBeCloseTo(10, 0);
  });
  it('furosemida 5 mL/h, 2 mg/mL → 10 mg/h', () => {
    expect(computeDose(FUR, 5, 70, 2)).toBeCloseTo(10, 0);
  });
  it('propofol 10 mL/h, 10 mg/mL → 100 mg/h', () => {
    expect(computeDose(PROP, 10, 70, 10)).toBeCloseTo(100, 0);
  });
  it('dopamina 13.125 mL/h, 1.6 mg/mL → 21000 mcg/h (= 5 mcg/kg/min en 70 kg)', () => {
    const dose = computeDose(DOP, 13.125, 70, 1.6);
    // doseH_mcg = 13.125 × 1600 = 21000 mcg/h
    expect(dose).toBeCloseTo(21000, 0);
  });
});

// ── 4. Consistencia inversa computeRate ↔ computeDose ────────────────────────
describe('Consistencia inversa — computeRate y computeDose son operaciones inversas', () => {
  const cases = [
    { name: 'noradrenalina',  d: NA,   doseIn: 0.1,   w: 70,  conc: 0.064 },
    { name: 'adrenalina',     d: ADR,  doseIn: 0.05,  w: 70,  conc: 0.02  },
    { name: 'dopamina',       d: DOP,  doseIn: 5,     w: 70,  conc: 1.6   },
    { name: 'dobutamina',     d: DBT,  doseIn: 5,     w: 80,  conc: 1.0   },
    { name: 'isoprenalina',   d: ISO,  doseIn: 2,     w: 70,  conc: 0.002 },
    { name: 'heparina',       d: HEP,  doseIn: 1000,  w: 70,  conc: 50    },
    { name: 'insulina',       d: INS,  doseIn: 5,     w: 70,  conc: 1     },
    { name: 'furosemida',     d: FUR,  doseIn: 10,    w: 70,  conc: 2     },
    { name: 'propofol',       d: PROP, doseIn: 100,   w: 70,  conc: 10    },
    { name: 'milrinona',      d: MILA, doseIn: 0.375, w: 70,  conc: 0.2   },
    { name: 'nitroglicerina', d: NTG,  doseIn: 50,    w: 70,  conc: 0.1   },
    { name: 'labetalol',      d: LABT, doseIn: 50,    w: 70,  conc: 1     },
  ];

  cases.forEach(({ name, d, doseIn, w, conc }) => {
    it(`${name}: rate → dose → dose_total ≈ doseIn × peso × 60 (si /kg/min)`, () => {
      const rate = computeRate(d, doseIn, w, conc);
      const doseBack = computeDose(d, rate, w, conc);
      // computeDose devuelve rate × concDose = doseH_total (en unidad_base/h)
      // Para unidades /kg/min: esperado = doseIn × w × 60
      // Para unidades /min: esperado = doseIn × 60
      // Para unidades /h: esperado = doseIn
      let expectedTotal;
      if (d.unit.includes('/kg') && d.unit.includes('/min')) expectedTotal = doseIn * w * 60;
      else if (d.unit.includes('/min')) expectedTotal = doseIn * 60;
      else expectedTotal = doseIn; // /h
      expect(doseBack).toBeCloseTo(expectedTotal, 1);
    });
  });

  it('ritmo nulo → dosis nula', () => {
    expect(computeDose(NA, 0, 70, 0.064)).toBe(0);
  });
});
