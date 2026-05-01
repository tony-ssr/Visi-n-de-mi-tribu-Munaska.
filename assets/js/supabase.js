/**
 * supabase.js
 * Configuración e inicialización del cliente Supabase.
 * ⚠️ Rellena SUPABASE_URL y SUPABASE_ANON_KEY con tus credenciales.
 */

// ─── Tus credenciales de Supabase ──────────────────────────────────────────
const SUPABASE_URL = 'https://ynzpwaohhdtmapdkxnsz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluenB3YW9oaGR0bWFwZGt4bnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1ODg5NjYsImV4cCI6MjA5MzE2NDk2Nn0.B3n57aMCKmYry0u2oxH74esGXLYl_VaDX5hK85ydNYg';  // Ej: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
// ───────────────────────────────────────────────────────────────────────────

let supabaseClient = null;

function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(
      '⚠️ Visión Munaska: Falta configurar SUPABASE_URL y SUPABASE_ANON_KEY en assets/js/supabase.js'
    );
    return null;
  }

  try {
    const { createClient } = supabase;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase conectado correctamente.');
    return supabaseClient;
  } catch (err) {
    console.error('❌ Error al inicializar Supabase:', err);
    return null;
  }
}

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = initSupabase();
  }
  return supabaseClient;
}
