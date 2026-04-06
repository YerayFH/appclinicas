/**
 * Tests — Guía Empírica (Selección de Antibiótico Empírico)
 *
 * Esta aplicación es una guía de referencia clínica (lookup/filtrado).
 * Los tests validan reglas de selección antibiótica, ajustes por función renal,
 * criterios de cobertura y principios de stewardship según guías clínicas.
 *
 * Refs: IDSA, ESCMID, SEIMC, Sanford Guide, HUPR Guía Local de Antibioterapia.
 */
import { describe, it, expect } from 'vitest';

// ── Funciones auxiliares de lógica antibiótica ───────────────────────────────

/**
 * Ajuste de dosis de antibiótico por función renal
 * Retorna la categoría de ajuste según el FG.
 */
function renalAdjustCategory(fgMlMin) {
  if (fgMlMin == null || isNaN(fgMlMin)) return null;
  if (fgMlMin >= 60) return 'normal';
  if (fgMlMin >= 30) return 'ajuste_moderado';  // reducir dosis o ampliar intervalo
  if (fgMlMin >= 15) return 'ajuste_severo';
  return 'evitar_o_dialisis';
}

/**
 * Determina si el fármaco requiere ajuste en función renal severa (FG < 30)
 */
function needsRenalAdjust(drug, fgMlMin) {
  // Antibióticos que REQUIEREN ajuste renal (renally-cleared)
  const renallyCleared = [
    'piperacilina-tazobactam', 'meropenem', 'imipenem',
    'vancomicina', 'aminoglucosidos', 'gentamicina', 'amikacina',
    'ciprofloxacino', 'levofloxacino', 'nitrofurantoina',
    'cefazolina', 'ceftriaxona-altas-dosis',
  ];
  const ciBelow30 = ['nitrofurantoina']; // CI si FG < 30
  if (ciBelow30.includes(drug) && fgMlMin < 30) return 'contraindicado';
  if (renallyCleared.includes(drug) && fgMlMin < 60) return 'ajustar';
  return 'sin_ajuste';
}

/**
 * Cobertura de MRSA: determina si el régimen incluye cobertura anti-MRSA
 */
function hasMRSACoverage(antibiotics) {
  const mrsaActives = ['vancomicina', 'linezolid', 'daptomicina', 'tedizolid', 'ceftarolina'];
  return antibiotics.some(ab => mrsaActives.includes(ab));
}

/**
 * Cobertura anaeróbica adecuada para infecciones intraabdominales
 */
function hasAnaerobicCoverage(antibiotics) {
  const anaerobes = ['metronidazol', 'clindamicina', 'piperacilina-tazobactam',
                     'amoxicilina-clavulanico', 'ertapenem', 'meropenem', 'imipenem'];
  return antibiotics.some(ab => anaerobes.includes(ab));
}

/**
 * Duración óptima del tratamiento antibiótico (días)
 * Según guías clínicas por síndrome infeccioso.
 */
const DURATION_GUIDE = {
  'neumonia_comunitaria_leve':    { min: 5,  max: 7  },
  'neumonia_comunitaria_grave':   { min: 7,  max: 14 },
  'itu_no_complicada_mujer':      { min: 3,  max: 5  },
  'itu_pielonefritis':            { min: 7,  max: 14 },
  'bacteriemia_s_aureus':         { min: 14, max: 42 },
  'endocarditis_strep':           { min: 14, max: 28 },
  'meningitis_bacteriana':        { min: 7,  max: 21 },
  'intraabdominal_complicada':    { min: 4,  max: 7  },
  'neumoniaAV':                   { min: 7,  max: 8  },
  'celulitis_leve':               { min: 5,  max: 7  },
};

function isDurationOK(syndrome, days) {
  const d = DURATION_GUIDE[syndrome];
  if (!d) return null;
  return days >= d.min && days <= d.max;
}

/**
 * Beta-lactámicos de primera elección para gérmenes habituales
 */
const FIRST_LINE = {
  'streptococcus_pneumoniae': 'amoxicilina',
  'haemophilus_influenzae':   'amoxicilina-clavulanico',
  'e_coli_itu':               'fosfomicina',
  'staphylococcus_aureus_mssa': 'cloxacilina',
  'streptococcus_pyogenes':   'amoxicilina',
  'neisseria_meningitidis':   'penicilina G o ceftriaxona',
};

function getFirstLine(germ) {
  return FIRST_LINE[germ] ?? null;
}

/**
 * Principio de escalada/desescalada: el antibiótico de amplio espectro se
 * debería sustituir por uno de espectro reducido al conocer el antibiograma.
 */
function shouldDeescalate(initialDrug, cultureResult) {
  const broadSpectrum = ['piperacilina-tazobactam', 'meropenem', 'vancomicina'];
  if (!broadSpectrum.includes(initialDrug)) return false;
  return cultureResult !== null; // con antibiograma, siempre hay que plantearlo
}

/**
 * Duración máxima segura de catéter vascular antes de recambio (días)
 * Para reducir bacteriemia relacionada con catéter.
 */
function isLineDurationSafe(days) {
  return typeof days === 'number' && days <= 14;
}

// ── 1. Ajuste renal de antibióticos ──────────────────────────────────────────
describe('Ajuste renal — categorías por FG', () => {
  it('FG ≥ 60 → sin ajuste (normal)', () =>
    expect(renalAdjustCategory(80)).toBe('normal'));
  it('FG exactamente 60 → normal (límite)', () =>
    expect(renalAdjustCategory(60)).toBe('normal'));
  it('FG 59 → ajuste moderado', () =>
    expect(renalAdjustCategory(59)).toBe('ajuste_moderado'));
  it('FG 30-59 → ajuste moderado', () => {
    expect(renalAdjustCategory(45)).toBe('ajuste_moderado');
    expect(renalAdjustCategory(30)).toBe('ajuste_moderado');
  });
  it('FG 15-29 → ajuste severo', () => {
    expect(renalAdjustCategory(20)).toBe('ajuste_severo');
    expect(renalAdjustCategory(15)).toBe('ajuste_severo');
  });
  it('FG < 15 → evitar o diálisis', () => {
    expect(renalAdjustCategory(10)).toBe('evitar_o_dialisis');
    expect(renalAdjustCategory(5)).toBe('evitar_o_dialisis');
  });
  it('FG null → null', () =>
    expect(renalAdjustCategory(null)).toBeNull());
  it('FG 0 → evitar_o_dialisis', () =>
    expect(renalAdjustCategory(0)).toBe('evitar_o_dialisis'));
});

describe('needsRenalAdjust — fármacos específicos', () => {
  it('vancomicina FG 20 → ajustar', () =>
    expect(needsRenalAdjust('vancomicina', 20)).toBe('ajustar'));
  it('vancomicina FG 70 → sin_ajuste', () =>
    expect(needsRenalAdjust('vancomicina', 70)).toBe('sin_ajuste'));
  it('meropenem FG 30 → ajustar', () =>
    expect(needsRenalAdjust('meropenem', 30)).toBe('ajustar'));
  it('piperacilina-tazobactam FG 45 → ajustar', () =>
    expect(needsRenalAdjust('piperacilina-tazobactam', 45)).toBe('ajustar'));
  it('nitrofurantoina FG 25 → contraindicado (<30)', () =>
    expect(needsRenalAdjust('nitrofurantoina', 25)).toBe('contraindicado'));
  it('nitrofurantoina FG 35 → ajustar', () =>
    expect(needsRenalAdjust('nitrofurantoina', 35)).toBe('ajustar'));
  it('aminoglucosidos FG 25 → ajustar', () =>
    expect(needsRenalAdjust('aminoglucosidos', 25)).toBe('ajustar'));
  it('amoxicilina FG 20 → sin_ajuste (principalmente hepático)', () =>
    expect(needsRenalAdjust('amoxicilina', 20)).toBe('sin_ajuste'));
});

// ── 2. Cobertura anti-MRSA ────────────────────────────────────────────────────
describe('Cobertura anti-MRSA', () => {
  it('vancomicina en el régimen → cobertura MRSA OK', () =>
    expect(hasMRSACoverage(['vancomicina', 'piperacilina-tazobactam'])).toBe(true));
  it('linezolid en el régimen → cobertura MRSA OK', () =>
    expect(hasMRSACoverage(['linezolid'])).toBe(true));
  it('daptomicina → cobertura MRSA OK', () =>
    expect(hasMRSACoverage(['daptomicina'])).toBe(true));
  it('meropenem solo → NO cubre MRSA', () =>
    expect(hasMRSACoverage(['meropenem'])).toBe(false));
  it('amoxicilina sola → NO cubre MRSA', () =>
    expect(hasMRSACoverage(['amoxicilina'])).toBe(false));
  it('régimen vacío → NO cubre MRSA', () =>
    expect(hasMRSACoverage([])).toBe(false));
  it('piperacilina-tazobactam + vancomicina → sí cobertura MRSA', () =>
    expect(hasMRSACoverage(['piperacilina-tazobactam', 'vancomicina'])).toBe(true));
});

// ── 3. Cobertura anaeróbica ───────────────────────────────────────────────────
describe('Cobertura anaeróbica — infección intraabdominal', () => {
  it('metronidazol en régimen → cobertura anaerobia OK', () =>
    expect(hasAnaerobicCoverage(['ceftriaxona', 'metronidazol'])).toBe(true));
  it('piperacilina-tazobactam solo → cobertura anaerobia OK', () =>
    expect(hasAnaerobicCoverage(['piperacilina-tazobactam'])).toBe(true));
  it('meropenem → cobertura anaerobia OK', () =>
    expect(hasAnaerobicCoverage(['meropenem'])).toBe(true));
  it('amoxicilina-clavulanico → cobertura anaerobia OK', () =>
    expect(hasAnaerobicCoverage(['amoxicilina-clavulanico'])).toBe(true));
  it('ceftriaxona sola → NO cubre anaerobios', () =>
    expect(hasAnaerobicCoverage(['ceftriaxona'])).toBe(false));
  it('ciprofloxacino solo → NO cubre bien anaerobios', () =>
    expect(hasAnaerobicCoverage(['ciprofloxacino'])).toBe(false));
});

// ── 4. Duración del tratamiento ───────────────────────────────────────────────
describe('Duración del tratamiento antibiótico según guías', () => {
  it('NAC leve 5 días → dentro de guía', () =>
    expect(isDurationOK('neumonia_comunitaria_leve', 5)).toBe(true));
  it('NAC leve 7 días → dentro de guía', () =>
    expect(isDurationOK('neumonia_comunitaria_leve', 7)).toBe(true));
  it('NAC leve 14 días → excede duración recomendada', () =>
    expect(isDurationOK('neumonia_comunitaria_leve', 14)).toBe(false));
  it('NAC leve 3 días → insuficiente', () =>
    expect(isDurationOK('neumonia_comunitaria_leve', 3)).toBe(false));
  it('ITU no complicada mujer 3 días → OK', () =>
    expect(isDurationOK('itu_no_complicada_mujer', 3)).toBe(true));
  it('ITU no complicada mujer 1 día → insuficiente', () =>
    expect(isDurationOK('itu_no_complicada_mujer', 1)).toBe(false));
  it('bacteriemia S.aureus 14 días → mínimo OK', () =>
    expect(isDurationOK('bacteriemia_s_aureus', 14)).toBe(true));
  it('bacteriemia S.aureus 7 días → insuficiente (riesgo recidiva)', () =>
    expect(isDurationOK('bacteriemia_s_aureus', 7)).toBe(false));
  it('meningitis bacteriana 7 días → OK mínimo', () =>
    expect(isDurationOK('meningitis_bacteriana', 7)).toBe(true));
  it('neumonía asociada a VM 8 días → OK (no prolongar innecesariamente)', () =>
    expect(isDurationOK('neumoniaAV', 8)).toBe(true));
  it('síndrome desconocido → null', () =>
    expect(isDurationOK('sindrome_inventado', 5)).toBeNull());
  it('intraabdominal complicada 4 días → OK (guías IDSA 2010)', () =>
    expect(isDurationOK('intraabdominal_complicada', 4)).toBe(true));
});

// ── 5. Primera línea por germen ───────────────────────────────────────────────
describe('Antibiótico de primera línea por germen', () => {
  it('S. pneumoniae → amoxicilina', () =>
    expect(getFirstLine('streptococcus_pneumoniae')).toBe('amoxicilina'));
  it('H. influenzae → amoxicilina-clavulanico', () =>
    expect(getFirstLine('haemophilus_influenzae')).toBe('amoxicilina-clavulanico'));
  it('E. coli ITU → fosfomicina', () =>
    expect(getFirstLine('e_coli_itu')).toBe('fosfomicina'));
  it('MSSA → cloxacilina (no vancomicina)', () =>
    expect(getFirstLine('staphylococcus_aureus_mssa')).toBe('cloxacilina'));
  it('S. pyogenes → amoxicilina', () =>
    expect(getFirstLine('streptococcus_pyogenes')).toBe('amoxicilina'));
  it('N. meningitidis → penicilina G o ceftriaxona', () =>
    expect(getFirstLine('neisseria_meningitidis')).toContain('ceftriaxona'));
  it('germen no listado → null', () =>
    expect(getFirstLine('germen_raro_x')).toBeNull());
});

// ── 6. Desescalada antibiótica ────────────────────────────────────────────────
describe('Desescalada antibiótica (stewardship)', () => {
  it('meropenem + antibiograma disponible → desescalada indicada', () =>
    expect(shouldDeescalate('meropenem', { sensible: 'amoxicilina' })).toBe(true));
  it('vancomicina + antibiograma → desescalada indicada', () =>
    expect(shouldDeescalate('vancomicina', { mssa: true })).toBe(true));
  it('amoxicilina (espectro reducido) → no es candidato a desescalada', () =>
    expect(shouldDeescalate('amoxicilina', { sensible: 'amoxicilina' })).toBe(false));
  it('piperacilina-tazobactam + cultivo → desescalada indicada', () =>
    expect(shouldDeescalate('piperacilina-tazobactam', { germen: 'e_coli' })).toBe(true));
  it('sin antibiograma (null) → no desescalar todavía', () =>
    expect(shouldDeescalate('meropenem', null)).toBe(false));
});

// ── 7. Seguridad del catéter vascular ────────────────────────────────────────
describe('Duración segura de catéter vascular (BRCV)', () => {
  it('catéter 7 días → dentro del umbral de seguridad', () =>
    expect(isLineDurationSafe(7)).toBe(true));
  it('catéter 14 días → en el límite', () =>
    expect(isLineDurationSafe(14)).toBe(true));
  it('catéter 15 días → excede límite → revisar/recambiar', () =>
    expect(isLineDurationSafe(15)).toBe(false));
  it('catéter 0 días → seguro', () =>
    expect(isLineDurationSafe(0)).toBe(true));
  it('string "7" → false (tipo incorrecto)', () =>
    expect(isLineDurationSafe('7')).toBe(false));
});
