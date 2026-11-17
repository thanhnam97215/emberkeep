// Emberkeep — Last Light Defense
// Original tower-defense x arcade survival game. No external assets, fully offline.
(function () {
  'use strict';

  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var W = 960, H = 600;
  var CX = W / 2, CY = H / 2;
  var HEARTH_R = 34;
  var NO_BUILD_R = 80;
  var TOTAL_WAVES = 10;

  // ---------- DOM ----------
  var hudWave = document.getElementById('hudWave');
  var hudScore = document.getElementById('hudScore');
  var hudGold = document.getElementById('hudGold');
  var hpFill = document.getElementById('hpFill');
  var hpText = document.getElementById('hpText');
  var hudLeft = document.getElementById('hudLeft');
  var waveBtn = document.getElementById('waveBtn');
  var novaBtn = document.getElementById('novaBtn');
  var novaCd = document.getElementById('novaCd');
  var startScreen = document.getElementById('startScreen');
  var pauseScreen = document.getElementById('pauseScreen');
  var endScreen = document.getElementById('endScreen');
  var endBadge = document.getElementById('endBadge');
  var endTitle = document.getElementById('endTitle');
  var endText = document.getElementById('endText');
  var finalScore = document.getElementById('finalScore');
  var finalWave = document.getElementById('finalWave');
  var finalKills = document.getElementById('finalKills');
  var waveBanner = document.getElementById('waveBanner');
  var waveBannerText = document.getElementById('waveBannerText');
  var selectedPanel = document.getElementById('selectedPanel');
  var selName = document.getElementById('selName');
  var selInfo = document.getElementById('selInfo');
  var upgradeBtn = document.getElementById('upgradeBtn');
  var sellBtn = document.getElementById('sellBtn');
  var soundToggle = document.getElementById('soundToggle');

  var cards = {
    ember: document.getElementById('cardEmber'),
    frost: document.getElementById('cardFrost'),
    storm: document.getElementById('cardStorm')
  };

  // ---------- Config ----------
  var TOWERS = {
    ember: { name: 'Ember Spire', cost: 50, range: 138, damage: 12, rate: 3.2, projSpeed: 460, color: '#ff6b35', glow: '#ffb199', desc: 'Fast shots' },
    frost: { name: 'Frost Bloom', cost: 80, range: 128, damage: 7, rate: 1.9, projSpeed: 380, color: '#6fd7ff', glow: '#d6f6ff', desc: 'Slows 45%', slow: 0.55, slowDur: 1.7 },
    storm: { name: 'Storm Eye', cost: 140, range: 165, damage: 30, rate: 0.85, projSpeed: 520, color: '#c084fc', glow: '#f3e8ff', desc: 'Splash 70', splash: 72 }
  };

  var ENEMIES = {
    shade: { hp: 30, speed: 54, reward: 12, score: 50, radius: 14, dmg: 8, color: '#8b7cf6' },
    wisp:  { hp: 18, speed: 96, reward: 14, score: 70, radius: 11, dmg: 6, color: '#fbbf24' },
    brute: { hp: 125, speed: 35, reward: 28, score: 150, radius: 20, dmg: 16, color: '#f472b6' },
    boss:  { hp: 980, speed: 29, reward: 260, score: 2000, radius: 31, dmg: 30, color: '#ef4444' }
  };

  function waveComp(n) {
    // Returns array of enemy type keys for wave n (1-based)
    var list = [];
    function add(type, count) { for (var i = 0; i < count; i++) list.push(type); }
    if (n === 1) { add('shade', 6); }
    else if (n === 2) { add('shade', 8); add('wisp', 2); }
    else if (n === 3) { add('shade', 6); add('wisp', 6); }
    else if (n === 4) { add('shade', 10); add('wisp', 4); add('brute', 1); }
    else if (n === 5) { add('shade', 8); add('wisp', 6); add('brute', 3); }
    else if (n === 6) { add('shade', 12); add('wisp', 8); add('brute', 3); }
    else if (n === 7) { add('shade', 8); add('wisp', 10); add('brute', 6); }
    else if (n === 8) { add('shade', 16); add('wisp', 10); add('brute', 5); }
    else if (n === 9) { add('shade', 12); add('wisp', 12); add('brute', 8); }
    else { add('shade', 8); add('wisp', 6); add('brute', 4); add('boss', 1); }
    // Shuffle lightly, but keep boss last on wave 10
    var boss = null;
    if (n === 10) { boss = list.pop(); }
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = list[i]; list[i] = list[j]; list[j] = t;
    }
    if (boss) list.push(boss);
    return list;
  }

  // ---------- State ----------
  var state = 'menu'; // menu | playing | paused | over
  var towers = [], enemies = [], projectiles = [], particles = [], texts = [], rings = [];
  var gold, score, kills, hearthHp, hearthMax, wave, waveActive, spawnQueue, spawnTimer, spawnInterval;
  var selectedBuild = null; // 'ember' | 'frost' | 'storm' | null
  var selectedTower = null;
  var mouse = { x: CX, y: 120, inside: false };
  var novaCooldown = 0, NOVA_CD = 8, NOVA_R = 135, NOVA_DMG = 75;
  var time = 0, shake = 0, soundOn = true;
  var stars = [];
  for (var s = 0; s < 120; s++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + 0.4, tw: Math.random() * Math.PI * 2 });
  }

  // ---------- Audio (tiny synth, no files) ----------
  var audioCtx = null;
  function beep(freq, dur, type, vol) {
    if (!soundOn) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.06, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + dur);
    } catch (e) { /* audio is optional */ }
  }
  function sfx(name) {
    if (name === 'shoot') beep(620 + Math.random() * 120, 0.06, 'triangle', 0.025);
    else if (name === 'kill') beep(320, 0.12, 'sine', 0.07);
    else if (name === 'place') { beep(440, 0.09, 'sine', 0.08); setTimeout(function () { beep(660, 0.1, 'sine', 0.07); }, 70); }
    else if (name === 'nova') { beep(180, 0.35, 'sawtooth', 0.09); setTimeout(function () { beep(880, 0.18, 'sine', 0.06); }, 90); }
    else if (name === 'hurt') beep(140, 0.25, 'sawtooth', 0.11);
    else if (name === 'wave') { beep(523, 0.12, 'sine', 0.08); setTimeout(function () { beep(784, 0.14, 'sine', 0.08); }, 110); }
    else if (name === 'win') { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { beep(f, 0.22, 'sine', 0.09); }, i * 130); }); }
    else if (name === 'coin') beep(950, 0.07, 'sine', 0.05);
  }

  // ---------- Helpers ----------
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rand(a, b) { return a + Math.random() * (b - a); }

  function towerDamage(t) { return Math.round(TOWERS[t.type].damage * Math.pow(1.6, t.level - 1)); }
  function towerRange(t) { return TOWERS[t.type].range + (t.level - 1) * 14; }
  function upgradeCost(t) {
    if (t.level >= 3) return null;
    return Math.round(TOWERS[t.type].cost * 0.85 * t.level);
  }
  function spawnPos() {
    var side = Math.floor(Math.random() * 4);
    var m = 18;
    if (side === 0) return { x: rand(m, W - m), y: m };
    if (side === 1) return { x: rand(m, W - m), y: H - m };
    if (side === 2) return { x: m, y: rand(m, H - m) };
    return { x: W - m, y: rand(m, H - m) };
  }
  function canPlace(x, y) {
    if (x < 24 || x > W - 24 || y < 24 || y > H - 24) return false;
    if (dist(x, y, CX, CY) < NO_BUILD_R) return false;
    for (var i = 0; i < towers.length; i++) {
      if (dist(x, y, towers[i].x, towers[i].y) < 44) return false;
    }
    return true;
  }
  function addParticles(x, y, color, n, speed) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = rand(speed * 0.3, speed);
      particles.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(1.5, 4), color: color, life: rand(0.35, 0.8), max: 0.8 });
    }
  }
  function addText(x, y, str, color) {
    texts.push({ x: x, y: y, str: str, color: color || '#fff', life: 1 });
  }
  function showBanner(str) {
    waveBannerText.textContent = str;
    waveBanner.classList.remove('hidden');
    clearTimeout(showBanner._t);
    showBanner._t = setTimeout(function () { waveBanner.classList.add('hidden'); }, 2200);
  }

  // ---------- Game flow ----------
  function resetGame() {
    towers = []; enemies = []; projectiles = []; particles = []; texts = []; rings = [];
    gold = 150; score = 0; kills = 0;
    hearthMax = 100; hearthHp = 100;
    wave = 0; waveActive = false; spawnQueue = []; spawnTimer = 0; spawnInterval = 0.9;
    selectedBuild = null; selectedTower = null;
    novaCooldown = 0; time = 0; shake = 0;
    updateBuildUI(); updateSelectedPanel(); updateHUD();
    waveBtn.textContent = '▶ Start Wave 1';
    waveBtn.disabled = false;
  }

  function startGame() {
    resetGame();
    state = 'playing';
    startScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    showBanner('BUILD YOUR DEFENSE — THEN START WAVE 1');
    sfx('wave');
  }

  function startWave() {
    if (state !== 'playing' || waveActive) return;
    if (wave >= TOTAL_WAVES) return;
    wave++;
    spawnQueue = waveComp(wave);
    spawnInterval = Math.max(0.42, 0.95 - wave * 0.05);
    spawnTimer = 0.2;
    waveActive = true;
    waveBtn.disabled = true;
    waveBtn.textContent = 'Wave ' + wave + ' in progress…';
    showBanner(wave === TOTAL_WAVES ? 'FINAL WAVE — THE HOLLOW KING AWAKENS' : 'WAVE ' + wave + ' / ' + TOTAL_WAVES);
    sfx('wave');
    updateHUD();
  }

  function endWave() {
    waveActive = false;
    var bonusGold = 40 + wave * 6;
    var bonusScore = 150 + wave * 50;
    gold += bonusGold; score += bonusScore;
    addText(CX, CY - 70, '+' + bonusGold + ' gold  ·  +' + bonusScore + ' score', '#ffc94d');
    sfx('coin');
    if (wave >= TOTAL_WAVES) { endGame(true); return; }
    waveBtn.disabled = false;
    waveBtn.textContent = '▶ Start Wave ' + (wave + 1);
    showBanner('WAVE ' + wave + ' CLEARED  ·  +' + bonusGold + ' GOLD');
    updateHUD();
  }

  function endGame(won) {
    state = 'over';
    waveBtn.disabled = true;
    endScreen.classList.remove('hidden');
    if (won) {
      var hpBonus = hearthHp * 20;
      score += hpBonus;
      endBadge.textContent = '✦ VICTORY ✦';
      endTitle.textContent = 'The Dawn Returns';
      endText.textContent = 'All 10 waves are banished. The Hearth still burns — and so does your legend. Hearth bonus: +' + hpBonus + ' points.';
      sfx('win');
    } else {
      endBadge.textContent = 'THE LIGHT FADES';
      endTitle.textContent = 'The Hearth Has Fallen';
      endText.textContent = 'The Shades overran the keep on wave ' + Math.max(1, wave) + '. Rebuild smarter: frost near the center, storm on the clumps.';
      sfx('hurt');
    }
    finalScore.textContent = score.toLocaleString();
    finalWave.textContent = (won ? TOTAL_WAVES : Math.max(0, wave - (waveActive ? 1 : 0))) + ' / ' + TOTAL_WAVES;
    finalKills.textContent = kills;
    updateHUD();
  }

  function damageHearth(amount) {
    hearthHp = Math.max(0, hearthHp - amount);
    shake = 10;
    addParticles(CX, CY, '#fb7185', 22, 220);
    sfx('hurt');
    updateHUD();
    if (hearthHp <= 0) endGame(false);
  }

  function castNova() {
    if (state !== 'playing' || novaCooldown > 0) return;
    var x = clamp(mouse.x, 20, W - 20), y = clamp(mouse.y, 20, H - 20);
    novaCooldown = NOVA_CD;
    rings.push({ x: x, y: y, r: 12, max: NOVA_R, life: 0.45 });
    addParticles(x, y, '#c084fc', 40, 320);
    addParticles(x, y, '#ffc94d', 24, 220);
    shake = Math.max(shake, 6);
    sfx('nova');
    var hit = 0;
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      var d = dist(x, y, e.x, e.y);
      if (d < NOVA_R + e.radius) {
        hit++;
        var ang = Math.atan2(e.y - y, e.x - x);
        var push = 90 * (1 - d / (NOVA_R + 40));
        e.x += Math.cos(ang) * push; e.y += Math.sin(ang) * push;
        e.x = clamp(e.x, 14, W - 14); e.y = clamp(e.y, 14, H - 14);
        hurtEnemy(e, NOVA_DMG);
      }
    }
    if (hit > 0) addText(x, y - 18, 'NOVA! ' + hit + ' hit', '#e3c8ff');
    updateHUD();
  }

  function hurtEnemy(e, dmg) {
    if (e.dead) return;
    e.hp -= dmg;
    e.flash = 0.12;
    if (e.hp <= 0) {
      e.dead = true;
      kills++;
      gold += e.reward;
      score += e.score;
      addParticles(e.x, e.y, e.color, e.type === 'boss' ? 60 : 16, e.type === 'boss' ? 380 : 200);
      addText(e.x, e.y - 14, '+' + e.reward + 'g', '#ffc94d');
      if (e.type === 'boss') { showBanner('THE HOLLOW KING FALLS!'); shake = 14; }
      sfx('kill');
      updateHUD();
    }
  }

  // ---------- Update ----------
  function update(dt) {
    time += dt;
    if (novaCooldown > 0) novaCooldown = Math.max(0, novaCooldown - dt);
    if (shake > 0) shake = Math.max(0, shake - dt * 28);

    // Spawning
    if (waveActive && spawnQueue.length > 0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnTimer = spawnInterval;
        var type = spawnQueue.shift();
        var base = ENEMIES[type];
        var hpMul = 1 + (wave - 1) * 0.22;
        var sp = spawnPos();
        enemies.push({
          type: type, x: sp.x, y: sp.y,
          hp: Math.round(base.hp * hpMul), maxHp: Math.round(base.hp * hpMul),
          speed: base.speed * rand(0.92, 1.08) * (1 + (wave - 1) * 0.015),
          reward: base.reward, score: base.score, radius: base.radius,
          dmg: base.dmg, color: base.color,
          slowUntil: 0, slowMul: 1, wob: Math.random() * Math.PI * 2, flash: 0, dead: false
        });
        updateHUD();
      }
    }

    // Towers shoot
    for (var ti = 0; ti < towers.length; ti++) {
      var t = towers[ti];
      t.cool -= dt;
      t.spin += dt * (t.type === 'storm' ? 2.2 : 0.8);
      var range = towerRange(t);
      var best = null, bestD = Infinity;
      for (var ei = 0; ei < enemies.length; ei++) {
        var en = enemies[ei];
        if (en.dead) continue;
        var d = dist(t.x, t.y, en.x, en.y);
        if (d <= range && d < bestD) { bestD = d; best = en; }
      }
      if (best && t.cool <= 0) {
        var cfg = TOWERS[t.type];
        t.cool = 1 / cfg.rate;
        t.recoil = 0.12;
        projectiles.push({
          x: t.x, y: t.y - 8, target: best, tx: best.x, ty: best.y,
          speed: cfg.projSpeed, damage: towerDamage(t), type: t.type,
          splash: cfg.splash || 0, slow: cfg.slow || 0, slowDur: cfg.slowDur || 0,
          color: cfg.color, life: 1.4
        });
        if (Math.random() < 0.5) sfx('shoot');
      }
      if (t.recoil > 0) t.recoil -= dt;
    }

    // Projectiles
    for (var pi = projectiles.length - 1; pi >= 0; pi--) {
      var p = projectiles[pi];
      p.life -= dt;
      if (p.target && !p.target.dead) { p.tx = p.target.x; p.ty = p.target.y; }
      var dx = p.tx - p.x, dy = p.ty - p.y;
      var dd = Math.sqrt(dx * dx + dy * dy);
      var step = p.speed * dt;
      if (dd <= Math.max(step, 10) || p.life <= 0) {
        // Hit
        if (p.splash > 0) {
          addParticles(p.tx, p.ty, p.color, 10, 160);
          for (var si = 0; si < enemies.length; si++) {
            var se = enemies[si];
            if (se.dead) continue;
            if (dist(p.tx, p.ty, se.x, se.y) <= p.splash + se.radius * 0.5) {
              if (se === p.target) hurtEnemy(se, p.damage);
              else hurtEnemy(se, Math.round(p.damage * 0.6));
            }
          }
        } else if (p.target && !p.target.dead) {
          hurtEnemy(p.target, p.damage);
          if (p.slow > 0) { p.target.slowUntil = time + p.slowDur; p.target.slowMul = 1 - p.slow; addParticles(p.target.x, p.target.y, '#b9ecff', 5, 90); }
          else addParticles(p.tx, p.ty, p.color, 4, 100);
        }
        projectiles.splice(pi, 1);
      } else {
        p.x += dx / dd * step; p.y += dy / dd * step;
      }
    }

    // Enemies move
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e2 = enemies[i];
      if (e2.dead) { enemies.splice(i, 1); continue; }
      if (e2.flash > 0) e2.flash -= dt;
      var slowed = time < e2.slowUntil;
      var spd = e2.speed * (slowed ? e2.slowMul : 1);
      var adx = CX - e2.x, ady = CY - e2.y;
      var ad = Math.sqrt(adx * adx + ady * ady) || 1;
      // Gentle wobble so paths feel alive
      var wobAmp = e2.type === 'wisp' ? 26 : 10;
      var perp = Math.sin(time * 2.2 + e2.wob) * wobAmp * dt;
      var nx = adx / ad, ny = ady / ad;
      e2.x += (nx * spd * dt) + (-ny * perp);
      e2.y += (ny * spd * dt) + (nx * perp);
      if (dist(e2.x, e2.y, CX, CY) < HEARTH_R + e2.radius * 0.6) {
        damageHearth(e2.dmg);
        addText(CX, CY - 52, '-' + e2.dmg + ' HEARTH', '#fb7185');
        enemies.splice(i, 1);
        if (state !== 'playing') return;
      }
    }

    // Particles / texts / rings
    for (var q = particles.length - 1; q >= 0; q--) {
      var pt = particles[q];
      pt.life -= dt;
      if (pt.life <= 0) { particles.splice(q, 1); continue; }
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.vx *= 0.94; pt.vy *= 0.94;
    }
    for (var ti2 = texts.length - 1; ti2 >= 0; ti2--) {
      texts[ti2].life -= dt * 0.9; texts[ti2].y -= 26 * dt;
      if (texts[ti2].life <= 0) texts.splice(ti2, 1);
    }
    for (var ri = rings.length - 1; ri >= 0; ri--) {
      rings[ri].life -= dt;
      rings[ri].r += (rings[ri].max - rings[ri].r) * dt * 10;
      if (rings[ri].life <= 0) rings.splice(ri, 1);
    }

    // Wave cleared?
    if (waveActive && spawnQueue.length === 0 && enemies.length === 0 && state === 'playing') {
      endWave();
    }
    updateHUD();
  }

  // ---------- Render ----------
  function draw() {
    ctx.save();
    if (shake > 0) ctx.translate(rand(-shake, shake) * 0.5, rand(-shake, shake) * 0.5);

    // Background
    var bg = ctx.createRadialGradient(CX, CY, 60, CX, CY, 620);
    bg.addColorStop(0, '#16203c');
    bg.addColorStop(0.55, '#0d1326');
    bg.addColorStop(1, '#070b16');
    ctx.fillStyle = bg;
    ctx.fillRect(-20, -20, W + 40, H + 40);

    // Stars
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      ctx.globalAlpha = 0.35 + 0.4 * Math.abs(Math.sin(time * 1.4 + st.tw));
      ctx.fillStyle = '#aebaff';
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Faint grid
    ctx.strokeStyle = 'rgba(120,140,220,0.07)';
    ctx.lineWidth = 1;
    for (var gx = 0; gx <= W; gx += 48) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (var gy = 0; gy <= H; gy += 48) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

    // No-build ring around hearth
    ctx.strokeStyle = 'rgba(255,201,77,0.28)';
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(CX, CY, NO_BUILD_R, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // Hearth glow + body
    var pulse = 1 + Math.sin(time * 2.4) * 0.06;
    var glow = ctx.createRadialGradient(CX, CY, 8, CX, CY, 120 * pulse);
    glow.addColorStop(0, 'rgba(255,180,80,0.55)');
    glow.addColorStop(0.5, 'rgba(255,122,47,0.18)');
    glow.addColorStop(1, 'rgba(255,122,47,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(CX, CY, 120 * pulse, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#1c2542';
    ctx.strokeStyle = '#ffc94d';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(CX, CY, HEARTH_R + 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#0b1020';
    ctx.beginPath(); ctx.arc(CX, CY, HEARTH_R, 0, Math.PI * 2); ctx.fill();
    // Flame
    var fl = 16 + Math.sin(time * 6) * 2.5;
    ctx.fillStyle = '#ff7a2f';
    ctx.beginPath();
    ctx.moveTo(CX, CY - fl - 6);
    ctx.quadraticCurveTo(CX + 13, CY - 2, CX + 7, CY + 10);
    ctx.quadraticCurveTo(CX, CY + 17, CX - 7, CY + 10);
    ctx.quadraticCurveTo(CX - 13, CY - 2, CX, CY - fl - 6);
    ctx.fill();
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath(); ctx.ellipse(CX, CY + 5, 5.5, 8, 0, 0, Math.PI * 2); ctx.fill();
    // Hearth HP arc
    ctx.strokeStyle = hearthHp > 35 ? '#34d399' : '#fb7185';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(CX, CY, HEARTH_R + 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (hearthHp / hearthMax)); ctx.stroke();

    // Towers
    for (var ti = 0; ti < towers.length; ti++) {
      var t = towers[ti];
      var cfg = TOWERS[t.type];
      var isSel = selectedTower === t;
      if (isSel) {
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.strokeStyle = cfg.color;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(t.x, t.y, towerRange(t), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // Shadow + base
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath(); ctx.ellipse(t.x, t.y + 14, 18, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a2238';
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(t.x, t.y, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // Type glyph
      ctx.save();
      ctx.translate(t.x, t.y);
      if (t.type === 'ember') {
        ctx.fillStyle = '#ff6b35';
        ctx.beginPath();
        ctx.moveTo(0, -11); ctx.quadraticCurveTo(8, -2, 5, 6); ctx.quadraticCurveTo(0, 11, -5, 6); ctx.quadraticCurveTo(-8, -2, 0, -11);
        ctx.fill();
        ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(0, 3, 3.4, 0, Math.PI * 2); ctx.fill();
      } else if (t.type === 'frost') {
        ctx.strokeStyle = '#b9ecff'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        for (var a = 0; a < 3; a++) {
          ctx.save(); ctx.rotate(a * Math.PI / 3 + t.spin * 0.2);
          ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke();
          ctx.restore();
        }
        ctx.fillStyle = '#e0fbff'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.rotate(Math.sin(t.spin) * 0.25);
        ctx.fillStyle = '#e3c8ff';
        ctx.beginPath();
        ctx.moveTo(3, -12); ctx.lineTo(-5, 0); ctx.lineTo(0, 0); ctx.lineTo(-3, 12); ctx.lineTo(6, -1); ctx.lineTo(1, -1);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      // Level pips
      for (var lv = 0; lv < t.level; lv++) {
        ctx.fillStyle = '#ffc94d';
        ctx.beginPath(); ctx.arc(t.x - 8 + lv * 8, t.y + 21, 2.6, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Enemies
    for (var ei = 0; ei < enemies.length; ei++) {
      var e = enemies[ei];
      var slowed = time < e.slowUntil;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(e.x, e.y + e.radius * 0.8, e.radius * 0.9, e.radius * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      // Body
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.type === 'shade') {
        ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#2e2a55';
        ctx.strokeStyle = e.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#d9d2ff';
        ctx.beginPath(); ctx.arc(-5, -3, 2.6, 0, Math.PI * 2); ctx.arc(5, -3, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0b1020';
        ctx.beginPath(); ctx.arc(-5, -3, 1.2, 0, Math.PI * 2); ctx.arc(5, -3, 1.2, 0, Math.PI * 2); ctx.fill();
      } else if (e.type === 'wisp') {
        var wg = ctx.createRadialGradient(0, 0, 1, 0, 0, e.radius + 8);
        wg.addColorStop(0, '#fff7cc'); wg.addColorStop(0.5, '#fbbf24'); wg.addColorStop(1, 'rgba(251,191,36,0)');
        ctx.fillStyle = wg;
        ctx.beginPath(); ctx.arc(0, 0, e.radius + 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = e.flash > 0 ? '#fff' : '#fde68a';
        ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.7, 0, Math.PI * 2); ctx.fill();
      } else if (e.type === 'brute') {
        ctx.fillStyle = e.flash > 0 ? '#fff' : '#3b1530';
        ctx.strokeStyle = e.color; ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (var h = 0; h < 6; h++) {
          var ha = h * Math.PI / 3 + time * 0.4;
          var hx = Math.cos(ha) * e.radius, hy = Math.sin(ha) * e.radius;
          if (h === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffd6ec';
        ctx.beginPath(); ctx.arc(-6, -3, 3, 0, Math.PI * 2); ctx.arc(6, -3, 3, 0, Math.PI * 2); ctx.fill();
      } else { // boss
        ctx.fillStyle = e.flash > 0 ? '#fff' : '#3a0d1e';
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffc94d';
        ctx.beginPath();
        ctx.moveTo(-14, -e.radius + 2); ctx.lineTo(-9, -e.radius - 12); ctx.lineTo(-4, -e.radius + 2);
        ctx.lineTo(0, -e.radius - 14); ctx.lineTo(4, -e.radius + 2); ctx.lineTo(9, -e.radius - 12); ctx.lineTo(14, -e.radius + 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffe4e6';
        ctx.beginPath(); ctx.arc(-9, -4, 4, 0, Math.PI * 2); ctx.arc(9, -4, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath(); ctx.arc(-9, -4, 2, 0, Math.PI * 2); ctx.arc(9, -4, 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      if (slowed) {
        ctx.strokeStyle = 'rgba(185,236,255,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 3, 0, Math.PI * 2); ctx.stroke();
      }
      // HP bar
      if (e.hp < e.maxHp) {
        var bw = Math.max(28, e.radius * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(e.x - bw / 2, e.y - e.radius - 12, bw, 5);
        ctx.fillStyle = e.hp / e.maxHp > 0.4 ? '#34d399' : '#fb7185';
        ctx.fillRect(e.x - bw / 2, e.y - e.radius - 12, bw * (e.hp / e.maxHp), 5);
      }
    }

    // Projectiles
    for (var pi = 0; pi < projectiles.length; pi++) {
      var p = projectiles[pi];
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.type === 'storm' ? 5.5 : 4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Particles
    for (var qi = 0; qi < particles.length; qi++) {
      var pt = particles[qi];
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Nova rings
    for (var ri = 0; ri < rings.length; ri++) {
      var rg = rings[ri];
      ctx.strokeStyle = 'rgba(192,132,252,' + Math.max(0, rg.life * 2) + ')';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r, 0, Math.PI * 2); ctx.stroke();
    }

    // Floating texts
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (var ti3 = 0; ti3 < texts.length; ti3++) {
      var tx = texts[ti3];
      ctx.globalAlpha = Math.max(0, tx.life);
      ctx.fillStyle = tx.color;
      ctx.fillText(tx.str, tx.x, tx.y);
    }
    ctx.globalAlpha = 1;

    // Placement preview
    if (selectedBuild && state === 'playing' && mouse.inside) {
      var pcfg = TOWERS[selectedBuild];
      var ok = canPlace(mouse.x, mouse.y) && gold >= pcfg.cost;
      ctx.fillStyle = ok ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.14)';
      ctx.strokeStyle = ok ? '#34d399' : '#fb7185';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(mouse.x, mouse.y, pcfg.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = pcfg.color;
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 17, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.font = '800 11px system-ui, sans-serif';
      ctx.fillText(ok ? pcfg.name + ' — ' + pcfg.cost + 'g' : 'Cannot build here', mouse.x, mouse.y - 26);
    }

    // Nova radius hint at mouse (when ready)
    if (!selectedBuild && state === 'playing' && mouse.inside && novaCooldown <= 0) {
      ctx.strokeStyle = 'rgba(192,132,252,0.35)';
      ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.arc(mouse.x, mouse.y, NOVA_R, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  // ---------- UI ----------
  function updateHUD() {
    hudWave.textContent = wave === 0 ? '—' : wave + ' / ' + TOTAL_WAVES;
    hudScore.textContent = (score || 0).toLocaleString();
    hudGold.textContent = gold;
    var pct = Math.max(0, hearthHp / hearthMax * 100);
    hpFill.style.width = pct + '%';
    hpText.textContent = hearthHp + ' / ' + hearthMax;
    hudLeft.textContent = enemies.length + spawnQueue.length;
    if (novaCooldown > 0) {
      novaBtn.disabled = true;
      novaCd.textContent = Math.ceil(novaCooldown) + 's';
    } else {
      novaBtn.disabled = state !== 'playing';
      novaCd.textContent = 'Ready';
    }
    // Dim unaffordable cards
    for (var k in cards) {
      if (cards.hasOwnProperty(k)) {
        cards[k].style.opacity = gold >= TOWERS[k].cost ? '1' : '0.55';
      }
    }
  }

  function updateBuildUI() {
    for (var k in cards) {
      if (cards.hasOwnProperty(k)) cards[k].classList.toggle('selected', selectedBuild === k);
    }
  }

  function updateSelectedPanel() {
    if (!selectedTower) { selectedPanel.classList.add('hidden'); return; }
    var t = selectedTower;
    var cost = upgradeCost(t);
    selName.textContent = TOWERS[t.type].name + ' · Lv ' + t.level;
    selInfo.textContent = 'DMG ' + towerDamage(t) + ' · RNG ' + towerRange(t) + (t.level >= 3 ? ' · MAX' : '');
    upgradeBtn.textContent = cost === null ? '★ MAX LEVEL' : '⬆ Upgrade · ' + cost + 'g';
    upgradeBtn.disabled = cost === null || gold < cost;
    var refund = Math.round(t.invested * 0.7);
    sellBtn.textContent = 'Sell +' + refund + 'g';
    selectedPanel.classList.remove('hidden');
  }

  function selectBuild(type) {
    if (state !== 'playing') return;
    selectedTower = null;
    selectedBuild = (selectedBuild === type) ? null : type;
    updateBuildUI(); updateSelectedPanel();
    if (selectedBuild) beep(700, 0.06, 'sine', 0.05);
  }

  function placeTower(x, y) {
    if (!selectedBuild) return false;
    var cfg = TOWERS[selectedBuild];
    if (gold < cfg.cost) { addText(x, y - 20, 'Not enough gold!', '#fb7185'); sfx('hurt'); return false; }
    if (!canPlace(x, y)) { addText(x, y - 20, 'Cannot build here', '#fb7185'); return false; }
    gold -= cfg.cost;
    towers.push({ type: selectedBuild, x: x, y: y, level: 1, cool: 0, spin: Math.random() * 6, recoil: 0, invested: cfg.cost });
    addParticles(x, y, cfg.color, 18, 180);
    sfx('place');
    updateHUD();
    return true;
  }

  function towerAt(x, y) {
    for (var i = 0; i < towers.length; i++) {
      if (dist(x, y, towers[i].x, towers[i].y) < 22) return towers[i];
    }
    return null;
  }

  // ---------- Input ----------
  function toGameCoords(evt) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (evt.clientX - rect.left) * (W / rect.width),
      y: (evt.clientY - rect.top) * (H / rect.height)
    };
  }

  canvas.addEventListener('mousemove', function (evt) {
    var p = toGameCoords(evt);
    mouse.x = p.x; mouse.y = p.y; mouse.inside = true;
  });
  canvas.addEventListener('mouseleave', function () { mouse.inside = false; });
  canvas.addEventListener('click', function (evt) {
    if (state !== 'playing') return;
    var p = toGameCoords(evt);
    mouse.x = p.x; mouse.y = p.y;
    if (selectedBuild) {
      placeTower(p.x, p.y);
      return;
    }
    var t = towerAt(p.x, p.y);
    selectedTower = t;
    updateSelectedPanel();
    if (t) beep(520, 0.06, 'sine', 0.05);
  });
  canvas.addEventListener('contextmenu', function (evt) {
    evt.preventDefault();
    selectedBuild = null; selectedTower = null;
    updateBuildUI(); updateSelectedPanel();
  });

  document.addEventListener('keydown', function (evt) {
    if (evt.key === '1') selectBuild('ember');
    else if (evt.key === '2') selectBuild('frost');
    else if (evt.key === '3') selectBuild('storm');
    else if (evt.key === 'Escape') {
      if (selectedBuild || selectedTower) { selectedBuild = null; selectedTower = null; updateBuildUI(); updateSelectedPanel(); }
      else if (state === 'playing') pauseGame();
      else if (state === 'paused') resumeGame();
    }
    else if (evt.code === 'Space') {
      evt.preventDefault();
      if (state === 'menu') startGame();
      else if (state === 'playing') castNova();
    }
    else if (evt.key === 'p' || evt.key === 'P') {
      if (state === 'playing') pauseGame();
      else if (state === 'paused') resumeGame();
    }
    else if (evt.key === 'r' || evt.key === 'R') {
      if (state === 'playing' || state === 'paused' || state === 'over') { startGame(); }
    }
    else if (evt.key === 'm' || evt.key === 'M') {
      soundOn = !soundOn;
      soundToggle.textContent = (soundOn ? '🔊 Sound: On (M)' : '🔇 Sound: Off (M)');
    }
    else if (evt.key === 'Enter') {
      if (state === 'menu') startGame();
      else if (state === 'over') startGame();
    }
  });

  function pauseGame() {
    if (state !== 'playing') return;
    state = 'paused';
    pauseScreen.classList.remove('hidden');
  }
  function resumeGame() {
    if (state !== 'paused') return;
    state = 'playing';
    pauseScreen.classList.add('hidden');
  }

  // Buttons
  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('playAgainBtn').addEventListener('click', startGame);
  document.getElementById('resumeBtn').addEventListener('click', resumeGame);
  document.getElementById('restartBtnPause').addEventListener('click', startGame);
  waveBtn.addEventListener('click', startWave);
  novaBtn.addEventListener('click', castNova);
  soundToggle.addEventListener('click', function () {
    soundOn = !soundOn;
    soundToggle.textContent = (soundOn ? '🔊 Sound: On (M)' : '🔇 Sound: Off (M)');
  });
  cards.ember.addEventListener('click', function () { selectBuild('ember'); });
  cards.frost.addEventListener('click', function () { selectBuild('frost'); });
  cards.storm.addEventListener('click', function () { selectBuild('storm'); });
  upgradeBtn.addEventListener('click', function () {
    if (!selectedTower) return;
    var cost = upgradeCost(selectedTower);
    if (cost === null || gold < cost) return;
    gold -= cost;
    selectedTower.invested += cost;
    selectedTower.level++;
    addParticles(selectedTower.x, selectedTower.y, '#ffc94d', 20, 200);
    sfx('place');
    updateHUD(); updateSelectedPanel();
  });
  sellBtn.addEventListener('click', function () {
    if (!selectedTower) return;
    gold += Math.round(selectedTower.invested * 0.7);
    addParticles(selectedTower.x, selectedTower.y, '#ffc94d', 14, 160);
    var idx = towers.indexOf(selectedTower);
    if (idx >= 0) towers.splice(idx, 1);
    selectedTower = null;
    sfx('coin');
    updateHUD(); updateSelectedPanel();
  });

  // ---------- Main loop ----------
  var last = performance.now();
  function loop(now) {
    var dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (state === 'playing') update(dt);
    else time += dt * 0.35; // gentle idle animation on menus
    draw();
    requestAnimationFrame(loop);
  }

  resetGame();
  draw();
  requestAnimationFrame(loop);
})();
