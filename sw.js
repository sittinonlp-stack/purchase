// ============================================================
// Service Worker — ระบบจัดซื้องานก่อสร้าง
// กลยุทธ์: Network-first สำหรับไฟล์แอป (jsx/js/css/html)
//           Cache-first สำหรับ CDN (React, Babel, SheetJS)
//           Network-only สำหรับ Supabase API
// ============================================================

const CACHE_NAME = 'jadsuea-v5';
const NET_TIMEOUT = 4000; // ms — ถ้า network ช้าเกินนี้ ใช้ cache แทน (กันค้าง)

// ไฟล์ CDN ที่เปลี่ยนแปลงไม่บ่อย — ใช้ cache-first เพื่อความเร็ว
const CDN_HOSTS = [
  'unpkg.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ── Install: pre-cache ไฟล์แอป ────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/styles.css',
        '/config.js',
        '/supabase-client.js',
        '/db.js',
        '/dist/store.js',
        '/dist/auth-ui.js',
        '/dist/ui.js',
        '/dist/forms.js',
        '/dist/labor.js',
        '/dist/receipt.js',
        '/dist/views.js',
        '/dist/app.js',
        '/icon.svg',
        '/icon-maskable.svg',
        '/manifest.json',
      ]);
    }).catch((err) => {
      console.warn('[SW] Pre-cache partial failure:', err);
    })
  );
  self.skipWaiting();
});

// ── Activate: ลบ cache เก่าทั้งหมด ────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ข้าม Supabase API — network เสมอ
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.io')) return;

  // ข้าม chrome-extension
  if (url.protocol === 'chrome-extension:') return;

  const isCDN = CDN_HOSTS.some((h) => url.hostname.includes(h));

  if (isCDN) {
    // ── Cache-first สำหรับ CDN ────────────────────────────
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res && res.status === 200 && res.type !== 'opaque') {
            caches.open(CACHE_NAME).then((c) => c.put(event.request, res.clone()));
          }
          return res;
        });
      })
    );
  } else {
    // ── Network-first + timeout สำหรับไฟล์แอป (jsx/js/css/html) ───
    // ดึงจาก network ก่อน → เห็นการเปลี่ยนแปลงทันทีเมื่อ refresh
    // แต่ถ้า network ช้าเกิน NET_TIMEOUT หรือ offline → ใช้ cache ทันที (กันค้าง)
    event.respondWith(networkFirstWithTimeout(event.request));
  }
});

// ดึงจาก network ก่อน แต่ถ้าเกิน timeout/ล้มเหลว → ตกไปใช้ cache (กันหน้าค้าง)
function networkFirstWithTimeout(request) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (res) => { if (!settled) { settled = true; resolve(res); } };

    // ตัวจับเวลา: ถ้า network ยังไม่ตอบใน NET_TIMEOUT และมี cache → ใช้ cache
    const timer = setTimeout(() => {
      caches.match(request).then((cached) => { if (cached) done(cached); });
    }, NET_TIMEOUT);

    fetch(request)
      .then((res) => {
        clearTimeout(timer);
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        done(res);
      })
      .catch(() => {
        clearTimeout(timer);
        caches.match(request).then((cached) => {
          if (cached) return done(cached);
          if (request.mode === 'navigate') return caches.match('/').then(done);
          done(new Response('Offline', { status: 503 }));
        });
      });
  });
}
