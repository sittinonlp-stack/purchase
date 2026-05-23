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
    window.supabaseClient = createClient(url, key);
    console.log('[Supabase] เชื่อมต่อสำเร็จ ✓');
  } catch (e) {
    console.error('[Supabase] สร้าง client ไม่สำเร็จ:', e);
    window.supabaseClient = null;
  }
})();
