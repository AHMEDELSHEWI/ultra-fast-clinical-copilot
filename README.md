# Ultra Fast Clinical Copilot

Current release: **V1.0.6**

V1.0.6 preserves the automatic multilingual dictation and English clinical output introduced in V1.0.5, and adds:

- Exact age calculation in years, months and days after DOB entry.
- Direct age-in-years entry when DOB is unknown.
- Automatic gestational-age calculation from LNMP.
- Sex at birth restricted to Female, Male or Unknown.
- Automatic Pregnancy Status = Not applicable when sex at birth is Male.
- One visible Allergies and reactions field, with the duplicated allergy-status question removed from the workflow.
- Renal, hepatic, cardiac, diabetic and hypertension status fields, all defaulting to Unknown and allowing Known details.
- An AI-assisted relative differential ranking of up to 10 diagnoses: red for higher relative likelihood, yellow for intermediate, and green for lower likelihood. Must-not-miss conditions remain separately flagged.

## Entry points

- `index.html`: current GitHub Pages release, V1.0.6
- `v1.0.6.html`: preserved V1.0.6 entry point
- `v1.0.5.html`: preserved V1.0.5 entry point
- `v1.0.4.html`: preserved V1.0.4 entry point

## Important operating notes

- Open the application over HTTPS in a current Chrome browser and allow microphone access.
- The first voice use downloads the multilingual browser model and can take longer than later uses.
- Differential colours represent relative ranking, not clinical severity or calibrated probability.
- Speech recognition, translation and differential ranking can make clinically important errors. A clinician must review and correct every generated field, diagnosis, number, negation and medication detail before use.
- Do not use this software for real-patient care without institutional clinical, privacy, security, medication, human-factors and regulatory validation.
