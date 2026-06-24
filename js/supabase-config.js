const SUPABASE_URL = 'https://dnvuizausfcjzkcsynql.supabase.co';
const SUPABASE_KEY = 'sb_publishable_LtrytF9wyS3u-KgSZk7heg_SZc7hhoY';
window.dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true
  }
});
