---
status: accepted
---

# One tap on Approve in Discord releases auto-synced data to production

When the weekly auto-sync opens or updates its `auto/sync-data` pull request, the maintainer gets a Discord message (via Nudge) describing the sync, with the new character's name and icon when there is one. One tap on Approve merges that pull request into `develop`, promotes `develop` to `main`, and starts the GitHub Pages deploy. That Discord message is the release checkpoint, in place of the promotion pull request on GitHub. The rejected alternative was a second approval step that kept a GitHub review of the `develop` → `main` promotion. It was rejected because the icon check in Discord is the review that matters, and a second step only adds latency. A single tap is acceptable only because the approval handler (`.github/workflows/nudge-approved.yml`) must enforce these guards:

- It merges only the exact commit that was shown, and only through this repository's own `auto/sync-data` → `develop` pull request.
- It promotes only if `develop` still points at that merge.
- It promotes only if `develop` carries no other unreleased work; otherwise it leaves the promotion pull request open for manual review.

The deploy then builds the tip of `main`, which these guards leave holding exactly the approved change.

Source: maintainer decision 2026-09-22 (Nudge plan decision A7); implemented by `_docs/execplan-nudge-approval.md`.
