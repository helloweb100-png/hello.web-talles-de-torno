/* ════════════════════════════════════════════════════════════════
   HEMDI | app.js
   Módulos (cada uno aislado con try/catch: si uno falla, la página sigue):
     1. Config y utilidades        8. Contadores
     2. Enlaces de WhatsApp        9. Aplicaciones (scroll horizontal fijado)
     3. Loader                    10. Proceso (línea de progreso)
     4. Scroll suave (Lenis)      11. Efectos de puntero (spotlight, magnético)
     5. Navegación y menú         12. FAQ y formulario
     6. Texto dividido y revelado 13. Fondo de partículas 2D
     7. Hero (intro + scroll)     14. Hero 3D (Three.js)

   Dependencias externas (CDN): GSAP, ScrollTrigger, Lenis, Three.js.
   Si alguna no carga, el contenido sigue visible y funcional.
   ════════════════════════════════════════════════════════════════ */
(() => {
    'use strict';

    /* ═══ 1. CONFIG Y UTILIDADES ═══════════════════════════════════ */
    const CONFIG = {
        // Número de WhatsApp en formato internacional, sin "+" ni espacios.
        // Para cambiarlo: reemplaza este valor y el que aparece en los href de index.html.
        whatsapp: '5215648623164',
        brand: 'HEMDI'
    };

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const root = document.documentElement;

    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasGSAP = !!(window.gsap && window.ScrollTrigger);
    const FX = hasGSAP && !reduceMotion;          // animaciones completas activas

    const state3d = { intro: FX ? 0 : 1, scroll: 0 };
    let lenis = null;
    let ready = false;

    const safe = (name, fn) => {
        try { return fn(); } catch (err) { console.warn(`[${CONFIG.brand}] módulo "${name}" falló:`, err); }
    };

    if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
    if (FX) {
        root.classList.add('has-gsap');
        ScrollTrigger.config({ ignoreMobileResize: true });
    }

    /* ═══ 2. ENLACES DE WHATSAPP ═══════════════════════════════════ */
    const waUrl = (text) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;

    function initWhatsApp() {
        $$('[data-wa]').forEach((a) => {
            a.href = waUrl(a.dataset.wa);
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
        });
        const year = $('#year');
        if (year) year.textContent = new Date().getFullYear();
    }

    /* ═══ 3. LOADER ════════════════════════════════════════════════ */
    function runLoader() {
        return new Promise((resolve) => {
            const el = $('#loader');
            if (!el) { resolve(); return; }

            root.classList.add('is-loading');
            const arc = $('#loaderArc');
            const pctEl = $('#loaderPct');
            const statusEl = $('#loaderStatus');
            const C = 2 * Math.PI * 78;
            arc.style.strokeDasharray = C;
            arc.style.strokeDashoffset = C;

            const messages = ['Calibrando medidas', 'Afilando filos', 'Cargando carburo', 'Todo listo'];
            const minTime = reduceMotion ? 500 : 2400;
            const t0 = performance.now();
            let loaded = document.readyState === 'complete';
            let fontsOk = false;
            let p = 0;
            let lastMsg = -1;
            let finished = false;

            if (!loaded) window.addEventListener('load', () => { loaded = true; }, { once: true });
            const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
            fontsReady.then(() => { fontsOk = true; });

            const finish = () => {
                if (finished) return;
                finished = true;
                pctEl.textContent = '100';
                arc.style.strokeDashoffset = 0;
                statusEl.textContent = messages[3];
                setTimeout(() => {
                    el.classList.add('is-exit');
                    setTimeout(resolve, 380);               // el hero arranca mientras abre la cortina
                    setTimeout(() => {
                        el.remove();
                        root.classList.remove('is-loading');
                    }, 1700);
                }, 350);
            };

            const tick = (now) => {
                if (finished) return;
                const t = now - t0;
                const done = loaded && fontsOk && t >= minTime;
                const target = done ? 100 : Math.min(88, (t / minTime) * 88);
                p += (target - p) * 0.09;
                if (target === 100 && 100 - p < 0.4) p = 100;

                pctEl.textContent = Math.round(p);
                arc.style.strokeDashoffset = C * (1 - p / 100);
                const mi = p >= 100 ? 3 : Math.min(2, Math.floor(p / 34));
                if (mi !== lastMsg) { lastMsg = mi; statusEl.textContent = messages[mi]; }

                if (p >= 100 || t > 7000) { finish(); return; }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });
    }

    /* ═══ 4. SCROLL SUAVE (LENIS) ══════════════════════════════════ */
    function initSmoothScroll() {
        if (!FX || !window.Lenis) return;
        lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((t) => lenis.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);
        lenis.stop();                                   // se reactiva al terminar el loader
    }

    /* ═══ 5. NAVEGACIÓN Y MENÚ ═════════════════════════════════════ */
    function initNav() {
        const nav = $('#nav');
        const sentinel = $('#navSentinel');
        const burger = $('#burger');
        const menu = $('#menu');
        const progress = $('#navProgress');

        // Estado "pegado" sin escuchar scroll: IntersectionObserver sobre un centinela.
        new IntersectionObserver(([e]) => nav.classList.toggle('is-stuck', !e.isIntersecting)).observe(sentinel);

        // Menú móvil
        menu.inert = true;
        const setMenu = (open) => {
            burger.setAttribute('aria-expanded', String(open));
            burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
            menu.classList.toggle('is-open', open);
            menu.setAttribute('aria-hidden', String(!open));
            menu.inert = !open;
            nav.classList.toggle('is-open', open);
            if (lenis) { open ? lenis.stop() : lenis.start(); }
            else { document.body.style.overflow = open ? 'hidden' : ''; }
        };
        burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
        matchMedia('(min-width: 980px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

        // Anclas con scroll suave
        document.addEventListener('click', (e) => {
            const a = e.target.closest('a[href^="#"]');
            if (!a) return;
            const id = a.getAttribute('href');
            if (id.length < 2) return;
            const target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            const wasOpen = menu.classList.contains('is-open');
            if (wasOpen) setMenu(false);
            const go = () => {
                if (lenis) lenis.scrollTo(target, { offset: -(nav.offsetHeight - 1), duration: 1.7, easing: (t) => 1 - Math.pow(1 - t, 4) });
                else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
                history.replaceState(null, '', id);
            };
            wasOpen ? setTimeout(go, 120) : go();
        });

        // Barra de progreso de lectura
        if (FX && progress) {
            ScrollTrigger.create({
                start: 0, end: 'max',
                onUpdate: (self) => { progress.style.transform = `scaleX(${self.progress})`; }
            });
        }

        // Enlace activo según la sección visible
        const links = $$('.nav__links a');
        const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (!en.isIntersecting) return;
                links.forEach((l) => l.removeAttribute('aria-current'));
                const link = byId.get(en.target.id);
                if (link) link.setAttribute('aria-current', 'true');
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        byId.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    }

    /* ═══ 6. TEXTO DIVIDIDO Y REVELADO ═════════════════════════════ */
    // Divide un elemento en palabras conservando etiquetas internas.
    // mask:true  -> palabras con máscara (revelado de títulos)
    // mask:false -> palabras simples (resaltado progresivo en el relato)
    function splitText(el, { mask = true } = {}) {
        const out = [];
        const walk = (node) => {
            Array.from(node.childNodes).forEach((child) => {
                if (child.nodeType === 3) {
                    const frag = document.createDocumentFragment();
                    child.textContent.split(/(\s+)/).forEach((part) => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                        if (mask) {
                            const w = document.createElement('span');
                            const i = document.createElement('span');
                            w.className = 'w'; i.className = 'wi'; i.textContent = part;
                            w.appendChild(i); frag.appendChild(w); out.push(i);
                        } else {
                            const s = document.createElement('span');
                            s.className = 'sw'; s.textContent = part;
                            frag.appendChild(s); out.push(s);
                        }
                    });
                    child.replaceWith(frag);
                } else if (child.nodeType === 1 && child.tagName !== 'BR') {
                    walk(child);
                }
            });
        };
        walk(el);
        return out;
    }

    const splits = new Map();

    function prepareText() {
        if (!FX) return;
        $$('[data-split]').forEach((el) => {
            const words = splitText(el);
            gsap.set(words, { yPercent: 118 });
            splits.set(el, words);
        });
        const story = $('[data-words]');
        if (story) splits.set(story, splitText(story, { mask: false }));
    }

    function initReveals() {
        if (!FX) return;
        // Títulos: las palabras suben desde su máscara.
        splits.forEach((words, el) => {
            if (el.hasAttribute('data-words')) return;
            ScrollTrigger.create({
                trigger: el, start: 'top 88%', once: true,
                onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.05 })
            });
        });
        // Elementos genéricos: entran en lote con escalonado natural.
        ScrollTrigger.batch('[data-reveal]', {
            start: 'top 91%', once: true,
            onEnter: (batch) => gsap.fromTo(batch,
                { opacity: 0, y: 38 },
                {
                    opacity: 1, y: 0, duration: 1.15, ease: 'expo.out', stagger: 0.09, overwrite: true,
                    onComplete: () => gsap.set(batch, { clearProps: 'transform' })
                })
        });
    }

    /* ═══ 7. HERO: INTRO Y SCROLL ══════════════════════════════════ */
    function heroIntro() {
        if (!FX) return;
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
        tl.from('.hero__stage', { opacity: 0, scale: 0.88, duration: 2.4 }, 0)
          .from('.hero__gl', { opacity: 0, duration: 2 }, 0.2)
          .to(state3d, { intro: 1, duration: 2.8 }, 0.15)
          .from('.nav__bar > *', { opacity: 0, y: -16, duration: 1, stagger: 0.08 }, 0.25)
          .from('.hero__kicker', { opacity: 0, y: 18, duration: 1.1 }, 0.3)
          .from('.hero__line > span', { yPercent: 115, duration: 1.6, stagger: 0.14 }, 0.45)
          .from('.hero__sub', { opacity: 0, y: 26, duration: 1.2 }, 0.95)
          .from('.hero__cta > *', { opacity: 0, y: 26, duration: 1.1, stagger: 0.1 }, 1.1);
    }

    function initHeroScroll() {
        if (!FX) return;
        const hero = $('#inicio');
        ScrollTrigger.create({
            trigger: hero, start: 'top top', end: 'bottom top', scrub: true,
            onUpdate: (s) => { state3d.scroll = s.progress; }
        });
        gsap.to('.hero__copy', {
            yPercent: -14, opacity: 0, ease: 'none',
            scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 25%', scrub: true }
        });
        gsap.to('.hero__stage', {
            yPercent: 10, ease: 'none',
            scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
        });
    }

    /* ═══ MARQUEE (único de la página) ═════════════════════════════ */
    function initMarquee() {
        const track = $('#stripTrack');
        if (!FX || !track) return;
        const tween = gsap.to(track, { xPercent: -50, ease: 'none', duration: 44, repeat: -1 });
        const speed = { v: 1 };
        // La franja acelera con la velocidad del scroll y vuelve a su ritmo.
        ScrollTrigger.create({
            start: 0, end: 'max',
            onUpdate: (self) => {
                const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 450, 7);
                if (boost > speed.v) speed.v = boost;
            }
        });
        gsap.ticker.add(() => {
            speed.v += (1 - speed.v) * 0.05;
            tween.timeScale(speed.v);
        });
    }

    /* ═══ RELATO DEL CARBURO: palabras que se encienden ════════════ */
    function initStory() {
        const el = $('[data-words]');
        if (!FX || !el) return;
        gsap.fromTo(splits.get(el), { opacity: 0.14 }, {
            opacity: 1, ease: 'none', stagger: 0.1,
            scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: 0.7 }
        });
    }

    /* ═══ 8. CONTADORES ════════════════════════════════════════════ */
    function initCounters() {
        if (!FX) return;
        $$('[data-count]').forEach((el) => {
            const end = parseFloat(el.dataset.count);
            const o = { v: 0 };
            el.textContent = '0';
            ScrollTrigger.create({
                trigger: el, start: 'top 90%', once: true,
                onEnter: () => gsap.to(o, {
                    v: end, duration: 2.6, ease: 'power3.out',
                    onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('es-MX'); }
                })
            });
        });
    }

    /* ═══ 9. APLICACIONES: SCROLL HORIZONTAL FIJADO ════════════════ */
    function initHScroll() {
        const sec = $('#aplicaciones');
        const track = $('#hTrack');
        const bar = $('#hBar');
        if (!FX || !sec || !track) return;

        const mm = gsap.matchMedia();
        mm.add('(min-width: 900px)', () => {
            sec.classList.add('is-pinned');
            const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
            gsap.to(track, {
                x: () => -dist(), ease: 'none',
                scrollTrigger: {
                    trigger: sec, start: 'top top', end: () => `+=${dist()}`,
                    pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 10,
                    onUpdate: (s) => { if (bar) bar.style.transform = `scaleX(${s.progress})`; }
                }
            });
            return () => sec.classList.remove('is-pinned');
        });
    }

    /* ═══ 10. PROCESO ══════════════════════════════════════════════ */
    function initProcess() {
        const fill = $('#stepsFill');
        const wrap = $('#steps');
        const steps = $$('.step');
        if (!fill || !wrap) return;
        if (!FX) {
            fill.style.transform = 'scaleY(1)';
            steps.forEach((s) => s.classList.add('is-active'));
            return;
        }
        gsap.to(fill, {
            scaleY: 1, ease: 'none',
            scrollTrigger: { trigger: wrap, start: 'top 62%', end: 'bottom 62%', scrub: 0.5 }
        });
        steps.forEach((s) => ScrollTrigger.create({
            trigger: s, start: 'top 66%',
            onEnter: () => s.classList.add('is-active'),
            onLeaveBack: () => s.classList.remove('is-active')
        }));
    }

    /* ═══ 11. EFECTOS DE PUNTERO ═══════════════════════════════════ */
    function initPointerFX() {
        if (!finePointer) return;
        // Spotlight: el borde de la tarjeta se ilumina donde está el cursor.
        $$('.spot').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                el.style.setProperty('--mx', `${e.clientX - r.left}px`);
                el.style.setProperty('--my', `${e.clientY - r.top}px`);
            }, { passive: true });
        });
        // Botones magnéticos
        if (!FX) return;
        $$('[data-magnetic]').forEach((el) => {
            const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
            const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
                yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
            });
            el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
        });
    }

    /* ═══ 12. FAQ Y FORMULARIO ═════════════════════════════════════ */
    function initFaq() {
        $$('.faq__q').forEach((btn) => btn.addEventListener('click', () => {
            const item = btn.closest('.faq__item');
            const open = !item.classList.contains('is-open');
            $$('.faq__item.is-open').forEach((i) => {
                if (i === item) return;
                i.classList.remove('is-open');
                i.querySelector('.faq__q').setAttribute('aria-expanded', 'false');
            });
            item.classList.toggle('is-open', open);
            btn.setAttribute('aria-expanded', String(open));
            if (FX) setTimeout(() => ScrollTrigger.refresh(), 800);
        }));
    }

    function initForm() {
        const form = $('#waForm');
        if (!form) return;
        const btn = $('#formBtn');
        const hint = $('#formHint');
        const name = $('#f-name');
        const phone = $('#f-phone');
        const interest = $('#f-interest');
        const detail = $('#f-msg');
        const label = btn.querySelector('span');
        const labelDefault = label.textContent;
        const hintDefault = hint.textContent;

        const setError = (input, text) => {
            const field = input.closest('.field');
            field.classList.toggle('is-invalid', Boolean(text));
            field.querySelector('.field__err').textContent = text || '';
            input.setAttribute('aria-invalid', String(Boolean(text)));
        };
        name.addEventListener('input', () => { if (name.value.trim().length >= 2) setError(name, ''); });
        interest.addEventListener('change', () => setError(interest, ''));

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            let firstBad = null;
            if (name.value.trim().length < 2) { setError(name, 'Escribe tu nombre para poder atenderte.'); firstBad = firstBad || name; }
            else setError(name, '');
            if (!interest.value) { setError(interest, 'Elige qué te interesa cotizar.'); firstBad = firstBad || interest; }
            else setError(interest, '');
            if (firstBad) { firstBad.focus(); return; }

            const lines = [
                `Hola ${CONFIG.brand}, soy ${name.value.trim()}.`,
                `Me interesa: ${interest.value}.`
            ];
            if (detail.value.trim()) lines.push(`Detalles: ${detail.value.trim()}`);
            if (phone.value.trim()) lines.push(`Mi teléfono: ${phone.value.trim()}`);
            lines.push('Les escribo desde su página web.');

            const url = waUrl(lines.join('\n'));
            const win = window.open(url, '_blank');
            if (win) win.opener = null; else window.location.href = url;

            form.classList.add('is-sent');
            label.textContent = 'Abriendo WhatsApp';
            hint.textContent = 'Listo. Se abrió WhatsApp con tu mensaje.';
            setTimeout(() => {
                form.classList.remove('is-sent');
                label.textContent = labelDefault;
                hint.textContent = hintDefault;
            }, 6000);
        });
    }

    function initWaFloat() {
        const fab = $('#waFloat');
        if (!fab) return;
        // Un saludo breve, una sola vez, para invitar a escribir.
        setTimeout(() => {
            fab.classList.add('is-tip');
            setTimeout(() => fab.classList.remove('is-tip'), 4800);
        }, 9000);
    }

    /* ═══ 13. FONDO DE PARTÍCULAS 2D ═══════════════════════════════ */
    function initBackdrop() {
        const canvas = $('#bgFX');
        const ctx = canvas && canvas.getContext('2d');
        if (!ctx) return;

        let w = 0, h = 0, pts = [];
        const mouse = { x: -9999, y: -9999 };
        let running = true;

        const build = () => {
            w = window.innerWidth; h = window.innerHeight;
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            canvas.width = w * dpr; canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const n = w < 700 ? 34 : Math.min(84, Math.floor((w * h) / 21000));
            pts = Array.from({ length: n }, () => ({
                x: Math.random() * w, y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2,
                r: Math.random() * 1.3 + 0.5, z: Math.random() * 0.8 + 0.2
            }));
        };

        const draw = () => {
            ctx.clearRect(0, 0, w, h);
            const reach = w < 700 ? 105 : 150;
            const scrollY = window.scrollY || 0;
            const pos = pts.map((p) => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
                if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;
                const px = p.x;
                const py = (((p.y - scrollY * 0.14 * p.z) % h) + h) % h;     // parallax con la profundidad
                const dx = px - mouse.x, dy = py - mouse.y, d2 = dx * dx + dy * dy;
                if (d2 < 16000) { const f = (1 - d2 / 16000) * 0.03; p.x += dx * f; p.y += dy * f; }
                return [px, py, p];
            });

            ctx.lineWidth = 1;
            for (let i = 0; i < pos.length; i++) {
                for (let j = i + 1; j < pos.length; j++) {
                    const dx = pos[i][0] - pos[j][0], dy = pos[i][1] - pos[j][1];
                    const d = Math.hypot(dx, dy);
                    if (d < reach) {
                        ctx.strokeStyle = `rgba(126,161,242,${((1 - d / reach) * 0.2).toFixed(3)})`;
                        ctx.beginPath(); ctx.moveTo(pos[i][0], pos[i][1]); ctx.lineTo(pos[j][0], pos[j][1]); ctx.stroke();
                    }
                }
            }
            ctx.fillStyle = 'rgba(160,188,245,.6)';
            pos.forEach(([x, y, p]) => { ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill(); });
        };

        const loop = () => { if (running) { draw(); requestAnimationFrame(loop); } };

        build();
        if (reduceMotion) { draw(); window.addEventListener('resize', () => { build(); draw(); }); return; }

        window.addEventListener('resize', build);
        if (finePointer) window.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running) loop();
        });
        loop();
    }

    /* ═══ 14. HERO 3D (THREE.JS) ═══════════════════════════════════
       Escena procedural: un dado de carburo (cuerpo de acero + núcleo oscuro
       con orificio cónico), un buril con pastilla de carburo (cuerpo azul,
       punta metálica y franja verde como en la foto del producto) y pastillas
       en órbita. Todo se genera por código, no hay modelos externos.        */
    async function initHero3D() {
        const canvas = $('#heroGL');
        const hero = $('#inicio');
        if (!canvas || !hero) return;

        let THREE, RoomEnvironment, RoundedBoxGeometry;
        try {
            THREE = await import('three');
            ({ RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js'));
            ({ RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js'));
        } catch (err) {
            console.warn(`[${CONFIG.brand}] 3D no disponible, se usa el respaldo estático.`, err);
            hero.classList.add('no-gl');
            return;
        }

        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
        } catch (err) {
            hero.classList.add('no-gl');
            return;
        }
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;

        const scene = new THREE.Scene();
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
        camera.position.set(0, 0.4, 11.5);
        camera.lookAt(0, 0, 0);

        const rim = new THREE.DirectionalLight(0x7ea1f2, 2.8);
        rim.position.set(-5, 3, -4);
        const key = new THREE.DirectionalLight(0xffffff, 1.2);
        key.position.set(4, 5, 6);
        scene.add(rim, key);

        /* Materiales */
        const steel = new THREE.MeshPhysicalMaterial({ color: 0xc9d3e3, metalness: 1, roughness: 0.3, clearcoat: 0.25, clearcoatRoughness: 0.4 });
        const carbide = new THREE.MeshPhysicalMaterial({ color: 0x2b3448, metalness: 0.92, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12 });
        const carbideTip = new THREE.MeshPhysicalMaterial({ color: 0xbcc3d0, metalness: 1, roughness: 0.2 });
        const shankBlue = new THREE.MeshPhysicalMaterial({ color: 0x27479a, metalness: 0.65, roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.25 });
        const bandGreen = new THREE.MeshPhysicalMaterial({ color: 0x1d9157, metalness: 0.4, roughness: 0.4, clearcoat: 0.5 });
        const lineBlue = new THREE.MeshBasicMaterial({ color: 0x7ea1f2, transparent: true, opacity: 0.5 });

        const rig = new THREE.Group();
        scene.add(rig);

        /* Dado de carburo */
        const dieTilt = new THREE.Group();
        const dieSpin = new THREE.Group();
        dieTilt.rotation.set(0.95, 0, 0.16);
        dieTilt.add(dieSpin);
        rig.add(dieTilt);

        const casingShape = new THREE.Shape();
        casingShape.absarc(0, 0, 1.15, 0, Math.PI * 2, false);
        const bore = new THREE.Path();
        bore.absarc(0, 0, 0.5, 0, Math.PI * 2, true);
        casingShape.holes.push(bore);
        const casingGeo = new THREE.ExtrudeGeometry(casingShape, {
            depth: 0.9, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4, curveSegments: 96
        });
        casingGeo.translate(0, 0, -0.45);
        casingGeo.rotateX(-Math.PI / 2);
        dieSpin.add(new THREE.Mesh(casingGeo, steel));

        const nibProfile = [
            [0.5, -0.5], [0.5, 0.52], [0.4, 0.52], [0.36, 0.5], [0.1, 0.06], [0.1, -0.12], [0.24, -0.5], [0.5, -0.5]
        ].map(([r, y]) => new THREE.Vector2(r, y));
        const nibMat = carbide.clone();
        nibMat.side = THREE.DoubleSide;
        dieSpin.add(new THREE.Mesh(new THREE.LatheGeometry(nibProfile, 96), nibMat));

        const throat = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.014, 12, 72), new THREE.MeshBasicMaterial({ color: 0x9db7f5, toneMapped: false }));
        throat.rotation.x = Math.PI / 2;
        throat.position.y = 0.06;
        dieSpin.add(throat);

        // Luz azul dentro del orificio y detalles de maquinado en la cara superior
        const boreLight = new THREE.PointLight(0x7ea1f2, 5, 3.2, 2);
        boreLight.position.set(0, 0.45, 0);
        dieSpin.add(boreLight);
        const seat = new THREE.Mesh(new THREE.RingGeometry(0.52, 0.68, 96), carbide);
        seat.rotation.x = -Math.PI / 2;
        seat.position.y = 0.505;
        const groove = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.01, 8, 160), new THREE.MeshBasicMaterial({ color: 0x4a7be8, transparent: true, opacity: 0.55 }));
        groove.rotation.x = Math.PI / 2;
        groove.position.y = 0.502;
        dieSpin.add(seat, groove);

        /* Buril con pastilla de carburo */
        const tool = new THREE.Group();
        const shank = new THREE.Mesh(new RoundedBoxGeometry(3.1, 0.34, 0.34, 5, 0.035), shankBlue);
        const band = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.35, 0.35, 4, 0.03), bandGreen);
        band.position.x = -1.5;
        const tipShape = new THREE.Shape();
        tipShape.moveTo(-0.28, -0.17); tipShape.lineTo(0.28, -0.17); tipShape.lineTo(0.5, 0);
        tipShape.lineTo(0.28, 0.17); tipShape.lineTo(-0.28, 0.17); tipShape.closePath();
        const tipGeo = new THREE.ExtrudeGeometry(tipShape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 });
        tipGeo.rotateX(-Math.PI / 2);
        const tip = new THREE.Mesh(tipGeo, carbideTip);
        tip.position.set(1.3, 0.17, 0);
        tool.add(shank, band, tip);
        tool.scale.setScalar(0.82);
        rig.add(tool);

        /* Pastillas en órbita */
        const triGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.07, 3);
        const hexGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.07, 6);
        const inserts = Array.from({ length: 5 }, (_, i) => {
            const m = new THREE.Mesh(i % 2 ? hexGeo : triGeo, i % 2 ? carbide : carbideTip);
            m.userData = { a: (i / 5) * Math.PI * 2, r: 2.4 + (i % 3) * 0.28, s: 0.32 + (i % 3) * 0.07, h: 0.5 + (i % 2) * 0.35 };
            rig.add(m);
            return m;
        });

        /* Anillos de medición */
        const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.008, 8, 200), lineBlue);
        ringA.rotation.x = Math.PI / 2.3;
        const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.006, 8, 200), lineBlue.clone());
        ringB.rotation.set(1.1, 0.5, 0);
        rig.add(ringA, ringB);

        /* Partículas (virutas de luz) */
        const small = window.innerWidth < 700;
        const count = small ? 150 : 380;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const r = 2.2 + Math.random() * 4.6;
            const th = Math.random() * Math.PI * 2;
            const ph = Math.acos(2 * Math.random() - 1);
            positions[i * 3] = r * Math.sin(ph) * Math.cos(th);
            positions[i * 3 + 1] = r * Math.cos(ph) * 0.8;
            positions[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
        }
        const sprite = document.createElement('canvas');
        sprite.width = sprite.height = 64;
        const sg = sprite.getContext('2d');
        const grad = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.35, 'rgba(255,255,255,.35)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        sg.fillStyle = grad; sg.fillRect(0, 0, 64, 64);
        const pGeo = new THREE.BufferGeometry();
        pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const points = new THREE.Points(pGeo, new THREE.PointsMaterial({
            size: 0.07, map: new THREE.CanvasTexture(sprite), color: 0xa9c0f7, transparent: true, opacity: 0.85,
            depthWrite: false, blending: THREE.AdditiveBlending
        }));
        scene.add(points);

        /* Tamaño, posición del conjunto y cámara */
        let fit = 1;
        const resize = () => {
            const w = canvas.clientWidth, h = canvas.clientHeight;
            if (!w || !h) return;
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 700 ? 1.6 : 1.8));
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            // Desplaza la escena para que coincida con el centro de los anillos CSS (--sx / --sy).
            const cs = getComputedStyle(hero);
            const sx = (parseFloat(cs.getPropertyValue('--sx')) || 50) / 100;
            const sy = (parseFloat(cs.getPropertyValue('--sy')) || 50) / 100;
            camera.setViewOffset(w, h, (0.5 - sx) * w, (0.5 - sy) * h, w, h);
            camera.updateProjectionMatrix();
            const visibleW = 2 * 11.5 * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
            fit = Math.min(1, (visibleW * (w > h ? 0.62 : 1)) / 5.4);
            if (reduceMotion) renderFrame(1.4);
        };

        /* Animación */
        const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
        if (finePointer) {
            window.addEventListener('pointermove', (e) => {
                mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
                mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
            }, { passive: true });
        }
        const clock = new THREE.Clock();
        const ease = (k) => 1 - Math.pow(1 - k, 3);

        function renderFrame(t) {
            mouse.x += (mouse.tx - mouse.x) * 0.05;
            mouse.y += (mouse.ty - mouse.y) * 0.05;
            const intro = ease(state3d.intro);
            const s = state3d.scroll;

            rig.scale.setScalar(fit * (0.55 + 0.45 * intro));
            rig.rotation.y = Math.sin(t * 0.25) * 0.28 + mouse.x * 0.45 + s * 1.4 + (1 - intro) * -1.2;
            rig.rotation.x = mouse.y * 0.22 - s * 0.4;
            rig.position.y = -s * 1.1;

            dieSpin.rotation.y = t * 0.55;
            dieTilt.position.y = Math.sin(t * 0.9) * 0.08;
            throat.scale.setScalar(1 + Math.sin(t * 2.2) * 0.12);

            tool.position.set(-1.7, -1.6 + Math.sin(t * 0.8 + 1) * 0.1, 1.1);
            tool.rotation.set(0.15, -0.45 + Math.sin(t * 0.4) * 0.08, 0.28 + Math.sin(t * 0.6) * 0.05);

            inserts.forEach((m) => {
                const u = m.userData, a = u.a + t * u.s;
                m.position.set(Math.cos(a) * u.r, Math.sin(a * 0.7) * u.h, Math.sin(a) * u.r);
                m.rotation.set(t * 0.8 + u.a, t * 0.6, t * 0.4);
            });

            ringA.rotation.z = t * 0.15;
            ringB.rotation.z = -t * 0.1;
            ringA.material.opacity = 0.35 + Math.sin(t * 1.4) * 0.15;
            points.rotation.y = t * 0.03;
            points.rotation.x = Math.sin(t * 0.1) * 0.1;

            renderer.render(scene, camera);
        }

        let raf = 0, visible = true;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            renderFrame(clock.getElapsedTime());
        };
        const start = () => { if (!raf && visible && !document.hidden && !reduceMotion) loop(); };
        const stop = () => { cancelAnimationFrame(raf); raf = 0; };

        new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(hero);
        document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
        canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); hero.classList.add('no-gl'); });
        new ResizeObserver(resize).observe(canvas);

        resize();
        hero.classList.add('gl-ready');
        reduceMotion ? renderFrame(1.4) : start();
    }

    /* ═══ ARRANQUE ═════════════════════════════════════════════════ */
    function boot() {
        safe('whatsapp', initWhatsApp);
        safe('smooth', initSmoothScroll);
        safe('text', prepareText);                  // antes de medir cualquier ScrollTrigger
        safe('nav', initNav);
        safe('backdrop', initBackdrop);
        safe('faq', initFaq);
        safe('form', initForm);
        safe('wa-float', initWaFloat);
        safe('hero3d', initHero3D);

        // ScrollTrigger: crear en orden de aparición en la página (los pines primero que lo que sigue).
        safe('hero-scroll', initHeroScroll);
        safe('marquee', initMarquee);
        safe('hscroll', initHScroll);
        safe('story', initStory);
        safe('counters', initCounters);
        safe('process', initProcess);
        safe('reveals', initReveals);
        safe('pointer', initPointerFX);

        runLoader().then(() => {
            if (lenis) lenis.start();
            safe('hero-intro', heroIntro);
            if (FX) setTimeout(() => ScrollTrigger.refresh(), 300);
            ready = true;
        });

        window.addEventListener('load', () => { if (FX) ScrollTrigger.refresh(); });

        // Salvavidas: si algo impidiera las animaciones, el contenido nunca queda oculto.
        setTimeout(() => { if (!ready) root.classList.add('force-visible'); }, 9000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
