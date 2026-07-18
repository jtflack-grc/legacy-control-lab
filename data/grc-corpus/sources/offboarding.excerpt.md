# IBM i Offboarding: Profiles You Didn't Revoke

Source: https://www.linkedin.com/pulse/ibm-i-offboarding-profiles-you-didnt-revoke-john-flack-oplie

# IBM i Offboarding: Profiles You Didn't Revoke

Terminated Access Disabling accounts: it seems awfully obvious. Close the AD door, disable the network ID, and all done.

Terminated Access

Disabling accounts: it seems awfully obvious.

Close the AD door, disable the network ID, and all done. . . except sometimes your IBM isn't wired into LDAP, and the change control gets lost along the way as long as the laptop was turned in and remote access was turned off.

Your IBM i contractor may have walked out last spring, but their user profile still lives: enabled, untouched, mapped to shared storage. Your ex‑admin moved to another team six months ago, yet their ID lurks like a ghost carrying a skeleton key. Nobody noticed, and nobody asked.

This seemingly innocuous issue grows more complex when you involve third-party service providers. Many larger organizations use Managed Service Providers (MSPs) for IBM i tech support . . .sometimes for full administration. But while contracts may end, identities often don’t, and if offboarding steps aren’t tightly coupled with third-party disengagement processes, you’re violating the spirit (and often the letter) of third-party risk management (TPRM).

Under frameworks like ISO/IEC 27001 (A.15.2.2), you’re expected to ensure that offboarding extends beyond employees to include contractors, vendors, and any entity with access. If your TPRM program isn't integrated with your identity lifecycle, you're leaving doors open that your vendor has already walked away from.

IBM i doesn’t forget, of course: it records every sign-on, saves status and keeps score even when no one watches. The risk isn’t that the system fails here: it’s that you never looked.

To beat the ol' "checklist compliance" horse one more time: governance isn’t a quarterly slide deck . . . it lives in the debris. This is what ISO/IEC 27001 means when it demands a review of user access rights (A.9.2.5), and what COBIT hints at when it calls for managed identity and access across the full lifecycle.

What To Do

We begin with the list, and you, as a GRC professional, can run the command:

DSPUSRPRF USRPRF(*ALL) TYPE(*BASIC) OUTPUT(*OUTFILE) OUTFILE(QGPL/USERS)

This creates an audit-ready dataset of all user profiles, including last sign-on. Sort it, filter it. Profiles idle for 90, 180, 365 days . . .or never used at all . . .are your unclaimed keys.

However, don’t disable blindly, as not every silent profile is obsolete: some run job schedulers, some own critical data, and some exist to adopt authority without drawing attention.

Ask the real questions once you have your list:

Is this profile linked to active jobs or subsystems?

Does it own libraries or objects that can’t be reassigned cleanly?

Is it called indirectly via adopted authority in critical applications?

Can someone name the business owner, the justification, and the expiration policy?

If you’re hearing “I think it’s used by...” or “We leave that alone just in case,” you’re not practicing access control, you’re accumulating liability.

Closing the Door

Fortunately, IBM i gives you a cleaner way forward:

ANZPRFACT INACT(90)

This command creates a job that will disable

any

user profile that hasn’t been active in 90 days (or a number of your choosing) based on sign-on, object restore, or creation date.

You can exempt critical accounts (QSYSOPR, QSECOFR, etc.) with:

CHGACTPRFL USRPRF(SAFEID) STATUS(*ACTIVE)

And for all the rest, run the sweep . . . schedule it, and let it become your quiet quarterly habit.

When someone asks why an orphaned ID was still enabled six months post-departure, you’ll have the answer: It wasn’t.

It was handled, reviewed, logged, and confirmed.

The Governance Layer

You need more than scripts here, you'll need receipts.

For each profile you disable:

Profile name:

the exact ID evaluated, no aliases or generic labels.

Last sign-on date:

the technical evidence supporting your action.

Reason for disablement:

tie it to role termination, inactivity policy, or access reviews.

Who approved it:

not "the team": a name, department, or business function.

Linked change record:

a ticket, spreadsheet, or memo. If you can’t trace it, you didn’t govern it.

Review cycle:

because reactivation shouldn’t be casual.

This satisfies:

ISO/IEC 27001 A.9.2.6 (Removal or adjustment of access rights)

NIST 800-53 AC-2(3) (Disable inactive accounts)

COBIT BAI09.02 (Manage user identity lifecycle)

What Good Looks Like

It’s repeatable, documented, and defensible.

Dormant accounts are disabled within 90 days

: not occasionally, but on schedule.

Privileged IDs aren’t idle and forgotten

: they’re tracked and justified.

Exceptions have owners

. . .not assumptions. You can name the person responsible for the risk.

Audits aren’t panic events

: they’re just printing last quarter’s log (or better yet, write an API to just let the auditors have a live look at things).

Reactivations are reviewed

: you don’t restore access without a ticket and an approver.

This is operational governance . . .what ISO/IEC 27001 asks for but doesn’t always show.

Finally . . .

Governance isn’t the absence of failure: it’s the presence of process. And while offboarding hygiene might seem obvious, you'll be surprised with what you will find the first time you run this exercise on your system.

If you can’t tell folks who owns a profile, it doesn’t belong. If the answer is “we might need it,” then you have to give it an owner, a note, and a countdown.

No more ghosts, no more shared secrets or dormant IDs with production access and no one to blame when they show up in the logs.

Use the tools, schedule the rhythm . . .and keep the receipts.
