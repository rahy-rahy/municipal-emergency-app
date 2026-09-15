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
    return { cfg: cfg, user: user };
  }

  // Full screen critical alert. Doubles as the deaf and hard of hearing
  // visual alert: large text plus strong vibration, no reliance on sound.
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
      });
    }
    ov.querySelector('.ca-msg').textContent = message;
    ov.classList.add('show');
    if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 400]);
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
    registerServiceWorker: registerServiceWorker
  };

  registerServiceWorker();
})();
