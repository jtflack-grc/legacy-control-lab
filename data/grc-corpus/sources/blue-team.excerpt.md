# Can You Blue Team an IBM i?

Source: https://www.linkedin.com/pulse/can-you-blue-team-ibm-i-john-flack-w5bse

# Can You Blue Team an IBM i?

. . . a semi-definitive guide.

Welp.

The red-team exercise is now over, the report is in, and the war room finally stopped pretending that the IBM i was outside the blast radius of enterprise security.

Looks like the testers found reachable services, authority paths, over-trusted administrative surfaces, IFS exposure, and enough platform-specific weirdness to make everyone acutely aware that the box still runs business-critical work.

Great!

Now for the actual question:

would anyone have seen it?

Not in the abstract, eventually, after a user calls the help desk because the claims queue is acting funny, the mapped drive is full of strange files, or a batch process suddenly decides to start exfiltrating your payroll data to

xyz123s00perhax.liveh@x.kom.

I mean: would your blue team have seen the activity while it mattered, understood what it meant in IBM i terms, preserved the right evidence, and known what to contain without turning a critical business platform into Swiss cheese?

So,

can

you blue team an IBM i?

Sure (this would be a short article if you couldn't).

But you can’t do it by pretending IBM i telemetry looks like Windows event logs, Linux syslog, cloud control-plane noise, or whatever your EDR happens to call sus this week.

Your IBM i isn’t silent: the platform has native security controls, durable activity records, authority-aware evidence, job and session telemetry, SQL-accessible services, IFS visibility, exit-point governance, administrative function controls, and a set of journals that can tell a great story

your SOC is trained in how to read it.

The problem isn’t that an IBM i can’t be monitored, but that many organizations have never built an IBM i detection model.

Oh, they have a SIEM, a SOC, an incident response plan . . .but a vague hope that anything important on the midrange box will somehow look enough like the rest of the data center to get noticed.

Hope ain’t controls.

In the red-team piece before this, the core argument made was that the attack surface is authority.

For blue teaming, the mirror image is just as (if not more) important: the defensive surface is visibility.

On your IBM i, detection starts where authority, jobs, services, objects, shares, and administrative control planes intersect: if you can’t see those relationships, you’re not blue teaming the platform, you’re just collecting fragments.

Platform model: what are we trying to see?

First, know what you are defending here: your IBM i is not just an operating system with a database nearby and a green screen hanging off the side for nostalgia, but an integrated platform where identity, object authority, database access, job execution, file systems, administrative tooling, and business applications are tightly braided together.

That design is why generic blue-team thinking gets real weird so quickly.

On a more familiar endpoint-centric platform, the first instinct may be to ask which process ran, which binary changed, which registry key flipped, or which endpoint alert fired.

Those questions still have conceptual analogues on IBM i, but they aren’t enough . . .a defender also has to ask who the user profile was, what group profile or supplemental group authority applied, what object authority existed, whether *PUBLIC could touch the object, whether authority was adopted, which job or subsystem context was involved, which interface was used, and whether the action was normal for the business process.

That’s an entirely different defensive grammar, altogether (and don't call me Shirley).

It’s also a better one than most folks assume, because IBM i was built around durable authority and object relationships long before everyone rediscovered the word governance and put it on a neat slide deck.

The blue-team surface starts with several questions at once: who could do this by design, where did they come from, what job executed the work, what object or path changed, what service or administrative plane was used, and what evidence survived long enough for the organization to answer those questions under pressure?

The “real-real” IBM i blue-team methodology

Just like with the red-team side, a credible IBM i blue-team methodology has to be iterative and release-aware.

Don’t start with a dashboard here; instead lead with scope, configuration, and the platform’s own vocabulary.

What release and Technology Refresh are in use? What PTFs are current? Which licensed programs are installed? Which services are enabled? Is Navigator in play? Are users connecting through IBM i Access, ACS, ODBC, JDBC, DRDA, Telnet, FTP, SSH, NetServer, or some wacky combination of all of the above because the environment has been adding access paths since the first Bush administration?

Once your surface has been defined, the next question is around identity and authority, and your IBM i defense lives or dies here: user profiles, group profiles, supplemental groups, special authorities, authorization lists, object ownership, function usage, service profiles, job descriptions, and adopted authority all need to be baselined.

If red teams are going to look for places where the system intentionally delegates too much authority, blue teams must know what normal delegation looks like before they can call anything abnormal.

Then the team has to decide what evidence is supposed to survive: QAUDJRN (journals) strategy, journal receivers, retention, history logs, job logs, message queues, IFS metadata, scheduled-job inventories, system value snapshots, and SQL-service extracts aren’t just paperwork, but the difference between a defensible reconstruction and a conference call full of important people saying, 'We think it was fine.'

Why does this matter?

Well, IBM i activity is often job-centered rather than process-centered in the way many SOC analysts expect. The blue-team workflow has to preserve the IBM i entities that explain the event: profile, group, job number, job user, job name, subsystem, object, library, path, share, exit point, function usage ID, journal receiver, and administrative interface, so if those get flattened into generic username, hostname, and file path fields, the SIEM may technically ingest the event while losing the meaning.

Native telemetry and defensive surface inventory

The shortest description of IBM i telemetry is this: don’t start the conversation with 'what agent can I install?' but with '

what does this platform already know

Your box can already tell defenders quite a lot about users, authorities, jobs, network sessions, IFS objects, exit points, schedules, shares, system values, journal activity, and administrative posture.

IBM i Services and SQL Services make much of that information accessible through QSYS2 views and functions, which means a blue team can build repeatable evidence collection without treating every investigation as a green screen “back in my day” hunt.

So, once you poke around here some, the platform becomes more interesting than its traditional security reputation, since your IBM i exposes both state

and

activity.

State shows who exists, what they inherit, what they own, what they can touch, what services are configured, what shares exist, what functions are allowed, and what the system thinks its security posture is.

Activity shows who signed on, what jobs ran, what sessions existed, what objects or files changed, what messages were produced, and what the audit journal retained.

Your blue-team program needs both: state without activity gives you a static access review, and activity without state gives you noise without interpretation.

The value appears when the two are correlated (get ready for preposition overload): a profile acted,

through

a job,

over

a service,

against

an object or path,

under

an authority model that was either expected, excessive, inherited, or newly changed.

Behavior-to-signal mapping and detection engineering

Good IBM i detection programs also don’t start with eleventy-billion alerts . .instead, it begins with behaviors:

What would misuse look like on this platform?

What would privilege drift look like?

What would ransomware through a mapped IFS share look like?

What would an overbroad administrative plane look like?

What would database access bypassing application logic look like?

What would quiet persistence look like when the mechanism is a scheduled job or startup change rather than a startup folder or suspicious service install?

Your blue team then maps those behaviors to the most native observable available, so that usually means correlating authority and job context with audit journal entries, SQL-service state, object metadata, network/session data, IFS information, exit-point registration, function usage, and schedule or startup configuration.

A single signal may not be dramatic here, as a profile used from an expected source, a job appearing in a normal subsystem, or a file changing in the IFS may be harmless.

But . . . profile + job + network session + object authority + share exposure + journal evidence can become a very different story.

And, to be frank, this is where SOC programs end up making mistakes with the platform: everyone wants a generic detection that says, 'malicious IBM i activity detected,' as if the platform will send up a giant flare labeled “BAD STUFF HAPPENING” with the MITRE technique and a recommended remediation script.

That‘s not how this works, and why there’s so much “black box” mysticism around it.

IBM i detections usually become high-quality when they are specific to the authority model and the business process, it’s not just a case of “something happened”, but whether this profile, through this interface, in this job context, had any legitimate reason to touch this object, share, service, function, or authority boundary.

Conceptual detection chains

With an integrated platform, defenders should think in chains rather than isolated alerts (this doesn’t mean go all IASIP Charlie Kelly conspiracy theory and building out an entire board every time a user mistypes a password).

So, now, we’re understanding that the evidence becomes meaningful when platform relationships are preserved.

One chain is the identity chain: a profile is used, a job appears, the network session ties to that job, object or share access follows, and authority review explains whether the action was expected. That chain is the defensive mirror of the red-team authority path in the last article: if an attacker tries to live inside normal authority, the blue team has to know what normal authority looks like.

Another chain is the “file and share” chain: a share exists, the share becomes reachable, IFS objects experience a concentration of changes, locks, or open-file activity, jobs touching those paths are identified, and containment focuses on the user, share, job, or path boundary before someone panics and disrupts the broader platform.

This is especially important because IBM i ransomware discussion often centers less on native Db2 object corruption and more on the IFS behaving like an enterprise file surface attached to Windows clients that may treat it as an open-door.

A third chain is the administrative chain: function access is granted, Navigator or serviceability capability becomes reachable, TLS or truststore configuration changes appear, high-authority action occurs outside the normal workflow, and function usage plus job and network context determines whether this was sanctioned administration or risky misuse.

ACS and Navigator (client connection and web client for IBM i) aren’t outside the attack surface, and they aren’t outside the defensive surface either. These are privileged administration paths and should be monitored like . . .well, privileged administration paths.

The important point is that IBM i blue teaming isn’t really about catching a single dramatic event, but reconstructing intent and scope from platform-native relationships:

Who did it? Through what path? Under what job? Against what object? With what authority? Was that authority normal, inherited, adopted, newly granted, or excessive? What business process did it touch?

Native controls and optional augmentation

Commercial IBM i security tools can be useful (and expensive . . .IYKYK). In some environments, they may be the most practical way to package reporting, alerting, anti-ransomware monitoring, SIEM forwarding, role review, or executive-friendly evidence. There’s nothing wrong with that: specialized platforms exist because IBM i security work is specialized, and most SOC tooling isn’t used to speaking this language.

Keep in mind, though, that a product dashboard is not instant platform literacy: commercial tools can accelerate detection and evidence packaging, but it cannot replace understanding what QAUDJRN records, what authority collection is actually showing, what function usage controls, what NetServer exposes, what an exit point enforces, what job context means, or why an object authority finding is dangerous in one library and super boring in another.

The easiest way to look at this kind of stuff is to separate your native controls from “augmentation” . . .native IBM i capabilities provide the first layer of defensible evidence and control, and third-party tools may make that evidence easier to monitor, forward, visualize, and govern.

The inherent danger is when an organization buys the second layer and never learns the first.

SOC, SIEM, and incident response

Your IBM i should enter the SOC as a context-heavy source, not as undifferentiated logs splattered out into the void.

The first practical design choice is whether the organization preserves IBM i-specific entities when events are forwarded: user profile, group profile, special authority, object, library, IFS path, job identifier, subsystem, share, exit point, function usage ID, host-server context, Navigator context, and journal receiver metadata.

That’s not decorative context, either, but how the SOC determines whether an event is an operational blip, a privileged access problem, a share exposure issue, an administrative-plane change, or the beginning of an incident.

Flattening all your IBM I logs into generic SIEM fields may satisfy your ingestion metric, but it will likely destroy the relationships defenders need to interpret your events.

So, SOC integration should start with use cases, instead of volume.

Decide what the SOC must be able to answer:

Did a powerful profile change? Did a special authority appear where it did not belong? Did a share become exposed? Did IFS activity spike in a sensitive path? Did a scheduled job or startup path change? Did an exit program or authentication boundary weaken? Did Navigator or service tools become reachable in a way that breaks policy? Did database access occur through a path that bypasses the application’s normal controls?

Incident response on IBM i also has to start with scope, not a new episode of “Server Triage Theater”.

The first containment question may not be 'what process do we kill?' It may be 'which profile, job, subsystem, share, object set, IFS path, or service boundary contains the activity?'

That’s a different conversation, and it’s also why IBM i administrators, SOC analysts, application owners, and risk/compliance teams need a shared playbook before the first time things go totally sideways.

Incident-response playbooks

An incident response playbook should pull native evidence first:

For suspected credential misuse, defenders need user profile, group, job, session, and object authority context. For file-share abuse, they need share configuration, IFS statistics, object privileges, open-file indicators where available, job context, and history or journal evidence. For job-based persistence, they need scheduled-job and startup inventories, object ownership, system values, and the job or subsystem trail.

This isn’t an attempt to make incident response slower, but to avoid breaking the business while chasing the wrong abstraction.

IBM i often runs workflows that are “old” because they are important, not because nobody noticed them. Containment that ignores job relationships, application ownership, and business scheduling can turn a security event into an operational incident with better branding.

Intrusion timeline with defender checkpoints

The defensive timeline should (not surprisingly) mirror the red-team timeline. Access, session establishment, enumeration, object or file manipulation, administrative policy drift, persistence, action, detection, response, and evidence all have IBM i-specific meanings.

Again, we’re not after “something happened”, but whether the team can tie what happened back to platform-native evidence.

In conventional incident reviews, your manager may ask a simple question: “how far did it go?”.

With your IBM i, answering that question completely requires more than a screenshot of a SIEM alert: it means knowing which authority boundaries were crossed, which jobs were involved, which services were used, which objects or paths changed, which shares were exposed, which journals retained evidence, and whether the activity changed business logic or only touched infrastructure around it.

The defender checkpoint model is excellent here because it turns the box into a sequence of evidence questions:

At access, what profile and interface were used?

At session, which job represented the work?

At enumeration, what authority or object information was accessed?

At manipulation, what library, object, file, path, or share changed?

At policy drift, did a function, exit point, system value, TLS setting, or admin-plane control weaken?

At persistence, did a scheduled job, autostart job, startup program, or subsystem path change?

At recovery, what must be contained and what evidence must be preserved before cleanup begins?

Governance, reporting, and control evidence

Done well, the same visibility that helps a SOC investigate these kinds of things also helps GRC, audit, risk, and leadership answer the questions they should have been asking all along.

Who has privileged access? Who inherited it through a group? Which objects are exposed through *PUBLIC or weak authorization design? Which administrative functions are reachable? Which shares matter? Which system values changed? Which jobs or schedules represent sensitive business logic? Which logs and journal receivers prove what happened? Which controls reduce the likelihood that the same pattern repeats?

All of that is control evidence: IBM i telemetry can support privileged access management, access review, least privilege, change governance, logging and monitoring, incident response, file-share governance, segregation of duties, service access review, and continuous control monitoring.

The gap is usually not technical possibility, but translation from platform-specific evidence to control language that auditors, risk owners, and executives can use.

Practical implementation checklist

The practical checklist is where we make all of this operational: establish the release and service baseline, export the authority and identity baseline, define what evidence must be collected and retained.

Use authority collection and object reviews to reduce unnecessary privilege, and build detection around credential misuse, privilege drift, share and IFS abuse, admin-plane changes, exit-point changes, and job-based persistence.

Create playbooks that begin with IBM i scoping rather than just generic endpoint response, and feed the lessons back into least privilege, function usage, exit-point governance, application review, and PTF (fix) planning.

This isn’t glamorous, “employee of the month” work, but neither is most blue-team work. The glamorous part is discovering the incident, but the helpful part is proving what happened, containing the correct boundary, and improving the control environment so the next event is even easier to see.

Reporting templates

Just like with red-team reporting, an IBM i blue-team report shouldn’t be formatted like a generic Windows or Linux detection review with the platform name swapped in.

It needs foreground visibility, authority relationships, service exposure, job context, administrative surfaces, IFS and PASE exposure, and the degree to which the SOC can interpret the evidence it receives.

Executive reporting template

What happened: suspected misuse, drift, or unauthorized change on IBM i affecting a system, LPAR, application, share, service, object set, or administrative plane.

What we observed: evidence derived from journal, job, network, IFS, exit-point, function-usage, schedule, system-value, or authority sources.

Business impact: no confirmed impact, operational disruption, data exposure risk, share abuse, admin-surface misuse, business-process manipulation, or incomplete visibility.

Confidence: high, medium, or low based on the quality and completeness of native IBM i evidence sources.

Containment taken: profile restricted, share access removed, job path disabled, administrative-plane access limited, exit-point configuration reverted, TLS corrected, or object authority reviewed.

Control lesson: least privilege, admin-plane hardening, retention gap, function-usage review, exit-point governance, release/PTF validation, SIEM enrichment, or application-path review.

Technical Incident Response note template

Time window

Affected user profiles and group

Relevant special authorities and inherited authorities

Relevant objects, libraries, paths, and shares

Related jobs, job users, job names, job numbers, and subsystems

Related sessions, interfaces, host servers, and administrative tools

Journal receivers and retained evidence

Related exit points, function IDs, service tools, or Navigator context

Containment actions

Recovery or rollback actions

Required follow-up controls

Limitations and caveats

There are caveats, because there always are . . . and pretending otherwise is how risk programs end up with dusty spreadsheets instead of real-world evidence.

First, public IBM i incident detail is thinner than Windows, Linux, cloud, and SaaS incident reporting, but that doesn’t mean IBM i risk is imaginary, just that the public evidence base is uneven, and good analysis has to combine IBM documentation, support material, vendor field reporting, public research, and practical platform knowledge without overstating what any one source proves.

Second, IBM i detection is release-sensitive and configuration-sensitive. The exact services, views, functions, Navigator behaviors, MFA features, TLS behavior, audit coverage, authority-collection views, and PTF-delivered improvements need to be verified against the specific release and PTF level in front of you.

An article can describe the defensive model all day long, but an assessment has to validate the local system.

Next up, your vendor reports and commercial tools can be pretty helpful, but they aren’t neutral evidence by default. They often identify real patterns because the vendors see a lot of IBM i environments, but the claims still need to be interpreted with commercial incentives in mind.

Finally, logging alone isn’t visibility: a journal entry nobody understands is not a detection, and a SIEM feed with no IBM i enrichment is not a detection.

Creating a dashboard that cannot explain profile, job, object, share, and authority context isn’t true IBM i detection, as visibility requires interpretation, response, and true ownership.

Look, can you do it or not (again)?

So, to answer the question: yes, you can blue team an IBM i, but a credible IBM i blue-team program is not just 'send the logs to the SIEM' and wait for an oracle to whisper suspicious activity into Splunk.

When it is done right, blue teaming your IBM i is an operating model for understanding authority changes, object changes, job behavior, service access, IFS and PASE activity, administrative tooling, and business logic in context.

You’re turning IBM i-native evidence into defensive decisions before the only remaining option is folklore, story-time and lots of regret.

Give your IBM i a platform literate blue team: it already tells defenders who the users are, what they are allowed to do, what jobs are running, what shares are exposed, what functions are reachable, and what the journals retained.

The real failure mode here isn’t you

not

monitoring the system, so much that it’s that too many organizations never promote IBM i visibility into actual “first-class” SOC evidence.

The box isn’t some special case that resists serious defensive work; it’s more like a special case that

rewards

teams who understand how it actually works.

If the attack surface is authority, the defensive surface is visibility . . .and once you can see the platform in its own language, you can capably defend the system that actually exists!
