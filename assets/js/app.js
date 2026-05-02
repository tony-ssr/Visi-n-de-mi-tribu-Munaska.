/**
 * app.js
 * Lógica principal: manejo de pestañas, rendering de componentes y orquestación.
 */

// ════════════════════════════════════════════════
//  CONSTANTES
// ════════════════════════════════════════════════
const META = 93;

// ════════════════════════════════════════════════
//  UTILIDADES UI
// ════════════════════════════════════════════════

function showSpinner() {
  document.getElementById('spinner').classList.add('visible');
}

function hideSpinner() {
  document.getElementById('spinner').classList.remove('visible');
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', info: '🍯' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type]}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3400);
}

function getStatusClass(estado = '') {
  const s = estado.toLowerCase();
  if (s.includes('suma') || s.includes('vision')) return 'status-suma';
  if (s.includes('pendiente')) return 'status-pendiente';
  return 'status-otro';
}

function getStatusIcon(estado = '') {
  const s = estado.toLowerCase();
  if (s.includes('suma') || s.includes('vision')) return '✅';
  if (s.includes('pendiente')) return '⏳';
  return '📌';
}

function animateNumber(el, from, to, duration = 1200) {
  const start = performance.now();
  function update(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 4);
    el.textContent = Math.round(from + (to - from) * ease);
    if (t < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ════════════════════════════════════════════════
//  SISTEMA DE TABS
// ════════════════════════════════════════════════

function initTabs() {
  const btns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      btns.forEach((b) => b.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${target}`).classList.add('active');
      if (target === 'vision') loadDashboard();
      if (target === 'consultas') loadDirectory();
      if (target === 'gestion') loadAdmin();
    });
  });
}

// ════════════════════════════════════════════════
//  TAB 1 — DASHBOARD
// ════════════════════════════════════════════════

async function loadDashboard() {
  showSpinner();
  try {
    const { total, suma, pendiente, error } = await getStats();
    if (error) {
      const msg = (typeof error === 'object' && error.message) ? error.message : String(error);
      const isRLS = msg.toLowerCase().includes('row-level') || msg.toLowerCase().includes('policy') || msg.toLowerCase().includes('permission');
      const hint = isRLS
        ? ' — Verifica que RLS esté desactivado o que exista una política SELECT para anon en Supabase'
        : '';
      showToast('Error al cargar datos: ' + msg + hint, 'error');
      console.error('❌ Dashboard error:', error);
      return;
    }

    // Counter ring (conic-gradient)
    const pct = Math.min((total / META) * 100, 100);
    const deg = (pct / 100) * 360;
    const ring = document.querySelector('.counter-ring');
    if (ring) ring.style.setProperty('--progress-deg', `${deg}deg`);

    // Animated counter
    const numEl = document.getElementById('counter-number');
    if (numEl) animateNumber(numEl, 0, total);

    // Progress bar
    const bar = document.getElementById('progress-fill');
    if (bar) {
      setTimeout(() => { bar.style.width = `${pct.toFixed(1)}%`; }, 100);
    }
    const pctEl = document.getElementById('progress-pct');
    if (pctEl) pctEl.textContent = `${pct.toFixed(0)}%`;

    // Stats
    const elTotal = document.getElementById('stat-total');
    const elSuma = document.getElementById('stat-suma');
    const elPend = document.getElementById('stat-pendiente');
    const elMeta = document.getElementById('stat-meta');
    if (elTotal) animateNumber(elTotal, 0, total);
    if (elSuma) animateNumber(elSuma, 0, suma);
    if (elPend) animateNumber(elPend, 0, pendiente);
    if (elMeta) animateNumber(elMeta, 0, META - total < 0 ? 0 : META - total);

    // Honeycomb hexagons
    renderHoneycomb(total);
  } finally {
    hideSpinner();
  }
}

function renderHoneycomb(count) {
  const grid = document.getElementById('honeycomb-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < META; i++) {
    const hex = document.createElement('div');
    hex.className = `hex-cell ${i < count ? 'filled' : 'empty'}`;
    if (i < count) hex.title = `Vida #${i + 1}`;
    grid.appendChild(hex);
  }
}

// ════════════════════════════════════════════════
//  TAB 2 — DIRECTORIO
// ════════════════════════════════════════════════

let allData = [];
let filterState = { search: '', tribu: '', estado: '' };

async function loadDirectory() {
  showSpinner();
  try {
    // Cargar opciones para los selects
    const { tribus, estados } = await getOpciones();
    populateFilterSelects(tribus, estados);

    // Cargar todos los datos
    const { data, error } = await getAllEnrolados();
    if (error) {
      const msg = (typeof error === 'object' && error.message) ? error.message : String(error);
      showToast('Error al cargar directorio: ' + msg, 'error');
      console.error('❌ Directory error:', error);
      return;
    }
    allData = data || [];
    renderCards(allData);
  } finally {
    hideSpinner();
  }
}

function populateFilterSelects(tribus, estados) {
  const tribuSel = document.getElementById('filter-tribu');
  const estadoSel = document.getElementById('filter-estado');
  if (!tribuSel || !estadoSel) return;

  // Tribu
  tribuSel.innerHTML = '<option value="">Todas las Tribus</option>';
  tribus.forEach((t) => {
    tribuSel.innerHTML += `<option value="${t}">Tribu ${t}</option>`;
  });
  tribuSel.value = filterState.tribu;

  // Estado
  estadoSel.innerHTML = '<option value="">Todos los Estados</option>';
  estados.forEach((e) => {
    estadoSel.innerHTML += `<option value="${e}">${e}</option>`;
  });
  estadoSel.value = filterState.estado;
}

function applyFilters() {
  let filtered = [...allData];
  const { search, tribu, estado } = filterState;

  if (tribu) filtered = filtered.filter((r) => String(r.tribu_destino) === String(tribu));
  if (estado) filtered = filtered.filter((r) => r.estado === estado);
  if (search.trim()) {
    const term = search.trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
        (r.nombre_enrolado || '').toLowerCase().includes(term) ||
        (r.miembro_dca || '').toLowerCase().includes(term)
    );
  }
  renderCards(filtered);
}

function renderCards(data) {
  const grid = document.getElementById('cards-grid');
  const count = document.getElementById('results-count');
  if (!grid) return;

  if (count) {
    count.innerHTML = `Mostrando <span>${data.length}</span> resultado${data.length !== 1 ? 's' : ''}`;
  }

  if (!data || data.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🔍</div>
        <p>No se encontraron enrolados con los filtros aplicados.</p>
      </div>`;
    return;
  }

  grid.innerHTML = data.map((r, i) => `
    <div class="enrolado-card" style="animation-delay:${i * 0.04}s">
      <div class="card-avatar">🐝</div>
      <div class="card-name">${escapeHtml(r.nombre_enrolado || '—')}</div>
      <div class="card-meta">
        <div class="card-meta-item">
          <span>👤</span> <span><strong>DCA:</strong> ${escapeHtml(r.miembro_dca || '—')}</span>
        </div>
        <div class="card-meta-item">
          <span>🏠</span> <span><strong>Tribu:</strong> ${r.tribu_destino ?? '—'}</span>
        </div>
      </div>
      <span class="card-status ${getStatusClass(r.estado)}">
        ${getStatusIcon(r.estado)} ${escapeHtml(r.estado || '—')}
      </span>
    </div>
  `).join('');
}

function initDirectoryEvents() {
  const searchInput = document.getElementById('search-input');
  const filterTribu = document.getElementById('filter-tribu');
  const filterEstado = document.getElementById('filter-estado');
  const btnClear = document.getElementById('btn-clear-filters');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterState.search = e.target.value;
      applyFilters();
    });
  }
  if (filterTribu) {
    filterTribu.addEventListener('change', (e) => {
      filterState.tribu = e.target.value;
      applyFilters();
    });
  }
  if (filterEstado) {
    filterEstado.addEventListener('change', (e) => {
      filterState.estado = e.target.value;
      applyFilters();
    });
  }
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      filterState = { search: '', tribu: '', estado: '' };
      if (searchInput) searchInput.value = '';
      if (filterTribu) filterTribu.value = '';
      if (filterEstado) filterEstado.value = '';
      renderCards(allData);
    });
  }
}

// ════════════════════════════════════════════════
//  TAB 3 — ADMIN CRUD
// ════════════════════════════════════════════════

let deleteTargetId = null;
let editTargetId = null;
let allAdminData = [];
let adminFilterState = { search: '', tribu: '', estado: '' };

async function loadAdmin() {
  showSpinner();
  try {
    const { data, error } = await getAllEnrolados();
    if (error) {
      const msg = (typeof error === 'object' && error.message) ? error.message : String(error);
      showToast('Error al cargar tabla: ' + msg, 'error');
      console.error('❌ Admin error:', error);
      return;
    }
    allAdminData = data || [];
    populateAdminFilterSelects(allAdminData);
    applyAdminFilters();
  } finally {
    hideSpinner();
  }
}

function populateAdminFilterSelects(data) {
  const tribuSel = document.getElementById('admin-filter-tribu');
  const estadoSel = document.getElementById('admin-filter-estado');
  if (!tribuSel || !estadoSel) return;

  const tribus = [...new Set(data.map((r) => r.tribu_destino).filter(Boolean))].sort((a, b) => a - b);
  const estados = [...new Set(data.map((r) => r.estado).filter(Boolean))].sort();

  tribuSel.innerHTML = '<option value="">Todas las Tribus</option>';
  tribus.forEach((t) => { tribuSel.innerHTML += `<option value="${t}">Tribu ${t}</option>`; });
  tribuSel.value = adminFilterState.tribu;

  estadoSel.innerHTML = '<option value="">Todos los Estados</option>';
  estados.forEach((e) => { estadoSel.innerHTML += `<option value="${e}">${e}</option>`; });
  estadoSel.value = adminFilterState.estado;
}

function applyAdminFilters() {
  let filtered = [...allAdminData];
  const { search, tribu, estado } = adminFilterState;

  if (tribu) filtered = filtered.filter((r) => String(r.tribu_destino) === String(tribu));
  if (estado) filtered = filtered.filter((r) => r.estado === estado);
  if (search.trim()) {
    const term = search.trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
        (r.nombre_enrolado || '').toLowerCase().includes(term) ||
        (r.miembro_dca || '').toLowerCase().includes(term)
    );
  }
  renderAdminTable(filtered);
}

function initAdminFilters() {
  const searchInput = document.getElementById('admin-search-input');
  const filterTribu  = document.getElementById('admin-filter-tribu');
  const filterEstado = document.getElementById('admin-filter-estado');
  const btnClear     = document.getElementById('admin-btn-clear');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      adminFilterState.search = e.target.value;
      applyAdminFilters();
    });
  }
  if (filterTribu) {
    filterTribu.addEventListener('change', (e) => {
      adminFilterState.tribu = e.target.value;
      applyAdminFilters();
    });
  }
  if (filterEstado) {
    filterEstado.addEventListener('change', (e) => {
      adminFilterState.estado = e.target.value;
      applyAdminFilters();
    });
  }
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      adminFilterState = { search: '', tribu: '', estado: '' };
      if (searchInput) searchInput.value = '';
      if (filterTribu)  filterTribu.value  = '';
      if (filterEstado) filterEstado.value = '';
      applyAdminFilters();
    });
  }
}

function renderAdminTable(data) {
  const tbody = document.getElementById('admin-tbody');
  const countEl = document.getElementById('admin-results-count');
  if (!tbody) return;

  if (countEl) {
    countEl.innerHTML = `Mostrando <span>${data.length}</span> registro${data.length !== 1 ? 's' : ''}`;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2.5rem;color:var(--text-muted)">🔍 Sin resultados para los filtros aplicados.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((r) => `
    <tr>
      <td class="td-id">#${r.id}</td>
      <td>${escapeHtml(r.miembro_dca || '—')}</td>
      <td>${r.tribu_destino ?? '—'}</td>
      <td>${escapeHtml(r.nombre_enrolado || '—')}</td>
      <td><span class="card-status ${getStatusClass(r.estado)}">${escapeHtml(r.estado || '—')}</span></td>
      <td>
        <div class="td-actions">
          <button class="btn btn-edit" onclick="openEditModal(${r.id}, '${escapeJs(r.miembro_dca)}', ${r.tribu_destino}, '${escapeJs(r.nombre_enrolado)}', '${escapeJs(r.estado)}')">
            ✏️ Editar
          </button>
          <button class="btn btn-danger" onclick="confirmDelete(${r.id}, '${escapeJs(r.nombre_enrolado)}')">
            🗑️ Eliminar
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ─── CREATE FORM ─────────────────────────────────────────────────────────────

function initCreateForm() {
  const form = document.getElementById('create-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateCreateForm()) return;

    const payload = {
      miembro_dca: form.miembro_dca.value.trim(),
      tribu_destino: form.tribu_destino.value.trim(),
      nombre_enrolado: form.nombre_enrolado.value.trim(),
      estado: form.estado_nuevo.value,
    };

    showSpinner();
    const { error } = await crearEnrolado(payload);
    hideSpinner();

    if (error) {
      showToast('Error al crear el registro: ' + (error.message || error), 'error');
    } else {
      showToast('¡Enrolado creado exitosamente! 🐝', 'success');
      form.reset();
      clearFormErrors(form);
      loadAdmin();
    }
  });
}

function validateCreateForm() {
  const form = document.getElementById('create-form');
  clearFormErrors(form);
  let valid = true;

  const fields = [
    { name: 'miembro_dca', msg: 'Nombre del Miembro DCA requerido' },
    { name: 'tribu_destino', msg: 'Tribu Destino requerida' },
    { name: 'nombre_enrolado', msg: 'Nombre del Enrolado requerido' },
    { name: 'estado_nuevo', msg: 'Estado requerido' },
  ];

  fields.forEach(({ name, msg }) => {
    const el = form[name];
    if (!el || !el.value.trim()) {
      markFieldError(el, msg);
      valid = false;
    }
  });

  // Validar que tribu sea numérico
  const tribuEl = form.tribu_destino;
  if (tribuEl && tribuEl.value.trim() && isNaN(parseInt(tribuEl.value.trim()))) {
    markFieldError(tribuEl, 'Debe ser un número');
    valid = false;
  }

  return valid;
}

function markFieldError(el, msg) {
  if (!el) return;
  el.classList.add('invalid');
  const err = document.createElement('div');
  err.className = 'field-error';
  err.textContent = '⚠ ' + msg;
  el.parentNode.appendChild(err);
}

function clearFormErrors(form) {
  form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
  form.querySelectorAll('.field-error').forEach((el) => el.remove());
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

function confirmDelete(id, nombre) {
  deleteTargetId = id;
  const msg = document.getElementById('confirm-msg');
  if (msg) msg.textContent = `¿Seguro que quieres eliminar a "${nombre}"? Esta acción no se puede deshacer.`;
  document.getElementById('confirm-overlay').classList.add('visible');
}

function initDeleteConfirm() {
  const overlay = document.getElementById('confirm-overlay');
  const btnCancel = document.getElementById('confirm-cancel');
  const btnOk = document.getElementById('confirm-ok');

  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      overlay.classList.remove('visible');
      deleteTargetId = null;
    });
  }

  if (btnOk) {
    btnOk.addEventListener('click', async () => {
      if (!deleteTargetId) return;
      overlay.classList.remove('visible');
      showSpinner();
      const { error } = await eliminarEnrolado(deleteTargetId);
      hideSpinner();

      if (error) {
        showToast('Error al eliminar: ' + (error.message || error), 'error');
      } else {
        showToast('Registro eliminado correctamente.', 'success');
        loadAdmin();
      }
      deleteTargetId = null;
    });
  }
}

// ─── EDIT MODAL ───────────────────────────────────────────────────────────────

function openEditModal(id, miembro_dca, tribu_destino, nombre_enrolado, estado) {
  editTargetId = id;
  const form = document.getElementById('edit-form');
  if (!form) return;

  form.edit_miembro_dca.value = miembro_dca;
  form.edit_tribu_destino.value = tribu_destino;
  form.edit_nombre_enrolado.value = nombre_enrolado;
  form.edit_estado.value = estado;
  clearFormErrors(form);

  document.getElementById('modal-overlay').classList.add('visible');
}

function initEditModal() {
  const overlay = document.getElementById('modal-overlay');
  const closeBtn = document.getElementById('modal-close');
  const cancelBtn = document.getElementById('edit-cancel');
  const form = document.getElementById('edit-form');

  const close = () => {
    overlay.classList.remove('visible');
    editTargetId = null;
  };

  if (closeBtn) closeBtn.addEventListener('click', close);
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  overlay?.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFormErrors(form);

      const payload = {
        miembro_dca: form.edit_miembro_dca.value.trim(),
        tribu_destino: form.edit_tribu_destino.value.trim(),
        nombre_enrolado: form.edit_nombre_enrolado.value.trim(),
        estado: form.edit_estado.value,
      };

      // Validación básica
      let valid = true;
      Object.entries(payload).forEach(([k, v]) => {
        if (!v) {
          const el = form[`edit_${k}`] || form[`edit_${k.replace('_', '_')}`];
          markFieldError(el, 'Campo requerido');
          valid = false;
        }
      });
      if (!valid) return;

      showSpinner();
      const { error } = await actualizarEnrolado(editTargetId, payload);
      hideSpinner();

      if (error) {
        showToast('Error al actualizar: ' + (error.message || error), 'error');
      } else {
        showToast('Registro actualizado exitosamente 🐝', 'success');
        close();
        loadAdmin();
      }
    });
  }
}

// ════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJs(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ════════════════════════════════════════════════
//  BEES FLOATING PARTICLES
// ════════════════════════════════════════════════

// ════════════════════════════════════════════════
//  EXPORT EXCEL
// ════════════════════════════════════════════════

async function downloadExcel() {
  showSpinner();
  try {
    const { data, error } = await getAllEnrolados();
    if (error) {
      showToast('Error al obtener datos para exportar', 'error');
      return;
    }

    if (!data || data.length === 0) {
      showToast('No hay datos para exportar', 'info');
      return;
    }

    // Preparar los datos para el Excel
    const rows = data.map(r => ({
      'ID': r.id,
      'Miembro DCA': r.miembro_dca,
      'Tribu Destino': r.tribu_destino,
      'Nombre Enrolado': r.nombre_enrolado,
      'Estado': r.estado
    }));

    // Crear libro y hoja
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Enrolados");

    // Estética de las columnas
    const wscols = [
      { wch: 6 },  // ID
      { wch: 30 }, // Miembro DCA
      { wch: 15 }, // Tribu Destino
      { wch: 35 }, // Nombre Enrolado
      { wch: 25 }  // Estado
    ];
    worksheet['!cols'] = wscols;

    // Generar archivo y descargar
    const fileName = `Vision_Munaska_Reporte_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    showToast('¡Excel generado exitosamente! 📥', 'success');
  } catch (err) {
    console.error('❌ Error al exportar Excel:', err);
    showToast('Error crítico al generar el Excel', 'error');
  } finally {
    hideSpinner();
  }
}

function initBeeParticles() {
  const container = document.querySelector('.floating-bees');
  if (!container) return;
  const count = 6;
  for (let i = 0; i < count; i++) {
    const bee = document.createElement('div');
    bee.className = 'bee-particle';
    bee.textContent = '🐝';
    bee.style.cssText = `
      left: ${10 + Math.random() * 80}%;
      top: ${10 + Math.random() * 80}%;
      animation-duration: ${4 + Math.random() * 4}s;
      animation-delay: ${-Math.random() * 5}s;
      font-size: ${0.8 + Math.random() * 0.8}rem;
      opacity: ${0.3 + Math.random() * 0.3};
    `;
    container.appendChild(bee);
  }
}

// ════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar Supabase
  initSupabase();

  // Tabs
  initTabs();

  // Cargar Dashboard (activo por defecto)
  loadDashboard();

  // Eventos de directorio
  initDirectoryEvents();

  // Formulario de creación
  initCreateForm();

  // Modal de edición
  initEditModal();

  // Confirmación de eliminación
  initDeleteConfirm();

  // Filtros de la tabla admin
  initAdminFilters();

  // Bees
  initBeeParticles();
});
