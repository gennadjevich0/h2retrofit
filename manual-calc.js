(function(){
  const KEY='h2retrofit_manual_calc_v1';
  const defaults={
    tariff:{price:0.25,standing:0,vat:13.5,other:0},
    rows:[
      {appliance:'Fridge',power:150,hours:24,days:28},
      {appliance:'Kettle',power:2000,hours:0.15,days:28}
    ]
  };

  function clone(v){return JSON.parse(JSON.stringify(v));}
  function load(){try{return JSON.parse(localStorage.getItem(KEY))||clone(defaults);}catch(e){return clone(defaults);}}
  function save(data){localStorage.setItem(KEY,JSON.stringify(data));}
  function money(n){return '€'+Number(n||0).toFixed(2);}
  function calcRow(row,tariff){
    const kwh=(Number(row.power||0)*Number(row.hours||0)*Number(row.days||0))/1000;
    const energy=kwh*Number(tariff.price||0);
    const standing=Number(tariff.standing||0);
    const other=Number(tariff.other||0);
    const subtotal=energy+standing+other;
    const vat=subtotal*(Number(tariff.vat||0)/100);
    const total=subtotal+vat;
    return {kwh,energy,standing,other,vat,total};
  }

  function inject(){
    const calcTab=document.getElementById('tab-calc');
    if(!calcTab || document.getElementById('manual-calc-card')) return;

    const style=document.createElement('style');
    style.textContent=`
      .btn-sm{padding:10px 18px;background:var(--teal);color:#080e1c;border:none;border-radius:8px;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;cursor:pointer}
      .btn-ghost{padding:10px 18px;background:transparent;color:var(--text);border:1px solid var(--border2);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer}
      .calc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px}
      .calc-grid .inp{margin-bottom:0}
      .calc-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .manual-table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:10px}
      .manual-table{width:100%;border-collapse:collapse;min-width:980px}
      .manual-table th,.manual-table td{padding:8px;border-bottom:1px solid var(--border);font-size:12px;text-align:left}
      .manual-table th{color:var(--text3);font-weight:600;background:rgba(255,255,255,0.03)}
      .manual-table td input{width:100%;padding:7px 8px;background:rgba(255,255,255,0.05);border:1px solid var(--border2);border-radius:6px;color:var(--text);font-size:12px}
      .manual-table td .mini-btn{padding:7px 10px;background:rgba(232,64,64,0.12);color:var(--red);border:1px solid rgba(232,64,64,0.25);border-radius:6px;cursor:pointer;font-size:11px;font-weight:700}
      .sum-box{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px}
      @media(max-width:820px){.calc-grid,.sum-box{grid-template-columns:1fr 1fr}}
      @media(max-width:520px){.calc-grid,.sum-box{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);

    const card=document.createElement('div');
    card.className='card';
    card.id='manual-calc-card';
    card.style.marginTop='14px';
    card.innerHTML=`
      <div class="st">Manual Energy Cost Calculator</div>
      <div class="calc-grid">
        <input class="inp" id="tariff-price" type="number" step="0.0001" placeholder="Price per kWh">
        <input class="inp" id="tariff-standing" type="number" step="0.01" placeholder="Standing charge">
        <input class="inp" id="tariff-vat" type="number" step="0.1" placeholder="VAT %">
        <input class="inp" id="tariff-other" type="number" step="0.01" placeholder="Other charges">
      </div>
      <div class="calc-actions">
        <button class="btn-sm" id="manual-add">Add row</button>
        <button class="btn-ghost" id="manual-save">Save data</button>
        <button class="btn-ghost" id="manual-export">Export CSV</button>
        <button class="btn-ghost" id="manual-clear">Clear all</button>
      </div>
      <div class="manual-table-wrap" style="margin-top:12px">
        <table class="manual-table">
          <thead>
            <tr>
              <th>Appliance</th><th>Power (W)</th><th>Hours/day</th><th>Days</th><th>kWh</th><th>Energy cost</th><th>Standing</th><th>Other</th><th>VAT</th><th>Total</th><th>Action</th>
            </tr>
          </thead>
          <tbody id="manual-body"></tbody>
        </table>
      </div>
      <div class="sum-box">
        <div class="mcard"><div class="mlabel">Energy subtotal</div><div class="mval teal" id="sum-energy">€0.00</div></div>
        <div class="mcard"><div class="mlabel">VAT amount</div><div class="mval" id="sum-vat">€0.00</div></div>
        <div class="mcard"><div class="mlabel">Grand total</div><div class="mval amber" id="sum-total">€0.00</div></div>
        <div class="mcard"><div class="mlabel">Saved tariff</div><div class="mval" id="sum-tariff">€0.00 / 0%</div></div>
      </div>
    `;
    calcTab.appendChild(card);

    const els={
      price:card.querySelector('#tariff-price'),
      standing:card.querySelector('#tariff-standing'),
      vat:card.querySelector('#tariff-vat'),
      other:card.querySelector('#tariff-other'),
      body:card.querySelector('#manual-body'),
      sumEnergy:card.querySelector('#sum-energy'),
      sumVat:card.querySelector('#sum-vat'),
      sumTotal:card.querySelector('#sum-total'),
      sumTariff:card.querySelector('#sum-tariff'),
      add:card.querySelector('#manual-add'),
      saveBtn:card.querySelector('#manual-save'),
      exportBtn:card.querySelector('#manual-export'),
      clearBtn:card.querySelector('#manual-clear')
    };

    function render(){
      const data=load();
      els.price.value=data.tariff.price;
      els.standing.value=data.tariff.standing;
      els.vat.value=data.tariff.vat;
      els.other.value=data.tariff.other;
      let sumEnergy=0,sumVat=0,sumTotal=0;
      els.body.innerHTML=data.rows.map((row,i)=>{
        const c=calcRow(row,data.tariff);
        sumEnergy+=c.energy; sumVat+=c.vat; sumTotal+=c.total;
        return `<tr>
          <td><input data-i="${i}" data-k="appliance" value="${row.appliance||''}"></td>
          <td><input type="number" step="0.01" data-i="${i}" data-k="power" value="${row.power??0}"></td>
          <td><input type="number" step="0.01" data-i="${i}" data-k="hours" value="${row.hours??0}"></td>
          <td><input type="number" step="1" data-i="${i}" data-k="days" value="${row.days??0}"></td>
          <td>${c.kwh.toFixed(2)}</td>
          <td>${money(c.energy)}</td>
          <td>${money(c.standing)}</td>
          <td>${money(c.other)}</td>
          <td>${money(c.vat)}</td>
          <td>${money(c.total)}</td>
          <td><button class="mini-btn" data-del="${i}">Delete</button></td>
        </tr>`;
      }).join('');
      els.sumEnergy.textContent=money(sumEnergy);
      els.sumVat.textContent=money(sumVat);
      els.sumTotal.textContent=money(sumTotal);
      els.sumTariff.textContent=`€${Number(data.tariff.price||0).toFixed(4)} / ${Number(data.tariff.vat||0).toFixed(1)}%`;
    }

    function bind(){
      ['price','standing','vat','other'].forEach(k=>{
        els[k].addEventListener('input',()=>{
          const data=load();
          data.tariff[k]=Number(els[k].value||0);
          save(data); render();
        });
      });
      els.add.addEventListener('click',()=>{
        const data=load(); data.rows.push({appliance:'New item',power:0,hours:0,days:28}); save(data); render();
      });
      els.saveBtn.addEventListener('click',()=>{ save(load()); render(); });
      els.clearBtn.addEventListener('click',()=>{ localStorage.removeItem(KEY); render(); });
      els.exportBtn.addEventListener('click',()=>{
        const data=load();
        const rows=[['Appliance','Power (W)','Hours/day','Days','kWh','Energy cost','Standing','Other','VAT','Total']];
        data.rows.forEach(r=>{ const c=calcRow(r,data.tariff); rows.push([r.appliance,r.power,r.hours,r.days,c.kwh.toFixed(2),c.energy.toFixed(2),c.standing.toFixed(2),c.other.toFixed(2),c.vat.toFixed(2),c.total.toFixed(2)]); });
        const csv=rows.map(r=>r.join(',')).join('\n');
        const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
        const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='manual-energy-calculator.csv'; a.click(); URL.revokeObjectURL(url);
      });
      els.body.addEventListener('input',(e)=>{
        const t=e.target; if(!t.dataset.i) return;
        const data=load(); const i=Number(t.dataset.i); const k=t.dataset.k;
        data.rows[i][k]=k==='appliance'?t.value:Number(t.value||0); save(data); render();
      });
      els.body.addEventListener('click',(e)=>{
        const btn=e.target.closest('[data-del]'); if(!btn) return;
        const data=load(); data.rows.splice(Number(btn.dataset.del),1); save(data); render();
      });
    }

    bind(); render();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',inject); else inject();
})();