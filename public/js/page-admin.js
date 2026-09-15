(async function () {
      var ctx = await App.buildTopbar('/admin');
      var cfg = ctx.cfg, me = ctx.user;
      var center = { lat: cfg.town.lat, lng: cfg.town.lng };

      var tabs = [
        { id: 'broadcast', key: 'nav.broadcast' },
        { id: 'accounts', key: 'nav.accounts' },
        { id: 'audit', key: 'nav.audit' }
      ];
      var tabbar = document.getElementById('tabbar');
      tabs.forEach(function (t) {
        var b = document.createElement('button');
        b.className = 'tab';
        b.dataset.pane = t.id;
        b.setAttribute('data-i18n', t.key);
        b.textContent = I18N.t(t.key);
        b.addEventListener('click', function () { openPane(t.id); });
        tabbar.appendChild(b);
      });

      var bcMap = null, bcMarker = null, pin = null, bcInited = false;
      function openPane(id) {
        tabs.forEach(function (t) { document.getElementById('pane-' + t.id).classList.toggle('hidden', t.id !== id); });
        Array.prototype.forEach.call(tabbar.children, function (b) { b.classList.toggle('active', b.dataset.pane === id); });
        if (id === 'broadcast') initBroadcastMap();
        if (id === 'accounts') loadAccounts();
        if (id === 'audit') loadAudit();
        location.hash = id;
      }

      function setMsg(text, kind) {
        document.getElementById('msg').innerHTML = text ? '<div class="notice ' + (kind || 'info') + '">' + App.escapeHtml(text) + '</div>' : '';
        if (text) setTimeout(function () { document.getElementById('msg').innerHTML = ''; }, 4000);
      }

      // Severity toggles the radius field.
      var sev = document.getElementById('bc-severity');
      function syncSeverity() {
        document.getElementById('bc-distance-field').style.display = sev.value === 'standard' ? 'none' : 'block';
      }
      sev.addEventListener('change', syncSeverity);
      syncSeverity();

      function initBroadcastMap() {
        if (bcInited || typeof L === 'undefined') return;
        bcInited = true;
        bcMap = L.map('bc-map').setView([center.lat, center.lng], 14);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19, attribution: 'Map: Carto, OpenStreetMap contributors'
        }).addTo(bcMap);
        bcMap.on('click', function (e) {
          pin = { lat: e.latlng.lat, lng: e.latlng.lng };
          if (!bcMarker) bcMarker = L.marker([pin.lat, pin.lng]).addTo(bcMap);
          else bcMarker.setLatLng([pin.lat, pin.lng]);
          document.getElementById('bc-pin-text').textContent = pin.lat.toFixed(4) + ', ' + pin.lng.toFixed(4);
        });
        setTimeout(function () { bcMap.invalidateSize(); }, 120);
      }
      document.getElementById('bc-clear-pin').addEventListener('click', function () {
        pin = null;
        if (bcMarker) { bcMap.removeLayer(bcMarker); bcMarker = null; }
        document.getElementById('bc-pin-text').textContent = '';
      });

      document.getElementById('bc-send').addEventListener('click', async function () {
        var body = {
          title: document.getElementById('bc-title').value,
          message: document.getElementById('bc-message').value,
          severity: sev.value
        };
        if (pin) { body.lat = pin.lat; body.lng = pin.lng; }
        if (sev.value !== 'standard') body.radiusKm = parseFloat(document.getElementById('bc-distance').value) || undefined;
        try {
          await App.api('POST', '/api/admin/broadcasts', body);
          setMsg(I18N.t('broadcast.sent'), 'ok');
          document.getElementById('bc-title').value = '';
          document.getElementById('bc-message').value = '';
        } catch (e) { setMsg(e.message, 'error'); }
      });

      async function loadAccounts() {
        if (cfg.demoMode) document.getElementById('demo-reset-card').hidden = false;
        var el = document.getElementById('accounts-list');
        el.innerHTML = '<p class="subtle">' + I18N.t('common.loading') + '</p>';
        var data = await App.api('GET', '/api/admin/users');
        el.innerHTML = '';
        data.users.forEach(function (u) {
          var item = document.createElement('div');
          item.className = 'list-item';
          var isSelf = u.id === me.id;
          item.innerHTML =
            '<div class="row-between"><div>' +
              '<strong>' + App.escapeHtml(u.fullName) + '</strong>' + (u.isDemo ? ' <span class="demo-flag">demo</span>' : '') +
              (u.isBlocked ? ' <span class="chip sev-critical">blocked</span>' : '') +
              '<div class="meta">' + App.escapeHtml(u.email) + ' | ' + App.escapeHtml(u.phone || '') + '</div>' +
              '<div class="meta">status: ' + App.escapeHtml(u.status) + ' | email ' + (u.emailVerified ? 'confirmed' : 'not confirmed') + '</div>' +
            '</div><span class="role-badge">' + I18N.t('role.' + u.role) + '</span></div>' +
            '<div class="btn-row" style="margin-top:10px">' +
              '<label class="subtle" style="align-self:center">' + I18N.t('accounts.role') + ':</label>' +
              '<select data-role="' + u.id + '" style="width:auto"' + (isSelf ? ' disabled' : '') + '>' +
                ['resident', 'support', 'admin'].map(function (r) {
                  return '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + I18N.t('role.' + r) + '</option>';
                }).join('') +
              '</select>' +
              (isSelf ? '<span class="subtle" style="align-self:center">this is you</span>' :
                '<button class="btn small" data-setrole="' + u.id + '">' + I18N.t('common.save') + '</button>' +
                (u.isBlocked
                  ? '<button class="btn small secondary" data-unblock="' + u.id + '">Unblock</button>'
                  : '<button class="btn small danger" data-block="' + u.id + '">Block</button>')) +
            '</div>';
          el.appendChild(item);
        });
        el.querySelectorAll('[data-block]').forEach(function (b) {
          b.addEventListener('click', async function () {
            if (!confirm('Block this account? They will not be able to sign in or report.')) return;
            try { await App.api('POST', '/api/admin/users/' + b.dataset.block + '/block', { blocked: true }); setMsg('Account blocked.', 'ok'); loadAccounts(); }
            catch (e) { setMsg(e.message, 'error'); }
          });
        });
        el.querySelectorAll('[data-unblock]').forEach(function (b) {
          b.addEventListener('click', async function () {
            try { await App.api('POST', '/api/admin/users/' + b.dataset.unblock + '/block', { blocked: false }); setMsg('Account unblocked.', 'ok'); loadAccounts(); }
            catch (e) { setMsg(e.message, 'error'); }
          });
        });
        el.querySelectorAll('[data-setrole]').forEach(function (b) {
          b.addEventListener('click', async function () {
            var id = b.dataset.setrole;
            var sel = el.querySelector('[data-role="' + id + '"]');
            try { await App.api('POST', '/api/admin/users/' + id + '/role', { role: sel.value }); setMsg('Role updated.', 'ok'); loadAccounts(); }
            catch (e) { setMsg(e.message, 'error'); }
          });
        });
      }

      document.getElementById('reset-demo').addEventListener('click', async function () {
        try { await App.api('POST', '/api/admin/demo/reset'); setMsg(I18N.t('demo.resetdone'), 'ok'); loadAccounts(); }
        catch (e) { setMsg(e.message, 'error'); }
      });

      async function loadAudit() {
        var el = document.getElementById('audit-list');
        el.innerHTML = '<p class="subtle">' + I18N.t('common.loading') + '</p>';
        var data = await App.api('GET', '/api/admin/audit');
        if (!data.entries.length) { el.innerHTML = '<p class="subtle">' + I18N.t('common.none') + '</p>'; return; }
        el.innerHTML = data.entries.map(function (a) {
          var detail = a.detail && Object.keys(a.detail).length ? JSON.stringify(a.detail) : '';
          return '<div class="list-item"><div class="row-between">' +
            '<strong>' + App.escapeHtml(a.action) + '</strong>' +
            '<span class="subtle">' + App.fmtTime(a.created_at) + '</span></div>' +
            '<div class="meta">' + App.escapeHtml(a.actor_name || 'system') + (a.ip ? ' | ' + App.escapeHtml(a.ip) : '') + '</div>' +
            (detail ? '<div class="meta">' + App.escapeHtml(detail) + '</div>' : '') +
          '</div>';
        }).join('');
      }

      var initial = (location.hash || '').replace('#', '');
      openPane(tabs.some(function (t) { return t.id === initial; }) ? initial : 'broadcast');
      document.addEventListener('langchange', function () {
        var active = document.querySelector('.tab.active');
        if (active) openPane(active.dataset.pane);
      });
    })();
