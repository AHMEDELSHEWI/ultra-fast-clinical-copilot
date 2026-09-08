# Ultra Fast Clinical Copilot

Current release: **V1.0.7**

V1.0.7 preserves automatic multilingual dictation with English clinical output and adds a more precise patient-information and reasoning workflow:

- DOB automatically calculates age in separate years, months and days fields.
- Age in years can be entered directly when DOB is unknown.
- LNMP automatically calculates gestational age in weeks and days.
- Sex at birth is restricted to Female, Male or Unknown.
- Male automatically sets Pregnancy status to Not applicable and disables LNMP/gestation fields.
- Only one visible Allergies and reactions field remains; the duplicated allergy-status question is removed while an internal medication-safety completion value is retained.
- Renal, hepatic, cardiac, diabetic and hypertension status all default to Unknown; Known reveals a details field.
- Negation-aware narrative review avoids treating explicitly denied symptoms as positive complaints.
- Up to 10 differential diagnoses are relatively ranked: red for most likely/highest supported, yellow for probable/intermediate, and green for possible/lower supported. Must-not-miss conditions remain independently flagged.

## Entry points

- `index.html`: redirects to the current release, V1.0.7
- `v1.0.7.html`: preserved V1.0.7 entry point
- `v1.0.6.html`: preserved V1.0.6 entry point
- `v1.0.5.html`: preserved V1.0.5 entry point
- `v1.0.4.html`: preserved V1.0.4 entry point

## Important operating notes

- Open the application over HTTPS in a current Chrome browser and allow microphone access.
- The first voice use downloads the multilingual browser model and can take longer than later uses.
- Differential colours represent relative ranking, not clinical severity or calibrated probability.
- Speech recognition, translation and differential ranking can make clinically important errors. A clinician must review and correct every generated field, diagnosis, number, negation and medication detail before use.
- Do not use this software for real-patient care without institutional clinical, privacy, security, medication, human-factors and regulatory validation.
