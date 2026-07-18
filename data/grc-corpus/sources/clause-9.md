# i on GRC: ISO 27701, Clause 9 & the IBM i

Source: https://www.linkedin.com/pulse/i-grc-is0-27701-clause-9-ibm-john-flack-n5jwe

# i on GRC: ISO 27701, Clause 9 & the IBM i

Evaluating the Privacy Program Framing it out . .

Evaluating the Privacy Program

Framing it out . . .

Welcome back, fellow GRC, ISO and midrange nerds! After a bit of a hiatus in April to close the loop on some educational goals, "i on GRC" is back.

So, it's been a bit since we last walked through ISO 27701 and the IBM i, so let’s reorient ourselves.

Clause 4 asked whether your organization understood where personal data lives.

Clause 5 asked who was willing to own it.

Clause 6 asked what you planned to do about privacy risk.

Clause 7 asked whether your organization had the resources, competence, awareness, communication, and documentation needed to support the privacy program.

Clause 8 moved us into operations, where privacy governance had to show up in the way personal data is actually processed, accessed, exported, retained, and monitored.

Now Clause 9 asks the big money follow-up question:

Is any of this actually working?

That's the heart of performance evaluation. . . . since we like to compare our PIMS to the ISMS standard, recall that ISO 27001 uses Clause 9 to examine monitoring, measurement, internal audit, and management review.

So, ISO 27701 carries that exact same management system discipline into privacy governance. In other words, it's not quite enough to say your IBM i privacy controls exist: you're going to need to evaluate them, audit them, review them, and improve them based on evidence.

For IBM i environments, (and if you've followed the series, you knew I was going to go there) this is where the platform’s strengths become very useful: your IBM i system already produces evidence. User profiles, object authorities, audit journal entries, job activity, authorization lists, save strategies, and change records can all support privacy performance evaluation.

The problem is rarely that evidence can't exist, but, usually, that no one has formally decided what evidence matters, who reviews it, how often it is reviewed, and what happens when it shows something uncomfortable.

This is where your privacy governance program stops trusting the design and starts testing the reality.

9.1 Monitoring, Measurement, Analysis, and Evaluation

Clause 9.1 asks the organization to determine what needs to be monitored and measured, how that monitoring will happen, when it will happen, and who will evaluate the results.

This sounds simple enough . . . until you apply it to personal data on IBM i.

If your platform hosts payroll, claims, billing, customer master data, or other PII-bearing workloads, privacy performance

cannot

be measured only at the enterprise policy level. It has to reach the system where the data lives.

That means monitoring cannot simply ask whether “access reviews were completed” (ask me how I know). It has to ask whether the right access was reviewed, whether the review covered the right libraries, whether special authorities were justified, whether object access was actually logged, and whether exceptions were remediated. And, hey, did you document all of this?

On your IBM i, useful privacy measurements will usually come from several familiar places, some of which you can automate into reports that will make this easier come audit time.

DSPUSRPRF USRPRF(*ALL) can help identify profiles with elevated authorities such as *

ALLOBJ,

*SECADM, or *JOBCTL. DSPAUT can show authority to sensitive files or libraries. WRKOBJOWN can expose ownership patterns that no longer match business accountability. WRKAUTL and EDTAUTL can help validate whether authorization lists protecting PII-bearing objects are structured and maintained properly.

For audit activity, our old friend QAUDJRN becomes central again. System values such as QAUDCTL, QAUDLVL, and QAUDLVL2 should be reviewed to determine whether relevant security and object access events are being captured. DSPAUDJRNE, DSPJRN JRN(QAUDJRN), and QSYS2.DISPLAY.JOURNAL can then help convert the existence of auditing into reviewable evidence.

That said, having QAUDJRN enabled is not the same thing as monitoring privacy performance.

The performance question is whether audit activity tied to personal data is being reviewed, whether findings are documented, and whether those findings lead to corrective action.

For example, if authority failures repeatedly occur against a file containing employee information, that should not disappear into journal noise. If a batch profile accesses a sensitive file outside its expected schedule, that should be explainable. If an IFS directory is used to stage outbound extracts containing customer records, review procedures should exist for authority, retention, and transfer behavior.

Clause 9.1 forces your organization to define privacy measurements that have operational meaning.

A few useful IBM i privacy performance indicators might include:

Number of active profiles with access to PII libraries.

Number of profiles with *ALLOBJ authority and access to PII-bearing applications.

Frequency of QAUDJRN review for sensitive object access.

Number of unresolved access exceptions.

Number of unreviewed or undocumented batch exports involving personal data.

Completion rate of access recertification for PII libraries.

The point is not to create “vanity metrics” for a dashboard, and to give someone a bunch of green check marks to feel good about . . .but, rather, to measure whether privacy controls are behaving as intended.

If the same high-risk access exists quarter after quarter, and the only thing changing is the date on the review spreadsheet, that's just compliance theater dressed up as performance evaluation.

Clause 9.1 (and you) should expect more.

9.2 Internal Audit

Clause 9.2 then moves us from monitoring into internal audit.

This is where the organization evaluates whether the PIMS conforms to its own requirements and to the requirements of the standard. For IBM i, that means the platform cannot be treated as an awkward appendix to the audit program, even though in a lot of technology stacks, that's how we end up.

If IBM i is in scope for the PIMS, then IBM i

must

be in scope for the internal audit.

That sounds super obvious . . . but anyone who has worked around legacy platforms knows how often a system of record gets summarized away into a line item called “legacy application” or “core system.” That may be convenient in a slide deck, but it is not audit discipline.

An internal audit of ISO 27701 on IBM i should examine whether the privacy controls described in policy and risk documentation can be traced to actual platform evidence.

If the privacy policy says access to personal data is restricted by role, the audit should examine how that is enforced through user profiles, group profiles, object authorities, and authorization lists.

If the risk assessment identifies excessive special authority as a privacy exposure, the audit should confirm whether

ALLOBJ and

SECADM have been reviewed, justified, and reduced where possible.

If the PIMS scope includes development or test environments, the audit should verify whether those environments contain production PII, masked data, or something less clearly governed.

If the organization claims that personal data exports are controlled, the audit should examine batch jobs, IFS staging locations, FTP processes, API integrations, or other transfer pathways used to move data off the platform.

The audit trail should be boring in the best possible way:

Policy statement.

Mapped control.

IBM i artifact.

Finding.

Owner.

Corrective action.

Follow-up.

That's what makes the system auditable. Easy enough, right?

Native evidence could include DSPUSRPRF outputs, DSPAUT reviews, QAUDJRN extracts, authorization list documentation, change tickets, access approval records, BRMS retention settings, and screenshots or reports tied to system values like QAUDCTL and QAUDLVL.

None of that stuff is exotic, and what makes it audit-ready isn't the command (WRKACTJOB is no more arcane than ps -ef on your Linux or AIX box), but the chain of reasoning around it.

The internal auditor should be able to see why the evidence was collected, what it proves, who reviewed it, and what happened next.

Quite frankly, this is where many organizations struggle . . there's system output, but the failure is in connecting it cleanly to governance intent.

9.3 Management Review

Clause 9.3 brings your leadership back into the conversation.

Privacy performance evaluation is not supposed to stop at the technical team. If leadership accepted accountability in Clause 5, and if privacy risks were planned in Clause 6, then leadership has to now review whether the program is functioning.

For your IBM i environments, management review should not be limited to generic privacy updates: the review should include the platform-specific evidence that reflects privacy risk on your system of record.

That may include trends in special authority usage, completion of access reviews for PII libraries, unresolved audit findings, incidents or near misses involving personal data, changes to data export pathways, and any recurring problems in monitoring or documentation.

If the IBM i hosts claims or payroll data, leadership should know whether access to those datasets is improving or degrading.

If new integrations have been introduced, leadership should understand whether they changed the privacy risk profile.

If QAUDJRN reviews repeatedly produce findings that are never remediated, leadership should see that as a

governance failure

, not a platform detail.

Management review is also where resource constraints need to bubble up and become visible; if your team cannot review audit journal activity because no one has time, that's not a technical limitation, but a management system issue.

If PII-bearing libraries can't be properly re-certified because their ownership is unclear due to reorganizations or tribal knowledge walking out the door, that's an accountability problem. Full stop.

If retention requirements can't be reconciled with backup or journal receiver practices (we don't have enough space for those, we can't ship these offsite for privacy reasons), leadership needs to understand the operational tradeoff you're left with.

Here, much like what's left behind with a red-team pen test report, you're converting technical evidence ultimately into management visibility.

The IBM i team should not be left holding privacy risk as a local operational burden; if the platform contains personal data, then its privacy posture absolutely belongs in management review.

So, what does strong Clause 9 evidence look like?

When Clause 9 is operating effectively, the organization can demonstrate that privacy performance is being monitored, audited, and reviewed in a repeatable way.

For IBM i, that evidence might include something like:

Defined privacy performance metrics tied to PII-bearing libraries and applications.

Periodic DSPUSRPRF and DSPAUT review packages.

QAUDJRN review records with documented findings and disposition.

Internal audit workpapers mapping ISO 27701 requirements to IBM i evidence.

Management review minutes showing discussion of IBM i privacy metrics.

Corrective action records tied to identified privacy control gaps.

The big thing here is

repeatability

: a one-time spreadsheet built during audit week is not a performance evaluation system. A set of recurring evidence routines, assigned reviewers, documented outcomes, and management escalation paths is much closer to what Clause 9 is trying to accomplish (hello, GRC Engineering!)

IBM i gives you the raw material, but Clause 9 asks overall whether your organization has turned that raw material into governance evidence.

The Governance Takeaway . . .

Clause 9 of ISO 27701 makes your governance and PIMS look in the evidence mirror.

For your IBM i environments, performance evaluation asks whether the authority model, journaling configuration, access reviews, change records, data export controls, and retention practices are actually supporting the privacy commitments your organization has made.

The platform (yes, I'll say it again) already provides a fantastic evidence base, but evidence only matters when it is selected intentionally, reviewed consistently, and escalated when it reveals a problem.

So, if we look at Clause 8 as operating privacy controls, Clause 9 is about proving those controls are operating well enough to trust.

And if the IBM i remains your system of record for personal data, then the privacy program you oversee can't be considered mature unless the platform appears clearly in monitoring, internal audit, and management review.

Now, privacy governance stops being self-assessed confidence and becomes actual examined performance.

(Next week, we move to Clause 10, where findings, gaps, and failures must become corrective action rather than just "background noise".)
