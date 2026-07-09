# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Canonical role  | Label in our tracker | Exists in GitHub? |
| --------------- | -------------------- | ----------------- |
| needs-triage    | needs-triage         | no — create it    |
| needs-info      | needs-info           | no — create it    |
| ready-for-agent | ready-for-agent      | no — create it    |
| ready-for-human | ready-for-human      | no — create it    |
| wontfix         | wontfix              | yes (stock label) |

Meanings:

- `needs-triage` — maintainer needs to evaluate this issue
- `needs-info` — waiting on reporter for more information
- `ready-for-agent` — fully specified, ready for an AFK agent
- `ready-for-human` — requires human implementation
- `wontfix` — will not be actioned

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Four of the five labels do not exist in GitHub yet — this file records the mapping, it does not create them. Create them before the first `/triage` run:

```bash
gh label create needs-triage    --description "Maintainer needs to evaluate"
gh label create needs-info      --description "Waiting on reporter"
gh label create ready-for-agent --description "Fully specified, AFK-ready"
gh label create ready-for-human --description "Requires human implementation"
```

Edit the right-hand column to match whatever vocabulary you actually use.
