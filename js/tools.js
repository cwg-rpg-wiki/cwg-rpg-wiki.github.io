/* Calculators: drop chance and enhancement cost */
(function (K) {
  const { W, I, M, R, esc, link, fmt, pct, ilink, mlink, P, subtabs } = K;
  const SY = W.systems || {}; const CALC = W.calc || {};
  const num = v => { const n = parseFloat(String(v).replace(/[,\s]/g, '')); return isNaN(n) ? 0 : n; };
  const readLS = k => { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } };
  const state = { drop: {}, enh: {}, roll: {}, engr: {}, title: {} };

  /* ---- drop calculator ---- */
  /* Fortune raises the ODDS (map 1.2.2), see K.oddsChance; event items keep their base chance. id = the dropped item. */
  const pRollOf = (chance, bonus, id) => Math.min(1, K.dropAt(chance, bonus, id) / 100);
  const perKill = (chance, rolls, bonus, id) => { const p = pRollOf(chance, bonus, id); return 1 - Math.pow(1 - p, Math.max(1, rolls || 1)); };   /* every roll is its own chance */
  const kl = n => fmt(n) + (n === 1 ? ' kill' : ' kills');
  const kills = pk => pk >= 1 ? [1, 1] : pk > 0 ? [Math.round(1 / pk), Math.ceil(Math.log(0.1) / Math.log(1 - pk))] : [0, 0];
  /* N copies (user 2026-09-25): drops after K kills = Binomial(K x rolls, p) */
  const lgam = z => { const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61503916999185, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgam(1 - z); z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i); const tt = z + g + 0.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(tt) - tt + Math.log(x); };
  const atLeast = (n, p, N) => { if (N <= 0) return 1; if (p >= 1) return n >= N ? 1 : 0; if (n < N) return 0; const lp = Math.log(p), lq = Math.log(1 - p), ln = lgam(n + 1); let below = 0; for (let k = 0; k < N; k++) below += Math.exp(ln - lgam(k + 1) - lgam(n - k + 1) + k * lp + (n - k) * lq); return Math.max(0, 1 - below); };
  const killsFor = (N, pRoll, rolls) => { rolls = Math.max(1, rolls || 1); if (!(pRoll > 0)) return [0, 0]; if (N <= 1) return kills(1 - Math.pow(1 - pRoll, rolls)); const avg = N / (rolls * pRoll); let lo = Math.floor(avg), hi = Math.max(lo + 1, Math.ceil(avg * 2) + 10); while (atLeast(hi * rolls, pRoll, N) < 0.9) hi *= 2; while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); if (atLeast(mid * rolls, pRoll, N) >= 0.9) hi = mid; else lo = mid; } return [Math.round(avg), hi]; };

  /* Escalating odds (map 1.2.4). Every kill of a field / dungeon / raid boss that rolled an eligible drop and dropped none of them adds
     +0.5 to the BASE chance of those drops (before Fortune). Any eligible drop of that boss resets the counter. Eligible = base above 1%,
     not hidden / Enhancement Stone / event items. The data marks the rows: monster drops and item drops carry `pity: true`. */
  const PSTEP = 0.5;
  const isPity = d => !!(d && (d.pity || d.esc));
  const oddsAt = (b, F) => K.dropAt(Math.min(100, b), F, null);   /* b = base %, F = Fortune % -> chance % */
  /* chain over the dry-kill counter n (0..nmax, 100% at nmax): returns the PMF of the kill that first drops the target (pmf[k], k >= 1),
     its mean / variance and the average copies per target kill. others = [[base, rolls]] of the boss's other eligible drops (they reset n without a copy). */
  const pityChain = (b, F, rolls, others, n0) => {
    rolls = Math.max(1, rolls || 1); const nmax = Math.max(0, Math.ceil((100 - b) / PSTEP));
    const ph = new Float64Array(nmax + 1), po = new Float64Array(nmax + 1), cm = new Float64Array(nmax + 1);
    for (let n = 0; n <= nmax; n++) { const p = oddsAt(b + PSTEP * n, F) / 100; ph[n] = 1 - Math.pow(1 - p, rolls); cm[n] = ph[n] > 0 ? rolls * p / ph[n] : 1;
      let s = 1; for (const [bb, rr] of others) s *= Math.pow(1 - oddsAt(bb + PSTEP * n, F) / 100, Math.max(1, rr || 1)); po[n] = 1 - s; }
    let dist = new Float64Array(nmax + 1); dist[Math.min(nmax, Math.max(0, Math.round(n0 || 0)))] = 1;
    const pmf = [0]; let mean = 0, m2 = 0, cop = 0, hitAll = 0;
    for (let k = 1; k <= 200000; k++) {
      const nd = new Float64Array(nmax + 1); let hit = 0, surv = 0;
      for (let n = 0; n <= nmax; n++) { const w = dist[n]; if (!w) continue; const h = ph[n]; hit += w * h; cop += w * h * cm[n]; const miss = w * (1 - h); nd[0] += miss * po[n]; nd[Math.min(n + 1, nmax)] += miss * (1 - po[n]); }
      for (let n = 0; n <= nmax; n++) surv += nd[n];
      pmf[k] = hit; mean += k * hit; m2 += k * k * hit; hitAll += hit; dist = nd; if (surv < 1e-12) break;
    }
    return { pmf, mean, v: Math.max(0, m2 - mean * mean), ec: hitAll > 0 ? cop / hitAll : 1 };
  };
  const pmfQ = (pmf, x) => { let c = 0; for (let k = 1; k < pmf.length; k++) { c += pmf[k]; if (c >= x - 1e-12) return k; } return pmf.length - 1; };
  const conv = (a, b) => { const out = new Float64Array(a.length + b.length - 1); for (let i = 1; i < a.length; i++) { const x = a[i]; if (!x) continue; for (let j = 1; j < b.length; j++) out[i + j] += x * b[j]; } let c = 0; for (let k = 1; k < out.length; k++) { c += out[k]; if (c >= 1 - 1e-9) return out.slice(0, k + 1); } return out; };
  /* kills to get N copies of the target: [average, 90% (if unlucky), 99%]. One roll per kill and N <= 25: exact (a target kill resets the counter, so the
     kills between copies are independent: first hit from n0, then N-1 hits from 0). Otherwise a normal approximation of the same renewal chain. */
  const pityKills = (b, F, rolls, others, N, n0) => {
    N = Math.max(1, Math.round(N || 1)); const g = pityChain(b, F, rolls, others, n0), f = n0 > 0 ? pityChain(b, F, rolls, others, 0) : g;
    if (N === 1) return [g.mean, pmfQ(g.pmf, 0.9), pmfQ(g.pmf, 0.99)];
    if (Math.max(1, rolls || 1) === 1 && N <= 25) { let cur = g.pmf; for (let i = 1; i < N; i++) cur = conv(cur, f.pmf); let mean = 0; for (let k = 1; k < cur.length; k++) mean += k * cur[k]; return [mean, pmfQ(cur, 0.9), pmfQ(cur, 0.99)]; }
    const rest = Math.max(0, N - g.ec) / f.ec, avg = g.mean + rest * f.mean, sd = Math.sqrt(g.v + rest * f.v);
    return [avg, Math.max(1, Math.ceil(avg + 1.2816 * sd)), Math.max(1, Math.ceil(avg + 2.3263 * sd))];
  };
  /* chance per kill with n dry kills on the counter */
  const pityNow = (b, F, rolls, n) => 1 - Math.pow(1 - oddsAt(b + PSTEP * n, F) / 100, Math.max(1, rolls || 1));
  const pityOthers = (m, skip, itemId) => m.drops.filter(x => x !== skip && x.item !== itemId && isPity(x) && !K.isEventItem(x.item) && x.chance > 1).map(x => [x.chance, x.rolls]);
  const pityLine = fresh => `Escalating odds: every kill of this boss without one of its drops above 1% adds +0.5% to their base chance for the whole lobby, until one drops. Hiddens, Enhancement Stones and event items do not count.${fresh ? ' Counted from a fresh counter.' : ''}`;
  /* Fortune: the typed number (the -economy readout) plus the two Hollow sources it leaves out */
  const fortuneIn = s => { const su = K.setup(), H = K.HOLLOW;
    const base = s.bonus == null || s.bonus === '' ? (su.dropOn ? su.fortuneBase : 0) : num(s.bonus);
    const lan = Math.min(H.lanternMax, Math.max(0, Math.round(s.lantern == null || s.lantern === '' ? su.lantern : num(s.lantern))));
    const spec = s.spectral == null || s.spectral === '' ? !!su.spectral : s.spectral === '1';
    return { base, lan, spec, total: base + H.lantern * lan + (spec ? H.spectral : 0) }; };
  const drop = () => {
    const s = state.drop; const by = s.by === 'item' ? 'item' : 'mon'; const FI = fortuneIn(s); const bonus = FI.total; const H = K.HOLLOW;
    const byBox = `<div class="sub-tabs">${[['mon', 'Pick a monster'], ['item', 'Pick an item']].map(([v, l]) => `<a href="#calc?tool=drop" class="calc-by ${by === v ? 'on' : ''}" data-by="${v}">${l}</a>`).join('')}</div>`;
    const need = Math.max(1, Math.round(num(s.need) || 1));
    const needRow = `<b>How many</b><span><input class="calc" data-k="need" type="number" min="1" step="1" value="${esc(s.need || 1)}" style="width:90px"> <span class="small">copies you need</span></span>`;
    const bonusRow = `<b>Your Fortune %</b><span><input class="calc" data-k="bonus" type="number" min="0" step="any" value="${esc(s.bonus == null || s.bonus === '' ? (K.setup().dropOn ? K.setup().fortuneBase : 0) : s.bonus)}" style="width:90px"> % <span class="small">Fortune raises the drop odds. Type 0 for base chances. The -economy number leaves out the two Hollow sources below, add them there.</span></span>
    <b>Hollow Lantern</b><span>${sel('lantern', [...Array(H.lanternMax + 1).keys()].map(l => [l, l ? 'Level ' + l + ' (+' + fmt(H.lantern * l) + '%)' : 'None']), FI.lan)} <label style="margin-left:10px"><input type="checkbox" class="calc" data-k="spectral" ${FI.spec ? 'checked' : ''}> Spectral Luck active (+${fmt(H.spectral)}%)</label>${FI.total !== FI.base ? ` <span class="small">Total Fortune +${fmt(FI.total)}%</span>` : ''}</span>`;
    if (by === 'item') {
      const drops = Object.values(I).filter(x => (x.drops || []).length).sort((a, b) => a.name.localeCompare(b.name));
      const it = I[s.it] || null; let anyEsc = false;
      const src = it ? it.drops.filter(d => M[d.m]).map(d => { const pl = pRollOf(d.c, bonus, it.id), pk = perKill(d.c, d.r, bonus, it.id), pl0 = killsFor(need, pl, d.r);
        const esc1 = isPity(d) && !K.isEventItem(it.id) && d.c > 1 && pl > 0; let u = pl0[0], k = pl0[1];
        if (esc1) { anyEsc = true; const r = pityKills(d.c, bonus, d.r, pityOthers(M[d.m], null, it.id), need, 0); u = Math.round(r[0]); k = r[1]; }
        return { m: d.m, pk, base: d.c, r: d.r, esc: esc1, u, k, pu: pl0[0], pk90: pl0[1] }; }).sort((a, b) => (a.u > 0 ? a.u : 1e18) - (b.u > 0 ? b.u : 1e18) || b.pk - a.pk) : [];
      return `<p class="small">Where to farm an item: every monster that drops it, best first.</p>${byBox}
    <div class="card"><div class="kv"><b>Item</b><span><input class="calc" data-k="it" list="dropitems" value="${esc(it ? it.name : s.ittext || '')}" placeholder="Type an item name" style="width:100%;max-width:420px"><datalist id="dropitems">${drops.map(x => `<option value="${esc(x.name)}">`).join('')}</datalist></span>${needRow}${bonusRow}</div></div>
    ${src.length ? `<div class="tbl compact"><table><tr><th>Monster</th><th class="num">Per kill</th><th class="num">Usually${need > 1 ? ' for ' + fmt(need) : ''}</th><th class="num">If unlucky</th></tr>${src.map(x => `<tr><td>${mlink(x.m)}</td><td class="num">${pct(100 * x.pk)}${x.r > 1 ? ` <span class="small">${x.r} rolls</span>` : ''}</td><td class="num">${kl(x.u)}${x.esc ? ` <span class="small">plain ${fmt(x.pu)}</span>` : ''}</td><td class="num">${kl(x.k)}${x.esc ? ` <span class="small">plain ${fmt(x.pk90)}</span>` : ''}</td></tr>`).join('')}</table></div><p class="small">"If unlucky": only 1 player in 10 needs more.${K.isEventItem(it.id) && bonus > 0 ? ' Event item: Fortune does not apply.' : ''}${anyEsc ? ' ' + esc(pityLine(true)) + ' "Per kill" is the first kill, "plain" is the same drop without escalating odds.' : ''}</p>` : (it ? '<p class="small">No monster drops this item. Check its page for recipes.</p>' : '')}`;
    }
    const mons = Object.values(M).filter(m => m.drops.length).sort((a, b) => a.name.localeCompare(b.name));
    const m = M[s.m] || null; const d = m ? m.drops.find(x => x.item === s.i) || m.drops[0] : null;
    const evIt = !!(d && K.isEventItem(d.item)); const pk0 = d ? perKill(d.chance, d.rolls, bonus, d.item) : 0; const pl0 = d ? killsFor(need, pRollOf(d.chance, bonus, d.item), d.rolls) : [0, 0];
    const esc1 = !!(d && isPity(d) && !evIt && d.chance > 1 && pk0 > 0); const dry = Math.max(0, Math.round(num(s.dry)));
    let pk = pk0, avg = pl0[0], k90 = pl0[1];
    if (esc1) { pk = pityNow(d.chance, bonus, d.rolls, dry); const r = pityKills(d.chance, bonus, d.rolls, pityOthers(m, d, null), need, dry); avg = r[0]; k90 = r[1]; }
    const dryRow = esc1 ? `<b>Kills without a drop</b><span><input class="calc" data-k="dry" type="number" min="0" step="1" value="${esc(s.dry || 0)}" style="width:90px"> <span class="small">this boss's counter, 0 on a fresh game. The boss tooltip shows it.</span></span>` : '';
    return `<p class="small">How many kills an item takes: the base drop chance with your Fortune applied to its odds.</p>${byBox}
    <div class="card"><div class="kv"><b>Monster</b><span><input class="calc" data-k="m" list="mons" value="${esc(m ? m.name : s.mtext || '')}" placeholder="Type a monster name" style="width:100%;max-width:420px"><datalist id="mons">${mons.map(x => `<option value="${esc(x.name)}">`).join('')}</datalist></span>
    ${m ? `<b>Item</b><span><select class="calc" data-k="i">${m.drops.map(x => `<option value="${x.item}" ${d && d.item === x.item ? 'selected' : ''}>${esc((I[x.item] || {}).name || x.item)} (${pct(x.chance)})</option>`).join('')}</select></span>` : ''}
    ${needRow}${bonusRow}${dryRow}</div></div>
    ${d ? `<div class="card hi"><div class="kv"><b>Chance per kill</b><span>${pct(100 * pk)}${bonus > 0 || d.rolls > 1 || esc1 ? ` <span class="small">base ${pct(d.chance)}${d.rolls > 1 ? ' per roll · ' + d.rolls + ' rolls per kill' : ''}${esc1 ? ' · rises with every kill without a drop' : ''}${evIt && bonus > 0 ? ' · event item, Fortune does not apply' : ''}</span>` : ''}</span><b>Usually${need > 1 ? ' for ' + fmt(need) : ''}</b><span><b>${kl(Math.round(avg))}</b></span><b>If unlucky</b><span><b>${kl(k90)}</b></span>${esc1 ? `<b>Without escalating odds</b><span>${kl(pl0[0])} usually · ${kl(pl0[1])} if unlucky <span class="small">${pct(100 * pk0)} per kill</span></span>` : ''}</div><p class="small" style="margin:8px 0 0">"If unlucky": only 1 player in 10 needs more.${esc1 ? ' ' + esc(pityLine(dry === 0)) : ''}</p></div>` : ''}`;
  };


  /* ---- shared: read the verified tables from the Game Systems pages, so a rebuild keeps these in sync ---- */
  const unev = c => c && typeof c === 'object' && 'ev' in c ? c.ev : c; /* event cells {ev, b}: calculators use the live value */
  const tbl = (sys, re) => { const T = ((SY[sys] || {}).tables || []).find(x => re.test(x.title)); return T ? { ...T, rows: T.rows.map(r => r.map(unev)) } : null; };
  const FX = W.event_fx || {};
  const EV_TOOL = { enh: ['craft', 'attribute_x3', 'attribute_x2', 'attribute_lumber_half'], roll: ['ability_top3', 'ability_high2', 'ability_halfcost', 'potential_top3', 'potential_halfcost', 'sailing_top2'], engr: ['party_contribution2', 'party_bonus_gold'] };
  const evNote = tool => { const on = (W.events || []).filter(e => e.on && (EV_TOOL[tool] || []).includes(e.id)); return on.length ? `<p class="small">Live events included: ${on.map(e => `<a class="evchip" href="#events">${esc(e.chip)}</a>`).join(' ')}</p>` : ''; };
  const col = (T, re) => T ? T.columns.findIndex(c => re.test(c)) : -1;
  const sel = (k, opts, v) => `<select class="calc" data-k="${k}">${opts.map(([val, lab]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>`;
  const big = x => x >= 1e12 ? (x / 1e12).toFixed(1) + 'T' : x >= 1e9 ? (x / 1e9).toFixed(1) + 'B' : x >= 1e6 ? (x / 1e6).toFixed(1) + 'M' : fmt(Math.round(x));
  const nfmt = x => x > 0 && x < 1 ? String(+x.toPrecision(2)) : x >= 1e6 ? fmt(Math.round(x)) : fmt(Math.round(x * 10) / 10);

  /* ---- roll odds: Ability slots, Potential, Sailing Potential ---- */
  const ROLL = [
    ['ability_slots', 'Ability slots', /grade/i, '', 'gold'],
    ['potential', 'Potential', /grade/i, '', 'all'],
    ['sailing', 'Sailing Potential slot', /grade/i, '', [['Voyage Essence', 1], ['Lumber', 2]]],
  ];
  const AB_TRY = 10000, AB_OPEN = 3, POT_OPEN = 3; /* map: Reroll All with nothing kept costs 10,000 gold and rolls every open slot (3 free slots) */
  /* effect type = one even roll, separate from the grade; no event, link or supporter perk touches it (findings/checks/roll_types.md, user 2026-09-25) */
  const RTYPES = { ability_slots: ['STR', 'AGI', 'INT', 'Max HP'], potential: ['Bonus STR', 'Bonus AGI', 'Bonus INT', 'All Stats', 'Bonus Damage', 'Crit (chance and damage)'], sailing: ['Execute', 'Armor Weakening', 'Magic DR', 'Mana', 'HP Regen', 'Attack speed', 'Move speed'] };
  const PITY = 50000;
  /* Sailing grade chances out of 1,000,000 for a bad-luck counter RR (0..100) and top-grade multiplier th (x2 while the Sailing top-grade event is on). Index 0 = Normal ... 12 = Divinity, same order as the Grades table. */
  const sailP = (RR, th) => { let c = [2, 5 + Math.floor(RR / 5), 10 + Math.floor(RR / 3), 25 + RR, 100 + RR * 3, 500 + RR * 8, 2500 + RR * 20, 12000 + RR * 40, 50000 + RR * 80, 140000 + RR * 120, 300000 + RR * 150, 550000 + RR * 200];
    if (th > 1) { const y9 = (th - 1) * c[3]; c = c.map((x, i) => i < 4 ? x * th : x + y9); }
    const out = new Array(13).fill(0); let prev = 0; c.forEach((x, i) => { out[12 - i] = (x - prev) / 1e6; prev = x; }); out[0] = (1e6 - prev) / 1e6; return out; };
  const sailNext = (RR, g) => g >= 9 ? 0 : g === 8 ? Math.floor(RR / 4) : g === 7 ? Math.floor(RR / 2) : g === 6 ? Math.floor(RR * 3 / 4) : Math.min(100, RR + 1);
  const SAILC = {};
  /* survival S[n] = chance of no hit after n normal rolls (n < PITY), starting from an empty counter; the PITY-th roll is Divinity with a random effect */
  const sailSurv = (k, share, th) => { const key = k + '|' + share + '|' + th; if (SAILC[key]) return SAILC[key];
    const PT = []; for (let r = 0; r <= 100; r++) PT.push(sailP(r, th));
    let m = new Float64Array(101), nx = new Float64Array(101); m[0] = 1; const S = new Float64Array(PITY); S[0] = 1; let n = 1;
    for (; n < PITY; n++) { nx.fill(0); let tot = 0; for (let r = 0; r <= 100; r++) { const x = m[r]; if (!x) continue; const pr = PT[r];
        for (let g = 0; g < 13; g++) { const miss = g >= k ? pr[g] * (1 - share) : pr[g]; if (miss > 0) { const y = x * miss; nx[sailNext(r, g)] += y; tot += y; } } }
      [m, nx] = [nx, m]; S[n] = tot; if (tot < 1e-15) { n++; break; } }
    for (; n < PITY; n++) S[n] = 0;
    return (SAILC[key] = S); }; /* sailing: every 50,000 Voyage Essence spent guarantees a Divinity roll (1 essence per roll) */
  /* Potential pity (map 1.2.4): every PITY-th slot roll is a Godhood with a random effect (hits a chosen effect 1 time in 6). Locked slots do not roll or count,
     one ALL press rolls R open slots, a natural Godhood does not reset the counter, so cycles repeat. p1 = chance of the wanted grade AND effect per slot roll,
     share = chance that the forced Godhood has the wanted effect. Starting from an empty counter. Returns presses: usual = expected, q(x) = x quantile. */
  const potModel = (p1, share, R) => {
    const N = PITY; if (p1 >= 1) return { usual: 1, q: () => 1 };
    const lq = Math.log1p(-p1), q1 = 1 - p1, F = Math.exp((N - 1) * lq) * (1 - share); let E = 0, Fk = 1;
    for (let k = 0; Fk > 1e-15 && k < 10000; k++, Fk *= F) {
      const o = (R - (k * N) % R) % R, m = Math.floor((N - 1 - o) / R) + 1;
      E += Fk * Math.pow(q1, o) * (p1 > 0 ? -Math.expm1(R * m * lq) / -Math.expm1(R * lq) : m); }
    const q = x => { const left = 1 - x; let kk = 0; while (F > 0 && Math.pow(F, kk + 1) > left && kk < 100000) kk++;
      const f = Math.pow(F, kk); let r = N;
      if (p1 > 0) { r = Math.max(0, Math.ceil(Math.log(left / f) / lq)); while (r > 0 && f * Math.pow(q1, r - 1) <= left) r--; while (r < N && f * Math.pow(q1, r) > left) r++; r = Math.min(r, N); }
      return Math.ceil((kk * N + r) / R); };
    return { usual: E, q };
  };
  const roll = () => {
    const s = state.roll; const sysI = Math.max(0, ROLL.findIndex(r => r[0] === s.sys)); const [sys, label, re, note, cost] = ROLL[sysI];
    const T = tbl(sys, re); if (!T) return '<p class="small">No data.</p>';
    const gi = col(T, /^Grade$/), ci = col(T, /Chance/); const grades = T.rows.map(r => [r[gi], Number(r[ci])]);
    { /* My setup: P1 / Dimension Link change the grade chances (base values from the raw table, events re-applied in K.fx.grades) */
      const RAW = ((SY[sys] || {}).tables || []).find(x => re.test(x.title)); const ys = RAW && sys !== 'sailing' ? K.fx.grades(sys, RAW.rows.map(r => { const c = r[ci]; return +(c && typeof c === 'object' && 'b' in c ? c.b : c); })) : null;
      if (ys) grades.forEach((g, i) => { g[1] = ys[i]; }); }
    const tgt = grades.some(g => g[0] === s.g) ? s.g : grades[Math.min(5, grades.length - 1)][0];
    const types = RTYPES[sys] || []; const ty = types.includes(s.t) ? s.t : 'any'; const share = ty === 'any' ? 1 : 1 / types.length;
    const k = grades.findIndex(g => g[0] === tgt); const p1 = Math.min(1, grades.slice(k).reduce((a, g) => a + g[1], 0) / 100) * share; const p = cost === 'gold' ? 1 - Math.pow(1 - p1, AB_OPEN) : cost === 'all' ? 1 - Math.pow(1 - p1, POT_OPEN) : p1;
    const pity = sys === 'sailing', potP = sys === 'potential';
    const PM = potP ? potModel(p1, share, POT_OPEN) : null;   /* Potential: slot-level pity model, in ALL presses */
    /* sailing: exact chain over the bad-luck counter; every PITY-th roll is Divinity with a random effect (hits a chosen effect 1 time in 7) and empties the counter, so cycles repeat */
    const th = K.fx.sailTh();
    const S = pity ? sailSurv(k, share, th) : null, F = pity ? S[PITY - 1] * (1 - share) : 0;
    const expRolls = PM ? PM.usual : pity ? S.reduce((a, x) => a + x, 0) / (1 - F) : p > 0 ? 1 / p : Infinity;
    const q = x => { const left = 1 - x; if (!pity) return p >= 1 ? 1 : Math.ceil(Math.log(left) / Math.log(1 - p));   /* a 100% grade (e.g. Normal or better) sums to a hair over 1 */
      let kk = 0; while (F > 0 && Math.pow(F, kk + 1) > left && kk < 1000) kk++; const f = Math.pow(F, kk); let r = 0; while (r < PITY && f * S[r] > left) r++; return kk * PITY + r; };
    const unlucky = PM ? PM.q(0.9) : q(0.9);
    let lum = n => 0, extra = null;
    const gold = AB_TRY * (FX.ability_gold || 1);
    if (sys === 'potential') lum = n => n;   /* ALL with nothing locked costs 1 Lumber and rolls every free slot */
    else if (sys === 'sailing') { lum = n => 2 * n; extra = n => ` + ${nfmt(n)} Voyage Essence`; }
    const line = n => cost === 'gold' ? `<b>${nfmt(n * gold / 1e6)} Lumber</b> <span class="small">· ${fmt(Math.round(n * gold))} gold · ${nfmt(n)} Reroll All presses</span>` : cost === 'all' ? `<b>${nfmt(lum(n))} Lumber</b> <span class="small">· ${nfmt(n)} ALL presses</span>` : `<b>${nfmt(lum(n))} Lumber</b>${extra ? extra(n) : ''} <span class="small">· ${nfmt(n)} rolls</span>`;
    return `<p class="small">What it costs to roll one slot up to a grade you want, with live events.</p><div class="card"><div class="kv"><b>Roll</b><span>${sel('sys', ROLL.map(r => [r[0], r[1]]), sys)}</span><b>Until</b><span>${sel('g', grades.map(g => [g[0], g[0] + ' or better']), tgt)}</span><b>Effect</b><span>${sel('t', [['any', 'Any effect'], ...types.map(x => [x, x])], ty)}</span></div></div>
    <div class="card hi"><div class="kv"><b>Usually</b><span>${line(expRolls)}</span><b>If unlucky</b><span>${line(unlucky)}</span></div>
    <p class="small" style="margin:8px 0 0">"If unlucky": only 1 player in 10 needs more.${ty !== 'any' ? ` Every effect is equally likely: 1 roll in ${types.length} is ${esc(ty)}, whatever the grade.` : ''}${pity ? (ty === 'any' ? ` Every ${fmt(PITY)} Voyage Essence spent guarantees Divinity, so ${fmt(PITY)} rolls at most.` : ` Every ${fmt(PITY)} Voyage Essence spent guarantees Divinity, but its effect is still random.`) + ' Counts the bad-luck boost too, starting from an empty counter.' : ''}${potP ? (ty === 'any' ? ` Every ${fmt(PITY)} slot rolls guarantee Godhood, so ${fmt(Math.ceil(PITY / POT_OPEN))} ALL presses at most.` : ` Every ${fmt(PITY)} slot rolls guarantee Godhood, but its effect is still random.`) + ' Locked slots do not roll or count, and a Godhood you roll yourself does not reset the count. Counted from an empty counter.' : ''}${cost === 'gold' ? ` Each press is a Reroll All with nothing equipped or protected: ${fmt(gold)} gold, all ${AB_OPEN} free slots roll at once. Lumber at 1,000,000 gold each.` : ''}${cost === 'all' ? ` Each press is ALL with nothing locked: 1 Lumber, all ${POT_OPEN} free slots roll at once. Save a preset first and load it back if the set gets worse.` : ''}${sys === 'sailing' ? ' Each roll costs 1 Voyage Essence and 2 Lumber.' : ''}</p></div>`;
  };

  /* ---- engraving: contribution and party dungeon clears ---- */
  const engr = () => {
    const s = state.engr; const C = tbl('party_dungeon', /Contribution cost|cost in Contribution/), Dg = tbl('party_dungeon', /^Dungeons$/);
    if (!C || !Dg) return '<p class="small">No data.</p>';
    const gold = s.track === 'gold'; const ci = gold ? 2 : 1;
    const from = Math.min(24, Math.max(0, Math.round(num(s.from)))); const to = Math.min(25, Math.max(from + 1, Math.round(num(s.to) || 25)));
    const need = C.rows.slice(from, to).reduce((a, r) => a + Number(r[ci]), 0);
    const di = col(Dg, /Dungeon/), pi = col(Dg, /Contribution per clear/), li = col(Dg, /Lumber per run/);
    const per = r => Number(r[pi]) + (/Snowfield/.test(r[di]) ? 0.2 * (FX.contribution || 1) : 0); /* Snowfield wave 10: 10% chance of +2 (x2 with the Contribution event) */
    return `<p class="small">Contribution for one Permanent Engraving track, and the clears it takes in each party dungeon.</p>
    <div class="card"><div class="kv"><b>Track</b><span>${sel('track', [['stat', 'Life, Balance, Guard, Battle, Move or Haste'], ['gold', 'Gold or Luck']], gold ? 'gold' : 'stat')}</span><b>From level</b><span><input class="calc" data-k="from" type="number" min="0" max="24" value="${from}" style="width:70px"></span><b>To level</b><span><input class="calc" data-k="to" type="number" min="1" max="25" value="${to}" style="width:70px"></span></div></div>
    <div class="card hi"><div class="kv"><b>Contribution needed</b><span>${fmt(need)}</span></div>
    <div class="tbl compact"><table><tr><th>Dungeon</th><th class="num">Per clear</th><th class="num">Clears</th><th class="num">Est. tickets</th><th class="num">Lumber earned</th></tr>${Dg.rows.map(r => { const n = Math.ceil(need / per(r)); return `<tr><td>${esc(r[di])}</td><td class="num">${nfmt(per(r))}</td><td class="num">${fmt(n)}</td><td class="num">${fmt(Math.ceil(n * 0.9))}</td><td class="num">${fmt(Math.floor(n * Number(r[li])))}</td></tr>`; }).join('')}</table></div>
    <p class="small">About 1 ticket in 10 is kept on entry. Lumber earned = clears x Lumber per run, before gold bonuses.</p></div>`;
  };

  /* ---- party dungeon titles: every wave-10 clear rolls one rank-up at the chance of your CURRENT rank (map 1.1.0, findings/22-party-dungeon-titles.md).
     Reads the Game Systems "Titles" table: rank cell "0-19" or a number, chance "0.5%", keep-ticket "10%". Base chances (no supporter bonus). ---- */
  const title = () => {
    const s = state.title; const T = tbl('party_dungeon', /^Titles$/); if (!T) return '<p class="small">No data.</p>';
    const ri = col(T, /^Rank$/), ci = col(T, /Rank-up chance/), ki = col(T, /keep ticket/i);
    const P = [], KEEP = []; let top = 0;
    T.rows.forEach(r => { const rk = String(r[ri]).split('-').map(Number), lo = rk[0], hi = rk.length > 1 ? rk[1] : rk[0];
      const c = parseFloat(String(r[ci])) / 100, k = parseFloat(String(r[ki])) / 100 || 0;
      for (let x = lo; x <= hi; x++) { P[x] = c > 0 ? K.fx.title(c * 100) / 100 : 0; KEEP[x] = k; } top = Math.max(top, hi); });
    const from = Math.min(top - 1, Math.max(0, Math.round(num(s.from)))), to = Math.min(top, Math.max(from + 1, Math.round(num(s.to) || top)));
    let avg = 0, tickets = 0; for (let r = from; r < to; r++) { const e = 1 / P[r]; avg += e; tickets += e * (1 - KEEP[r]); }
    /* "if unlucky": clears until 9 players in 10 have reached the target rank (exact, rank by rank) */
    let m = new Float64Array(top + 1); m[from] = 1; let n = 0;
    while (m[to] < 0.9 && n < 1e6) { const nx = new Float64Array(top + 1); nx[to] = m[to]; for (let r = from; r < to; r++) { if (!m[r]) continue; nx[r + 1] += m[r] * P[r]; nx[r] += m[r] * (1 - P[r]); } m = nx; n++; }
    const opts = a => a.map(x => [String(x), String(x)]);
    return `<p class="small">Dungeon title rank-ups. Every wave-10 clear rolls one rank-up at the chance of your current rank.</p>
    <div class="card"><div class="kv"><b>From rank</b><span>${sel('from', opts([...Array(top).keys()]), from)}</span><b>To rank</b><span>${sel('to', opts([...Array(top).keys()].map(x => x + 1).filter(x => x > from)), to)}</span></div></div>
    <div class="card hi"><div class="kv"><b>Usually</b><span><b>${fmt(Math.round(avg))} clears</b></span><b>If unlucky</b><span><b>${fmt(n)} clears</b></span><b>Tickets used</b><span>about ${fmt(Math.round(tickets))} <span class="small">(the rest are kept on entry)</span></span></div>
    <p class="small" style="margin:8px 0 0">"If unlucky": only 1 player in 10 needs more. A clear = one full run to wave 10. ${K.setup().c1 ? 'With C1: rank-up chance x1.5.' : 'Base chances, the supporter bonus is not counted.'}</p></div>`;
  };

  /* ---- relic enhancement: expected tries with the reset to +0 ---- */
  const relic = s => {
    const T = tbl('relic_enhancement', /Enhancement chances/); if (!T) return '<p class="small">No data.</p>';
    const si = col(T, /Success/), di = col(T, /Destroy|Reset/); const st = T.rows.map(r => ({ s: Number(r[si]) / 100, d: Number(r[di]) / 100 }));
    const from = Math.min(11, Math.max(0, Math.round(num(s.rfrom)))); const to = Math.min(12, Math.max(from + 1, Math.round(num(s.rto) || 12)));
    /* E[k] = 1 + s E[k+1] + stay E[k] + d E[0], solved as E[k] = a[k] + b[k] E[0] from the top down */
    const a = new Array(13).fill(0), b = new Array(13).fill(0);
    for (let k = to - 1; k >= 0; k--) { const x = st[k]; const m = x.s + x.d; a[k] = (1 + x.s * a[k + 1]) / m; b[k] = (x.s * b[k + 1] + x.d) / m; }
    const E0 = a[0] / (1 - b[0]); const tries = a[from] + b[from] * E0;
    return `<div class="card"><div class="kv"><b>From</b><span><input class="calc" data-k="rfrom" type="number" min="0" max="11" value="${from}" style="width:70px"></span><b>To</b><span><input class="calc" data-k="rto" type="number" min="1" max="12" value="${to}" style="width:70px"></span></div></div>
    <div class="card hi"><div class="kv"><b>Tries on average</b><span>${nfmt(tries)}</span><b>Relic Fragments</b><span>${fmt(Math.round(tries * 300))} <span class="small">· 300 per try</span></span></div><p class="small">For one relic, counting the tries that reset it to +0. Enhance picks a random unlocked relic, so lock every other relic to aim it.</p></div>
    <div class="tbl compact"><table><tr><th>Step</th><th class="num">Success</th><th class="num">Stays</th><th class="num">Resets to +0</th></tr>${st.slice(from, to).map((x, i) => `<tr><td>+${from + i} → +${from + i + 1}</td><td class="num">${pct(100 * x.s)}</td><td class="num">${pct(100 * Math.max(0, 1 - x.s - x.d))}</td><td class="num">${x.d > 0 ? pct(100 * x.d) : '-'}</td></tr>`).join('')}</table></div>`;
  };

  /* ---- enhancement calculator ---- */
  const chains = (() => { const out = {}; for (const r of R) { if (!/^Enhancement/.test(r.kind)) continue; const o = I[r.out]; if (!o || o.level == null) continue; const cands = r.in.filter(([k]) => I[k] && (I[k].family === o.family || I[k].type === o.type) && !/Stone/.test(I[k].name) && (I[k].level || 0) < o.level).sort((a, b) => (I[b[0]].level || 0) - (I[a[0]].level || 0)); const base = cands[0]; if (!base) continue; const key = o.family + (o.variant ? ' [' + o.variant + ']' : ''); (out[key] = out[key] || []).push({ lv: o.level, chance: r.chance, cbase: r.chance_base, out: r.out, base: base[0], stone: r.in.filter(([k]) => k !== base[0]).map(([k, n]) => (n > 1 ? n + '× ' : '') + ((I[k] || {}).name || k)).join(' + ') }); } for (const k of Object.keys(out)) out[k].sort((a, b) => a.lv - b.lv); return out; })();
  const chainKeys = Object.keys(chains).sort();
  const aura = st => {
    const D = CALC.aura; if (!D || !(D.steps || []).length) return '<p class="small">No data.</p>';
    const sup = st.sup === '1'; const S = {}; D.steps.forEach(x => { S[x.frm] = { p: Math.min(100, x.p * (sup ? 1.2 : 1)) / 100, q: Math.min(100, x.q * (sup ? 1.2 : 1)) / 100 }; });
    const from = Math.min(9, Math.max(1, Math.round(num(st.tfrom) || 1))); const to = Math.min(10, Math.max(from + 1, Math.round(num(st.tto) || 10)));
    /* E[k] = base auras still needed from holding +k; a fail keeps your aura 2% of the time (only the material is lost, map 1.2.x),
       otherwise both auras are destroyed (back to nothing: E0 = 1 + E[1]); the stay case is solved out by dividing by (1 - SAFE x fail) */
    const SAFE = 0.02;
    const a = {}, b = {}; for (let k = 10; k >= 1; k--) { if (k >= to) { a[k] = 0; b[k] = 0; continue; } const x = S[k]; const k1 = Math.min(10, k + 1), k2 = Math.min(10, k + 2); const st = 1 - SAFE * (1 - x.p);
      a[k] = (1 + x.p * (1 - x.q) * a[k1] + x.p * x.q * a[k2]) / st; b[k] = (x.p * (1 - x.q) * b[k1] + x.p * x.q * b[k2] + (1 - SAFE) * (1 - x.p)) / st; }
    const E0 = (1 + a[1]) / (1 - b[1]); const E = k => a[k] + b[k] * E0;
    const P = {}; for (let k = 10; k >= 1; k--) P[k] = k >= to ? 1 : (S[k].p * (1 - S[k].q) * P[Math.min(10, k + 1)] + S[k].p * S[k].q * P[Math.min(10, k + 2)]) / (1 - SAFE * (1 - S[k].p));
    const fr = D.frag && I[D.frag.id] ? `${ilink(D.frag.id)}` : 'fragments';
    return `<div class="card"><div class="kv"><b>You hold</b><span><select class="calc" data-k="tfrom">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => `<option value="${l}" ${l === from ? 'selected' : ''}>+${l}</option>`).join('')}</select></span><b>Goal</b><span><select class="calc" data-k="tto">${[2, 3, 4, 5, 6, 7, 8, 9, 10].filter(l => l > from).map(l => `<option value="${l}" ${l === to ? 'selected' : ''}>+${l}</option>`).join('')}</select></span><b>Craft Supporter</b><span><label><input type="checkbox" class="calc" data-k="sup" ${sup ? 'checked' : ''}> x1.2 chances</label></span></div></div>
    <div class="card warn"><p style="margin:0"><b>A fail destroys both auras</b>, except 2% of fails where your aura survives and only the material is lost. The averages below include starting over from nothing after every lost aura.</p></div>
    <div class="card hi"><div class="kv"><b>Base auras on average</b><span>${nfmt(E(from))}${D.frag ? ` <span class="small">= ${fmt(Math.round(E(from) * D.frag.n))} ${fr}</span>` : ''}</span><b>From nothing</b><span>${nfmt(E0)} base auras</span><b>Never lose the aura</b><span>${nfmt(100 * P[from])}%</span></div></div>
    <div class="tbl compact fit"><table><tr><th>Step</th><th class="num">Success</th><th class="num">Skip a level</th><th class="num">Fail = lose both</th></tr>${D.steps.filter(x => x.frm >= from && x.frm < to).map(x => `<tr><td>+${x.frm} → +${x.to}</td><td class="num">${nfmt(100 * S[x.frm].p)}%</td><td class="num">${nfmt(100 * S[x.frm].p * S[x.frm].q)}%</td><td class="num">${nfmt(100 - 100 * S[x.frm].p)}%</td></tr>`).join('')}</table></div>
    <p class="small">Each try uses the aura you hold plus one base aura (+1 to +2 uses two base auras). The crafting event does not change these chances.</p>`;
  };
  const enh = () => {
    const s = state.enh; const mode = ['attr', 'relic', 'aura'].includes(s.mode) ? s.mode : 'gear';
    let body = '';
    if (mode === 'gear') {
      const key = chains[s.chain] ? s.chain : chainKeys[0]; const ch = chains[key] || []; const lvs = ch.map(x => x.lv);
      const from = lvs.includes(num(s.from)) ? num(s.from) : (lvs[0] - 1); const to = lvs.includes(num(s.to)) ? num(s.to) : lvs[lvs.length - 1];
      const steps = ch.filter(x => x.lv > from && x.lv <= to).map(x => ({ ...x, chance: K.fx.craft(x.chance, x.cbase) })); const stones = steps.reduce((a, x) => a + (x.chance > 0 ? 100 / x.chance : 0), 0);
      body = `<div class="card"><div class="kv"><b>Item</b><span><select class="calc" data-k="chain">${chainKeys.map(k => `<option ${k === key ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></span><b>From</b><span><select class="calc" data-k="from">${[lvs[0] - 1, ...lvs.slice(0, -1)].map(l => `<option value="${l}" ${l === from ? 'selected' : ''}>+${l}</option>`).join('')}</select></span><b>To</b><span><select class="calc" data-k="to">${lvs.map(l => `<option value="${l}" ${l === to ? 'selected' : ''}>+${l}</option>`).join('')}</select></span></div></div>
      ${steps.length ? `<div class="card hi"><div class="kv"><b>Stones on average</b><span>${fmt(Math.round(stones))} <span class="small">${esc(steps[0].stone)}</span></span><b>Steps</b><span>${steps.length}</span></div></div><div class="tbl compact"><table><tr><th>Step</th><th class="num">Chance</th><th class="num">Tries on average</th></tr>${steps.map(x => `<tr><td>${ilink(x.out)}</td><td class="num">${pct(x.chance)}</td><td class="num">${x.chance > 0 ? fmt(Math.round(100 / x.chance * 10) / 10) : '-'}</td></tr>`).join('')}</table></div>` : '<p class="small">Pick a higher target.</p>'}`;
    } else {
      const PROT = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 20, 20, 20, 0, 50, 50, 50, 50, 0, 150, 200, 250, 300, 0, 500, 600, 700, 800, 0, 1000, 1100, 1200, 1300];   /* map: extra Lumber per try with Destruction Protection; 0 on the safe levels +15/+20/+25/+30/+35 since map 1.2.x */
      const prot = s.prot === '1';
      const S1 = K.setup().s1; const A = (CALC.attribute || []).map(K.fx.attr).map(r => prot && r.lv >= 15 ? { ...r, keep: r.keep + r.d2 / 2, d1: r.d1 + r.d2 / 2, d2: 0, lumber: r.lumber + (S1 ? 0 : 1) * Math.ceil(PROT[r.lv] * ((r.lumber_base && r.lumber_base !== r.lumber) ? 0.5 : 1)) } : r); const from = Math.min(39, Math.max(0, num(s.afrom))); const to = Math.min(40, Math.max(from + 1, num(s.ato) || 40));
      // expected stones / lumber from level l to reach 'to': E[l] = cost + keep*E[l] + s*E[l+1] + d1*E[down1] + d2*E[down2]; floor = highest safe multiple of 5 reached
      const floorOf = l => l - l % 5; /* a fail never drops below the last multiple of 5 */ const isSafe = r => r.safe || (r.lv >= 10 && r.lv % 5 === 0);
      const solve = costKey => { const E = new Array(41).fill(0); for (let it = 0; it < 4000; it++) { for (let l = to - 1; l >= from; l--) { const r = A[l]; if (!r) continue; const dn1 = Math.max(floorOf(l), l - 1), dn2 = Math.max(floorOf(l), l - 2); const c = r[costKey] || 0; const keep = r.keep / 100, sp = r.s / 100, p1 = isSafe(r) ? 0 : r.d1 / 100, p2 = isSafe(r) ? 0 : r.d2 / 100; const kp = isSafe(r) ? 1 - sp : keep; E[l] = (c + sp * E[l + 1] + p1 * E[dn1 < from ? from : dn1] + p2 * E[dn2 < from ? from : dn2]) / (1 - kp); } } return E[from]; };
      const st = solve('stones'), lu = solve('lumber');
      body = mode === 'aura' ? aura(s) : mode === 'relic' ? relic(s) : `<div class="card"><div class="kv"><b>From</b><span><input class="calc" data-k="afrom" type="number" min="0" max="39" value="${from}" style="width:70px"></span><b>To</b><span><input class="calc" data-k="ato" type="number" min="1" max="40" value="${to}" style="width:70px"></span><b>Destruction Protection</b><span><label><input class="calc" data-k="prot" type="checkbox" ${prot ? 'checked' : ''}> on from +15</label></span></div></div>
      <div class="card hi"><div class="kv"><b>Attribute Stones on average</b><span>${fmt(Math.round(st))}</span><b>Lumber on average</b><span>${fmt(Math.round(lu))}</span></div><p class="small">Includes failures that drop you back, never below the last multiple of 5. +0 to +10, +15, +20, +25, +30 and +35 cannot drop. ${prot ? 'Protection turns a destroy into stay or drop 1 and adds its Lumber to every try from +16, except on the safe levels.' : 'Without Destruction Protection: a destroy drops 2 levels.'}</p></div>
      <div class="tbl compact"><table><tr><th>Step</th><th class="num">Success</th><th class="num">Keep</th><th class="num">Drop 1</th><th class="num">Drop 2</th><th class="num">Stones</th><th class="num">Lumber</th></tr>${A.slice(from, to).map(r => `<tr><td>+${r.lv} → +${r.lv + 1}${isSafe(r) ? ' <span class="tag ok">safe</span>' : ''}</td><td class="num">${r.s_base != null && r.s_base !== r.s ? `<span class="evv">${pct(r.s)}</span><span class="evb">${pct(r.s_base)}</span>` : pct(r.s)}</td><td class="num">${isSafe(r) ? pct(100 - r.s) : pct(r.keep)}</td><td class="num">${isSafe(r) ? '-' : pct(r.d1)}</td><td class="num">${isSafe(r) ? '-' : pct(r.d2)}</td><td class="num">${r.stones}</td><td class="num">${r.lumber_base != null ? `<span class="evv">${fmt(r.lumber)}</span><span class="evb">${fmt(r.lumber_base)}</span>` : fmt(r.lumber)}</td></tr>`).join('')}</table></div>`;
    }
    const intro = { gear: 'Enhancement Stones an item takes on average. A failed try only loses the stone.', attr: 'Attribute Stones and Lumber from one level to another, with the chances of the live events.', relic: 'Relic Fragments one relic takes on average.', aura: 'Taegeuk Guardian Aura upgrades: base auras it takes on average, counting every restart after a fail.' }[mode];
    return `${subtabs('calc', 'mode', [['gear', 'Item enhancement'], ['attr', 'Attribute enhancement'], ['relic', 'Relic enhancement'], ['aura', 'Taegeuk aura']], mode)}<p class="small">${intro}</p>${body}`;
  };

  const TABS = [['drop', 'Drop chance'], ['enh', 'Enhancement'], ['roll', 'Roll odds'], ['engr', 'Engraving'], ['title', 'Dungeon titles']];
  P.calc = (_, f) => { const t = TABS.some(([k]) => k === f.tool) ? f.tool : 'drop'; if (f.mode) state.enh.mode = f.mode; return `<h2>Calculators</h2>${subtabs('calc', 'tool', TABS, t)}${evNote(t)}${({ drop, enh, roll, engr, title })[t]()}`; };
  K.hooks.push((page, out) => {
    if (page !== 'calc') return;
    const cur = (K.filters.tool && TABS.some(([k]) => k === K.filters.tool)) ? K.filters.tool : 'drop';
    out.querySelectorAll('.calc-by').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); state.drop.by = a.dataset.by; K.route(); }));
    out.querySelectorAll('.calc').forEach(el => el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', () => {
      const s = state[cur]; const k = el.dataset.k;
      if (k === 'm') { const m = Object.values(M).find(x => x.name.toLowerCase() === el.value.trim().toLowerCase()); s.m = m ? m.id : ''; s.mtext = el.value; if (!m) return; }
      else if (k === 'it') { const it = Object.values(I).find(x => (x.drops || []).length && x.name.toLowerCase() === el.value.trim().toLowerCase()); s.it = it ? it.id : ''; s.ittext = el.value; if (!it) return; }
      else if (el.type === 'checkbox') s[k] = el.checked ? '1' : '0';
      else s[k] = el.value;
      /* keep exactly what the user typed (an emptied box stays empty) and the cursor where it was: number boxes
         cannot report the cursor, so theirs goes to the end (bug 2026-09-25: clearing then typing 100 gave 001) */
      const pos = el.selectionStart, raw = el.value; K.route(); const n = out.querySelector(`.calc[data-k="${k}"]`);
      if (n && n.tagName !== 'SELECT') { n.focus(); if (n.type === 'number') { n.value = ''; n.value = raw; } else { try { n.setSelectionRange(pos, pos); } catch (e) { } } }
    }));
  });

  /* ---- self-test for the 1.2.4 numbers (browser console: __calcSelfTest()). Not part of the page UI.
     Expected values: findings/124/sys/rolls.md (table), findings/124/audit/economy.md (examples), findings/124/sys/drops_monsters.md + scripts/drops124_pity_calc.py. ---- */
  window.__calcSelfTest = () => {
    const out = [];
    const add = (name, expected, got, tol) => { const ex = [].concat(expected), go = [].concat(got); const t = [].concat(tol == null ? 0 : tol);
      out.push({ case: name, expected, got, ok: ex.length === go.length && ex.every((e, i) => Math.abs(e - go[i]) <= (t[i] != null ? t[i] : t[t.length - 1]) + 1e-12) }); };
    /* Potential, 3 open slots, ALL presses = Lumber, empty counter: [usually, 90%, 99%] */
    const POTT = [['Godhood', 2, [15860.8, 16667, 16667], [91601.6, 200000, 400000]], ['Final or better', 5, [14747.0, 16667, 16667], [81347.0, 183334, 350000]],
      ['Eternal or better', 10, [13116.0, 16667, 16667], [68545.0, 150000, 300000]], ['Transcendent or better', 20, [10535.7, 16667, 16667], [52111.8, 116667, 223503]],
      ['Divine or better', 70, [4618.5, 10965, 16667], [23604.8, 50162, 100323]], ['Ancient or better', 270, [1234.9, 2843, 5685], [7265.1, 16667, 32762]],
      ['Mystic or better', 1270, [262.8, 604, 1208], [1575.1, 3626, 7252]]];
    const pm = (w, share, R) => { const m = potModel(w / 1e6 * share, share, R); return [m.usual, m.q(0.9), m.q(0.99)]; };
    for (const [nm, w, any, one] of POTT) { add('Potential ' + nm + ', any effect, 3 slots', any, pm(w, 1, 3), [0.051, 0, 0]); add('Potential ' + nm + ', one effect, 3 slots', one, pm(w, 1 / 6, 3), [0.051, 0, 0]); }
    add('Potential Godhood, any effect, 1 slot per roll', [47581.3, 50000, 50000], pm(2, 1, 1), [0.051, 0, 0]);
    add('Potential Godhood, one effect, 1 slot per roll', [274803.8, 600000, 1200000], pm(2, 1 / 6, 1), [0.051, 0, 0]);
    add('Potential 100% grade needs 1 press', [1, 1, 1], pm(1e6, 1, 3), 0);
    /* Escalating odds, kills for 1 copy: [usually, 90%, 99%] (Fortune in %) */
    const pk = (b, F, others, N, n0, rolls) => pityKills(b, F, rolls || 1, others || [], N || 1, n0 || 0);
    const DT = [['5%', 5, 0, [], [11.27, 22, 33]], ['5%, Fortune +100%', 5, 100, [], [7.23, 14, 23]], ['2%', 2, 0, [], [14.86, 27, 38]], ['2%, Fortune +100%', 2, 100, [], [10.17, 19, 27]],
      ['1.5%', 1.5, 0, [], [15.64, 28, 39]], ['10%', 10, 0, [], [7.79, 16, 26]], ['30% (ticket)', 30, 0, [], [3.22, 7, 12]],
      ['5% with one other 10% eligible drop', 5, 0, [[10, 1]], [14.44, 31, 60]], ['2% with one other 2% eligible drop', 2, 0, [[2, 1]], [19.36, 40, 75]]];
    for (const [nm, b, F, oth, ex] of DT) add('Drop ' + nm + ' escalating', ex, pk(b, F, oth), [0.006, 0, 0]);
    add('Drop 5% plain (not eligible)', [20, 45], kills(0.05), 0);
    add('Drop 0.5% plain (not eligible)', [200, 460], kills(0.005), 0);
    add('Drop 5% 2 copies = 2 x one copy (exact convolution)', 2 * pk(5, 0)[0], pk(5, 0, [], 2)[0], 1e-6);
    add('Drop 5% 30 copies = 30 x one copy (approximation path)', 30 * pk(5, 0)[0], pk(5, 0, [], 30)[0], 1e-6);
    add('Drop 5% with 10 dry kills: first-kill chance is the 10% odds', 10, 100 * pityNow(5, 0, 1, 10), 1e-9);
    /* chance per kill with Fortune +100% and dry kills (economy.md) */
    add('Boss item 5%, Fortune +100%: fresh / 10 dry / 40 dry', [9.52, 18.18, 40], [100 * pityNow(5, 100, 1, 0), 100 * pityNow(5, 100, 1, 10), 100 * pityNow(5, 100, 1, 40)], 0.005);
    /* Fortune sums and the odds formula */
    const FU = K.fortuneOf;
    add('Fortune, everything maxed (Tier XXI, 12 players, Aura 75, Luck 25, achievements 120, Lantern 5, Spectral Luck)', 802.5, FU({ tier: 21, party: 12, aura: 75, luck: 25, achF: 120, lantern: 5, spectral: 1 }).total, 1e-9);
    add('Fortune, solo + Spectral Luck + Lantern 3', 24.5, FU({ party: 1, lantern: 3, spectral: 1 }).total, 1e-9);
    add('Fortune, -economy 100 + 12 players ignored + Lantern 2 + Spectral Luck', 118, FU({ econ: 100, party: 12, lantern: 2, spectral: 1 }).total, 1e-9);
    add('Fortune, Lantern level capped at 5', 7.5, FU({ party: 1, lantern: 9 }).hollow, 1e-9);
    add('Odds at Fortune +802.5%: base 1% / 20% / 0.1%', [8.355, 69.29, 0.895], [1, 20, 0.1].map(b => K.dropAt(b, 802.5, null)), [0.005, 0.005, 0.0005]);
    add('Odds at Fortune +24.5%: base 0.1% / 5%', [0.1245, 6.1497], [0.1, 5].map(b => K.dropAt(b, 24.5, null)), [0.00005, 0.0005]);
    add('Odds at Fortune +127.5%: base 1% / 5%', [2.246, 10.693], [1, 5].map(b => K.dropAt(b, 127.5, null)), 0.0005);
    add('Odds at Fortune +127.5%, 5% boss item after 10 dry kills (base 10%)', 20.2, oddsAt(5 + PSTEP * 10, 127.5), 0.05);
    return out;
  };

})(window.WK);
