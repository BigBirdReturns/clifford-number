/* Explicit controls for the loopback reservoir. Inert on any external host. */
(() => {
  'use strict';
  if (!['127.0.0.1', 'localhost'].includes(location.hostname) || !window.RESERVOIR_LOCAL) return;
  const config = window.RESERVOIR_LOCAL;
  const node = (tag, text) => { const n = document.createElement(tag); if(text != null) n.textContent=text; return n; };
  const style=node('style');style.textContent=`
section.moved code{overflow-wrap:anywhere;word-break:break-word}
#native-estate{margin:0;min-width:0;width:100%;padding:18px;background:var(--surface);border:1px solid var(--line);border-radius:10px}
#native-estate>summary{font-weight:600;cursor:pointer;min-height:28px}#native-estate[open]>summary{margin-bottom:14px}#native-estate .bar{font-size:13px}
#native-estate .bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
#native-estate input{flex:1;min-width:0;width:100%}#native-estate input,#native-estate select,#native-estate button,#return-result button,#return-result select{font:inherit;padding:8px 10px;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:5px}
#native-estate select{max-width:100%;min-width:0}#native-estate button,#return-result button{cursor:pointer}#native-results{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:8px;max-height:300px;overflow:auto}
#native-results button{text-align:left;min-width:0}#native-results small{display:block;overflow-wrap:anywhere;color:var(--accent);font:11px var(--font-mono)}#native-results p{font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--muted)}
#native-source{width:min(1000px,96vw);max-height:90vh;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:20px}#native-source::backdrop{background:#0008}#native-source pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.65 var(--font-mono);max-height:62vh;overflow:auto}
#native-source small{display:block;overflow-wrap:anywhere}#return-result{display:grid;grid-template-columns:minmax(0,1fr);gap:9px;margin:18px 0;padding:14px;border:1px solid var(--accent);border-radius:6px}#return-result>*{min-width:0;max-width:100%}#return-result textarea{font:inherit;padding:10px;min-height:100px;width:100%;resize:vertical;background:var(--surface);color:var(--ink);border:1px solid var(--line)}.source-record{white-space:pre-wrap;overflow-wrap:anywhere;max-height:350px;overflow:auto;font-size:13px}
`;document.head.append(style);
  const panel=node('details');panel.id='native-estate';panel.append(node('summary','Search native project files'));
  const bar=node('div');bar.className='bar';
  const status=node('span','Reading native collections…');status.style.flex='1';bar.append(status);
  const refresh=node('button','Read changed sources');refresh.type='button';bar.append(refresh);panel.append(bar);
  const searchBar=node('div');searchBar.className='bar';
  const input=node('input');input.id='native-q';input.type='search';input.placeholder='Search across projects: actor, question, mechanism, code or path';input.setAttribute('aria-label','Search native estate');
  const project=node('select');project.id='native-project';project.setAttribute('aria-label','Project');project.append(new Option('All connected projects',''));searchBar.append(input,project);panel.append(searchBar);
  const summary=node('p');summary.id='native-summary';panel.append(summary);
  const list=node('div');list.id='native-results';panel.append(list);document.querySelector('#register .search').after(panel);
  const modal=node('dialog');modal.id='native-source';document.body.append(modal);
  let offset=0,epoch=0,selectedSources=[],inquiry='',seen=config.fingerprint;
  const drafts=new Map();
  document.title='Reservoir | Local estate';
  document.querySelector('h1').textContent='The reservoir';
  async function request(path,body){
    const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-Reservoir-Token':config.token},body:JSON.stringify(body)});
    const data=await r.json();if(!r.ok)throw new Error(data.error);return data;
  }
  async function search(reset=true){
    if(reset)offset=0;const current=++epoch;
    if(!input.value.trim()&&!project.value){list.replaceChildren();summary.textContent='Choose a project or search its native work. The inquiry below stays selected while you inspect sources.';return;}
    try{
      const data=await fetch('/api/search?'+new URLSearchParams({q:input.value,project:project.value,offset:String(offset)})).then(r=>r.json());
      if(current!==epoch)return;if(data.error)throw new Error(data.error);
      summary.textContent=data.total.toLocaleString()+' matching native records. Indexed text covers the first 16 KiB; open any source to read it in place.';
      if(reset)list.replaceChildren();else list.querySelector('.more-native')?.remove();
      for(const row of data.rows){
        const b=node('button');b.type='button';b.dataset.sourceId=row.id;b.append(node('small',row.project+' / '+row.relative),node('b',row.title),node('p',row.excerpt.slice(0,350)));
        b.addEventListener('click',()=>openSource(row.id));list.append(b);
      }
      if(offset+data.rows.length<data.total){const more=node('button','Read 30 more');more.className='more-native';more.addEventListener('click',()=>{offset+=30;search(false);});list.append(more);}
    }catch(e){summary.textContent=e.message;}
  }
  async function openSource(id){
    modal.replaceChildren(node('p','Reading the native source…'));
    if(!modal.open)modal.showModal();
    try {
      const data=await fetch('/api/source?id='+encodeURIComponent(id)).then(r=>r.json());modal.replaceChildren();
      if(data.error)throw new Error(data.error);
      modal.append(node('h2',data.title),node('small',data.path),node('small',data.project+' · '+data.bytes.toLocaleString()+' bytes · '+(data.truncated?'bounded excerpt':'complete displayed source')));
      const attach=node('button',inquiry?'Attach to current inquiry':'Choose an inquiry before attaching');attach.disabled=!inquiry;attach.addEventListener('click',()=>{if(!selectedSources.includes(id))selectedSources.push(id);modal.close();renderForm(inquiry);});modal.append(attach);
      const close=node('button','Close');close.addEventListener('click',()=>modal.close());modal.append(close,node('pre',data.text));
      modal.append(node('small',data.revisions.length+' source observations retained; original files remain untouched.'));
    } catch(error) {
      modal.replaceChildren(node('p',error.message));const close=node('button','Close');close.addEventListener('click',()=>modal.close());modal.append(close);
    }
  }
  async function renderForm(id){
    inquiry=id;const detail=document.getElementById('detail');if(!id||!detail)return;
    const previous=document.getElementById('return-result');const draft=drafts.get(id)||'';previous?.remove();detail.querySelector('.ret')?.remove();
    const form=node('form');form.id='return-result';form.append(node('h3','Return a result to this inquiry'));
    const label=node('label','What did you observe? What changed the explanation?');label.htmlFor='returned-observation';form.append(label);
    const text=node('textarea');text.id='returned-observation';text.name='result';text.required=true;text.maxLength=20000;text.value=draft;text.addEventListener('input',()=>drafts.set(id,text.value));form.append(text);
    const origin=node('select');origin.name='origin';origin.setAttribute('aria-label','Origin');for(const [label,value] of [['My words','human_words'],['Agent observation','agent_observation'],['Agent interpretation','agent_interpretation']])origin.append(new Option(label,value));form.append(origin);
    form.append(node('small',selectedSources.length+' native source(s) attached'));
    const save=node('button','Retain result and circulate');save.type='submit';form.append(save);const msg=node('div');msg.setAttribute('role','status');form.append(msg);detail.append(form);
    let requestId=null;
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(!text.value.trim())return;save.disabled=true;requestId=requestId||crypto.randomUUID();
      try{
        await request('/api/return',{request_id:requestId,inquiry:id,text:text.value,source_ids:selectedSources,origin:{kind:origin.value,author:origin.value==='human_words'?'Local operator':'Agent via local reservoir'}});
        text.value='';drafts.delete(id);selectedSources=[];msg.textContent='Saved to the durable history. The updated pass will open here.';requestId=null;
      }catch(err){msg.textContent=err.message;save.disabled=false;}
    });
    try {
      const data=await fetch('/api/returns?inquiry='+encodeURIComponent(id)).then(r=>r.json());
      if(!document.contains(form))return;
      for(const result of data.rows||[]){const block=node('blockquote',result.text);block.append(node('cite',result.at+' · '+result.origin.kind));form.append(block);}
    } catch(error) {msg.textContent='Saved history could not be read: '+error.message;}
  }
  let timer;input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>search(),250);});project.addEventListener('change',()=>search());
  refresh.addEventListener('click',async()=>{try{await request('/api/refresh',{requested:true});status.textContent='Reading current native sources…';}catch(e){status.textContent=e.message;}});
  window.addEventListener('reservoir:select',e=>{selectedSources=[];renderForm(e.detail.id);});
  async function poll(){
    try{
      const s=await fetch('/api/status').then(r=>r.json());
      status.textContent=s.phase==='ready'?`${(s.files||0).toLocaleString()} native files · ${s.project_views||s.projects} project views · ${s.checked_at||s.built_at}${s.indexing?' · reading '+s.reading:''}`:`${s.phase}: ${s.reading||''} · ${(s.files||0).toLocaleString()} files${s.error?' · '+s.error:''}`;
      if(s.fingerprint&&s.fingerprint!==seen){
        const draft=document.querySelector('#return-result textarea')?.value;
        const inspecting=modal.open||selectedSources.length>0||document.activeElement===input;
        if(!draft&&!inspecting){if(inquiry)location.hash=encodeURIComponent(inquiry);location.reload();}else{status.textContent+=' · Updated pass ready; current inspection and unsaved notes stay open.';}
      }
    }catch(e){status.textContent='Connection interrupted; the retained page remains available.';}
  }
  fetch('/api/projects').then(r=>r.json()).then(data=>{for(const p of data.projects)project.append(new Option(p.project+' · '+(p.files||0).toLocaleString()+' files',p.project));search();}).catch(e=>{summary.textContent=e.message;});
  renderForm(document.getElementById('detail')?.dataset.inquiryId||document.querySelector('#detail > .id')?.textContent||'');poll();setInterval(poll,2000);
})();
