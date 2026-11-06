// Gestão de Obra – Borderô · telas e cálculos (código original do arquivo, ligado à API)
// ---- ligação com o servidor ---------------------------------------------
// Os dados vêm de /api/dados (carregados pelo boot.js) e cada alteração feita
// na tela é enviada para o servidor. Nada fica guardado no navegador.
const D = window.__D;
const uid = () =>
  window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

async function api(url, body, method) {
  const r = await fetch(url, {
    method: method || (body ? "POST" : "GET"),
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  if (r.status === 401) {
    location.href = "/login";
    throw new Error("Sessão expirada.");
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || "Erro " + r.status);
  return j;
}

const __st = (t, cls) => {
  const e = document.getElementById("svst");
  if (e) {
    e.textContent = t;
    e.className = "svst " + (cls || "");
  }
};

// Compara a lista atual com a última versão gravada e envia só o que mudou
let __snap = new Map(D.rows.map((r) => [r.id, JSON.stringify(r)]));
let __fila = Promise.resolve();
let __pend = 0;
function __salvar() {
  const atual = new Map(rows.map((r) => [r.id, JSON.stringify(r)]));
  const upsert = [], excluir = [];
  for (const [id, s] of atual) if (__snap.get(id) !== s) upsert.push(JSON.parse(s));
  for (const id of __snap.keys()) if (!atual.has(id)) excluir.push(id);
  if (!upsert.length && !excluir.length) return;
  __snap = atual;
  __pend++;
  __st("Salvando…", "on");
  __fila = __fila
    .then(() => api("/api/lancamentos/sync", { upsert, excluir }))
    .then(
      () => {
        if (--__pend === 0) __st("Tudo salvo", "ok");
      },
      (e) => {
        __pend = 0;
        __st("Erro ao salvar", "err");
        toast("Não foi possível salvar: " + e.message + " Recarregando os dados do servidor…");
        setTimeout(() => location.reload(), 3000);
      },
    );
}

let __tmAr;
function __salvarAreas() {
  if (!D.usuario.editaB) return;
  clearTimeout(__tmAr);
  __st("Salvando…", "on");
  __tmAr = setTimeout(() => {
    api("/api/config/areas", { l1: AR.l1 || 0, l2: AR.l2 || 0 }, "PUT").then(
      () => __st("Tudo salvo", "ok"),
      (e) => {
        __st("Erro ao salvar", "err");
        toast("Não foi possível salvar as áreas: " + e.message);
      },
    );
  }, 600);
}

window.addEventListener("beforeunload", (e) => {
  if (__pend > 0) {
    e.preventDefault();
    e.returnValue = "";
  }
});

function __depoisDeCarregar() {
  if (!D.usuario.editaB) document.querySelectorAll("#al1,#al2").forEach((el) => (el.readOnly = true));
}
// ---- fim da ligação com o servidor; daqui para baixo é o código original ----

const ITEMS=["Custo Fixo","Drenagem","FABRICA DE PAVER","MANUTENÇÃO Máquinas","Ponte Premoldada","Terraplanagem - Aterro","Terraplanagem - Máquinas Diesel","Terraplanagem - Máquinas Operadores","Terraplanagem - Máquinas Aluguel","Mobilização"],TIPOS={MAT:"Materiais",MDO:"Mão de obra",MAQ:"Máquinas"},MES=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"],KEY="bordero_v2";
const $=s=>document.querySelector(s),R=v=>v==null?"—":v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),cl=c=>MES[+c.slice(5)-1]+"/"+c.slice(2,4),dl=d=>d.split("-").reverse().join("/");
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const mk=a=>({id:uid(),comp:a[0],data:a[1],forn:a[2],doc:a[3],val:a[4],obs:a[5],item:ITEMS[a[6]]??a[6],tipo:a[7],src:"B"}),mf=a=>({id:uid(),src:"F",comp:a[0],q:a[1],data:a[0]+(a[1]==="1"?"-15":"-28"),forn:a[2]+" ("+a[3]+")",doc:a[9]||"",sal:a[4],val:a[5],obs:a[6],item:ITEMS[a[7]]??a[7],tipo:"MDO",inf:a[8]});
const me=a=>({id:uid(),src:"E",comp:a[0],data:a[1],forn:a[2],doc:"",val:a[4],obs:a[3],item:a[5]||"Terraplanagem - Máquinas Aluguel",tipo:"MAQ",dil:a[5]?0:1});
let rows=D.rows;
rows.forEach(r=>r.src=r.src||"B");
const save=__salvar;
const sum=a=>a.reduce((s,r)=>s+(r.val||0),0),comps=()=>[...new Set(rows.map(r=>r.comp))].sort();
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{document.querySelectorAll("nav button,.tab").forEach(x=>x.classList.remove("on"));b.classList.add("on");$("#"+b.dataset.t).classList.add("on")});
function matrix(el,cols,f,lab,src){const A=src?rows.filter(r=>r.src===src):rows,cs=[...new Set(A.map(r=>r.comp))].sort();let h="<table><thead><tr><th>Competência</th>"+cols.map(c=>"<th class=n>"+esc(lab?lab[c]:c)+"</th>").join("")+"<th class=n>Total</th></tr></thead><tbody>";
 cs.forEach(c=>{const rs=A.filter(r=>r.comp===c);h+="<tr><td>"+cl(c)+"</td>"+cols.map(k=>{const v=sum(rs.filter(r=>r[f]===k));return"<td class=n>"+(v?R(v):"-")+"</td>"}).join("")+"<td class=n><b>"+R(sum(rs))+"</b></td></tr>"});
 h+="</tbody><tfoot><tr><td>Total</td>"+cols.map(k=>"<td class=n>"+R(sum(A.filter(r=>r[f]===k)))+"</td>").join("")+"<td class=n>"+R(sum(A))+"</td></tr></tfoot></table>";$(el).innerHTML=h}
function pivot(){const m=$("#pm").value,i=$("#pi").value,s=$("#ps").value,A=rows.filter(r=>(!m||r.comp===m)&&(!i||r.item===i)&&(!s||r.src===s)),ks=Object.keys(TIPOS),
 its=[...new Set(A.map(r=>r.item||"(vazio)"))].sort((a,b)=>a.localeCompare(b,"pt-BR")),
 v=(rs,k)=>sum(k?rs.filter(r=>r.tipo===k):rs),c=x=>"<td class=n>"+(x?R(x):"-")+"</td>";
 $("#piv").innerHTML="<table><thead><tr><th>Item de obra</th>"+ks.map(k=>"<th class=n title='"+esc(TIPOS[k])+"'>"+k+"</th>").join("")+"<th class=n>Total geral</th></tr></thead><tbody>"+
 (its.length?its.map(t=>{const rs=A.filter(r=>(r.item||"(vazio)")===t);return"<tr><td>"+esc(t)+"</td>"+ks.map(k=>c(v(rs,k))).join("")+"<td class=n><b>"+R(v(rs))+"</b></td></tr>"}).join(""):"<tr><td colspan="+(ks.length+2)+" class=mut>Sem lançamentos para este filtro</td></tr>")+
 "</tbody><tfoot><tr><td>Total geral</td>"+ks.map(k=>"<td class=n>"+R(v(A,k))+"</td>").join("")+"<td class=n>"+R(v(A))+"</td></tr></tfoot></table>"}
function painel(){const cs=comps(),last=cs[cs.length-1],tot=cs.map(c=>sum(rows.filter(r=>r.comp===c))),mx=Math.max(1,...tot),pend=rows.filter(r=>r.val==null).length;
 $("#cards").innerHTML=[["Total geral",R(sum(rows))],["Borderô",R(sum(rows.filter(r=>r.src==="B")))],["Folha (custo fixo)",R(sum(rows.filter(r=>r.src==="F")))],["Compra de equipamentos",R(sum(rows.filter(r=>r.src==="E")))],["Fábrica de Paver",R(sum(rows.filter(r=>r.item==="FABRICA DE PAVER")))],["Último mês ("+(last?cl(last):"-")+")",R(tot[tot.length-1]||0)],["Lançamentos",rows.length],["Sem valor",pend]].map(c=>"<div class=card><small>"+c[0]+"</small><b>"+c[1]+"</b></div>").join("");
 planilha();economia();pivot();cron();}
function fill(){const o=(id,t,a,lab)=>{const s=$(id),v=s.value;s.innerHTML="<option value=''>"+t+"</option>"+a.map(x=>"<option value='"+esc(x)+"'>"+esc(lab?lab(x):x)+"</option>").join("");s.value=v};o("#fc","Todos os meses",comps(),cl);o("#fi","Todos os itens",ITEMS);o("#ft","Todos os tipos",Object.keys(TIPOS));o("#pm","Todos os meses",comps(),cl);o("#pi","Todos os itens",[...new Set(ITEMS.concat(rows.map(r=>r.item).filter(Boolean)))])}
function lista(){const c=$("#fc").value,i=$("#fi").value,t=$("#ft").value,s=$("#fs").value,q=$("#fq").value.toLowerCase(),nv=$("#fn").checked;
 const fl=r=>(!nv||r.val==null)&&(!c||r.comp===c)&&(!i||r.item===i)&&(!t||r.tipo===t)&&(!q||(r.forn+" "+r.obs).toLowerCase().includes(q)),
 bs=s&&s!=="B"?[]:rows.filter(r=>r.src==="B"&&fl(r)).sort((a,b)=>b.data.localeCompare(a.data)),
 fs=s&&s!=="F"?[]:rows.filter(r=>r.src==="F"&&fl(r)).sort((a,b)=>b.comp.localeCompare(a.comp)||({1:1,2:2,M:3}[b.q]-{1:1,2:2,M:3}[a.q])),
 es=s&&s!=="E"?[]:rows.filter(r=>r.src==="E"&&fl(r)).sort((a,b)=>b.data.localeCompare(a.data));
 $("#sb").style.display=s&&s!=="B"?"none":"";$("#sf").style.display=s&&s!=="F"?"none":"";$("#se").style.display=s&&s!=="E"?"none":"";
 $("#cb").textContent="Borderô (fornecedores) · "+bs.length+" lançamentos · "+R(sum(bs));
 $("#cf").textContent="Custo fixo – folha de funcionários · "+fs.length+" lançamentos · "+R(sum(fs));
 const ac=r=>"<td><button class=x data-e='"+r.id+"' title='Editar lançamento'>✎</button><button class=x data-d='"+r.id+"' title='Excluir'>✕</button></td>";
 $("#ce").textContent="Compra de equipamentos · "+es.length+" lançamentos · "+R(sum(es));
 $("#te").innerHTML="<thead><tr><th>Mês</th><th>Data da compra</th><th>Equipamento</th><th>Detalhes (modelo / placa / série)</th><th>Item Obra</th><th>Tipo</th><th class=n>Valor</th><th></th></tr></thead><tbody>"+es.map(r=>"<tr"+(r.val==null?" class=w":"")+"><td>"+cl(r.comp)+"</td><td>"+dl(r.data)+"</td><td>"+esc(r.forn)+"</td><td>"+esc(r.obs)+"</td><td>"+esc(r.item)+"</td><td>"+esc(r.tipo)+"</td><td class=n>"+R(r.val)+"</td>"+ac(r)+"</tr>").join("")+"</tbody>";
 $("#tb").innerHTML="<thead><tr><th>Mês</th><th>Data</th><th>Fornecedor</th><th>Observação</th><th>Item Obra</th><th>Tipo</th><th class=n>Valor</th><th></th></tr></thead><tbody>"+bs.map(r=>"<tr"+(r.val==null?" class=w":"")+"><td>"+cl(r.comp)+"</td><td>"+dl(r.data)+"</td><td>"+esc(r.forn)+"</td><td>"+esc(r.obs)+"</td><td>"+esc(r.item)+"</td><td>"+esc(r.tipo)+"</td><td class=n>"+R(r.val)+"</td>"+ac(r)+"</tr>").join("")+"</tbody>";
 $("#tf").innerHTML="<thead><tr><th>Mês</th><th>Quinzena</th><th>Funcionário</th><th>Função</th><th>Observação</th><th>Item Obra</th><th class=n>Salário base</th><th class=n>Valor pago</th><th></th></tr></thead><tbody>"+fs.map(r=>{const m=r.forn.match(/^(.*) \((.*)\)$/),nm=m?m[1]:r.forn,fn=m?m[2]:"";return"<tr"+(r.val==null?" class=w":"")+"><td>"+cl(r.comp)+"</td><td>"+(r.q==="M"?"Mensal":r.q+"ª quinz.")+"</td><td>"+esc(nm)+"</td><td>"+esc(fn)+"</td><td>"+esc(r.obs)+(r.inf?" <span title='Período deduzido pela ordem da planilha: confira'>⚠</span>":"")+"</td><td>"+esc(r.item)+"</td><td class=n>"+R(r.sal)+"</td><td class=n>"+R(r.val)+"</td>"+ac(r)+"</tr>"}).join("")+"</tbody>"}
const modal=(h,ok,t)=>{const o=document.createElement("div");o.className="ov";o.innerHTML="<div class=md>"+h+"<div class=mb><button class=b id=mc>Cancelar</button><button class='b pr' id=mo>"+(t||"Salvar")+"</button></div></div>";document.body.appendChild(o);const x=()=>o.remove();o.querySelector("#mc").onclick=x;o.onclick=e=>{if(e.target===o)x()};o.querySelector("#mo").onclick=()=>{if(ok(o)!==false)x()};return o},toast=t=>{const d=document.createElement("div");d.className="toast";d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),3500)},ask=(t,f,k)=>modal("<h3>Confirmar</h3><p>"+esc(t)+"</p>",()=>{f()},k||"Confirmar"),editar=id=>{const r=rows.find(x=>x.id===id);if(!r)return;const its=[...new Set(ITEMS.concat(ORC.CB1.concat(ORC.CB2).map(a=>a[0]),[r.item||""]))].filter(Boolean).sort((a,b)=>a.localeCompare(b,"pt-BR")),op=(l,v)=>l.map(x=>"<option"+(x===v?" selected":"")+">"+esc(x)+"</option>").join(""),dt=/^\d{4}-\d{2}-\d{2}/.test(r.data||"")?r.data.slice(0,10):"";
 const o=modal("<h3>Editar lançamento</h3><div class=mg><label>Data<input type=date id=e1 value='"+dt+"'></label><label>Valor (R$)<input id=e6 value='"+(r.val??"")+"' inputmode=decimal></label><label class=w>Fornecedor / descrição<input id=e2 value=\""+esc(r.forn)+"\"></label><label class=w>Observação<input id=e3 value=\""+esc(r.obs||"")+"\"></label><label>Item de obra<select id=e4><option value=''>(vazio)</option>"+op(its,r.item||"")+"</select></label><label>Tipo<select id=e5>"+Object.keys(TIPOS).map(k=>"<option value="+k+(k===r.tipo?" selected":"")+">"+k+" – "+TIPOS[k]+"</option>").join("")+"</select></label></div><p id=em style='color:#d64545;margin:8px 0 0'></p>",o=>{const n=pv(o.querySelector("#e6").value);if(n==null){o.querySelector("#em").textContent="Valor inválido.";return false}
  const d=o.querySelector("#e1").value;r.val=n;r.forn=o.querySelector("#e2").value.trim()||r.forn;r.obs=o.querySelector("#e3").value;r.item=o.querySelector("#e4").value;r.tipo=o.querySelector("#e5").value;if(d&&d!==dt){r.data=d;if(r.src!=="F")r.comp=d.slice(0,7)}up();toast("Lançamento atualizado.")});},clk=e=>{const b=e.target.closest("button");if(!b)return;const d=b.dataset.d,ed=b.dataset.e;if(d){const r=rows.find(x=>x.id===d);if(r)ask("Excluir o lançamento de "+r.forn+" ("+R(r.val)+")?",()=>{rows=rows.filter(x=>x.id!==d);up()},"Excluir")}if(ed)editar(ed)};
$("#tb").onclick=$("#tf").onclick=$("#te").onclick=clk;
["#fc","#fi","#ft","#fs"].forEach(s=>$(s).onchange=lista);
$("#fq").oninput=lista;
$("#fn").onchange=lista;
const up=()=>{save();fill();painel();lista()};
const pv=s=>{s=String(s).replace(/R\$|\s/g,"");if(!s)return null;s=s.includes(",")?s.replace(/\./g,"").replace(",","."):s;const n=parseFloat(s);return isFinite(n)&&/^-?[\d.]+$/.test(s)?n:null};
const pd=s=>{s=s.trim();let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/),d,mo,y;if(m){d=+m[1];mo=+m[2];y=+m[3]}else if(m=s.match(/^(\d{4})-(\d{2})-(\d{2})/)){y=+m[1];mo=+m[2];d=+m[3]}else return null;const t=new Date(y,mo-1,d);return t.getMonth()===mo-1&&t.getDate()===d?y+"-"+String(mo).padStart(2,"0")+"-"+String(d).padStart(2,"0"):null};
const pc=(s,data)=>{let m=s.trim().match(/^(\d{1,2})\/(\d{4})$/);if(m)return m[2]+"-"+m[1].padStart(2,"0");const d=pd(s);return d?d.slice(0,7):data?data.slice(0,7):null};
const HINT={B:"Colunas na ordem: Competência, Data, Fornecedor, CNPJ/Dados, Valor, Observação, Item Obra, Tipo.",F:"Colunas na ordem: Competência (mm/aaaa), Quinzena (1, 2 ou M para mensal), Nome, Função, Salário base, Valor pago, Observação, Item Obra, Tipo.",E:"Colunas na ordem: Data da compra, Equipamento, Detalhes (modelo / placa / série), Valor, Item Obra (opcional; sem item vai para Aluguel de Máquinas)."},EX={B:"01/12/2026\t05/12/2026\tPOSTO PLANALTO TRR\tPIX (CNPJ): 29.047.733/0001-63\t4.095,00\t700 LT DIESEL\tTerraplanagem - Máquinas Diesel\tMAQ",F:"09/2026\t1\tJOSE EDILSON SILVA JUNIOR\tVIGIA RONDA\t200,00\t100,00\tPAGAR 1ª QUINZENA SET.26\tCusto Fixo\tMDO",E:"05/10/2026\tMARTELETE ROMPEDOR\tSérie 12345\t8.500,00\tTerraplanagem - Máquinas Aluguel"},TTL={B:"Importar borderô (fornecedores)",F:"Importar custo fixo (folha)",E:"Importar compra de equipamentos"},NCOL={B:8,F:9,E:4};
let IM="B";
const md=()=>IM;
function openImp(m){IM=m;$("#ith").textContent=TTL[m];$("#hint").textContent=HINT[m];$("#ta").placeholder=EX[m];$("#ta").value="";$("#prev").style.display="none";$("#fnm").textContent="";$("#im").hidden=false}
function closeImp(){$("#im").hidden=true}
document.querySelectorAll("[data-imp]").forEach(b=>b.onclick=()=>openImp(b.dataset.imp));
$("#imx").onclick=closeImp;
$("#im").onclick=e=>{if(e.target.id==="im")closeImp()};
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#im").hidden)closeImp()});
$("#flb").onclick=()=>$("#fl").click();
const dstr=d=>String(d.getUTCDate()).padStart(2,"0")+"/"+String(d.getUTCMonth()+1).padStart(2,"0")+"/"+d.getUTCFullYear();
async function zipRead(buf){const u=new Uint8Array(buf),dv=new DataView(buf);let e=u.length-22;while(e>=0&&dv.getUint32(e,true)!==0x06054b50)e--;if(e<0)throw new Error("não é um arquivo .xlsx válido");const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const F={};
 for(let i=0;i<n;i++){if(dv.getUint32(p,true)!==0x02014b50)break;const m=dv.getUint16(p+10,true),cs=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),kl=dv.getUint16(p+32,true),lo=dv.getUint32(p+42,true),nm=new TextDecoder().decode(u.subarray(p+46,p+46+nl));F[nm]={m,cs,lo};p+=46+nl+xl+kl}
 return async nm=>{const f=F[nm];if(!f)return null;const ln=dv.getUint16(f.lo+26,true),lx=dv.getUint16(f.lo+28,true),s=f.lo+30+ln+lx,d=u.subarray(s,s+f.cs);if(f.m===0)return new TextDecoder().decode(d);return await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text()}}
async function xlsxRows(buf){const rd=await zipRead(buf),X=s=>new DOMParser().parseFromString(s,"application/xml"),wb=X(await rd("xl/workbook.xml")),rel=X(await rd("xl/_rels/workbook.xml.rels")),sh=wb.getElementsByTagName("sheet")[0];if(!sh)throw new Error("planilha vazia");
 const rid=[...sh.attributes].find(a=>a.localName==="id").value,tg=[...rel.getElementsByTagName("Relationship")].find(r=>r.getAttribute("Id")===rid).getAttribute("Target"),path=tg.startsWith("/")?tg.slice(1):"xl/"+tg.replace(/^\.\//,"");
 const ssx=await rd("xl/sharedStrings.xml"),SS=ssx?[...X(ssx).getElementsByTagName("si")].map(si=>[...si.getElementsByTagName("t")].map(t=>t.textContent).join("")):[],stx=await rd("xl/styles.xml"),DF=new Set([14,15,16,17,18,19,20,21,22,45,46,47]),isd=[];
 if(stx){const sd=X(stx),cf=new Map();[...sd.getElementsByTagName("numFmt")].forEach(n=>cf.set(+n.getAttribute("numFmtId"),n.getAttribute("formatCode")));const xs=sd.getElementsByTagName("cellXfs")[0];if(xs)[...xs.getElementsByTagName("xf")].forEach((x,i)=>{const id=+x.getAttribute("numFmtId");isd[i]=DF.has(id)||(cf.has(id)&&/[dmyh]/i.test(cf.get(id).replace(/"[^"]*"|\[[^\]]*\]|\\./g,"")))})}
 const sx=X(await rd(path)),out=[];
 [...sx.getElementsByTagName("row")].forEach(r=>{const a=[];[...r.getElementsByTagName("c")].forEach(c=>{const L=(c.getAttribute("r")||"").replace(/\d/g,""),ix=[...L].reduce((s,ch)=>s*26+ch.charCodeAt(0)-64,0)-1,ty=c.getAttribute("t"),v=c.getElementsByTagName("v")[0],vt=v?v.textContent:"";let x="";
  if(ty==="s")x=SS[+vt]||"";else if(ty==="inlineStr")x=[...c.getElementsByTagName("t")].map(t=>t.textContent).join("");else if(ty==="str"||ty==="e")x=vt;else if(vt!==""){const nv=parseFloat(vt);x=isd[+(c.getAttribute("s")||0)]&&nv>=1?dstr(new Date(Math.round((Math.floor(nv)-25569)*864e5))):String(nv)}
  if(ix>=0)a[ix]=String(x).replace(/[\t\r\n]+/g," ").trim()});
  const ri=+(r.getAttribute("r")||out.length+1);while(out.length<ri-1)out.push([]);out[ri-1]=Array.from(a,v=>v||"")});
 return out}
$("#fl").onchange=async e=>{const f=e.target.files[0];if(!f)return;$("#fnm").textContent=f.name;try{let L;
  if(/\.(xlsx|xlsm)$/i.test(f.name))L=(await xlsxRows(await f.arrayBuffer())).map(r=>r.join("\t"));
  else if(/\.xls$/i.test(f.name))throw new Error("formato .xls antigo; salve como .xlsx ou .csv");
  else{const ls=(await f.text()).replace(/^﻿/,"").split(/\r?\n/).filter(l=>l.trim()),d=ls[0]&&ls[0].includes("\t")?"\t":ls[0]&&ls[0].includes(";")?";":",";L=ls.map(l=>d==="\t"?l:l.split(d).map(x=>x.replace(/^"|"$/g,"").trim()).join("\t"))}
  $("#ta").value=L.filter(l=>l.replace(/\t/g,"").trim()).join("\n");$("#chk").click()}catch(er){toast("Não consegui ler o arquivo: "+er.message)}e.target.value=""};
const key=r=>r.src==="F"?["F",r.comp,r.q,r.forn,r.val].join("|"):[r.data,r.forn,r.val,r.obs,r.item].join("|");
let pend=[];
function prowE(c){const id=uid(),er=[],data=pd(c[0]),val=pv(c[3]),item=c[4]?ITEMS.find(i=>i.toLowerCase()===c[4].toLowerCase()):"Terraplanagem - Máquinas Aluguel";if(!data)er.push("data inválida");if(!c[1])er.push("sem equipamento");if(val==null)er.push("valor inválido");if(!item)er.push("item de obra desconhecido");return{r:{id,src:"E",comp:data?data.slice(0,7):"",data,forn:c[1],doc:"",val,obs:c[2],item,tipo:"MAQ"},er}}
function prow(c,m){if(m==="E")return prowE(c);const id=uid(),F=m==="F",o=F?1:0,er=[],val=pv(c[4+o]),item=ITEMS.find(i=>i.toLowerCase()===c[6+o].toLowerCase()),tipo=c[7+o].toUpperCase();let r;
 if(F){const comp=pc(c[0]),q=(c[1].toUpperCase().match(/[12M]/)||[])[0];if(!comp)er.push("competência inválida");if(!q)er.push("quinzena deve ser 1, 2 ou M");
  r={id,src:"F",comp,q,data:comp+(q==="1"?"-15":"-28"),forn:c[2]+(c[3]?" ("+c[3]+")":""),doc:"",sal:pv(c[4]),val,obs:c[6],item,tipo}}
 else{const data=pd(c[1]),comp=pc(c[0],data);if(!data)er.push("data inválida");if(!comp)er.push("competência inválida");r={id,src:"B",comp,data,forn:c[2],doc:c[3],val,obs:c[5],item,tipo}}
 if(!c[2])er.push(F?"sem nome":"sem fornecedor");if(val==null)er.push("valor inválido");if(!item)er.push("item de obra desconhecido");if(!TIPOS[tipo])er.push("tipo deve ser MAT, MDO ou MAQ");return{r,er}}
$("#chk").onclick=()=>{const m=md(),n=NCOL[m],have=new Set(rows.map(key)),seen=new Set();pend=[];
 $("#ta").value.split(/\r?\n/).filter(l=>l.trim()).forEach(l=>{const c=l.split("\t").map(x=>x.trim());if(c.length<n||/^(compet|data|equip)/i.test(c[0]))return;while(c.length<n+1)c.push("");
  const{r,er}=prow(c,m);let st=er.length?"e":"o",msg=er.join("; ");if(!er.length&&(have.has(key(r))||seen.has(key(r)))){st="w";msg="possível duplicata"}seen.add(key(r));pend.push({r,st,msg,c,m})});
 const k=s=>pend.filter(p=>p.st===s).length,ok=k("o"),du=k("w"),ne=k("e"),wh=p=>p.m==="F"?p.c[0]+" · "+p.c[1]:p.m==="E"?p.c[0]:p.c[1];
 $("#prev").style.display="block";$("#ph").textContent=pend.length?pend.length+" linhas: "+ok+" válidas, "+du+" possíveis duplicatas, "+ne+" com erro":"Nenhuma linha reconhecida (confira se há "+n+" colunas separadas por tabulação, ponto e vírgula ou vírgula)";
 $("#pt").innerHTML="<thead><tr><th>Situação</th><th>Quando</th><th>"+(m==="E"?"Equipamento":m==="F"?"Nome":"Fornecedor")+"</th><th class=n>Valor</th><th>Item Obra</th><th>Tipo</th></tr></thead><tbody>"+pend.map(p=>"<tr class="+p.st+"><td>"+(p.st==="o"?"OK":esc(p.msg))+"</td><td>"+esc(wh(p))+"</td><td>"+esc(p.m==="E"?p.c[1]:p.c[2])+"</td><td class=n>"+esc(p.r.val!=null?R(p.r.val):p.m==="F"?p.c[5]:p.m==="E"?p.c[3]:p.c[4])+"</td><td>"+esc(p.r.item||"")+"</td><td>"+esc(p.r.tipo||"")+"</td></tr>").join("")+"</tbody>";$("#go").style.display=ok+du?"":"none"};
$("#go").onclick=()=>{const k=$("#kd").checked,add=pend.filter(p=>p.st==="o"||(k&&p.st==="w")).map(p=>p.r);rows=rows.concat(add);pend=[];$("#prev").style.display="none";$("#ta").value="";closeImp();up();toast(add.length+" lançamentos importados.")};
$("#csv").onclick=async()=>{const q=s=>'"'+String(s??"").replace(/"/g,'""')+'"',h=["Origem","Competência","Data","Quinzena","Fornecedor","CNPJ / Dados de pagamento","Valor (R$)","Observação","Item Obra (destino)","Tipo"];
 const t="\uFEFF"+[h.map(q).join(";")].concat(rows.map(r=>[r.src==="F"?"Folha":r.src==="E"?"Equipamento":"Borderô",cl(r.comp),r.src==="F"?"":dl(r.data),r.q||"",r.forn,r.doc,r.val==null?"":String(r.val).replace(".",","),r.obs,r.item,r.tipo].map(q).join(";"))).join("\n");
 try{const d=await claude.use("downloads");if(d){await d.save({filename:"lancamentos.csv",data:t});return}}catch(e){}
 const o=modal("<h3>Exportar CSV</h3><p class=mut style='margin-bottom:8px'>Copie e cole no Excel (separador ponto e vírgula) ou salve como lancamentos.csv.</p><textarea id=cvt readonly style='min-height:220px'></textarea>",o=>{const a=o.querySelector("#cvt");a.focus();a.select();let p;try{p=navigator.clipboard.writeText(a.value)}catch(e){}(p&&p.then?p:Promise.reject()).then(()=>toast("CSV copiado."),()=>{try{document.execCommand("copy")?toast("CSV copiado."):toast("Selecione o texto e copie (Ctrl+C).")}catch(e){toast("Selecione o texto e copie (Ctrl+C).")}});return false},"Copiar");o.querySelector("#cvt").value=t};
ORC=D.orc;
function orc(){const k=$("#ob").value,nm={CB1:"Campo Belo 1",CB2:"Campo Belo 2",ALL:"Campo Belo 1 + 2"}[k],M=new Map();
 (k==="ALL"?ORC.CB1.concat(ORC.CB2,ORC.CB12):ORC[k]).forEach(a=>{const o=M.get(a[0])||[a[0],0,0,0,0];for(let i=1;i<5;i++)o[i]+=a[i];M.set(a[0],o)});
 const L=[...M.values()],T=i=>L.reduce((s,a)=>s+a[i],0),tt=a=>a[1]+a[2]+a[3]+a[4],G=L.reduce((s,a)=>s+tt(a),0),c=x=>"<td class=n>"+(x?R(x):"-")+"</td>";
 $("#oc").innerHTML=[["Total orçado",G],["Máquinas (MAQ)",T(1)],["Materiais (MAT)",T(2)],["Mão de obra (MDO)",T(3)],["Sem divisão por tipo",T(4)]].map(x=>"<div class=card><small>"+x[0]+"</small><b>"+R(x[1])+"</b></div>").join("");
 $("#ot").textContent="Orçamento – "+nm;
 $("#otb").innerHTML="<table><thead><tr><th>Item de obra</th><th class=n>MAQ</th><th class=n>MAT</th><th class=n>MDO</th><th class=n>Sem tipo</th><th class=n>Total orçado</th><th class=n>% do total</th></tr></thead><tbody>"+L.map(a=>"<tr><td>"+esc(a[0])+"</td>"+c(a[1])+c(a[2])+c(a[3])+c(a[4])+"<td class=n><b>"+(tt(a)?R(tt(a)):"-")+"</b></td><td class=n>"+(G?(tt(a)/G*100).toFixed(1).replace(".",",")+"%":"-")+"</td></tr>").join("")+"</tbody><tfoot><tr><td>Total</td>"+[1,2,3,4].map(i=>"<td class=n>"+R(T(i))+"</td>").join("")+"<td class=n>"+R(G)+"</td><td class=n>100,0%</td></tr></tfoot></table>"}
$("#ob").onchange=orc;
orc();
function planilha(){const PL=[["Mobilização"],["Custo Fixo","Custo Fixo (18 meses)"],["Toten Entrada e Praças"],["Terraplanagem - Aterro"],["Terraplanagem - Máquinas Aluguel"],["Terraplanagem - Máquinas Diesel"],["Terraplanagem - Máquinas Operadores"],["MANUTENÇÃO Máquinas"],["Drenagem"],["A Água"],["Meio Fio"],["Rua Pavimento - 7m"],["Ponte Premoldada"],["Rede Elétrica (Aérea)"],["Calçadas 3m (30% PISO e 70% GRAMA)"]],FAB={"FABRICA DE PAVER":"Rua Pavimento - 7m"},B=new Map(),E=new Map();
 ORC.CB1.concat(ORC.CB2,ORC.CB12).forEach(a=>{const o=B.get(a[0])||[0,0,0,0];for(let i=1;i<5;i++)o[i-1]+=a[i];B.set(a[0],o)});
 rows.forEach(r=>{const n=FAB[r.item]||r.item||"(vazio)";E.set(n,(E.get(n)||0)+(r.val||0))});
 const lc=comps().slice(-1)[0],L=PL.map(x=>[x[0],x[1]||x[0]]).concat([...E.keys()].filter(n=>!B.has(n)&&!PL.some(x=>x[0]===n)).map(n=>[n,n+" (sem orçamento)"])),
 c=x=>"<td class=n>"+(x?R(x):"-")+"</td>",T=[0,0,0,0,0];
 const AL="Terraplanagem - Máquinas Aluguel",pm=rows.filter(r=>r.src==="E"&&r.item!=="FABRICA DE PAVER"&&(r.item||AL)===AL).reduce((t,r)=>t+(r.val||0),0),fp=rows.filter(r=>r.item==="FABRICA DE PAVER").reduce((t,r)=>t+(r.val||0),0),sub=(n,v)=>"<tr class=sb><td>↳ "+n+"</td><td></td><td></td><td></td><td></td><td class=n>"+R(v)+"</td><td></td><td></td></tr>";
 L.sort((x,y)=>x[1].localeCompare(y[1],"pt-BR"));
 const body=L.map(a=>{const o=B.get(a[0])||[0,0,0,0],tot=o[0]+o[1]+o[2]+o[3],e=E.get(a[0])||0,s=tot-e;[o[0],o[1],o[2],tot,e].forEach((v,i)=>T[i]+=v);
  return"<tr><td>"+esc(a[1])+"</td>"+c(o[0])+c(o[1])+c(o[2])+"<td class=n><b>"+(tot?R(tot):"-")+"</b></td>"+c(e)+"<td class=n>"+(tot?(e/tot*100).toFixed(1).replace(".",",")+"%<span class=pg><i class='"+(e>tot?"r":"")+"' style='width:"+Math.min(e/tot*100,100)+"%'></i></span>":"—")+"</td><td class=n>"+(s?"<span class='sd "+(s<0?"r":"g")+"'>"+R(s)+"</span>":"-")+"</td></tr>"+(a[0]===AL&&(E.get(AL)||0)?(((E.get(AL)||0)-pm)>0?sub("Aluguel pago",(E.get(AL)||0)-pm):"")+sub("Compra de máquinas (equipamentos)",pm):"")+(a[0]==="Rua Pavimento - 7m"&&fp?sub("Fábrica de Paver (já incluído acima)",fp):"")}).join("");
 $("#pl").innerHTML="<table><thead><tr class=g><th></th><th colspan=4>Planejado total</th><th colspan=2>Executado até "+(lc?cl(lc).toUpperCase():"-")+"</th><th>Saldo</th></tr><tr><th>Item</th><th class=n>Máquinas</th><th class=n>Material</th><th class=n>Mão de obra</th><th class=n>Máq+Mat+MDO</th><th class=n>Executado</th><th class=n>%</th><th class=n>Saldo</th></tr></thead><tbody>"+body+"</tbody><tfoot><tr><td>Total</td>"+[0,1,2,3,4].map(i=>"<td class=n>"+R(T[i])+"</td>").join("")+"<td class=n>"+(T[3]?(T[4]/T[3]*100).toFixed(1).replace(".",",")+"%":"—")+"</td><td class=n>"+R(T[3]-T[4])+"</td></tr></tfoot></table>"}
function economia(){const FAB={"FABRICA DE PAVER":"Rua Pavimento - 7m"},B=new Map(),E=new Map();
 ORC.CB1.concat(ORC.CB2,ORC.CB12).forEach(a=>B.set(a[0],(B.get(a[0])||0)+a[1]+a[2]+a[3]+a[4]));
 rows.forEach(r=>{const n=FAB[r.item]||r.item||"(vazio)";E.set(n,(E.get(n)||0)+(r.val||0))});
 const AL="Terraplanagem - Máquinas Aluguel",pm=rows.filter(r=>r.src==="E"&&r.item!=="FABRICA DE PAVER"&&(r.item||AL)===AL).reduce((t,r)=>t+(r.val||0),0),fp=rows.filter(r=>r.item==="FABRICA DE PAVER").reduce((t,r)=>t+(r.val||0),0),L=[...new Set([...B.keys(),...E.keys()])].map(n=>({n,o:B.get(n)||0,e:E.get(n)||0})).filter(x=>x.o>0).map(x=>({...x,s:x.o-x.e})).sort((a,b)=>a.n.localeCompare(b.n,"pt-BR")),
  ab=L.filter(x=>x.s>=0),ac=L.filter(x=>x.s<0),S=(a,k)=>a.reduce((t,x)=>t+x[k],0),pc=x=>(x*100).toFixed(1).replace(".",",")+"%",mx=Math.max(...L.map(x=>Math.max(x.o,x.e)),1),sp=x=>x.n===AL&&pm>0?[pm,"Máquinas compradas","Aluguel pago"]:x.n==="Rua Pavimento - 7m"&&fp>0?[fp,"Fábrica de Paver","Demais da rua"]:null,bx=(k,v,t,p)=>"<div class=cb><i class="+k+" style='width:"+v/mx*100+"%'></i><em>"+(t?t+" · ":"")+R(v)+(p!=null?" · "+pc(p):"")+"</em></div>",tp=S(L,"o")?S(L,"e")/S(L,"o"):0;
 $("#dn").style.background="conic-gradient(var(--pri) "+Math.min(tp,1)*360+"deg,var(--pri2) 0)";$("#dn").innerHTML="<div><b>"+pc(tp)+"</b><small>do orçado executado</small></div>";
 const am=L.find(y=>y.n===AL);$("#ecm").innerHTML=am&&pm>0?"<div class='bn "+(am.s>=0?"g":"r")+"'><b>Máquinas compradas × orçado</b><span>Orçado "+R(am.o)+" − comprado "+R(pm)+(am.e-pm>0?" − aluguel "+R(am.e-pm):"")+" = <strong>"+(am.s>=0?"economia de ":"estouro de ")+R(Math.abs(am.s))+" ("+pc(Math.abs(am.s)/am.o)+")</strong></span></div>":"";
 $("#eco").innerHTML=L.map(x=>{const g=x.s>=0,c=g?"g":"r",p=x.o?x.e/x.o:0,s=sp(x);
  return"<div class=cr><div class=cn>"+esc(x.n)+"</div><div class=pr><div class=tk><i class='"+(g?"":"r")+"' style='width:"+Math.min(p*100,100)+"%'></i></div><div class=pt>"+pc(p)+" executado · "+R(x.e)+" de "+R(x.o)+(s?" · inclui "+s[1].toLowerCase()+" "+R(s[0]):"")+"</div></div><div class=ct><span class='sd "+c+"'>"+(g?"Saldo ":"Acima ")+R(Math.abs(x.s))+"</span></div></div>"}).join("")}
["#pm","#pi","#ps"].forEach(x=>$(x).onchange=pivot);
const CMI=["Mobilização","Custo Fixo","Toten Entrada e Praças","Terraplanagem - Aterro","Terraplanagem - Máquinas Aluguel","Terraplanagem - Máquinas Diesel","Terraplanagem - Máquinas Operadores","MANUTENÇÃO Máquinas","Drenagem","A Água","Meio Fio","Rua Pavimento - 7m","Ponte Premoldada","Rede Elétrica (Aérea)","Calçadas 3m (30% PISO e 70% GRAMA)"];
const mr=(a,n)=>{const o=[];let y=+a.slice(0,4),m=+a.slice(5);for(let i=0;i<n;i++){o.push(y+"-"+String(m).padStart(2,"0"));if(++m>12){m=1;y++}}return o};
const PM=D.pm,CMP=D.cmp;
const pf=x=>x.toFixed(2).replace(".",",")+"%",sm=a=>a.reduce((t,x)=>t+x,0);
function cmOrcT(){const B={};ORC.CB1.concat(ORC.CB2,ORC.CB12).forEach(a=>{const o=B[a[0]]||(B[a[0]]=[0,0,0,0]);for(let i=0;i<4;i++)o[i]+=a[i+1]});return B}
function cmLast(){const s=$("#cmu");return s&&s.value||"2026-08"}
function cmSel(){const s=$("#cmu");if(s.options.length)return;s.innerHTML=mr("2026-08",8).map(m=>"<option value='"+m+"'>"+cl(m)+"</option>").join("")}
const DIL=mr("2025-11",9),dsp=v=>{const c=Math.round(v*100),b=Math.floor(c/9),r=c-b*9;return DIL.map((m,i)=>[m,(b+(i===8?r:0))/100])};
const VM=mr("2025-11",26);
let CMX_ON=true;
function aviso(){const d0=new Date();d0.setDate(1);d0.setMonth(d0.getMonth()-1);const ex=d0.getFullYear()+"-"+String(d0.getMonth()+1).padStart(2,"0"),
 fl=(k,t)=>{const f=VM.filter(m=>m<=ex&&!rows.some(r=>r.src===k&&r.comp===m));return f.length?"<div><b>"+t+":</b> faltam "+f.map(cl).join(", ")+"</div>":""},g=fl("B","Borderô")+fl("F","Folha (custo fixo)");
 $("#vb").innerHTML=g?"<div class='bn r'><div><b>Faltam lançamentos até "+cl(ex)+"</b>"+g+"</div><button class='b p' id=vg>Ir para Lançamentos</button></div>":""}
function cron(){cmSel();aviso();{const t=rows.filter(r=>r.dil).reduce((s,r)=>s+(r.val||0),0);$("#cmn").textContent=t?"Equipamentos de terraplanagem ("+R(t)+") diluídos em 9 meses (nov/25 a jul/26), em partes iguais.":""}const B=cmOrcT(),FAB={"FABRICA DE PAVER":"Rua Pavimento - 7m"},LR=cmLast(),MS=PM.filter(m=>m>LR),S0=rows.reduce((a,r)=>{const c=r.dil?"2025-11":r.comp;return c&&c<a?c:a},"2025-11"),
 NR=(+LR.slice(0,4)-+S0.slice(0,4))*12+(+LR.slice(5))-(+S0.slice(5))+1,HM=CMX_ON?mr(S0,NR):[],L={},hl={};
 const DT={};rows.forEach(r=>{const n=FAB[r.item]||r.item||"(vazio)";if(r.dil){DT[n]=(DT[n]||0)+(r.val||0);return}(L[n]=L[n]||{})[r.comp]=((L[n]||{})[r.comp]||0)+(r.val||0);hl[r.comp]=1});Object.keys(DT).forEach(n=>dsp(DT[n]).forEach(q=>{(L[n]=L[n]||{})[q[0]]=((L[n]||{})[q[0]]||0)+q[1];hl[q[0]]=1}));
 const lm=(n,k)=>(L[n]||{})[k]||0,names=CMI.concat(Object.keys(L).filter(n=>!(n in B)&&!CMI.includes(n))),pv=(n,m,o)=>{const i=PM.indexOf(m);return i<0?0:o*((CMP[n]||[])[i]||0)},
 NC=MS.length,pt={},lt={},T=[0,0,0,0],kc=m=>m<"2027-05"?"mp":"mj",c=v=>"<td class=n>"+(v?R(v):"-")+"</td>",bl=n=>"<td></td>".repeat(n),
 sg=v=>v<-.5?" neg":v>.5?" pos":"";let tO=0,tE=0,tP=0,tS=0,tV=0;
 const pc=a=>tO&&a?pf(a/tO*100):"-";
 const body=names.map(n=>{const b=B[n]||[0,0,0,0],o=sm(b),e=Object.keys(L[n]||{}).filter(k=>k==="pre"||k<=LR).reduce((t,k)=>t+L[n][k],0),v=MS.map(m=>pv(n,m,o)),p=sm(v),tot=e+p,sd=o-tot;let vr=0;
  PM.forEach(m=>{if(hl[m])vr+=pv(n,m,o)-lm(n,m)});b.forEach((x,i)=>T[i]+=x);tO+=o;tE+=e;tP+=p;tS+=sd;tV+=vr;
  HM.forEach(k=>{lt[k]=(lt[k]||0)+lm(n,k);if(k!=="pre")pt[k]=(pt[k]||0)+pv(n,k,o)});MS.forEach((m,i)=>{pt[m]=(pt[m]||0)+v[i];lt[m]=(lt[m]||0)+lm(n,m)});
  return"<tr><td class=s>"+esc(n)+(o?"":" <span class=mut>(sem orçamento)</span>")+"</td>"+b.slice(0,3).map(x=>c(x)).join("")+"<td class=n><b>"+(o?R(o):"-")+"</b></td>"
  +HM.map(k=>"<td class='n mh'>"+(lm(n,k)?R(lm(n,k)):"-")+"</td>").join("")
  +"<td class='n mh'>"+(e?R(e):"-")+"</td><td class='n mh'>"+(o&&e?"<div class=cmb><span class=t><i class='"+(e>o?"r":"")+"' style='width:"+Math.min(e/o*100,100)+"%'></i></span><span>"+pf(e/o*100)+"</span></div>":"-")+"</td>"
  +MS.map((m,i)=>{const x=v[i],l=lm(n,m),k=kc(m);return"<td class='n "+k+"'>"+(x?R(x):"-")+"</td><td class='n "+k+"'>"+(x&&o?pf(x/o*100):"-")+"</td>"+(hl[m]?"<td class='n lz"+(l>x+.5?" neg":l&&l<x-.5?" pos":"")+"'>"+(l?R(l):"-")+"</td>":"")}).join("")
  +"<td class=n><b>"+(tot?R(tot):"-")+"</b></td><td class=n>"+(o&&tot?pf(tot/o*100):"-")+"</td><td class='n"+sg(sd)+"'>"+(Math.abs(sd)>.5?R(sd):"-")+"</td><td class='n"+sg(vr)+"'>"+(Math.abs(vr)>.5?R(vr):"-")+"</td></tr>"}).join("");
 const th=m=>"<th colspan="+(hl[m]?3:2)+(m.slice(5)==="01"?" class=yr":"")+">"+cl(m)+"</th>",cw=m=>hl[m]?3:2,w1=MS.filter(m=>m<"2027-05").reduce((t,m)=>t+cw(m),0),w2=MS.filter(m=>m>="2027-05").reduce((t,m)=>t+cw(m),0),
 LU=cl(LR).toUpperCase(),w=$("#cmw"),sl=w?w.scrollLeft:0,dc=(p,l)=>{const d=p-l;return"<td class='n"+sg(d)+"'>"+R(d)+"</td>"};let ac=tE,ah=0;
 w.innerHTML="<table><thead><tr><th class=s rowspan=3>Atividade</th><th class=gh colspan=4>Orçamento</th><th class=gh colspan="+(HM.length+2+w1)+">Campo Belo I</th>"+(w2?"<th class='gh gj' colspan="+w2+">Campo Belo II</th>":"")+"<th class='gh gp' colspan=4>Total do cronograma</th></tr>"
 +"<tr><th rowspan=2>Máquinas</th><th rowspan=2>Material</th><th rowspan=2>Mão de obra</th><th rowspan=2>Orçado total</th>"+HM.map(k=>"<th>"+(k==="pre"?"até out/25":cl(k))+"</th>").join("")+"<th colspan=2>Executado até "+LU+"</th>"+MS.map(th).join("")+"<th rowspan=2>$ Total previsto</th><th rowspan=2>% Total</th><th rowspan=2>Saldo</th><th rowspan=2>Previsto − lançado</th></tr>"
 +"<tr>"+HM.map(()=>"<th>R$</th>").join("")+"<th>R$</th><th>%</th>"+MS.map(m=>"<th>Previsto</th><th>%</th>"+(hl[m]?"<th>Lançado</th>":"")).join("")+"</tr></thead><tbody>"+body+"</tbody>"
 +"<tfoot><tr><td class=s>Previsto no mês</td>"+T.slice(0,3).map(x=>c(x)).join("")+"<td class=n>"+R(tO)+"</td>"+HM.map(k=>c(lt[k])).join("")+"<td class=n>"+R(tE)+"</td><td class=n>"+pc(tE)+"</td>"+MS.map(m=>c(pt[m])+"<td class=n>"+pc(pt[m])+"</td>"+(hl[m]?"<td class=n>-</td>":"")).join("")+"<td class=n>"+R(tE+tP)+"</td><td class=n>"+pc(tE+tP)+"</td><td class='n"+sg(tS)+"'>"+(Math.abs(tS)>.5?R(tS):"-")+"</td><td class='n"+sg(tV)+"'>"+(Math.abs(tV)>.5?R(tV):"-")+"</td></tr>"
 +"<tr><td class=s>Acumulado</td>"+bl(4)+HM.map(k=>{ah+=lt[k]||0;return c(ah)}).join("")+"<td class=n>"+R(tE)+"</td><td class=n>"+pc(tE)+"</td>"+MS.map(m=>{ac+=pt[m]||0;return"<td class=n>"+R(ac)+"</td><td class=n>"+pc(ac)+"</td>"+(hl[m]?"<td></td>":"")}).join("")+bl(4)+"</tr></tfoot></table>";
 w.scrollLeft=sl;
 window.CRON_END=tE+tP;window.CRON_ORC=tO;window.CRON_LR=LR;$("#cmc").innerHTML=[["Orçado total (CB I + II)",R(tO)],["Executado até "+cl(LR),R(tE)+" · "+pc(tE)],["Previsto "+(NC?cl(MS[0])+" a "+cl(MS[NC-1]):"(sem meses futuros)"),R(tP)],["Total ao fim do cronograma",R(tE+tP)+" · "+pc(tE+tP)],["Saldo (orçado − total)",R(tS)]].map(x=>"<div class=card><small>"+x[0]+"</small><b>"+x[1]+"</b></div>").join("");areas()}
$("#vb").onclick=e=>{if(e.target.id==="vg")document.querySelector("nav button[data-t=ln]").click()};
$("#cmx").onclick=()=>{CMX_ON=!CMX_ON;$("#cmx").textContent=CMX_ON?"Ocultar meses executados":"Ver meses executados (nov/25 em diante)";cron()};
$("#cmu").onchange=cron;
let AR=Object.assign({ l1: 0, l2: 0 }, D.areas);
const nf=v=>v?v.toLocaleString("pt-BR",{maximumFractionDigits:2}):"",pn=s=>{s=String(s==null?"":s).replace(/[\s\u00a0]|m²/gi,"");if(!s)return 0;if(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,"");s=s.replace(",",".");const n=parseFloat(s);return isFinite(n)&&n>0?n:0},AID=["l1","l2"];
function areas(){
 const m2=v=>v?nf(v)+" m²":"-",A=AR.l1+AR.l2;
 $("#alt").textContent=A?nf(A):"-";
 const G=sum(rows),O=window.CRON_ORC||0,E=window.CRON_END||0,pm=v=>A?R(v/A):"-",sg=v=>v<-.5?" neg":v>.5?" pos":"";
 $("#arc").innerHTML=[["Área loteável (I + II)",m2(A),""],["1. Orçado total",R(O),""],["Orçado por m² loteável",A?R(O/A):"Informe a área",""],["2. Gasto real (lançado)",R(G),""],["Gasto real por m² loteável",A?R(G/A):"Informe a área",""],["3. Saldo (orçado − gasto real)",R(O-G),O-G<0?" kr":" kg"],["Saldo por m² loteável",A?R((O-G)/A):"Informe a área",O-G<0?" kr":" kg"]].map(c=>"<div class='card"+c[2]+"'><small>"+c[0]+"</small><b>"+c[1]+"</b></div>").join("");
 const L=[["1. Orçado total (cronograma)",O,0],["2. Gasto real (todos os lançamentos)",G,0],["3. Saldo (orçado − gasto real)",O-G,1]];
 $("#arr").innerHTML="<table><thead><tr><th>Indicador</th><th class=n>Valor (R$)</th><th class=n>R$ por m² loteável</th></tr></thead><tbody>"+L.map(x=>"<tr><td>"+esc(x[0])+"</td><td class='n"+(x[2]?sg(x[1]):"")+"'>"+R(x[1])+"</td><td class='n"+(x[2]?sg(x[1]):"")+"'>"+(A?pm(x[1]):"-")+"</td></tr>").join("")+"</tbody></table>"+(A?"":"<p class=mut style='margin:8px 0 0'>Informe a área loteável acima para ver o custo por m².</p>")}
AID.forEach(id=>{const el=$("#a"+id);el.value=nf(AR[id]);el.oninput=()=>{AR[id]=pn(el.value);__salvarAreas();areas()};el.onchange=()=>{el.value=nf(AR[id])}});
up();
__depoisDeCarregar();
