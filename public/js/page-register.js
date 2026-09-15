(async function () {
      await App.buildTopbar(null);

      function setMsg(text, kind) {
        document.getElementById('msg').innerHTML = text
          ? '<div class="notice ' + (kind || 'info') + '">' + App.escapeHtml(text) + '</div>' : '';
      }
      function show(id) {
        ['step-form', 'step-done'].forEach(function (s) {
          document.getElementById(s).classList.toggle('hidden', s !== id);
        });
      }

      document.getElementById('reg-btn').addEventListener('click', async function () {
        setMsg('');
        var fd = new FormData();
        fd.append('fullName', document.getElementById('name').value);
        fd.append('email', document.getElementById('email').value);
        fd.append('phone', document.getElementById('phone').value);
        fd.append('password', document.getElementById('password').value);
        var front = document.getElementById('idFront').files[0];
        var back = document.getElementById('idBack').files[0];
        var selfie = document.getElementById('selfie').files[0];
        if (front) fd.append('idFront', front);
        if (back) fd.append('idBack', back);
        if (selfie) fd.append('selfie', selfie);

        try {
          var r = await App.api('POST', '/api/register', fd, true);
          show('step-done');
          if (r.verifyLink) {
            var box = document.getElementById('demo-link');
            box.classList.remove('hidden');
            box.innerHTML = 'Demo: no mail server is set, so use this link to confirm: ' +
              '<a href="' + App.escapeHtml(r.verifyLink) + '">' + App.escapeHtml(r.verifyLink) + '</a>';
          }
        } catch (e) { setMsg(e.message, 'error'); }
      });
    })();
