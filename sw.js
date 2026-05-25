// ============================================================
// Service Worker — ระบบจัดซื้องานก่อสร้าง
// กลยุทธ์: Cache-first สำหรับ static assets
//           Network-first สำหรับ Supabase API
// ============================================================

const CACHE_NAME = 'jadsuea-v1';

// ไฟล์ที่ต้องการ cache (app shell)
const PRECACHE_ASSETS = [
  '/',
  '/styles.css',
  '/config.js',
  '/supabase-client.js',
  '/db.js',
  '/store.jsx',
  '/auth-ui.jsx',
  '/ui.jsx',
  '/forms.jsx',
  '/labor.jsx',
  '/views.jsx',
  '/app.jsx',
  '/icon.svg',
  '/icon-maskable.svg',
  '/manifest.json',
];

// ── Install: pre-cache app shell ────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).catch((err) => {
      // ไม่หยุด install ถ้า pre-cache บางไฟล์ล้มเหลว
      console.warn('[SW] Pre-cache partial failure:', err);
    })
  );
  self.skipWaiting();
});

// ── Activate: ลบ cache เก่า ─────────────────────────────────
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

// ── Fetch: cache-first strategy ────────────────────────────
self.addEventListener('fetch', (event) => {
  // เฉพาะ GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ข้าม Supabase API — ต้องใช้ network เสมอ
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.io')) {
    return; // ใช้ browser default (network)
  }

  // ข้าม chrome-extension URLs
  if (url.protocol === 'chrome-extension:') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // คืน cache ทันที + อัปเดต cache ใน background (stale-while-revalidate)
        const networkUpdate = fetch(event.request)
          .then((res) => {
            if (res && res.status === 200 && res.type !== 'opaque') {
              caches.open(CACHE_NAME).then((c) => c.put(event.request, res.clone()));
            }
            return res;
          })
          .catch(() => {/* ignore network error when we have cache */});
        // eslint-disable-next-line no-unused-expressions
        networkUpdate;
        return cached;
      }

      // ไม่มี cache — ไปดึงจาก network แล้วเก็บ
      return fetch(event.request)
        .then((res) => {
          if (res && res.status === 200 && res.type !== 'opaque') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => {
          // Offline fallback: คืน index.html สำหรับ navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});
