// ============================================================
// supabase-client.js — สร้าง Supabase client
// โหลดหลัง config.js และ supabase CDN script
// ============================================================
(function () {
  const url = window.SUPABASE_URL || '';
  const key = window.SUPABASE_ANON_KEY || '';

  if (!url || url.includes('YOUR_PROJECT') || !key || key.includes('YOUR_ANON')) {
    console.warn('[Supabase] config.js ยังไม่ได้กรอก credentials — ทำงานในโหมด offline (ใช้ข้อมูลตัวอย่าง)');
    window.supabaseClient = null;
    return;
  }

  try {
    const { createClient } = window.supabase;
    window.supabaseClient = createClient(url, key, {
      auth: {
        // Persist + auto-refresh tokens across page reloads
        persistSession: true,
        autoRefreshToken: true,
        // Read session from URL hash after OAuth/magic-link redirects
        detectSessionInUrl: true,
        // Store under a stable, app-specific key
        storageKey: 'forhouse-procurement-auth',
        // Use localStorage (default) — survives tab close/reopen
      },
      // Reasonable network timeouts so stuck requests don't freeze the UI
      global: {
        headers: { 'X-Client-Info': 'forhouse-procurement-web' },
      },
    });
    console.log('[Supabase] เชื่อมต่อสำเร็จ ✓');
  } catch (e) {
    console.error('[Supabase] สร้าง client ไม่สำเร็จ:', e);
    window.supabaseClient = null;
  }
})();
