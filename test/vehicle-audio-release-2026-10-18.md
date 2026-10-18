# Recording-specific engine audio, 18 October 2026

## User-facing change

- Home/Chat calls and recorded/uploaded audio in Chat ask which vehicle is actually recorded: the selected Garage car, another vehicle/friend's car/external clip, or unknown. This choice is temporary and never adds/edits a Garage car.
- Known engine, fuel, model-year and engine-code fields are carried with the confirmed recording. Saved nicknames no longer replace the model by accident when explicit make/model fields exist.
- Recording requests disable browser speech noise suppression, echo cancellation and automatic gain control where supported. Physical microphone hardware processing cannot be guaranteed off. Call recording remains a separate raw-audio tool, not ordinary speech-filtered Live input.
- The live tool waits for an explicit Start confirmation, preserves its recording snapshot, discards results on account/selected-vehicle changes, has a bounded request timeout and returns to the existing call without redialling.
- Raw engine sound does not prove a make/model/year, a faulty component, normal engine health or roadworthiness. The interface no longer displays invented diagnosis percentages or an unconditional OK-to-drive verdict.
- New paired assets/service-worker revision prevent silently consuming the old unguarded analysis format. Existing scanner, Garage and repair-proof changes are preserved.

## Verification and limits

- Unit and authenticated route tests cover a user-stated Toyota Fortuner 2013 3.0L D-4D, wrong Honda HR-V output, a friend's car, unknown and legacy contexts, bad audio, missing evidence, context/account changes, transport schemas and codec-bearing data URIs.
- `node test/vehicle-audio-browser.mjs` uses the real ledger/feature/live modules in isolated 320/390/1280px fixtures and a **fake browser microphone**. It checks WAV transport, confirmation, response delivery and layout. The model response/account are synthetic. No actual car sound, personal data, real provider call or account write is involved.
- No neural-network weights were trained, no engine-audio classifier was validated, and no claim of all-model/all-year coverage is made. A real Fortuner recording is still needed to measure the reported failure. Source discovery alone is not audio evaluation.
- The backend evidence register separates official technical education from unverified repair-video candidates; 2018/2019 2GD clips do not establish faults in a 2013 3.0 D-4D. No videos/audio were downloaded, redistributed or admitted as verified acoustic templates.

## Research register

- [Dayco official drive-system noise video page](https://www.dayco.com/na-en/techhub/diagnosing-drive-system-belt-noise/)
- [Dayco official heavy-duty belt-noise training](https://www.dayco.com/na-en/techhub/diagnosing-hd-belt-noise/)
- [DENSO diesel injection technical article](https://www.denso-am.eu/news/denso-injecting-life-into-diesel-technology)
- Full status/applicability register: backend `test/vehicle-audio-sources-2026-10-18.json`.

## Deployment

Publish the backend first, then the paired frontend. Keep existing secrets, account settings and unrelated team changes. Publish only filtered web assets; do not upload QA scripts, source tests, local files or the reference register as static Pages assets. Real-device/model accuracy remains separate from code regression tests.
