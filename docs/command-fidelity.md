# Command fidelity

Legacy Control Lab is a **synthetic** IBM i-style training range. Commands are
honestly labeled so IBM i practitioners know what depth to expect.

## Implementation levels

| Level | Meaning | Example |
|-------|---------|--------|
| `stateful_implemented` | Deep simulation — mutates synthetic state, journals, authorities, or job logs | `CHGUSRPRF`, `CHGAUT`, `DSPJRN` (where wired) |
| `display_implemented` | Representative screen / inquiry — looks and navigates like IBM i, limited or no durable mutation | Many `DSP*` / `WRK*` inquiry paths |
| `lab_native` | **Not IBM i CL** — training/mission helpers that exist only in this lab | `WRKFINDING`, `SUBMITMSN`, `STRMSN`, `GENRPT` |
| `promptable` / `cataloged` | Menu, help, or catalog presence — syntax recognition without a full handler | Stub / help-oriented entries |

Rough Community Edition catalog mix: on the order of **~150** stateful,
**~170** display/representative, and **~40** lab-native helpers (exact counts
drift as the catalog grows).

## How to read the green screen

- Real-looking CL names (`WRKUSRPRF`, `DSPOBJAUT`, `DSPSYSVAL`) are **inspired by
  IBM i** and implemented to training depth — not a substitute for a live partition.
- After the Five-Minute Demo, practitioners should poke those familiar verbs first.
  That is the credibility check: inquiry patterns and evidence trails on synthetic
  data — not bit-identical IBM behavior.
- Lab-only verbs such as **`WRKFINDING`**, **`SUBMITMSN`**, and **`STRMSN`** are
  deliberately invented for GRC workflow. Treat them as coach/mission tooling.
- Menus and help text may cover a wider surface than the deeply simulated core.

## Honesty rule

If a command is lab-native, the catalog marks `implementationLevel: lab_native`
and realism notes say so. Do not present lab-native verbs as IBM-documented CL.
