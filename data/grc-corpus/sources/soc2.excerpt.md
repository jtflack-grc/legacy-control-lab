# SOC 2 & the IBM i

Source: https://www.linkedin.com/pulse/soc-2-ibm-i-john-flack-0bj8e

# SOC 2 & the IBM i

Or, When the System Description Forgets the System of Record

Framing it out . . .

In the last article, we looked at COSO and the IBM i, and the argument there was pretty straightforward: if the IBM i supports the business process, stores the evidence, or produces the reporting, then it's not just infrastructure, but part of the control environment.

That was the internal-control conversation, so . . .now we move to the external-assurance conversation.

SOC 2.

COSO questions whether leadership can trust the control environment, but SOC 2 is about whether customers, business partners, auditors, and other interested parties can rely on the controls around a service organization’s system.

Let's sit with that for a second.

SOC 2 is often treated in the market like a badge, a procurement checkbox, or one more artifact to throw into a vendor portal so everyone can stop asking security questions for a while. But a SOC 2 report is not magic confetti sprinkled over a SaaS product . . .done well, it's a structured attestation report around a system, its service commitments, its system requirements, and the controls designed and operated to meet those commitments.

Note: the word “system” is doing a lot of work here.

Your SOC 2 report is not supposed to describe only the shiny front end, the customer portal, the cloud dashboard, or the tool the buyer sees, but the relevant "system": infrastructure, software, people, procedures, and data. That means the system description has to follow the real service boundary, not the marketing boundary.

And that is where your IBM i gets interesting.

In most organizations, the customer-facing service may look modern enough; there's a web portal, APIs, ticketing workflows, cloud-hosted dashboards, integrations, support teams, and all the expected language around security, availability, confidentiality, and privacy.

But behind that service, somewhere in the transaction path, sits an IBM i.

It may adjudicate claims, post invoices, validate eligibility, or run the nightly batch process that decides whether downstream systems receive complete and accurate data. It might even produce the report that management relies on, the file that your customers consume, or the evidence that your auditors request.

So, if we are going to talk about SOC 2 and trust, we have to ask a very direct question:

What happens when the SOC 2 system description forgets the system of record?

Not “can IBM i be part of SOC 2?” (of course it can).

The direct question is whether the report, scope, controls, and evidence honestly describe the system that customers are actually relying on.

SOC 2 isn't a "certificate", and the system description isn't a filler

Let’s start first by clearing away one of the biggest misconceptions.

SOC 2 is often casually described as a "certification", but it's not that at all . . it's an attestation report. That may sound like word-polishing from the outside, but the distinction matters because a certificate suggests a static credential, while an attestation report is tied to a described system, selected Trust Services Categories, management’s assertion, a reporting period, controls, tests, and results.

(Note: this is also why SOC 2s are heavily dependent on the quality of the firm or auditor performing them. There has been a lot of back-scratching around "pay us this, and we'll pass you along" in this space. That's unfortunate, but it has to be mentioned. Take time to find a quality auditor, or reap the eventual consequences of trying to exaggerate your way through one of these).

Also, as an FYI: a SOC 2 Type I report looks at design at a point in time, but a SOC 2 Type II report looks at design and operating effectiveness over a period of time.

That operating period is where the real action is, because the auditor is not just asking whether a control exists in theory: they're testing whether controls operated over the review period to provide reasonable assurance that the service commitments and system requirements were achieved.

That's why the system description matters so much.

If the system description is thin, vague, or conveniently modernized to describe only the polished parts of the stack, the rest of the report inherits that weakness. The controls may be well-written, and the tests may be formally worded. But if the actual processing platform is sitting outside the narrative without a clear scoping rationale, the trust story becomes incomplete.

With your IBM i environments, this isn't hypothetical:

A SOC 2 report might describe a claims portal, customer support workflow, cloud infrastructure, identity provider, monitoring tools, ticketing system, and incident management process while barely mentioning the IBM i that actually processes the claim.

Or it might discuss database controls in terms of “production databases” while failing to explain that the production database is DB2 for i, sitting behind RPG, CL, SQL routines, scheduled jobs, IFS exports, and spooled reports.

That's not just a documentation miss, but a big ol' system description problem.

SOC 2 begins with the "described system", so if the description does not accurately explain the relevant system, the reader may misunderstand what was actually covered, what was tested, what was assumed, and what responsibilities remain with user entities or "subservice" organizations.

And if your IBM i is the system of record, the description has to say so.

Where IBM i enters the SOC 2 conversation

The IBM i can enter a SOC 2 report in several ways, depending on the service being provided:

Sometimes it's directly inside the service organization’s system boundary. This is the cleanest case. The platform processes customer transactions, stores customer data, runs production workloads, or supports commitments that are directly covered by the report.

In other cases, you're part of a supporting internal environment. It may not be the customer-facing application, but it may still support the service through billing, eligibility, customer data management, reporting, file generation, or downstream processing.

Another way is to be tied to complementary user entity controls; for example, a customer may submit input files, review output reports, reconcile exception files, maintain its own user access, or validate downstream processing. Those responsibilities need to be described because the service organization’s controls may only achieve the service commitments if the customer performs its part.

And, yes, IBM i can depend on carved-out "subservice organizations", as the platform may live in a co-location facility, rely on a managed services provider, use a third-party managed file transfer service, depend on backup media handling, replicate to a DR provider, or send logs to a cloud SIEM. Those organizations may need to be described as such if their controls are assumed in the design of the service organization’s controls.

The trick isn't to force IBM i into SOC 2 scope where it does not belong, but to stop pretending it's not relevant when the service depends on it.

A properly scoped SOC 2 report (remember, find a reputable auditing source) should make the boundary clear: if IBM i is included, describe it, and if it's excluded, explain why the service commitments

don't

depend on it. If it's a subservice or user-entity dependency, describe that relationship . . and if it supports processing integrity, availability, confidentiality, or privacy, say

how

The unacceptable, pat, hand-wavy answer is the one we see too often in real environments: “legacy backend.”

That isn't a system description, but someone who is doing performative, lazy scoping and doing you absolutely no favors on your SOC 2.

The Trust Services Categories through an IBM i lens

SOC 2 reports are organized around the "Trust Services Criteria", with categories selected based on the service organization’s commitments and system requirements. Security is foundational, while availability, processing integrity, confidentiality, and privacy may be included when relevant.

On your IBM system, the interesting part is that all five can matter, but not in the same way!

Security

is usually the easiest category to recognize. On IBM i, that means user profiles, group profiles, special authorities, object authority, authorization lists, password system values, audit configuration, remote access, privileged activity, and logical access review.

Availability

is also natural. IBM i often supports high-availability expectations, batch windows, recovery objectives, backups, replication, disaster recovery, and restore testing. If the service commitment includes availability, the IBM i recoverability story needs to be more than “we back it up every night.”

Confidentiality

comes into play when customer confidential information lives in DB2 for i tables, IFS directories, reports, output queues, save files, backup media, replicated environments, or outbound transmission files.

Privacy

becomes relevant when the system stores or processes personal information and the service organization makes commitments around collection, use, retention, disclosure, disposal, or data subject obligations (this is where the ISO 27701 work we just finished a series on here becomes useful background).

The particular thing I want to stop and emphasize for IBM i is processing integrity,as that's where the platform’s role becomes especially hard for anyone to hand-wave.

Processing integrity is concerned with whether system processing is complete, valid, accurate, timely, and authorized. For a platform that has spent decades running batch jobs, transaction processing, billing logic, claims adjudication, file generation, and operational reporting, that category is not an afterthought.

That may be the IBM i’s strongest SOC 2 story, because the

platform

often runs the

process

Security: Access control is not just the IAM dashboard

Most SOC 2 discussions around access control drift toward modern identity tooling very quickly: SSO, MFA, identity providers, HRIS-driven provisioning, privileged access management, conditional access, and cloud role assignment.

All useful of course, but if the IBM i is in scope, the SOC 2 access-control story can't stop at the IAM dashboard.

IBM i has its own authority model, where user profiles define identities and attributes. Group profiles grant inherited access. Special authorities such as

ALLOBJ, SECADM, JOBCTL, and

SPLCTL concentrate power. Object authority determines who can access libraries, files, programs, output queues, and other objects. Authorization lists can provide a more controlled and scalable way to manage authority across objects with similar access requirements. System values define important security behavior around password rules, auditing, and overall security posture.

While this isn't exotic material for IBM i professionals, it may be invisible to SOC 2 readers unless the report explains it.

A strong SOC 2 system description should identify how access to IBM i production environments is requested, approved, provisioned, reviewed, modified, and revoked. It should explain whether users have named profiles, whether service accounts exist, how group profiles are managed, how special authorities are approved, and how access to production libraries is periodically re-certified.

The controls should not just say:

“Access to production systems is restricted to authorized personnel.”

That is true, perhaps, but not really enough.

A stronger IBM i-aware control says something closer to:

“Access to IBM i production libraries supporting claims processing is restricted through approved user profiles, group profiles, and authorization lists based on assigned job responsibilities. Access is reviewed periodically by platform management and application ownership to determine whether it remains appropriate.”

Then, that auditor test has something real to work with, as they can inspect access review evidence, select a sample of users with access to production claims libraries, compare access to job responsibilities and approvals. They can inspect evidence of management review . . .and so on.

That's the SOC 2 language meeting the IBM i reality.

Evidence here might include DSPUSRPRF output, DSPAUT or DSPOBJAUT results, WRKOBJOWN review, authorization list documentation, QSYS2.USER_INFO, QSYS2.OBJECT_PRIVILEGES, access approval tickets, termination tickets, quarterly recertification sign-offs, and exception tracking.

The reader does not need to become an IBM i administrator, but the SOC 2 report needs to show enough of the access-control model that your trust story is credible.

Availability: “Backed up” ain't the same thing as recoverable

Availability in a SOC 2 report often includes monitoring, backup, incident response, disaster recovery, redundancy, and restoration procedures. In cloud-native environments, the report may talk about regions, availability zones, automated backups, failover, infrastructure monitoring, and restoration testing.

In IBM i environments, the availability story can be just as strong, but it needs to be told in platform terms.

Availability is not proven by saying “the system is stable.” IBM i has a reputation for stability for good reason, but reputation doesn't count as evidence. Your service organization still needs to describe how it monitors the environment, detects issues, responds to incidents, protects data, performs backups, tests restoration, and maintains recovery capability consistent with service commitments.

If the IBM i supports claims processing, billing, eligibility, or customer reporting, then the report should explain the operational dependencies.

Are production jobs monitored? Are abnormal job completions reviewed? Are batch failures escalated? Are job logs retained? Are backup jobs reviewed? Are restore tests performed? Are HA replication exceptions monitored? Are recovery objectives defined? Are DR exercises documented? Are dependent systems included in the recovery plan?

This is where BRMS or equivalent enterprise backup tooling (CommVault, eVault, etc.) becomes more than infrastructure plumbing. Backup policies, save strategies, media handling, restore logs, job completion reports, and DR test documentation all become SOC 2 evidence if the service commitments include availability.

So it's not just "the data is backed up", but whether the service organization can restore the system, data, and processing capability needed to meet its commitments (you do have official SLA's, right?).

. . .a backup without tested restoration is only a cool theory with a timestamp.

For your IBM i, useful availability evidence may include BRMS reports, save logs, restore test evidence, DR exercise records, HA replication monitoring, job scheduler logs, incident tickets, system monitoring alerts, hardware maintenance records, PTF/change records, and management review of backup or recovery exceptions.

A strong control might read:

“IBM i production data supporting the claims processing platform is backed up according to the documented backup schedule. Backup job completion is monitored, exceptions are investigated, and restoration procedures are tested at least annually to evaluate recoverability.”

The tests would then inspect backup schedules, review a sample of backup jobs, inspect exception handling, and inspect restore test evidence.

Processing Integrity: the category IBM i deserves

Many SOC 2 reports skip processing integrity because it's not always relevant to the service commitments being examined, and yes, you don't include categories just because they sound useful.

But for IBM i-centered service environments, processing integrity may be the category that best captures what the platform actually

does

If the IBM i adjudicates claims, calculates bills, generates invoices, updates customer balances, posts transactions, validates eligibility, or produces outbound files used by downstream systems, then the customer is not only relying on confidentiality and availability. The customer is relying on processing to be complete, accurate, timely, valid, and authorized.

That isn't a generic security topic, but "processing integrity" more or less defined outright.

An IBM i SOC 2 report that excludes processing integrity may still be appropriate depending on the service commitments, but the decision should be deliberate . . .if the service organization makes commitments about transaction processing, file generation, operational results, customer reporting, or data accuracy, then processing integrity deserves serious attention.

This is also where your batch controls make a difference.

A claims adjudication job may receive inbound files, validate file format, check control totals, process records, generate exception reports, update DB2 for i tables, produce outbound files, and create spooled reports for review . . .so if that process fails halfway through, runs late, processes duplicate records, skips exceptions, or creates incomplete output, the issue may not be a security incident, but it can still affect the service commitment.

Processing integrity controls might include file receipt validation, record counts, hash totals, control totals, duplicate detection, job completion monitoring, exception report review, rerun approval, reconciliation between inbound and outbound records, and downstream balancing.

IBM i supports this kind of evidence naturally because the work tends to be structured, named, scheduled, logged, and repeatable.

The WRKJOBSCDE command can identify scheduled processes. Job logs can support processing review. Application reports can show exceptions. DB2 for i tables can support reconciliation. Journaling and commitment control can support recovery and transactional consistency. Spool files can show control reports, even though they also create confidentiality considerations. Change records can show whether processing logic was modified. Operator procedures can show how abnormal endings are handled.

A processing-integrity control might read:

“Scheduled IBM i batch jobs supporting claims adjudication are monitored for successful completion. Processing exceptions, abnormal job endings, and control total discrepancies are reviewed by operations personnel and escalated to application owners when required.”

The test might say:

“Inspected job monitoring evidence for selected processing dates during the examination period. For a sample of claims adjudication batch runs, inspected evidence of job completion, reviewed exception reports, and determined whether identified exceptions were reviewed and resolved according to documented procedures.”

That's the kind of language that gets us out of vague platform asides and into what's considered actual assurance.

Confidentiality: data doesn't stay politely just in DB2 for i

Confidentiality in SOC 2 is often discussed in terms of encryption, access control, data classification, secure transmission, and restrictions on disclosure. All of that applies to IBM i, but the real issue is that confidential data rarely stays in one neat location.

Everyone remembers the database, but not everyone follows through with the extract.

With your IBM i, confidential customer data may live in DB2 for i tables, but it may also appear in IFS directories, outbound files, work files, save files, replicated environments, test libraries, spool files, reports, output queues, backup media, journal receivers, managed file transfer folders, and downstream feeds.

As a result, this is where your confidentiality work needs to get down in the weeds.

If a SOC 2 report says customer confidential information is protected, the system description should explain where that information exists and how access is controlled throughout its lifecycle. It's not enough here to secure the table and ignore the report that prints the same data every night, or to secure the production library while leaving an IFS staging directory wide open. (It's also not enough to encrypt transmission while retaining unneeded copies in a transfer folder indefinitely . . .not that I've ever seen that happen).

Confidentiality on IBM i is a data-location problem as much as an access-control problem.

The controls here should address how confidential information is identified, stored, accessed, transmitted, retained, and disposed. That includes authority to database objects, IFS permissions, output queue access, spool file handling, file transfer procedures, backup retention, and test-data practices.

A strong confidentiality control might read:

“Customer confidential information generated by the IBM i claims processing platform is restricted to authorized personnel through object authority, authorization lists, IFS permissions, and output queue controls. Outbound files containing customer confidential information are retained according to documented retention requirements and removed from staging locations after transfer confirmation.”

The test might inspect IFS directory authority, output queue access, evidence of transfer completion, cleanup logs, and review of access to libraries containing confidential information.

Again, the point isn't to bury the reader in IBM i command trivia, but to show that the control follows the data.

Privacy: the ISO 27701 bridge you've built

Privacy is a separate Trust Services Category and not automatically included in every SOC 2 report. . . .but when a service organization makes privacy commitments, or when the system processes personal information in ways relevant to those commitments, privacy can become part of the SOC 2 story.

Honestly, the privacy conversation should feel familiar after the ISO 27701 series:

Where does personal data live? Who can access it? What purposes does it support? How is it retained? Where is it disclosed? Which processors receive it? Can it be corrected, restricted, deleted, or exported where required? How are privacy incidents detected and escalated?

If the IBM i stores employee information, customer data, patient data, student data, claims information, or billing details, then privacy does not begin at the cloud portal or customer support workflow. It begins where the data is authoritative.

That may be DB2 for i, but it may also be backups, spool files, extracts, journals, and test environments.

A privacy-aware SOC 2 report should not simply say “customer data is protected", it needs to describe how personal information is handled in the system and which privacy commitments are relevant to the service.

This is

especially

important in environments where a modern application layer depends on IBM i data, as a customer may interact with a web portal, but the portal may be reading, updating, or reporting data whose authoritative source is the IBM i. If the SOC 2 report describes the portal but not the data source, the privacy story may be incomplete.

Privacy, like confidentiality, follows the data, and the IBM i often holds the data everyone else is summarizing.

Change Management: the report has to understand how change really happens

Change management is one of the places where SOC 2 reports can become fictional, because the report may say changes are approved, tested, and deployed through controlled procedures . . .but if the described process only reflects modern development pipelines (Jenkins, etc.) while IBM i changes move through a different path entirely, the report is not telling the whole story.

IBM i change management often has its own operational reality.

Some shops use Aldon, TurnOver, Implementer, ARCAD, Git-based workflows, Jira, ServiceNow, or even homegrown promotion processes. Some have formal segregation between development, test, and production, some have emergency change procedures that are well-defined, and still others have procedures that work mostly because experienced people keep them alive.

Given all that, SOC 2 doesn't really care what the tool is, but whether changes that could affect the service commitments are authorized, tested, approved, implemented, and monitored.

On an IBM i, that includes RPG, CL, SQL, database file changes, display files, printer files, job descriptions, job schedules, configuration objects, authority changes, system values, and integration scripts. It also includes changes to IFS-based scripts, web services, managed file transfer definitions, and surrounding middleware that supports the IBM i service.

A strong change management section should explain how changes are requested, risk-assessed, approved, developed, tested, promoted, and reviewed. Emergency changes should be described separately, because shortened timelines create different control expectations.

A control might read:

“Changes to IBM i application programs, database objects, job schedules, and production configuration supporting the claims processing platform are documented in the change management system, approved by authorized personnel, tested prior to implementation, and migrated to production by personnel independent of development where feasible.”

The test might inspect a sample of completed changes and verify documented approval, testing evidence, implementation evidence, and segregation of duties.

That's not glamorous , but it's where your assurance lives, and a SOC 2 report that describes CI/CD pipelines but ignores the IBM i promotion path isn't modern, just incomplete.

Logical access recertification: the boring control that tells the truth

Access recertification is one of those controls that sounds simple until you actually do it (raise your hand if you've been part of one).

In a SOC 2 report, access recertification is usually described as a periodic review to determine whether users continue to require access based on job responsibilities. That means more than reviewing an SSO group on the platform, as the review needs to reach the actual authorities that matter.

Who has access to production libraries? Who has

ALLOBJ? Who has

SECADM? Who can control jobs? Who can see output queues containing sensitive reports? Which group profiles inherit access to broad object sets? Which service profiles exist? Which profiles are disabled but not deleted? Which users can access IFS directories containing outbound files? Which profiles own sensitive objects?

The output of DSPUSRPRF may be one input, and QSYS2.USER_INFO may be another. QSYS2.OBJECT_PRIVILEGES can support more targeted review. Authorization list documentation can show grouped access. Access tickets can show approval. HR termination tickets can show revocation, and your management sign-off can show review.

But . . . a recertification that simply asks a manager to approve a list they don't understand is not strong evidence, as the control owner

has

to understand what is being reviewed.

This is where IBM i translation becomes part of the control, as if the business owner can't interpret object authority, group profile inheritance, or special authority risk, then the platform team and GRC function need to "translate" the evidence into an attestation packet that a control owner can reasonably approve.

Otherwise, the review becomes just some compliance-flavored theater.

SOC 2 readers should absolutely care about that distinction because operating effectiveness depends on the control actually operating, not just producing a signed spreadsheet.

CUECs: the customer isn't off the hook

"Complementary User Entity Controls" are one of the more useful parts of SOC 2 reporting because they remind everyone that the service organization doesn't control the entire universe.

After all, some controls only work if the customer does its part.

In an IBM i-centered service, CUECs might include customer responsibility for submitting complete and accurate input files, reviewing output reports, reconciling processed transactions, maintaining authorized customer-side users, protecting credentials, notifying the service organization of user changes, reviewing exception files, and validating downstream posting.

This matters because IBM i processing can often depend heavily on input and output discipline.

If a customer sends incomplete input files, the service organization’s controls may detect and report exceptions, but the customer may still be responsible for correcting source data. If a customer receives an outbound claims or billing file, the customer may need to reconcile totals or review exception reports. If customer administrators can manage users in a portal, they may be responsible for granting access only to authorized personnel.

A good SOC 2 report doesn't pretend the service organization owns controls it can't perform: it will identify CUECs clearly, because the service commitments may only be achieved when those complementary controls operate effectively at the "user entity".

In your IBM i environments, this is important where file-based processing remains part of the workflow. (the old joke is that the file showed up, so the job ran).

But your SOC 2 wants to know whether the input was valid, whether the output was reviewed, and who owns the steps on each side of the boundary.

That boundary needs to be described . . .as otherwise, everyone assumes the other party handled it.

And that, folks, is how control gaps are born.

Subservice organizations: "carved out" doesn't mean "forgotten"

SOC 2 reports describe subservice organizations using either the carve-out or inclusive method. In many reports, subservice organizations are carved out, meaning the report describes the types of controls assumed at the subservice organization but doesn't test those controls directly.

With your IBM i environments, subservice organizations may include more than cloud providers: this could include a co-location facility, managed hosting provider, hardware maintenance provider, backup storage provider, managed file transfer vendor, network provider, SIEM/logging platform, DR site provider, or a third-party application support vendor.

The important question is whether controls at those subservice organizations are necessary for the service organization to meet its commitments.

If the IBM i is hosted in a third-party data center, physical security and environmental controls may be assumed from the data center provider. If file transfer depends on a managed service, secure transmission and availability may depend partly on that provider. If DR replication depends on a third-party facility or tool, recovery commitments may depend on those controls. If logs are forwarded to a SIEM, monitoring may depend on that platform.

Carve-out language should not be used as a distractor or "fog machine", though.

A good SOC 2 report tells the reader which subservice controls are assumed and how the service organization monitors or considers those providers, and that may include reviewing SOC reports, tracking exceptions, performing vendor risk assessments, evaluating CUECs from the subservice report, and documenting complementary controls at the service organization.

For IBM i, this is another place where the system description

has

to be honest:

If the Power hardware sits in a colo, say so.

If backups are stored offsite, say so.

If a managed service provider has administrative access, say so.

If a third-party tool is essential to file transfers, say so.

This isn't admitting weakness in your process, or creating work for works sake, but to describe the trust chain.

What a strong IBM i SOC 2 evidence packet looks like

If I were reviewing an IBM i-centered SOC 2 report, I sure as heck wouldn't expect every reader to understand every command. But I would expect the evidence packet to show that the service organization understands the platform well enough to prove its controls.

For security: user access reviews, privileged authority reviews, approval evidence, termination evidence, authorization list review, object authority review, and audit configuration evidence.

For availability: backup schedules, backup completion reports, restore testing, DR plans, DR test results, incident records, monitoring evidence, and evidence that exceptions were reviewed.

For processing integrity: job schedules, batch completion evidence, exception reports, record counts, control totals, reconciliation procedures, rerun approvals, duplicate prevention controls, and evidence of review.

For confidentiality: data classification, access restrictions, IFS authority review, output queue controls, transfer logs, retention evidence, backup handling, and disposal procedures.

For change management: change tickets, approvals, testing evidence, promotion logs, emergency change review, segregation of duties evidence, and rollback or backout planning.

For monitoring: QAUDJRN review, QSYS2.DISPLAY_JOURNAL or DSPJRN extracts where appropriate, alert review, root cause analysis, corrective action tracking, and management visibility into unresolved issues.

All of that evidence should connect, as SOC 2 report shouldn't feel like a pile of unrelated screenshots, but should show a chain from service commitment to system requirement to control to evidence to test result.

The IBM i platform is damn stubborn about producing artifacts; profiles exist, objects have authority, jobs run or they do not. Journals contain entries. Reports are generated. Backups complete or fail. Restore tests produce results. Changes leave records when the process is designed correctly.

The SOC 2 challenge isn't that IBM i can't produce evidence, but if the organization has designed evidence flows that make the platform understandable to the report reader.

(PS, that's

GRC Engineering Club

territory).

Common failures: describing just the wrapper

A big SOC 2 failure mode around IBM i isn't necessarily that the controls are bad, but that the report describes the wrapper and skips the engine:

The customer-facing application, cloud layer, support ticket, and incident process is described, but the system of record is reduced to a line like “backend processing platform” or “legacy system.”

This is where your credibility starts leaking: if the IBM i supports the service commitment, it belongs in the description. If it processes customer data, it belongs in the data flow. If it generates customer-facing output, it belongs in processing integrity. If it stores confidential data, it belongs in confidentiality. If it supports availability, it belongs in backup and recovery.

If it is excluded, the exclusion needs a defensible explanation.

A SOC 2 report should help users understand the risks arising from their interaction with the system, and if the system description doesn't explain the system that actually processes the work, then the reader isn't getting the full picture.

That may not always change the auditor’s opinion, but it absolutely changes the usefulness of the report, since your SOC 2 report isn't supposed to be a ritual document passed from vendor portal to procurement folder until everyone forgets it exists.

It exists to provide information to users who need to understand a service organization’s controls, so if the IBM i is part of the service, the report should be able to say how.

Companion artifact: showing the report instead of just describing it

This is also why I built an simple, illustrative SOC 2-style report around an IBM i-centered claims processing platform, as a lot of IBM i folks may have never even seen one of these out in the wild before

Note: the artifact isn't a real SOC 2 report, attestation, or assurance document (honestly, the "Ernest & Chung" auditor should have given that away).

The point is to show what the structure might look like if the IBM i were treated as the system of record inside the report rather than a vague dependency behind the scenes.

The artifact includes some familiar SOC 2 anatomy: management assertion, auditor-style report, system description, subservice organizations, CUECs, and a controls/tests/results section.

The pretend organization here does not matter, but structure does . . . as once you see the IBM i written into the report this way, it becomes much harder to accept “legacy backend” as a sufficient description.

So, we're not pretending to perform an audit here, but showing what honest scoping might look like in a condensed form.

Take a look here for some general SOC 2 beats for the platform:

https://www.linkedin.com/posts/john-flack_fictional-soc2-for-ibm-i-ugcPost-7464112582363373568-0ev9

(again, not exact here, but this is for exposure for those IBM i folks who may have never seen this out in the wild).

The Governance Takeaway . . .

SOC 2 and the IBM i belong in the same conversation because trust doesn't stop at the user interface: If the service depends on IBM i processing, then the report should follow the processing. If the customer relies on IBM i data, then the report should explain the data. If the business commitment depends on IBM i availability, then the report should address recoverability. And so on.

SOC 2 is not asking whether the platform is fashionable.

If your SOC 2 system description can't explain the system of record, then the report may be formatted correctly, but the trust story is incomplete.

The practical work, then, isn't to make the IBM i sound modern for the sake of the report, but to make it honestly describe the work the IBM i actually performs.

That means describing the processing, the data, the evidence, the dependencies, and the controls in terms a SOC 2 reader can understand.

Let's work towards writing a better story.
