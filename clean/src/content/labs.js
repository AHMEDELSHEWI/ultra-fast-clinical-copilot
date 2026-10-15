// Laboratory test catalogue (names only — no reference ranges: ranges are laboratory-specific).
// Written for this app from standard test names (LOINC is licence-gated and is not bundled).
const L = (cat, ...names) => names.map((n) => ({ cat, name: n }));

export const LABS = Object.freeze([
  ...L('Haematology', 'Full blood count (FBC / CBC)', 'Haemoglobin', 'White cell count with differential', 'Platelet count', 'Haematocrit', 'Mean cell volume (MCV)', 'Reticulocyte count',
    'Blood film', 'Erythrocyte sedimentation rate (ESR)', 'Sickle cell screen', 'Haemoglobin electrophoresis', 'G6PD assay', 'Malaria smear', 'Malaria rapid antigen test', 'Direct antiglobulin test (Coombs)',
    'Haptoglobin', 'Lactate dehydrogenase (LDH)', 'Ferritin', 'Serum iron and TIBC', 'Vitamin B12', 'Folate'),
  ...L('Coagulation', 'Prothrombin time / INR', 'Activated partial thromboplastin time (aPTT)', 'Fibrinogen', 'D-dimer', 'Thrombin time', 'Anti-Xa level', 'Mixing study',
    'Viscoelastic testing (TEG / ROTEM)', 'Bleeding time', 'Factor VIII level', 'Von Willebrand panel'),
  ...L('Blood bank', 'Group and screen', 'Crossmatch', 'Kleihauer–Betke test', 'Massive transfusion pack request'),
  ...L('Renal and electrolytes', 'Urea and electrolytes (U&E)', 'Sodium', 'Potassium', 'Chloride', 'Bicarbonate', 'Urea / BUN', 'Creatinine', 'Estimated GFR',
    'Calcium', 'Ionised calcium', 'Magnesium', 'Phosphate', 'Uric acid', 'Serum osmolality', 'Urine osmolality', 'Urine sodium', 'Urine potassium', 'Cystatin C'),
  ...L('Liver and pancreas', 'Liver function tests (LFT)', 'ALT', 'AST', 'Alkaline phosphatase', 'Gamma-GT', 'Total bilirubin', 'Conjugated bilirubin', 'Albumin', 'Total protein',
    'Lipase', 'Amylase', 'Ammonia'),
  ...L('Cardiac', 'High-sensitivity troponin', 'Troponin (repeat / delta)', 'Creatine kinase (CK)', 'CK-MB', 'BNP', 'NT-proBNP'),
  ...L('Blood gases and metabolic', 'Arterial blood gas', 'Venous blood gas', 'Lactate', 'Capillary blood glucose', 'Plasma glucose', 'HbA1c', 'Blood ketones (beta-hydroxybutyrate)',
    'Carboxyhaemoglobin', 'Methaemoglobin', 'Osmolar gap', 'Anion gap'),
  ...L('Inflammation and infection', 'C-reactive protein (CRP)', 'Procalcitonin', 'Blood cultures', 'Blood cultures (two sets)', 'Urine culture', 'Sputum culture', 'Wound swab culture',
    'Throat swab', 'Stool culture', 'Stool ova and parasites', 'Clostridioides difficile toxin', 'Respiratory viral PCR panel', 'SARS-CoV-2 PCR', 'Influenza A/B test', 'RSV test',
    'Streptococcal rapid antigen test', 'Monospot / EBV serology', 'HIV antigen/antibody test', 'Hepatitis B surface antigen', 'Hepatitis C antibody', 'Syphilis serology',
    'Chlamydia / gonorrhoea NAAT', 'Brucella serology', 'Typhoid serology / culture', 'Dengue NS1 / serology', 'Legionella urinary antigen', 'Pneumococcal urinary antigen',
    'Fungal cultures', 'Beta-D-glucan', 'Galactomannan', 'Tuberculosis (IGRA)', 'Sputum AFB smear and culture', 'Tuberculosis PCR (GeneXpert)'),
  ...L('Endocrine', 'TSH', 'Free T4', 'Free T3', 'Cortisol (random)', 'ACTH', 'Serum beta-hCG (quantitative)', 'Urine pregnancy test', 'Prolactin', 'Parathyroid hormone', 'Vitamin D', 'Insulin', 'C-peptide'),
  ...L('Lipids', 'Lipid profile', 'Triglycerides'),
  ...L('Urine', 'Urinalysis (dipstick)', 'Urine microscopy', 'Urine albumin/creatinine ratio', 'Urine protein/creatinine ratio', 'Urine myoglobin', 'Urine drug screen', 'Urine porphobilinogen'),
  ...L('Cerebrospinal fluid', 'CSF cell count and differential', 'CSF protein', 'CSF glucose (with paired serum glucose)', 'CSF Gram stain and culture', 'CSF viral PCR panel', 'CSF xanthochromia', 'CSF opening pressure'),
  ...L('Body fluids', 'Pleural fluid analysis', 'Ascitic fluid analysis (cell count, albumin, culture)', 'Synovial fluid analysis (cell count, crystals, culture)'),
  ...L('Toxicology and drug levels', 'Paracetamol (acetaminophen) level', 'Salicylate level', 'Ethanol level', 'Digoxin level', 'Lithium level', 'Phenytoin level', 'Valproate level',
    'Carbamazepine level', 'Theophylline level', 'Iron level (toxicology)', 'Vancomycin level', 'Gentamicin level', 'Toxic alcohols (methanol / ethylene glycol)', 'Cholinesterase activity', 'Heavy metal screen'),
  ...L('Immunology', 'Antinuclear antibody (ANA)', 'Anti-dsDNA', 'Rheumatoid factor', 'Anti-CCP', 'ANCA', 'Complement C3 / C4', 'Serum tryptase', 'Immunoglobulins', 'Serum protein electrophoresis', 'Anti-tissue transglutaminase'),
  ...L('Tumour markers', 'PSA', 'CEA', 'CA-125', 'CA 19-9', 'Alpha-fetoprotein'),
  ...L('Bedside', '12-lead ECG', 'Repeat ECG', 'Continuous cardiac monitoring', 'Pulse oximetry', 'Capnography', 'Peak expiratory flow', 'Bladder scan', 'Point-of-care ultrasound (POCUS)',
    'FAST scan', 'eFAST scan', 'Lung ultrasound', 'Focused echocardiography', 'Aorta ultrasound', 'DVT ultrasound (2-point compression)', 'Ocular ultrasound (optic nerve sheath)',
    'Gastric aspirate pH', 'Orthostatic vital signs', 'Visual acuity', 'Fluorescein eye stain', 'Intraocular pressure'),
]);

export const LAB_COUNT = LABS.length;
