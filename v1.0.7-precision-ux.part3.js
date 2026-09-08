    },
    {
      match: /aortic (?:syndrome|dissection|catastrophe)|dissecting aorta/,
      support: [
        [/sudden|abrupt|maximal at onset/, 9, 'abrupt onset'],
        [/tearing|ripping/, 13, 'tearing/ripping pain'],
        [/radiat.{0,30}back|back.{0,30}radiat/, 9, 'radiation to back'],
        [/pulse deficit|unequal blood pressure|bp difference/, 15, 'pulse/BP asymmetry'],
        [/new neurolog|focal deficit|syncope/, 10, 'neurologic/syncope feature']
      ],
      against: [[/gradual|reproducible/, 5, 'gradual/reproducible pain']]
    },
    {
      match: /pericarditis/,
      support: [
        [/pleuritic|worse with breathing/, 8, 'pleuritic pain'],
        [/positional|worse lying|better leaning|leaning forward/, 12, 'positional pain'],
        [/viral|recent infection/, 5, 'recent viral illness'],
        [/diffuse st|pr depression|pericardial rub/, 15, 'supportive ECG/exam feature']
      ],
      against: [[/exertional|radiat.{0,25}(arm|jaw)|crushing/, 8, 'classic ischemic feature']]
    },
    {
      match: /tension pneumothorax|pneumothorax/,
      support: [
        [/sudden.{0,30}(dyspn|chest pain)|(?:dyspn|chest pain).{0,30}sudden/, 9, 'sudden onset'],
        [/unilateral.{0,35}(absent|reduced).{0,25}breath|absent breath sounds/, 15, 'unilateral reduced breath sounds'],
        [/trauma|ventilat|barotrauma/, 7, 'trauma/ventilation risk'],
        [/hypotens|shock|tracheal deviation/, 12, 'tension physiology']
      ],
      against: [[/bilateral equal breath sounds|normal chest exam/, 8, 'normal bilateral breath sounds']]
    },
    {
      match: /heart failure|pulmonary edema|decompensated heart/,
      support: [
        [/orthopn|paroxysmal nocturnal|\bpnd\b/, 10, 'orthopnea/PND'],
        [/peripheral edema|leg swelling|anasarca/, 7, 'peripheral edema'],
        [/weight gain|fluid overload/, 6, 'fluid retention'],
        [/crackle|crepitation|raised jvp|gallop/, 11, 'congestion signs'],
        [/known.{0,25}heart failure|reduced ejection|cardiomyopath/, 10, 'known cardiac dysfunction']
      ],
      against: [[/clear lungs|no edema|normal bnp/, 6, 'absence of congestion']]
    },
    {
      match: /asthma|bronchospasm/,
      support: [
        [/wheeze/, 10, 'wheeze'],
        [/known asthma|history of asthma|inhaler/, 10, 'asthma history'],
        [/trigger|allergen|exercise induced/, 5, 'typical trigger'],
        [/improv.{0,20}(inhaler|bronchodilator)/, 8, 'bronchodilator response']
      ],
      against: [[/stridor|focal crackles|unilateral absent/, 6, 'alternative airway/chest sign']]
    },
    {
      match: /copd/,
      support: [
        [/known copd|history of copd|emphysema/, 12, 'COPD history'],
        [/smok/, 6, 'smoking history'],
        [/wheeze|increased sputum|purulent sputum/, 7, 'obstructive/infective feature'],
        [/hypercap|co2 retention/, 10, 'hypercapnia']
      ],
      against: [[/young non smoker|no smoking history/, 6, 'low COPD prior likelihood']]
    },
    {
      match: /gastro.?oesophageal|reflux|musculoskeletal cause|chest wall/,
      support: [
        [/burning|acid|reflux|regurgitation/, 7, 'reflux features'],
        [/meal|postprandial|lying after food/, 5, 'meal-related symptoms'],
        [/reproducible|tender|movement|twist|strain/, 9, 'reproducible musculoskeletal pain']
      ],
      against: [[/exertional|radiat.{0,25}(arm|jaw)|diaphoresis|syncope/, 8, 'high-risk cardiac feature']]
    },
    {
      match: /subarachnoid hemorrhage/,
      support: [
        [/thunderclap|worst headache|maximum intensity.{0,20}(minute|second)/, 15, 'thunderclap onset'],
        [/neck stiffness|photophobia/, 7, 'meningeal features'],
        [/collapse|syncope|vomit/, 5, 'collapse/vomiting']
      ],
      against: [[/gradual recurrent similar headache/, 7, 'gradual recurrent pattern']]
    },
    {
      match: /meningitis|encephalitis/,
      support: [
        [/fever/, 8, 'fever'], [/neck stiffness|photophobia/, 10, 'meningism'], [/non blanch|purpuric rash/, 12, 'non-blanching rash'], [/confusion|altered mental|seizure/, 9, 'neurologic change']
      ],
      against: [[/alert well afebrile|no meningism/, 7, 'absence of systemic/meningeal features']]
    },
    {
      match: /stroke|intracranial hemorrhage/,
      support: [
        [/focal|unilateral weakness|facial droop|aphasia|dysarthria|visual loss/, 13, 'focal neurologic deficit'],
        [/sudden|last known well/, 8, 'acute onset/time'],
        [/anticoagul|severe hypertension|headache/, 5, 'hemorrhagic/stroke risk feature']
      ],
      against: [[/normal neurolog|no focal deficit/, 8, 'normal neurologic assessment']]
    },
    {
      match: /appendicitis/,
      support: [
        [/right lower|\brlq\b|mcburney/, 11, 'right lower-quadrant pain'],
        [/migrat.{0,25}(right lower|rlq)|periumbilical.{0,25}right lower/, 10, 'migratory pain'],
        [/anorexia|nausea|vomit/, 5, 'GI association'], [/fever|guarding|rebound/, 7, 'inflammatory/peritoneal feature']
      ],
      against: [[/diarrhea predominant|left lower/, 5, 'alternative localization/pattern']]
    },
    {
      match: /biliary|cholecystitis/,
      support: [
        [/right upper|\bruq\b/, 11, 'right upper-quadrant pain'], [/meal|fatty food|postprandial/, 5, 'meal association'], [/murphy|fever|jaundice/, 8, 'biliary inflammatory feature']
      ],
      against: [[/right lower|left lower/, 5, 'alternative localization']]
    },
    {
      match: /pancreatitis/,
      support: [
        [/epigastr/, 8, 'epigastric pain'], [/radiat.{0,30}back|back.{0,30}radiat/, 7, 'radiation to back'], [/alcohol|gallstone/, 6, 'risk factor'], [/lipase|amylase/, 12, 'supportive laboratory finding']
      ],
      against: [[/right lower|reproducible abdominal wall/, 5, 'alternative pattern']]
    },
    {
      match: /ectopic pregnancy/,
      support: [
        [/pregnan|positive pregnancy|missed period|amenorrhea/, 12, 'pregnancy possibility'], [/vaginal bleeding/, 9, 'vaginal bleeding'], [/pelvic|lower abdominal/, 7, 'pelvic/lower abdominal pain'], [/syncope|shoulder tip|hypotens/, 10, 'rupture/bleeding feature']
      ],
      against: [[/male|not pregnant|negative pregnancy/, 20, 'pregnancy excluded/not applicable']]
    },
    {
      match: /sepsis|septic shock/,
      support: [
        [/fever|hypotherm|rigor/, 7, 'temperature/infective feature'], [/hypotens|shock|lactate/, 10, 'circulatory dysfunction'], [/confusion|altered mental/, 7, 'mental-status change'], [/infection|source|purulent/, 6, 'suspected infection']
      ],
      against: [[/well appearing|no infection|afebrile/, 5, 'low infective evidence']]
    },
    {
      match: /gastroenteritis/,
      support: [[/diarrh/, 10, 'diarrhea'], [/vomit/, 8, 'vomiting'], [/sick contact|outbreak|shared meal/, 6, 'exposure'], [/abdominal cramp/, 5, 'cramping pain']]
    },
    {
      match: /renal colic|ureteric stone/,
      support: [[/flank|loin/, 9, 'flank/loin pain'], [/hematur|blood in urine/, 8, 'hematuria'], [/colic|groin/, 7, 'colicky/groin radiation']]
    },
    {
      match: /pyelonephritis/,
      support: [[/flank|loin/, 7, 'flank pain'], [/fever|rigor/, 9, 'fever/rigors'], [/dysuria|frequency|urinary/, 8, 'urinary symptoms'], [/vomit/, 4, 'vomiting']]
    },
    {
      match: /anaphylaxis/,
      support: [[/allerg|exposure|sting|drug/, 6, 'allergen exposure'], [/wheeze|stridor|airway|tongue swelling/, 12, 'airway/respiratory involvement'], [/urticaria|hives|rash/, 7, 'cutaneous involvement'], [/hypotens|collapse/, 10, 'circulatory involvement']]
    }
  ].map(profile => ({
    ...profile,
    support: (profile.support || []).map(([pattern, weight, label]) => ({ pattern, weight, label })),
    against: (profile.against || []).map(([pattern, weight, label]) => ({ pattern, weight, label }))
  }));

  function primaryComplaintId(snap) {
    const active = Array.isArray(snap?.complaints)
      ? snap.complaints.filter(item => item && item.status !== 'invalidated' && item.status !== 'inactive')
      : [];
    return active.find(item => item.primary)?.id || active[0]?.id || '';
  }

  function rankDifferentialsV107(snap) {
    const suggestions = Array.isArray(snap?.reasoning?.suggestions) ? snap.reasoning.suggestions : [];
    const values = [];
    flattenClinicalValues({
      patient: snap?.patient,
      presentationText: snap?.presentationText,
      history: snap?.history,
      reviewOfSystems: snap?.reviewOfSystems,
      exam: snap?.exam,
      vitals: snap?.vitals,
      labs: snap?.labs,
      investigations: snap?.investigations
    }, values);
    const clinicalText = normalizeClinicalText(values.join('. '));
    const primary = primaryComplaintId(snap);
    const activeComplaintIds = new Set((snap?.complaints || []).filter(item => item?.status !== 'invalidated' && item?.status !== 'inactive').map(item => item.id));

    const ranked = suggestions.map((item, sourceIndex) => {
      const labelText = normalizeClinicalText(item.label);
      let score = item.type === 'alternative' ? 46 : 36;
      let positiveCount = 0;
      let negativeCount = 0;
      const evidence = [];

      if (item.complaintId === primary) {
        score += 14;
        evidence.push(tr('linked to primary complaint', 'مرتبط بالشكوى الرئيسية'));
      } else if (activeComplaintIds.has(item.complaintId)) {
        score += 7;
        evidence.push(tr('linked to active complaint', 'مرتبط بشكوى نشطة'));
      }

      const profile = DIFFERENTIAL_PROFILES.find(candidate => candidate.match.test(labelText));
      if (profile) {
        profile.support.forEach(feature => {
          const result = featureContribution(clinicalText, feature, 'support');
          score += result.score;
          if (result.score > 0) positiveCount += 1;
          if (result.score < 0) negativeCount += 1;
          if (result.evidence) evidence.push(result.evidence);
        });
        profile.against.forEach(feature => {
          const result = featureContribution(clinicalText, feature, 'against');
          score += result.score;
          if (result.score < 0) negativeCount += 1;
          if (result.evidence) evidence.push(result.evidence);
        });
      } else {
        const labelTokens = labelText.split(' ').filter(token => token.length >= 5 && !['acute', 'syndrome', 'disease', 'concern', 'cause'].includes(token));
        const matched = labelTokens.filter(token => clinicalText.includes(token)).slice(0, 3);
        if (matched.length) {
          score += matched.length * 5;
          positiveCount += matched.length;
          evidence.push(tr('documented terminology match', 'تطابق مع مصطلحات موثقة'));
        }
      }

