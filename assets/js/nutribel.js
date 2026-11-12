/* NutriBel — interacciones del sitio. Sin dependencias. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  window.NBlisto = true; // el script en línea del <head> quita .js si esto no llega a ejecutarse

  var NB = window.NB || { productos: {}, regiones: {}, pautas: {}, wa: '51983548687' };
  var P = document.body.getAttribute('data-prefijo') || '';
  var reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var fmt = function (n, d) { return Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var waUrl = function (texto) { return 'https://wa.me/' + NB.wa + '?text=' + encodeURIComponent(texto); };

  /* ------------------------------------------------ pedido (almacenamiento local) */
  var CLAVE = 'nb-pedido';
  function leer() {
    try { var d = JSON.parse(localStorage.getItem(CLAVE) || '{}'); return d && typeof d === 'object' ? d : {}; } catch (e) { return {}; }
  }
  function guardar(d) {
    try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { /* sin almacenamiento: el pedido vive solo en esta página */ }
    contador(true);
  }
  var conAlmacen = (function () { try { localStorage.setItem('_nb', '1'); localStorage.removeItem('_nb'); return true; } catch (e) { return false; } })();
  var memoria = null;
  function pedido() { if (conAlmacen || memoria === null) memoria = leer(); return memoria; }
  function fijar(d) { memoria = d; guardar(d); }
  window.addEventListener('storage', function (e) { if (e.key === CLAVE) { memoria = null; contador(false); if (window.__nbPintar) window.__nbPintar(); } });
  function total() { var d = pedido(); return Object.keys(d).reduce(function (s, k) { return s + (NB.productos[k] ? d[k] : 0); }, 0); }
  var demoraSalto = 0; // ms: el contador rebota cuando llega el saco que vuela (ver volarAlContador)
  function contador(animar) {
    var n = total();
    $$('.cab-pedido').forEach(function (a) { a.setAttribute('aria-label', n ? 'Mi pedido, ' + n + (n === 1 ? ' saco' : ' sacos') : 'Mi pedido'); });
    $$('[data-contador]').forEach(function (b) {
      b.textContent = n; b.hidden = n === 0;
      if (animar) {
        var saltar = function () { b.classList.remove('salta'); void b.offsetWidth; b.classList.add('salta'); };
        if (demoraSalto) setTimeout(saltar, demoraSalto); else saltar();
      }
    });
  }
  function agregar(id, cant) {
    if (!NB.productos[id]) return;
    var d = pedido(); d[id] = Math.min(999, (d[id] || 0) + cant); fijar(d);
    if (!conAlmacen) {
      aviso('Tu navegador no guarda el pedido entre páginas.', null, null, 8000);
      var w = document.createElement('a'); w.href = waUrl('Hola NutriBel, quiero pedir ' + cant + ' × ' + NB.productos[id].n + ' (' + NB.productos[id].e + '). ¿Precio y disponibilidad?');
      w.textContent = 'Pedir por WhatsApp →'; w.rel = 'noopener'; if (toast) toast.appendChild(w);
      return;
    }
    aviso('Añadido: ' + NB.productos[id].n + (cant > 1 ? ' × ' + cant : ''), 'pedido.html', 'Ver pedido');
  }
  contador(false);

  /* ------------------------------------------------ toast */
  var toast = $('[data-toast]'), tToast;
  function aviso(texto, url, enlace, ms) {
    if (!toast) return;
    toast.innerHTML = '';
    var s = document.createElement('span'); s.textContent = texto; toast.appendChild(s);
    if (url) { var a = document.createElement('a'); a.href = P + url; a.textContent = enlace + ' →'; toast.appendChild(a); }
    toast.classList.add('ver');
    clearTimeout(tToast); tToast = setTimeout(function () { toast.classList.remove('ver'); }, ms || 3800);
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-agregar]');
    if (!b) return;
    ev.preventDefault();
    var cant = 1;
    if (b.hasAttribute('data-con-cantidad')) { var i = $('[data-cant]'); cant = Math.max(1, parseInt(i && i.value, 10) || 1); }
    demoraSalto = NB.productos[b.getAttribute('data-agregar')] && volarAlContador(b) ? 620 : 0;
    agregar(b.getAttribute('data-agregar'), cant);
    demoraSalto = 0;
    if (b.classList.contains('tarjeta-mas')) { b.classList.remove('listo'); void b.offsetWidth; b.classList.add('listo'); clearTimeout(b._t); b._t = setTimeout(function () { b.classList.remove('listo'); }, 1200); }
  });

  /* un saco pequeño «salta» del botón al contador de la cabecera (solo transform y opacity) */
  function volarAlContador(desde) {
    if (reducido || !desde.animate) return false;
    var meta = $$('.cab-pedido').filter(function (a) { return a.getClientRects().length; })[0];
    if (!meta) return false;
    var a = desde.getBoundingClientRect(), z = meta.getBoundingClientRect();
    if (a.bottom < 0 || a.top > window.innerHeight) return false;
    var dx = (z.left + z.width / 2) - (a.left + a.width / 2), dy = (z.top + z.height / 2) - (a.top + a.height / 2);
    var v = document.createElement('span'); v.className = 'vuelo'; v.setAttribute('aria-hidden', 'true');
    v.innerHTML = '<span><svg class="ico" aria-hidden="true" focusable="false"><use href="#i-saco"/></svg></span>';
    v.style.transform = 'translate(' + (a.left + a.width / 2) + 'px,' + (a.top + a.height / 2) + 'px)';
    document.body.appendChild(v);
    var dur = 620, base = v.style.transform;
    // la x avanza parejo y la y acelera hacia arriba: el saco describe un arco
    v.animate([{ transform: base }, { transform: base + ' translateX(' + dx + 'px)' }], { duration: dur, easing: 'cubic-bezier(.25,.6,.4,1)', fill: 'forwards' });
    var anim = v.firstChild.animate([
      { transform: 'translateY(0) scale(.6)', opacity: 0 },
      { transform: 'translateY(' + Math.min(-30, dy * 0.15) + 'px) scale(1.1)', opacity: 1, offset: 0.25 },
      { transform: 'translateY(' + dy + 'px) scale(.45)', opacity: 0.9 }
    ], { duration: dur, easing: 'cubic-bezier(.5,0,.75,.4)', fill: 'forwards' });
    anim.onfinish = anim.oncancel = function () { v.remove(); };
    return true;
  }

  /* selector de cantidad (ficha) */
  $$('[data-cantidad]').forEach(function (c) {
    var input = $('input', c);
    var ajusta = function (d) { input.value = Math.min(999, Math.max(1, (parseInt(input.value, 10) || 1) + d)); };
    $('[data-menos]', c).addEventListener('click', function () { ajusta(-1); });
    $('[data-mas]', c).addEventListener('click', function () { ajusta(1); });
  });

  /* ------------------------------------------------ cabecera */
  var cab = $('[data-cab]');
  var alScroll = function () { if (cab) cab.classList.toggle('con-sombra', window.scrollY > 8); };
  window.addEventListener('scroll', alScroll, { passive: true }); alScroll();

  var megaBtn = $('[data-mega-btn]'), megaPanel = $('#mega-panel');
  function mega(abrir) { if (!megaBtn) return; megaBtn.setAttribute('aria-expanded', abrir); megaPanel.hidden = !abrir; }
  if (megaBtn) {
    megaBtn.addEventListener('click', function () { mega(megaBtn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('click', function (e) { if (!e.target.closest('[data-mega]')) mega(false); });
    $('[data-mega]').addEventListener('focusout', function (e) { if (!e.relatedTarget || !e.relatedTarget.closest('[data-mega]')) mega(false); });
  }

  var cajon = $('[data-cajon]'), menuBtn = $('[data-menu-btn]');
  function menu(abrir) {
    if (!cajon) return;
    cajon.hidden = !abrir; menuBtn.setAttribute('aria-expanded', abrir);
    $$('body > header, body > main, body > footer, body > aside, body > .aviso').forEach(function (el) { el.inert = abrir; });
    document.body.style.overflow = abrir ? 'hidden' : '';
    if (abrir) $('[data-menu-cerrar]').focus(); else menuBtn.focus();
  }
  if (menuBtn) {
    menuBtn.addEventListener('click', function () { menu(true); });
    $('[data-menu-cerrar]').addEventListener('click', function () { menu(false); });
    cajon.addEventListener('click', function (e) { if (e.target === cajon) menu(false); });
    cajon.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = $$('a[href], button:not([disabled])', cajon), a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (cajon && !cajon.hidden) menu(false);
    if (megaBtn && megaBtn.getAttribute('aria-expanded') === 'true') { mega(false); megaBtn.focus(); }
  });

  /* franja de avisos: en móvil rota un aviso cada 3,5 s */
  var avisos = $$('[data-aviso] li');
  if (avisos.length > 1) {
    var ia = 0; avisos[0].classList.add('activo');
    if (!reducido) setInterval(function () { avisos[ia].classList.remove('activo'); ia = (ia + 1) % avisos.length; avisos[ia].classList.add('activo'); }, 3500);
  }

  /* ------------------------------------------------ hero
     El avance lo marca una animación CSS (transform) de la barra de progreso:
     no hay trabajo de JavaScript por cuadro. */
  var hero = $('[data-hero]');
  if (hero) {
    var slides = $$('[data-slide]', hero), puntos = $$('[data-ir]', hero), barra = $('[data-progreso]', hero);
    var actual = 0, motivos = {};
    var auto = !reducido && slides.length > 1;
    var reiniciar = function () {
      if (!auto) return;
      hero.classList.remove('corre'); void barra.offsetWidth; hero.classList.add('corre');
    };
    var pausar = function (motivo, si) {
      motivos[motivo] = !!si;
      hero.classList.toggle('pausa', Object.keys(motivos).some(function (k) { return motivos[k]; }));
    };
    var cargarSlide = function (sl) {
      $$('source[data-srcset]', sl).forEach(function (so) { so.srcset = so.dataset.srcset; so.removeAttribute('data-srcset'); });
      $$('img[data-src]', sl).forEach(function (im) {
        if (im.dataset.srcset) im.srcset = im.dataset.srcset;
        im.src = im.dataset.src; im.removeAttribute('data-src'); im.removeAttribute('data-srcset');
      });
    };
    /* la diapositiva 2 no compite con el LCP: se precarga 3 s después de «load» o en la primera interacción con el hero
       (si el avance llega antes, ir() la carga igual) */
    var precargada = false;
    var precargar = function () { if (precargada || !slides[1]) return; precargada = true; cargarSlide(slides[1]); };
    if (document.readyState === 'complete') setTimeout(precargar, 3000);
    else window.addEventListener('load', function () { setTimeout(precargar, 3000); });
    ['pointerdown', 'touchstart', 'focusin'].forEach(function (ev) { hero.addEventListener(ev, precargar, { once: true, passive: true }); });
    var ir = function (n) {
      slides[actual].classList.remove('activo'); slides[actual].setAttribute('aria-hidden', 'true'); slides[actual].inert = true;
      puntos[actual].classList.remove('activo');
      actual = (n + slides.length) % slides.length;
      cargarSlide(slides[actual]);
      slides[actual].classList.add('activo'); slides[actual].removeAttribute('aria-hidden'); slides[actual].inert = false;
      puntos[actual].classList.add('activo');
      puntos.forEach(function (p, i) { p.setAttribute('aria-current', i === actual ? 'true' : 'false'); });
      reiniciar();
    };
    var pausaBtn = $('[data-pausa]', hero);
    if (pausaBtn) {
      if (!auto) pausaBtn.hidden = true;
      pausaBtn.addEventListener('click', function () {
        var p = pausaBtn.getAttribute('aria-pressed') !== 'true';
        pausaBtn.setAttribute('aria-pressed', p);
        pausar('usuario', p);
      });
    }
    $('[data-prev]', hero).addEventListener('click', function () { ir(actual - 1); });
    $('[data-next]', hero).addEventListener('click', function () { ir(actual + 1); });
    puntos.forEach(function (p) { p.addEventListener('click', function () { ir(+p.getAttribute('data-ir')); }); });
    barra.addEventListener('animationend', function () { ir(actual + 1); });
    hero.addEventListener('mouseenter', function () { pausar('raton', true); });
    hero.addEventListener('mouseleave', function () { pausar('raton', false); });
    hero.addEventListener('focusin', function () { pausar('foco', true); });
    hero.addEventListener('focusout', function () { pausar('foco', false); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { pausar('fuera', !es[0].isIntersecting); document.body.classList.toggle('sobre-hero', es[0].isIntersecting); }).observe(hero); // en el teléfono el botón flotante de WhatsApp no tapa el texto del hero
    }
    var x0 = null;
    hero.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', function (e) {
      if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) ir(actual + (dx < 0 ? 1 : -1)); x0 = null;
    });
    reiniciar();
  }

  /* ------------------------------------------------ manifiesto: las palabras se encienden con el scroll */
  var man = $('[data-manifiesto]');
  var palabras = man ? $$('.palabra', man) : [], encendidas = 0;
  function manifiesto() {
    if (!palabras.length) return;
    var r = man.getBoundingClientRect(), vh = window.innerHeight;
    var p = (vh * 0.85 - r.top) / (r.height * 0.75);
    var n = Math.round(Math.max(0, Math.min(1, p)) * palabras.length);
    if (n === encendidas) return;
    for (var i = Math.min(n, encendidas); i < Math.max(n, encendidas); i++) palabras[i].classList.toggle('on', i < n);
    encendidas = n;
  }
  if (palabras.length && reducido) palabras.forEach(function (w) { w.classList.add('on'); });

  /* ------------------------------------------------ relato y escena: respaldo JS de la coreografía (fase 5)
     Con animation-timeline (Chrome/Edge, Safari 26+) todo lo hace CSS y aquí solo se marca .en-vista.
     Sin él (Safari < 26, Firefox) se replican las mismas curvas escribiendo solo transform y opacity,
     una vez por cuadro de animación y solo mientras la sección está en pantalla.
     Con movimiento reducido: la imagen del relato cambia sin animar y la escena queda quieta. */
  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var escritorio = window.matchMedia('(min-width: 981px)');
  var cabH = function () { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cab-h')) || 76; };
  var hayIOe = 'IntersectionObserver' in window;
  var conTL = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));

  var relato = $('[data-relato]');
  var relatoTick = null;
  if (relato && (!conTL || reducido)) {
    var cuadros = $$('.relato-cuadro', relato), anclas = $$('.relato-ancla', relato);
    var fotos = cuadros.map(function (c) { return $('.relato-foto, .relato-resp', c); });
    var previo = [], activoR = -1;
    if (!conTL) relato.classList.add('relato-io');
    relatoTick = function (vh) {
      var r = relato.getBoundingClientRect();
      if (r.bottom < -vh || r.top > 2 * vh) return;
      var ys = anclas.map(function (a) { return a.getBoundingClientRect().top; });
      var act = 0;
      for (var i = 0; i < ys.length; i++) if (ys[i] <= 0.56 * vh) act = i;
      if (!conTL) relato.style.setProperty('--luz', clamp01((0.6 * vh - ys[0]) / Math.max(1, ys[ys.length - 1] - ys[0])).toFixed(3));
      if (!escritorio.matches) return;
      if (reducido) {
        if (act !== activoR) { activoR = act; cuadros.forEach(function (c, k) { c.classList.toggle('activo', k === act); }); }
        return;
      }
      for (var k = 0; k < cuadros.length; k++) {
        var ini = k === 0 ? 0.5 : 0.62;
        var op = k === 0 ? 1 : clamp01((0.62 * vh - ys[k]) / (0.12 * vh)); // mismo tramo que el CSS: 62 %→50 %
        var kb = 1.12 - 0.12 * clamp01((ini * vh - ys[k]) / (ini * vh));
        var clave = op.toFixed(3) + '|' + kb.toFixed(4);
        if (clave === previo[k]) continue;
        previo[k] = clave;
        cuadros[k].style.opacity = op.toFixed(3);
        if (fotos[k]) fotos[k].style.transform = 'scale(' + kb.toFixed(4) + ')';
      }
    };
  }

  var escena = $('[data-escena]');
  var escenaTick = null;
  if (escena) {
    var fija = $('.escena-fija', escena);
    if (hayIOe) new IntersectionObserver(function (es) { escena.classList.toggle('en-vista', es[0].isIntersecting); }, { rootMargin: '20% 0px' }).observe(escena);
    if (!conTL && !reducido && fija) {
      escena.classList.add('escena-js');
      var num = function (n) { var v = getComputedStyle(escena).getPropertyValue(n).trim(); return { v: parseFloat(v) || 0, u: v.replace(/^[-\d.]+/, '') || '' }; };
      var Z = {};
      var leerZ = function () { ['--z-cielo', '--z-cielo-y', '--z-cord', '--z-valle', '--z-sacos', '--z-sacos-y0', '--z-sacos-y', '--z-pasto', '--z-pasto-x', '--z-pasto-y'].forEach(function (n) { Z[n] = num(n); }); };
      leerZ(); window.addEventListener('resize', leerZ);
      var L = function (n, t) { return (Z[n].v * t).toFixed(3) + Z[n].u; };
      var S = function (n, t) { return (1 + (Z[n].v - 1) * t).toFixed(4); };
      var ce = {
        cielo: $('.capa-cielo', escena), cord: $('.capa-cordillera', escena), valle: $('.capa-valle', escena),
        sacos: $('.escena-sacos', escena), izq: $('.capa-pasto-izq', escena), der: $('.capa-pasto-der', escena)
      };
      var tit = $('.escena-tit', escena), remate = $('.escena-remate', escena), ultimaP = -1;
      escenaTick = function (vh) {
        var r = escena.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var c = cabH(), p = clamp01((c - r.top) / Math.max(1, r.height - (vh - c)));
        if (Math.abs(p - ultimaP) < 0.0005) return;
        ultimaP = p;
        var t = p; // curva lineal, igual que el CSS
        ce.cielo.style.transform = 'translateY(' + L('--z-cielo-y', t) + ') scale(' + S('--z-cielo', t) + ')';
        ce.cord.style.transform = 'scale(' + S('--z-cord', t) + ')';
        ce.valle.style.transform = 'scale(' + S('--z-valle', t) + ')';
        ce.sacos.style.transform = 'translate(-50%,' + (Z['--z-sacos-y0'].v + (Z['--z-sacos-y'].v - Z['--z-sacos-y0'].v) * t).toFixed(3) + (Z['--z-sacos-y'].u || 'svh') + ') scale(' + S('--z-sacos', t) + ')';
        ce.izq.style.transform = 'translate(' + L('--z-pasto-x', -t) + ',' + L('--z-pasto-y', t) + ') scale(' + S('--z-pasto', t) + ')';
        ce.der.style.transform = 'translate(' + L('--z-pasto-x', t) + ',' + L('--z-pasto-y', t) + ') scale(' + S('--z-pasto', t) + ')';
        var ts = clamp01((p - 0.26) / 0.16);
        tit.style.opacity = (1 - ts).toFixed(3);
        tit.style.transform = ts ? 'translateY(' + (-6 * ts).toFixed(2) + 'svh) scale(' + (1 - 0.03 * ts).toFixed(4) + ')' : '';
        if (remate) {
          var rs = clamp01((p - 0.70) / 0.16);
          remate.style.opacity = rs.toFixed(3);
          remate.style.transform = rs < 1 ? 'translateY(' + (4 * (1 - rs)).toFixed(2) + 'svh)' : '';
          remate.classList.toggle('on', rs > 0);
        }
      };
    }
  }
  var pendiente = false;
  function alDesplazar() {
    if (pendiente) return; pendiente = true;
    requestAnimationFrame(function () {
      pendiente = false;
      var vh = window.innerHeight;
      manifiesto();
      if (relatoTick) relatoTick(vh);
      if (escenaTick) escenaTick(vh);
    });
  }
  if (palabras.length || relatoTick || escenaTick) { window.addEventListener('scroll', alDesplazar, { passive: true }); window.addEventListener('resize', alDesplazar); alDesplazar(); }

  /* ------------------------------------------------ aparición al hacer scroll (una sola vez)
     .visto dispara transiciones CSS de transform/opacity. Sin IntersectionObserver o con
     movimiento reducido, todo queda visible de inmediato. */
  var hayIO = 'IntersectionObserver' in window;
  var conTimeline = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
  function unaVez(els, margen, alVer) {
    if (!els.length) return;
    if (!hayIO || reducido) { els.forEach(function (el) { el.classList.add('visto'); if (alVer) alVer(el, 0); }); return; }
    var obs = new IntersectionObserver(function (es) {
      var n = 0;
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        if (alVer) alVer(e.target, n);
        n++;
        e.target.classList.add('visto');
      });
    }, { rootMargin: margen || '0px 0px -8% 0px' });
    els.forEach(function (el) { obs.observe(el); });
  }
  unaVez($$('.revelar, [data-palabras], .ruta-etapas'));
  // tarjetas: las que entran juntas lo hacen escalonadas (70 ms, máximo 6)
  unaVez($$('.tarjeta'), '0px 0px -4% 0px', function (el, n) { el.style.setProperty('--d', Math.min(n, 6) * 70 + 'ms'); });
  // programa de alimentación: el número de la etapa se enciende al llegar a ella
  var progs = $$('[data-etapa-prog]');
  unaVez(progs, '-25% 0px -45% 0px', function (el) { for (var i = 0; i < progs.indexOf(el); i++) progs[i].classList.add('visto'); });

  /* ------------------------------------------------ nosotros: línea de tiempo 2014–2016–2021 */
  var hitosL = $('[data-hitos]');
  if (hitosL) {
    unaVez($$('[data-hito]', hitosL), '0px 0px -30% 0px', function (h) {
      if (conTimeline) return; // la línea la dibuja CSS con animation-timeline
      var alto = hitosL.offsetHeight || 1, ultimo = h === hitosL.lastElementChild;
      hitosL.style.setProperty('--avance', ultimo ? 1 : Math.min(1, (h.offsetTop + 53) / alto).toFixed(3));
    });
  }

  /* ------------------------------------------------ giro del saco ligado al scroll (secuencia en canvas)
     Carga diferida (solo al acercarse), decode() fuera del hilo principal y un drawImage como
     máximo por cuadro, solo cuando cambia el fotograma. Sin secuencia (queda la imagen fija f00)
     con movimiento reducido, ahorro de datos, red 2g o poca memoria (3g no: Chrome la estima a menudo con datos móviles). */
  var cx = navigator.connection || {};
  var ligero = reducido || cx.saveData || /^(slow-2g|2g)$/.test(cx.effectiveType || '') || (navigator.deviceMemory && navigator.deviceMemory < 4);
  if (!ligero && hayIO) $$('[data-giro]').forEach(function (caja) {
    var lienzo = $('canvas', caja);
    if (!lienzo || !lienzo.getContext) return;
    var nd = +caja.getAttribute('data-nd') || 0, nm = +caja.getAttribute('data-nm') || 0;
    var usarM = (window.matchMedia('(max-width: 640px)').matches && nm > 0) || !nd;
    var N = usarM ? nm : nd, W = usarM ? 400 : 640, H = usarM ? 500 : 800;
    if (N < 2) return;
    var base = caja.getAttribute('data-base') + (usarM ? 'm/' : 'd/');
    var cuadro = caja.closest('.relato-cuadro');
    var ref = caja.closest('.relato-paso') || (cuadro && $('.relato-paso[data-paso="' + cuadro.getAttribute('data-paso') + '"]')) || caja;
    var anclaG = cuadro ? $('.relato-paso[data-paso="' + cuadro.getAttribute('data-paso') + '"] .relato-ancla') : null; // escritorio: el giro sigue al texto 05
    var g = null, fr = new Array(N), actual = -1, objetivo = 0, cerca = false, pend = false, cargado = false;
    var pintar = function () {
      var j = objetivo;
      while (j > 0 && !fr[j]) j--;
      if (!fr[j] || j === actual) return;
      g.drawImage(fr[j], 0, 0, W, H); actual = j;
      if (!caja.classList.contains('listo')) caja.classList.add('listo');
    };
    var calcular = function () {
      pend = false;
      var r = ref.getBoundingClientRect(), vh = window.innerHeight;
      var p;
      if (anclaG) p = Math.min(1, Math.max(0, (0.52 * vh - anclaG.getBoundingClientRect().top) / (0.55 * vh))); // 52 %→-3 %: empieza al acabar el fundido y dura mientras la imagen 05 sigue en pantalla
      else { p = (vh - r.top) / (vh + r.height); p = Math.min(1, Math.max(0, (p - 0.18) / 0.6)); } // móvil: 0 entra por abajo · 1 sale por arriba
      objetivo = Math.round(p * (N - 1));
      pintar();
    };
    var pedir = function () { if (!pend) { pend = true; requestAnimationFrame(calcular); } };
    var cargar = function () {
      cargado = true;
      lienzo.width = W; lienzo.height = H; g = lienzo.getContext('2d', { alpha: false });
      // primero uno de cada cuatro fotogramas: el giro se ve completo antes de terminar de cargar
      var orden = [];
      for (var k = 0; k < N; k++) orden.push(k);
      orden.sort(function (a, b) { return (a % 4 ? 1 : 0) - (b % 4 ? 1 : 0) || a - b; });
      orden.forEach(function (i) {
        var im = new Image(); im.decoding = 'async';
        im.src = base + 'f' + (i < 10 ? '0' : '') + i + '.webp';
        (im.decode ? im.decode() : Promise.resolve()).then(function () { fr[i] = im; if (cerca) pedir(); }).catch(function () {});
      });
    };
    new IntersectionObserver(function (es) {
      cerca = es[0].isIntersecting && caja.getClientRects().length > 0; // display:none (otra versión) no cuenta
      if (cerca && !cargado) cargar();
      if (cerca) pedir();
    }, { rootMargin: '60% 0px' }).observe(ref);
    window.addEventListener('scroll', function () { if (cerca && cargado) pedir(); }, { passive: true });
  });

  /* ------------------------------------------------ transición entre páginas: el saco vuela de la tarjeta a la ficha
     Solo se nombra la tarjeta del producto de destino (un nombre no puede repetirse en la página).
     La vuelta (ficha → tarjeta) la resuelve el script en línea del <head> con «pagereveal». */
  window.addEventListener('pageswap', function (e) {
    if (!e.viewTransition || !e.activation || !e.activation.entry) return;
    var m = /productos\/([\w-]+)\.html/.exec(e.activation.entry.url || '');
    if (!m) return;
    var c = $('.tarjeta[data-id="' + m[1] + '"] .saco');
    if (!c) return;
    var r = c.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    c.style.viewTransitionName = 'saco-' + m[1];
  });
  window.addEventListener('pageshow', function () { $$('.tarjeta .saco').forEach(function (i) { i.style.viewTransitionName = ''; }); });

  /* ------------------------------------------------ pestañas accesibles */
  $$('[data-pestanas]').forEach(function (lista) {
    var tabs = $$('[data-tab]', lista);
    var activar = function (tab, foco) {
      tabs.forEach(function (t) {
        var sel = t === tab; t.setAttribute('aria-selected', sel); t.tabIndex = sel ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls')); if (panel) panel.hidden = !sel;
      });
      if (foco) tab.focus();
      lista.dispatchEvent(new CustomEvent('cambio', { detail: tab.id }));
    };
    var inicial = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    if (inicial) tabs.forEach(function (t) { var pn = document.getElementById(t.getAttribute('aria-controls')); if (pn) pn.hidden = t !== inicial; });
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { activar(t); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') n = tabs[0];
        if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); activar(n, true); }
      });
    });
  });

  /* ------------------------------------------------ filtros del catálogo */
  var filtros = $('[data-filtros]');
  if (filtros) {
    var tarjetas = $$('[data-rejilla] .tarjeta'), chips = $$('[data-filtro-especie]', filtros);
    var selEtapa = $('[data-filtro-etapa]', filtros), txt = $('[data-filtro-texto]', filtros);
    var nTxt = $('[data-filtro-n]'), vacio = $('[data-vacio]');
    var especie = new URLSearchParams(location.search).get('especie') || '';
    var normal = function (s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
    var aplicar = function () {
      var q = normal(txt.value.trim()), et = selEtapa.value, n = 0;
      tarjetas.forEach(function (t) {
        var ok = (!especie || t.dataset.especie === especie) && (!et || t.dataset.etapa === et) && (!q || normal(t.dataset.nombre + ' ' + t.dataset.etapa).indexOf(q) > -1);
        t.hidden = !ok; if (ok) n++;
      });
      chips.forEach(function (c) { var on = c.dataset.filtroEspecie === especie; c.classList.toggle('activo', on); c.setAttribute('aria-pressed', on); });
      nTxt.textContent = n + (n === 1 ? ' alimento' : ' alimentos'); vacio.hidden = n > 0;
      var url = new URL(location.href); if (especie) url.searchParams.set('especie', especie); else url.searchParams.delete('especie');
      history.replaceState(null, '', url);
    };
    chips.forEach(function (c) { c.addEventListener('click', function () { especie = c.dataset.filtroEspecie; aplicar(); }); });
    selEtapa.addEventListener('change', aplicar); txt.addEventListener('input', aplicar);
    $('[data-limpiar]').addEventListener('click', function () { especie = ''; selEtapa.value = ''; txt.value = ''; aplicar(); });
    aplicar();
  }

  /* ------------------------------------------------ galería e impresión de la ficha */
  var foto = $('[data-foto]');
  $$('[data-ver]').forEach(function (b) {
    b.addEventListener('click', function () {
      foto.src = b.getAttribute('data-ver');
      foto.classList.toggle('pellet-grande', b.getAttribute('data-ver').indexOf('/pellet/') > -1);
      $$('[data-ver]').forEach(function (x) { x.classList.toggle('activo', x === b); });
    });
  });
  $$('[data-imprimir]').forEach(function (b) { b.addEventListener('click', function () { $$('.acordeon').forEach(function (a) { a.open = true; }); window.print(); }); });

  /* ------------------------------------------------ formularios que abren WhatsApp */
  function abrirWa(texto) { var w = window.open(waUrl(texto), '_blank', 'noopener'); if (!w) location.href = waUrl(texto); }
  $$('[data-form-wa]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!f.reportValidity()) return;
      var lineas = ['*' + f.getAttribute('data-titulo') + '*'];
      $$('input, select, textarea', f).forEach(function (c) { if (c.name && c.value.trim()) lineas.push(c.name + ': ' + c.value.trim()); });
      abrirWa(lineas.join('\n'));
    });
  });

  /* ------------------------------------------------ página Mi pedido */
  var pag = $('[data-pedido]');
  if (pag) {
    var ul = $('[data-items]', pag), vacioP = $('[data-pedido-vacio]', pag), form = $('[data-form-pedido]');
    var pintar = function () {
      var d = pedido(), ids = Object.keys(d).filter(function (k) { return NB.productos[k] && d[k] > 0; });
      ul.innerHTML = '';
      vacioP.hidden = ids.length > 0; form.hidden = ids.length === 0;
      ids.forEach(function (id) {
        var p = NB.productos[id], li = document.createElement('li'); li.className = 'item';
        li.innerHTML = '<img src="' + P + 'assets/img/' + p.s + '" alt="">' +
          '<div><a class="item-nom" href="' + P + 'productos/' + id + '.html"></a><small></small></div>' +
          '<div class="cantidad"><button type="button" data-d="-1"><svg class="ico"><use href="#i-menos"/></svg></button>' +
          '<label><span class="sr">Sacos</span><input type="number" min="1" max="999" inputmode="numeric"></label>' +
          '<button type="button" data-d="1"><svg class="ico"><use href="#i-mas"/></svg></button></div>' +
          '<button class="item-quitar" type="button"><svg class="ico"><use href="#i-cerrar"/></svg></button>';
        $('.item-nom', li).textContent = p.n;
        $('small', li).textContent = p.e + (p.k ? ' · saco de ' + p.k + ' kg' : '');
        var inp = $('input', li); inp.value = d[id];
        $('[data-d="-1"]', li).setAttribute('aria-label', 'Quitar un saco de ' + p.n);
        $('[data-d="1"]', li).setAttribute('aria-label', 'Añadir un saco de ' + p.n);
        $('.item-quitar', li).setAttribute('aria-label', 'Quitar ' + p.n + ' del pedido');
        inp.setAttribute('aria-label', 'Sacos de ' + p.n);
        var poner = function (v) { var x = pedido(); x[id] = Math.min(999, Math.max(1, v)); fijar(x); inp.value = x[id]; resumen(); };
        $$('[data-d]', li).forEach(function (b) { b.addEventListener('click', function () { poner((parseInt(inp.value, 10) || 1) + (+b.dataset.d)); }); });
        inp.addEventListener('change', function () { poner(parseInt(inp.value, 10) || 1); });
        $('.item-quitar', li).addEventListener('click', function () {
          var idx = $$('.item', ul).indexOf(li), x = pedido(); delete x[id]; fijar(x); pintar();
          var q = $$('.item-quitar', ul);
          if (q.length) q[Math.min(idx, q.length - 1)].focus(); else { var t = $('.titular', vacioP); t.tabIndex = -1; t.focus(); }
        });
        ul.appendChild(li);
      });
      resumen();
    };
    var resumen = function () {
      var vieja = $('.pedido-total', pag); if (vieja) vieja.remove();
      var n = total(); if (!n) return;
      var div = document.createElement('div'); div.className = 'pedido-total';
      div.innerHTML = '<span>Total</span><span>' + n + (n === 1 ? ' saco' : ' sacos') + '</span>';
      var vaciar = document.createElement('button'); vaciar.type = 'button'; vaciar.className = 'enlace'; vaciar.textContent = 'Vaciar pedido';
      vaciar.addEventListener('click', function () {
        var copia = JSON.parse(JSON.stringify(pedido())); fijar({}); pintar();
        var t = $('.titular', vacioP); if (t) { t.tabIndex = -1; t.focus(); }
        aviso('Pedido vaciado.', null, null, 8000);
        var d = document.createElement('button'); d.type = 'button'; d.className = 'enlace enlace-claro'; d.textContent = 'Deshacer';
        d.addEventListener('click', function () { fijar(copia); pintar(); if (toast) toast.classList.remove('ver'); });
        if (toast) toast.appendChild(d);
      });
      div.appendChild(vaciar);
      ul.after(div);
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault(); if (!form.reportValidity()) return;
      var d = pedido(), lineas = ['*Pedido web NutriBel*', ''];
      Object.keys(d).forEach(function (id) { if (NB.productos[id]) lineas.push('• ' + d[id] + ' × ' + NB.productos[id].n + ' (' + NB.productos[id].e + ')'); });
      lineas.push('');
      $$('input, select, textarea', form).forEach(function (c) { if (c.name && c.value.trim()) lineas.push(c.name + ': ' + c.value.trim()); });
      lineas.push('', '¿Me confirman precio, stock y fecha de entrega?');
      abrirWa(lineas.join('\n'));
    });
    window.__nbPintar = pintar;
    if (!conAlmacen) { var nt = document.createElement('p'); nt.className = 'nota'; nt.textContent = 'Este navegador no permite guardar el pedido entre páginas. Escríbenos directamente por WhatsApp y te ayudamos con tu pedido.'; vacioP.appendChild(nt); }
    pintar();
  }

  /* ------------------------------------------------ calculadora */
  var calc = $('[data-calc]');
  if (calc) {
    var perfil = $('[data-calc-perfil]', calc), aves = $('[data-calc-aves]', calc), cont = $('[data-calc-etapas]', calc);
    var saco = $('[data-calc-saco]', calc), modo = 'pauta';
    var outS = $('[data-calc-sacos]', calc), outK = $('[data-calc-kg]', calc), outD = $('[data-calc-detalle]', calc);
    var ultimo = '';
    var etapas = function () {
      cont.innerHTML = '';
      (NB.pautas[perfil.value] || []).forEach(function (e, i) {
        var l = document.createElement('label'); l.className = 'calc-etapa';
        l.innerHTML = '<input type="checkbox" checked><span><strong></strong><small></small></span><span class="calc-kg-e" data-kg-e></span>';
        $('input', l).setAttribute('aria-label', 'Incluir ' + e.n + ' (' + e.v + ')');
        $('strong', l).textContent = e.n; $('small', l).textContent = e.v + ' · ' + fmt(e.kg, 2) + ' kg por ave';
        l.dataset.i = i; cont.appendChild(l);
      });
      calcular();
    };
    var calcular = function () {
      var kgSaco = +saco.value, kg = 0, det = [];
      if (modo === 'pauta') {
        var n = Math.max(0, +aves.value || 0), pauta = NB.pautas[perfil.value] || [];
        $$('.calc-etapa', cont).forEach(function (l) {
          var e = pauta[+l.dataset.i]; if (!e) return;
          var on = $('input', l).checked, k = on ? n * e.kg : 0;
          $('[data-kg-e]', l).textContent = on ? fmt(k, 0) + ' kg · ' + fmt(Math.ceil(k / kgSaco)) + ' sacos' : 'No incluida';
          if (on) { kg += k; det.push([e.n + ' (' + e.v + ')', k]); }
        });
        ultimo = 'Calculadora NutriBel: ' + perfil.options[perfil.selectedIndex].text + ', ' + fmt(n) + ' aves.';
      } else {
        var a = Math.max(0, +$('[data-libre-animales]', calc).value || 0), g = Math.max(0, +$('[data-libre-gramos]', calc).value || 0), d = Math.max(0, +$('[data-libre-dias]', calc).value || 0);
        kg = a * g * d / 1000;
        var gd = g % 1 ? 1 : 0;
        det.push([fmt(a) + ' animales × ' + fmt(g, gd) + ' g × ' + fmt(d) + ' días', kg]);
        ultimo = 'Calculadora NutriBel: ' + fmt(a) + ' animales, ' + fmt(g, gd) + ' g/día, ' + fmt(d) + ' días.';
      }
      var sacos = Math.ceil(kg / kgSaco);
      outS.textContent = fmt(sacos); outK.textContent = fmt(kg, 0);
      outD.innerHTML = '';
      det.forEach(function (x) { var p = document.createElement('p'); var a = document.createElement('span'); a.textContent = x[0]; var b = document.createElement('strong'); b.textContent = fmt(x[1], 0) + ' kg'; p.append(a, b); outD.appendChild(p); });
      ultimo += ' Total estimado: ' + fmt(kg, 0) + ' kg = ' + fmt(sacos) + ' sacos de ' + kgSaco + ' kg. ¿Me ayudan con el pedido?';
    };
    calc.addEventListener('input', function (e) { if (e.target !== perfil) calcular(); });
    calc.addEventListener('change', function (e) { if (e.target === perfil) etapas(); else calcular(); });
    $('[data-pestanas]', calc).addEventListener('cambio', function (e) { modo = e.detail === 'tab-libre' ? 'libre' : 'pauta'; calcular(); });
    $('[data-calc-enviar]', calc).addEventListener('click', function () { abrirWa(ultimo); });
    etapas();
  }

  /* ------------------------------------------------ mapa de cobertura */
  var mapa = $('[data-mapa]');
  if (mapa) {
    var info = $('[data-region-info]', mapa), sel = $('[data-region-select]', mapa);
    var mostrar = function (id) {
      var r = NB.regiones[id]; if (!r) return;
      $$('.region', mapa).forEach(function (p) { p.classList.toggle('sel', p.id === id); if (p.classList.contains('activa')) p.setAttribute('aria-pressed', p.id === id); });
      $$('[data-region-btn]', mapa).forEach(function (b) { var on = b.dataset.regionBtn === id; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on); });
      sel.value = id;
      info.innerHTML = '<img alt="" loading="lazy"><p class="kicker"></p><h2 class="titular titular-sm"></h2>' +
        '<dl><dt>Líneas</dt><dd data-l></dd><dt>Provincias</dt><dd data-p></dd><dt>Envíos</dt><dd data-e></dd></dl>' +
        '<a class="btn btn-wa btn-bloque"><svg class="ico"><use href="#i-wa"/></svg> Consultar en ' + '</a>';
      $('img', info).src = P + 'assets/img/regiones/' + r.img + '.webp';
      $('.kicker', info).textContent = r.estado; $('h2', info).textContent = r.nombre;
      $('[data-l]', info).textContent = r.lineas; $('[data-p]', info).textContent = r.provincias; $('[data-e]', info).textContent = r.envio;
      var a = $('a', info); a.append(r.nombre);
      a.href = waUrl('Hola NutriBel, estoy en ' + r.nombre + '. ¿Cómo puedo comprar sus alimentos y cada cuánto llegan a mi zona?');
    };
    $$('.region.activa', mapa).forEach(function (p) {
      p.addEventListener('click', function () { mostrar(p.id); });
      p.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mostrar(p.id); } });
    });
    $$('[data-region-btn]', mapa).forEach(function (b) { b.addEventListener('click', function () { mostrar(b.dataset.regionBtn); info.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'nearest' }); }); });
    sel.addEventListener('change', function () { mostrar(sel.value); });
  }

  /* año del pie */
  $$('[data-anio]').forEach(function (s) { s.textContent = new Date().getFullYear(); });
})();
