/* Achievements tab (map 1.2.2): the journal's 311 entries from the map script.
   Compact pass 2026-10-19 (user: "too long"): bonus strip, category tabs + search, one fold per group with its bonus total,
   boss entries = one row per boss with every kill step, tier ladders (Realm Hunter 1-3) = one row */
(function (K) {
  const { W, M, esc, link, subtabs, filterBox, P, INDEX, KL } = K;
  const A = W.achievements; if (!A) return;
  const LIST = A.list || [], PG = A.page || {};
  const CATS = [...new Set(LIST.map(a => a.category))];
  const num = n => Number(n).toLocaleString('en-US');
  const RW = [['fortune', 'Fortune', 'f'], ['glory', 'Glory', 'g'], ['prosperity', 'Prosperity', 'p'], ['attr_pp', 'Attribute', 'a']];
  const p = v => '+' + (+v.toFixed(2)) + '%';
  const chips = (rv, txt) => { const on = RW.filter(([k]) => rv && rv[k] > 0); if (!on.length) return `<span class="small">${/^None/.test(txt || '') ? 'Record only' : esc(txt || '')}</span>`;
    const f = rv.fortune, pr = rv.prosperity;
    return on.filter(([k]) => !(k === 'prosperity' && f === pr)).map(([k, l, c]) => k === 'fortune' && f === pr ? `<span class="ac-c fp">Fortune &amp; Prosperity ${p(f)}</span>` : `<span class="ac-c ${c}">${l} ${p(rv[k])}</span>`).join(''); };
  const sum = list => { const t = {}; for (const a of list) for (const [k] of RW) t[k] = (t[k] || 0) + ((a.reward_values || {})[k] || 0); return t; };
  const totChips = t => RW.filter(([k]) => t[k] > 0).map(([k, l, c]) => `<span class="ac-c ${c}">${l} ${p(t[k])}</span>`).join('');
  /* rows: bosses (one per boss id), tier ladders (same name + 1/2/3), single entries */
  const bossName = a => M[a.boss] ? M[a.boss].name.replace(/^\[[^\]]*\]\s*/, '') : a.name.replace(/\s*-\s*(Tier \d|First Victory)$/, '').replace(/^.*—\s*/, '');
  const bossKind = a => { const m = (M[a.boss] ? M[a.boss].name : a.name).match(/^\[([^\]]*)\]/); return m ? m[1] : 'Event Boss'; };
  const kills = n => n === 1 ? '1 kill' : num(n) + ' kills';
  const rowsOf = list => {
    const out = [], seen = new Map();
    for (const a of list) {
      const key = a.boss ? 'b:' + a.boss : /\s\d$/.test(a.name) ? 'l:' + a.name.replace(/\s*\d$/, '') : 'a:' + a.id;
      if (!seen.has(key)) { const r = { key, items: [] }; seen.set(key, r); out.push(r); }
      seen.get(key).items.push(a);
    }
    for (const r of out) r.items.sort((x, y) => x.target - y.target);
    return out;
  };
  const scope = a => a.scope && a.scope !== 'Character' ? ` <span class="tag">${esc(a.scope === 'Account' ? 'Account' : 'Hero form')}</span>` : '';
  const rowHtml = r => {
    const a = r.items[0];
    if (r.key[0] === 'b') {
      const name = M[a.boss] ? link('monster', a.boss, bossName(a)) : esc(bossName(a));
      const note = (a.goal.match(/Counts only[^.]*\./) || [''])[0];
      return `<div class="ac-r"><div class="ac-n">${name} <span class="small">${esc(bossKind(a))}</span>${note ? `<div class="small">${esc(note)}</div>` : ''}</div><div class="ac-s">${r.items.map(x => `<div><span class="ac-k">${kills(x.target)}</span>${chips(x.reward_values, x.reward)}</div>`).join('')}</div></div>`;
    }
    if (r.key[0] === 'l') {
      const goal = a.goal.replace(/[\d,]+/, r.items.map(x => num(x.target)).join(' / ')).replace(/ The three tiers share one kill count\./, ' (one shared count)');
      return `<div class="ac-r"><div class="ac-n"><b>${esc(r.key.slice(2).replace(/^.*? - /, ''))}</b> <span class="small">${esc(goal)}</span></div><div class="ac-s">${r.items.map(x => `<div><span class="ac-k">${num(x.target)}</span>${chips(x.reward_values, x.reward)}</div>`).join('')}</div></div>`;
    }
    return `<div class="ac-r"><div class="ac-n"><b>${esc(a.name.replace(a.group + ': ', '').replace(a.group + ' - ', ''))}</b>${scope(a)} <span class="small">${esc(a.goal)}</span></div><div class="ac-s"><div>${chips(a.reward_values, a.reward)}</div></div></div>`;
  };
  P.achievements = (id, f) => {   /* #achievements/<name> (search hits) = search for that name */
    const cat = CATS.includes(f.cat) ? f.cat : CATS[0]; const q0 = f.q || id || ''; const q = q0.toLowerCase();
    const hit = a => !q || [a.name, a.goal, a.reward, a.group, a.boss && M[a.boss] ? M[a.boss].name : ''].join(' ').toLowerCase().includes(q);
    const rows = LIST.filter(a => (q ? true : a.category === cat) && hit(a));
    const groups = [...new Set(rows.map(a => (q ? a.category + ' · ' : '') + a.group))];
    const BT = (PG.tables || [])[0];
    const strip = BT ? `<div class="bx-ch ac-b">${BT.rows.map((r, i) => `<div><b class="ac-c ${RW[i] ? RW[i][2] : ''}">${esc(r[0])}</b><span class="small">${esc(r[1])}</span><span class="bx-p">max ${esc(r[2])}</span></div>`).join('')}</div>` : '';
    const head = `<h2>${esc(PG.title || 'Achievements')}</h2><p>${esc(PG.what || '')}${PG.open ? ` <span class="small">${esc(PG.open)}</span>` : ''}</p>${strip}`;
    return `${head}${q ? '' : subtabs('achievements', 'cat', CATS.map(c => [c, `${c} ${LIST.filter(a => a.category === c).length}`]), cat)}${filterBox('search every achievement (name, boss, goal, reward)', q0)}${q ? `<p class="small">${rows.length} found.</p>` : ''}
      <div class="zfolds">${groups.map(g => { const rs = rows.filter(a => (q ? a.category + ' · ' : '') + a.group === g);
        return `<details class="zfold"${q ? ' open' : ''}><summary><span>${esc(g)} <span class="small">${rs.length}</span></span><span class="zf-c ac-t">${totChips(sum(rs)) || 'Record only'}</span></summary>${(rr => `<div class="ac-l${rr.length > 6 && rr.every(r => r.key[0] === 'b') ? ' two' : ''}">${rr.map(rowHtml).join('')}</div>`)(rowsOf(rs))}</details>`; }).join('')}</div>`;
  };
  KL.achievements = 'Achievement';
  for (const a of LIST) INDEX.push({ k: 'achievements', id: a.name, t: a.name, s: 'achievement · ' + a.goal, w: 1 });
})(window.WK);
