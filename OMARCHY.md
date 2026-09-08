# Omarchy-B1 — Guiding principles

Chef’s-choice church software. The chef picks the courses. You can send anything back.

This is the contract for the `omarchy` branch of B1Admin. Visual reference: `D:\code\churchapps\.notes\omarchy\` — open `07-person.html?theme=b1` and `06-people.html?theme=b1` and `02-sunday.html?theme=b1`. That B1 toggle is the palette and type. Harbor night is not this branch.

**Do not merge `omarchy` into `main`. Do not push to `main`.**

---

## 1. Taste is signed

Before it is amazing for every church, it is amazing for one platonic church. Defaults are the product. A setting is an admission we refused to pick. Do not add a toggle to avoid saying no.

## 2. Do not strip capability

Tabs, sidebars, and column pickers are not the same as features. Relocate every capability that exists today. Inventory the current page first. If today’s person has photo, three phones, attendance history, giving, notes, forms, merge, export, and pickup, the new page still has them. The plate is *where* they live, not *whether* they exist.

## 3. The plate is the living slice

What you see first is what matters now: this Sunday, this year, the latest note, the household in the room. Ten years of rows is not the plate.

## 4. The archive is a verb on the same record

**All years**, **All notes**, **Log a gift** stay on the person (or batch, or group). They replace the right-hand column. They are not a new route and not a tab bar. A year ledger shows one year at a time. A notes thread shows every note in full — long notes take vertical space; they are not truncated and not shoved into a dialog.

## 5. Edit is the same record

Edit does not replace the page with a 40-field card. Left: who they are. Right: how you reach them, then **More**. Household roles stay on the household strip. Merge, export, anonymize, delete live at the bottom of edit.

## 6. Browse households, open a person

The directory is households. The record is a person in a household. Click a face to change who is in focus. Attendance follows the person. Giving follows the household.

## 7. Ask is advanced search. Lists are named plates.

One find field. One Ask field (today’s advanced + AI search). Saved lists are pills. Bulk verbs appear when rows are selected. Demographics and print directory are header verbs, not a second product.

## 8. Chrome is quiet

Blue B1 header (`#0E3D86`), Roboto, `#1565C0` links, `#e5e8ee` page, white surface, `#333` / `#666` text. No Fraunces, no candle gold, no warm-night brand. No module dashboard of feature cards. `Ctrl+K` is the Super+Space of the church.

## 9. One column on a phone

Photo beside the name. Phone number large. Everything else scrolls. Not a separate mobile app. Break at 640px.

## 10. Sunday is home

`/` is this week’s service: order, who is in the room, who is serving, who just walked in. Other modules are reachable from the palette and a quiet nav.

---

## Palette (B1)

| Token | Value |
|---|---|
| Header | `#0E3D86` (`--c1d3`) |
| Accent / links | `#1565C0` (`--c1`) |
| Page | `#e5e8ee` |
| Surface | `#ffffff` |
| Text | `#333333` |
| Muted | `#666666` |
| Border | `#dddddd` |
| Here / complete | `#2e7d32` |
| First-time | `#ed6c02` |
| Type | Roboto 400/500/700 |

Use existing CSS variables from `public/css/all.css` where they match. Do not invent a second brand.

---

## Page shape

**Directory** — find, list pills, Ask, household (or entity) rows, add at the bottom, bulk bar when selected.

**Record** — two columns on desktop (identity | living slice). Archive and edit reuse the right column. Mobile stacks identity then slice.

**Do not** introduce Material tab bars for Details / Notes / Groups / Attendance / Donations / Forms. Those are sections and verbs, not tabs.

---

## Implementation notes (this branch)

- Shared primitives live in `src/omarchy/` (`PlatedRecord`, `CommandPalette`, `YearLedger`, `NoteThread`). Create them if missing; reuse them if present. Do not fork a second layout kit.
- Keep talking to the same APIs. This is a UI/IA pass, not a backend rewrite.
- Minimal comments. Zero narration. Match surrounding code.
- ESLint must pass on files you touch (`yarn eslint <files>` from this repo root).
- Do not git commit, push, or merge. The orchestrator commits on `omarchy`.
- Do not edit files outside your assigned folders.
- Print views and OAuth/device-auth screens: keep printable/functional; apply type and color only if you touch them.
