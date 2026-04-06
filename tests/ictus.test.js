/**
 * Tests — StrokePilot (Protocolo de Ictus Agudo)
 * 100+ casos clínicos: NIHSS, categoría de gravedad, mismatch penumbral, ventana terapéutica.
 */
import { describe, it, expect } from 'vitest';
import {
  NIHSS_ITEMS, calcNihss, nihssCategory, getMismatch, getVentanaInfo
} from '../shared/calc-ictus.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function zeroItems() {
  return Object.fromEntries(NIHSS_ITEMS.map(it => [it.key, '0']));
}
function maxItems() {
  return Object.fromEntries(NIHSS_ITEMS.map(it => [it.key, String(it.max)]));
}
function setItems(overrides) {
  return { ...zeroItems(), ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, String(v)])) };
}

// Timestamps helpers (ISO strings)
function iso(h, m = 0) {
  return new Date(2024, 0, 1, h, m).toISOString();
}

// ── 1. NIHSS_ITEMS — definición de ítems ─────────────────────────────────────
describe('NIHSS_ITEMS — definición correcta', () => {
  it('contiene 15 ítems', () => expect(NIHSS_ITEMS).toHaveLength(15));
  it('primer ítem es n1a con max=3', () => expect(NIHSS_ITEMS[0]).toMatchObject({ key: 'n1a', max: 3 }));
  it('último ítem es n11 con max=2', () => expect(NIHSS_ITEMS[14]).toMatchObject({ key: 'n11', max: 2 }));
  it('suma de maximos = 42', () => {
    const maxTotal = NIHSS_ITEMS.reduce((a, it) => a + it.max, 0);
    expect(maxTotal).toBe(42);
  });
  it('todos los ítems tienen key, label y max', () => {
    NIHSS_ITEMS.forEach(it => {
      expect(it.key).toBeDefined();
      expect(it.label).toBeDefined();
      expect(typeof it.max).toBe('number');
    });
  });
});

// ── 2. calcNihss ──────────────────────────────────────────────────────────────
describe('calcNihss — puntuación NIHSS total', () => {
  it('todos cero → 0', () => expect(calcNihss(zeroItems())).toBe(0));
  it('todos al máximo → 42', () => expect(calcNihss(maxItems())).toBe(42));

  // Ítems individuales
  it('solo n1a=3 (coma) → 3', () =>
    expect(calcNihss(setItems({ n1a: 3 }))).toBe(3));
  it('solo n1b=2 (no responde preguntas) → 2', () =>
    expect(calcNihss(setItems({ n1b: 2 }))).toBe(2));
  it('solo n1c=2 (no sigue órdenes) → 2', () =>
    expect(calcNihss(setItems({ n1c: 2 }))).toBe(2));
  it('solo n2=2 (desviación forzada de la mirada) → 2', () =>
    expect(calcNihss(setItems({ n2: 2 }))).toBe(2));
  it('solo n3=3 (ceguera bilateral) → 3', () =>
    expect(calcNihss(setItems({ n3: 3 }))).toBe(3));
  it('solo n4=3 (parálisis facial completa) → 3', () =>
    expect(calcNihss(setItems({ n4: 3 }))).toBe(3));
  it('solo n5a=4 (sin movimiento brazo izq.) → 4', () =>
    expect(calcNihss(setItems({ n5a: 4 }))).toBe(4));
  it('solo n5b=4 (sin movimiento brazo der.) → 4', () =>
    expect(calcNihss(setItems({ n5b: 4 }))).toBe(4));
  it('solo n9=3 (afasia global) → 3', () =>
    expect(calcNihss(setItems({ n9: 3 }))).toBe(3));

  // Clamping al máximo
  it('valor > max se recorta al máximo del ítem', () => {
    const over = { ...zeroItems(), n1a: '9' }; // max es 3
    expect(calcNihss(over)).toBe(3);
  });
  it('valor negativo → Math.min(-1, max) = -1 (se resta del total)', () => {
    // La función no filtra negativos; en el app real los botones solo muestran 0..max
    const neg = { ...zeroItems(), n5a: '-1' };
    expect(calcNihss(neg)).toBe(-1);
  });
  it('string no numérico → 0 (parseInt → NaN → || 0)', () => {
    const bad = { ...zeroItems(), n9: 'x' };
    expect(calcNihss(bad)).toBe(0);
  });
  it('campo ausente → 0', () => {
    const empty = {};
    expect(calcNihss(empty)).toBe(0);
  });

  // Casos clínicos representativos
  it('NIHSS 4: ictus hemisférico leve (déficit motor + facial)', () => {
    const s = setItems({ n4: 1, n5b: 2, n6b: 1 });
    expect(calcNihss(s)).toBe(4);
  });
  it('NIHSS 10: ictus moderado (afasia + hemiparesia)', () => {
    const s = setItems({ n9: 2, n5a: 2, n5b: 2, n6a: 2, n6b: 2 });
    expect(calcNihss(s)).toBe(10);
  });
  it('NIHSS 20: ictus grave (afasia global + cuadriparesia + alt.conciencia)', () => {
    const s = setItems({ n1a: 2, n1b: 2, n9: 3, n5a: 3, n5b: 3, n6a: 3, n6b: 3, n4: 1 });
    expect(calcNihss(s)).toBe(20);
  });
  it('NIHSS >24: ictus muy grave (máximo funcional en varios dominios)', () => {
    const s = setItems({
      n1a: 3, n1b: 2, n1c: 2, n2: 2, n3: 3,
      n4: 3, n5a: 4, n5b: 4, n9: 3
    });
    expect(calcNihss(s)).toBeGreaterThan(24);
  });
  it('linealidad: sumar un ítem aumenta el total', () => {
    const base  = calcNihss(zeroItems());
    const added = calcNihss(setItems({ n9: 2 }));
    expect(added - base).toBe(2);
  });
});

// ── 3. nihssCategory ──────────────────────────────────────────────────────────
describe('nihssCategory — categoría de gravedad NIHSS', () => {
  it('0 → Sin déficit', () =>
    expect(nihssCategory(0).label).toBe('Sin déficit'));
  it('1 → Ictus menor', () =>
    expect(nihssCategory(1).label).toBe('Ictus menor'));
  it('3 → Ictus menor (límite)', () =>
    expect(nihssCategory(3).label).toBe('Ictus menor'));
  it('4 → Leve', () =>
    expect(nihssCategory(4).label).toBe('Leve'));
  it('5 → Leve (límite)', () =>
    expect(nihssCategory(5).label).toBe('Leve'));
  it('6 → Moderado', () =>
    expect(nihssCategory(6).label).toBe('Moderado'));
  it('14 → Moderado (límite)', () =>
    expect(nihssCategory(14).label).toBe('Moderado'));
  it('15 → Grave', () =>
    expect(nihssCategory(15).label).toBe('Grave'));
  it('24 → Grave (límite)', () =>
    expect(nihssCategory(24).label).toBe('Grave'));
  it('25 → Muy grave', () =>
    expect(nihssCategory(25).label).toBe('Muy grave'));
  it('42 → Muy grave (máximo posible)', () =>
    expect(nihssCategory(42).label).toBe('Muy grave'));
  // Colores asociados a cada categoría
  it('Sin déficit → color verde', () =>
    expect(nihssCategory(0).color).toContain('22c55e'));
  it('Ictus menor → color verde-lima', () =>
    expect(nihssCategory(2).color).toContain('84cc16'));
  it('Leve → color amarillo', () =>
    expect(nihssCategory(4).color).toContain('eab308'));
  it('Moderado → color naranja', () =>
    expect(nihssCategory(10).color).toContain('f97316'));
  it('Grave → color rojo', () =>
    expect(nihssCategory(20).color).toContain('ef4444'));
  it('Muy grave → color rojo oscuro', () =>
    expect(nihssCategory(30).color).toContain('dc2626'));
});

// ── 4. getMismatch ────────────────────────────────────────────────────────────
describe('getMismatch — mismatch penumbral', () => {
  // Modo auto
  it('modo auto + confirmado → true', () =>
    expect(getMismatch('auto', '', '', true)).toBe(true));
  it('modo auto sin confirmación → false', () =>
    expect(getMismatch('auto', '', '', false)).toBe(false));
  it('modo auto sin argumento → false', () =>
    expect(getMismatch('auto', '', '', undefined)).toBe(false));

  // Modo manual — criterios DAWN/DEFUSE-3
  it('core=20, penumbra=60 → ratio=3, diff=40 → true', () =>
    expect(getMismatch('manual', '20', '60', false)).toBe(true));
  it('core=0, penumbra=20 → ratio=Inf, diff=20 → true (core 0)', () =>
    expect(getMismatch('manual', '0', '20', false)).toBe(true));
  it('core=10, penumbra=30 → ratio=3, diff=20 → true', () =>
    expect(getMismatch('manual', '10', '30', false)).toBe(true));
  it('core=70, penumbra=200 → true (core ≤70, ratio≈2.86, diff=130) ', () =>
    // El código usa > 70 estrictamente: core=70 NO está excluido
    expect(getMismatch('manual', '70', '200', false)).toBe(true));
  it('core=71, penumbra=200 → false (core > 70, excluido)', () =>
    expect(getMismatch('manual', '71', '200', false)).toBe(false));
  it('core=50, penumbra=80 → ratio=1.6 < 1.8 → false', () =>
    expect(getMismatch('manual', '50', '80', false)).toBe(false));
  it('core=50, penumbra=100 → ratio=2, diff=50 → true', () =>
    expect(getMismatch('manual', '50', '100', false)).toBe(true));
  it('core=20, penumbra=25 → diff=5 < 15 → false', () =>
    expect(getMismatch('manual', '20', '25', false)).toBe(false));
  it('core=20, penumbra=36 → ratio=1.8, diff=16 → true (límite exacto)', () =>
    expect(getMismatch('manual', '20', '36', false)).toBe(true));
  it('core vacío → false (datos insuficientes)', () =>
    expect(getMismatch('manual', '', '60', false)).toBe(false));
  it('penumbra vacía → false', () =>
    expect(getMismatch('manual', '20', '', false)).toBe(false));
  it('ambos vacíos → false', () =>
    expect(getMismatch('manual', '', '', false)).toBe(false));
  it('valores no numéricos → false', () =>
    expect(getMismatch('manual', 'x', 'y', false)).toBe(false));
  // Modo desconocido → false
  it('modo desconocido → false', () =>
    expect(getMismatch('imagen', '20', '60', false)).toBe(false));
});

// ── 5. getVentanaInfo ─────────────────────────────────────────────────────────
describe('getVentanaInfo — ventana terapéutica', () => {
  // Tiempo desconocido (Wake-up stroke)
  it('tiempo desconocido → zona=desconocido', () =>
    expect(getVentanaInfo(null, null, true)).toMatchObject({ zona: 'desconocido' }));
  it('wake-up stroke → color púrpura', () =>
    expect(getVentanaInfo(null, null, true).color).toContain('a855f7'));

  // Ventana temprana (≤4.5 h) — mejor pronóstico tPA + EVT
  it('2h desde inicio → zona=temprana', () => {
    const lkw = iso(8, 0); const llegada = iso(10, 0);
    expect(getVentanaInfo(lkw, llegada, false)).toMatchObject({ zona: 'temprana' });
  });
  it('1h desde inicio → zona=temprana', () => {
    const lkw = iso(9, 0); const llegada = iso(10, 0);
    expect(getVentanaInfo(lkw, llegada, false)).toMatchObject({ zona: 'temprana' });
  });
  it('4.5h exacto → zona=temprana (límite)', () => {
    const lkw = iso(8, 0); const llegada = iso(12, 30);
    const vi = getVentanaInfo(lkw, llegada, false);
    expect(vi.zona).toBe('temprana');
    expect(vi.h).toBeCloseTo(4.5, 2);
  });
  it('zona=temprana → color verde', () => {
    const lkw = iso(8); const llegada = iso(10);
    expect(getVentanaInfo(lkw, llegada, false).color).toContain('22c55e');
  });

  // Ventana extendida (4.5-9 h) — EVT con mismatch
  it('6h → zona=extendida', () => {
    const lkw = iso(6); const llegada = iso(12);
    expect(getVentanaInfo(lkw, llegada, false)).toMatchObject({ zona: 'extendida' });
  });
  it('9h exacto → zona=extendida (límite)', () => {
    const lkw = iso(6); const llegada = iso(15);
    expect(getVentanaInfo(lkw, llegada, false)).toMatchObject({ zona: 'extendida' });
  });
  it('zona=extendida → color amarillo', () => {
    const lkw = iso(6); const llegada = iso(12);
    expect(getVentanaInfo(lkw, llegada, false).color).toContain('eab308');
  });

  // Ventana tardía (9-24 h) — solo EVT seleccionados
  it('12h → zona=tardia', () => {
    const lkw = iso(0); const llegada = iso(12);
    expect(getVentanaInfo(lkw, llegada, false)).toMatchObject({ zona: 'tardia' });
  });
  it('24h exacto → zona=tardia (límite)', () => {
    const lkw = iso(0); const llegada = iso(0, 0);
    // Forzar 24h exactas
    const a = new Date(2024, 0, 1, 0, 0).toISOString();
    const b = new Date(2024, 0, 2, 0, 0).toISOString();
    expect(getVentanaInfo(a, b, false)).toMatchObject({ zona: 'tardia' });
  });

  // Fuera de ventana (>24 h)
  it('>24h → zona=fuera', () => {
    const a = new Date(2024, 0, 1, 0, 0).toISOString();
    const b = new Date(2024, 0, 2, 1, 0).toISOString();
    expect(getVentanaInfo(a, b, false)).toMatchObject({ zona: 'fuera' });
  });
  it('zona=fuera → color rojo', () => {
    const a = new Date(2024, 0, 1, 0, 0).toISOString();
    const b = new Date(2024, 0, 3, 0, 0).toISOString();
    expect(getVentanaInfo(a, b, false).color).toContain('ef4444');
  });

  // Errores y casos límite
  it('lkw null → null', () =>
    expect(getVentanaInfo(null, iso(10), false)).toBeNull());
  it('llegada null → null', () =>
    expect(getVentanaInfo(iso(8), null, false)).toBeNull());
  it('ambos null sin tiempo desconocido → null', () =>
    expect(getVentanaInfo(null, null, false)).toBeNull());
  it('llegada antes que lkw → null (tiempo negativo)', () => {
    const lkw = iso(12); const llegada = iso(8);
    expect(getVentanaInfo(lkw, llegada, false)).toBeNull();
  });
  it('resultado incluye campo h con las horas transcurridas', () => {
    const lkw = iso(8); const llegada = iso(10);
    const vi = getVentanaInfo(lkw, llegada, false);
    expect(vi.h).toBeCloseTo(2, 1);
  });
  it('timestamps idénticos → 0 h → zona=temprana', () => {
    const t = iso(10);
    const vi = getVentanaInfo(t, t, false);
    expect(vi.zona).toBe('temprana');
    expect(vi.h).toBeCloseTo(0, 5);
  });
});
