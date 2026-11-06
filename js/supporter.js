/* Pets and Companions (Anya etc.) - public wording (Supporter and Commands tabs removed 2026-10-19, user)
   Compact pass 2026-10-19 (user: "a lot of information at the top"): one intro line, a one-line legend, the pet table, rules folded (a card grid was tried and rejected: too cramped) */
(function (K) {
  const { W, esc, link, ilink, P, INDEX, KL } = K;
  const CO = W.companions, PE = W.pets;
  const RULE_CUT = /Cosmetics window|revives next to your hero|immune to magic|deal 25 \+|walk about|Ownership isn't saved|-damageon|Stones are checked/;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const coBonus = c => { const s = String(c.effect).replace(/^Ownership bonus \([^)]*\): /, '').split(/(?<=[.;])\s/)[0];
    return /^No (aura|stats)/.test(s) ? (/Anya/.test(c.item.name) ? 'Free for everyone, picks up loot (-autopickup)' : 'Cosmetic') : cap(s.replace(/[;,]$/, '.')); };
  P.pets = id => {
    const V = PE.view || { pets: [] }; const byCode = {}; for (const p of PE.pets) byCode[p.code] = p;
    /* pet table (user 2026-10-19: the card grid was too cramped, the table reads better) */
    const line = (lab, cls, v) => v && v !== 'Same' ? `<div class="${cls}"><span>${lab}</span> ${esc(v)}</div>` : '';
    const heroCell = v => v.cosmetic ? '<span class="small">Cosmetic</span>' : v.hero ? `<div>${esc(v.hero)}</div>${line('Evolved', 'pv-evo', v.hero_evo)}${v.full ? `<div class="pv-full"><span>Full set</span> ${esc(v.full)}${v.both ? `<span class="pv-and">with stone</span> ${esc(v.both)}` : ''}</div>` : ''}` : '<span class="small">-</span>';
    const petCell = v => v.pet ? `<div>${esc(v.pet)}</div>${line('Evolved', 'pv-evo', v.pet_evo)}` : '<span class="small">-</span>';
    const nameCell = v => `<img class="pv-ic" src="${v.img || `img/pets/${v.icon}.png`}" alt="" loading="eager"><a href="#pets/${v.code}"><b>${esc(v.name)}</b></a><div class="small">${esc(v.title)}</div>${v.evo ? `<div class="small">Evolves into ${esc(v.evo)}</div>` : ''}`;
    const row = v => `<tr class="${v.note ? 'pv-has' : ''}"><td class="pv-name">${nameCell(v)}</td><td>${heroCell(v)}</td><td>${petCell(v)}</td></tr>${v.note ? `<tr class="pv-note"><td></td><td colspan="2">${esc(v.note)}</td></tr>` : ''}`;
    const table = list => `<div class="tbl"><table class="pv"><tr><th>Pet</th><th>Hero bonus</th><th>While summoned</th></tr>${list.map(row).join('')}</table></div>`;
    const legend = `<p class="small pc-lg"><span class="pc-x evo"><span>Evolved</span></span> ${PE.evolution_stone ? ilink(PE.evolution_stone.id) : 'Evolution Stone'} in the pet's own inventory, never used up · <span class="pc-x full"><span>Full set</span></span> own pets 1 to 12</p>`;
    if (id) { const v = V.pets.find(x => x.code === id); if (!v) return '<p>Unknown pet.</p>';
      return `<h2>${esc(v.name)} <span class="small">${esc(v.title)}</span></h2><p class="small">${link('pets', '', 'All pets')}</p>${table([v])}${legend}${v.code === 'P13' && byCode.P13 && byCode.P13.obtained_item ? `<p>Unlock item: ${ilink(byCode.P13.obtained_item.id)}</p>` : ''}`; }
    const intro = [V.intro, ...(V.owner_rules || [])].filter(Boolean).join(' ');
    const rules = (V.rules || []).filter(x => !RULE_CUT.test(x));
    const stoneMore = (V.evolve || '').split(/(?<=\.)\s+/).filter(x => /anywhere/.test(x));
    return `<h2>Pets</h2><p>${esc(intro)}</p>${legend}
    ${table(V.pets)}
    <h3>Companions</h3><p class="small">Put one in a storage bag and the bag becomes the companion.</p>
    <div class="tbl"><table><tr><th>Companion</th><th>Bonus</th></tr>${CO.items.map(c => `<tr><td>${ilink(c.item.id)}</td><td class="small">${esc(coBonus(c))}</td></tr>`).join('')}</table></div>
    <details class="zfold"><summary><span>How pets work</span></summary><ul class="pc-r">${[...rules, ...stoneMore].map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>`;
  };

  KL.companions = 'Companion'; KL.pets = 'Pet';
  for (const c of CO.items) INDEX.push({ k: 'pets', id: '', t: c.item.name + ' (' + c.unit.name + ')', s: 'companion · ' + c.effect.slice(0, 100), w: 3 });
  for (const p of PE.pets) INDEX.push({ k: 'pets', id: p.code, t: p.code + ' ' + p.name, s: 'pet · ' + (p.passive ? p.passive.text : (p.summoned || [''])[0]).slice(0, 100), w: 3 });
})(window.WK);
