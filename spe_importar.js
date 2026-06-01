// ============================================================
// COLE NO CONSOLE DO SPE (F12 → Console → Enter)
// Salva direto no Firebase da Patrulha Maria da Penha
// ✅ Preserva localização ajustada manualmente
// ✅ Marca como inativo quem não está mais no SPE
// ✅ Inativas há +2 dias são excluídas automaticamente pelo site
// ============================================================
(async function() {
    const delay = ms => new Promise(r => setTimeout(r, ms));

    async function loadScript(src) {
        return new Promise((res, rej) => {
            if (document.querySelector(`script[src="${src}"]`)) return res();
            const s = document.createElement('script');
            s.src = src; s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
        });
    }
    if (!window._fbPMP) {
        await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
        await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');
        window._fbPMP = firebase.initializeApp({
            apiKey: "AIzaSyA0BnuIDl5LGdGex-G5eqFhxgSPOz945_g",
            authDomain: "patrulha-maria-penha-27.firebaseapp.com",
            projectId: "patrulha-maria-penha-27",
        }, 'pmp_import_' + Date.now());
    }
    const db = firebase.firestore(window._fbPMP);
    const SECRET = "73422176e3b42f2d17a961a46a3c5074896f70ef7849845f1d65f36d087daf35";

    const CIDADES = ["Salvador das Missões","Ubiretama","Sete de Setembro","Eugênio de Castro","Vitória das Missões","Senador Salgado Filho","Giruá","São Miguel das Missões","Entre-Ijuís","Guarani das Missões","Cerro Largo","Santo Ângelo"];
    const GEO = {"Santo Ângelo":{lat:-28.2994,lng:-54.2628,r:0.15},"Giruá":{lat:-28.0319,lng:-54.3533,r:0.12},"Cerro Largo":{lat:-28.1497,lng:-54.7394,r:0.12},"São Miguel das Missões":{lat:-28.5578,lng:-54.5567,r:0.12},"Entre-Ijuís":{lat:-28.3447,lng:-54.2975,r:0.10},"Guarani das Missões":{lat:-28.1378,lng:-54.5636,r:0.10},"Salvador das Missões":{lat:-28.1078,lng:-54.8453,r:0.10},"Ubiretama":{lat:-27.9658,lng:-54.6253,r:0.10},"Sete de Setembro":{lat:-27.9733,lng:-54.8683,r:0.08},"Eugênio de Castro":{lat:-28.0139,lng:-54.1500,r:0.08},"Vitória das Missões":{lat:-28.1722,lng:-54.4208,r:0.08},"Senador Salgado Filho":{lat:-27.9364,lng:-54.6833,r:0.08}};

    function detCidade(txt) {
        if (!txt) return 'Santo Ângelo';
        const t = txt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        for (const c of CIDADES) if (t.includes(c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''))) return c;
        return 'Santo Ângelo';
    }

    async function geocode(end, cid) {
        const g = GEO[cid];
        let url = 'https://nominatim.openstreetmap.org/search?format=json&limit=5&q=' + encodeURIComponent(end+', '+cid+', RS, Brasil');
        if (g) url += '&viewbox='+(g.lng-g.r)+','+(g.lat-g.r)+','+(g.lng+g.r)+','+(g.lat+g.r)+'&bounded=1';
        try {
            const d = await (await fetch(url,{headers:{'Accept-Language':'pt-BR'}})).json();
            if (d.length > 0 && g) {
                let best=null, min=Infinity;
                for (const r of d) { const dist=Math.sqrt(Math.pow(+r.lat-g.lat,2)+Math.pow(+r.lon-g.lng,2)); if(dist<min){min=dist;best=r;} }
                if (best && min<=g.r*2) return {lat:+best.lat,lng:+best.lon,ok:true};
            } else if (d.length > 0) return {lat:+d[0].lat,lng:+d[0].lon,ok:true};
        } catch(e) {}
        return {lat:g?g.lat:-28.2865,lng:g?g.lng:-54.2644,ok:false};
    }

    function lerCampo(c,l) {
        for (const el of c.querySelectorAll('*')) {
            const t=(el.innerText||'').trim();
            if(t.toLowerCase().startsWith(l.toLowerCase())){const v=t.slice(l.length).replace(/^[:\s]+/,'').trim();if(v.length>2)return v;}
        }
        return '';
    }

    async function lerModal() {
        await delay(1200);
        let m=null;
        for(let i=0;i<20;i++){m=document.querySelector('.modal.show,.modal[style*="display: block"],[role="dialog"]');if(m)break;await delay(200);}
        if(!m)return null;
        const nome=lerCampo(m,'Nome'),cpf=lerCampo(m,'CPF'),rg=lerCampo(m,'RG'),tel=lerCampo(m,'Telefone'),mpu=lerCampo(m,'Número'),df=lerCampo(m,'Data Fim'),autor=lerCampo(m,'Autor');
        let endV='';
        m.querySelectorAll('.card,.card-body,.accordion-item,.accordion-body,.collapse.show').forEach(b=>{if(!endV){const loc=lerCampo(b,'Local');if(loc)endV=loc;}});
        if(!endV) m.querySelectorAll('p,span,div,li,td').forEach(el=>{if(endV)return;const t=(el.innerText||'').trim();if(/^local:/i.test(t))endV=t.replace(/^local:/i,'').trim().split('\n')[0].trim();});
        let vd='';
        if(df){const p=df.replace(/\s.*/,'').split('/');if(p.length===3)vd=p[2]+'-'+p[1].padStart(2,'0')+'-'+p[0].padStart(2,'0');}
        if(!vd){const d=new Date();d.setFullYear(d.getFullYear()+1);vd=d.toISOString().split('T')[0];}
        return {nome,cpf,rg,tel,mpu,vd,autor,endV};
    }

    function fecharModal() {
        const b=document.querySelector('.modal.show .btn-close,.modal.show button[data-bs-dismiss="modal"],.modal.show .close');
        if(b)b.click();
    }

    let pan=document.getElementById('_pmp_pan');
    if(!pan){pan=document.createElement('div');pan.id='_pmp_pan';pan.style='position:fixed;bottom:16px;right:16px;z-index:99999;background:#2D0B5A;color:#fff;padding:14px 18px;border-radius:14px;font-size:12px;font-family:sans-serif;min-width:300px;max-width:360px;box-shadow:0 8px 32px rgba(0,0,0,.5);';document.body.appendChild(pan);}
    function ui(t,s,p){pan.innerHTML='<b>🚔 '+t+'</b>'+(s?'<div style="margin-top:5px;font-size:11px;opacity:.85;word-break:break-word">'+s+'</div>':'')+'<div style="background:rgba(255,255,255,.2);border-radius:6px;height:6px;margin-top:8px;overflow:hidden"><div style="height:100%;background:#9058CC;width:'+(p||0)+'%;transition:width .3s;border-radius:6px"></div></div>';}

    // Carrega base existente
    ui('Carregando base...','Verificando cadastros existentes',0);
    const snap = await db.collection('victims').get();
    const base = new Map(); // cpf → {docId, data}
    snap.docs.forEach(doc=>{
        const d=doc.data();
        const cpfL=(d.cpf||'').replace(/\D/g,'');
        if(cpfL) base.set(cpfL,{docId:doc.id,data:d});
    });
    console.log('[PMP] Base:', base.size, 'registros');

    // Coleta todos os CPFs que vieram do SPE nesta extração
    const cpfsSPE = new Set();
    const importados=[], atualizados=[], ignorados=[], inativados=[], erros=[];
    const sel='button[title="Visualizar detalhes da vítima"],a[title="Visualizar detalhes da vítima"]';
    let pagina=1;

    // ── FASE 1: extrai e salva vítimas do SPE ──
    while(true){
        const total=document.querySelectorAll(sel).length;
        if(!total){ui('⚠️ Sem vítimas','Navegue até Vítimas no SPE',0);break;}
        for(let i=0;i<total;i++){
            const btn=document.querySelectorAll(sel)[i];if(!btn)continue;
            btn.click();const d=await lerModal();fecharModal();await delay(750);
            if(!d||!d.nome){erros.push('linha '+(i+1));continue;}
            const cpfL=(d.cpf||'').replace(/\D/g,'');
            const pct=Math.round((i+1)/total*100);
            ui('Extraindo SPE...',d.nome+(d.endV?'\n📍 '+d.endV:''),pct);
            if(cpfL) cpfsSPE.add(cpfL);

            const existente=cpfL?base.get(cpfL):null;
            if(existente){
                const ex=existente.data;
                const locAjustada=ex.geo_impreciso===false&&ex.updatedBy&&ex.updatedBy!=='importador_spe';
                if(locAjustada){
                    try{
                        await db.collection('victims').doc(existente.docId).update({
                            v_nome:d.nome,rua:d.endV||ex.rua,valid:d.vd,
                            cpf:d.cpf||ex.cpf,rg:d.rg||ex.rg,
                            telefone:d.tel||ex.telefone,numMpu:d.mpu||ex.numMpu,
                            a_nome:d.autor||ex.a_nome,
                            status:'ativo', inativadoEm: null,
                            updatedAt:new Date().toISOString(),
                            updatedBy:'importador_spe',_secret:SECRET
                        });
                        atualizados.push(d.nome);
                    }catch(e){erros.push(d.nome);}
                } else {
                    // Reativa se estava inativa
                    if(ex.status==='inativo'){
                        try{
                            await db.collection('victims').doc(existente.docId).update({
                                status:'ativo', inativadoEm:null,
                                updatedAt:new Date().toISOString(),_secret:SECRET
                            });
                        }catch(e){}
                    }
                    ignorados.push(d.nome);
                }
                continue;
            }

            // Nova vítima
            const cidade=detCidade(d.endV);
            const coords=d.endV?await geocode(d.endV,cidade):{lat:GEO[cidade]?.lat||-28.2865,lng:GEO[cidade]?.lng||-54.2644,ok:false};
            await delay(600);
            const v={id:Date.now()+Math.random(),city:cidade,v_nome:d.nome,rua:d.endV||'Endereço não informado',a_nome:d.autor||'Não identificado',a_rg:d.cpf||d.rg||'',a_rua:'',valid:d.vd,dist:1,foto:'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',lat:coords.lat,lng:coords.lng,geo_impreciso:!coords.ok,cpf:d.cpf||'',rg:d.rg||'',telefone:d.tel||'',numMpu:d.mpu||'',status:'ativo',obs:'Importado SPE '+new Date().toLocaleDateString('pt-BR'),createdBy:'importador_spe',createdAt:new Date().toISOString(),_secret:SECRET};
            try{await db.collection('victims').doc(String(v.id)).set(v);base.set(cpfL,{docId:String(v.id),data:v});importados.push(d.nome);}catch(e){erros.push(d.nome);}
        }
        const bP=Array.from(document.querySelectorAll('.pagination .page-item a,.pagination a.page-link')).find(a=>/próximo|next|›|»/i.test(a.innerText));
        if(!bP||bP?.closest('li')?.classList.contains('disabled')||bP?.classList.contains('disabled'))break;
        bP.click();await delay(2000);pagina++;
    }

    // ── FASE 2: marca como inativo quem não veio do SPE ──
    ui('Verificando ausentes...','Marcando inativas...',95);
    for(const [cpfL, {docId, data}] of base.entries()){
        if(cpfsSPE.has(cpfL)) continue;           // está no SPE — ok
        if(data.status === 'inativo') continue;    // já estava inativa
        if(data.createdBy !== 'importador_spe') continue; // cadastro manual — não inativa
        try{
            await db.collection('victims').doc(docId).update({
                status:'inativo',
                inativadoEm: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                _secret: SECRET
            });
            inativados.push(data.v_nome||docId);
            console.log('[PMP] Inativada:', data.v_nome);
        }catch(e){erros.push(data.v_nome||docId);}
    }

    const msg='✅ '+importados.length+' novas\n🔄 '+atualizados.length+' atualizadas\n⏭ '+ignorados.length+' sem alteração\n⏳ '+inativados.length+' inativadas (excluídas em 2 dias)\n❌ '+erros.length+' erros';
    pan.innerHTML='<b>✅ Concluído!</b><div style="margin-top:6px;font-size:11px;line-height:1.8;opacity:.9">'+msg.replace(/\n/g,'<br>')+'</div>';
    setTimeout(()=>pan.remove(),10000);
    alert('✅ Importação concluída!\n\n'+msg+'\n\nAtualize o site da Patrulha para ver as alterações.');
})();
