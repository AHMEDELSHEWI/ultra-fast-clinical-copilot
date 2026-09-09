nonical:'µmol/L', units:[['µmol/L',1],['mg/dL',88.4]], range:s=>factValue(s?.patient?.sexAtBirth)==='female'?[52.156,91.936]:factValue(s?.patient?.sexAtBirth)==='male'?[65.416,119.34]:[52.156,119.34], decimals:1 },
    { id:'urea', name:'Urea / BUN', group:'Renal', canonical:'mmol/L', units:[['mmol/L urea',1],['mg/dL BUN',0.357]], range:s=>factValue(s?.patient?.sexAtBirth)==='female'?[2.142,7.497]:factValue(s?.patient?.sexAtBirth)==='male'?[2.856,8.568]:[2.142,8.568], decimals:2 },
    { id:'calcium', name:'Calcium', group:'Metabolic', canonical:'mmol/L', units:[['mmol/L',1],['mg/dL',0.25]], range:()=>[2.15,2.5], decimals:2 },
    { id:'phosphate', name:'Phosphate', group:'Metabolic', canonical:'mmol/L', units:[['mmol/L',1],['mg/dL',0.323]], range:()=>[0.8,1.5], decimals:2 },
    { id:'albumin', name:'Albumin', group:'Liver', canonical:'g/L', units:[['g/L',1],['g/dL',10]], range:()=>[35,50], decimals:1 },
    { id:'bilirubin', name:'Total bilirubin', group:'Liver', canonical:'µmol/L', units:[['µmol/L',1],['mg/dL',17.1]], range:()=>[2,20], decimals:1 },
    { id:'alt', name:'ALT', group:'Liver', canonical:'U/L', units:[['U/L',1]], range:()=>[5,30], decimals:0 },
    { id:'ast', name:'AST', group:'Liver', canonical:'U/L', units:[['U/L',1]], range:()=>[5,30], decimals:0 },
    { id:'hemoglobin', name:'Hemoglobin', group:'CBC', canonical:'g/dL', units:[['g/dL',1],['g/L',0.1]], range:s=>factValue(s?.patient?.sexAtBirth)==='female'?[11.6,15.0]:factValue(s?.patient?.sexAtBirth)==='male'?[13.2,16.6]:[11.6,16.6], decimals:1 },
    { id:'wbc', name:'WBC', group:'CBC', canonical:'×10⁹/L', units:[['×10⁹/L',1]], range:()=>[4,11], decimals:1, referenceNote:'Common adult interval; use local laboratory range.' },
    { id:'platelets', name:'Platelets', group:'CBC', canonical:'×10⁹/L', units:[['×10⁹/L',1]], range:()=>[150,400], decimals:0, referenceNote:'Common adult interval; use local laboratory range.' },
    { id:'crp', name:'CRP', group:'Inflammation', canonical:'mg/L', units:[['mg/L',1]], range:()=>[0,5], decimals:1, upperOnly:true },
    { id:'lactate', name:'Lactate', group:'Blood gas', canonical:'mmol/L', units:[['mmol/L',1],['mg/dL',0.111]], range:()=>[0.5,2.2], decimals:2, referenceNote:'Common adult interval; local analyzer range prevails.' },
    { id:'ph', name:'Arterial pH', group:'Blood gas', canonical:'pH', units:[['pH',1]], range:()=>[7.35,7.45], decimals:2 },
    { id:'pco2', name:'Arterial pCO₂', group:'Blood gas', canonical:'mmHg', units:[['mmHg',1],['kPa',7.50062]], range:()=>[35,45], decimals:1 },
    { id:'inr', name:'INR', group:'Coagulation', canonical:'ratio', units:[['ratio',1]], range:()=>[0.8,1.2], decimals:2 },
    { id:'ddimer', name:'D-dimer', group:'Coagulation', canonical:'ng/mL FEU', units:[['ng/mL FEU',1]], range:()=>[0,500], decimals:0, upperOnly:true, referenceNote:'Assay and age-adjustment dependent; use local pathway.' },
    { id:'troponin', name:'High-sensitivity troponin', group:'Cardiac', canonical:'assay unit', units:[['ng/L',1]], range:()=>null, decimals:0, referenceNote:'Use the assay-specific 99th percentile and local pathway.' }
  ];

  const SUGGESTED_TESTS = {
    chest_pain:['troponin','hemoglobin','sodium','potassium','creatinine','glucose'],
    dyspnea:['hemoglobin','wbc','crp','lactate','ph','pco2','ddimer'],
    cough:['wbc','crp','lactate','sodium','creatinine'],
    fever:['wbc','crp','lactate','creatinine','glucose'],
    sepsis_concern:['wbc','crp','lactate','creatinine','bilirubin','platelets'],
    abdominal_pain:['hemoglobin','wbc','crp','creatinine','bilirubin','alt','ast','lactate'],
    vomiting:['sodium','potassium','chloride','bicarbonate','creatinine','glucose'],
    diarrhea:['sodium','potassium','bicarbonate','creatinine','lactate'],
    gi_bleeding:['hemoglobin','platelets','inr','urea','creatinine','lactate'],
    weakness:['glucose','sodium','potassium','calcium','hemoglobin'],
    confusion:['glucose','sodium','calcium','creatinine','lactate'],
    hyperglycemia:['glucose','sodium','potassium','bicarbonate','creatinine','ph'],
    hypoglycemia:['glucose','creatinine','alt','ast'],
    dysuria:['wbc','crp','creatinine','lactate'],
    flank_pain:['creatinine','wbc','crp','lactate'],
    pregnancy_concern:['hemoglobin','platelets','creatinine','alt','ast'],
    vaginal_bleeding:['hemoglobin','platelets','inr'],
    trauma:['hemoglobin','lactate','inr','creatinine','glucose'],
    head_injury:['glucose','sodium','inr','hemoglobin']
  };

  function labById(id) { return 