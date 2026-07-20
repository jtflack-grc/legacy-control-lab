# Licensing (Community Edition)

## Legacy Control Lab — MIT

The lab host, seed data authored for this project, and documentation in this
repository are licensed under the **MIT License**. See [LICENSE](../LICENSE).

## IronTerm — GPL-3.0 (separate work)

The browser 5250 terminal UI vendors **IronTerm** under
`external/IronTerm-main/`, licensed **GPL-3.0**. See that tree's `LICENSE`.

### Distribution arrangement (reviewed for Community Edition)

| Question | Answer |
|----------|--------|
| Is IronTerm linked into the Node host? | **No.** It is served as **static browser assets** only. |
| Does MIT code become GPL by shipping both? | **No automatic relicensing** of the MIT host. IronTerm remains a **separate GPL work** redistributed in source form under its own license. |
| Must recipients get IronTerm source? | **Yes** — they receive it in `external/IronTerm-main/` in this repo / image build context. |
| Can someone strip IronTerm? | Yes, but then they need another TN5250/web terminal; the lab UI expects this client. |
| IBM trademarks | Called out in [NOTICE](../NOTICE). This is not an IBM product. |

### Maintainer obligations when redistributing

1. Keep IronTerm's GPL license text with the IronTerm tree.
2. Do not claim the combined distribution is “MIT-only.”
3. Point README / NOTICE at both licenses (already done).

This is a practical **MIT host + GPL terminal client** layout, not a claim that
GPL terms vanish. If you fork and statically link or otherwise create a single
combined work in a way that triggers GPL, follow GPL-3.0 for that combined work.
