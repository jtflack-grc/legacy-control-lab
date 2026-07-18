# IBM i audit operations — GRC campaign excerpt

Audit operations on the green screen span change management (PTF), journal retention, and authority ownership — the evidence SOC 2 CC6/CC8 and ISO 27001 auditors expect on IBM i partitions.

WRKPTFGRP cumulative and HIPER group levels are partition evidence for CC8.1 change management — not spreadsheet assertions.

DSPJRN JRN(QSYS/QAUDJRN) proves detect/respond: password, authority failure, and profile-change ENTTYP rows timestamp who did what.

WRKAUTL and DSPAUTL expose authorization-list membership — Clause 6 privacy and CC6.1 least-privilege review on IBM i.

WRKOBJOWN surfaces ownership drift before CHGOBJOWN or EDTOBJAUT remediation — COSO control activity on the green screen.

CHGJRN receiver attributes and retention thresholds belong in the audit baseline; pair journal policy with QAUDCTL/QAUDLVL from DSPSECAUD.

CHGJRN JRN(QSYS/QAUDJRN) documents receiver rotation and retention — CC7.2 monitoring evidence alongside DSPJRN entry review.

Findings need severity plus decision impact — cite WRKPTFGRP, DSPJRN, and authority screens as command/screen evidence.
