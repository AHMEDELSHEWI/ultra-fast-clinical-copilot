'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist','v1.0.13');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const source='index-ultra-fast-clinical-copilot.html';
const scriptTag=s=>'<script>\n'+s.replace(/<\/script/gi,'<\\/script')+'\n</script>';
const scripts=h=>[...h.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(m=>m[1]);
function replaceOnce(h,a,b,label){if(h.split(a).length!==2)throw Error('Build contract failed: '+label);return h.replace(a,b);}
async function build(){
  // Apply the current shared loader's mandatory schema corrections at build time,
  // rather than repeating the broken V1.0.12/V11/V10/V9 runtime loader chain.
  let html;
  const sandbox={fetch:async file=>{if(!file.startsWith('./'+source))throw Error('Unexpected build input '+file);return{ok:true,text:async()=>read(source)};},document:{open(){},write(s){html=s;},close(){},getElementById(){return null;}},console};
  const loader=scripts(read('v1.0.8.html')).at(-1);
  await vm.runInNewContext(loader,sandbox,{timeout:5000});
  if(!html||!html.includes('ageExact'))throw Error('Preserved baseline integration failed.');
  html=html.replace(/<script src="\.\/v1\.0\.[^>]*><\/script>/g,'');
  html=html.replace(/const APP_VERSION = '[^']+';/,"const APP_VERSION = '1.0.13';");
  html=html.replace(/<title>[\s\S]*?<\/title>/,'<title>ULTRA-FAST CLINICAL AI COPILOT V1.0.13 | Engineering Candidate</title>');
  const guard="\n    if (!globalThis.UFCWorkflow) throw new Error('Documentation safety module missing.');\n    return globalThis.UFCWorkflow.buildDocumentation(caseData, content);\n";
  html=replaceOnce(html,'  function buildDocumentation(caseData, content, language) {','  function buildDocumentation(caseData, content, language) {'+guard,'ten-section grounded documentation');
  for(const fn of ['buildReferral','buildDischarge'])html=replaceOnce(html,'  function '+fn+'(caseData, content, language) {','  function '+fn+'(caseData, content, language) {'+guard,'grounded '+fn).replace('return globalThis.UFCWorkflow.buildDocumentation(caseData, content);\n\n    const docs', 'return globalThis.UFCWorkflow.buildDocumentation(caseData, content).complete;\n\n    const docs');
  // Preserve referral/discharge string contracts explicitly.
  html=html.replace(/(function build(?:Referral|Discharge)\(caseData, content, language\) \{[\s\S]*?return globalThis\.UFCWorkflow\.buildDocumentation\(caseData, content\))\;/g,'$1.complete;');
  html=replaceOnce(html,'      focusPendingTarget();','      focusPendingTarget();\n      document.dispatchEvent(new CustomEvent("ufc:rendered"));','explicit render lifecycle');
  const api=`\n        currentRoute: function () { return appState.route; },
        answerSafety: function (id, value) { const q=(Content.questions||[]).find(x=>x.id===id); if (!globalThis.UFCWorkflow.SAFETY_IDS.includes(id)||!q||!q.options.some(o=>o.value===value)) throw Error('Invalid safety answer.'); return appState.store.answerQuestion(id,value,{clinicianConfirmed:true,sourceLabel:'V1.0.13 clinician safety check'}); },
        review: function (id, action, context) { return appState.store.recordReview(id,action,context); },
        recordNoteField: function (name, text) { return appState.store.recordNoteField(name,text); },
        recordInvestigationRationale: function (id, text) { if(typeof text!=='string'||!text.trim()||text.length>8000)throw Error('Record a patient-specific clinical indication.'); return appState.store.updateInvestigation(id,{clinicalRationale:text.trim()}); },
        confirmProcedurePerformed: function(id) { return appState.store.confirmProcedurePerformed(id); },
        recordAddendum: function(body,reason) { return appState.store.recordAddendum(body,reason); },
`;
  html=replaceOnce(html,'        contentVersion: Content.version,','        contentVersion: Content.version,'+api,'validated single-store adapter');
  html=replaceOnce(html,'  function startVoiceInput() {',"  function startVoiceInput() { showToast('warning','Voice not validated','Use synthetic typed input in V1.0.13.'); return;",'voice disabled at entry point');
  // The old service worker is absent. The candidate is one self-contained file.
  html=html.replace("if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {","if (false) { /* V1.0.13 has no background service-worker registration. */");
  html=html.replace("postProcedurePlan: data.postProcedurePlan, procedureStatus: data.procedureStatus || 'done', clinicianConfirmed: true","postProcedurePlan: data.postProcedurePlan, procedureStatus: data.procedureStatus || 'unspecified', performedConfirmed: false, clinicianConfirmed: true");
  html=html.replace('Automatic multilingual speech is converted into English on this device; clinician review and deterministic extraction remain local.','Local deterministic extraction requires clinician review. Voice is not validated in this candidate.');
  const coreEnd=html.indexOf('</script>');
  if(coreEnd<0)throw Error('Core script boundary missing.');
  html=html.slice(0,coreEnd+9)+scriptTag(read('v1.0.13-store-guard.js'))+html.slice(coreEnd+9);
  html=html.replace('</head>',scriptTag(read('v1.0.13-workflow-core.js'))+'</head>');
  // Retain V6/V7 approved age, allergy and pregnancy UX; replace their DOM observers
  // with the explicit render event, eliminating self-triggered redraws.
  let ux6=read('v1.0.6-clinical-ux.js').replace('  function renderDifferentials() {','  function renderDifferentials() { return; /* Unvalidated likelihood ranking quarantined. */');
  ux6=ux6.replace(/  const observer = new MutationObserver\(\(\) => \{ installPatientEnhancements\(\); hideDuplicateAllergyQuestions\(\); renderDifferentials\(\); \}\);\s*observer.observe\([^\n]+\);/,"  document.addEventListener('ufc:rendered', () => { installPatientEnhancements(); hideDuplicateAllergyQuestions(); renderDifferentials(); });");
  let ux7=[1,2,3,4].map(n=>read('v1.0.7-precision-ux.part'+n+'.js')).join('\n').replace('  function enhanceDifferential() {','  function enhanceDifferential() { return; /* Unvalidated likelihood ranking quarantined. */');
  ux7=ux7.replace(/  const observer = new MutationObserver\(\(\) => \{([\s\S]*?)\n  \}\);\s*observer.observe\([^\n]+\);/,"  document.addEventListener('ufc:rendered', () => {$1\n  });");
  if(/MutationObserver/.test(ux6+ux7))throw Error('Unconverted legacy DOM observer.');
  html=html.replace('</body>',scriptTag(ux6)+scriptTag(ux7)+scriptTag(read('v1.0.13-command-center.js'))+'</body>');
  scripts(html).forEach((s,i)=>new vm.Script(s,{filename:'candidate-inline-'+i+'.js'}));
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'index.html'),html);
  fs.writeFileSync(path.join(out,'ULTRA_FAST_CLINICAL_COPILOT_V1.0.13.html'),html);
  const manifest={product:'ULTRA-FAST INTELLIGENT CLINICAL AI COPILOT',version:'1.0.13',status:'engineering_candidate',patientCare:'NO_GO',baselineCommit:'778d44bc8305ff288737254e2958b4b370451fa8',baselineSha256:sha(read(source)),build:{runtimeLoaderFetches:0,inlineScripts:scripts(html).length,bytes:Buffer.byteLength(html)},artifactSha256:sha(html),externalAI:'not_connected',ehr:'not_connected',voice:'not_validated'};
  fs.writeFileSync(path.join(out,'release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify(manifest,null,2));
}
build().catch(e=>{console.error(e);process.exitCode=1;});
