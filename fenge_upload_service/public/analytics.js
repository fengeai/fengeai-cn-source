(function () {
  try {
    var key = 'fenge_visitor_id';
    var visitorId = localStorage.getItem(key);
    if (!visitorId) {
      visitorId = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(key, visitorId);
    }

    var payload = JSON.stringify({
      visitorId: visitorId,
      path: location.pathname + location.search,
      title: document.title || '',
      referrer: document.referrer || ''
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
      return;
    }

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true
    }).catch(function () {});
  } catch (error) {}
})();
