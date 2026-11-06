/* Home page, Zones (by realm), zone pages, Monsters (by zone / one table) + monster pages */
(function (K) {
  const { W, M, I, Z, R, esc, link, tag, fmt, pct, ilink, mlink, zlink, rtable, gen, P, INDEX, KL, subtabs, filterBox } = K;
  const REALMS = [...new Set(W.zones.map(z => z.realm))];
  const zm = W.zone_meta || {};
  /* Event Zone line: what the map spawns there now, its drops and what they make (built from the map) */
  K.ezShort = () => { const EZ = W.event_zone; if (!EZ || !(EZ.monsters || []).length) return ''; return `<div class="evrow"><span class="evl"><span class="evdot"></span>Event zone</span><span>${EZ.monsters.map(m => mlink(m.id)).join(', ')} · <a href="#events">drops and details</a></span></div>`; };
  K.ezLine = () => { const EZ = W.event_zone; if (!EZ || !(EZ.monsters || []).length) return '';
    const mk = (EZ.makes || []).map(r => `${r.in.map(([k, n]) => (n > 1 ? fmt(n) + '× ' : '') + ilink(k)).join(' + ')} → ${ilink(r.out)}`).join(' · ');
    return `<div class="evrow"><span class="evl"><span class="evdot"></span>Event zone</span><span>${EZ.monsters.map(m => mlink(m.id)).join(', ')} in ${link('zone', EZ.zone, 'Event Zone')}${EZ.monsters[0].respawn_s ? ` <span class="small">· respawns every ${EZ.monsters[0].respawn_s} s</span>` : ''}</span></div>`
      + `<div class="evrow evsub">Drops ${EZ.drops.map(d => `${ilink(d.item)} <span class="small">${K.dropPct(d.chance, d.item)}</span>`).join(', ')}${mk ? `<br>${mk}` : ''}</div>`; };
  P.home = () => {
    const H = (W.heroes || []).length, T = (W.tierlist && W.tierlist.heroes || []).length;
    const card = (h, txt, sub) => `<a class="card home" href="#${h}"><h3>${txt}</h3><p class="small">${sub}</p></a>`;
    const EV = (W.events || []).filter(e => e.on);
    const ez = K.ezShort(); const strip = EV.length || ez ? `<div class="evstrip col">${EV.length ? `<div class="evrow"><span class="evl"><span class="evdot"></span>Live events</span>${EV.map(e => `<a class="evchip ev-${e.id}" href="#events" title="${esc(e.what)}">${esc(e.chip)}</a>`).join('')}</div>` : ''}${ez}</div>` : '';
    return `${strip}<div class="card hi"><p style="margin:0"><img src="img_map.png" alt="" style="width:40px;height:40px;vertical-align:middle;margin-right:8px;border-radius:6px"><b>New?</b> Start with the ${link('guides', 'early-game', 'Early game guide')}.</p></div>
    <div class="card hi"><p style="margin:0"><span style="display:inline-block;width:40px;height:40px;vertical-align:middle;margin-right:8px;border-radius:6px;background:var(--accent-soft);color:var(--accent);text-align:center;line-height:40px;font-size:22px">➜</span><b>Past the early game?</b> ${link('planner', '', 'Where to farm next')}: set your gear once, then follow each slot's next step.</p></div>
    <p><a class="discord" href="https://discord.gg/Z5Pf8exufw" target="_blank" rel="noopener">Join the CWG RPG Discord</a> <span class="small">· news and community</span></p>
    <div class="grid">
      ${card('zones', 'Zones', `${W.zones.length} zones in order: requirements, bosses, shops`)}
      ${card('monsters', 'Monsters', `${Object.keys(M).length} monsters and bosses by zone: HP, gold, EXP, full drops`)}
      ${card('items', 'Items', `${Object.keys(I).length.toLocaleString()} items by zone or type: stats, sources, recipes`)}
      ${card('recipes', 'Recipes', `${(W.recipe_groups || []).length} crafting recipes and enhancement chains`)}
      ${card('heroes', 'Heroes', `${[...new Set((W.heroes || []).map(h => h.lineage))].length} heroes with tier 1, 2 and 3 abilities`)}
      ${card('tierlist', 'Tier list', 'Tier 3 of every hero at best in slot: boss, AoE, AFK farm, utility, survival')}
      ${card('guides', 'Guides', 'Early game route and gear progression by slot, with checklists')}
      ${card('systems', 'Game systems', 'Drop Odds, potions, stat shops, awakening, slots, attributes, party dungeons, potential, sailing, relics, Dimension Link')}
      ${card('achievements', 'Achievements', `${((W.achievements || {}).list || []).length} journal entries and the bonuses they pay`)}
      ${card('bestiary', 'Bestiary', `${Object.keys((W.bestiary || {}).entries || {}).length} monsters to register, up to +50% on Potential, Attribute and Relic effects`)}
      ${card('events', 'Events', `${(W.events || []).filter(e => e.on).length} events live now, and what each one boosts`)}
      ${card('pets', 'Pets', 'Every pet, its bonus and the companions')}
      ${card('calc', 'Calculators', 'Drop chance, enhancement cost, roll odds, engraving, dungeon titles')}
    </div>`;
  };
  P.zones = () => `<h2>Zones</h2><p class="small">${W.zones.length} zones in the order you reach them, each with monsters, bosses, dungeons and shops.</p>
  <div class="grid">${REALMS.map(r => `<div class="card"><h3>${esc(r)}</h3><ol>${W.zones.filter(z => z.realm === r).map(z => `<li value="${z.order}">${link('zone', z.id, z.name)}<br><span class="small">${esc(z.entry)}</span></li>`).join('')}</ol></div>`).join('')}</div>
  ${zm.stat_shop_caps ? `<details><summary>Stat shop caps</summary><div class="tbl"><table><tr><th>Shops</th><th class="num">Base stat cap</th></tr>${zm.stat_shop_caps.map(c => `<tr><td>${esc(c.shops)}</td><td class="num">${fmt(c.cap)}</td></tr>`).join('')}</table></div></details>` : ''}`;
  const mrow = e => { const m = M[e.id]; return `<tr><td>${mlink(e.id)}</td><td class="num">${esc(e.level || '')}</td><td class="num">${fmt(e.hp)}</td><td class="num">${e.spawn_count || ''}</td><td class="num">${e.respawn_s != null ? e.respawn_s + ' s' : ''}</td><td class="num">${m && m.gold != null ? fmt(m.gold) : ''}</td><td class="small">${m ? [...m.drops].sort((a, b) => b.chance - a.chance).slice(0, 5).map(d => ilink(d.item) + ' ' + K.dropPct(d.chance, d.item)).join(' · ') + (m.drops.length > 5 ? ` · +${m.drops.length - 5}` : '') : ''}</td></tr>`; };
  const mtable = (list, title) => list && list.length ? `<h4>${title}</h4><div class="tbl"><table class="sortable"><tr><th>Monster</th><th class="num">Lv</th><th class="num">HP</th><th class="num">Spawns</th><th class="num">Respawn</th><th class="num">Gold</th><th>Drops</th></tr>${list.map(mrow).join('')}</table></div>` : '';
  const inZone = (zid, kind, raid) => Object.values(M).filter(m => m.zones.some(z => z.zone === zid && z.kind === kind && (!raid || z.raid === raid))).map(m => ({ ...m.zones.find(z => z.zone === zid && z.kind === kind && (!raid || z.raid === raid)), id: m.id }));
  P.zone = id => {
    const z = Z[id]; if (!z) return '<p>Unknown zone.</p>';
    const farm = {}; for (const m of Object.values(M)) if (m.zones.some(x => x.zone === id)) for (const d of m.drops) { const it = I[d.item]; if (!it) continue; if (['Hidden', 'Ticket', 'Gem', 'Gloves'].includes(it.type) || /Essence|Manual|Stone/.test(it.name)) { if (!farm[d.item] || farm[d.item].c < d.chance) farm[d.item] = { c: d.chance, m: m.id }; } }
    const farmList = Object.entries(farm).sort((a, b) => b[1].c - a[1].c).slice(0, 10);
    return `<h2>${esc(z.name)} ${tag(z.realm, 'acc')} <span class="small">#${z.order}</span></h2>
    <div class="card"><div class="kv"><b>Entry</b><span>${esc(z.entry)}</span><b>Get there</b><span>${esc(z.how)}</span>${farmList.length ? `<b>Key drops</b><span>${farmList.map(([k, v]) => ilink(k) + ' <span class="small">' + K.dropPct(v.c, k) + ' · ' + mlink(v.m) + '</span>').join('<br>')}</span>` : ''}${(z.notes || []).length ? `<b>Notes</b><span>${gen(z.notes)}</span>` : ''}</div></div>
    ${mtable(z.normal_monsters, 'Monsters')}${mtable(z.field_bosses, 'Field bosses')}
    ${(z.raids || []).map(rd => `<h4>Raid · ${esc(rd.name)}</h4><p class="small">${esc(rd.entry || '')}${(Array.isArray(rd.notes) ? rd.notes : [rd.notes]).filter(Boolean).map(x => '<br>' + esc(x)).join('')}</p>${mtable(inZone(id, 'raid boss', rd.name).length ? inZone(id, 'raid boss', rd.name) : (rd.bosses || []).map(b => ({ id: b.id })), 'Bosses')}`).join('')}
    ${(z.tickets || []).map(td => `<h4>Ticket dungeon · ${esc(td.name)}</h4><p class="small">Ticket: ${td.ticket && I[td.ticket.id] ? ilink(td.ticket.id) : esc(td.ticket && td.ticket.name || '')}${td.ticket_source ? ' · ' + esc(td.ticket_source) : ''}<br>${esc(td.how || '')}</p>${mtable(inZone(id, 'ticket dungeon monster', td.name), 'Monsters')}${mtable(inZone(id, 'ticket dungeon boss', td.name).length ? inZone(id, 'ticket dungeon boss', td.name) : (td.bosses || []).map(b => ({ id: b.id })), 'Bosses')}`).join('')}
    ${z.class_change ? `<h4>Class change</h4><p>${esc(z.class_change)}</p>` : ''}${z.party_dungeon ? `<h4>Party dungeon</h4><p>${esc(z.party_dungeon)}</p>` : ''}
    ${(z.shops || []).map(sh => sh.items.some(it => 'embers' in it)
      ? `<h4 class="sys-hollow_night">Shop · ${esc(sh.name)}</h4><div class="tbl"><table><tr><th>Item</th><th class="num">Hollow Embers</th></tr>${sh.items.map(it => `<tr><td>${ilink(it.id)}</td><td class="num">${typeof it.embers === 'number' ? fmt(it.embers) : esc(it.embers)}</td></tr>`).join('')}</table></div>`
      : `<h4>Shop · ${esc(sh.name)}</h4><div class="tbl"><table><tr><th>Item</th><th class="num">Gold</th><th class="num">Lumber</th></tr>${sh.items.map(it => `<tr><td>${ilink(it.id)}</td><td class="num">${fmt(it.gold)}</td><td class="num">${fmt(it.lumber)}</td></tr>`).join('')}</table></div>`).join('')}`;
  };
  const zoneMons = zid => { const seen = new Set(); const out = []; for (const m of Object.values(M)) for (const z of m.zones) { if (z.zone !== zid || seen.has(m.id)) continue; seen.add(m.id); out.push({ m, z }); } const rank = { normal: 0, 'field boss': 1, 'ticket dungeon monster': 2, 'ticket dungeon boss': 3, 'raid boss': 4 }; return out.sort((a, b) => (rank[a.z.kind] || 5) - (rank[b.z.kind] || 5) || (parseInt(a.z.level) || 0) - (parseInt(b.z.level) || 0)); };
  const monsByZone = (realm, zid) => W.zones.filter(z => z.realm === realm && (!zid || z.id === zid)).map(z => { const list = zoneMons(z.id); if (!list.length) return ''; return `<div class="card"><h3>${link('zone', z.id, z.name)} <span class="small">#${z.order}</span></h3><p class="small">${esc(z.entry)}</p>
    <div class="tbl"><table class="sortable"><tr><th>Monster</th><th>Kind</th><th class="num">Lv</th><th class="num">HP</th><th class="num">Gold</th><th>Best drops</th></tr>${list.map(({ m, z }) => `<tr><td>${mlink(m.id)}</td><td class="small">${esc(z.kind)}${z.raid ? ' · ' + esc(z.raid) : ''}</td><td class="num">${esc(z.level || '')}</td><td class="num">${fmt(z.hp)}</td><td class="num">${fmt(m.gold)}</td><td class="small">${[...m.drops].sort((a, b) => b.chance - a.chance).slice(0, 3).map(d => ilink(d.item) + ' ' + K.dropPct(d.chance, d.item)).join(' · ')}${m.drops.length > 3 ? ` · +${m.drops.length - 3}` : ''}</td></tr>`).join('')}</table></div></div>`; }).join('');
  P.monsters = (_, f) => {
    const view = f.view === 'all' ? 'all' : 'zone';
    const head = `<h2>Monsters</h2><p class="small">Base drop chances. Drops fall on the ground, anyone can loot them. Gold and EXP per kill. Field monsters can rise again as Hollowbound with more HP and damage (<a href="#systems?sys=hollow_night">Hollow Night</a>).</p>${subtabs('monsters', 'view', [['zone', 'By zone'], ['all', 'Full list']], view)}`;
    if (view === 'zone') { const realm = REALMS.includes(f.realm) ? f.realm : REALMS[0]; const zs = W.zones.filter(z => z.realm === realm && zoneMons(z.id).length); const zid = zs.some(z => z.id === f.mzone) ? f.mzone : ''; return head + subtabs('monsters', 'realm', REALMS.map(r => [r, r]), realm) + (zs.length > 1 ? `<div class="zone-pick">${subtabs('monsters', 'mzone', [['', 'All zones']].concat(zs.map(z => [z.id, z.name])), zid)}</div>` : '') + monsByZone(realm, zid); }
    const q = (f.q || '').toLowerCase(), k = f.kind || '';
    const zo = m => m.zones.length ? Math.min(...m.zones.map(z => Z[z.zone] ? Z[z.zone].order : 99)) : 99; const lv = m => { const l = m.zones.map(z => parseInt(z.level)).filter(x => !isNaN(x)); return l.length ? Math.max(...l) : null; };
    const rows = Object.values(M).filter(m => (!k || m.kind === k) && (!q || m.name.toLowerCase().includes(q))).sort((a, b) => zo(a) - zo(b) || (lv(a) || 0) - (lv(b) || 0));
    const kinds = [...new Set(Object.values(M).map(m => m.kind))];
    return `${head}${subtabs('monsters', 'kind', [['', 'All'], ...kinds.map(x => [x, x])], k)}${filterBox('filter by name', f.q)}<p class="small">${rows.length} monsters in zone order. Click a header to sort.</p>
    <div class="tbl"><table class="sortable"><tr><th>Monster</th><th>Kind</th><th class="num">Lv</th><th>Zone</th><th class="num">Gold</th><th class="num">EXP</th><th>Drops</th></tr>${rows.slice(0, 400).map(m => `<tr><td>${mlink(m.id)}</td><td class="small">${esc(m.kind)}</td><td class="num">${lv(m) != null ? lv(m) : ''}</td><td class="small">${[...new Set(m.zones.map(x => x.zone))].map(zlink).join('; ')}</td><td class="num">${fmt(m.gold)}</td><td class="num">${fmt(m.exp)}</td><td class="small">${[...m.drops].sort((a, b) => b.chance - a.chance).slice(0, 4).map(d => ilink(d.item) + ' ' + K.dropPct(d.chance, d.item)).join(' · ')}${m.drops.length > 4 ? ` · +${m.drops.length - 4}` : ''}</td></tr>`).join('')}</table></div>`;
  };
  P.monster = id => {
    const m = M[id]; if (!m) return '<p>Unknown monster.</p>';
    /* Bestiary entry (map 1.2.x): rarity and register chance per kill, who rolls; the Bestiary tab has the rest */
    const be = ((W.bestiary || {}).entries || {})[id]; const bw = be && be.counts_when && be.counts_when !== 'killer only' ? ((be.counts_when.match(/within\s+(\d+)/) || [])[1]) : null;
    const bestLine = be ? `<p class="small">${link('bestiary', '', 'Bestiary')}: ${esc(be.rarity)}, ${pct(be.chance_pct)} per kill, ${be.counts_when && be.counts_when !== 'killer only' ? `rolled by every hero within ${bw ? esc(bw) + ' ' : ''}range` : 'rolled only for the player who kills it'}</p>` : '';
    return `<h2>${esc(m.name)} ${tag(m.kind, 'acc')}</h2>
    ${m.zones.length ? `<h3>Location</h3><ul>${m.zones.map(z => `<li>${zlink(z.zone)} · ${esc(z.kind)}${z.raid ? ' · ' + esc(z.raid) : ''}${z.level ? ` · Lv ${esc(z.level)}` : ''}${z.hp ? ` · ${fmt(z.hp)} HP` : ''}${z.spawn_count ? ` · ${z.spawn_count} spawn${z.spawn_count > 1 ? 's' : ''}` : ''}${z.respawn_s != null ? ` · respawn ${z.respawn_s} s` : ''}</li>`).join('')}</ul>` : '<p class="small">No fixed spawn. Shows up from a summon, a dungeon wave or an event.</p>'}
    ${m.gold != null ? `<p><b>Kill reward:</b> ${fmt(m.gold)} gold · ${fmt(m.exp)} EXP${m.lumber ? ' · ' + fmt(m.lumber) + ' lumber' : ''} </p>` : `<p><b>Kill reward:</b> none</p>`}
    ${bestLine}
    <h3>Drops (${m.drops.length})</h3>${m.drops.length ? `<div class="tbl"><table><tr><th>Item</th><th>Type</th><th class="num">${K.setup().drop ? 'Your chance' : 'Base chance'}</th><th class="num">Rolls</th></tr>${[...m.drops].sort((a, b) => b.chance - a.chance).map(d => `<tr><td>${ilink(d.item)}</td><td class="small">${esc((I[d.item] || {}).type || '')}</td><td class="num">${K.yourPct(d.chance, K.yourDrop(d.chance, d.item))}</td><td class="num">${d.rolls}</td></tr>`).join('')}</table></div>` : '<p class="small">No drops.</p>'}`;
  };
  KL.zone = 'Zone'; KL.monster = 'Monster / boss';
  for (const z of W.zones) INDEX.push({ k: 'zone', id: z.id, t: z.name, s: z.realm + ' · ' + z.entry, w: 4 });
  for (const m of Object.values(M)) INDEX.push({ k: 'monster', id: m.id, t: m.name, s: m.kind + (m.zones[0] && Z[m.zones[0].zone] ? ' · ' + Z[m.zones[0].zone].name : ''), w: 3 });
})(window.WK);
