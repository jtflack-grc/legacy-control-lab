# i on GRC: ISO 27701, Clause 10 & the IBM i

Source: https://www.linkedin.com/pulse/i-grc-is0-27701-clause-10-ibm-john-flack-6nz1e

# i on GRC: ISO 27701, Clause 10 & the IBM i

Improving the Privacy Program Framing it out . .

Improving the Privacy Program

Framing it out . . .

We made it! After walking through ISO 27701 and the IBM i clause by clause, we're finally on Clause 10.

If you're just joining us, a brief walk-through what we've talked about:

Clause 4 makes sure your organization understands where your personal data lives.

Clause 5 then finds out who was willing to own it in your org.

Clause 6 takes that, and probes what you plan to do about privacy risk.

Clause 7 sorts whether you had the people, resources, awareness, communication, and documentation to support the privacy program.

Clause 8 moves privacy into operations, where personal data is actually processed, accessed, exported, retained, and monitored.

Clause 9 then takes all of that, and asks whether any of it's actually working.

So now, Clause 10 asks the question that separates a real management system from a compliance archive:

What happens when it's

not

working?

. . which leads us to

improvement

Not a dashboard, policy, audit binder or that heroic spreadsheet you built two days before the external assessor shows up (

we can have a whole 'nother conversation on spreadsheets and GRC Engineering, but that's for later)

So . . Clause 10 is where findings, failures, exceptions, recurring issues, and uncomfortable evidence are supposed to become corrective action and continual improvement. This is where your Privacy Information Management System proves whether it can actually learn from what it finds.

For IBM i environments, that matters because (repeat after me) . . . the evidence is usually already there. As we've evidenced from the 27701 series previously (and 27001/42001), your system can show you user profiles, object authorities, adopted authority, job schedules, audit journal activity, output queues, save strategies, IFS permissions, journal receivers, and ownership patterns.

Producing evidence is one thing, but we're here with this clause to ask whether your organization will do anything meaningful with it.

If your IBM i is the system of record for payroll, claims, billing, customer master data, student records, healthcare data, or any other PII-bearing workload, then Clause 10 has to reach the system itself.

Improvement cannot stop in the GRC platform: at some point, it has to touch the user profile, the authorization list, the object authority, the batch job, the export process, the save policy, the journal configuration, and the ownership model.

If not, you didn't improve the privacy control environment . . . just your paperwork around it.

10.1 Nonconformity and Corrective Action

Clause 10.1 is about what happens when something doesn't conform to the requirements of the PIMS, the organization’s own policies, or the privacy commitments it has made.

This basically means: when you find a problem, you have to respond to it, understand it, correct it where appropriate, determine whether it exists elsewhere, and retain evidence of what you did.

That sounds super-obvious until the finding lands on an IBM i environment that has been running critical workloads for twenty or thirty years.

With legacy platforms, "nonconformities" rarely arrive as clean little issues with one obvious owner and one tidy fix. Instead, they show up as a blend of inherited authority design, old business logic, operational necessity, undocumented exceptions, and “we’ve always done it this way” patterns that nobody has had the time, authority, or appetite to unwind.

Some examples you may see in the field as a GRC professional:

A library containing employee PII where *PUBLIC still has more access than anyone wants to explain.

A group profile that grants access to far more than the current job role requires.

A production support profile with *ALLOBJ because an incident happened five years ago and no one ever walked the access back.

An adopted authority program that touches PII-bearing files without current documentation of why it needs that authority.

A nightly job exporting customer records into the IFS before a file transfer, with unclear retention on the staged file.

A test library refreshed from production data, where the masking process is assumed but not evidenced.

QAUDJRN showing repeated authority failures against a sensitive object while the access review spreadsheet says everything is fine.

So if Clause 9 gives you the evidence like the above, Clause 10 finds out if you have the discipline to act on it.

That's where the standard has teeth, and where we start asking the hard questions that start shifting eyes in the conference room:

If DSPUSRPRF shows profiles with

ALLOBJ, *SECADM,

JOBCTL, or *

SPLCTL that can reach PII-bearing applications, the corrective action should not stop at “reviewed.” Reviewed by whom? Against what criteria? Was the access justified? Was it reduced? Was it time-bound? Was a compensating control approved? Was the risk accepted by the right person, or just tolerated by habit?

If DSPAUT shows broad access to a file containing personal data, the answer is not to paste the output into an audit folder and move on. Someone has to determine why that authority exists. Is it tied to a valid application role? Is it coming through a group profile? Should the object be protected through an authorization list? Is *PUBLIC access appropriate? Does the access reflect current business need, or old design that survived because nothing broke loudly enough to force a review?

If WRKOBJOWN shows sensitive objects owned by an inactive profile, a generic profile, or a profile that no longer aligns with business accountability, that is not just technical housekeeping.

In your privacy program, ownership is part of accountability. If nobody can explain who owns the data, nobody truly owns the privacy risk.

The Finding Is *Not Always* the Cause

This is where a corrective action program may weaken, by confusing the finding with the root cause.

“User had too much access” is not a root cause, but a symptom.

The root cause might be that access approvals are informal.

(Or, that group profiles were copied from an older role model. Or production support access is granted during incidents and never removed. Or that developers need access because the application lacks proper support tooling. Or that the business owner for the application is unclear, so no one is willing to approve removal.

Yes, this is belaboring the point, but this is to illustrate the first read isn't always the correct one).

In some cases, it's that the IBM i team has technical responsibility

without

governance authority.

If the corrective action is only “remove access for USER123,” you may fix one profile and leave the system condition untouched. The same problem comes back next quarter with USER456, a new group profile, a restored object, or a different exception, so a stronger corrective action reaches into the mechanism that created the issue.

For IBM i, that may mean redesigning your access around authorization lists using CRTAUTL, EDTAUTL, and WRKAUTL, using DSPUSRPRF output to rebuild the profile review process around actual job roles, and using DSPPGM or DSPPGMREF to understand where adopted authority and file references exist inside application logic.

You may also end up changing how temporary production access is approved, logged, and removed, or possibly tweaking CHGOBJAUD for specific sensitive objects so access can be audited more deliberately.

More than likely, though, it ends up with a conversation no one wants to have: the platform team cannot be accountable for privacy decisions that business owners refuse to make.

Your work with Clause 10 forces that conversation into the open, as "corrective action" isn't just fixing a configuration, but correcting the system of decisions that allowed the configuration to become "normal".

Corrective Action Should Reach the Evidence Layer

If Clause 9 was about evidence, Clause 10 is about the evidence of change.

A finding without follow-up is just an observation, and a corrective action without evidence is just a story.

On IBM i, strong corrective action should always leave a before-and-after trail. If special authorities were reduced, retain the DSPUSRPRF evidence that shows the previous state and the updated state. If object authority was tightened, retain DSPAUT output before and after the change. If access was moved into an authorization list, retain the change record showing the approval, the EDTAUTL update, and the resulting authority structure.

If the issue involves data movement, the evidence should always follow the flow.

A batch job exporting PII to the IFS should have a documented owner, a documented purpose, defined retention expectations, appropriate directory authority, and evidence that the output is cleaned up or transferred according to policy.

WRKACTJOB may help during active execution, but the larger evidence story usually lives in job schedules, job logs, change tickets, IFS authority reviews, transfer logs, and documentation of the downstream recipient.

If a spooled report contains personal data, the corrective action may need to examine output queues, *SPLCTL usage, report distribution, and retention of spool files. Privacy risk is not limited to DB2 tables. On IBM i, personal data can live in reports, extracts, save files, IFS folders, printer output, archived objects, replicated environments, and backup media.

That's why Clause 10 cannot be satisfied by updating one policy paragraph: improvement has to follow the data.

Corrective Action Is Not Always an IBM i Command

This is where the “systems” part of the systems thinking we do here comes into play.

Some IBM i findings you'll find require command-line remediation, but quite a few don't.

If one of our sensitive files has the wrong authority, yes, the corrective action may involve CHGAUT, RVKOBJAUT, GRTOBJAUT, or a redesigned authorization list.

However, some of the most important corrective actions sit far above your command line:

If a payroll application has no current business owner, the corrective action is governance assignment.

If a data export exists because a downstream team “needs the file,” the corrective action may be data minimization and purpose review.

If test data is refreshed from production without masking, the corrective action may be a new environment refresh procedure, documented approval process, masking standard, and evidence of validation.

If backup retention conflicts with stated privacy retention, the corrective action requires legal, compliance, infrastructure, and application ownership to reconcile policy with BRMS, save media, journal receivers, and disaster recovery requirements.

If a processor relationship exists operationally but not contractually, the corrective action may sit with

vendor management and legal

rather than the IBM i team.

This is where Clause 10 does useful damage to comfortable assumptions and exposes your organization, warts and all, to the reality of what continuous improvement (see 10.2, coming up next) is.

Privacy failures aren't always technical mistakes.

More likely, they're couched in ownership, process, architecture, funding problems, or risk acceptance problems.

Some are even cultural problems that happen to leave their fingerprints on the IBM i.

The platform may surface the evidence, but the corrective action may require the organization to mature . . .and, honestly, that's the whole point of all of this.

10.2 Continual Improvement

Clause 10.2 expands the lens from those singular corrective actions to continual improvement, and your PIMS either becomes a living management system or stalls out as a recurring annual exercise.

Here, we're using monitoring, audits, incidents, change reviews, stakeholder expectations, and management review to make the privacy program more reliable over time.

For your IBM i, that improvement should be concrete.

If access reviews keep identifying the same excessive special authorities, improve the role model. If QAUDJRN review keeps producing findings no one can explain, improve job documentation, audit scope, and ownership. If data exports keep surprising people during audits, improve the data flow inventory. . . and so on.

The platform gives you

plenty

of places to improve from:

From ad hoc DSPUSRPRF reviews to scheduled profile extracts and repeatable analysis.

From broad object access to authorization lists designed around business roles.

From “QAUDJRN is on” to documented review routines using DSPAUDJRNE, DSPJRN, or QSYS2.DISPLAY_JOURNAL.

From unknown IFS staging folders to documented export paths with ownership, authority review, retention, and transfer controls.

From assumed test data masking to evidenced masking.

From inherited object ownership to documented application accountability.

. . .and, as a whole, from audit week scrambling to recurring evidence generation.

This is where your GRC Engineering instincts should come into play.

The IBM i already has the raw material for repeatable evidence, and we've done a series on how it can participate in "Evidence Engineering" already: output files, SQL services, audit journals, object authority reports, job schedules, system values, BRMS reports, and change records can be assembled into a recurring privacy evidence routine.

Not because dashboards are magical (Goodhart's Law, anyone?), but because repeatability is what keeps governance from becoming a carefully crafted piece of performance art.

Step by step, the system learns from what it keeps finding . . .or it should. If the same issue keeps appearing, the PIMS isn't improving, but just absorbing criticism in favor of deferred technical debt.

And eventually, your internal (and external) auditors can tell the difference.

Improving Without Breaking the Business

This is the part that needs to be said out loud, and it's the dance we all do with legacy platforms: IBM i environments support critical workflows because they usually "run the business".

Payroll has to process, Invoices have to post, and customer service teams need the screen to come up when they hit "Enter".

Clause 10 doesn't require reckless remediation, or to pull access from production support at 4:55 PM on a Friday because a spreadsheet turned red.

It does require, however, that risk decisions be deliberate, documented, owned, and revisited.

If a profile must retain broad authority temporarily, document why. Identify who approved it. Define the compensating controls. Review the access again on a set schedule.

If a data export cannot be redesigned immediately, document the business need, the personal data involved, the recipient, the retention behavior, the transfer method, the privacy risk, and the roadmap for improvement.

That's part of mature governance: not pretending everything can be fixed instantly, or, in the case of people who look at this platform as a "black box" that nothing can be fixed because the platform is old.

The work of Clause 10 lives exactly in the space between operational reality and accountable improvement . . .and if you work with IBM i long enough, you know that is where most real governance lives too.

IBM i Findings That Should Trigger Clause 10 Thinking

Like we just said earlier . . .not every issue is automatically a crisis.

But some patterns should immediately raise the question:

what is our corrective action process for this?

A few examples:

Persistent *ALLOBJ use by profiles that no longer require it for current duties.

QAUDJRN configured but not routinely reviewed.

Authority failures against sensitive objects with no documented follow-up.

Batch jobs exporting personal data without current business ownership.

Processor relationships that exist operationally but are not reflected in contracts or governance documentation.

The point here is that the organization needs a repeatable method to determine what happened, why it happened, what risk it creates, who owns the decision, what action will be taken, and how improvement will be verified.

That is Clause 10 in practice . . .and when its functioning effectively, privacy findings don't accumulate, but

move

instead.

Those examples we looked at are reviewed, assigned, corrected, accepted, escalated, or tracked through a defined process, and the status changes because someone owns the decision . . . and because evidence shows what happened next.

For IBM i, strong Clause 10 evidence might include (deep breath): corrective action records tied to specific findings, before-and-after DSPUSRPRF evidence for authority reductions, DSPAUT evidence showing changes to PII-bearing object access, authorization list documentation showing redesigned access structures, QAUDJRN review findings with documented follow-up, change tickets for remediation involving user profiles or system values, updated data flow documentation after integration changes, BRMS or retention updates tied to privacy findings, and/or management review minutes showing unresolved IBM i privacy risks and decisions. (whew!)

The important thing here, that we've finally gotten to, is the chain:

Finding --> Cause --> Owner --> Decision --> Action --> Evidence --> Review --> Improvement.

That simple chain is what auditors, regulators, and serious leaders care about.

Your IBM i provides the artifacts, and your risk and governance process provides the chain of custody between the artifact and the decision.

The Governance Takeaway . . .

Clause 10 of ISO 27701 is where your privacy program shows whether it can learn.

Not whether it can describe itself, survive an audit, or whether someone can produce a spreadsheet with enough green check marks to keep the meeting short.

Whether it can correct itself.

This means findings must reach the system conditions that created them:

Access problems must improve the access model. Audit findings must improve monitoring. Retention conflicts must improve retention practice. Ownership gaps must improve governance structure. Data movement findings must improve the way personal data flows through and beyond the platform.

This is where the IBM i is useful for your GRC work, precisely because it is so concrete.

The platform can show you the issues easily . . . but in some cases it can't fix them, as that difficult responsibility belongs to the organization.

So, yes, Clause 10 closes the ISO 27701 clause series, but it also explains why the whole series mattered in the first place, as a PIMS that can't (or won't) improve isn't really a management system, but just a fancy compliance archive.

If the IBM i remains your system of record for personal data, then continual improvement must include the system itself: its authorities, jobs, data flows, retention practices, audit evidence, and ownership model.

Privacy governance becomes real here: not with policies, dashboards or audit binders: but in the corrective action taken . . .whether by you, your IBM i team, your security team, or "top management" . . .that changes the system.
