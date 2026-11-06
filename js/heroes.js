/* Heroes: map stats, abilities and transformations for all three tiers. */
(function (K) {
  const { W, esc, link, tag, fmt, P, INDEX, KL, subtabs, ilink } = K;
  const HM = W.heroes, PORT = W.portraits || {};
  const LINEAGES = [...new Set(HM.filter(h => !h.skin).map(h => h.lineage))].sort();
  const KC = W.kit_chips || {}, KF = W.kit || {};
  const CCLS = { Taunt: 'tank', 'Party heal': 'heal', 'Party buff': 'buf', Debuff: 'deb', Clones: 'dmg', Summons: 'dmg' };
  const TD = W.tier_diff || {}, FORMS = W.forms || {}, FD = W.forms_diff || {};
  const T3U = (W.t3 || {}).unlock;
  const MAP_V = String((W.meta || {}).map || '').replace(/^.*?(\d[\d.]*)\s*$/, '$1');

  P.heroes = (_, f) => {
    const acc = ['free', 'supp'].includes(f.hacc) ? f.hacc : 'all', rl = ['tank', 'dmg', 'buf', 'deb', 'heal'].includes(f.hrole) ? f.hrole : 'all';
    const info = l => { const t = HM.find(h => h.lineage === l && h.tier === 1 && !h.skin) || {}; return { l, stat: t.stat, supp: !!t.donation_flag, roles: chipsOf(l) }; };
    const all = LINEAGES.map(info), nFree = all.filter(x => !x.supp).length;
    const shown = all.filter(x => (acc === 'all' || (acc === 'supp') === x.supp) && (rl === 'all' || x.roles.some(r => CCLS[r] === rl)));
    const card = x => `<a class="hx-card" href="#hero/${encodeURIComponent(x.l)}"><span class="hx-pic">${img((PORT[x.l] || [])[1] || (PORT[x.l] || [])[0], 40)}${x.supp ? '<span class="hx-star" title="supporter hero">★</span>' : ''}</span><span class="hx-t"><b>${esc(x.l)}</b><span class="hx-r">${chipHtml(x.l)}</span></span></a>`;
    const col = (s, name) => { const xs = shown.filter(x => x.stat === s); return `<section class="hx-col"><h3 class="hx-h sb-${s.toLowerCase()}-t">${name} <span class="small">${xs.length}</span></h3><div class="hx-list">${xs.map(card).join('') || '<p class="small">None with this filter.</p>'}</div></section>`; };
    return `<h2>Heroes</h2>${updated()}<p class="small">${all.length} heroes, ${nFree} free. <span class="hx-star-i">★</span> = supporter hero. Tier 2 comes with the class change, Tier 3 with the ${link('item', 'I0MJ', 'Third Class Advancement Manual')}.</p>
    <div class="hx-f">${subtabs('heroes', 'hacc', [['all', 'All'], ['free', 'Free'], ['supp', 'Supporter']], acc)}${subtabs('heroes', 'hrole', [['all', 'Any kit'], ['tank', 'Taunt'], ['buf', 'Party buff'], ['heal', 'Party heal'], ['deb', 'Debuff'], ['dmg', 'Clones / summons']], rl)}</div>
    <div class="hx">${col('STR', 'Strength')}${col('AGI', 'Agility')}${col('INT', 'Intelligence')}</div>
    <p class="small">Chips are facts from the skills, not roles. Taunt = forces enemies to attack this hero. Party buff / Party heal = reaches your allies. Debuff = weakens enemies. Every hero deals damage.</p>`;
  };

  P.hero = l => {
    const hs = HM.filter(h => h.lineage === l && !h.skin && h.tier <= 2).sort((a, b) => a.tier - b.tier); if (!hs.length) return '<p>Unknown hero.</p>';
    const pics = PORT[l] || [], h1 = hs.find(h => h.tier === 1), h2 = hs.find(h => h.tier === 2), main = h2 || h1;
    const h3 = h2 && h2.t3;
    const tabs = [h3 && ['t3', 'Tier 3'], h2 && ['t2', 'Tier 2'], h1 && ['t1', 'Tier 1']].filter(Boolean);
    const cur = tabs.some(([k]) => k === K.filters.htab) ? K.filters.htab : (h2 ? 't2' : tabs[0][0]);
    const body = cur === 't3' ? t3Html(h3, l, h2) : cur === 't2' ? tierHtml(h2, l, h1) : tierHtml(h1, l);
    const kf = KF[l] || {}, kfl = (n, v) => { const s = (Array.isArray(v) ? v.filter(Boolean).slice(0, 2).join(' · ') : v) || ''; return s ? `<span><b>${n}</b> ${esc(s)}</span>` : ''; };
    const kitLine = [kfl('Taunt', kf.taunt), kfl('Party', kf.party_help), kfl('Enemies', kf.enemy_debuffs), kfl('Extra bodies', kf.extra_bodies)].filter(Boolean).join('');
    return `${updated()}<div class="hero-head">${pics[1] || pics[0] ? `<img class="hero-pic" src="${pics[1] || pics[0]}" alt="">` : ''}<div class="hero-main">
      <h2 style="margin:0 0 4px">${esc(l)} ${hs.some(h => h.donation_flag) ? tag('supporter hero', 'acc') : tag('free', 'ok')}</h2>
      <p class="small" style="margin:0 0 6px"><b>${main ? esc(main.stat) : ''}</b> <span class="hx-r">${chipHtml(l)}</span></p>
      ${kitLine ? `<p class="small kit-f" style="margin:6px 0 0">${kitLine}</p>` : ''}
    </div></div>
    ${subtabs('hero/' + encodeURIComponent(l), 'htab', tabs, cur)}<p class="small"><a href="#" class="ab-all">Expand all</a> · tap an ability for its full tooltip</p>${body}`;
  };

  const updated = () => `<div class="updated">UPDATED<span>For map ${esc(MAP_V)}</span></div>`;
  const chipsOf = l => KC[l] || [];
  const chipHtml = l => chipsOf(l).map(c => `<i class="r-${CCLS[c] || 'dmg'}">${esc(c)}</i>`).join('');
  const img = (src, sz) => src ? `<img src="${src}" alt="" style="width:${sz}px;height:${sz}px;object-fit:cover;border-radius:6px">` : '';
  const t3Html = (t, l, pv) => `${statStrip(t, t.title, '', pv)}${T3U ? `<details class="zfold hs-un"><summary><span>How to unlock Tier 3</span></summary><div style="padding:0 12px 4px">${t3Unlock()}</div></details>` : ''}${abilTable(t, tdOf(l, 3), tdDrop(l, 3), 2)}${formsHtml(l, 3)}`;
  const tierHtml = (h, l, pv) => `${statStrip(h, h.name, howGet(h), pv)}${abilTable(h, h.tier == 2 ? tdOf(l, 2) : null, h.tier == 2 ? tdDrop(l, 2) : null, 1)}${formsHtml(l, h.tier)}`;
  const t3Unlock = () => { if (!T3U) return ''; const raid = (W.zones || []).find(z => (z.raids || []).some(r => r.name === 'Light/Dark Raid'));
    return `<p class="small" style="margin:10px 0 4px"><b>Unlock:</b> craft the ${ilink(T3U.manual.id)} from ${T3U.mats.map(m => ilink(m.id)).reduce((a, x, i, r) => a + (i === 0 ? '' : i === r.length - 1 ? ' and ' : ', ') + x, '')} (${T3U.chance}%), then use it with your Tier 2 hero. Level, XP, base stats and items carry over.</p><p class="small">The three ${raid ? link('zone', raid.id, 'Light/Dark Raid') : 'Light/Dark Raid'} bosses drop the essences (${T3U.drop_chance}% base each). Entry needs ${fmt(T3U.need)} base STR, AGI and INT each.</p>`; };
  const howGet = h => /^Starting pick/.test(h.obtain || '') ? 'Free pick at the start.' : /^Supporter hero/.test(h.obtain || '') ? 'Supporter hero: needs its supporter reward to pick.'
    : /^First class advancement/.test(h.obtain || '') ? `Class change: carry the ${ilink('I00W')} into the class-change area. Level goes to 100, base stats stay.` : esc(h.obtain || '');
  const statStrip = (t, name, how, pv) => { pv = pv || {}; return `<div class="hs">${name ? `<span class="hs-n">${esc(name)}</span>` : ''}${hsC('HP', fmt(+t.hp) + dl(t.hp, pv.hp))}${t.str != null ? hsC('Base STR/AGI/INT', `${n1(t.str)} / ${n1(t.agi)} / ${n1(t.int)}`) : ''}${hsC(t.str != null ? 'Per level' : 'Per level STR/AGI/INT', `+${n1(t.str_plus)}${dl(t.str_plus, pv.str_plus)} / +${n1(t.agi_plus)}${dl(t.agi_plus, pv.agi_plus)} / +${n1(t.int_plus)}${dl(t.int_plus, pv.int_plus)}`)}${t.atk_time ? hsC('Attack', `${n1(t.atk_time)} s${dl(t.atk_time, pv.atk_time, true)} · ${fmt(t.range)} range${dl(t.range, pv.range)}`) : ''}${t.atk_time ? hsC('Armor', n1(t.armor) + dl(t.armor, pv.armor)) + hsC('Move', fmt(t.move) + dl(t.move, pv.move)) : ''}${t.skill_mult != null ? `<span title="Every skill hit and system hit of this form (procs, mana bursts, active skills, relic, Potential and Sailing hits) is multiplied by this. Basic attacks are not."><b>Skill damage</b> x${n1(t.skill_mult)}${dl(t.skill_mult, pv.skill_mult)}</span>` : ''}</div>${how ? `<p class="small hs-how">${how}</p>` : ''}`; };
  const formsHtml = (l, tier) => { const fl = ((FORMS[l] || {}).tiers || {})[String(tier)] || []; const fd = (FD[l] || {})[String(tier)];
    const fChip = fd && fd.form && fd.form.chip ? `<span class="td-c ${fd.form.chip === 'same' ? 's' : /^new/.test(fd.form.chip) ? 'n' : 'c'}">${esc(fd.form.chip === 'same' ? 'same as Tier ' + (tier - 1) : fd.form.chip)}</span>` : '';
    return fl.map(f => `<details class="card form-card"><summary><b>Transformation · ${esc(f.form_name)}</b> ${fChip}<span class="small">${esc(f.trigger || '')}${f.duration_s ? ` · ${f.duration_s} s` : ''}${f.cooldown_s ? ` · every ${f.cooldown_s} s` : ''}${f.uptime != null ? ` · about ${Math.round(f.uptime * 100)}% of the time` : ''}</span></summary>${(f.adds || []).length ? `<p class="small"><b>Adds:</b> ${f.adds.map(esc).join(' · ')}</p>` : ''}${(f.loses || []).length ? `<p class="small"><b>Loses:</b> ${f.loses.map(esc).join(' · ')}</p>` : ''}${(f.abilities || []).length ? abilTable({ abilities: f.abilities }, fd ? fd.abilities : null, fd ? fd.dropped : null, tier - 1) : ''}</details>`).join(''); };
  const abilTable = (h, D, dr, pt) => `<div class="ab-list">${(h.abilities || []).filter(a => !/^(Move to|Inventory|Attack$|Stop$|Hold|Patrol)/.test(a.name)).map(a => { const d = D ? D[a.id === '(hidden)' ? '(hidden):' + a.name : a.id] : null; return `<details class="ab"><summary>${(window.CWG_AICONS || {})[a.id] ? `<img class="ab-ic" src="data:image/webp;base64,${window.CWG_AICONS[a.id]}" alt="">` : '<span></span>'}${/press/.test(abilKind(a)) && a.hotkey ? `<span class="ab-key">${esc(a.hotkey)}</span>` : '<span class="ab-key none"></span>'}<span class="ab-name">${esc(a.name)}${a.levels > 1 ? ` <span class="small">${a.levels} levels</span>` : ''}</span><span class="ab-kind ${/press/.test(abilKind(a)) ? 'press' : 'pas'}">${esc(abilKind(a))}</span><span class="ab-prev">${d ? tdChip(d, pt) : ''}${a.tip_off ? '<i class="ab-offdot" title="the in-game tooltip is off here"></i>' : ''}${esc(a.real || abilPrev(a.tooltip))}</span></summary><div class="ab-body">${d ? `<p class="td-l ${({ up: 'u', down: 'dn', same: 's', new: 'n' })[d.status] || 'c'}">${tdChip(d, pt)}${d.line ? esc(d.line) : ''}</p>` : ''}${a.real ? `<p class="ab-real"><b>What it does:</b> ${esc(a.real)}</p>` : ''}${a.tip_off ? `<p class="ab-off">Tooltip is off: ${esc(a.tip_off)}</p>` : ''}${a.tooltip ? `<p class="ab-tl">In-game tooltip</p><div class="small pre ab-tip">${esc(a.tooltip)}</div>` : ''}</div></details>`; }).join('')}</div>${dropHtml(dr, pt)}`;
  const hsC = (k, v) => `<span><b>${k}</b> ${v}</span>`;
  const dl = (a, b, lowGood) => { if (b == null || a == null || isNaN(+a) || isNaN(+b) || +a === +b) return ''; const d = +a - +b, good = lowGood ? d < 0 : d > 0; return `<i class="hs-d ${good ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'}${Math.abs(d) >= 1000 ? fmt(Math.round(Math.abs(d))) : n1(Math.round(Math.abs(d) * 100) / 100)}</i>`; };
  const n1 = x => { const v = +x; return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100); };
  const tdOf = (l, tier) => (TD[l] || {})[String(tier)], tdDrop = (l, tier) => ((TD[l] || {}).dropped || {})[String(tier)];
  const tdChip = (d, pt) => d.status === 'same' ? `<span class="td-c s">same as Tier ${pt}</span>` : d.status === 'new' ? '<span class="td-c n">new</span>' : `<span class="td-c ${({ up: 'u', down: 'dn' })[d.status] || 'c'}">${esc(d.chip || 'changed')}</span>`;
  const dropHtml = (dr, pt) => (dr || []).length ? `<p class="small td-drop">Not kept from Tier ${pt}: ${dr.map(x => esc(x.name)).join(', ')}</p>` : '';
  const abilKind = a => a.morph ? 'press · transforms' : a.kind === 'transform' ? 'passive · transforms' : a.kind === 'press' ? (/^Susanoo|Elderwood|Colossus/.test(a.name) ? 'press · transforms' : 'press') : a.kind === 'passive' ? 'passive' : (a.passive ? 'passive' : 'press');
  const abilPrev = s => { const l = String(s || '').split('\n').map(x => x.trim()).filter(x => x && !/^["“]/.test(x))[0] || ''; return l.length > 110 ? l.slice(0, 107) + '…' : l; };

  KL.hero = 'Hero / ability';
  for (const h of HM) { if (h.skin || h.tier > 2) continue; INDEX.push({ k: 'hero', id: h.lineage, t: h.lineage + ' tier ' + h.tier, s: 'hero · ' + h.stat + (h.donation_flag ? ' · supporter' : ''), w: 3 }); for (const a of (h.abilities || [])) if (!/^(Move to|Inventory)/.test(a.name)) INDEX.push({ k: 'hero', id: h.lineage, t: a.name + ' (' + h.name + ')', s: 'ability · ' + String(a.tooltip || '').slice(0, 100), w: 1 }); for (const a of ((h.t3 || {}).abilities || [])) INDEX.push({ k: 'hero', id: h.lineage, t: a.name + ' (' + h.lineage + ' tier 3)', s: 'ability · ' + String(a.real || a.tooltip || '').slice(0, 100), w: 1 }); }
})(window.WK);

document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('.ab-all'); if (!a) return; e.preventDefault(); const ds = [...document.querySelectorAll('#out details.ab')]; const open = !ds.every(d => d.open); ds.forEach(d => d.open = open); a.textContent = open ? 'Collapse all' : 'Expand all'; });
