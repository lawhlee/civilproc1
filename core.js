(function (root) {
  'use strict';
  const STORE_KEY = 'minso-study-notes.v1';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const emptyState = () => ({version:1,completed:{},favorites:[],records:{},notes:{},sessions:[],lastTopic:null});
  const finite = n => Number.isFinite(n) && n >= 0;
  const object = v => !!v && typeof v === 'object' && !Array.isArray(v);
  function sanitizeState(raw, course, strict=false) {
    if (!object(raw) || raw.version !== 1) { if(strict) throw new Error('이 사이트에서 내보낸 학습 기록 파일을 선택해 주세요.'); return emptyState(); }
    const out=emptyState(), topics=new Set(course.topics.map(t=>t.id)), questions=new Set(course.quizzes.map(q=>q.id));
    if(object(raw.completed)) for(const [id,v] of Object.entries(raw.completed)) if(topics.has(id)&&v) out.completed[id]=typeof v==='string'?v.slice(0,40):true;
    if(Array.isArray(raw.favorites)) out.favorites=[...new Set(raw.favorites.filter(id=>topics.has(id)))];
    if(object(raw.notes)) for(const [id,v] of Object.entries(raw.notes)) if(topics.has(id)&&typeof v==='string') out.notes[id]=v.slice(0,20000);
    if(object(raw.records)) for(const [id,v] of Object.entries(raw.records)) {
      if(!questions.has(id)||!object(v)) continue;
      const attempts=finite(v.attempts)?Math.min(Math.floor(v.attempts),100000):0;
      const correct=finite(v.correct)?Math.min(Math.floor(v.correct),attempts):0;
      out.records[id]={attempts,correct,wrong:attempts-correct,lastCorrect:v.lastCorrect===true,lastAnswer:Number.isInteger(v.lastAnswer)&&v.lastAnswer>=0&&v.lastAnswer<=3?v.lastAnswer:null,at:typeof v.at==='string'?v.at.slice(0,40):'',streak:finite(v.streak)?Math.min(Math.floor(v.streak),correct):0};
    }
    if(Array.isArray(raw.sessions)) out.sessions=raw.sessions.filter(s=>object(s)&&finite(s.total)&&finite(s.correct)&&s.total>0&&s.correct<=s.total&&typeof s.at==='string').slice(-50).map(s=>({at:s.at.slice(0,40),total:Math.floor(s.total),correct:Math.floor(s.correct),seconds:finite(s.seconds)?Math.floor(s.seconds):0}));
    if(topics.has(raw.lastTopic))out.lastTopic=raw.lastTopic;
    return out;
  }
  function chapterList(course) {return [...new Set(course.topics.map(t=>t.chapter))];}
  function filterTopics(course, state, filter={}) {
    const term=String(filter.query||'').trim().toLocaleLowerCase();
    return course.topics.filter(t => (!filter.chapter||t.chapter===filter.chapter)&&(!filter.lecture||t.lectures.includes(filter.lecture))&&(!filter.favorites||state.favorites.includes(t.id))&&(!filter.unread||!state.completed[t.id])&&(!term||[t.title,t.lead,t.chapter,...t.checkpoints,...t.sections.flatMap(s=>[s.title,...s.paragraphs])].join(' ').toLocaleLowerCase().includes(term)));
  }
  function isWrong(record) {return !!record && record.wrong>0 && !record.lastCorrect;}
  function filterQuestions(course,state,filter={}) {
    const topics=new Map(course.topics.map(t=>[t.id,t]));
    return course.quizzes.filter(q=>{
      const t=topics.get(q.topic),r=state.records[q.id];
      return t&&(!filter.chapter||t.chapter===filter.chapter)&&(!filter.lecture||q.lectures.includes(filter.lecture))&&(!filter.type||q.type===filter.type)&&(!filter.level||q.level===filter.level)&&(!filter.topic||q.topic===filter.topic)&&(!filter.ids||filter.ids.includes(q.id))&&(!filter.scope||filter.scope==='all'||filter.scope==='unseen'&&!r?.attempts||filter.scope==='wrong'&&isWrong(r)||filter.scope==='favorites'&&state.favorites.includes(q.topic));
    });
  }
  function shuffle(list, random=Math.random) {const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function recordAnswer(state,question,answer,at=new Date().toISOString()) {
    if(!Number.isInteger(answer)||answer<0||answer>=question.choices.length) throw new Error('잘못된 답안입니다.');
    const prev=state.records[question.id]||{attempts:0,correct:0,wrong:0,streak:0};
    const ok=answer===question.correct;
    state.records[question.id]={attempts:prev.attempts+1,correct:prev.correct+(ok?1:0),wrong:prev.wrong+(ok?0:1),lastCorrect:ok,lastAnswer:answer,at,streak:ok?prev.streak+1:0};
    return ok;
  }
  function stats(course,state) {
    const records=Object.values(state.records),attempts=records.reduce((s,r)=>s+r.attempts,0),correct=records.reduce((s,r)=>s+r.correct,0);
    return {completed:course.topics.filter(t=>state.completed[t.id]).length,favorites:state.favorites.length,answered:records.filter(r=>r.attempts>0).length,attempts,correct,rate:attempts?Math.round(correct/attempts*100):0,wrong:course.quizzes.filter(q=>isWrong(state.records[q.id])).length};
  }
  root.StudyCore={STORE_KEY,escape,emptyState,sanitizeState,chapterList,filterTopics,filterQuestions,isWrong,shuffle,recordAnswer,stats};
})(typeof window==='object'?window:globalThis);
