/* Bestiary tab (map 1.2.2, own tab since 2026-10-19, user): one intro line, a chance strip, the boosted effects folded,
   then one fold per realm with its monsters as name pills by type (compact pass 2026-10-19, user: "too long") */
(function (K) {
  const { W, M, esc, link, filterBox, P, INDEX, KL } = K;
  const B = W.bestiary, PG = (W.systems || {}).bestiary; if (!B || !PG) return;
  const E = Object.entries(B.entries || {}).map(([id, e]) => ({ id, ...e })).filter(e => M[e.id]);
  const REALMS = [...new Set(E.map(e => e.realm))];
  const TYPES = ['Normal', 'Colossal', 'Named', 'Raid'];
  const T = PG.tables || [], byTitle = re => T.find(t => re.test(t.title || ''));
  const CH = byTitle(/chance/i), BO = byTitle(/boosted/i), RE = byTitle(/^Realms/i);
  const chance = {}; for (const r of (CH ? CH.rows : [])) chance[r[0]] = { pct: r[1], who: String(r[2]).replace(/^Player who gets the kill$/, 'killer only').replace(/^Heroes within/, 'heroes within') };
  const reward = {}; for (const r of (RE ? RE.rows : [])) if (!/^None/.test(r[r.length - 1])) reward[r[0]] = r[r.length - 1];
  const short = n => n.replace(/^\[[^\]]*\]\s*/, '');
  P.bestiary = (id, f) => {
    const q0 = f.q || id || ''; const q = q0.toLowerCase();
    const hit = e => !q || M[e.id].name.toLowerCase().includes(q);
    const strip = `<div class="bx-ch">${TYPES.filter(t => chance[t]).map(t => `<div><b>${t}</b><span class="bx-p">${esc(chance[t].pct)}</span><span class="small">${esc(chance[t].who)}</span></div>`).join('')}</div>`;
    const boost = BO ? `<details class="zfold bx-bo"><summary><span>What the bonus boosts</span><span class="zf-c">${BO.rows.map(r => esc(r[0].replace(/\s*\(.*\)$/, ''))).join(' · ')}</span></summary><div class="tbl compact"><table><tr>${BO.columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr>${BO.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>${BO.note ? `<p class="small" style="margin:0 12px 10px">${esc(BO.note)}</p>` : ''}</details>` : '';
    let shown = 0;
    const folds = REALMS.map(r => {
      const all = E.filter(e => e.realm === r), list = all.filter(hit); if (q && !list.length) return ''; shown += list.length;
      const cnt = TYPES.filter(t => all.some(e => e.rarity === t)).map(t => `${all.filter(e => e.rarity === t).length} ${t}`).join(' · ');
      const rows = TYPES.map(t => { const xs = list.filter(e => e.rarity === t).sort((a, b) => short(M[a.id].name).localeCompare(short(M[b.id].name)));
        return xs.length ? `<div class="bx-t"><span class="bx-tl">${t}${chance[t] ? ` <i>${esc(chance[t].pct)}</i>` : ''}</span><span class="bx-ns">${xs.map(e => link('monster', e.id, short(M[e.id].name))).join('')}</span></div>` : ''; }).join('');
      return `<details class="zfold"${q ? ' open' : ''}><summary><span>${esc(r)} <span class="small">${q ? list.length + ' of ' : ''}${all.length}</span></span><span class="zf-c">${reward[r] ? `<span class="bx-rw">Register all ${all.length} to unlock: ${esc(reward[r])}</span>` : cnt}</span></summary>${rows}</details>`;
    }).join('');
    return `<h2>Bestiary</h2><p>${esc(PG.what || '')}${PG.open ? ` <span class="small">${esc(PG.open)}</span>` : ''}</p>
      <h4>Register chance per kill</h4>${strip}${boost}
      <h3>Monsters by realm</h3>${filterBox('search a monster in every realm', q0)}${q ? `<p class="small">${shown} found.</p>` : ''}<div class="zfolds">${folds}</div>`;
  };
  KL.bestiary = 'Bestiary';
  INDEX.push({ k: 'bestiary', id: '', t: 'Bestiary', s: 'monster collection · +50% to Potential, Attribute and Relic effects', w: 3 });
})(window.WK);
