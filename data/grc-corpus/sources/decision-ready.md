# Audit-Ready Is Not Decision-Ready

Source: https://www.linkedin.com/pulse/audit-ready-decision-ready-john-flack-cpgfe

# Audit-Ready Is Not Decision-Ready

Moving from risk display to decision support

There's a particular kind of risk meeting most GRC people know by heart: the slide deck is super-clean, the controls are mapped, and the framework language has the comforting texture of something official.

The heatmap appears exactly where everyone expects it to appear, glowing red, yellow, and green, not unlike a small weather system over the enterprise. Someone says the risk is “high”; someone else asks whether the finding is open or remediated, and then a third person asks whether the evidence has been uploaded. For a few minutes, the room carries the rhythm and vocabulary of real risk management.

Then the meeting moves on, and it's not always clear that anything meaningful changed.

We didn't clarify trade-offs, no uncertainty has been made "more governable", and no decision has been sharpened beyond what it was before the calendar invite went out two weeks ago.

That's the problem sitting underneath a lot of the modern governance, risk, and compliance work we all do. The audit trail is defensible. The organization can point to documents, dashboards, control mappings, tickets, attestations, and screenshots.

Yet when leadership has to make an actual choice . . . spend or defer, accept or transfer, modernize or tolerate, redesign or live with the exposure . . . your risk program often struggles to provide information fit for that decision.

While we can often prove that risk was assessed, it seems we can't always explain what uncertainty the business is carrying, what that uncertainty might cost, or which option changes the shape of the exposure.

. . .those aren't the same thing.

The theater of apparent control

So, all that said, a heatmap

can

be useful as a communication shortcut. Hey, not every red/yellow/green chart should be ceremonially carried to the nearest dumpster and set on fire, although I get the temptation. The issue isn't the color itself, but the thinking that disappears when the color is asked to carry more meaning than it can hold.

When a risk is marked “high,” the label can feel decisive, but it conceals more than it reveals. High compared to what? High because the event is likely, because the loss would be severe, because the control failed, because the auditor expects the rating, because the owner is nervous, or because no one wants their name attached to the acceptance memo?

A single color can become a small, polished container for a dozen unresolved questions . .

.if

you're allowed to ask them.

Those colors also create the feeling of movement where only documentation has occurred: your organization can hold meetings, update registers, collect screenshots, map controls, assign owners, and close action items while still not knowing whether the underlying exposure has changed in any meaningful business sense.

With this, your GRC program becomes so much performance art, not because the people doing the work are "unserious" or just going through the motions, but because the system around them has learned to reward artifacts that can be inspected more easily than judgments that can be defended.

The activity, effort, and audit pressure is real: what remains thin is the connection between all of that motion and the decisions the business actually has to make.

Tony Martin-Vegue

's "

From Heatmaps to Histograms

" gives language to this problem by pointing out how much of cyber risk management has learned to reward the appearance of progress more readily than the measurement of exposure, and that distinction in important, in that a program can be audit-ready and still be decision-poor.

In complex environments, especially the legacy-heavy ones we like to talk about here, that's not an academic gap, but an operational one.

Legacy risk is where vague language goes to hide

Let's be honest: the weakness of vague risk language becomes painfully, maddeningly visible around legacy systems, as a risk register might contain a sentence like this:

Legacy platform risk remains elevated due to aging infrastructure and limited modernization progress.

That sentence may be directionally true, and politically useful for certain folks. But as risk analysis, it's absolutely weightless. Your risk analyst just vaguely gestured toward concern without making the concern usable.

What risk are we actually talking about?

Is it the risk that a critical platform becomes unavailable during a processing window? Is it the risk that ransomware recovery depends on assumptions nobody has tested recently? Is it privileged access, unsupported dependencies, fragile integrations, batch failure, data integrity, vendor lock-in, institutional knowledge loss, audit evidence gaps, or modernization delay?

Every single one of those risks behaves differently.

Every one.

Each has its own frequency, magnitude, evidence trail, owner, treatment path, and failure shape. Compressing them into “legacy risk” may keep the register less messy and pile them on someone else, but your short-form language of compression doesn't actually help a leader decide what to do.

In environments built around IBM i, mainframes, AIX, older ERP systems, long-lived healthcare workflows, or deeply customized operational applications, these kinds of systems are rarely risky because they are old in some abstract moral sense.

Age is not the sin here . . . but dependency without visibility, criticality without measurement, and fragility hidden behind years of "black box in the corner" uptime most certainly

The sharper questions are more concrete and much more uncomfortable:

How long can the business operate if this batch workflow fails?

What happens if a key integration misses its processing window?

How much manual work appears if the platform is unavailable for a day?

How much of the recovery process depends on three people, one aging runbook, and the institutional memory of someone who has been saving the company quietly for fifteen years?

Which controls exist in policy but not in observable operational evidence?

Those questions do not fit neatly into our color blocks, and they need scenarios, ranges, loss forms, data, judgment, and a decision that is specific enough to be improved by analysis.

A risk assessment without a choice is just motion

The strongest shift in cyber risk quantification isn't mathematical, but philosophical. Risk analysis should

always

begin with a decision, not with a dashboard, not with a quarterly reporting ritual, and not with a preordained finding waiting to be dressed in framework language.

The useful starting point is the choice the organization actually faces:

Should we fund the resilience upgrade?

Should we accept the current recovery exposure for another year?

Should we prioritize identity controls over monitoring improvements?

Should we modernize the integration layer before the core platform?

Should we buy more cyber insurance, change the deductible, or invest in controls that reduce the tail?

Should we allow an AI-enabled workflow into production with additional monitoring, or delay it until the evidence model is stronger?

These are real governance questions because they force you into actual trade-offs. They involve money, timing, accountability, tolerance, and preference.

They also require someone to say what matters more when everything cannot matter equally, and they cannot be answered honestly with “high,” “medium,” and “low" (or even "medium-high" and "medium-low").

Instead, they live in language closer to this:

"We estimate this scenario occurs between X and Y times per year; when it occurs, the plausible loss range is between A and B; severe outcomes are driven by downtime, response cost, manual workarounds, regulatory exposure, and customer or member impact; one treatment option reduces the most likely loss but leaves the tail largely intact, while another costs more but meaningfully reduces the probability of exceeding the organization’s tolerance threshold."

That's an entirely different conversation, and, moreover, it doesn't pretend the future is knowable.

However, it does something more useful: it makes your uncertainty visible enough to govern.

From “What color is it?” to “What are the chances?”

This is where all your histograms, ranges, and loss exceedance curves become more than analytical decoration: a histogram tells us the shape of risk, and whether most outcomes cluster in a manageable range, whether the spread is wide because our data is weak, or whether a few ugly outliers are doing most of the damage.

It lets us see whether we are dealing with a nuisance, a chronic drain, or a quiet catastrophe waiting patiently in the tail.

A loss exceedance curve asks a question executives already "get", even if they have never used that particular name for it: what are the chances losses exceed this amount?

That question is waaaayyy more useful than asking whether the risk is "red".

In legacy terms: if a proposed modernization effort costs $3 million, and the current scenario has a meaningful probability of exceeding $3 million in annualized loss exposure, leadership has something real to discuss. If the median loss is tolerable but the 95th percentile threatens a major operating threshold, the conversation changes. If a control reduces nuisance events but leaves catastrophic tail exposure untouched, the investment may not be doing what people think it is doing. If a platform looks stable because incidents are rare but the recovery tail is severe, the safest-looking color in the room you want to retreat to may be the one most likely to mislead.

This is the part your GRC program (and mine, and all of ours) has to learn to do better: not merely identify that uncertainty exists, but show how it behaves.

Risk has a shape, and sometimes it's narrow and pretty manageable. Sometimes it ends up wide because the organization doesn't know enough. Sometimes it is quiet for years and years and then arrives all at once, carrying every neglected dependency with it . . . and a mature risk program should be able to tell those shapes apart.

The governance failure is not uncertainty

Quite a few organizations will treat uncertainty as a weakness, as they want the number, the rating, the status, and the answer that fits cleanly into the executive summary, so we make the future crisp enough to fit on one slide.

But, our uncertainty isn't the failure . . .instead it's pretending we are more certain than we are.

You might say that a range is indecision.

And the simple answer is, no, a range is actually real, intellectual honesty.

Saying that annualized exposure is likely to fall between certain bounds, with a defined probability of exceeding the board’s tolerance threshold, is much more mature than saying "the risk is high" and hoping nobody asks what that means before the Panera sandwiches show up for lunch.

The purpose of your GRC program isn't to eliminate ambiguity, but make that ambiguity governable.

These days, it matters much more as AI enters the picture in most programs. Most models can produce risk language instantly, along with summarizing frameworks, drafting register entries, generating polished narratives, and, above all, make weak thinking sound expensive.

That's all useful only when the underlying reasoning is strong. Otherwise, your AI work won't fix the risk theater, but scale it instead.

If your organization doesn't know what decision the assessment supports, your AI isn't going to know either. If your scenario is vague, AI will make it sound structured. If your data is weak, AI will make it sound confident. If the governance process rewards artifact production over decision quality, AI will help produce more artifacts faster.

Congratulations: you've just automated a fog machine.

What decision-ready GRC looks like

This shouldn't make you think a decision-ready risk program needs to quantify everything. That kind of stuff would be its own form of madness, and I think we all can agree that GRC has enough cathedrals and shrines built to paperwork already.

To beat the metaphor into the ground: the goal isn't to build a Monte Carlo cathedral around every control deficiency, but to know when a decision is important enough, uncertain enough, and expensive enough to deserve better analysis.

A decision-ready GRC program asks what choice is actually on the table. . . .what outcome matters most, what information already exists, what evidence would change the decision, what uncertainty can be reduced, and what uncertainty must simply be carried.

You're asking what the current exposure looks like, what each treatment option would change, where the tail risk lives, and what recommendation follows from the analysis.

That's practical governance done right: not "perfect governance", not "mathematically theatrical" governance, and not the kind of governance that confuses a longer methodology with a better answer. It gives leaders enough clarity to act without pretending the future has been solved.

The real move from heatmaps to histograms

This isn't really about replacing one visual with another, but replacing old habits of mind.

These build better outcomes: your labels become your scenarios, primary colors become ranges, pretty dashboards become decisions. "Confidence Theater" becomes uncertainty management, and “we assessed the risk” becomes “we understand the trade-off well enough to choose.”

Now, your GRC program becomes something far more than just compliance support: a business discipline. For legacy systems, AI governance, healthcare operations, cloud risk, and every other messy domain where the real world refuses to fit cleanly into a framework, that particular shift is overdue.

Don't get me wrong: audit readiness, compliance and evidence still matters . . . but none of them are the finish line.

Instead, the finish line is better decisions under uncertainty.

And, if your risk program can't help your organization make those decisions, then the colors were never the problem, they were only the symptom.
