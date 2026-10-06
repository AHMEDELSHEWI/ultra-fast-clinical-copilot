/* V1.0.13: validated operations on the existing encounter store. */
(function () {
  'use strict';
  const C=globalThis.ClinicalCore, W=globalThis.UFCWorkflow;
  if(!C||!W) throw Error('V1.0.13 clinical store dependencies are missing.');
  const proto=C.ClinicalCaseStore.prototype;
  const mutators=['setFact','answerQuestion','invalidateFact','invalidateRecord','addComplaint','setPrimaryComplaint','removeComplaint','setVital','setGcs','addInvestigation','updateInvestigation','addTreatment','addMedication','addProcedure','addReassessment','addConsultation','setDisposition','clearDisposition','setFollowUp','clearFollowUp','setSafetyNetting','clearSafetyNetting','addDiagnosis','confirmDiagnosis','rejectReasoningSuggestion','restoreVersion','addTimelineEvent','setMode'];
  mutators.forEach(name=>{
    const original=proto[name]; if(typeof original!=='function')return;
    proto[name]=function(...args){if(this.caseData.status==='final')throw Error('This finalized encounter is read-only. Record an addendum or start a new encounter.');return original.apply(this,args);};
  });
  const originalFinalize=proto.finalize;
  proto.finalize=function(){
    if(this.caseData.status==='final')return {ready:false,blockers:['Encounter already finalized; original note preserved.'],statusLabel:'READ ONLY'};
    const gaps=W.documentGaps(this.caseData);
    if(gaps.length)return {ready:false,blockers:gaps.map(g=>g.message),statusLabel:'REVIEW REQUIRED'};
    const draft=W.buildDocumentation(this.caseData,this.content);
    const result=originalFinalize.call(this);
    if(result.ready){this.caseData.finalDocument={version:W.VERSION,document:draft,recordedAt:this.caseData.finalizedAt};this.emit({type:'final_document_preserved'});}
    return result;
  };
  proto.recordReview=function(proposalId,action,expectedContext){
    const s=this.getSnapshot();
    if(expectedContext!==W.contextKey(s))throw Error('Clinical context changed. Review the refreshed item.');
    const p=W.reviewItems(s,this.content).find(x=>x.id===proposalId);
    if(!p)throw Error('Review item is no longer applicable.');
    const event=W.reviewEvent(s,p,action);
    const events=this.caseData.workflowEvents||(this.caseData.workflowEvents=[]);
    const previous=events.filter(e=>e.kind==='review'&&e.proposalId===proposalId&&e.contextKey===expectedContext).at(-1);
    if(previous?.action===action)return previous;
    events.push(event);
    this.caseData.auditTrail.push({id:event.id+'-audit',timestamp:event.recordedAt,actor:event.actor,action:'review_'+action,path:'workflowEvents.'+event.id,previousValue:null,newValue:JSON.parse(JSON.stringify(event)),reason:'Checklist review only; not a diagnosis or order.'});
    this.recompute('workflow_review');return event;
  };
  const noteNames=new Set(['physicalExamination','generalExamination','localExamination','primaryDiagnosisId','assessment','managementPlan','capacityConsent','communication','handover','resultsFollowup','deteriorationTimeline']);
  proto.recordNoteField=function(name,input){
    if(!noteNames.has(name))throw Error('Unsupported documentation field.');
    if(typeof input!=='string'||input.length>12000)throw Error('Documentation field must contain at most 12,000 characters.');
    const body=input.trim();
    if(name==='primaryDiagnosisId'&&body&&!W.records(this.caseData.diagnoses).some(d=>d.id===body))throw Error('Select a current clinician-confirmed diagnosis.');
    if(!body){if(this.caseData.noteFields?.[name])this.invalidateFact('noteFields.'+name,'Cleared explicitly by clinician.');return;}
    return this.setFact('noteFields.'+name,body,{clinicianConfirmed:true,sourceLabel:'Clinician-entered V1.0.13 documentation'});
  };
  proto.confirmProcedurePerformed=function(id){
    if(this.caseData.status==='final')throw Error('Finalized encounters are read-only.');
    const record=this.caseData.procedures.find(r=>r.id===id&&W.active(r));
    if(!record)throw Error('Procedure not found.');
    const previous=JSON.parse(JSON.stringify(record)),at=new Date().toISOString();
    Object.assign(record,{procedureStatus:'done',performedConfirmed:true,performanceConfirmedAt:at,clinicianConfirmed:true});
    this.caseData.auditTrail.push({id:'procedure-confirm-'+C.uuid('event'),timestamp:at,actor:'local-clinician',action:'confirm_actual_procedure_performance',path:'procedures.'+id,previousValue:previous,newValue:JSON.parse(JSON.stringify(record)),reason:'Explicit clinician confirmation. Confirmation time is not procedure performance time.'});
    this.recompute('procedure_performance_confirmed');return record;
  };
  proto.recordAddendum=function(body,reason){
    if(this.caseData.status!=='final')throw Error('Addenda are for finalized encounters; edit the draft instead.');
    if(typeof body!=='string'||typeof reason!=='string'||!body.trim()||!reason.trim()||body.length>12000||reason.length>1000)throw Error('An addendum requires text and a reason within the size limits.');
    const event={id:C.uuid('addendum'),kind:'addendum',caseId:this.caseData.id,body:body.trim(),reason:reason.trim(),recordedAt:new Date().toISOString(),actor:'local-clinician'};
    (this.caseData.workflowEvents||(this.caseData.workflowEvents=[])).push(event);
    this.caseData.auditTrail.push({id:event.id+'-audit',timestamp:event.recordedAt,actor:event.actor,action:'append_addendum',path:'workflowEvents.'+event.id,previousValue:null,newValue:JSON.parse(JSON.stringify(event)),reason:event.reason});
    this.caseData.updatedAt=event.recordedAt;this.emit({type:'addendum_recorded'});return event;
  };
})();
