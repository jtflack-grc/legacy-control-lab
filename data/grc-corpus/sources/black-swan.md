# Black Swan, Green Screen

Source: https://www.linkedin.com/pulse/black-swan-green-screen-john-flack-doyce

# Black Swan, Green Screen

Of HILP Events, Tail Risks, and the Myth of System Uptime

Oh, that box hasn’t been rebooted in a while . . .it just runs

”: the compliment we’ve all heard while working in an IBM i shop.

Managers and administrators sometimes say it with pride, relief, and maybe some superstition, ‘cause after all, that system runs payroll, claims, orders, inventory

and

financials!

It still runs the strange, elderly, business-critical process that nobody has fully documented but

absolutely

must complete before 4:00 a.m. because sixteen other things are reactive jobs expecting its output.

And, to your IBM i’s credit, it usually does run, right?

A well-run environment can be incredibly stable; in most organizations, your IBM i partition isn’t the part of the estate that wakes everyone up every Tuesday morning with a fresh batch of system-related mess.

But that sentence . . . “

the system just runs

” . . .is the compliment

and

the warning, as reliability isn’t resilience.

Reliability means the system usually works, but resilience means the organization can anticipate, absorb, recover from, and adapt to disruption.

Again, those aren’t the same thing, as much as we’d all like them to be.

Your system can run for years and still have weak evidence around recovery; it can have legendary uptime and undocumented dependencies, and backups that always complete (but restores that nobody has tested end-to-end).

You can have high availability software installed and still have no clear proof that failover works under actual business conditions, and monitors that stay green while the business process bleeds out red on a Sunday morning.

This is where the risk lives: not in the fragility of the platform, but in the confidence the platform creates.

Sometimes It’s Just a Neglected Goose

To get this out of the way, “high-impact, low-probability” (HILP) events, “black swans”, “tail risk”, and “normal accidents” aren’t new concepts, nor should they be presented as net-new to an IBM i-centric organization. Look into a new security vendor if they are.

Risk analysts have been talking about these ideas for a long time.

These terms matter, but they are often mashed together in ways that make everyone sound smarter while making the actual risk picture fuzzier, so here’s a simple distinction that clears the marketing aura around how these are presented:

So, this table may look like risk-management housekeeping and make your eyes start to glaze over, but I promise you it matters: if you (or said security vendor) end up calling every ugly outage a “Black Swan”, you’re also giving yourself permission to act surprised by things that you probably should have governed.

A true “Black Swan” is supposed to be rare, severe, and difficult to imagine beforehand . . .but many of the IBM i scenarios that get wrapped in rare-event language are not unknowable.

Instead, they’re known dependency failures, recovery gaps, support issues, documentation rot, or staffing fragility, and sometimes the “unknown unknown” is just a known dependency nobody documented, and your black swan is just a neglected fat goose wearing a silly cape.

Give Your IBM i Its Due

IBM i has real resilience-relevant strengths: the database is integrated into the platform. Journaling can support audit trails and forward/backward recovery, BRMS can support disciplined backup and recovery management, and PowerHA and other HA/DR approaches can support failover and recovery.

The platform isn’t some mysterious black box full of the

13 Ghosts of Scooby-Doo

and a green-screen terminal.

You’ve got plenty of telemetry, controls, and structure, but the disconnect, though, is that your capabilities aren’t your evidence, and having a backup tool is not a recovery strategy.

Keeping journal receivers isn’t really proof that every critical object is protected correctly.

Your uptime is an outcome, but your recovery is a

control

The better way to think about IBM i resilience is not “the box is reliable”, but a bit like this:

That picture is the part folks tend to forget.

Your business doesn’t depend on “the IBM i” in the abstract, but business processes that happen to run through IBM i applications, Db2 for i data, jobs, queues, subsystems, file shares, network paths, storage layers, authentication paths, and human beings who know which message in QSYSOPR/QSYSMSG is boring (and which one means everyone is about to have a really crappy Tuesday afternoon).

So, yeah, your platform may be robust . . .but the actual IBM i estate may not be.

Your platform can be technically reliable while the organization operating it is operationally fragile . . .and that sentence is the crux of this whole article, really.

Operational resilience isn’t an IBM i platform attribute, but a management discipline.

Don’t let someone get away with just asking, “Well, has the system failed recently?” and then crossing their arms in a smug sort of way.

The second-level questions that should follow:

Can we recover it?

Can we

prove

we can recover it?

Do we know what depends on it?

Do we know what it depends

Do we know who owns the response when the problem is degraded service rather than a clean outage?

Do we know what happens when the one person who knows the batch chain is unavailable?

Do we know whether the restore process meets the business RTO, or do we just know the backup job ended normally and sent someone an email?

Your backups are evidence of intent, but an actual successful restore is evidence of capability, and to your risk and audit folks . . .those are very, very different forms of evidence.

Plausible IBM i HILP Scenarios

The scenarios below are the ones worth caring about because they are severe, plausible, and often under-governed. Most don’t require your data center to go up in flames, or a meteor strike . . .this is just ordinary operational debt meeting a bad day.

That very last scenario is the one everyone likes to joke about with legacy platforms, but institutional-memory failure doesn’t look like a technical risk at first.

It usually looks like staffing, documentation, succession planning, or someone just saying “Oh, Steve knows that.”

And, right now, yes . . .yes, he does.

He knows where the job schedule gets weird at month-end, and that the third message in the system operator chain matters and the first two are auto-reply.

But Steve is also not a control.

What Uptime Proves (And What It Doesn’t)

Of course, that big uptime number proves something: that the production path has been stable enough to keep operating.

But uptime doesn’t prove restore capability, failover readiness, dependency awareness, or that the business can operate in degraded mode.

It also doesn’t prove that auditors will get clean evidence after an incident, or that the HA runbook works when the person who wrote it is playing Diablo, retired, sick, or no longer answering texts from former coworkers.

And, this is the catch-22 of the platform: the better it performs, the easier it becomes for someone to stop proving the harder things like recovery, ownership, and dependency mapping.

Until one day that “rare event” arrives, and the organization discovers that the real outage began years earlier, when the documentation stopped changing because “it was just the same DR runbook over and over”.

Normal Accidents in a Platform . . . That Rarely Acts Normal

Charles Perrow’s normal accident theory (“

complex and tightly coupled systems are prone to inevitable accidents”

) is helpful here, not because your IBM i is a fragile snowflake, but because modern enterprise systems are tightly coupled

and

interactively complex.

A modern IBM i estate may involve Db2 for i, RPG or COBOL applications, Java workloads, web services, APIs, EDI, identity providers, DNS, certificates, Windows file shares, storage systems, HA replication, job schedulers, reporting platforms, downstream cloud services, vendor applications, and a few “temporary” interfaces from 2004 that have reached a state of archaeological permanence in your data flow.

So, what we’re just described isn’t “the AS/400”, but a living dependency graph.

In tightly coupled systems, small delays can become large failures: a storage latency issue can slow transactions; transactions can hold locks; locks can stall jobs, and jobs can back up.

Consequently, queues can build, and upstream systems can keep feeding new work because nobody told them they should stop.

And, as downstream processes time out, your support teams can look at their respective dashboards and say the immortal words:

“Well, everything looks fine on our side.”

Of course it does . . .that’s how the bad ones work!

Failure doesn’t always live in a component, but sometimes in an interaction instead.

This is why your resilience work can’t be reduced to simply coasting on platform reputation; instead, it has to be mapped through process, dependency, recovery path, and decision ownership.

Enter: The “AI Anomaly” Detection Temptation

Of course, now there’s a new wrinkle with all this, the current favorite spell of a lot of vendors for IBM i and elsewhere: the concept of AI anomaly detection.

This can be useful . . .time-series analysis, log analytics, behavioral baselines, and pattern detection can help find weak signals that traditional threshold-based monitoring misses.

IBM i has a bunch of telemetry families: jobs, job queues, subsystems, QSYSOPR messages, history logs, disk status, journaling and audit-related activity, file shares, PTF posture, performance collections, authority changes, and configuration state, and a serious observability layer could absolutely help make those signals more visible and more actionable.

This is where we must separate detection and governance: your AI can help detect deviations pretty easily, but just like with most of the challenges of AI governance there are several things it can’t do:

It’s not going to define ownership, validate recovery, decide whether a batch backlog matters to billing, claims, logistics, or payroll, or know that a particular message is all-hands-on-deck unless somebody has mapped the business context.

You can’t machine-learn your way out of undocumented ownership (that line is not anti-AI by any means, it’s just “pro-reality”).

AI anomaly detection is valuable to your team

only

after the organization knows what normal looks like, what abnormal means, who owns the response, what action should follow, and what evidence should be retained.

Otherwise, it’s a very neat-looking and expensive way to produce alerts nobody trusts.

Here’s the basis of a practical version:

The main phrase in that table is “preconditions”, and is gonna be where your vendor marketing walks past this table while whistling.

You need baselines, clean telemetry, context, owners and escalation paths.

More importantly, you also need someone who can tell the difference between “interesting deviation” and “call all the people now.”

AI may help, but it’s not the control . . .which is the governed process around it.

What Mature IBM i HILP Readiness Looks Like

If someone asks your team about your IBM i resiliency strategy, there’s no need to respond with a defensive “we’ve never had a problem.”

It all comes down to evidence, and doing some upfront work:

This is the kind of framework and control work that sucks, and there’s no need to sugar coat it: no one is going to invite you to give a keynote titled “

We Finally Found the Restore Procedure and Updated the Certificate Inventory!”

But this is the work that means you don’t get late-night surprises, because the mature version of IBM i resilience isn’t some dramatic invocation of tail risk, just a repeatable evidence cycle.

The exact cadence will vary by organization, industry, workload, and risk appetite, as a bank, healthcare processor, or manufacturer may not need identical frequencies.

That said, they all still need the same principle: don’t wait for the rare event to discover whether the recovery story you’ve been telling everyone is real.

The Problem With “Black Swan Theater”

The doom-and-gloom of black swan language can help sometimes when it shakes people out of complacency, and it can create room for scenario analysis, stress testing, and contingency planning.

But it can also become a very distinct form of risk cosplay, and then “Black Swan” becomes a sophisticated way to avoid ordinary governance questions (and not a Natalie Portman psychological thriller) that need to be asked.

An example:

What if our IBM i fails?

An interesting, but flat, question.

What if our restores don’t work?

More cutting.

What if the restore works, but we miss the business recovery window?

Now we’re in “very interesting” territory, and starting to circle around outside of the IBM i.

What if the failover product exists, but the application team has never validated the workload after failover?

As we dig down . . .now we’re getting somewhere.

So, wait, the IBM i part is somewhat self-contained, but the business process depends on DNS, certificates, identity, a Windows share, an EDI gateway, a vendor API, and one person named Steve?

There it is!

Now we can see that this particular thing isn’t a black swan, just a map nobody bothered creating . . .so this means that a lot of “rare event” risk isn’t mysterious once the dependency chain is visible.

Oh, the event may still be rare, severe, and hard to predict in exact timing and sequence, but at this point, after asking all these second and third level questions . . .it’s not something that’s “unknowable”.

That now makes it governable.

The Real IBM i Risk Question

So, we need to step away from “what if the IBM i fails?”, as that frames the platform as the problem.

(And, yes, sometimes it might truly be, since hardware and storage fail, and IBM firmware can ship with defects . . .disasters happen).

The more pointed question is usually “what business process fails if this IBM i workload degrades, and can we prove we can recover it?”

That kind of thinking changes everything, as now you’ve forced a

service

view instead of a

server

view, which in turn makes RTO and RPO tied to business outcomes rather than infrastructure folk tales.

It means you start looking at dependency mapping, restore evidence, and your HA system validation.

It also forces your organization to confront whether IBM i resilience is an operating capability or just a security blanket. No IBM i shop needs risk marketing theater, but instead requires mature risk management and leaders that will live with the results that come from owning that risk, and knowing “it’s always worked” isn’t the same as “we can prove it will recover.”

None of this stuff diminishes the reliability of the IBM i platform: if anything, it respects the platform enough to start governing it seriously.

IBM i has carried critical business workloads for decades, but the qualities that make it dependable can also make it invisible, and invisible systems inside your organization tend to accumulate invisible risk and debt.

“The system just runs” isn’t a resilience strategy by any stretch of the imagination, so take it for what it is: both a compliment

and

a warning, and act accordingly.
