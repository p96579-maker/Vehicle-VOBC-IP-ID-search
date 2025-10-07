
(async function(){
  const resText = document.getElementById('resultText');
  const resBox = document.getElementById('result');
  const notice = document.getElementById('notice');
  const btnSearch = document.getElementById('btnSearch');
  const btnClear = document.getElementById('btnClear');
  const btnCopy = document.getElementById('btnCopy');
  const btnPrint = document.getElementById('btnPrint');
  const input = document.getElementById('vehicle');
  const loadStatus = document.getElementById('loadStatus');

  const dsMeta = document.getElementById('dsMeta');
  const vehicleChips = document.getElementById('vehicleChips');
  const consistChips = document.getElementById('consistChips');

  function ipSpan(v){ return v ? `<span class="ip">${v}</span>` : ''; }
  const B = (t) => `<strong>${t}</strong>`;

  async function loadData(){
    try {
      const res = await fetch('assets/data.json?cb=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      loadStatus && (loadStatus.textContent = `Loaded ${j.length} vehicles (via network)`);
      return j;
    } catch (e) {
      try {
        const raw = document.getElementById('bootstrap-data')?.textContent || '[]';
        const j = JSON.parse(raw);
        loadStatus && (loadStatus.textContent = `Loaded ${j.length} vehicles (embedded fallback)`);
        return j;
      } catch (e2) {
        loadStatus && (loadStatus.textContent = 'Failed to load data.');
        throw e2;
      }
    }
  }

  let rows = [];
  try {
    rows = await loadData();
  } catch (e) {
    notice.textContent = 'Failed to load data.json (and no embedded fallback).';
    console.error(e);
    return;
  }

  const vehicles = Array.from(new Set(rows.map(r => String(r.vehicle)))).sort((a,b)=> +a - +b);
  const consists = Array.from(new Set(rows.map(r => String(r.consist)).filter(Boolean))).sort((a,b)=> +a - +b);
  if (dsMeta) dsMeta.textContent = `Vehicles: ${vehicles.length} • Consists: ${consists.length}`;

  function mkChip(label, onClick){
    const btn = document.createElement('button');
    btn.className = "px-2.5 py-1 text-xs rounded-full border border-slate-300 hover:bg-slate-50";
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }
  if (vehicleChips) { vehicles.forEach(v => vehicleChips.appendChild(mkChip(v, ()=>{ input.value = v; doSearch(); }))); }
  if (consistChips) { consists.forEach(c => consistChips.appendChild(mkChip(c, ()=>{ input.value = c; doSearch(); }))); }

  function normDigits(text){
    const m = String(text || '').match(/(\d+)/g);
    return m ? m.join('') : '';
  }
  function tidy(s){ return String(s || '').trim(); }

  function findByVehicleBase(baseDigits){
    let rec = rows.find(r => normDigits(r.vehicle) === baseDigits);
    if (!rec) rec = rows.find(r => String(r.vehicle).startsWith(baseDigits));
    if (!rec) rec = rows.find(r => String(r.vehicle).includes(baseDigits));
    return rec || null;
  }
  function findByConsist(consDigits){
    let rec = rows.find(r => normDigits(r.consist) === consDigits);
    if (!rec) rec = rows.find(r => String(r.consist).startsWith(consDigits));
    if (!rec) rec = rows.find(r => String(r.consist).includes(consDigits));
    return rec || null;
  }

  function lineBold(label, value=''){
    const sep = label.includes(':') ? '' : ' :';
    return `${B(label)}${sep}${value ? ' ' + value : ''}`;
  }

  function renderByRecord(r){
    const v = tidy(r.vehicle);
    const obruA = r.obru?.A || {};
    const obruB = r.obru?.B || {};
    const vobcA = r.vobc?.A || {};
    const vobcB = r.vobc?.B || {};
    const consist = tidy(r.consist);
    const idLT = tidy(r.vobc_id?.left_top);
    const idRB = tidy(r.vobc_id?.right_bottom);

    const lines = [];
    lines.push(`${lineBold('Vehicle')} : ${v}`);
    lines.push('');

    const obruA_loc = obruA.location_ip ? `location IP - ${ipSpan(obruA.location_ip)}` : '';
    const obruA_rem = obruA.remote_ip   ? `remote IP - ${ipSpan(obruA.remote_ip)}`     : '';
    if (obruA_loc || obruA_rem) {
      lines.push(`${lineBold(`OBRU ${v}A`)} :`);
      if (obruA_loc) lines.push(obruA_loc);
      if (obruA_rem) lines.push(obruA_rem);
      lines.push('');
    }

    const obruB_loc = obruB.location_ip ? `location IP - ${ipSpan(obruB.location_ip)}` : '';
    const obruB_rem = obruB.remote_ip   ? `remote IP - ${ipSpan(obruB.remote_ip)}`     : '';
    if (obruB_loc || obruB_rem) {
      lines.push(`${lineBold(`OBRU ${v}B`)} :`);
      if (obruB_loc) lines.push(obruB_loc);
      if (obruB_rem) lines.push(obruB_rem);
      lines.push('');
    }

    const vobcA_r1 = vobcA.replica1 ? `Replica 1: ${ipSpan(vobcA.replica1)}` : '';
    const vobcA_r3 = vobcA.replica3 ? `Replica 3: ${ipSpan(vobcA.replica3)}` : '';
    if (vobcA_r1 || vobcA_r3) {
      lines.push(`${lineBold(`VOBC ${v}A`)} :`);
      if (vobcA_r1) lines.push(vobcA_r1);
      if (vobcA_r3) lines.push(vobcA_r3);
      lines.push('');
    }

    const vobcB_r1 = vobcB.replica1 ? `Replica 1: ${ipSpan(vobcB.replica1)}` : '';
    const vobcB_r3 = vobcB.replica3 ? `Replica 3: ${ipSpan(vobcB.replica3)}` : '';
    if (vobcB_r1 || vobcB_r3) {
      lines.push(`${lineBold(`VOBC ${v}B`)} :`);
      if (vobcB_r1) lines.push(vobcB_r1);
      if (vobcB_r3) lines.push(vobcB_r3);
      lines.push('');
    }

    if (consist) { lines.push(`${lineBold('CONSIST')} : ${consist}`); lines.push(''); }
    if (idLT)   lines.push(`${lineBold('VOBC ID Left/Top')}: ${idLT}`);
    if (idRB)   lines.push(`${lineBold('VOBC ID Right/Bottom')}: ${idRB}`);

    const html = lines.join('\n');
    const plain = html.replace(/<[^>]+>/g,'');

    resText.innerHTML = html;
    resText.setAttribute('data-plain', plain);
    resBox.classList.remove('hidden');
    notice.textContent = '';
  }

  function doSearch(e){
    if(e) e.preventDefault();
    const raw = String(input.value || '').trim();
    if (!raw) {
      resBox.classList.add('hidden');
      notice.textContent = 'Please enter a vehicle or consist.';
      return;
    }
    const digits = normDigits(raw);

    let record = digits ? findByVehicleBase(digits) : null;
    if(!record && digits) record = findByConsist(digits);

    if(!record){
      resBox.classList.add('hidden');
      notice.textContent = `No record for input: "${raw}". Tip: click a chip below to test.`;
      return;
    }

    input.value = record.vehicle;
    renderByRecord(record);
  }

  function doClear(e){
    if(e) e.preventDefault();
    input.value = '';
    resText.textContent = '';
    resBox.classList.add('hidden');
    notice.textContent = 'Enter a vehicle number to display results.';
  }

  async function doCopy(){
    const txt = resText.getAttribute('data-plain') || resText.textContent || '';
    try {
      await navigator.clipboard.writeText(txt);
      btnCopy.textContent = 'Copied';
      setTimeout(()=> btnCopy.textContent = 'Copy', 1200);
    } catch {
      alert('Copy failed. Please select the text and copy manually.');
    }
  }

  function doPrint(){ window.print(); }

  btnSearch.addEventListener('click', doSearch);
  btnClear.addEventListener('click', doClear);
  input.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ doSearch(e); }});
  btnCopy.addEventListener('click', doCopy);
  btnPrint.addEventListener('click', doPrint);
})();
