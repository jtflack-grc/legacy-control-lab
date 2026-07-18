# Alignment Is Continuous Reconciliation

Source: https://www.linkedin.com/pulse/alignment-continuous-reconciliation-john-flack-v4ele

# Alignment Is Continuous Reconciliation

The Framework . . . and The Machine

Let's face it: the recurring failures most people call “governance issues” aren't usually failures of framework selection, but reconciliation.

All of the frameworks most often invoked in modern GRC (NIST, ISO, ISACA, FAIR) already provide structure for cybersecurity outcomes, management systems, enterprise governance, and quantitative risk analysis.

The problem is that none of them can make an inventory correct, a workflow operative, an owner empowered, a lesson learned, or a roadmap real just because somebody documented it nicely.

The frameworks aren't the problem . . .

The NIST Cybersecurity Framework is explicit about what it is . . . and what it isn't.

CSF 2.0 offers a taxonomy of high-level cybersecurity outcomes and explicitly does

not

prescribe how those outcomes must be achieved.

That's not a defect, but the whole point.

The framework is supposed to organize decisions, not impersonate your operations. NIST’s continuous monitoring guidance makes the same assumption more bluntly: organizations need visibility into assets, threats, vulnerabilities, and the effectiveness of deployed controls so they can make informed risk decisions.

If the organization cannot reconcile those things in practice, the framework is still useful, but it's just describing a preferred "dream state".

ISO makes the same point in management-system language rather than in cyber language. ISO/IEC 27001 requires organizations to establish, implement, maintain, and continually improve an information security management system; ISO/IEC 27701 does the same for privacy information management; ISO 31000 frames risk as something to identify, analyze, evaluate, treat, monitor, and communicate.

ISO’s broader management-system guidance also stresses that audits are vital because they let organizations check whether achievements meet objectives and show conformity, and that these standards share a harmonized structure precisely so governance, performance evaluation, corrective action, and improvement can be handled as one management discipline rather than as disconnected binders.

COBIT and FAIR reinforce the same discipline . . . from opposite directions:

COBIT’s core model ties governance and management objectives to enterprise goals and then insists that governance be tailored through design factors such as strategy, threat landscape, sourcing model, and technology choices.

FAIR, by contrast, disciplines risk language by defining risk in terms of probable frequency and magnitude of future loss and by expressing that risk in business terms instead of collapsing it into vague colors and managerial astrology.

Between them, the message is pretty clear: governance must align to enterprise reality, and risk must be described in a way that can survive contact with actual decisions.

What the standards actually demand

Once you read past the marketing sheen, the major frameworks are much less abstract than many governance programs pretend. CSF 2.0’s GOVERN function covers organizational context, risk management strategy, roles, responsibilities, authorities, policy, oversight, and supply-chain risk management. It outright calls for risk appetite and tolerance statements, lines of communication for cybersecurity risk, a standardized method for calculating and prioritizing risk, roles and resources that foster accountability, and oversight that uses results to inform and adjust strategy.

In the same document, Asset Management requires maintained inventories of hardware, software, systems, services, supplier services, data, authorized network communication, internal and external data flows, and life-cycle management. NIST doesn't ask for decorative cataloging here; just an operating model that can explain itself.

The same is true for exceptions, access, and operational drift: CSF 2.0 says access permissions, entitlements, and authorizations are to be defined in policy, managed, enforced, and

reviewed

, with least privilege and separation of duties built in. It also says that changes and exceptions are to be managed, assessed for risk impact, recorded, and tracked. Continuous monitoring guidance exists to provide ongoing assurance that controls remain aligned to risk tolerance, while security-focused configuration management requires documented change control, justification, testing, review, and security impact analysis.

So, taken together, that is a direct rebuke to any program that treats a control as “implemented” because the policy says so while the production workflow routes around it every day, and twice before lunch.

NIST’s incident-response guidance and risk-register guidance close the loop even further. CSF 2.0 requires that incident response plans and other plans affecting operations be established, communicated, maintained, and improved, and that improvements be identified from evaluations, tests, exercises, and operational execution.

SP 800-61 sharpens that by saying lessons learned should usually be shared as soon as they are identified rather than delayed until recovery is over. The 8286 series then describes risk registers as part of enterprise risk communication, response, and monitoring . . .not as a bunch of lonely spreadsheets maintained for auditors and then forgotten by operations.

If an incident happens, assumptions are supposed to move. If they don't, the paperwork may have closed, but the governance cycle did not.

The "seven conditions" here are one operating system

Order

is the question of whether the register still describes the world the business actually runs on. NIST’s risk-register guidance assumes documented scenarios tied to enterprise assets and objectives, while CSF 2.0 requires maintained inventories of hardware, software, systems, services, supplier services, data, and network/data flows. Privacy guidance adds the same demand in another accent: data maps are supposed to show components, owners or operators, data actions, and the specific elements being processed . . .so a register that can't be reconciled to those realities is not a risk view, just slideshow theater.

Orchestration

is the question of whether controls operate, not just whether they exist in a matrix. Continuous monitoring is supposed to provide visibility into control effectiveness, and configuration management exists precisely because environments change and controls have to survive that change through proposal, justification, evaluation, review, and impact analysis. CSF 2.0’s requirements for reviewed entitlements, maintained plans, and improvements from tests and operational execution all point in the same direction: a control that only works in the documented workflow is not a reliable control, but a "control-shaped suggestion".

Override

is the question of whether exceptions are governed or normalized, as CSF 2.0 now says specifically that changes and exceptions are to be managed, risk-assessed, recorded, and tracked. NIST’s risk guidance treats response as an intentional and informed decision to accept, avoid, mitigate, share, or transfer risk. ISO 31000 says essentially the same thing in its own vocabulary. . . .so the issue here isn't that exceptions exist.

Exceptions are normal in real enterprises, but the problem is when the exception path becomes the production path and everyone keeps calling it temporary because telling the truth . . .well, that would require a real decision.

Outcome

is the question of whether realized risk updates assumptions. SP 800-61 says lessons learned should usually be shared immediately and that continuous improvement is increasingly necessary. CSF 2.0 says improvements are to be identified from evaluations, exercises, operational execution, and the maintenance of incident-response plans. Mature organizations don't end up treating incidents as paperwork generators; but as evidence against prior assumptions. If an incident closes and the risk model, control design, plan set, or prioritization never changes, the organization learns nothing.

Onus

is the question of whether accountability is matched with authority. CSF 2.0 ties roles, responsibilities, authorities, leadership accountability, and resource allocation together. ISO/IEC 27701 places responsibility and accountability for PII processing on controllers and processors. The AI RMF playbook similarly calls for defined roles and responsibilities, monitoring responsibilities, incident-response responsibilities, and explicit differentiation of human oversight functions. Naming an “owner” without decision rights, money, access, or organizational leverage is not accountability, but blame, just pre-positioned for later political use.

Obsolescence

is the question of whether inherited critical systems remain "legible" enough to govern. CSF 2.0 says systems, hardware, software, services, and data are to be managed throughout their life cycles, and contingency-planning guidance ties system planning directly to resilience and recovery priorities.

Public-sector reviews from GAO make the risk super-concrete: critical legacy systems have been found operating on unsupported hardware and software, with known vulnerabilities, incomplete modernization plans, and in some cases gaps in knowledge and documentation severe enough that teams had to reverse engineer legacy interfaces after knowledgeable staff had left.

Old systems don't become less critical because the people who understand them retired; they become more dangerous because the organization keeps depending on them anyway.

Overhaul

is the question of whether structural risk is actually being treated. NIST risk guidance describes response as deliberate choice (accept, avoid, mitigate, share, or transfer) and the 8286 series ties that choice to enterprise objectives and prioritization. GAO’s modernization work is a useful public reminder that “we have a roadmap” is not a treatment: agencies repeatedly lacked complete modernization plans with milestones, required work, and disposition of the legacy system, even while those same systems stayed critical, costly, and exposed. A roadmap that never has to touch the architecture is just deferred decision-making with cool PowerPoint lighting.

Where governance breaks down in practice

This gap shows up in the same old places . . . over and over again.

ISACA’s own writing on audit outcomes notes that findings are sadly repetitive . . .exceptions, deviations, control gaps, separated users still retaining access, and the same issues resurfacing year after year. The access example tracks because it illustrates the larger pattern: organizations often have identity policies, approval paths, attestation cycles, and named owners, but regular review and operational follow-through are weak enough that stale entitlements survive anyway.

The same thing happens with policy and exceptions: ISACA also points out that security policies become liabilities when they aren't updated, don't reflect operational reality, or fail to permit managed exceptions and compensating controls. That's an important point because a lot of governance work still assumes the failure mode is under-documentation.

Quite often the opposite is true, though: the organization has a bunch of documents, but they're old, rigid, ambiguous, or mismatched to the environment, so people route around them until the policy becomes a dead letter with branding.

This is also why baseline operational guidance keeps on insisting on inventories and monitoring. CISA puts Asset Inventory at the front of its Cross-Sector Cybersecurity Performance Goals, and its ransomware guidance tells organizations to understand and inventory their IT assets, logical and physical.

Newer CISA material on the CPGs explicitly ties maintained inventories to resilience, downtime reduction, recovery, defenses, and preparedness.

That's not glamorous GRC work, which is probably why some programs try to skip it.

Vendor governance suffers from the same performative thing: ISACA’s vendor-audit guidance emphasizes risk-ranked vendor assessments, continuous evaluation of critical vendors, KPIs, independent assurance review, monitoring of deviations or exceptions, and corrective remediation.

NIST supply-chain guidance likewise requires multilevel integration of third-party risk into strategy, policy, assessments, and life-cycle management.

If third-party assurance amounts to collecting artifacts, filing questionnaires, and pretending the PDF itself reduced the exposure, what the organization has isn't vendor governance, but document gathering.

Why the problem now extends beyond classic security

Privacy governance makes the same demand for reconciliation, just with different nouns. NIST’s Privacy Framework describes the data processing ecosystem as the complex and interconnected relationships among entities involved in creating or deploying systems, products, services, or components that process data, and it also says profiles can be used to express privacy requirements to external providers and that data maps should show the components involved, their owners or operators, and the discrete data actions and elements being processed.

ISO 27701 extends ISO 27001 into a privacy information management system and explicitly centers accountability for PII processing.

In other words, privacy maturity isn't “having a notice.”, but being able to reconcile actual processing with roles, controls, evidence, and obligations.

And, of course, AI . . .AI governance hasn't changed the pattern, but it certainly has accelerated it.

NIST’s AI RMF is built around Govern, Map, Measure, and Manage, and the playbook says AI governance should connect to existing governance and risk controls, align to broader data-governance policies, document risk mapping and measurement, define monitoring, auditing, change-management, and incident-response processes, inventory AI systems, differentiate roles and responsibilities for oversight, include third-party systems, and establish decommissioning policies that account for dependencies, business continuity, and migration.

ISO 42001 makes the same move by defining AI management as a structured set of policies, processes, and controls with risk management, monitoring, data governance, and continual improvement.

So yes, AI governance is “new” in the same way a faster leak in your kitchen is new: it stresses the same plumbing failures you already had to begin with (also, if your data governance is poor or non-existent, creating an AI governance role won't solve anything).

What mature GRC really looks like

Taken together, all of these frameworks and public findings suggest a much less romantic definition of maturity than the market (or marketing material) usually prefers, as "mature GRC" isn't primarily the ability to map frameworks to controls, produce better decks, or maintain a beautifully normalized control library.

Rather, it ends up being the ability to keep multiple representations of "reality" from drifting apart: the asset inventory, the data map, the risk register, the workflow, the entitlement model, the exception log, the incident record, the owner model, the vendor view, the contingency assumptions, and the modernization plan.

When all of those artifacts keep describing the same world, governance is alive and doing its job, but when they stop, maturity starts to rot even if the certification banner still looks excellent in the lobby.

In practical terms, that means a mature program can show (not merely claim) that inventories are maintained and prioritized by criticality; data flows and processing maps match actual service delivery; access permissions are reviewed against real identities and duties; changes and exceptions are risk-assessed, recorded, and tracked; control effectiveness is monitored over time; incident response changes plans and assumptions; owners have authority and resources commensurate with responsibility; suppliers are known by criticality and monitored across the relationship; and systems are governed through their life cycles, including contingency planning, decommissioning, and replacement when response options require structural change.

That's a mouthful . . .and that's a far higher bar than most vendor brochureware wants to admit, but it's also the only bar that matters once the operating environment starts pushing back.

That's why these "seven conditions" belong together . . .these shouldn't be seen as seven isolated annoyances for auditors to rediscover in rotating sequence.

Instead, they end up as seven recurring signals that the organization’s map, controls, owners, evidence, and machines have drifted out of alignment.

The point here is that the frameworks are still useful, precisely because they keep telling you where to look.

The failure usually occurs later, in the familiar gap between the framework and the operating environment, where too many programs settle for documented "intent" and call it governance and risk management.

Alignment, by contrast, isn't documentation . . .but continuous reconciliation.
