(async function () {
      var ctx = await App.buildTopbar('/staff');
      var cfg = ctx.cfg || {};
      var contact = cfg.emergencyContact || { number: '' };
      var waNumber = String(contact.number || '').replace(/\D/g, '').replace(/^0/, '961');

      var tabs = [
        { id: 'verify', key: 'nav.verify' },
        { id: 'incidents', key: 'nav.incidents' }
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

      function openPane(id) {
        tabs.forEach(function (t) { document.getElementById('pane-' + t.id).classList.toggle('hidden', t.id !== id); });
        Array.prototype.forEach.call(tabbar.children, function (b) { b.classList.toggle('active', b.dataset.pane === id); });
        if (id === 'verify') loadVerify();
        if (id === 'incidents') loadIncidents();
        location.hash = id;
      }

      function setMsg(text, kind) {
        document.getElementById('msg').innerHTML = text ? '<div class="notice ' + (kind || 'info') + '">' + App.escapeHtml(text) + '</div>' : '';
        if (text) setTimeout(function () { document.getElementById('msg').innerHTML = ''; }, 3500);
      }

      async function loadVerify() {
        var el = document.getElementById('verify-list');
        el.innerHTML = '<p class="subtle">' + I18N.t('common.loading') + '</p>';
        var data = await App.api('GET', '/api/staff/pending-users');
        if (!data.users.length) { el.innerHTML = '<p class="subtle">' + I18N.t('verify.none') + '</p>'; return; }
        el.innerHTML = '';
        for (var k = 0; k < data.users.length; k++) {
          var u = data.users[k];
          var docs = { users: [] };
          try { docs = await App.api('GET', '/api/staff/users/' + u.id + '/documents'); } catch (e) { docs = { documents: [] }; }
          var docLinks = (docs.documents || []).map(function (d) {
            return '<button class="btn small secondary" data-doc="/api/staff/documents/' + d.id + '/file" data-label="' + App.escapeHtml(d.kind.replace('id_', '').replace('_', ' ')) + '">' + I18N.t('verify.viewid') + ' (' + d.kind.replace('id_', '').replace('_', ' ') + ')</button>';
          }).join('');
          var elevated = u.suggestedRole && u.suggestedRole !== 'resident';
          var item = document.createElement('div');
          item.className = 'list-item';
          item.innerHTML =
            '<div class="row-between"><div>' +
              '<strong>' + App.escapeHtml(u.fullName) + '</strong>' +
              '<div class="meta">' + App.escapeHtml(u.email) + ' | ' + App.escapeHtml(u.phone || '') + '</div>' +
              '<div class="meta">' + I18N.t('verify.suggested') + ': ' + I18N.t('role.' + u.suggestedRole) +
                ' | email ' + (u.emailVerified ? 'confirmed' : 'not confirmed') + '</div>' +
            '</div><span class="subtle">' + App.fmtTime(u.createdAt) + '</span></div>' +
            (elevated ? '<div class="notice warn" style="margin-top:8px">' + I18N.t('verify.warnrole') + '</div>' : '') +
            '<div class="btn-row" style="margin-top:10px">' + docLinks +
              '<button class="btn small" data-approve="' + u.id + '">' + I18N.t('common.approve') + '</button>' +
              '<button class="btn small danger" data-reject="' + u.id + '">' + I18N.t('common.reject') + '</button>' +
            '</div>';
          el.appendChild(item);
        }
        el.querySelectorAll('[data-doc]').forEach(function (b) {
          b.addEventListener('click', function () {
            App.showImage(b.dataset.doc, 'ID document: ' + (b.dataset.label || ''));
          });
        });
        el.querySelectorAll('[data-approve]').forEach(function (b) {
          b.addEventListener('click', async function () {
            try { await App.api('POST', '/api/staff/users/' + b.dataset.approve + '/status', { status: 'verified' }); setMsg('Resident approved.', 'ok'); loadVerify(); }
            catch (e) { setMsg(e.message, 'error'); }
          });
        });
        el.querySelectorAll('[data-reject]').forEach(function (b) {
          b.addEventListener('click', async function () {
            try { await App.api('POST', '/api/staff/users/' + b.dataset.reject + '/status', { status: 'rejected' }); setMsg('Signup rejected.', 'ok'); loadVerify(); }
            catch (e) { setMsg(e.message, 'error'); }
          });
        });
      }

      async function loadIncidents() {
        var el = document.getElementById('incidents-list');
        el.innerHTML = '<p class="subtle">' + I18N.t('common.loading') + '</p>';
        var data = await App.api('GET', '/api/staff/incidents');
        if (!data.incidents.length) { el.innerHTML = '<p class="subtle">' + I18N.t('incidents.none') + '</p>'; return; }
        el.innerHTML = '';
        var byId = {};
        data.incidents.forEach(function (r) { byId[r.id] = r; });
        data.incidents.forEach(function (r) {
          var item = document.createElement('div');
          item.className = 'list-item';
          var flags = (r.needHelp ? ' <span class="chip sev-critical">' + I18N.t('report.needhelp') + '</span>' : '') +
                      (r.isSafe ? ' <span class="chip">' + I18N.t('report.imsafe') + '</span>' : '');
          var photo = r.hasPhoto ? ' <button class="btn small secondary" data-photo="/api/reports/' + r.id + '/photo">' + I18N.t('report.photo') + '</button>' : '';
          var loc = r.lat != null
            ? r.lat.toFixed(4) + ', ' + r.lng.toFixed(4) +
              ' <a href="https://www.google.com/maps/dir/?api=1&destination=' + r.lat + ',' + r.lng + '" target="_blank" rel="noopener">Directions</a>'
            : 'no location';
          item.innerHTML =
            '<div class="row-between"><div>' +
              '<span class="type-tag type-' + r.type + '">' + I18N.t('type.' + r.type) + '</span>' + flags +
              '<div class="meta" style="margin-top:6px">' + App.escapeHtml(r.reporterName) + ' | ' + App.escapeHtml(r.reporterPhone || '') + '</div>' +
              (r.description ? '<div style="margin-top:4px">' + App.escapeHtml(r.description) + '</div>' : '') +
              '<div class="meta">' + loc + ' | ' + App.fmtTime(r.createdAt) + photo + '</div>' +
            '</div>' +
            '<span class="chip"><span class="dot ' + r.status + '"></span>' + I18N.t('status.' + r.status) + '</span>' +
            '</div>' +
            '<div class="btn-row" style="margin-top:10px">' +
              '<select data-status="' + r.id + '" style="width:auto">' +
                ['sent', 'received', 'in_progress', 'resolved'].map(function (s) {
                  return '<option value="' + s + '"' + (r.status === s ? ' selected' : '') + '>' + I18N.t('status.' + s) + '</option>';
                }).join('') +
              '</select>' +
              '<button class="btn small" data-setstatus="' + r.id + '">' + I18N.t('common.save') + '</button>' +
              (waNumber ? '<button class="btn small" style="background:#1f7a33" data-dispatch="' + r.id + '">Send to firefighters</button>' : '') +
            '</div>';
          el.appendChild(item);
        });
        el.querySelectorAll('[data-photo]').forEach(function (b) {
          b.addEventListener('click', function () { App.showImage(b.dataset.photo, 'Report photo'); });
        });
        el.querySelectorAll('[data-dispatch]').forEach(function (b) {
          b.addEventListener('click', function () {
            var r = byId[b.dataset.dispatch];
            if (!r) return;
            var lines = [];
            lines.push('EMERGENCY DISPATCH - ' + I18N.t('type.' + r.type) + (r.needHelp ? ' (needs help)' : ''));
            lines.push('Town: ' + ((cfg.town && cfg.town.name) || 'Hemleya'));
            lines.push('Reporter: ' + (r.reporterName || '') + (r.reporterPhone ? ' (' + r.reporterPhone + ')' : ''));
            if (r.description) lines.push('Details: ' + r.description);
            if (r.lat != null) {
              lines.push('Location: ' + r.lat.toFixed(5) + ', ' + r.lng.toFixed(5));
              lines.push('Map: https://www.google.com/maps?q=' + r.lat + ',' + r.lng);
            } else {
              lines.push('Location: not provided');
            }
            lines.push('Time: ' + new Date(r.createdAt).toLocaleString());
            var url = 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(lines.join('\n'));
            window.open(url, '_blank');
          });
        });
        el.querySelectorAll('[data-setstatus]').forEach(function (b) {
          b.addEventListener('click', async function () {
            var id = b.dataset.setstatus;
            var sel = el.querySelector('[data-status="' + id + '"]');
            try { await App.api('POST', '/api/staff/incidents/' + id + '/status', { status: sel.value }); setMsg('Status updated.', 'ok'); loadIncidents(); }
            catch (e) { setMsg(e.message, 'error'); }
          });
        });
      }

      var initial = (location.hash || '').replace('#', '');
      openPane(tabs.some(function (t) { return t.id === initial; }) ? initial : 'verify');
      document.addEventListener('langchange', function () {
        var active = document.querySelector('.tab.active');
        if (active) openPane(active.dataset.pane);
      });
    })();
