function dashboardFor(role) {
      if (role === 'admin') return '/admin';
      if (role === 'support') return '/staff';
      return '/app';
    }

    (async function () {
      var me = await App.getMe();
      if (me) { window.location.href = dashboardFor(me.role); return; }

      await App.buildTopbar(null);
      var cfg = await App.getConfig();

      function setMsg(text, kind) {
        document.getElementById('msg').innerHTML = text
          ? '<div class="notice ' + (kind || 'info') + '">' + App.escapeHtml(text) + '</div>' : '';
      }

      // Show the outcome of an email verification redirect.
      var params = new URLSearchParams(window.location.search);
      if (params.get('verify') === 'ok') setMsg('Email confirmed. You can sign in once an operator approves your account.', 'success');
      else if (params.get('verify') === 'invalid') setMsg('That confirmation link is invalid or expired.', 'error');

      async function doLogin(email, password) {
        setMsg('');
        try {
          var r = await App.api('POST', '/api/login', { email: email, password: password });
          window.location.href = dashboardFor(r.user.role);
        } catch (e) { setMsg(e.message, 'error'); }
      }

      document.getElementById('login-btn').addEventListener('click', function () {
        doLogin(document.getElementById('email').value, document.getElementById('password').value);
      });
      document.getElementById('password').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') doLogin(document.getElementById('email').value, document.getElementById('password').value);
      });

      if (cfg.demoMode) {
        document.getElementById('demo-box').hidden = false;
        document.getElementById('demo-note').textContent =
          'One tap sign in for testing. All demo accounts use the password ' + cfg.demoPassword + '.';
        var wrap = document.getElementById('demo-buttons');
        (cfg.demoAccounts || []).forEach(function (a) {
          var b = document.createElement('button');
          b.className = 'btn secondary small';
          b.textContent = a.label;
          b.title = a.email;
          b.addEventListener('click', async function () {
            try {
              var r = await App.api('POST', '/api/quick-login', { role: a.role });
              window.location.href = dashboardFor(r.user.role);
            } catch (e) { setMsg(e.message, 'error'); }
          });
          wrap.appendChild(b);
        });
      }
    })();
