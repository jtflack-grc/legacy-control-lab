# Can You Red Team an IBM i?

Source: https://www.linkedin.com/pulse/can-you-red-team-ibm-i-john-flack-pabze

# Can You Red Team an IBM i?

(. . .not a definitive guide)

It’s time for your annual pen-test: the rules of engagement are set, the disclosures are signed, and the area of attack is laid out. There’s the usual segment of the network, a couple of Windows servers that were just hardened, and . . .

Wait, who the hell put an IBM i box in scope this year?

Surprise.

It’s been long-overdue, and for more mature security programs, well . . . you should have put it in scope years ago.

But why? No one writes a virus for an “AS/400”, do they?

Let’s burst the bubble that seems to exist around the box . . . the platform exposes

more

than enough attack surface to support a full-spectrum, authorized adversary simulation: green-screen access over Telnet/5250, IBM i host servers, ODBC and DRDA data paths, FTP, IBM Navigator for i, ACS-driven administration, Integrated File System shares, PASE and open-source packages, and the application layer built in RPG, COBOL, CL, Java, PHP, or web frameworks.

IBM’s very own documentation treats these as first-class administrative and application interfaces, while IBM Security Bulletins and NVD entries show that both core IBM i components and bundled services have had exploitable flaws, including remote CL execution through DDM, SQL injection in Navigator, SSRF and authorization bypass in Navigator, and multiple OpenSSH- and Apache-related issues. Why, it’s CVE’s just like Mom used to make for Linux and Windows!

This is the thing of it . . .what makes an IBM i different is not a lack of “red-teamable” surface, but the

shape

of the surface. The highest-value findings you’re going to get aren’t usually classic memory-corruption bugs; they’re authority-model failures and integration failures: excessive special authorities, dangerous *PUBLIC rights, owner-adopted programs, profile swapping, unqualified library calls, weak exit-point control over FTP/ODBC/Telnet, overexposed IFS shares, overtrusted ACS or Navigator access, and weak visibility into audit logs that most blue teams don’t know how to interpret.

So, let’s spend your afternoon coffee break fixing that.

First off: IBM’s security model is "object-centric" and powerful, but public research and community reporting show that misconfiguration and application logic flaws can turn that strength right back into the main attack path.

This means, conceptually, that a good “IBM i red team” must be architecture-aware, authority-aware, application-aware and not just walk in with Kali Linux,

rockyou.txt

and some vibes.

You’ll need to look at the operating system and at the application stack together, because IBM i intentionally blurs those layers through integrated database services, CL command execution paths, IFS access, PASE, strong but subtle authority inheritance, and SQL-accessible administration surfaces.

Another thing . . .rolling up and trying to red team an IBM i box also assumes a fully authorized, well-funded assessment. Asking for it to be performed for the equivalent of a case of Monster Energy drink and a signed issue of Amazing Spider-Man #300 may not surface the results you want.

Platform model/attack surface: what is this thing?

First, know your enemy: IBM Power Systems are commonly virtualized with PowerVM logical partitions; IBM now also supports IBM i workloads on IBM Power Virtual Server as cloud-hosted LPARs.

IBM documentation and Redbooks frame the platform as:

an integrated environment with built-in security, work management, database, file systems, and increasingly hybrid-cloud deployment patterns.

For red-team purposes, the important architectural point here is that IBM i is not “just an operating system with a database beside it.”

It’s an integrated stack with subsystem-based job routing, object-level authority, multiple file systems under the IFS (the “file system”), SQL-accessible system services, PASE for AIX-style (AIX is a form of UNIX) runtime compatibility, and admin surfaces in ACS (the client connection piece), Navigator (the web interface), and service tools.

So, that means a compromise path may start in one layer and become decisive in another: a web bug can become a database foothold, a database foothold can become a CL-command path, and a CL-command path can become an IFS or persistence foothold. Escalation: a game the whole infrastructure team can play!

The table below summarizes the IBM i elements that matter most in adversary simulation.

As you can already see, IBM i’s identity and authorization model is

absolutely central

to any realistic assessment.

IBM documents user profiles, group profiles, and special authorities such as

ALLOBJ; object security is enforced on interface use, and

PUBLIC remains a normal and performance-friendly part of the model. That design is great when deliberately managed, but it also creates a large review burden: red teams should almost always assume that the most valuable path is often “find where the platform is intentionally delegating authority too broadly” rather than “find a binary exploit first.”

The concept of “adopted authority” also deserves special treatment here; objects that are

PGM,

SRVPGM, and *SQLPKG can adopt an owner’s authority, and IBM’s documentation explicitly says that adopted authority is an intentional release of control that should be used carefully, not so Janice in Accounting can bypass the claims release screen because it’s an “extra screen I don’t like”.

IBM also provides SQL-visible telemetry around adopted authority through PROGRAM_INFO, authority collection, and AP audit journal entries. Public reporting from researchers (and IBM i press coverage) repeatedly points to adopted authority, profile swapping, and library-list abuse as major privilege-escalation themes.

The network surface is also broader than you might think: IBM documents host-server ports for ACS-supported services, states that Telnet can autostart by default, supports FTP, ODBC, JDBC, DRDA, NetServer, and QFileSvr.400, and exposes EIM/Kerberos integration for several of them.

IBM also exposes exit points specifically so administrators can control authentication and request validation for FTP and related TCP/IP services. In other words, IBM itself treats these paths as sensitive trust boundaries that require compensating controls.

Common administrative tools are

part

of the attack surface, not outside it. IBM Navigator for i is a web console reachable by browser, ACS is a cross-platform Java client with 5250, SSH terminal, Run SQL Scripts, and Open Source Package Management functions, and service tools user IDs govern access to DST and SST.

So, stand down, Neo . . .there’s no need for Metasploit when you have everything you need already in front of you.

On cloud or HMC-managed environments, IBM also supports remote console and IBM i operations via management-plane workflows. These tools are legit operations surfaces, but that’s exactly why they attract both insider misuse and attacker attention.

Your typical enterprise deployments place IBM i in one of three patterns:

on-premises Power servers with PowerVM LPARs and virtual I/O

HA/DR clusters or mirrored boxes using PowerHA, independent ASPs, or Db2 Mirror

and hybrid patterns using IBM Power Virtual Server and cloud-backed backup or failover.

Those patterns end up being important on an engagement because red-team scope must include not just a single partition, but also management planes, replication paths, shared I/O, HA automation, and any “GUI node” or helper server used by cluster or mirror products.

(Some) evidence from IBM i vulnerabilities and incidents

Public vulnerability records show that IBM i isn’t exempt from modern attack classes. Recent bulletins cover SQL injection in Navigator for i, remote CL command execution through DDM architecture, SSRF and authorization bypass in Navigator, arbitrary file upload and SSRF-related flaws in IBM HTTP Server powered by Apache, OpenSSH issues including the “

regreSSHion

” race condition and multiple man-in-the-middle or protocol-integrity flaws, and XXE or parser-related issues affecting IBM i Access Client Solutions features.

These are not all “kernel bugs,” but from an attacker’s perspective they are fully valid ingress or privilege-expansion opportunities if the licensed is enabled on the platform and reachable.

A vulnerability short-list:

Public incident evidence is thinner than the obvious CVE records, due to reputational damage being kept on the DL, but it is strong enough to support all of this: Verizon’s breach-digest reporting describes an IBM i environment at a water district where attackers exploited a vulnerable web payment application, reached the back-end IBM i, manipulated OT-linked functions, and exfiltrated large amounts of data.

Whether one treats that public summary as a full technical case study or as a cautionary “

Hey, don’t look at me; I don’t write my passwords on Post-It Notes

” tale, it’s still direct evidence that IBM i environments can be compromised through ordinary enterprise-application weaknesses and dangerous network trust assumptions.

Ransomware evidence is more often discussed in terms of the IFS than in terms of native Db2 objects. IBM i NetServer explicitly allows Windows clients to access shared directory paths, and IBM i security vendors and IBM i press have repeatedly described ransomware scenarios in which a PC with a mapped IFS share is the path of infection.

The key point for a red team is that the IFS acts like an enterprise file platform and must be tested as one . . . if you don’t get in via escalated authority first, this the next place to look.

Public research in the past two years sharpened the offensive picture. In early 2026, there was published original research showing how SQL injection against a web/API layer in front of Db2 for i required IBM i-specific adaptations and payload logic, not just point-and-shoot commodity DB2 automation.

Together, sources like this support the fact that IBM i red teaming is real, but successful work is almost always platform-adapted rather than generic.

Vendor field data reinforces the same point: Fortra’s 2026

State of IBM i Security Study

says it analyzed 163 IBM i partitions and highlights unmonitored network access, weak auditing, and dangerous default settings as recurring exposure areas. Even allowing for vendor incentives, those themes align closely with IBM’s own documentation around exit-point controls, auditing, function usage, and special authorities.

The “Real-Real” IBM i red team methodology

A realistic IBM i red-team methodology needs to treat the platform as a joined environment made of operating system, database, admin tooling, and enterprise integrations.

Start with versioning and enablement, not unlike for Linux: release, TR/PTF (fix) level, licensed programs, which TCP/IP servers start automatically, whether Navigator and ACS access are allowed, whether NetServer is enabled, whether PASE/open-source packages are installed, and whether replication or clustering products create helper nodes or additional control planes. Without that baseline to start with, exploitability claims are too fuzzy to be useful.

The flow shown above synthesizes IBM’s service boundaries, authority model, work-management model, and public research on IBM i attack paths.

“Conceptual” attack chains

Usual “

leet hax0r

” disclaimer: since detailed exploit strings and weaponized commands would be operationally unsafe to post, the chains below stay at the level a defender/assessment lead needs to plan and explain a legit engagement.

A well-thought-out engagement on your IBM i should spend large

(to the point of excess)

amounts of time in identity and authority mapping: enumerating user profiles, group profiles, special authorities, profiles that own key applications, adopted programs and service programs, function-usage settings for ACS/Navigator-related features, and any profiles used by server jobs, batch jobs, and HA/DR automation.

IBM has made a lot of this stuff observable already through SQL services and views, which means defenders can validate many findings natively.

Another big workstream is code and object review. IBM’s own warnings on adopted authority, and community guidance on unqualified library calls all point in the same direction: the highest-value IBM i review is often “

what privileged object can a lower-privilege user cause the system to execute or resolve unexpectedly

That means source review when available, but also object-level review when source is absent, using PROGRAM_INFO, object statistics, authority collection, and audit-journal analysis.

Another way in is via the IFS and careful PASE review. IBM documents “/” and “/QopenSys” as normal IFS locations and positions SSH/PASE as the practical environment for open-source tooling and administration.

That makes them natural places to look for ignored Bash scripts, stale keys, helper binaries, package-manager side effects, CI/CD artifacts, and interoperability bridges to Linux-like tooling. On modern IBM i systems, a red team that ignores PASE is ignoring a large part of the real system.

Testing checklist:

This timeline is a bit of a SWAG, but is drawn from IBM’s native telemetry options, public incident reporting, and public IBM i research.

Tools, detection, and mitigations

A notable feature of IBM i security work is that the tool ecosystem is split: the platform-native and open-source side is real but fragmented; the commercial side is highly specialized and, in many cases, more mature (and, also, waayyyy more expensive).

That leads to an important conclusion here; the scarcity of commodity “IBM i exploit kits” shouldn’t be mistaken for safety.

In practice, mature teams combine generic network/web tooling with IBM i-aware admin surfaces and a small set of IBM i-specific products or scripts.

The most useful “scripts” for defenders aren’t usually script-kiddie exploit scripts but native enumerators: SECURITY_INFO, USER_INFO, PROGRAM_INFO, SCHEDULED_JOB_INFO, ACTIVE_JOB_INFO, NETSTAT_INFO, NETSTAT_JOB_INFO, DISPLAY_JOURNAL, and IFS table functions.

These are IBM-supported primary sources for understanding what the box is doing and what an attacker would likely notice first, and recommended explicitly, because they let blue teams reproduce much of a red team’s discovery work using native interfaces.

Mitigation on IBM i is mostly about shrinking trust boundaries rather than adding more generic endpoint controls: reducing legacy protocol exposure, putting exit-point logic in front of FTP/ODBC/Telnet paths, forcingT LS where IBM supports it, patching Navigator and bundled services aggressively, minimizing

ALLOBJ and

SECADM, reviewing *PUBLIC and adopted programs, and treating IFS/PASE as a real enterprise attack surface.

IBM’s own guidance on object security, function usage, authority collection, startup programs, and audit analysis is pretty darn rich compared with many midrange platforms; the operational problem is often that teams don’t end up using it consistently.

Reporting template and limitations

Your IBM i red-team report shouldn’t be formatted like a generic Windows/Linux test report, but instead should focus on foreground authority relationships, service exposure, and application logic.

The template below might work well for varied audiences:

That said, there are two caveats and limitations.

To start with, public IBM i incident details are much harder to come by than Windows/Linux incident details, so some of the best evidence is a mix of IBM bulletins, public conference research, field summaries, and vendor/operator case material rather than a large body of public malware write-ups.

Additionally, CVE volume

vastly

understates actual IBM i risk; many of the most consequential IBM i failures are design, authority, segmentation, and application issues that never become CVEs at all.

Look, can you do it or not?

So, to answer the question as we conclude this:

yes

, you can red team an IBM i, but a credible IBM i red team is not just a port scan, a CVE checklist, and trying QSECOFR three times and calling a day.

. . .when it’s done right, it’s an assessment of how IBM i’s integrated architecture, object-security model, admin tooling, IFS/PASE bridge, and enterprise integrations can be turned against the organization.

Your IBM i isn’t a special case that resists red teaming; it’s more like a special case that, instead, rewards teams who understand how it actually works conceptually and ends up making your

entire

security posture much stronger.
