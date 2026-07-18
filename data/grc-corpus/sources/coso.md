# Frameworks: COSO & the IBM i

Source: https://www.linkedin.com/pulse/frameworks-coso-ibm-i-john-flack-dcrne

# Frameworks: COSO & the IBM i

Or, when the "System of Record" Becomes the Control Environment

Framing it out . . .

After spending quite a few months walking through ISO standards and the IBM i, it’s time to widen the aperture on things just a bit.

Don't get me wrong, ISO still matters: ISO 27001 gave us a way to talk about security governance, 42001 gave us a way to talk about AI management systems, 27701 to consider privacy governance, and 31000 gave us risk language.

GRC, of course, doesn't just speak in ISO standards.

If you spend any time around internal audit, SOX, finance, enterprise risk, control testing, or board-level assurance, another name shows up:

COSO.

The "

Committee of Sponsoring Organizations of the Treadway Commission

" (a mouthful to say, happy the acronym took hold) created one of the dominant frameworks for thinking about internal control.

Its Internal Control-Integrated Framework isn't limited to just cybersecurity, privacy, or technical compliance.

In short, it asks: does your organization have enough confidence in its operations, reporting, and compliance activities to rely on them?

COSO's "confidence" here isn't just asking whether a system is secure, but whether the organization can trust the processes, data, controls, people, and reporting that support its objectives.

That makes your IBM i pretty hard to ignore, since in a lot of orgs, the IBM i is not just a platform sitting in the corner doing midrange kind of things for midrange people . . .instead, it's where billing, payroll, and claims process. It's also where orders are fulfilled, reports are generated, transactions are posted, and the business proves whether its internal control environment is "real-real".

So, if we're going to talk about COSO and internal control, we have to talk about the systems that actually execute the business process.

If your IBM i supports those processes, stores the data behind them, or produces evidence used by management and audit (and of course it does; you wouldn't have read this far otherwise), then it's not just infrastructure, but part of the control environment.

So, this is where the next phase of

i on GRC

begins. Not with another clause-by-clause world tour, but instead:

What happens when major governance frameworks finally meet the system of record?

COSO, briefly (without turning this into a CPA exam review)

COSO’s Internal Control, Integrated Framework is built around five components: control environment, risk assessment, control activities, information and communication, and monitoring activities.

Now, I could spend this article reciting COSO principles one by one, and then you'd close this tab and go do something much more rewarding with your morning.

So . . . let’s not do that.

Instead, let’s figure out what those five components really mean when they touch an IBM i environment that supports critical business processes.

If your platform supports the objective, stores the evidence, or executes the process, then it belongs in the COSO conversation. Not as folklore, or as “legacy", but as part of the control system itself.

Control Environment: Who owns the control reality?

The COSO control environment is the foundation: it's the tone, structure, accountability, competence, authority, and ethical posture that shapes how internal control functions across the organization.

In "corporate speak", this often becomes a vanilla conversation about leadership, organizational charts, policies, committees, risk owners, and control owners (which does matter).

But in your IBM i environment, the control environment also shows up in the way authority is assigned, who owns objects, who can change user profiles, who can alter batch processing, who can grant access, and who understands the applications that actually drive reporting and operations, and that's where the pretty GRC picture can start to get uncomfortable.

Here's an example: if a revenue process depends on an IBM i application, who is the control owner?

Is it finance, because the process affects financial reporting? Is it operations, because the process runs the business? Is it IT, because the platform executes the logic? Is it the IBM i administrator, because they can technically change authorities? Or, is it the application owner, assuming one is still clearly documented?

COSO doesn't let that ambiguity sit.

The control environment depends on clearly established authority and responsibility, so this means on your IBM i that the organization needs to distinguish between technical control and business accountability.

DSPUSRPRF can tell you a bunch about user profiles and special authorities. WRKOBJOWN can tell you who owns objects. DSPAUT can tell you who has authority to specific objects. Authorization lists (AUTL) can show how access is grouped and managed.

That's low hanging fruit; however, none of those commands can tell you whether the organization has made the right governance decision.

They show what's configured, but don't say "this configuration is accountable".

Special authorities make this point even clearer: *ALLOBJ, *SECADM, *JOBCTL, and *SPLCTL are not just technical privileges. In a COSO frame, they are concentrations of control power, as a profile with broad authority may be able to affect data, jobs, reports, output queues, security configuration, and operational processing in ways that matter to internal control.

A strong control environment doesn't care about whether the system is old, stable, or understood by a small group of people . . it's asking who has those authorities, why they have them, who approved them, when they were last reviewed, what business processes they could affect, and what would happen if they were misused, compromised, or simply misunderstood.

So, COSO thinking applied to IBM i isn't saying “are we secure enough?", but "does the way we assign authority support a reliable control environment?, and that's much deeper than just your security hygiene, as it reaches into accountability:

If a critical application library has no current business owner, the control environment is weaker than the uptime report suggests.

If powerful profiles exist because no one wants to break a job, the control environment is making an undocumented risk decision.

And, if developers, operators, administrators, and business owners all assume someone else owns the control, then COSO has already found the gap.

The IBM i may be running beautifully, but the control environment may still be under-governed.

Risk Assessment: What can threaten the objective?

COSO’s risk assessment component asks whether your organization identifies and analyzes risks to achieving its objectives, or "what could prevent the organization from achieving reliable operations, reporting, and compliance?".

Hint: the risk conversation for your IBM i should not begin with someone asking “is the box old?” but, instead, "which business objectives depend on this system, and what could cause those objectives to fail?".

If the IBM i supports billing, then inaccurate batch processing is not just an IT issue, since it can affect revenue, customer trust, reporting accuracy, and contractual obligations.

If the IBM i supports claims adjudication, then access control, processing integrity, job scheduling, and interface reliability become internal control topics.

If the IBM i feeds financial reporting, then object authority, program change, data completeness, reconciliation, and batch exception handling allllll become COSO-relevant.

If the IBM i is the system of record for customer or employee data, then privacy, retention, disclosure, access, and, yes, even backup practices are now all part of the broader control picture.

Risk assessment in this environment requires the organization to understand the actual dependency chain: which applications are critical, and which libraries support them? Which interfaces move data in or out? Which jobs run the daily process? Which profiles can alter data, programs, or control files? Which reports are relied on by management? Which downstream systems assume IBM i data is complete and accurate?

As usual, your IBM i gives you a lot to work with: WRKJOBSCDE (or your enterprise job scheduler like Tidal or ROBOT) can surface scheduled jobs that drive recurring business processes.

DSPUSRPRF and QSYS2.USER_INFO can support profile analysis, and QSYS2.OBJECT_PRIVILEGES can bring object authority review into a SQL-friendly format.

Your audit journals (QAUDJRN) when configured properly, gives security and access activity that can support monitoring and investigation.

The point is to connect those artifacts to business risk, as a risk assessment that says “legacy platform risk” is not good enough.

That is a simple, dismissive label, not actual analysis.

A stronger risk statement sounds more like the following:

“If access to the billing adjustment file is not restricted to authorized roles, unauthorized or erroneous changes could affect invoice accuracy, customer balances, and financial reporting.”

“If the nightly claims export job fails without timely detection, downstream systems may process incomplete data, causing delayed adjudication, incorrect reporting, or customer service impacts.”

“If IBM i restore procedures are not tested against defined recovery objectives, the organization may be unable to recover critical transaction processing within the required business timeframe.”

Now we're gone from abstract IT risks to organizational objectives.

That's the COSO move: it takes IBM i out of the “old platform” conversation and puts it where it belongs . . .inside the business risk conversation.

Control Activities: Where IBM i gets very "real-real", very fast

Control activities are the policies, procedures, approvals, reconciliations, verification, restrictions, and safeguards that help ensure management’s directives are carried out.

This is where your IBM i folks should feel right at home.

For all the mythology and "scary black box" around the platform, IBM i is concrete about control surfaces: authority is explicit, objects have owners, journals have entries. Backups either exist or they don't; restores have either been tested or they haven't.

And while the platform isn't vague, the governance around it sometimes is.

A COSO control activity on IBM i might involve logical access to a financial application, enforced through group profiles and authorization lists. Authorization lists are especially useful because they allow teams to group objects with similar security requirements and manage access more consistently. If every sensitive object has a different "hand-maintained" (raise your hand if you've done this as an IBM i admin) authority pattern, the control is harder to operate, harder to review, and easier to misunderstand.

To make that less abstract, think about the control activities IBM i already supports every day:

Control activity and reviewing special authorities

: for users who support production applications. The presence of *ALLOBJ or *SECADM doesn't automatically mean a control failure exists, but it does mean the organization needs justification, approval, monitoring, and periodic review.

Control activity and change management

: if a program update affects billing logic, claims adjudication, inventory valuation, or a regulatory report, the change should be authorized, tested, approved, and traceable. Whether the organization uses Aldon, TurnOver, Implementer, Jira, ServiceNow, or something much less elegant than anyone wants to admit, COSO does not care about the logo. It cares whether the control activity actually supports reliable change.

Control activity and batch monitoring

: if a scheduled job updates account balances, posts transactions, exports claims, generates invoices, or produces management reports, the organization should know whether that job completed, failed, ran late, produced exceptions, or required manual intervention. WRKJOBSCDE can help identify scheduled jobs, but the control activity is not the command itself. The control activity is the review, exception handling, ownership, and follow-up around the process.

Control activity and output management

: spool files are not just “reports.” If they contain payroll, claims, customer statements, invoices, or exception listings, they may contain sensitive or control-relevant data. *SPLCTL, output queue authority, report distribution, and spool retention can all become part of the control conversation.

Control activity and backup and recovery:

BRMS, save strategies, journal receiver management, media handling, replication, and restore testing are not just IT continuity topics if the business objective depends on recoverable IBM i processing. If operations, reporting, or compliance objectives depend on IBM i availability and recoverability, then backup and restore practices are control activities.

Let's take this last one a step further, instead of "Do you back this up?", we move to the second level of "What objective does the backup support? What systems and data are included? Who reviews completion? When was the restore tested? Were the exceptions resolved? Does the recovery evidence align with the business objective/SLA?"

That is where those control activities get their fangs to make an actual difference.

Not in the existence of a command, process, or tool, but in whether the control is designed and operating in a way that supports the objective.

Information and Communication: Evidence has to leave the platform

The next level, with COSO’s information and communication component, is where a lot of IBM i control programs stall.

The system produces evidence, the platform team understands the evidence, the auditors request said evidence once a year . . .but does the evidence reach the people who need it, in a form they can understand and use?

The IBM i can produce a

ton

of output: DSPUSRPRF, DSPAUT, WRKOBJOWN, DSPJRN, DSPAUDJRNE, WRKJOBSCDE, DSPSYSVAL, BRMS reports, job logs, spool listings, and SQL service queries can generate evidence all day long.

That still doesn't mean the organization has effective information and communication.

COSO isn't satisfied by information existing "somewhere": information must be relevant, timely, reliable, and communicated to the right people.

For IBM i, that often requires translation (hey, that's the whole point of this entire "i on GRC" series from the very start, right?).

Your CIO doesn't want a raw dump of every profile with every authority, but they

need a summary showing privileged access trends, exceptions, owner attestations, and unresolved risks.

Your internal auditor may not need to understand every journal entry type, but they

need a clear mapping between audit objective, evidence source, review procedure, sample, finding, and disposition.

A business owner doesn't need to know the difference between object authority and data authority at a command-reference level, but they need to understand that their application library contains regulated data and that they are accountable for who can access it.

This is where GRC Engineering (hello,

GRC Engineering Club

!) becomes useful.

(. . .

not

because dashboards are magical fixes, as Goodhart’s Law remains undefeated, but because repeatable evidence flows help translate "platform truth" into "governance information".

A query against QSYS2.OBJECT_PRIVILEGES can become an access review packet. QAUDJRN review through DSPJRN or QSYS2.DISPLAY_JOURNAL can become a monitoring report. A WRKJOBSCDE review can become a batch ownership register. BRMS reporting can become recoverability evidence. Output queue reviews can become confidentiality and reporting-control evidence.

The native artifact is just the beginning: the communication layer is what turns it into control intelligence.

This matters especially when IBM i is treated as a "black box" by people outside the platform team (note: a "black box" is not a technical condition, it's usually a communication failure).

Systems aren't usually unknowable . . .they just haven't been translated. COSO gives you a big reason to make that translation formal.

Monitoring Activities: Stop admiring the control . . . and test it!

Monitoring activities are how the organization determines whether internal control is present and functioning over time.

This is where the IBM i should be a gift to governance teams.

The platform can produce durable, reviewable evidence, but monitoring requires more than occasional output during audit season. It asks whether controls are evaluated at the right frequency, whether deficiencies are identified, whether they are communicated, and whether corrective action happens.

On your IBM i, monitoring can take several forms: privileged access can be reviewed monthly or quarterly through DSPUSRPRF output, QSYS2.USER_INFO, or other repeatable extracts. Object authority for sensitive libraries can be reviewed through DSPAUT or QSYS2.OBJECT_PRIVILEGES. Audit journal activity can be reviewed using DSPJRN, CPYAUDJRNE, DSPAUDJRNE, or QSYS2.DISPLAY_JOURNAL. Job schedules can be reviewed for ownership, business purpose, run frequency, and exception handling. BRMS completion and restore-test evidence can be reviewed against recovery objectives. Change records can be sampled to confirm authorization, testing, approval, implementation, and backout planning. Spool and output queue access can be reviewed where reports contain sensitive or financially relevant information.

Monitoring is where COSO catches the gap between your design and actual reality.

A control may be beautifully written and poorly operated, or an access review may exist but never challenge stale authority. Your job monitoring process may confirm completion but ignore data quality or exception handling. Backup reports may show saves completed while no one can produce recent restore evidence. And a journal (QAUDJRN) review may be performed but never escalated when it finds repeated authority failures.

That's ritual, not monitoring.

Monitoring has to create actual (not a "sense of" movement): findings should be assigned, repeat issues should trigger root cause analysis, your management should see unresolved risks, and your internal audit team should be able to trace whether corrective actions were completed.

(If you think about it, this is the bridge from your ISO 27701, Clause 10 work directly into COSO).

It sounds simple to say, but control systems don't end up maturing because someone finds issues, but because someone

fixes

the conditions that keep producing the issues.

COSO and the IBM i evidence binder

So what would I want to see if I were looking at IBM i through a COSO lens?

Not a vendor portal or a 566-page policy library that says “controls are reviewed periodically” and wears everyone down with death by documentation.

All we need here is evidence that connects business objectives to platform controls.

If IBM i supports billing, we'll want to see who owns the billing application, which libraries and files support it, which profiles can change data or programs, what jobs process invoices, what exception reports are generated, how changes are approved, how access is reviewed, and how failed or abnormal processing is escalated.

If IBM i supports payroll, we'll want to see access controls over payroll files, privileged access justification, output queue controls over payroll reports, job schedule monitoring, retention practices, and evidence that payroll processing exceptions are reviewed.

If IBM i supports claims processing, we'll want to see controls over claims data, batch adjudication jobs, interface transfers, exception handling, downstream reconciliations, access reviews, and audit trail coverage.

And, if your IBM i supports financial reporting, we'll need to find change controls over reporting logic, data completeness checks, reconciliation evidence, ownership of report-producing jobs, and access controls over both source data and report outputs.

Some evidence will come from native IBM i commands and services:

DSPUSRPRF for user profile review.

DSPAUT for object authority.

WRKOBJOWN for ownership.

WRKAUTL or DSPAUTL for authorization list review.

DSPJRN, CPYAUDJRNE, or QSYS2.DISPLAY_JOURNAL for audit activity.

DSPSYSVAL for security-relevant system values.

WRKJOBSCDE for scheduled jobs.

BRMS reports for backup and recovery management.

DSPPGMREF where program-to-file relationships matter.

IFS authority reviews where extracts, reports, or transfer files are staged.

Some evidence will live outside the system:

Change tickets (Jira, ServiceNow, etc.)

Access approvals (likewise)

Business owner attestations.

Risk acceptance records.

Incident records.

Reconciliation sign-offs.

Management review minutes.

Internal audit workpapers.

Corrective action tracking.

While COSO doesn't require everything to live in one place, it does ask that the control system make sense.

The evidence should show a chain:

Objective --> Risk --> Control --> Owner --> Evidence --> Review --> Deficiency --> Corrective Action -->Monitoring.

If that chain breaks at the IBM i because “only one person understands it,” then the control environment has a giant dependency problem.

If that chain excludes the IBM i because “it is just the backend,” then the control narrative has a massive scope problem.

If that chain relies entirely on screenshots and tribal memory, then the monitoring model has a major sustainability problem.

. . .and if no one knows whether IBM i evidence supports the business objective at all, then the organization does not have a technology problem, but an internal control problem.

The common failure mode: treating IBM i as infrastructure only

This is where COSO adds something useful and new to the IBM i conversation: quite a few frameworks let organizations hide inside technical language, where they can talk about access control, logging, vulnerability management, encryption, incident response, and recovery.

COSO pulls the conversation back toward the business.

What objective does this control support? What risk does it address? Who owns it? How does management know it is working? What happens when it fails?

That is a much harder set of questions for IBM i environments because the platform often sits underneath business processes that leadership relies on but does not fully understand, and how the system becomes simultaneously critical

and

under-discussed in a shop.

COSO should make that uncomfortable: if your IBM i supports operations, reporting, or compliance objectives, then it belongs in the control system.

Internal control follows the business process, and the business process often runs straight through IBM i.

The Governance Takeaway . . .

COSO and the IBM i belong in the same conversations because internal control isn't an abstraction, but structure that gives leadership confidence that operations are reliable, reporting is trustworthy, and compliance obligations are being met.

For organizations running IBM i, that confidence often depends on a platform many leaders rarely discuss in those specific terms.

That's gotta change.

The system already gives you control surfaces: user profiles, object authorities, authorization lists, audit journals, job schedules, output queues, save strategies, change records, and ownership structures.

COSO gives you the governance question:

Are those control surfaces aligned with the business objectives they support?

Frameworks meet the IBM i because the platform is where the framework has to prove itself, and if your internal control story can't explain your "system of record", then your internal control story is incomplete.
