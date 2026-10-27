# Content brief: Atlas 2.0 Launch Plan

Use exactly this content. Do not add or remove information.

- Title: "Atlas 2.0 Launch Plan". Lead: "Everything the team needs to ship Atlas 2.0 on **December 1**: scope, owners, risks, and the path from beta to general availability."
- Properties (key / value / type): Owner / Priya Raman / text; Status / On track / text; Target date / 2026-12-01 / date.
- Info callout: "Scope is frozen as of **October 20**. New requests go to the 2.1 backlog."
- Section "Goals", bulleted: "Cut cold-start time from 2.4s to under **800ms**"; "Ship offline sync to every paid workspace"; "Reach 99.95% API availability for 30 days before GA".
- Section "Workstreams":
  - Progress bars titled "Workstream progress" with an overall percentage: Sync engine 82%; Desktop app 64%; Migration tooling 7 of 12; Docs & onboarding 40%.
  - Kanban board "Launch board": Todo (Pricing page copy, Status page alerts); In progress (Offline conflict resolver, Migration dry run); Review (SSO for enterprise); Done (Load test at 5x traffic).
- Section "Timeline", milestones (date, title, status, detail): 2026-09-15 Private beta, done, "40 design partners"; 2026-10-20 Scope freeze, done; 2026-11-10 Public beta, in progress, "Feature flags on for 20% of workspaces"; 2026-12-01 General availability, planned; 2027-01-15 2.1 release, planned.
- Section "Architecture": Mermaid flowchart "Sync flow" — Desktop client → Change queue (database) → Conflict resolver (decision) → "clean" → Primary store (database), "conflict" → Manual review. Then a bash code block: `atlas migrate --workspace acme --dry-run` and `atlas migrate --workspace acme --apply`.
- Section "Beta metrics": bar chart "Weekly active workspaces", W1–W4 = 120, 210, 340, 480. Then a risk table with columns Risk, Impact, Owner, Mitigation: Sync data loss / High / Marco / Write-ahead log + nightly restore drill; Migration timeouts / Medium / Lena / Batch by workspace size; Pricing confusion / Low / Priya / Comparison table on pricing page.
- Section "Decisions": decision record "Use CRDTs for offline sync", accepted, 2026-08-04. Context: "Last-write-wins lost edits in 3% of beta sessions." Decision: "Adopt CRDT-based merge for documents and comments." Consequences: "Larger payloads (~15%), but no silent data loss."
- Section "Launch checklist": done "Security review signed off"; done "Load test at 5x expected traffic"; open "Support playbook published"; open "Press kit and launch post ready".
