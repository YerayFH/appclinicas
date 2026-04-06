/**
 * Tests — SepsAlert (Estratificación de riesgo de sepsis)
 * 100+ casos clínicos: NEWS2, SIRS y SOFA con valores límite y errores.
 */
import { describe, it, expect } from 'vitest';
import { newsSpO2Score, calcNEWS, calcSIRS, sofaRespScore, sofaBD } from '../shared/calc-sepsis.js';

// ── Constante base: paciente sano ──────────────────────────────────────────────
const SANO = {
  spo2: 97, fr: 16, tas: 120, fc: 75, temp: 37.2,
  conc: 'Alerta', o2sup: false, scale2: false
};

// ── 1. newsSpO2Score ───────────────────────────────────────────────────────────
describe('newsSpO2Score — Escala 1 (estándar, sin EPOC)', () => {
  it('SpO₂ 100% → 0 puntos', () => expect(newsSpO2Score(100, false, false)).toBe(0));
  it('SpO₂ 97% → 0 puntos',  () => expect(newsSpO2Score(97,  false, false)).toBe(0));
  it('SpO₂ 96% → 0 puntos',  () => expect(newsSpO2Score(96,  false, false)).toBe(0));
  it('SpO₂ 95% → 1 punto',   () => expect(newsSpO2Score(95,  false, false)).toBe(1));
  it('SpO₂ 94% → 1 punto',   () => expect(newsSpO2Score(94,  false, false)).toBe(1));
  it('SpO₂ 93% → 2 puntos',  () => expect(newsSpO2Score(93,  false, false)).toBe(2));
  it('SpO₂ 92% → 2 puntos',  () => expect(newsSpO2Score(92,  false, false)).toBe(2));
  it('SpO₂ 91% → 3 puntos',  () => expect(newsSpO2Score(91,  false, false)).toBe(3));
  it('SpO₂ 88% → 3 puntos',  () => expect(newsSpO2Score(88,  false, false)).toBe(3));
  it('SpO₂ 80% → 3 puntos',  () => expect(newsSpO2Score(80,  false, false)).toBe(3));
  it('O₂ suplementario en escala 1 no cambia la puntuación SpO₂', () => {
    // En escala 1, o2sup no altera el score de SpO₂ directamente
    expect(newsSpO2Score(95, true, false)).toBe(1);
    expect(newsSpO2Score(97, true, false)).toBe(0);
  });
});

describe('newsSpO2Score — Escala 2 (EPOC / hipercapnia)', () => {
  it('SpO₂ 93% con O₂ → 3 puntos (hiperoxia peligrosa en EPOC)', () =>
    expect(newsSpO2Score(93, true, true)).toBe(3));
  it('SpO₂ 95% con O₂ → 3 puntos', () =>
    expect(newsSpO2Score(95, true, true)).toBe(3));
  it('SpO₂ 100% con O₂ → 3 puntos', () =>
    expect(newsSpO2Score(100, true, true)).toBe(3));
  it('SpO₂ 93% sin O₂ → 0 puntos (rango objetivo EPOC)', () =>
    expect(newsSpO2Score(93, false, true)).toBe(0));
  it('SpO₂ 95% sin O₂ → 0 puntos', () =>
    expect(newsSpO2Score(95, false, true)).toBe(0));
  it('SpO₂ 88%–92% sin O₂ → 0 puntos (rango objetivo)', () => {
    expect(newsSpO2Score(88, false, true)).toBe(0);
    expect(newsSpO2Score(90, false, true)).toBe(0);
    expect(newsSpO2Score(92, false, true)).toBe(0);
  });
  it('SpO₂ 86-87% → 1 punto', () => {
    expect(newsSpO2Score(86, false, true)).toBe(1);
    expect(newsSpO2Score(87, false, true)).toBe(1);
  });
  it('SpO₂ 84-85% → 2 puntos', () => {
    expect(newsSpO2Score(84, false, true)).toBe(2);
    expect(newsSpO2Score(85, false, true)).toBe(2);
  });
  it('SpO₂ ≤83% → 3 puntos', () => {
    expect(newsSpO2Score(83, false, true)).toBe(3);
    expect(newsSpO2Score(70, false, true)).toBe(3);
  });
});

// ── 2. calcNEWS ───────────────────────────────────────────────────────────────
describe('calcNEWS — NEWS2 completo', () => {
  it('paciente sano → 0 puntos', () => expect(calcNEWS(SANO)).toBe(0));

  // Frecuencia respiratoria
  it('FR ≤8 → suma 3 puntos', () => expect(calcNEWS({ ...SANO, fr: 8 }) - calcNEWS(SANO)).toBe(3));
  it('FR 9-11 → suma 1 punto', () => {
    expect(calcNEWS({ ...SANO, fr: 9 })  - calcNEWS(SANO)).toBe(1);
    expect(calcNEWS({ ...SANO, fr: 11 }) - calcNEWS(SANO)).toBe(1);
  });
  it('FR 12-20 → suma 0 puntos', () => {
    expect(calcNEWS({ ...SANO, fr: 12 }) - calcNEWS(SANO)).toBe(0);
    expect(calcNEWS({ ...SANO, fr: 20 }) - calcNEWS(SANO)).toBe(0);
  });
  it('FR 21-24 → suma 2 puntos', () => {
    expect(calcNEWS({ ...SANO, fr: 21 }) - calcNEWS(SANO)).toBe(2);
    expect(calcNEWS({ ...SANO, fr: 24 }) - calcNEWS(SANO)).toBe(2);
  });
  it('FR ≥25 → suma 3 puntos', () => {
    expect(calcNEWS({ ...SANO, fr: 25 }) - calcNEWS(SANO)).toBe(3);
    expect(calcNEWS({ ...SANO, fr: 40 }) - calcNEWS(SANO)).toBe(3);
  });

  // Tensión arterial sistólica
  it('TAS ≤90 → suma 3 puntos (hipotensión severa)', () => {
    expect(calcNEWS({ ...SANO, tas: 90 }) - calcNEWS(SANO)).toBe(3);
    expect(calcNEWS({ ...SANO, tas: 70 }) - calcNEWS(SANO)).toBe(3);
  });
  it('TAS 91-100 → suma 2 puntos', () => {
    expect(calcNEWS({ ...SANO, tas: 95 }) - calcNEWS(SANO)).toBe(2);
  });
  it('TAS 101-110 → suma 1 punto', () => {
    expect(calcNEWS({ ...SANO, tas: 105 }) - calcNEWS(SANO)).toBe(1);
  });
  it('TAS 111-219 → suma 0 puntos', () => {
    expect(calcNEWS({ ...SANO, tas: 140 }) - calcNEWS(SANO)).toBe(0);
    expect(calcNEWS({ ...SANO, tas: 219 }) - calcNEWS(SANO)).toBe(0);
  });
  it('TAS ≥220 → suma 3 puntos (HTA hipertensiva)', () => {
    expect(calcNEWS({ ...SANO, tas: 220 }) - calcNEWS(SANO)).toBe(3);
  });

  // Frecuencia cardíaca
  it('FC ≤40 → suma 3 puntos (bradicardia extrema)', () => {
    expect(calcNEWS({ ...SANO, fc: 40 }) - calcNEWS(SANO)).toBe(3);
  });
  it('FC 41-50 → suma 1 punto', () => {
    expect(calcNEWS({ ...SANO, fc: 45 }) - calcNEWS(SANO)).toBe(1);
  });
  it('FC 51-90 → suma 0 puntos', () => {
    expect(calcNEWS({ ...SANO, fc: 75 }) - calcNEWS(SANO)).toBe(0);
  });
  it('FC 91-110 → suma 1 punto (taquicardia leve)', () => {
    expect(calcNEWS({ ...SANO, fc: 100 }) - calcNEWS(SANO)).toBe(1);
  });
  it('FC 111-130 → suma 2 puntos', () => {
    expect(calcNEWS({ ...SANO, fc: 120 }) - calcNEWS(SANO)).toBe(2);
  });
  it('FC >130 → suma 3 puntos (taquicardia severa)', () => {
    expect(calcNEWS({ ...SANO, fc: 135 }) - calcNEWS(SANO)).toBe(3);
  });

  // Temperatura
  it('Temp ≤35.0 → suma 3 puntos (hipotermia)', () => {
    expect(calcNEWS({ ...SANO, temp: 35.0 }) - calcNEWS(SANO)).toBe(3);
  });
  it('Temp 35.1-36.0 → suma 1 punto', () => {
    expect(calcNEWS({ ...SANO, temp: 35.5 }) - calcNEWS(SANO)).toBe(1);
  });
  it('Temp 36.1-38.0 → suma 0 puntos', () => {
    expect(calcNEWS({ ...SANO, temp: 37.0 }) - calcNEWS(SANO)).toBe(0);
  });
  it('Temp 38.1-39.0 → suma 1 punto (fiebre)', () => {
    expect(calcNEWS({ ...SANO, temp: 38.5 }) - calcNEWS(SANO)).toBe(1);
  });
  it('Temp >39 → suma 2 puntos (fiebre alta)', () => {
    expect(calcNEWS({ ...SANO, temp: 39.5 }) - calcNEWS(SANO)).toBe(2);
    expect(calcNEWS({ ...SANO, temp: 41.0 }) - calcNEWS(SANO)).toBe(2);
  });

  // Nivel de conciencia
  it('Conciencia "Alerta" → suma 0 puntos', () => {
    expect(calcNEWS({ ...SANO, conc: 'Alerta' }) - calcNEWS(SANO)).toBe(0);
  });
  it('Cualquier alteración conciencia → suma 3 puntos', () => {
    expect(calcNEWS({ ...SANO, conc: 'Confuso' })  - calcNEWS(SANO)).toBe(3);
    expect(calcNEWS({ ...SANO, conc: 'Letargo' })  - calcNEWS(SANO)).toBe(3);
    expect(calcNEWS({ ...SANO, conc: 'Coma' })     - calcNEWS(SANO)).toBe(3);
  });

  // O₂ suplementario
  it('O₂ suplementario → suma 2 puntos', () => {
    expect(calcNEWS({ ...SANO, o2sup: true }) - calcNEWS(SANO)).toBe(2);
  });

  // Casos clínicos compuestos
  it('sepsis probable: fiebre + taquicardia + taquipnea + O₂ → score alto', () => {
    const septico = { ...SANO, temp: 38.8, fc: 115, fr: 24, o2sup: true, spo2: 95 };
    expect(calcNEWS(septico)).toBeGreaterThanOrEqual(5);
  });
  it('shock séptico: hipotensión + taquicardia + alt.conciencia → score ≥ 9', () => {
    const shock = { ...SANO, tas: 85, fc: 135, conc: 'Letargo', o2sup: true, fr: 28 };
    expect(calcNEWS(shock)).toBeGreaterThanOrEqual(9);
  });
  it('score máximo teórico ≥ 17 con todos los parámetros en extremo', () => {
    const max = { spo2: 80, fr: 30, tas: 85, fc: 140, temp: 34.5, conc: 'Coma', o2sup: true, scale2: false };
    expect(calcNEWS(max)).toBeGreaterThanOrEqual(17);
  });
});

// ── 3. calcSIRS ───────────────────────────────────────────────────────────────
describe('calcSIRS — Criterios SIRS', () => {
  it('paciente normal → 0 criterios', () =>
    expect(calcSIRS({ temp: 37.0, fc: 80, fr: 16, leucos: 8 })).toBe(0));
  it('fiebre >38°C → 1 criterio', () =>
    expect(calcSIRS({ temp: 38.5, fc: 80, fr: 16, leucos: 8 })).toBe(1));
  it('hipotermia <36°C → 1 criterio', () =>
    expect(calcSIRS({ temp: 35.5, fc: 80, fr: 16, leucos: 8 })).toBe(1));
  it('temp límite 38.0°C (no >38) → 0 criterios temperatura', () =>
    expect(calcSIRS({ temp: 38.0, fc: 80, fr: 16, leucos: 8 })).toBe(0));
  it('temp límite 36.0°C (no <36) → 0 criterios temperatura', () =>
    expect(calcSIRS({ temp: 36.0, fc: 80, fr: 16, leucos: 8 })).toBe(0));
  it('FC >90 lpm → 1 criterio', () =>
    expect(calcSIRS({ temp: 37.0, fc: 95, fr: 16, leucos: 8 })).toBe(1));
  it('FC exactamente 90 (no >90) → 0 criterios FC', () =>
    expect(calcSIRS({ temp: 37.0, fc: 90, fr: 16, leucos: 8 })).toBe(0));
  it('FR >20 rpm → 1 criterio', () =>
    expect(calcSIRS({ temp: 37.0, fc: 80, fr: 22, leucos: 8 })).toBe(1));
  it('FR exactamente 20 (no >20) → 0 criterios FR', () =>
    expect(calcSIRS({ temp: 37.0, fc: 80, fr: 20, leucos: 8 })).toBe(0));
  it('leucocitosis >12 × 10³ → 1 criterio', () =>
    expect(calcSIRS({ temp: 37.0, fc: 80, fr: 16, leucos: 13 })).toBe(1));
  it('leucocitosis exactamente 12 (no >12) → 0 criterios', () =>
    expect(calcSIRS({ temp: 37.0, fc: 80, fr: 16, leucos: 12 })).toBe(0));
  it('leucopenia <4 × 10³ → 1 criterio', () =>
    expect(calcSIRS({ temp: 37.0, fc: 80, fr: 16, leucos: 3.5 })).toBe(1));
  it('leucocitos exactamente 4 (no <4) → 0 criterios', () =>
    expect(calcSIRS({ temp: 37.0, fc: 80, fr: 16, leucos: 4 })).toBe(0));
  it('fiebre + taquicardia → 2 criterios (SIRS parcial)', () =>
    expect(calcSIRS({ temp: 38.5, fc: 95, fr: 16, leucos: 8 })).toBe(2));
  it('fiebre + taquicardia + taquipnea → 3 criterios', () =>
    expect(calcSIRS({ temp: 38.5, fc: 95, fr: 22, leucos: 8 })).toBe(3));
  it('todos los criterios positivos → 4 criterios', () =>
    expect(calcSIRS({ temp: 39, fc: 100, fr: 22, leucos: 14 })).toBe(4));
  it('hipotermia + leucopenia → 2 criterios (sepsis grave)', () =>
    expect(calcSIRS({ temp: 35.5, fc: 80, fr: 16, leucos: 2 })).toBe(2));
  it('FC muy alta (150) + FR alta + leucocitosis → 3 criterios', () =>
    expect(calcSIRS({ temp: 37.0, fc: 150, fr: 25, leucos: 16 })).toBe(3));
});

// ── 4. sofaRespScore ──────────────────────────────────────────────────────────
describe('sofaRespScore — Componente respiratorio SOFA', () => {
  // Lógica del código: pf<=100→(vent?4:2), pf<=200→(vent?3:2), pf<=300→2, pf<=400→1, else 0
  it('PF > 400 → 0 (función normal)', () => expect(sofaRespScore(450, false)).toBe(0));
  it('PF 401 → 0',                   () => expect(sofaRespScore(401, false)).toBe(0));
  it('PF exactamente 400 → 1',       () => expect(sofaRespScore(400, false)).toBe(1));
  it('PF 301-400 → 1',               () => expect(sofaRespScore(350, false)).toBe(1));
  it('PF exactamente 301 → 1',       () => expect(sofaRespScore(301, false)).toBe(1));
  it('PF exactamente 300 → 2',       () => expect(sofaRespScore(300, false)).toBe(2));
  it('PF 201-300 → 2',               () => expect(sofaRespScore(250, false)).toBe(2));
  it('PF 101-200 sin VM → 2 (SDRA leve-mod)', () => expect(sofaRespScore(180, false)).toBe(2));
  it('PF 101-200 con VM → 3 (SDRA moderado)', () => expect(sofaRespScore(180, true)).toBe(3));
  it('PF ≤100 sin VM → 2',            () => expect(sofaRespScore(90,  false)).toBe(2));
  it('PF ≤100 con VM → 4 (SDRA grave)',() => expect(sofaRespScore(90,  true)).toBe(4));
  it('PF 50 con VM → 4',              () => expect(sofaRespScore(50,  true)).toBe(4));
  it('PF exactamente 200 → (≤200): sin VM=2, con VM=3', () => {
    expect(sofaRespScore(200, false)).toBe(2);
    expect(sofaRespScore(200, true)).toBe(3);
  });
  it('PF exactamente 100 → (≤100): sin VM=2, con VM=4', () => {
    expect(sofaRespScore(100, false)).toBe(2);
    expect(sofaRespScore(100, true)).toBe(4);
  });
});

// ── 5. sofaBD — SOFA por dominios ─────────────────────────────────────────────
describe('sofaBD — SOFA por dominios', () => {
  const OK = {
    pf: 450, pla: 200, bili: 0.5, cv: 'ninguno',
    pam: 75, gcs: 15, cr: 0.8, di: 600, ventilated: false
  };

  it('paciente sin disfunción → todos los dominios 0', () => {
    const s = sofaBD(OK);
    expect(s.res).toBe(0); expect(s.plq).toBe(0); expect(s.bl).toBe(0);
    expect(s.cvs).toBe(0); expect(s.neu).toBe(0); expect(s.ren).toBe(0);
  });

  // Plaquetas — El código usa < estricto: plq=1 si pla < 150
  it('plaquetas 200 → plq=0 (por encima del umbral)',   () => expect(sofaBD({ ...OK, pla: 200 }).plq).toBe(0));
  it('plaquetas 150 → plq=0 (no < 150)',               () => expect(sofaBD({ ...OK, pla: 150 }).plq).toBe(0));
  it('plaquetas 149 → plq=1 (< 150)',                  () => expect(sofaBD({ ...OK, pla: 149 }).plq).toBe(1));
  it('plaquetas 100-149 → plq=1',                      () => expect(sofaBD({ ...OK, pla: 120 }).plq).toBe(1));
  it('plaquetas exactamente 100 → plq=1 (< 150, ≥ 100)',() => expect(sofaBD({ ...OK, pla: 100 }).plq).toBe(1));
  it('plaquetas 50-99 → plq=2',                 () => expect(sofaBD({ ...OK, pla: 75 }).plq).toBe(2));
  it('plaquetas 20-49 → plq=3',                 () => expect(sofaBD({ ...OK, pla: 35 }).plq).toBe(3));
  it('plaquetas < 20 → plq=4 (trombopenia grave)',() => expect(sofaBD({ ...OK, pla: 15 }).plq).toBe(4));

  // Bilirrubina
  it('bilirrubina 1.2-1.9 → bl=1', () => expect(sofaBD({ ...OK, bili: 1.5 }).bl).toBe(1));
  it('bilirrubina 2.0-5.9 → bl=2', () => expect(sofaBD({ ...OK, bili: 3.0 }).bl).toBe(2));
  it('bilirrubina 6.0-11.9 → bl=3',() => expect(sofaBD({ ...OK, bili: 8.0 }).bl).toBe(3));
  it('bilirrubina ≥12 → bl=4',     () => expect(sofaBD({ ...OK, bili: 13 }).bl).toBe(4));
  it('bilirrubina < 1.2 → bl=0',   () => expect(sofaBD({ ...OK, bili: 0.5 }).bl).toBe(0));

  // Cardiovascular
  it('PAM <70 sin vasoactivos → cvs=1', () => expect(sofaBD({ ...OK, pam: 65, cv: 'ninguno' }).cvs).toBe(1));
  it('dopamina ≤5 / dobutamina → cvs=2', () => {
    expect(sofaBD({ ...OK, cv: 'dopa5' }).cvs).toBe(2);
    expect(sofaBD({ ...OK, cv: 'dobu'  }).cvs).toBe(2);
  });
  it('dopamina 5-10 → cvs=3', () => expect(sofaBD({ ...OK, cv: 'dopa510' }).cvs).toBe(3));
  it('noradrenalina baja → cvs=3', () => expect(sofaBD({ ...OK, cv: 'nrB' }).cvs).toBe(3));
  it('epinefrina baja → cvs=3', () => expect(sofaBD({ ...OK, cv: 'epiLow' }).cvs).toBe(3));
  it('dopamina >15 → cvs=4', () => expect(sofaBD({ ...OK, cv: 'dopa15' }).cvs).toBe(4));
  it('noradrenalina alta → cvs=4', () => expect(sofaBD({ ...OK, cv: 'nrA' }).cvs).toBe(4));
  it('epinefrina alta → cvs=4', () => expect(sofaBD({ ...OK, cv: 'epiHigh' }).cvs).toBe(4));

  // Neurológico (GCS)
  it('GCS 15 → neu=0', () => expect(sofaBD({ ...OK, gcs: 15 }).neu).toBe(0));
  it('GCS 13-14 → neu=1', () => {
    expect(sofaBD({ ...OK, gcs: 14 }).neu).toBe(1);
    expect(sofaBD({ ...OK, gcs: 13 }).neu).toBe(1);
  });
  it('GCS 10-12 → neu=2', () => expect(sofaBD({ ...OK, gcs: 11 }).neu).toBe(2));
  it('GCS 6-9 → neu=3', () => expect(sofaBD({ ...OK, gcs: 8 }).neu).toBe(3));
  it('GCS <6 → neu=4 (coma profundo)', () => {
    expect(sofaBD({ ...OK, gcs: 5 }).neu).toBe(4);
    expect(sofaBD({ ...OK, gcs: 3 }).neu).toBe(4);
  });

  // Renal
  it('Cr < 1.2 → ren=0', () => expect(sofaBD({ ...OK, cr: 0.9, di: 600 }).ren).toBe(0));
  it('Cr 1.2-1.9 → ren=1', () => expect(sofaBD({ ...OK, cr: 1.5, di: 600 }).ren).toBe(1));
  it('Cr 2.0-3.4 → ren=2', () => expect(sofaBD({ ...OK, cr: 2.5, di: 600 }).ren).toBe(2));
  it('Cr 3.5-4.9 → ren=3', () => expect(sofaBD({ ...OK, cr: 4.0, di: 300 }).ren).toBe(3));
  it('Diuresis 200-499 mL/día → ren=3', () => expect(sofaBD({ ...OK, cr: 0.9, di: 350 }).ren).toBe(3));
  it('Cr ≥5 → ren=4', () => expect(sofaBD({ ...OK, cr: 5.5, di: 300 }).ren).toBe(4));
  it('Diuresis <200 mL/día → ren=4 (oligoanuria)', () => expect(sofaBD({ ...OK, cr: 0.9, di: 100 }).ren).toBe(4));

  // Casos compuestos
  it('SOFA máximo: todos los dominios en 4 → total 24', () => {
    const maxSofa = sofaBD({
      pf: 80, ventilated: true, pla: 15, bili: 15,
      cv: 'nrA', pam: 50, gcs: 3, cr: 6, di: 100
    });
    const total = maxSofa.res + maxSofa.plq + maxSofa.bl + maxSofa.cvs + maxSofa.neu + maxSofa.ren;
    expect(total).toBe(24);
  });
  it('fallo multiorgánico moderado → SOFA > 8', () => {
    // res=3(PF180+VM), plq=2(pla80), bl=2(bili4), cvs=3(dopa510), neu=2(gcs11), ren=3(di400)
    const s = sofaBD({
      pf: 180, ventilated: true, pla: 80, bili: 4,
      cv: 'dopa510', pam: 65, gcs: 11, cr: 2.0, di: 400
    });
    const total = s.res + s.plq + s.bl + s.cvs + s.neu + s.ren;
    expect(total).toBeGreaterThanOrEqual(8);
    expect(total).toBeLessThan(24); // no es fallo máximo
  });
});
