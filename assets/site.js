/* NBL Consulting — shared behaviour: mobile nav, dark-hero bubbles, contact form */
(function () {
  // Mobile nav
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.querySelector('.mobile-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      var s = toggle.querySelectorAll('span');
      if (open) {
        s[0].style.transform = 'rotate(45deg) translate(5px,5px)';
        s[1].style.opacity = '0';
        s[2].style.transform = 'rotate(-45deg) translate(5px,-5px)';
      } else { s.forEach(function (x) { x.style = ''; }); }
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('open');
        toggle.querySelectorAll('span').forEach(function (x) { x.style = ''; });
      });
    });
  }

  // Glassy green bubbles on dark hero
  var canvas = document.getElementById('bubble-canvas');
  if (canvas) {
    var ctx = canvas.getContext('2d');
    var hero = canvas.parentElement;
    function resize() { canvas.width = hero.offsetWidth; canvas.height = hero.offsetHeight; }
    resize();
    window.addEventListener('resize', resize);
    var W = function () { return canvas.width; };
    var H = function () { return canvas.height; };

    var bubbles = [
      { px: 0.78, py: 0.24, r: 130, ax: 0.045, ay: 0.05, fx: 0.62, fy: 0.84, phx: 0.0, phy: 1.1 },
      { px: 0.90, py: 0.66, r: 86,  ax: 0.04,  ay: 0.06, fx: 0.92, fy: 0.6,  phx: 2.0, phy: 0.5 },
      { px: 0.62, py: 0.78, r: 58,  ax: 0.06,  ay: 0.045,fx: 0.75, fy: 1.05, phx: 1.2, phy: 2.3 },
      { px: 0.55, py: 0.10, r: 44,  ax: 0.05,  ay: 0.07, fx: 0.85, fy: 1.2,  phx: 1.6, phy: 1.9 },
      { px: 0.96, py: 0.10, r: 52,  ax: 0.04,  ay: 0.05, fx: 1.1,  fy: 0.8,  phx: 0.7, phy: 3.2 }
    ];

    function drawBubble(x, y, r) {
      var g = ctx.createRadialGradient(x - r * 0.32, y - r * 0.34, r * 0.04, x + r * 0.1, y + r * 0.1, r * 1.02);
      g.addColorStop(0.00, 'rgba(170,225,150,0.55)');
      g.addColorStop(0.30, 'rgba(123,194,105,0.32)');
      g.addColorStop(0.65, 'rgba(123,194,105,0.12)');
      g.addColorStop(1.00, 'rgba(123,194,105,0.02)');
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();

      var shine = ctx.createRadialGradient(x - r * 0.36, y - r * 0.36, 0, x - r * 0.2, y - r * 0.2, r * 0.5);
      shine.addColorStop(0, 'rgba(255,255,255,0.30)');
      shine.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = shine; ctx.fill();

      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(123,194,105,0.35)';
      ctx.lineWidth = 1.2; ctx.stroke();
    }

    function drawGlow() {
      var g1 = ctx.createRadialGradient(W() * 0.85, H() * 0.3, 0, W() * 0.85, H() * 0.3, W() * 0.45);
      g1.addColorStop(0, 'rgba(123,194,105,0.10)');
      g1.addColorStop(1, 'rgba(123,194,105,0)');
      ctx.fillStyle = g1; ctx.fillRect(0, 0, W(), H());
    }

    var t = 0;
    (function frame() {
      ctx.clearRect(0, 0, W(), H());
      t += 0.006;
      drawGlow();
      bubbles.forEach(function (b) {
        var x = b.px * W() + Math.sin(t * b.fx + b.phx) * b.ax * W();
        var y = b.py * H() + Math.sin(t * b.fy + b.phy) * b.ay * H();
        drawBubble(x, y, b.r);
      });
      requestAnimationFrame(frame);
    })();
  }

  // Contact form (Formspree, inline success)
  var form = document.querySelector('form.form');
  if (form) {
    var status = form.querySelector('.form-status');
    var btn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      btn.disabled = true;
      btn.firstChild.textContent = 'Sending… ';
      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      }).then(function (r) {
        if (!r.ok) throw new Error('send failed');
        form.querySelectorAll('input, select, textarea, button').forEach(function (el) { el.disabled = true; });
        status.textContent = 'Thanks — message received. We’ll come back to you within one business day.';
        status.style.cssText = 'display:block;color:#7BC269;';
      }).catch(function () {
        btn.disabled = false;
        btn.firstChild.textContent = 'Send message ';
        status.textContent = 'Something went wrong sending the form. Please email contact@nblconsult.com instead.';
        status.style.cssText = 'display:block;color:#e07b73;';
      });
    });
  }
})();
