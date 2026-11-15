(function () {
    'use strict';
    const client = window.EgodactAddonClient;
    const L = window.EgodactAddonLib;
    if (!client || !L) return;

    const { ui, game, data, theme, el } = L;

    client.registerAddon({
        id: 'marketplace-test-addon',
        name: 'Marketplace Test Addon',
        version: '1.0.0',
        description: 'Test addon voor de marketplace: zwevende knop + klein spelletje.',
        author: 'MaxiTaxi'
    });

    client.registerMenu({
        addonId: 'marketplace-test-addon',
        id: 'mta-menu',
        title: 'Marketplace Test',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/></svg>'
    });

    let fab = null;
    let backdrop = null;
    let loop = null;

    function ensureFab() {
        if (fab && document.body.contains(fab)) return fab;
        const t = theme();
        fab = document.createElement('button');
        fab.type = 'button';
        fab.title = 'Marketplace Test Game';
        fab.setAttribute('aria-label', 'Marketplace Test Game');
        fab.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>';
        Object.assign(fab.style, {
            position: 'fixed',
            right: '18px',
            bottom: '18px',
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            border: '1px solid ' + t.rand,
            background: t.accent,
            color: t.accentTekst,
            cursor: 'pointer',
            zIndex: '2147483000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,.35)',
            padding: '0'
        });
        fab.addEventListener('mouseenter', function () { fab.style.transform = 'scale(1.05)'; });
        fab.addEventListener('mouseleave', function () { fab.style.transform = 'scale(1)'; });
        fab.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); openGame(); });
        document.body.appendChild(fab);
        return fab;
    }

    function openGame() {
        if (backdrop && document.body.contains(backdrop)) return;
        const t = theme();
        let score = 0;
        let timeLeft = 20;
        const store = data.storage('marketplace-test');
        let best = store.get('best', 0);

        const { canvas, ctx, width, height } = game.createCanvas(null, 320, 240, { background: t.veld, radius: 8 });
        let target = { x: width / 2 - 18, y: height / 2 - 18, r: 18, vx: 140, vy: 110 };
        let pops = [];

        const scoreEl = el('div', { style: { fontSize: '14px', fontWeight: 'bold', color: t.tekst } });
        const infoEl = el('div', { style: { fontSize: '12px', color: t.tekstZacht } });
        function updateHud() {
            scoreEl.textContent = 'Score: ' + score + '  •  Beste: ' + best;
            infoEl.textContent = 'Klik op de bol voordat de tijd op is. Tijd: ' + Math.max(0, Math.ceil(timeLeft)) + 's';
        }
        updateHud();

        function placeTarget() {
            target.x = target.r + Math.random() * (width - target.r * 2);
            target.y = target.r + Math.random() * (height - target.r * 2);
            const speed = 120 + Math.min(score * 6, 120);
            const ang = Math.random() * Math.PI * 2;
            target.vx = Math.cos(ang) * speed;
            target.vy = Math.sin(ang) * speed;
        }
        placeTarget();

        canvas.style.cursor = 'crosshair';
        canvas.addEventListener('click', function (e) {
            if (timeLeft <= 0) return;
            const rect = canvas.getBoundingClientRect();
            const mx = (e.clientX - rect.left) * (width / rect.width);
            const my = (e.clientY - rect.top) * (height / rect.height);
            const dx = mx - target.x, dy = my - target.y;
            if (dx * dx + dy * dy <= target.r * target.r) {
                score++;
                if (score > best) { best = score; store.set('best', best); }
                pops.push({ x: target.x, y: target.y, life: 0.4, color: t.accent });
                placeTarget();
                updateHud();
            }
        });

        loop = game.loop(function (dt) {
            if (timeLeft > 0) {
                timeLeft -= dt;
                if (timeLeft <= 0) {
                    timeLeft = 0;
                    if (score > best) { best = score; store.set('best', best); }
                    updateHud();
                }
            }
            target.x += target.vx * dt;
            target.y += target.vy * dt;
            if (target.x - target.r <= 0) { target.x = target.r; target.vx *= -1; }
            if (target.x + target.r >= width) { target.x = width - target.r; target.vx *= -1; }
            if (target.y - target.r <= 0) { target.y = target.r; target.vy *= -1; }
            if (target.y + target.r >= height) { target.y = height - target.r; target.vy *= -1; }
            pops = pops.filter(function (p) { p.life -= dt; return p.life > 0; });
        }, function () {
            game.clear(ctx, t.veld);
            game.rect(ctx, 0, 0, width, height, t.veld, { radius: 8 });
            // target
            ctx.save();
            ctx.shadowColor = t.accent; ctx.shadowBlur = 12;
            game.circle(ctx, target.x, target.y, target.r, t.accent);
            ctx.restore();
            game.circle(ctx, target.x, target.y, target.r - 6, t.modal);
            // pops
            pops.forEach(function (p) {
                ctx.globalAlpha = Math.max(0, p.life / 0.4);
                game.circle(ctx, p.x, p.y, 10 + (0.4 - p.life) * 30, p.color);
                ctx.globalAlpha = 1;
            });
            if (timeLeft <= 0) {
                ctx.fillStyle = 'rgba(0,0,0,0.55)';
                ctx.fillRect(0, 0, width, height);
                game.text(ctx, 'Tijd voorbij!', width / 2, 90, { color: '#fff', size: 22, align: 'center', bold: true });
                game.text(ctx, 'Score: ' + score + '  •  Beste: ' + best, width / 2, 125, { color: '#fff', size: 14, align: 'center' });
                game.text(ctx, 'Klik op "Opnieuw" om nog eens te spelen', width / 2, 150, { color: t.tekstZacht, size: 12, align: 'center' });
            } else {
                game.text(ctx, 'Klik de bol!', 10, 10, { color: t.tekstZacht, size: 12 });
            }
        });

        function restart() {
            score = 0; timeLeft = 20; pops = []; placeTarget(); updateHud();
        }

        const body = ui.col({ gap: 8, children: [
            el('div', { text: 'Marketplace test: vang de bol zo vaak mogelijk in 20 seconden.', style: { color: t.tekstZacht, fontSize: '12px' } }),
            ui.row({ justify: 'space-between', children: [scoreEl, infoEl] }),
            canvas,
            ui.row({ gap: 8, children: [
                ui.button('Opnieuw', restart, { background: t.accent, color: t.accentTekst }),
                ui.button('Reset beste', function () { best = 0; store.set('best', 0); updateHud(); }, { background: t.veld, color: t.tekst })
            ] })
        ] });

        backdrop = ui.modal('Marketplace Test - Mini Game', body);
        const observer = new MutationObserver(function () {
            if (!document.body.contains(backdrop)) {
                if (loop) { try { loop.stop(); } catch (e) {} loop = null; }
                observer.disconnect();
                backdrop = null;
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    client.onOpen('mta-menu', openGame);

    // Floating button (kleine zwevende knop)
    function initFab() { try { ensureFab(); } catch (e) { console.warn('FAB init failed', e); } }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFab);
    } else {
        initFab();
    }
    // Herstel FAB als hij verdwijnt (SPA navigatie/re-render)
    setInterval(function () { try { if (!fab || !document.body.contains(fab)) ensureFab(); } catch (e) {} }, 3000);
})();
