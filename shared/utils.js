/**
 * Utilidades compartidas — AppClinics
 * Incluir en cada módulo con:
 *   <script src="/appclinicas/shared/utils.js"></script>
 */

/**
 * Escapa caracteres HTML especiales para prevenir XSS.
 * @param {*} s - Valor a escapar
 * @returns {string}
 */
function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Genera un icono SVG (estilo Lucide) como string HTML.
 * @param {string} name - Nombre del icono
 * @param {number} [size=16] - Tamaño en px
 * @param {string} [cls=''] - Clases CSS adicionales
 * @returns {string} Elemento SVG como string
 */
function svgIcon(name, size = 16, cls = '') {
  const s = size, c = cls ? ` class="${cls}"` : '';
  const base = `width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"`;
  const icons = {
    'alert-triangle': `<svg${c} ${base}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    'check-circle':   `<svg${c} ${base}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    'info':           `<svg${c} ${base}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    'alert-circle':   `<svg${c} ${base}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    'x-circle':       `<svg${c} ${base}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  };
  return icons[name] || icons['info'];
}

/**
 * Muestra un mensaje de error visible al usuario en un div de error.
 * Si el div no existe, crea un alert() como fallback.
 * @param {string} containerId - ID del div de error
 * @param {string|string[]} messages - Mensaje(s) de error
 * @param {string[]} [errorFieldIds=[]] - IDs de campos a marcar en rojo
 */
function showError(containerId, messages, errorFieldIds = []) {
  const msgs = Array.isArray(messages) ? messages : [messages];
  const fe = document.getElementById(containerId);
  errorFieldIds.forEach(id => document.getElementById(id)?.classList.add('error'));
  if (fe) {
    fe.innerHTML = svgIcon('alert-triangle', 14, 'inline-block') + ' ' + msgs.map(escHtml).join(' · ');
    fe.classList.add('visible');
  } else {
    alert(msgs.join('\n'));
  }
}

/**
 * Limpia los mensajes de error y las marcas de error en campos.
 * @param {string} containerId - ID del div de error
 * @param {string[]} [fieldIds=[]] - IDs de campos a limpiar
 */
function clearErrors(containerId, fieldIds = []) {
  const fe = document.getElementById(containerId);
  if (fe) { fe.innerHTML = ''; fe.classList.remove('visible'); }
  fieldIds.forEach(id => document.getElementById(id)?.classList.remove('error'));
}

/**
 * Inicializa el modal de disclaimer con persistencia en localStorage/sessionStorage.
 * @param {string} storageKey - Clave de almacenamiento (única por módulo)
 * @param {string} overlayId  - ID del overlay (por defecto 'disc_overlay')
 */
function initDisclaimer(storageKey, overlayId = 'disc_overlay') {
  const ov = document.getElementById(overlayId);
  if (!ov) return;
  let accepted = false;
  try { accepted = localStorage.getItem(storageKey) === '1'; } catch (e) {
    try { accepted = sessionStorage.getItem(storageKey) === '1'; } catch (e2) { /* sin storage */ }
  }
  if (accepted) { ov.classList.add('disc-hidden'); return; }
  ov.classList.remove('disc-hidden');
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', function guard(e) {
    if (!ov.classList.contains('disc-hidden')) {
      if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); e.stopImmediatePropagation(); }
    } else {
      document.removeEventListener('keydown', guard, true);
    }
  }, true);
  ov.addEventListener('click', function (e) {
    if (e.target === ov) {
      const modal = document.getElementById('disc_modal');
      if (modal) { modal.style.animation = 'none'; modal.offsetHeight; modal.style.animation = 'discShake .35s ease'; }
    }
  });
}

/**
 * Acepta el disclaimer y lo persiste en localStorage.
 * @param {string} storageKey - Clave de almacenamiento
 * @param {string} overlayId  - ID del overlay
 */
function acceptDisclaimer(storageKey, overlayId = 'disc_overlay') {
  try { localStorage.setItem(storageKey, '1'); } catch (e) {
    try { sessionStorage.setItem(storageKey, '1'); } catch (e2) { /* sin storage */ }
  }
  const ov = document.getElementById(overlayId);
  if (ov) {
    ov.style.transition = 'opacity .4s';
    ov.style.opacity = '0';
    setTimeout(() => ov.classList.add('disc-hidden'), 420);
  }
  document.body.style.overflow = '';
}
