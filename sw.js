/* 하나님의 선물 영생(전도앱) 전용 — 오프라인(비행기 모드)용 서비스 워커
   ※ 이 파일은 bridge 저장소 전용입니다. 다른 앱(찬송가 등)의 sw.js와 바꾸지 마세요.
   설치할 때 앱 화면을 '전도앱 보관함'에 미리 넣어 두고,
   인터넷이 있으면 늘 최신 화면을 받아 보관본도 새로 바꾸며,
   인터넷이 없으면 '전도앱 보관함'에서만 꺼내 씁니다(다른 앱 보관함은 보지 않음). */
const CACHE = 'bridge-offline-v3';
const BASE = new URL('./', self.location).href;               // .../bridge/
const CORE = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-180.png']
  .map(u => new URL(u, self.location).href);

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(CORE.map(u => fetch(u, { cache: 'reload' })
      .then(r => { if (r.ok) return c.put(u, r); }).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    // 전도앱이 예전에 쓰던 보관함, 그리고 잘못 들어갔던 찬송가 sw가 이 범위에서 만든 항목 정리
    await Promise.all(keys.filter(k => k.startsWith('bridge') && k !== CACHE).map(k => caches.delete(k)));
    try {
      const h = await caches.open('hymn-app-v1');
      const reqs = await h.keys();
      await Promise.all(reqs.filter(r => r.url.startsWith(BASE)).map(r => h.delete(r)));
    } catch (err) {}
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !req.url.startsWith(BASE)) return; // 전도앱 밖은 손대지 않음
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res && res.ok) {
        const key = req.mode === 'navigate' ? BASE : req;      // 화면은 언제나 같은 자리에 보관
        c.put(key, res.clone());
      }
      return res;
    } catch (err) {
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate' || req.destination === 'document') {
        const page = await c.match(BASE) || await c.match(BASE + 'index.html');
        if (page) return page;
      }
      throw err;
    }
  })());
});
