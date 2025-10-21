// Отключаем Service Worker
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          // Удаляем все кэши
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      // Отменяем регистрацию
      return self.registration.unregister();
    }).then(function() {
      // Перезагружаем страницу
      return self.clients.matchAll();
    }).then(function(clients) {
      clients.forEach(client => client.navigate(client.url));
    })
  );
});

