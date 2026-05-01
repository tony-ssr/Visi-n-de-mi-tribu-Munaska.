/**
 * api.js
 * Funciones CRUD para interactuar con la tabla `vision_munaska` en Supabase.
 * Normaliza nombres de columnas para compatibilidad con mayúsculas/minúsculas.
 */

const TABLE = 'vision_munaska';

// ─── Helper: Normalizar registro desde Supabase ─────────────────────────────
// Maneja el caso donde "Estado" viene con E mayúscula desde la DB
function normalizeRecord(r) {
  if (!r) return r;
  return {
    id:              r.id,
    miembro_dca:     r.miembro_dca     || r.Miembro_dca     || r.MIEMBRO_DCA     || '',
    tribu_destino:   r.tribu_destino   || r.Tribu_destino   || r.TRIBU_DESTINO   || 0,
    nombre_enrolado: r.nombre_enrolado || r.Nombre_enrolado || r.NOMBRE_ENROLADO || '',
    // La columna puede llamarse "estado" o "Estado"
    estado:          r.estado          || r.Estado          || r.ESTADO          || '',
  };
}

// ─── READ: Obtener todos los registros ──────────────────────────────────────
async function getAllEnrolados() {
  const db = getSupabaseClient();
  if (!db) return { data: null, error: 'No hay conexión a Supabase' };

  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.error('❌ getAllEnrolados error:', error);
    return { data: null, error };
  }

  return { data: (data || []).map(normalizeRecord), error: null };
}

// ─── READ + FILTROS: Obtener con filtros opcionales ─────────────────────────
async function getEnroladosFiltrados({ search = '', tribu = '', estado = '' } = {}) {
  const db = getSupabaseClient();
  if (!db) return { data: null, error: 'No hay conexión a Supabase' };

  let query = db.from(TABLE).select('*').order('id', { ascending: false });
  if (tribu) query = query.eq('tribu_destino', parseInt(tribu));

  const { data, error } = await query;
  if (error) {
    console.error('❌ getEnroladosFiltrados error:', error);
    return { data: null, error };
  }

  let filtrado = (data || []).map(normalizeRecord);

  if (estado) {
    filtrado = filtrado.filter((r) => r.estado === estado);
  }
  if (search.trim()) {
    const term = search.trim().toLowerCase();
    filtrado = filtrado.filter(
      (r) =>
        (r.nombre_enrolado || '').toLowerCase().includes(term) ||
        (r.miembro_dca || '').toLowerCase().includes(term)
    );
  }

  return { data: filtrado, error: null };
}

// ─── CREATE: Crear un nuevo registro ────────────────────────────────────────
async function crearEnrolado({ miembro_dca, tribu_destino, nombre_enrolado, estado }) {
  const db = getSupabaseClient();
  if (!db) return { data: null, error: 'No hay conexión a Supabase' };

  const { data, error } = await db
    .from(TABLE)
    .insert([{ miembro_dca, tribu_destino: parseInt(tribu_destino), nombre_enrolado, estado }])
    .select();

  if (error) console.error('❌ crearEnrolado error:', error);
  return { data: data ? data.map(normalizeRecord) : null, error };
}

// ─── UPDATE: Actualizar un registro existente ────────────────────────────────
async function actualizarEnrolado(id, { miembro_dca, tribu_destino, nombre_enrolado, estado }) {
  const db = getSupabaseClient();
  if (!db) return { data: null, error: 'No hay conexión a Supabase' };

  const { data, error } = await db
    .from(TABLE)
    .update({ miembro_dca, tribu_destino: parseInt(tribu_destino), nombre_enrolado, estado })
    .eq('id', id)
    .select();

  if (error) console.error('❌ actualizarEnrolado error:', error);
  return { data: data ? data.map(normalizeRecord) : null, error };
}

// ─── DELETE: Eliminar un registro ───────────────────────────────────────────
async function eliminarEnrolado(id) {
  const db = getSupabaseClient();
  if (!db) return { error: 'No hay conexión a Supabase' };

  const { error } = await db.from(TABLE).delete().eq('id', id);
  if (error) console.error('❌ eliminarEnrolado error:', error);
  return { error };
}

// ─── STATS: Obtener conteo total ─────────────────────────────────────────────
async function getStats() {
  const db = getSupabaseClient();
  if (!db) return { total: 0, suma: 0, pendiente: 0, error: 'No hay conexión a Supabase' };

  // Usamos select('*') para detectar el nombre real de la columna
  const { data, error } = await db.from(TABLE).select('*');
  if (error) {
    console.error('❌ getStats error:', error);
    return { total: 0, suma: 0, pendiente: 0, error };
  }

  if (!data || data.length === 0) {
    return { total: 0, suma: 0, pendiente: 0, error: null };
  }

  // Log para diagnóstico: muestra las claves reales del primer registro
  console.log('🔑 Columnas reales en DB:', Object.keys(data[0]));

  const normalized = data.map(normalizeRecord);
  const total = normalized.length;
  const suma = normalized.filter((r) => r.estado && r.estado.toLowerCase().includes('suma')).length;
  const pendiente = normalized.filter((r) => r.estado && r.estado.toLowerCase().includes('pendiente')).length;

  return { total, suma, pendiente, error: null };
}

// ─── OPCIONES: Obtener valores únicos de tribu y estado ──────────────────────
async function getOpciones() {
  const db = getSupabaseClient();
  if (!db) return { tribus: [], estados: [] };

  const { data } = await db.from(TABLE).select('*');
  if (!data || data.length === 0) return { tribus: [], estados: [] };

  const normalized = data.map(normalizeRecord);
  const tribus = [...new Set(normalized.map((r) => r.tribu_destino).filter(Boolean))].sort((a, b) => a - b);
  const estados = [...new Set(normalized.map((r) => r.estado).filter(Boolean))].sort();

  return { tribus, estados };
}
