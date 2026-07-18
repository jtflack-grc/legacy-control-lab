# i on GRC: ISO 27701, Clause 8 & the IBM i

Operational privacy — object auth, file layout, batch jobs, IFS flows, and audit journal.

Privacy officers ask for data inventories. On IBM i, the inventory starts at DSPFD and DSPFFD, not a cloud console. Clause 8 operational privacy is literally visible in the field list.

ISO 27701 Clause 8: prove you know which native files store personal data before you attest processing controls.

PII processing on IBM i is often batch: nightly close, weekly extracts, IFS exports. WRKJOBSCDE is where those schedules live.

The Clause 8 article names IFS data flows. paymst.sym points at PAYROLL/PAYMST. That is the same file you just reviewed.

Privacy impact: native authority + IFS path + batch export = full data-flow evidence chain.

Audit journal review is the bridge between IT operations and assurance. You are not done when you saw a screen. You ask what got logged when someone changed it.
