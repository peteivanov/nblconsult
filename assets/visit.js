/* NBL site-visits tracker — nblconsult.com public pages.
   Adapted from the gated-page tracker on nextbetlabs.com: fires automatically on page load
   (no unlock gate), so a UA-based bot filter stands in for the gate. Posts a Slack THREAD
   parent on open; scroll-depth and an exit summary are threaded under it. ntfy push stays flat. */
(function () {
  if (/bot|crawl|spider|slurp|headless|lighthouse|prerender|preview|facebookexternalhit|whatsapp|telegrambot|skypeuripreview|discordbot|linkedinbot|twitterbot|petalbot|bingpreview/i.test(navigator.userAgent)) return;
  if (location.hostname !== 'nblconsult.com' && location.hostname !== 'www.nblconsult.com') return;

  var NTFY  = 'https://ntfy.sh/nbl-visits-89e28b0a';
  var RELAY = 'https://nbl-track-relay.vercel.app/api/track';
  var path = 'nblconsult/' + (location.pathname.replace(/index\.html$/, '').replace(/\.html$/, '').replace(/^\/|\/$/g, '') || 'home');
  var t0 = Date.now(), maxScroll = 0, byeSent = false, hb = false, hit = {};
  var geo = '', vpn = '', dev = '', visit = '', parent = null, q = [];
  var secTime = {}, curSec = null, curSince = 0, summed = false;
  var VPN_RE = /(datacamp|m247|ovh|digitalocean|linode|hetzner|vultr|leaseweb|choopa|amazon|aws|google\s?cloud|gcp|azure|microsoft\s?corp|oracle|cloudflare|datacenter|data center|hosting|colocation|\bvpn\b|proxy|mullvad|nordvpn|surfshark|expressvpn|private internet|nordlayer|zenlayer|psychz|sparkle)/i;

  function ts() { return new Date().toLocaleString('en-GB', { timeZone: 'Asia/Hong_Kong' }); }
  function fmt(s) { return s < 60 ? s + 's' : Math.floor(s / 60) + 'm' + (s % 60 ? ' ' + (s % 60) + 's' : ''); }
  function el() { return fmt(Math.round((Date.now() - t0) / 1000)); }
  function ord(n) { return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); }
  function device() {
    var u = navigator.userAgent;
    if (/iPad/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1)) return '📱 iPad';
    if (/iPhone/.test(u)) return '📱 iPhone';
    if (/Android/.test(u)) return /Mobile/.test(u) ? '📱 Android' : '📱 Android tablet';
    if (/Windows/.test(u)) return '🖥️ Windows';
    if (/Macintosh|Mac OS/.test(u)) return '💻 Mac';
    if (/Linux/.test(u)) return '💻 Linux';
    return '🖥️ Desktop';
  }

  function ntfy(text, beacon) {
    if (beacon && navigator.sendBeacon) { try { navigator.sendBeacon(NTFY, text); } catch (e) {} }
    else { try { fetch(NTFY, { method: 'POST', body: text, keepalive: true, headers: { Title: 'site-visits', Tags: 'eyes' } }); } catch (e) {} }
  }
  function slack(text, isOpen) {
    if (!parent && !isOpen) { q.push(text); return; }
    var payload = { text: ':eyes: ' + text };
    if (parent && !isOpen) payload.thread_ts = parent;
    try {
      // no Content-Type header -> "simple request" (no CORS preflight) + keepalive -> survives tab close
      fetch(RELAY, { method: 'POST', body: JSON.stringify(payload), keepalive: true })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (isOpen && j && j.ts) { parent = j.ts; flush(); } })
        .catch(function () {});
    } catch (e) {}
  }
  function flush() { var items = q.splice(0); for (var i = 0; i < items.length; i++) slack(items[i], false); }
  function post(text, isOpen, beacon) { ntfy(text, beacon); slack(text, isOpen); }
  function fire(ev, isOpen) { post('[' + path + '] ' + ev + ' · ' + ts(), isOpen, false); }

  function activeSection() {
    var hs = document.querySelectorAll('h1, h2, h3'), active = null;
    for (var i = 0; i < hs.length; i++) {
      if (hs[i].getBoundingClientRect().top <= 140) active = (hs[i].textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      else break;
    }
    return active;
  }
  function tickSection() {
    var sec = activeSection();
    if (sec && sec !== curSec) {
      if (curSec) secTime[curSec] = (secTime[curSec] || 0) + Math.round((Date.now() - curSince) / 1000);
      curSec = sec; curSince = Date.now();
    }
  }
  function watchScroll() {
    window.addEventListener('scroll', function () {
      var sh = document.documentElement.scrollHeight - window.innerHeight;
      tickSection();
      if (sh <= 0) return;
      var pct = Math.min(100, Math.round((window.scrollY || document.documentElement.scrollTop) / sh * 100));
      if (pct > maxScroll) maxScroll = pct;
      [50, 100].forEach(function (m) { if (pct >= m && !hit[m]) { hit[m] = 1; fire('read ' + m + '% · ' + el() + ' in', false); } });
    }, { passive: true });
  }

  var openedFired = false;
  function fireOpened() {
    if (openedFired) return; openedFired = true;
    fire('OPENED · ' + dev + (geo ? ' · ' + geo : '') + vpn + (visit ? ' · ' + visit : ''), true);
  }
  function start() {
    var k = 'nblc_op_' + path;
    if (sessionStorage.getItem(k)) { watchScroll(); return; }   // one thread per tab session
    sessionStorage.setItem(k, '1');
    dev = device();
    try { var vk = 'nblc_v_' + path, n = (parseInt(localStorage.getItem(vk) || '0', 10) + 1); localStorage.setItem(vk, n); visit = n === 1 ? '1st visit' : ord(n) + ' visit 🔁'; } catch (e) {}
    fetch('https://get.geojs.io/v1/ip/geo.json').then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.country_code) {
        var cc = (d.country_code || '').toUpperCase();
        var flag = cc.length === 2 ? String.fromCodePoint.apply(null, [].map.call(cc, function (c) { return 127397 + c.charCodeAt(0); })) : '';
        geo = (flag ? flag + ' ' : '') + (cc || '?') + (d.city ? ' (' + d.city + ')' : '') + ' · ' + (d.ip || '?');
        if (d.organization && VPN_RE.test(d.organization)) vpn = ' · ⚠️ VPN/DC?';
      }
    }).catch(function () {}).then(fireOpened);
    setTimeout(fireOpened, 2000);
    setTimeout(function () { if (!byeSent && !hb) { hb = true; fire('⏳ still on tab — 30 min passed (possibly idle / forgotten tab)', false); sectionSummary(); } }, 1800000);
    watchScroll();
  }

  function sectionSummary() {
    if (summed) return; summed = true;
    if (curSec) { secTime[curSec] = (secTime[curSec] || 0) + Math.round((Date.now() - curSince) / 1000); curSince = Date.now(); }
    var top = Object.keys(secTime).map(function (k) { return [k, secTime[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3).filter(function (x) { return x[1] >= 3; });
    if (top.length) post('[' + path + '] 📊 most-read: ' + top.map(function (x) { return x[0] + ' ' + fmt(x[1]); }).join(' · '), false, true);
  }
  function bye() {
    if (byeSent || !openedFired) return; byeSent = true;
    var msg = hb
      ? '🚪 finally exited the tab at ' + ts() + ' · was open ' + el() + ' · ' + maxScroll + '% read'
      : 'left at ' + ts() + ' · ' + el() + ' on page · ' + maxScroll + '% read';
    post('[' + path + '] ' + msg, false, true);
    sectionSummary();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') bye(); });
  window.addEventListener('pagehide', bye);
})();
