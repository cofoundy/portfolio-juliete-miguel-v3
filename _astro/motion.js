/* JUMP Arquitectura — motion.js
   Vanilla, sin dependencias. Cargado con `defer`.
   - Gate: agrega html.js-motion SOLO cuando el observer quedó armado.
     Si algo falla, el contenido queda visible (motion.css §0).
   - Reveals por lotes con stagger calculado (no por índice fijo).
   - Salida cinematográfica del hero (una variable CSS por frame).
   - Scroll-spy + indicador viajero en la píldora flotante. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1 · Reveals ---------- */
  function initReveals() {
    if (!('IntersectionObserver' in window)) return;
    var els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    if (!els.length) return;

    var STEP = 90, MAX = 5;

    function settle(el) {
      if (el.classList.contains('m-settled')) return;
      el.classList.add('m-settled');
      el.style.removeProperty('--m-delay');
    }

    var io = new IntersectionObserver(function (entries) {
      var batch = entries
        .filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) {
          var d = a.boundingClientRect.top - b.boundingClientRect.top;
          return Math.abs(d) > 4 ? d : a.boundingClientRect.left - b.boundingClientRect.left;
        });

      batch.forEach(function (e, i) {
        var el = e.target;
        io.unobserve(el);
        var delay = Math.min(i, MAX) * STEP;
        el.style.setProperty('--m-delay', delay + 'ms');
        el.classList.add('m-in');

        var done = function (ev) {
          if (ev && (ev.target !== el || ev.propertyName !== 'opacity')) return;
          el.removeEventListener('transitionend', done);
          settle(el);
        };
        el.addEventListener('transitionend', done);
        setTimeout(function () { settle(el); }, delay + 1800);
      });
    }, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

    els.forEach(function (el) { io.observe(el); });

    // Armado OK → recién ahora se ocultan los estados iniciales.
    root.classList.add('js-motion');
  }

  /* ---------- 2 · Salida del hero ---------- */
  function initHero() {
    var hero = document.getElementById('hero');
    if (!hero || reduced) return;

    var ticking = false, last = -1;
    function update() {
      ticking = false;
      var h = hero.offsetHeight || window.innerHeight;
      var p = Math.min(Math.max(window.scrollY / h, 0), 1);
      if (Math.abs(p - last) < 0.001) return;
      last = p;
      hero.style.setProperty('--m-hero-p', p.toFixed(4));
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- 3 · Píldora flotante: scroll-spy + indicador ---------- */
  function initPill() {
    var header = document.getElementById('floating-header');
    var nav = header && header.querySelector('nav');
    if (!nav || !('IntersectionObserver' in window)) return;

    var links = Array.prototype.filter.call(nav.querySelectorAll('a[href^="#"]'), function (a) {
      return a.getAttribute('href') !== '#hero';
    });
    if (!links.length) return;

    var ind = document.createElement('span');
    ind.className = 'm-pill-indicator';
    ind.setAttribute('aria-hidden', 'true');
    nav.insertBefore(ind, nav.firstChild);

    var current = null, hovered = null;

    function place(a, instant) {
      if (!a) { ind.classList.remove('is-on'); return; }
      if (instant) ind.classList.add('no-anim');
      ind.style.setProperty('--x', a.offsetLeft + 'px');
      ind.style.setProperty('--w', a.offsetWidth + 'px');
      ind.style.height = a.offsetHeight + 'px';
      if (instant) { void ind.offsetWidth; ind.classList.remove('no-anim'); }
      ind.classList.add('is-on');
    }
    function sync(instant) { place(hovered || current, instant); }

    links.forEach(function (a) {
      a.addEventListener('pointerenter', function () { hovered = a; sync(); });
      a.addEventListener('focus', function () { hovered = a; sync(); });
      a.addEventListener('blur', function () { if (hovered === a) { hovered = null; sync(); } });
    });
    nav.addEventListener('pointerleave', function () { hovered = null; sync(); });

    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var sections = Object.keys(byId).map(function (id) { return document.getElementById(id); }).filter(Boolean);

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var a = byId[e.target.id];
        if (!a || a === current) return;
        if (current) current.classList.remove('is-current');
        current = a;
        current.classList.add('is-current');
        current.setAttribute('aria-current', 'true');
        links.forEach(function (l) { if (l !== a) l.removeAttribute('aria-current'); });
        sync(!ind.classList.contains('is-on'));
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });

    // Al volver al hero, el indicador se apaga sin viajar.
    var hero = document.getElementById('hero');
    if (hero) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting && entries[0].intersectionRatio > 0.5) {
          if (current) { current.classList.remove('is-current'); current.removeAttribute('aria-current'); }
          current = null; sync();
        }
      }, { threshold: [0.5, 0.6] }).observe(hero);
    }

    // Las medidas cambian con las fuentes y el viewport.
    var remeasure = function () { sync(true); };
    window.addEventListener('resize', remeasure, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  }

  function boot() {
    try { initReveals(); } catch (err) {
      root.classList.remove('js-motion');
      document.querySelectorAll('.m-in').forEach(function (el) { el.classList.add('m-settled'); });
    }
    try { initHero(); } catch (err) { /* decorativo */ }
    try { initPill(); } catch (err) { /* decorativo */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
