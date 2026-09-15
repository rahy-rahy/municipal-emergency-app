(async function () {
      var ctx = await App.buildTopbar('/app');
      var cfg = ctx.cfg, user = ctx.user;
      var verified = user && user.status === 'verified';
      var center = { lat: cfg.town.lat, lng: cfg.town.lng };

      var tabs = [
        { id: 'report', key: 'nav.report' },
        { id: 'map', key: 'nav.map' },
        { id: 'feed', key: 'nav.feed' },
        { id: 'reports', key: 'nav.myreports' },
        { id: 'settings', key: 'nav.settings' }
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

      var mapInited = false, reportMap = null, reportMarker = null, coords = null, currentType = null;

      function openPane(id) {
        tabs.forEach(function (t) { document.getElementById('pane-' + t.id).classList.toggle('hidden', t.id !== id); });
        Array.prototype.forEach.call(tabbar.children, function (b) { b.classList.toggle('active', b.dataset.pane === id); });
        if (id === 'map') initMap();
        if (id === 'feed') loadFeed();
        if (id === 'reports') loadMyReports();
        location.hash = id;
      }

      if (!verified) {
        document.getElementById('locked-note').innerHTML =
          '<div class="notice warn">' + App.escapeHtml(I18N.t('report.locked')) + '</div>';
      }

      var types = ['fire', 'robbery', 'flood', 'electricity', 'medical', 'other'];
      var grid = document.getElementById('incident-grid');
      types.forEach(function (t) {
        var b = document.createElement('button');
        b.className = 'incident-btn';
        b.dataset.type = t;
        b.disabled = !verified;
        b.innerHTML =
          '<span class="swatch"></span>' +
          '<span class="name" data-i18n="type.' + t + '">' + App.escapeHtml(I18N.t('type.' + t)) + '</span>' +
          '<span class="desc" data-i18n="type.' + t + '.desc">' + App.escapeHtml(I18N.t('type.' + t + '.desc')) + '</span>';
        b.addEventListener('click', function () { openReportForm(t); });
        grid.appendChild(b);
      });

      var help = document.getElementById('btn-help');
      var safe = document.getElementById('btn-safe');
      help.disabled = !verified;
      safe.disabled = !verified;
      help.addEventListener('click', function () { quickReport(true, false); });
      safe.addEventListener('click', function () { quickReport(false, true); });

      function setMsg(text, kind) {
        document.getElementById('msg').innerHTML = text ? '<div class="notice ' + (kind || 'info') + '">' + App.escapeHtml(text) + '</div>' : '';
        if (text) setTimeout(function () { document.getElementById('msg').innerHTML = ''; }, 4000);
      }

      function getLocation() {
        return new Promise(function (resolve) {
          if (!navigator.geolocation) { resolve(null); return; }
          navigator.geolocation.getCurrentPosition(
            function (p) { resolve({ lat: p.coords.latitude, lng: p.coords.longitude }); },
            function () { resolve(null); },
            { enableHighAccuracy: true, timeout: 6000 }
          );
        });
      }

      async function openReportForm(type) {
        currentType = type;
        var form = document.getElementById('report-form');
        form.classList.remove('hidden');
        var tag = document.getElementById('rf-type');
        tag.className = 'type-tag type-' + type;
        tag.textContent = I18N.t('type.' + type);
        document.getElementById('rf-note').value = '';
        document.getElementById('rf-photo').value = '';
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });

        var loc = await getLocation();
        coords = loc || { lat: center.lat, lng: center.lng };
        document.getElementById('rf-loc-note').textContent = loc
          ? 'Location captured. Drag the marker to correct it.'
          : 'Could not read your location. Drag the marker to set the spot.';

        if (typeof L !== 'undefined' && navigator.onLine) {
          var box = document.getElementById('rf-map');
          box.classList.remove('hidden');
          if (!reportMap) {
            reportMap = L.map('rf-map').setView([coords.lat, coords.lng], 15);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
              maxZoom: 19, attribution: 'Map: Carto, OpenStreetMap contributors'
            }).addTo(reportMap);
            reportMarker = L.marker([coords.lat, coords.lng], { draggable: true }).addTo(reportMap);
            reportMarker.on('dragend', function () {
              var ll = reportMarker.getLatLng();
              coords = { lat: ll.lat, lng: ll.lng };
            });
          } else {
            reportMap.setView([coords.lat, coords.lng], 15);
            reportMarker.setLatLng([coords.lat, coords.lng]);
          }
          setTimeout(function () { reportMap.invalidateSize(); }, 100);
        }
      }

      document.getElementById('rf-cancel').addEventListener('click', function () {
        document.getElementById('report-form').classList.add('hidden');
        currentType = null;
      });

      document.getElementById('rf-send').addEventListener('click', async function () {
        if (!currentType) return;
        var fd = new FormData();
        fd.append('type', currentType);
        fd.append('description', document.getElementById('rf-note').value);
        if (coords) { fd.append('lat', coords.lat); fd.append('lng', coords.lng); }
        var photo = document.getElementById('rf-photo').files[0];
        if (photo) fd.append('photo', photo);
        await sendReport(fd);
        document.getElementById('report-form').classList.add('hidden');
        currentType = null;
      });

      async function quickReport(needHelp, isSafe) {
        var loc = await getLocation();
        var c = loc || { lat: center.lat, lng: center.lng };
        var fd = new FormData();
        fd.append('type', 'other');
        fd.append('needHelp', needHelp ? 'true' : 'false');
        fd.append('isSafe', isSafe ? 'true' : 'false');
        fd.append('lat', c.lat);
        fd.append('lng', c.lng);
        await sendReport(fd);
      }

      function queueReport(obj) {
        var q = JSON.parse(localStorage.getItem('reportQueue') || '[]');
        q.push(obj);
        localStorage.setItem('reportQueue', JSON.stringify(q));
      }
      async function flushQueue() {
        var q = JSON.parse(localStorage.getItem('reportQueue') || '[]');
        if (!q.length) return;
        var remaining = [];
        for (var i = 0; i < q.length; i++) {
          try {
            var fd = new FormData();
            Object.keys(q[i]).forEach(function (k) { fd.append(k, q[i][k]); });
            await App.api('POST', '/api/reports', fd, true);
          } catch (e) { remaining.push(q[i]); }
        }
        localStorage.setItem('reportQueue', JSON.stringify(remaining));
        if (q.length && !remaining.length) App.toast('Queued reports were sent.', 'ok');
      }

      async function sendReport(fd) {
        try {
          await App.api('POST', '/api/reports', fd, true);
          setMsg(I18N.t('report.sent'), 'ok');
          if (!document.getElementById('pane-reports').classList.contains('hidden')) loadMyReports();
        } catch (e) {
          if (!navigator.onLine || (e.message || '').indexOf('Failed to fetch') !== -1) {
            var obj = {}; fd.forEach(function (v, k) { if (typeof v === 'string') obj[k] = v; });
            queueReport(obj);
            setMsg('No connection. Your report was saved and will send when you are back online.', 'warn');
          } else {
            setMsg(e.message, 'error');
          }
        }
      }

      window.addEventListener('online', flushQueue);
      flushQueue();

      var map = null;
      async function initMap() {
        if (mapInited) return;
        mapInited = true;
        var data;
        try { data = await App.api('GET', '/api/map'); } catch (e) { data = { reports: [], broadcasts: [] }; }
        if (typeof L === 'undefined' || !navigator.onLine) { renderMapFallback(data); return; }
        map = L.map('map').setView([center.lat, center.lng], 14);
        var tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
          maxZoom: 19, attribution: 'Map: Carto, OpenStreetMap contributors'
        });
        tiles.on('tileerror', function () {
          document.getElementById('map').style.display = 'none';
          renderMapFallback(data);
        });
        tiles.addTo(map);
        var colors = { fire: '#cf372c', robbery: '#245e9c', flood: '#2c8a4d', electricity: '#b8860b', medical: '#a63072', other: '#566571' };
        data.reports.forEach(function (i) {
          if (i.lat == null) return;
          L.circleMarker([i.lat, i.lng], { radius: 9, color: '#fff', weight: 2, fillColor: colors[i.type] || '#566571', fillOpacity: 0.9 })
            .addTo(map).bindPopup(I18N.t('type.' + i.type) + '<br>' + I18N.t('status.' + i.status));
        });
        data.broadcasts.forEach(function (b) {
          if (b.lat == null) return;
          L.circleMarker([b.lat, b.lng], { radius: 11, color: '#8c281f', weight: 3, fillColor: '#f0b7b0', fillOpacity: 0.9 })
            .addTo(map).bindPopup(App.escapeHtml(b.title));
        });
        setTimeout(function () { map.invalidateSize(); }, 120);
      }
      function renderMapFallback(data) {
        var el = document.getElementById('map-fallback');
        el.style.display = 'block';
        var rows = (data.reports || []).map(function (i) {
          return '<div class="list-item"><span class="type-tag type-' + i.type + '">' + I18N.t('type.' + i.type) +
            '</span> <span class="subtle">' + (i.lat != null ? i.lat.toFixed(4) + ', ' + i.lng.toFixed(4) : '') + ' | ' + I18N.t('status.' + i.status) + '</span></div>';
        }).join('');
        el.innerHTML = '<p>' + App.escapeHtml(I18N.t('map.needsinternet')) + '</p>' + (rows || ('<p class="subtle">' + I18N.t('common.none') + '</p>'));
      }

      async function loadFeed() {
        var el = document.getElementById('feed-list');
        el.innerHTML = '<p class="subtle">' + I18N.t('common.loading') + '</p>';
        var data = await App.api('GET', '/api/feed');
        if (!data.broadcasts.length) { el.innerHTML = '<p class="subtle">' + I18N.t('feed.none') + '</p>'; return; }
        el.innerHTML = data.broadcasts.map(function (b) {
          return '<div class="list-item"><div class="row-between">' +
            '<span class="chip sev-' + b.severity + '">' + I18N.t('sev.' + b.severity) + '</span>' +
            '<span class="subtle">' + App.fmtTime(b.createdAt) + '</span></div>' +
            '<div style="margin-top:6px"><strong>' + App.escapeHtml(b.title) + '</strong></div>' +
            '<div style="margin-top:4px">' + App.escapeHtml(b.message) + '</div></div>';
        }).join('');
      }

      async function loadMyReports() {
        var el = document.getElementById('myreports-list');
        el.innerHTML = '<p class="subtle">' + I18N.t('common.loading') + '</p>';
        var data = await App.api('GET', '/api/reports/mine');
        if (!data.reports.length) { el.innerHTML = '<p class="subtle">' + I18N.t('common.none') + '</p>'; return; }
        el.innerHTML = data.reports.map(function (r) {
          var flags = (r.needHelp ? ' <span class="chip sev-critical">' + I18N.t('report.needhelp') + '</span>' : '') +
                      (r.isSafe ? ' <span class="chip">' + I18N.t('report.imsafe') + '</span>' : '');
          return '<div class="list-item"><div class="row-between">' +
            '<span class="type-tag type-' + r.type + '">' + I18N.t('type.' + r.type) + '</span>' +
            '<span class="chip"><span class="dot ' + r.status + '"></span>' + I18N.t('status.' + r.status) + '</span>' +
            '</div>' + (flags ? '<div style="margin-top:6px">' + flags + '</div>' : '') +
            (r.description ? '<div style="margin-top:6px">' + App.escapeHtml(r.description) + '</div>' : '') +
            '<div class="meta">' + App.fmtTime(r.createdAt) + '</div></div>';
        }).join('');
      }

      // Settings. Language and deaf mode are stored on the device.
      document.getElementById('set-lang').value = I18N.lang;
      document.getElementById('set-deaf').checked = localStorage.getItem('deafMode') === '1';
      var nums = cfg.emergencyNumbers;
      var contact = cfg.emergencyContact || { name: 'Emergency', number: '' };
      var callList = document.getElementById('call-list');
      callList.innerHTML =
        (contact.number ? callRow(contact.number, contact.name) : '') +
        callRow(nums.civilDefense, 'Civil Defense') +
        callRow(nums.redCross, 'Red Cross') +
        callRow(nums.police, 'Police');
      function callRow(num, label) {
        return '<a href="tel:' + App.escapeHtml(num) + '"><span class="num">' + App.escapeHtml(num) + '</span><span class="lbl">' + App.escapeHtml(label) + '</span></a>';
      }
      document.getElementById('set-save').addEventListener('click', function () {
        I18N.setLang(document.getElementById('set-lang').value);
        localStorage.setItem('deafMode', document.getElementById('set-deaf').checked ? '1' : '0');
        App.toast(I18N.t('settings.saved'), 'ok');
      });

      // Raise the loud full screen alert on a new critical broadcast.
      App.watchCriticalAlerts();

      var initial = (location.hash || '').replace('#', '');
      openPane(tabs.some(function (t) { return t.id === initial; }) ? initial : 'report');

      document.addEventListener('langchange', function () {
        document.getElementById('set-lang').value = I18N.lang;
        var active = document.querySelector('.tab.active');
        if (active && active.dataset.pane !== 'report' && active.dataset.pane !== 'settings') {
          openPane(active.dataset.pane);
        }
      });
    })();
