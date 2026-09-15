/* Shared front end helpers used by every page. */
(function () {
  var cfgCache = null;
  var csrfToken = null;

  async function getConfig() {
    if (cfgCache) return cfgCache;
    var res = await fetch('/api/config');
    cfgCache = await res.json();
    csrfToken = cfgCache.csrfToken || null;
    return cfgCache;
  }

  async function api(method, path, body, isForm) {
    var opts = { method: method, headers: {} };
    var m = String(method).toUpperCase();
    if (m !== 'GET' && m !== 'HEAD') {
      if (!csrfToken) await getConfig();
      opts.headers['x-csrf-token'] = csrfToken || '';
    }
    if (body !== undefined && body !== null) {
      if (isForm) {
        opts.body = body;
      } else {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
    }
    var res = await fetch(path, opts);
    var data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) {
      var msg = (data && data.error) || ('Request failed (' + res.status + ')');
      var err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function getMe() {
    var r = await api('GET', '/api/me');
    return r.user;
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var diff = Math.round((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return diff + ' min ago';
    if (diff < 1440) return Math.round(diff / 60) + ' h ago';
    return d.toLocaleString();
  }

  function toast(msg, kind) {
    var wrap = document.getElementById('toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(function () { el.remove(); }, 4200);
  }

  async function logout() {
    try { await api('POST', '/api/logout'); } catch (e) {}
    window.location.href = '/';
  }

  // Build the top bar. Roles: resident, support, admin.
  async function buildTopbar(active) {
    var cfg = await getConfig();
    var user = await getMe();
    var el = document.getElementById('topbar');
    if (!el) return { cfg: cfg, user: user };

    var roleLabel = user ? I18N.t('role.' + user.role) : '';
    var links = [];
    if (user) {
      links.push({ href: '/app', key: 'nav.report' });
      if (user.role === 'support' || user.role === 'admin') links.push({ href: '/staff', key: 'nav.staff' });
      if (user.role === 'admin') links.push({ href: '/admin', key: 'nav.admin' });
    }

    var navHtml = links.map(function (l) {
      var on = l.href === active ? ';font-weight:700;text-decoration:underline' : '';
      return '<a href="' + l.href + '" style="color:#fff' + on + '">' + I18N.t(l.key) + '</a>';
    }).join(' <span style="opacity:.4">|</span> ');

    el.innerHTML =
      '<div class="inner">' +
        '<span class="brand">' +
          '<img class="mark" src="/favicon.svg" alt="">' +
          '<span>' + escapeHtml(cfg.town.name) + '</span>' +
        '</span>' +
        (navHtml ? '<span style="margin-inline-start:8px;font-size:.92rem">' + navHtml + '</span>' : '') +
        '<span class="spacer"></span>' +
        (user
          ? '<span class="who">' + escapeHtml(user.fullName) + '<span class="role-badge">' + roleLabel + '</span></span>'
          : '') +
        '<select id="lang-select" aria-label="Language">' +
          '<option value="en">English</option>' +
          '<option value="fr">Français</option>' +
          '<option value="ar">العربية</option>' +
        '</select>' +
        (user ? '<button class="btn small secondary" id="logout-btn" data-i18n="nav.logout"></button>' : '') +
      '</div>';

    var sel = document.getElementById('lang-select');
    sel.value = I18N.lang;
    sel.addEventListener('change', function () { I18N.setLang(sel.value); });

    var lo = document.getElementById('logout-btn');
    if (lo) lo.addEventListener('click', logout);

    I18N.apply(el);
    if (user) { try { initPush(); } catch (e) {} }
    return { cfg: cfg, user: user };
  }

  // Full screen critical alert. Doubles as the deaf and hard of hearing
  // visual alert. The siren loops and the screen stays red until dismissed.
  var caAudio = null, caVibrate = null;
  function stopCriticalAlarm() {
    if (caAudio) { try { caAudio.pause(); caAudio.currentTime = 0; } catch (e) {} caAudio = null; }
    if (caVibrate) { clearInterval(caVibrate); caVibrate = null; }
    if (navigator.vibrate) { try { navigator.vibrate(0); } catch (e) {} }
  }
  function criticalAlert(message) {
    var ov = document.getElementById('critical-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'critical-overlay';
      ov.innerHTML =
        '<div class="ca-title">' + I18N.t('sev.critical') + '</div>' +
        '<div class="ca-msg"></div>' +
        '<button class="btn" id="ca-dismiss">OK</button>';
      document.body.appendChild(ov);
      ov.querySelector('#ca-dismiss').addEventListener('click', function () {
        ov.classList.remove('show');
        stopCriticalAlarm();
      });
    }
    ov.querySelector('.ca-msg').textContent = message;
    ov.classList.add('show');

    stopCriticalAlarm();
    try {
      caAudio = new Audio('/sounds/critical.wav');
      caAudio.loop = true;
      caAudio.volume = 1.0;
      var pl = caAudio.play();
      if (pl && pl.catch) pl.catch(function () {});
    } catch (e) {}
    if (navigator.vibrate) {
      var buzz = function () { try { navigator.vibrate([600, 200, 600, 200, 600]); } catch (e) {} };
      buzz();
      caVibrate = setInterval(buzz, 2200);
    }
    // Stop the sound after two minutes even if left open, keep the visual.
    setTimeout(function () { stopCriticalAlarm(); }, 120000);
  }

  // Watches for a new critical broadcast and raises the alert once.
  var lastAlertId = null;
  function watchCriticalAlerts() {
    async function tick() {
      try {
        var r = await api('GET', '/api/alerts/latest');
        if (r.alert && r.alert.id !== lastAlertId) {
          if (lastAlertId !== null) criticalAlert(r.alert.title + '. ' + r.alert.message);
          lastAlertId = r.alert.id;
        }
      } catch (e) {}
    }
    tick();
    setInterval(tick, 20000);
  }

  // Register the service worker so the app installs on Android.
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    }
  }

  // Full screen image viewer for ID documents and report photos.
  function showImage(url, caption) {
    var ov = document.getElementById('img-viewer');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'img-viewer';
      ov.innerHTML =
        '<div class="iv-msg"></div>' +
        '<img alt="">' +
        '<div class="iv-bar">' +
          '<a class="btn small secondary" id="iv-open" target="_blank">Open in new tab</a>' +
          '<button class="btn small" id="iv-close">Close</button>' +
        '</div>';
      document.body.appendChild(ov);
      ov.addEventListener('click', function (e) {
        if (e.target === ov || e.target.id === 'iv-close') ov.classList.remove('show');
      });
    }
    ov.querySelector('.iv-msg').textContent = caption || '';
    ov.querySelector('img').src = url;
    ov.querySelector('#iv-open').href = url;
    ov.classList.add('show');
  }

  // Set up push notifications, but only when running inside the installed
  // Android app. In a plain browser this does nothing. Each incident type
  // gets its own channel so the phone can play a different sound.
  var pushStarted = false;
  function initPush() {
    if (pushStarted) return;
    if (!window.Capacitor || typeof Capacitor.isNativePlatform !== 'function' || !Capacitor.isNativePlatform()) return;
    var Push = Capacitor.Plugins && Capacitor.Plugins.PushNotifications;
    if (!Push) return;
    pushStarted = true;

    var channels = [
      { id: 'help', name: 'Help needed', sound: 'help', importance: 5 },
      { id: 'fire', name: 'Fire', sound: 'fire', importance: 5 },
      { id: 'medical', name: 'Medical', sound: 'medical', importance: 5 },
      { id: 'robbery', name: 'Robbery', sound: 'robbery', importance: 4 },
      { id: 'flood', name: 'Flood', sound: 'flood', importance: 4 },
      { id: 'electricity', name: 'Electricity', sound: 'electricity', importance: 4 },
      { id: 'other', name: 'Other incident', sound: 'other', importance: 3 },
      { id: 'broadcast', name: 'Town notice', sound: 'other', importance: 3 },
      { id: 'critical_alarm', name: 'Critical alarm', sound: 'critical', importance: 5 }
    ];
    channels.forEach(function (c) {
      try {
        Push.createChannel({
          id: c.id, name: c.name, description: c.name,
          sound: c.sound, importance: c.importance, visibility: 1, vibration: true
        });
      } catch (e) {}
    });

    Push.addListener('registration', function (t) {
      var token = t && t.value;
      if (token) { api('POST', '/api/push/register', { token: token, platform: 'android' }).catch(function () {}); }
    });
    Push.addListener('registrationError', function () {});
    // App open in the foreground: show the loud alert for urgent types.
    Push.addListener('pushNotificationReceived', function (n) {
      var d = (n && n.data) || {};
      if (d.kind === 'broadcast' && d.severity === 'critical') {
        criticalAlert((n.title || '') + '. ' + (n.body || ''));
      } else if (d.kind === 'incident') {
        toast((n.title || 'New incident') + ': ' + (n.body || ''), 'warn');
      }
    });
    // Tapped a notification: go to the right screen.
    Push.addListener('pushNotificationActionPerformed', function (a) {
      var d = (a && a.notification && a.notification.data) || {};
      if (d.kind === 'incident') window.location.href = '/staff#incidents';
      else if (d.kind === 'broadcast') window.location.href = '/app#feed';
    });

    Push.requestPermissions().then(function (p) {
      if (p && p.receive === 'granted') Push.register();
    }).catch(function () {});
  }

  window.App = {
    api: api,
    getConfig: getConfig,
    getMe: getMe,
    escapeHtml: escapeHtml,
    fmtTime: fmtTime,
    toast: toast,
    logout: logout,
    buildTopbar: buildTopbar,
    criticalAlert: criticalAlert,
    watchCriticalAlerts: watchCriticalAlerts,
    registerServiceWorker: registerServiceWorker,
    showImage: showImage,
    initPush: initPush
  };

  registerServiceWorker();
})();
