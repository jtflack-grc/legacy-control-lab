# Don't Blink. OT Security and Enterprise IT's Eyes Wide Shut

Source: https://www.linkedin.com/pulse/dont-blink-john-flack-otnoe

# Don't Blink. OT Security and Enterprise IT's Eyes Wide Shut

OT Security and Enterprise IT’s “Eyes Wide Shut” Tendency

Before we get too far into it, I realize that an IBM i isn’t a PLC . . .and it doesn’t open breakers, regulate chemical dosing, control a turbine, or move a robotic arm across a manufacturing floor.

However, after spending time this past weekend with SCADA, zones/conduits, and operational continuity, I kept running into some

really

familiar tropes.

Not the same technology . . .but exactly the same kind of “pressure”.

The organizational habit of trusting a system because it’s kept running, with that same devil’s bargain between availability and fear and that uneasy comfort around platforms that nobody wants to touch.

OT/ICS environments are built around physical consequence, and IBM i environments are usually built around business consequence.

Those aren’t the same thing, and they shouldn’t be treated as if they are. . . but both worlds know something about systems that are expected to be there every single morning.

OT security offers a vocabulary IBM i governance (and enterprise IT governance in general) needs: architecture before assumption, conduits before convenience, evidence before confidence, and resilience before the reassuring thought of “up-time”.

Taking the discussion to “the floor”

In ordinary enterprise IT, it’s easy to drift toward tools: SIEMs, EDR, dashboards, alerts, vulnerability scores, IAM workflows, patch reports . . .all necessary, but capable of becoming abstract.

OT pulls that entire discussion back down to the floor:

What does this system control?

What happens if it stops?

What happens if it keeps running, but incorrectly?

Who is allowed to touch it?

Can we observe it without disturbing it?

Can we recover it without making the incident worse?

Can we prove what happened after the fact?

Those questions belong in a plant, a substation, a water utility, or a pipeline control environment, but they also belong in an IBM i shop running claims, finance, inventory, billing, distribution, healthcare workflows, or policy administration (not to mention the rest of your infrastructure).

IBM i administrators already live with these questions, but you often meet them one platform task at a time.

An occasional QSYSOPR message, the stray QAUDJRN receiver, or a security value nobody wants to change during business hours . . .or maybe a disaster recovery test that proves the system can be restored, but not necessarily that the business can continue.

IBM i / OT boundaries

Operational technology exists to monitor or control physical processes, and lives where digital decisions can become mechanical movement, pressure changes, chemical dosing, electrical switching, temperature shifts, production changes, or safety consequences.

IBM i security is documented through system values, user profiles, object authority, adopted authority, resource security, audit journaling, message queues, TCP/IP services, and application-level access patterns.

And while it’s an enterprise platform and not a control system, there’s still a shared governance pattern: systems become trusted because they keep working, your trust becomes cultural evidence, and then your cultural evidence becomes a substitute for control evidence.

In OT, there is no hand-wave of “the equipment has been running for years” like some IT organizations tend to try to do with the IBM i.

The “serious answer” in OT involves segmentation, zones, conduits, passive visibility, safety requirements, failover, incident response, recovery procedures, and evidence that can survive scrutiny.

There are quite a few IBM i shops that should borrow that kind of seriousness, as their environments aren’t fragile because the platform is weak, but because their organization has allowed reliability to become a story it tells itself instead of an actual claim it can prove.

From Purdue levels to IBM i boundaries

The Purdue Model isn’t an IBM i model, and pretending otherwise would be a stupid idea. However, the value here isn’t a literal mapping, but the discipline of separating functions, trust boundaries, and traffic flows that it does.

OT teams are trained to think in levels and zones because a control environment can’t be governed as one big old network of important things, and exactly the same principle applies to IBM i.

Too many places still treat IBM i as “the box”, but there’s no such thing as just “the box” from a governance perspective.

There are users, administrators, vendors, integrations, and adopted authority paths that may have more practical power than many people realize.

No background details here: these are conduits . . . and, as conduits, they deserve owners, controls, monitoring, and evidence.

The simplified mapping below is conceptual, and not “IBM i as a PLC”, but to show the platform as a critical environment with explicit paths in and out.

The takeaway here is that we shouldn’t let “IBM i” remain a single noun when it’s actually an operating environment, a data environment, an access environment, an integration environment, and an evidence environment.

Zones, conduits, and the myth of familiar access

In OT, ISA 62443 uses the language of

zones

and

conduits

, where a zone groups assets with similar security requirements, and a conduit defines communication between zones.

Now, let’s look at a few examples on the IBM i: a mapped drive to the IFS isn’t just a simple mapped drive, a service profile isn’t just how the job runs, and an exit point without active governance isn’t just a “technical detail”.

These are pathways through which trust actually moves.

IBM i has always had strong internal security mechanics when they are actually understood and used well: object authority, adopted authority, system values, auditing, exit programs, authority collection, and resource-level control.

Modern IBM i risk doesn’t live only inside the platform, but at the boundary between the platform and everything now attached to it.

So while the “IBM i box” may be stable, the surrounding world sure as heck isn’t. That’s the lesson OT keeps teaching over and over . . .that the boundary is part of the system.

The segmentation view below adapts zones-and-conduits thinking to IBM i, and deliberately places integration and vendor access outside the production partition boundary, because that’s usually where many governance failures begin.

This is the IBM i governance conversation I wish more organizations were having.

Not “so, is the platform actually secure?” (which is so broad that it’s not even a useful question to answer), but instead:

Which conduits exist?

Which ones are necessary?

Which ones are monitored?

Which ones bypass normal application controls?

Which ones touch sensitive objects directly?

Which ones depend on old assumptions about network trust?

Which ones would become incident response priorities if something went wrong at 2:07am?

We aren’t trying to cosplay as operational technology here: this is just basic governance with better nouns than we usually get to use.

The concepts that transfer

There’s no need to get too deep here into OT terminology, as we don’t need DNP3 to explain adopted authority, or a PLC to care about batch integrity.

What

does

transfer over well is the operating discipline:

That table is pretty much the whole article in a nutshell: OT security asks us to see systems through dependency, boundary, and consequence, and IBM i governance should do the same.

Reliability is memory, resilience is evidence.

Reliability ends up as an untrustworthy inheritance when it turns into a reason not to ask new questions.

Like we talked about in an earlier article around HILP and “black swan” events, we know a system can be stable, reliable and run for years while still being weakly monitored, poorly segmented and never proven to have done an actual recovery exercise.

OT security is utterly ruthless about this (in a way enterprise IT usually isn’t) in that the organization understands what the system depends on, what depends on it, what happens when it fails, and what evidence exists when the story must be reconstructed under pressure.

Enterprise IT (and your IBM i’s) governance needs that same ruthlessness, as your critical business systems need more than just kicking the technical debt can down the road and crossing your fingers.

Incidents as parables, not props

For the OT folks reading, these are old hat . . . the Colonial Pipeline ransomware incident from years ago is one of the more “famous” OT stories, but part of its enduring importance is that enterprise-side compromise produced operational disruption.

Whether the physical process environment was directly compromised isn’t the only governance lesson here, it’s more that business systems and operational services can fail together when dependency, architecture, and response decisions collide.

For IBM i leaders, that should land awfully close to home.

A back-end system of record may not be the original point of compromise, or even be the most technically vulnerable component . . .but if the surrounding business process, access layer, file exchange, reporting tier, or identity path fails, the platform’s own stability may not save the service.

The Oldsmar OT incident tells a different story: weak remote-access governance in a small water facility created a situation where a consequential change was attempted through a remote path, and human attention became the last line of defense.

The IBM i analogue isn’t chemical dosing, but vendor access, privileged sessions, administrative tooling, and the normalization of remote convenience.

That’s the same architectural lesson OT has been trying to teach for years: business-facing layers and critical back-end layers should not be treated as one flat trust space (honestly, you need to Zero Trust all the things, anyway . . .but that’s another article).

And there are plenty more are resilience stories closer to IBM i itself, like disaster recovery plans that look better on paper than they actually behave in reality:

Your media backups aren’t

recovery

, and recovery isn’t

continuity

, nor is continuity actually

resilience

. . . and each word in that chain asks for more evidence than the one before it.

That’s the kind of sentence an OT person understands immediately, and IBM i shops absolutely should too.

What IBM i shops can do

The first move is not exotic: start with the IBM controls that already exist.

QSECURITY, user profiles, audit logs . . .the system isn’t lacking the mechanisms, but the gap is often that the mechanisms aren’t connected into a governance model.

In practice, that means running at IBM’s recommended security posture, reviewing security values, treating adopted authority as a privileged pathway rather than a programming convenience, and using authority collection and audit evidence to shrink access to what the application actually needs.

It also means treating every exposed service you see as a conduit.

NetServer shares need owners, ODBC and JDBC access need control beyond “the users can’t get to a menu option”, and ACS and administrative paths need stronger auditing than “the admin knows what they’re doing.”

This also means raising the quality of evidence before an incident makes evidence urgent.

QAUDJRN isn’t just “legacy logging” to dump somewhere: it’s one of the platform’s closest equivalents to an event historian.

QSYSOPR and QSYSMSG aren’t operational leftovers, but part of the system’s narrative memory, and if those signals are not monitored, preserved, time-aligned, and correlated with surrounding telemetry, then the organization may have a system that runs beautifully and still can’t explain itself when something goes wrong.

That doesn’t end up logged as a technical failure when it happens . . .but a governance failure instead.

Response playbooks (for systems everyone assumes will just “be there”)

OT teams rehearse often because improvisation under pressure is a terrible idea; your IBM i team should borrow that exact instinct.

At a minimum, write and rehearse response procedures for a few high-consequence scenarios:

Compromised privileged profile

Suspicious adopted-authority activity

Unexpected changes to security values

IFS ransomware or malicious file modification

Bad NetServer share change

Vendor remote-access misuse

Unauthorized ODBC/JDBC data access

Failed overnight batch with downstream business impact

HA/DR failover where technical recovery and business recovery diverge

The first question in those playbooks should never be “who do we call?”, but, just like with any modern incident response: “what evidence must we preserve first?”.

The timeline below shows what forensic discipline looks like on IBM i in practice: preserve, reconstruct, contain, and validate.

This is boring, but essential work, and the difference between an organization that can say “we think this happened” and one that can say “here’s the timeline, the evidence, what we contained, what we restored, and what we changed.”

That’s what mature governance looks like during a crisis.

Borrow the ATT&CK “habit”, not just the matrix

MITRE ATT&CK for ICS gives defenders a shared way to reason about adversary behavior in operational environments. IBM i doesn’t have an equivalent mainstream matrix, but the habit itself is transferable.

Ask how you would detect:

Credential abuse

Remote-service misuse

Unauthorized command execution

Abnormal adopted-authority activity

Suspicious IFS modification

Unusual NetServer access

Privileged profile changes

Unexpected service configuration changes

Destructive impact on batch or business processing

A risk register that says “unauthorized access”, or a maturity assessment that says “monitoring exists” isn’t enough here: show the path, detection, evidence, and the response.

What this means for GRC

A lot of IBM i risk gets flattened into phrases like “legacy platform,” “core system,” “mainframe-like,” or “back-end application”, none of which force enough architectural precision.

However, using OT language does.

Zones, conduits, critical functions, and operational continuity give GRC something better than a checklist; it provides a way to ask whether the organization actually understands the system it claims to govern.

If you work in regulated industries, this matters even more: financial services and healthcare organizations don’t merely need systems that run, but ones that can be defended to auditors, regulators, examiners, customers, members, patients, partners, and boards.

They need evidence that access was controlled, changes were managed, recovery was tested, and critical services were not resting on unexamined trust.

IBM i is often very good at being the “system of record”, but the question is whether your organization is equally good at creating a “record of the system”.

The systems that “don’t blink”

OT infrastructure and midrange/mainframe systems may sit in the background while the rest of the organization changes around them: executives rotate through, vendors re-brand, and consultants discover words the operators have been living for twenty years.

The lesson from OT is not that every legacy system is a control system, but that real operational dependency deserves real operational evidence.

IBM i shops don’t need to pretend they run substations to learn from OT security . . .just to admit that some business systems are too important to govern casually.
