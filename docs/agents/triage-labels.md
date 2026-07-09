# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Canonical role  | Label in our tracker |
| --------------- | -------------------- |
| needs-triage    | needs-triage         |
| needs-info      | needs-info           |
| ready-for-agent | ready-for-agent      |
| ready-for-human | ready-for-human      |
| wontfix         | wontfix              |

All five exist in the repo. Verify with `gh label list`.

Meanings:

- `needs-triage` — maintainer needs to evaluate this issue
- `needs-info` — waiting on reporter for more information
- `ready-for-agent` — fully specified, ready for an AFK agent
- `ready-for-human` — requires human implementation
- `wontfix` — will not be actioned

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use. If you rename a
label here, rename it in GitHub too — this file records the mapping, it does not create or
rename anything.
