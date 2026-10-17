(function (global) {
  'use strict';
  const E = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const data = () => global.CASEBOOK || {cases:[],scope:'',updatedAt:''};
  const entries = () => Array.isArray(data().cases) ? data().cases : [];
  const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[\s·.,，()（）\-–—]/g,'');
  const dateLabel = value => /^\d{4}$/.test(value) ? `${Number(value.slice(0,2))}.${value.slice(2)}` : value;
  const label = type => ({lecture:'강의 연결',textbook:'교재 보충',tutoring:'튜터링 기출 보충'}[type] || '자료 보충');
  const pastRefs = c => (c.tutoringRefs||[]).filter(r=>r.section==='past');
  const unique = list => [...new Set(list.filter(Boolean))];
  function safeOfficial(value) {
    try {const u=new URL(value);return u.protocol==='https:' && ['law.go.kr','scourt.go.kr','ccourt.go.kr'].some(h=>u.hostname===h||u.hostname.endsWith('.'+h)) && !u.username && !u.password ? u.href : '';}
    catch {return '';}
  }
  function filters(params) {return Object.fromEntries(['query','topic','lecture','source','tutoring','sort'].map(k=>[k,params.get(k)||'']));}
  function filter(items,f) {
    const words=String(f.query||'').trim().split(/\s+/).filter(Boolean).map(normalize);
    let result=items.filter(c=> (!f.topic||c.topic===f.topic) && (!f.source||c.sourceType===f.source) &&
      (!f.lecture||(c.lectureRefs||[]).some(r=>r.date===f.lecture)) &&
      (!f.tutoring||pastRefs(c).some(r=>f.tutoring==='past'||String(r.session)===f.tutoring)) && words.every(word=>normalize([
        c.title,c.topic,...(c.caseNumbers||[]),c.court,c.decisionDate,c.facts,c.issue,c.holding,c.studyPoint,c.distinction,...(c.tags||[]),...(c.tutoringRefs||[]).flatMap(r=>[r.exam,r.question,r.issue,r.note])
      ].join(' ')).includes(word)));
    if(f.sort==='recent') result=[...result].sort((a,b)=>String(b.decisionDate).localeCompare(String(a.decisionDate)));
    if(f.sort==='title') result=[...result].sort((a,b)=>a.title.localeCompare(b.title,'ko'));
    return result;
  }
  function option(value,text,selected) {return `<option value="${E(value)}"${selected===value?' selected':''}>${E(text)}</option>`;}
  function caseHref(c,back) {return `#/case/${encodeURIComponent(c.id)}${back?'?'+new URLSearchParams({back}):''}`;}
  function tags(c) {
    return `<div class="tags"><span class="tag ${c.sourceType==='lecture'?'dark':'outline'}">${label(c.sourceType)}</span><span class="tag outline">${E(c.topic)}</span>${unique((c.lectureRefs||[]).map(r=>r.date)).map(d=>`<a class="tag" href="#/cases?lecture=${E(d)}">${E(dateLabel(d))} 수업</a>`).join('')}${unique(pastRefs(c).map(r=>r.session)).map(n=>`<a class="tag case-tutoring-tag" href="#/cases?tutoring=${E(n)}">튜터링 ${E(n)}회차 기출</a>`).join('')}${c.verification==='official'?'<span class="tag outline">공식 원문 대조</span>':'<span class="tag outline">교재 대조</span>'}</div>`;
  }
  function citation(c) {return [c.court,c.decisionDate,(c.caseNumbers||[]).join(' · ')].filter(Boolean).map(E).join(' · ');}
  function list(route) {
    const all=entries(),f=filters(route.params),items=filter(all,f),topics=unique(all.map(c=>c.topic));
    const dates=unique(all.flatMap(c=>(c.lectureRefs||[]).map(r=>r.date))).sort();
    const back='#/cases'+(route.params.size?'?'+route.params:'');
    const direct=all.filter(c=>c.sourceType==='lecture').length,book=all.filter(c=>c.sourceType==='textbook').length,extra=all.filter(c=>c.sourceType==='tutoring').length,past=all.filter(c=>pastRefs(c).length).length;
    const printAll=route.params.get('full')==='1';
    return `<div class="page-head"><div><p class="eyebrow">CASES IN CLASS</p><h1>판례 정리</h1><p>사안에서 쟁점으로, 판단에서 답안으로. 수업의 설명과 교재를 대조한 판례를 한곳에 모았습니다.</p></div><div class="page-actions"><a class="btn light" href="./downloads/cases-0901-1015.txt" download>전체 정리본 ↓</a><button class="btn secondary" data-case-action="full">${printAll?'목록으로 보기':'해설 모두 펼치기'}</button>${printAll?'<button class="btn secondary" data-action="print">인쇄 / PDF 저장</button>':''}</div></div>
      <p class="case-scope">${E(data().scope)} <span>강의 연결 ${direct}개 · 교재 보충 ${book}개 · 튜터링 기출 보충 ${extra}개</span></p>
      <div class="case-tutoring-entry"><a class="pill" href="#/cases?tutoring=past">튜터링 기출 연결 ${past}개 모아보기 →</a><a class="pill" href="./downloads/cases-tutoring-past.txt" download>기출 연결 정리본 ↓</a></div>
      <details class="case-guide"><summary>수록 범위와 판례를 읽는 방법</summary><p>강의 연결은 전사·상세요약의 설명을 교재와 대조해 식별한 판례입니다. 교수님이 사건번호를 직접 말한 경우에 한정하지 않습니다. 교재 보충은 진도 내에서 같은 쟁점을 이해하는 데 필요한 판례이며, 강의에서 직접 다뤘다고 표시하지 않았습니다. 사건번호를 특정할 근거가 없는 가상사례나 일화는 판례 수에 포함하지 않았습니다.</p><p>튜터링 기출 연결은 2~4회차 자료의 교내 기출문제와 해설을 기준으로 합니다. 자료 작성자가 복기 내용을 정리·변형한 경우를 포함하며, 실제 시험 원문을 별도로 확보한 것은 아닙니다. 사건번호가 없는 해설은 대응하는 법리를 판례와 연결했습니다. 해당 판례가 출제의 원형이거나 시험 당시 인용됐다는 뜻은 아닙니다. 예상문제는 기출과 구별해 표시합니다.</p><p>각 항목의 ‘판단’은 판례의 결론입니다. 변경된 판례, 반대·보충의견, 교재 저자나 교수님의 비판은 ‘구별해서 읽기’에서 따로 확인하세요. 교재 쪽수는 본문 인쇄 쪽수이며 PDF 쪽수는 56을 더합니다. 9월 17일의 시각은 전·후반을 합친 전사본 기준입니다.</p></details>
      ${tutoringIndex(f)}
      <form id="case-filters" class="filters case-filters"><div class="filter case-query"><label for="case-query">판례·쟁점·사건번호</label><input id="case-query" name="query" value="${E(f.query)}" placeholder="예: 추심명령, 2021다252977" autocomplete="off"></div><div class="filter"><label for="case-topic">주제</label><select id="case-topic" name="topic">${option('','전체 주제',f.topic)+topics.map(t=>option(t,t,f.topic)).join('')}</select></div><div class="filter"><label for="case-lecture">수업 날짜</label><select id="case-lecture" name="lecture">${option('','전체 수업',f.lecture)+dates.map(d=>option(d,dateLabel(d)+' 수업',f.lecture)).join('')}</select></div><div class="filter"><label for="case-source">연결 근거</label><select id="case-source" name="source">${option('','전체',f.source)+option('lecture','강의 연결',f.source)+option('textbook','교재 보충',f.source)+option('tutoring','튜터링 기출 보충',f.source)}</select></div><div class="filter"><label for="case-tutoring">튜터링 기출</label><select id="case-tutoring" name="tutoring">${option('','필터 없음',f.tutoring)+option('past','기출 연결 전체',f.tutoring)+[2,3,4].map(n=>option(String(n),n+'회차 기출',f.tutoring)).join('')}</select></div><div class="filter"><label for="case-sort">정렬</label><select id="case-sort" name="sort">${option('','수업 흐름순',f.sort)+option('recent','선고일 최신순',f.sort)+option('title','제목순',f.sort)}</select></div><button class="btn" type="submit">검색</button></form>
      <div class="filter-bar"><a class="pill" href="#/cases">필터 초기화</a><span class="results-count" role="status">${items.length} / ${all.length}개 판례 항목</span></div>
      ${items.length?printAll?`<div class="case-expanded">${items.map(c=>article(c)).join('')}</div>`:`<div class="case-grid">${items.map((c,i)=>`<article class="case-card">${tags(c)}<p class="case-citation">${citation(c)}</p><h2><a href="${E(caseHref(c,back))}">${E(c.title)}</a></h2><p class="case-preview">${E(c.holding)}</p><a class="case-read" href="${E(caseHref(c,back))}" aria-label="${E(c.title)} 사안과 해설 읽기">사안과 해설 읽기 <span aria-hidden="true">→</span></a></article>`).join('')}</div>`:'<div class="empty"><h2>조건에 맞는 판례가 없습니다.</h2><p>검색어를 줄이거나 주제·날짜 필터를 바꿔 보세요.</p><a class="btn secondary" href="#/cases">전체 판례 보기</a></div>'}`;
  }
  function tutoringIndex(f) {
    const questions=(data().tutoringQuestions||[]).filter(q=>q.section==='past'&&(!f.tutoring||f.tutoring==='past'||String(q.session)===f.tutoring));
    if(!questions.length)return '';
    return `<details class="case-guide case-question-index"><summary>기출 ${questions.length}설문 대응표</summary><p>판례가 없는 조문·학설 문제도 남겨 두었습니다. 아래 연결은 튜터링 해설의 법리에 대응하는 학습 자료입니다.</p><div class="table-scroll"><table><thead><tr><th>회차·기출 문항</th><th>검토 쟁점과 연결 판례</th></tr></thead><tbody>${questions.map(q=>`<tr><td>${E(q.session)}회차 · ${E(q.exam)}<br>${E(q.question)}<br><span class="small muted">PDF ${(q.pages||[]).map(E).join(' · ')}쪽</span></td><td><p>${E(q.coverage)}</p><div class="case-question-links">${(q.caseIds||[]).map(id=>entries().find(c=>c.id===id)).filter(Boolean).map(c=>`<a href="${E(caseHref(c))}">${E((c.caseNumbers||[]).join(' · ')||c.title)} →</a>`).join('')||'<span class="muted">조문·학설 중심</span>'}</div></td></tr>`).join('')}</tbody></table></div></details>`;
  }
  const paragraphs=text=>String(text||'').split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${E(p).replace(/\n/g,'<br>')}</p>`).join('');
  function tutoringEvidence(c) {
    const refs=c.tutoringRefs||[];
    if(!refs.length)return '';
    const section=r=>({past:'교내 기출',expected:'예상문제 참고',intro:'자료 도입 설명'}[r.section]||'참고');
    return `<section class="case-tutoring-evidence article-section"><h2>튜터링 문항 연결</h2>${refs.map(r=>`<div class="case-tutoring-ref"><h3>${E(r.session)}회차 · ${E(section(r))} · ${E(r.exam)} ${E(r.question)}</h3><p class="small muted">튜터링 PDF ${(r.pages||[]).map(E).join(' · ')}쪽</p><p><strong>출제·학습 쟁점</strong> ${E(r.issue)}</p>${r.note?`<p class="small">${E(r.note)}</p>`:''}</div>`).join('')}</section>`;
  }
  function article(c) {
    const url=safeOfficial(c.officialUrl),related=(c.relatedTopics||[]).map(id=>(global.COURSE?.topics||[]).find(t=>t.id===id)).filter(Boolean);
    return `<article class="case-article" id="case-${E(c.id)}"><header class="study-head">${tags(c)}<h1>${E(c.title)}</h1><p class="case-citation">${citation(c)}</p></header>
      ${[['사안',c.facts],['쟁점',c.issue],['판단',c.holding],['답안과 복습 포인트',c.studyPoint],['구별해서 읽기',c.distinction]].filter(([,t])=>t).map(([h,t])=>`<section class="article-section"><h2>${h}</h2>${paragraphs(t)}</section>`).join('')}
      ${tutoringEvidence(c)}
      <section class="case-evidence"><h2>강의와 교재 근거</h2>${(c.lectureRefs||[]).length?`<ul>${c.lectureRefs.map(r=>`<li><a href="#/topics?lecture=${E(r.date)}">${E(dateLabel(r.date))} 수업</a>${r.time?' · '+E(r.time):''}${r.note?' · '+E(r.note):''}</li>`).join('')}</ul>`:''}
      <p>${(c.bookPages||[]).length?'교재 제11판 본문 '+E(c.bookPages.join(' · '))+'쪽':'교재 쪽수는 확인된 경우에만 표시합니다.'}</p>
      <p class="small muted">${c.sourceType==='lecture'?'강의 문맥과 교재를 연결하여 사건을 식별했습니다.':c.sourceType==='tutoring'?'튜터링 기출 해설의 쟁점을 보충한 판례입니다. 위 문항 연결에서 대응 근거와 교정 내용을 확인하세요.':'교재 보충 판례입니다. 강의에서 직접 설명한 것으로 표시하지 않았습니다.'} ${c.verification==='official'?'공식 판결문 또는 판례정보와 대조했습니다.':'교재의 판례 설명을 기준으로 정리했습니다.'}</p>
      ${url?`<a class="btn secondary" href="${E(url)}" target="_blank" rel="noopener noreferrer">공식 판례 원문 ↗</a><span class="case-print-url">원문: ${E(url)}</span>`:'<p class="small muted">공식 원문 링크는 확인하지 못했습니다.</p>'}
      ${related.length?`<div class="case-related"><h3>함께 읽을 학습 노트</h3>${related.map(t=>`<a href="#/topic/${encodeURIComponent(t.id)}">${E(t.title)} →</a>`).join('')}</div>`:''}</section></article>`;
  }
  function detail(route) {
    const c=entries().find(c=>c.id===route.id);
    if(!c)return '<div class="empty"><h1>판례를 찾을 수 없습니다.</h1><a class="btn secondary" href="#/cases">판례 목록으로</a></div>';
    const supplied=route.params.get('back')||'',back=/^#\/cases(?:\?|$)/.test(supplied)?supplied:'#/cases';
    const i=entries().indexOf(c),prev=entries()[i-1],next=entries()[i+1];
    return `<div class="breadcrumb"><a href="${E(back)}">← 판례 목록</a><span>/</span><span>${E(c.topic)}</span></div><div class="page-actions case-detail-actions"><button class="btn light" data-action="print">이 판례 인쇄 / PDF 저장</button></div>${article(c)}<nav class="prev-next" aria-label="이전 다음 판례">${prev?`<a href="${E(caseHref(prev,back))}"><small>이전 판례</small>${E(prev.title)}</a>`:'<span></span>'}${next?`<a href="${E(caseHref(next,back))}"><small>다음 판례</small>${E(next.title)}</a>`:''}</nav>`;
  }
  function submit(form) {
    const p=new URLSearchParams();
    for(const key of ['query','topic','lecture','source','tutoring','sort']) {const value=form.elements.namedItem(key)?.value?.trim();if(value)p.set(key,value);}
    const current=new URLSearchParams((global.location.hash.split('?')[1]||''));if(current.get('full')==='1')p.set('full','1');
    global.location.hash='#/cases'+(p.size?'?'+p:'');
  }
  function forTopic(id) {
    const cases=entries().filter(c=>(c.relatedTopics||[]).includes(id));
    if(!cases.length)return '';
    return `<hr class="line"><h3>연결된 판례</h3>${cases.map(c=>`<a href="${E(caseHref(c))}">${E(c.title)} →</a>`).join('')}`;
  }
  if(global.document) {
    global.document.addEventListener('submit',event=>{if(event.target.id==='case-filters'){event.preventDefault();submit(event.target);}});
    global.document.addEventListener('change',event=>{if(event.target.closest?.('#case-filters')&&event.target.tagName==='SELECT')submit(event.target.form);});
    global.document.addEventListener('click',event=>{const b=event.target.closest?.('[data-case-action="full"]');if(!b)return;const p=new URLSearchParams(global.location.hash.split('?')[1]||'');p.has('full')?p.delete('full'):p.set('full','1');global.location.hash='#/cases'+(p.size?'?'+p:'');});
  }
  global.CaseBookUI={list,detail,forTopic,filter,normalize,safeOfficial,count:()=>entries().length};
})(typeof window!=='undefined'?window:globalThis);
