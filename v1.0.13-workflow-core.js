/* V1.0.13. Deterministic review and documentation; not a generative AI model. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.UFCWorkflow = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = '1.0.13';
  const HEADINGS = Object.freeze(['Chief Complaints','History of Present Illness','Past History','Physical Examination','General Examination','Latest Vital Signs','Local Examination','Primary Diagnosis','Secondary Diagnosis','Management and Plan']);
  const EXCLUDED = new Set(['invalidated','inactive','resolved','historical','rejected']);
  const SAFETY_IDS = Object.freeze(['q_immediate_resuscitation','q_consciousness_avpu','q_airway_compromise','q_major_active_bleeding','q_new_confusion']);
  const MED_FIELDS = Object.freeze([
    ['name','Drug name'], ['indication','Indication / when to use'], ['initialDose','Initial dose'], ['route','Route'],
    ['frequency','Frequency / dosing interval'], ['target','Target / therapeutic endpoint'], ['titration','Titration'],
    ['maximumDose','Maximum dose'], ['duration','Duration / stopping rule'], ['comorbidityAdjustment','Dose in comorbidities'],
    ['safety','Side effects & contraindications'], ['adverseEffectManagement','Management of important side effects']
  ]);
  const CAPABILITIES = Object.freeze([
    {id:'review',name:'Local multi-complaint review',state:'engineering_candidate',scope:'Versioned presentation-linked checklist, not probability estimation or diagnosis.'},
    {id:'documentation',name:'Ten-section documentation',state:'engineering_candidate',scope:'Confirmed recorded facts only. Unknown is not normal or absent.'},
    {id:'ai',name:'Generative clinical AI',state:'not_connected',scope:'No model inference, token streaming or grounded RAG implemented in this release.'},
    {id:'voice',name:'Ambient transcription',state:'not_validated',scope:'Legacy source preserved. Activation blocked in this candidate pending audio and device validation.'},
    {id:'ehr',name:'EHR read/write',state:'not_connected',scope:'No live hospital connector, orders or prescriptions.'},
    {id:'release',name:'Patient-care deployment',state:'no_go',scope:'Institutional clinical, privacy, security and device validation required.'}
  ]);
  const exists = v => v !== null && v !== undefined && v !== '';
  const active = x => !!x && typeof x === 'object' && !EXCLUDED.has(x.status);
  const verified = x => active(x) && x.clinicianConfirmed === true;
  const value = f => verified(f) && Object.prototype.hasOwnProperty.call(f,'value') ? f.value : null;
  const text = v => v === true ? 'Yes' : v === false ? 'No' : Array.isArray(v) ? v.map(text).join(', ') : exists(v) ? String(v) : '';
  const records = x => Array.isArray(x) ? x.filter(verified) : [];
  const facts = x => Object.entries(x || {}).filter(([,v])=>value(v)!==null);
  const label = k => String(k).replace(/_/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2');
  const canonical = o => JSON.stringify(o, function (_,v) {
    if(v && !Array.isArray(v) && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]]));
    return v;
  });
  function clinicalProjection(s) {
    const result={id:s.id};
    ['patient','presentationText','complaints','history','reviewOfSystems','exam','vitals','gcs','labs','investigations','treatments','medications','procedures','reassessments','consultations','diagnoses','disposition','followUp','safetyNetting','noteFields'].forEach(k=>{result[k]=s[k]??null;});
    return result;
  }
  const contextKey = s => canonical(clinicalProjection(s)); // Full canonical equality, not a collision-prone hash.
  function reviewItems(s, content) {
    const key=contextKey(s), grouped=new Map();
    records(s.complaints).forEach(c=>{
      const entry=(content.complaints||[]).find(x=>x.id===c.id); if(!entry) return;
      [['mustNotMiss','Must not miss'],['importantAlternatives','Alternative to review']].forEach(([field,kind])=>{
        (entry[field]||[]).forEach(name=>{
          const id=field+':'+name.toLowerCase().trim();
          if(!grouped.has(id)) grouped.set(id,{id,name,kind,complaintIds:[],evidenceIds:[],contentVersion:content.version||'unknown',state:'suggested',contextKey:key});
          const p=grouped.get(id); p.complaintIds.push(c.id); p.evidenceIds.push(...(entry.evidenceIds||[]));
        });
      });
    });
    return [...grouped.values()].map(p=>{
      p.evidenceIds=[...new Set(p.evidenceIds)];
      const ev=(s.workflowEvents||[]).filter(e=>e.kind==='review'&&e.caseId===s.id&&e.proposalId===p.id&&e.contextKey===key).at(-1);
      if(ev) p.state=ev.action==='keep'?'kept_for_review':ev.action==='dismiss'?'dismissed':'suggested';
      return p;
    });
  }
  function reviewEvent(s, p, action, meta={}) {
    if(!['keep','dismiss','reset'].includes(action)) throw Error('Unsupported review action.');
    if(s.status==='final') throw Error('Finalized encounters are read-only. Use an addendum.');
    if(!p || p.contextKey!==contextKey(s)) throw Error('The clinical context changed. Review the refreshed item.');
    return {id:meta.id||('review-'+(globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random())),kind:'review',caseId:s.id,proposalId:p.id,action,contextKey:p.contextKey,contentVersion:p.contentVersion,recordedAt:meta.recordedAt||new Date().toISOString(),actor:'local-clinician'};
  }
  function safety(s,content) {
    const rows=SAFETY_IDS.map(id=>{
      const q=(content.questions||[]).find(x=>x.id===id);
      const f=q ? s[q.container||'history']?.[q.semanticKey||q.id] : null;
      const v=value(f); const valid=q && (q.options||[]).some(o=>o.value===v);
      return {id,question:q,value:valid?v:null,danger:valid&&(v===true||['V','P','U'].includes(v)),recordedAt:valid?f.recordedAt:null};
    });
    return {rows,complete:rows.every(r=>r.value!==null),danger:rows.some(r=>r.danger),answered:rows.filter(r=>r.value!==null).length};
  }
  function medicationLines(m) {
    const normalized=Object.assign({},m,{initialDose:m.initialDose??m.dose,maximumDose:m.maximumDose??m.maxDose,comorbidityAdjustment:m.comorbidityAdjustment??m.renalHepaticAdjustment,safety:m.safety??m.safetyNotes});
    return MED_FIELDS.filter(([k])=>exists(normalized[k])).map(([k,l])=>l+': '+text(normalized[k]));
  }
  function makeSection(title,lines) { return {title,lines:lines.filter(exists),text:title+'\n'+(lines.filter(exists).join('\n')||'Not documented')}; }
  function buildDocumentation(s,content={}) {
    if(s.status==='final'&&s.finalDocument?.version===VERSION) return JSON.parse(JSON.stringify(s.finalDocument.document));
    const buckets=Array.from({length:10},()=>[]),p=s.patient||{},nf=s.noteFields||{};
    records(s.complaints).forEach(c=>buckets[0].push(c.label||c.name||c.id));
    ['localIdentifier','nameOrInitials','ageExact','ageYears','ageMonths','dateOfBirth','sexAtBirth','pregnancyStatus','weightKg'].forEach(k=>{
      if(k==='ageYears'&&value(p.ageExact)!==null) return;
      if(k==='ageMonths'&&(value(p.ageExact)!==null||value(p.ageYears)!==null)) return;
      if(value(p[k])!==null) buckets[1].push(label(k)+': '+text(value(p[k])));
    });
    if(value(s.presentationText)!==null) buckets[1].push('Recorded presenting narrative: '+text(value(s.presentationText)));
    const past=/^(past_medical_history|past_surgical_history|family_history|social_history|current_medications|allergies|drug_history)$/;
    facts(s.history).forEach(([k,f])=>{const q=(content.questions||[]).find(q=>(q.semanticKey||q.id)===k);buckets[past.test(k)?2:1].push((q?.text||label(k))+': '+text(value(f)));});
    facts(s.reviewOfSystems).forEach(([k,f])=>buckets[1].push('Review of systems — '+label(k)+': '+text(value(f))));
    ['allergiesKnown','allergies','renalStatus','hepaticStatus','cardiacStatus','diabeticStatus','hypertensionStatus'].forEach(k=>{if(value(p[k])!==null)buckets[2].push(label(k)+': '+text(value(p[k])));});
    const general=new Set(['general_appearance','airway_compromise','major_active_bleeding','consciousness_avpu','new_confusion']);
    facts(s.exam).forEach(([k,f])=>{const q=(content.questions||[]).find(q=>(q.semanticKey||q.id)===k);const n=k==='local_examination'?6:general.has(k)?4:3;buckets[n].push((q?.text||label(k))+': '+text(value(f)));});
    [['physicalExamination',3],['generalExamination',4],['localExamination',6]].forEach(([k,n])=>{if(value(nf[k])!==null)buckets[n].push(text(value(nf[k])));});
    const units={sbp:'mmHg',dbp:'mmHg',hr:'bpm',rr:'/min',spo2:'%',temperature:'°C',painScore:'/10',oxygenDevice:'',oxygenFlow:'L/min',fio2:'',glucoseMgDl:'mg/dL'};
    facts(s.vitals).forEach(([k,f])=>buckets[5].push(label(k)+': '+text(value(f))+(units[k]?' '+units[k]:'')+(f.recordedAt?' (recorded '+f.recordedAt+')':'')));
    const sbp=value(s.vitals?.sbp),dbp=value(s.vitals?.dbp);
    if(typeof sbp==='number'&&typeof dbp==='number'&&sbp>dbp&&dbp>0)buckets[5].push('Calculated MAP: '+Math.round(((sbp+2*dbp)/3)*10)/10+' mmHg');
    const g=['eye','verbal','motor'].map(k=>value(s.gcs?.[k]));
    if(g.every((v,i)=>Number.isInteger(v)&&v>=1&&v<=[4,5,6][i]))buckets[5].push('GCS: E'+g[0]+' V'+g[1]+' M'+g[2]+' = '+g.reduce((a,b)=>a+b,0)+'/15');
    const dx=records(s.diagnoses),primary=value(nf.primaryDiagnosisId);
    const primaryRecord=primary?dx.find(d=>d.id===primary):dx.find(d=>d.primary===true);
    if(primaryRecord)buckets[7].push(primaryRecord.label+(primaryRecord.note?'. '+primaryRecord.note:''));
    dx.filter(d=>d!==primaryRecord).forEach(d=>buckets[8].push((d.secondary===true?'':'Other confirmed diagnosis; role not designated: ')+d.label+(d.note?'. '+d.note:'')));
    const plan=buckets[9];
    const investigations=records(s.investigations);
    if(investigations.length){
      plan.push('Investigations'); investigations.forEach(i=>plan.push(i.name));
      const results=investigations.filter(i=>exists(i.result));
      if(results.length){plan.push('Recorded investigation results');results.forEach(i=>plan.push(i.name+': '+text(i.result)+(i.unit?' '+i.unit:'')));}
      const rationales=investigations.filter(i=>exists(i.clinicalRationale||i.indication));
      if(rationales.length){plan.push('Patient-specific clinical reasoning');rationales.forEach(i=>plan.push(i.name+': '+(i.clinicalRationale||i.indication)));}
    }
    facts(s.labs).forEach(([k,f])=>plan.push('Recorded laboratory result: '+label(k)+': '+text(value(f))+(f.unit?' '+f.unit:'')));
    records(s.treatments).forEach(r=>plan.push('Treatment record: '+r.name+(r.details?': '+r.details:'')));
    records(s.medications).filter(m=>m.verified===true&&m.status==='confirmed'&&!(m.validationErrors||[]).length).forEach(m=>{plan.push('Medication record (administration is not inferred)');plan.push(...medicationLines(m));});
    records(s.procedures).forEach(r=>{
      const performed=r.performedConfirmed===true&&r.procedureStatus==='done';
      const state=performed?'Performed, clinician-confirmed':r.procedureStatus==='required'?'Planned / required':'Performance status not verified';
      plan.push('Procedure: '+r.name+' ['+state+']');
      [['indication','Indication'],['consent','Consent'],['technique','Technique'],['findings','Findings'],['outcome','Outcome'],['complications','Complications'],['postProcedurePlan','Post-procedure plan']].forEach(([k,l])=>{if(exists(r[k]))plan.push(l+': '+r[k]);});
    });
    records(s.reassessments).forEach(r=>plan.push('Recorded reassessment: '+[r.recordedAt,r.response,r.details,r.findings,r.plan].filter(exists).join('; ')));
    records(s.consultations).forEach(r=>plan.push('Consultation record: '+[r.specialty,r.reason,r.clinicalQuestion,r.requestedAction,r.outcome].filter(exists).join('; ')));
    if(verified(s.disposition))plan.push('Recorded disposition: '+[s.disposition.destination,s.disposition.rationale,s.disposition.statusLabel].filter(exists).join('; '));
    if(verified(s.followUp))plan.push('Follow-up: '+text(s.followUp.details));
    if(verified(s.safetyNetting))plan.push('Safety netting: '+text(s.safetyNetting.details));
    [['assessment','Clinical assessment'],['managementPlan','Management plan'],['capacityConsent','Capacity, consent or informed refusal'],['communication','Patient / family communication'],['handover','Escalation / handover'],['resultsFollowup','Results follow-up responsibility'],['deteriorationTimeline','Deterioration / resuscitation timeline']].forEach(([k,l])=>{if(value(nf[k])!==null)plan.push(l+': '+text(value(nf[k])));});
    const sections=HEADINGS.map((h,i)=>makeSection(h,buckets[i]));
    const complete=sections.map((s,i)=>(i+1)+'. '+s.text).join('\n\n');
    return {version:VERSION,language:'en',sections,sectionMap:Object.fromEntries(sections.map(s=>[s.title,s.text])),mcchis:{text:complete},consultantSummary:{text:complete},icdSuggestions:[],complete};
  }
  function documentGaps(s) {
    const gaps=[];
    records(s.investigations).forEach(i=>{if(!exists(i.clinicalRationale||i.indication))gaps.push({kind:'investigation_rationale',id:i.id,message:'Record the patient-specific indication for '+i.name+'.'});});
    records(s.medications).forEach(m=>{if(m.verified!==true||m.status!=='confirmed'||(m.validationErrors||[]).length)gaps.push({kind:'medication_verification',id:m.id,message:'Medication '+(m.name||m.id)+' is not verified; it is omitted from the active medication note.'});});
    records(s.procedures).forEach(i=>{if(!exists(i.indication))gaps.push({kind:'procedure_rationale',id:i.id,message:'Record the patient-specific indication for '+i.name+'.'});if(i.procedureStatus==='done'&&i.performedConfirmed!==true)gaps.push({kind:'procedure_status',id:i.id,message:'Confirm actual performance of '+i.name+'; a legacy Done label is insufficient.'});});
    return gaps;
  }
  return Object.freeze({VERSION,HEADINGS,MED_FIELDS,SAFETY_IDS,CAPABILITIES,active,verified,value,records,canonical,contextKey,reviewItems,reviewEvent,safety,medicationLines,buildDocumentation,documentGaps});
});
