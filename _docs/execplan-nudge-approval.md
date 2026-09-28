# One-tap Discord approval for auto-synced data, from pull request to production

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `_docs/PLANS.md` at the repository root.


## Purpose / Big Picture

Today, when the weekly workflow `.github/workflows/auto-character.yml` finds a new Stella Sora character, it opens a pull request from the branch `auto/sync-data` into `develop`. The maintainer must then open GitHub, look at the new icon, merge that pull request, wait for `.github/workflows/promote-to-main.yml` to open a second pull request from `develop` into `main`, and merge that one too before the character reaches the live site (https://taka499.github.io/ss-assist/).

After this change, the maintainer receives a message in their private Discord channel. It shows the new character's name and icon, links to the pull request, and has two buttons, Approve and Decline. One tap on Approve merges the data pull request into `develop`, promotes `develop` to `main`, and starts the production deploy. The Discord message is then edited to say what happened, for example "done: merged #58 into develop, promoted to main (#59), deploy started". The Discord message becomes this repository's release checkpoint, replacing the promotion pull request on GitHub. That is a deliberate decision, recorded as an ADR in Milestone 1.

To see it working, the maintainer runs `auto-character.yml` by hand when there is new data, taps Approve in Discord, and then sees three things. Both pull requests on GitHub are merged. A "Deploy to GitHub Pages" run starts. The Discord message loses its buttons and shows the outcome.

The safety property matters as much as the convenience. A tap approves one exact commit, the one whose icon was shown. The workflow must refuse to merge or release anything else: a newer commit on the pull request, a `develop` branch that moved in the meantime, or other unreleased work sitting on `develop`. Where it refuses, it says so on the Discord message.


## Progress

- [x] (2026-09-27 22:08Z) Research: read both workflows, `pages.yml`, the Nudge README section "Ask for an approval", and the three Nudge action definitions at the pinned commit. Checked repository visibility, branch protection, the Pages environment and LFS behaviour (see `Surprises & Discoveries`).
- [x] (2026-09-27 22:08Z) Created branch `feature/nudge-approval` from `origin/develop` (local `develop` was 16 commits behind `origin/develop` and was left untouched).
- [x] (2026-09-27 22:08Z) Wrote this ExecPlan (user asked for it before any implementation).
- [x] (2026-09-27 22:15Z) Review fixes: the promotion retry now stops when `develop` moves (checked through the API), not by matching error text; the `reason=` rule is made explicit; `actionlint` 1.7.12 installed with the maintainer's approval and the unusable `node_modules/yaml` fallback removed (the package is not installed here).
- [x] (2026-09-27 22:20Z) Milestone 1: `.github/dependabot.yml`, `_docs/adr/README.md` (template copy, paths adapted to `_docs/`), `_docs/adr/0001-one-tap-discord-approval-releases-to-production.md`. The CLAUDE.md "Auto-sync approval via Discord" subsection is written but held for the Milestone 3 commit (see Decision Log).
- [x] (2026-09-27 22:25Z) Codex review of Milestone 1 and the plan design: CHANGES REQUESTED. Accepted: bind the guarded pull request to `auto/sync-data` → `develop` in this repository (Milestone 3); narrow the deploy guarantee; scope the `id-token` claim; hold the CLAUDE.md subsection until Milestone 3; qualify "name and icon". No findings rejected.
- [x] (2026-09-27 22:40Z) Milestone 1 committed as `e8e196d`.
- [x] (2026-09-27 22:45Z) Milestone 2: `auto-character.yml` gains `id: cpr`, the `ask` step (a Node script read from a quoted heredoc, all inputs through `env`, each output written with a random `EOF_<hex>` delimiter), the `sync` job outputs, and the `ask` job holding only `id-token: write`. `actionlint` exits 0. It first reported four `SC2086` info notices in pre-existing lines (unquoted `$GITHUB_OUTPUT` and `${EXIT_CODE}`); those were quoted rather than suppressed, which does not change behaviour. The script was run locally against one-character, two-character and commission-only sync results and produced the expected title, body and image for each. The icon URL form answered `HTTP/2 200`, `content-type: image/png` on `origin/develop`.
- [x] (2026-09-27 22:50Z) Milestone 2 committed as `6ee6302` (Codex review: LGTM, no findings).
- [x] (2026-09-27 23:05Z) Milestone 3: `.github/workflows/nudge-approved.yml` with jobs `merge` (guard, bind, merge, read merge commit), `promote` (checks, find-or-open promotion, guarded merge with retry, then a separate deploy step) and `report`. `actionlint` exits 0 on both workflows; it first flagged `outcome=done` (SC1010, the keyword `done`), so the outcome values are now quoted. The `promote` and `report` scripts were extracted with Ruby's YAML parser and run locally against a fake `gh`. Ten guard scenarios, five API failures and seven outcome mappings behaved as specified. Disabling the "develop moved" check in a copy made that scenario merge, which shows the harness detects a broken guard. The CLAUDE.md subsection is committed with this milestone.
- [x] (2026-09-27 23:20Z) Codex review of the handler: CHANGES REQUESTED. Fixed: the promotion's "already merged" path and any retarget are now caught by a post-merge check (`headRefOid == M`, base `main`) before the deploy; the develop merge records `merged=true` at once and the next step confirms the base is `develop`. Harness re-run: all earlier cases unchanged, and the two new ones ("merged by someone else at a newer head", "retargeted") fail without deploying. Disabling the new check makes the first of them report `promoted=true`, so the harness covers it. Deferred items and their reasons are in the Decision Log.
- [ ] Milestone 4: static validation, commits proposed one per milestone, pull request into `develop`, then promotion to `main` (the handler must be on the default branch before a tap can run it).
- [ ] Milestone 5: end-to-end acceptance run by the maintainer: a manual `auto-character.yml` run, then a tap in Discord.


## Surprises & Discoveries

- Observation: character icons are stored with Git LFS (Large File Storage: git keeps a small text "pointer" in the repository and the real file on a separate server). A `raw.githubusercontent.com` URL therefore serves the pointer text, not the PNG, and Discord cannot show it. The URL form `https://media.githubusercontent.com/media/<owner>/<repo>/<sha>/<path>` serves the real image, and it works at a commit sha.
  Evidence: `.gitattributes` holds `public/assets/characters/*.png filter=lfs diff=lfs merge=lfs -text`. `git show origin/develop:public/assets/characters/char-039.png` prints `version https://git-lfs.github.com/spec/v1 …`. `curl -sI https://media.githubusercontent.com/media/Taka499/ss-assist/<develop sha>/public/assets/characters/char-039.png` answers `HTTP/2 200`, `content-type: image/png`, `content-length: 41086`.

- Observation: when a workflow merges a pull request with the built-in `GITHUB_TOKEN`, GitHub does not start any other workflow from that event. The only exceptions are `workflow_dispatch` and `repository_dispatch`. So after the handler merges into `develop`, `promote-to-main.yml` (triggered by `pull_request: closed`) will not run. After the handler merges into `main`, `pages.yml` (triggered by `push` to `main`) will not run either. The handler therefore has to perform the promotion itself and has to start the deploy explicitly with `gh workflow run pages.yml --ref main`. That call needs the `actions: write` permission.
  Evidence: this is documented GitHub Actions behaviour. The first real run in Milestone 5 confirms it: no "Promote develop to main" run and no push-triggered Pages run appear, only the dispatched one.

- Observation: the Nudge README's handler snippet calls `gh pr merge "$NUMBER" …` in a job with no `actions/checkout`. Outside a git checkout, `gh` cannot tell which repository is meant and fails. Setting the environment variable `GH_REPO` to the repository fixes it.
  Evidence (local, 2026-09-27): from `/`, `gh pr view 56 --json number` prints `failed to run git: fatal: not a git repository`. `GH_REPO=Taka499/ss-assist gh pr view 56 --json number,mergeCommit` prints `{"mergeCommit":{"oid":"9edb331…"},"number":56}`.

- Observation: the repository is public. Neither `main` nor `develop` has branch protection. The only ruleset ("main-protection") has enforcement `disabled`. The `github-pages` environment accepts deployments only from branch `main`. Workflow token default permissions are `read`, and "Allow GitHub Actions to create and approve pull requests" is on (`can_approve_pull_request_reviews: true`), which is why `promote-to-main.yml` can already open pull requests.
  Evidence: `gh repo view --json visibility` → `PUBLIC`. `gh api repos/Taka499/ss-assist/branches/main/protection` → 404 "Branch not protected". `gh api repos/Taka499/ss-assist/rulesets` → `"enforcement":"disabled"`. `gh api …/environments/github-pages/deployment-branch-policies` → one policy, name `main`. `gh api …/actions/permissions/workflow` → `{"default_workflow_permissions":"read","can_approve_pull_request_reviews":true}`.


## Decision Log

- Decision: one tap on Approve merges the data pull request into `develop` and promotes `develop` to `main`, releasing to production. The Discord message (name plus icon) is the release checkpoint, in place of the promotion pull request on GitHub.
  Rationale: this is the maintainer's decision, taken 2026-09-22 and recorded in the Nudge project as its plan decision A7. It belongs to ss-assist, so it is recorded here as `_docs/adr/0001-one-tap-discord-approval-releases-to-production.md` (Milestone 1). Nudge only carries it.
  Date/Author: 2026-09-22, maintainer (recorded here 2026-09-27).

- Decision: the promotion merges `develop` into `main` through a pull request (`develop` → `main`, reused if one is already open), merged with `gh pr merge --merge --match-head-commit <M>`. Here `<M>` is the merge commit the handler has just created on `develop`. The alternative was to merge the sha straight into `main` through the REST "merges" endpoint.
  Rationale: `main` has only ever received merges of `develop` through pull requests (for example #56), which keeps git-flow history readable. `--match-head-commit` makes GitHub refuse the merge if `develop` has moved past `<M>`, which is exactly the "nothing newer than what was approved" guarantee.
  Date/Author: 2026-09-27, agent.

- Decision: before promoting, the handler checks three things, all through the GitHub API so no checkout is needed. First, `<M>` has exactly two parents and the second is the approved commit. Second, `develop` still points at `<M>`. Third, the first parent of `<M>` (what `develop` was before the merge) is already contained in `main`, meaning the GitHub compare status of `main...<first parent>` is `behind` or `identical`. If the first or second check fails, the job stops without touching `main`. If the third fails, `develop` carries other unreleased work that nobody approved in Discord. The handler then opens (or reuses) the promotion pull request for manual review, does not merge it, and reports `failed` with that reason.
  Rationale: together these make "main gains exactly the approved pull request's commits" a checked fact rather than an assumption. Opening the promotion pull request in the third case preserves the old manual path instead of leaving the data stranded on `develop`. Promotion never happens on a weaker condition. If these checks could not be made, the plan would stop and ask rather than weaken them.
  Date/Author: 2026-09-27, agent.

- Decision: the promotion merge's retry loop decides to stop by re-reading `develop` through the API after each failed attempt, not by searching `gh`'s error text for a mention of the head commit.
  Rationale: error wording is not a contract and can change between `gh` versions. The ref is the fact that matters: if `develop` no longer equals `M`, retrying cannot succeed and must not.
  Date/Author: 2026-09-27, agent (from the plan review, accepted by the maintainer).

- Decision: the handler starts the deploy with `gh workflow run pages.yml --ref main` after the promotion merge, and gives the promote job `actions: write`.
  Rationale: see `Surprises & Discoveries`. A merge made with `GITHUB_TOKEN` does not trigger `pages.yml`'s `push` trigger, so without this dispatch nothing would be released.
  Date/Author: 2026-09-27, agent.

- Decision: the icon URL is `https://media.githubusercontent.com/media/${{ github.repository }}/<head sha>/public/assets/characters/<char id>.png`, not `raw.githubusercontent.com`.
  Rationale: icons are LFS objects; see `Surprises & Discoveries`. When several characters are new at once, the first one's icon is shown and the body says to check the others on the pull request, because a request carries one image. When there are no new characters (a commission-only sync), `image` is left empty and the action omits it.
  Date/Author: 2026-09-27, agent.

- Decision: the `merge` job binds the guarded pull request to this repository's own `auto/sync-data` → `develop` pull request before merging. It requires `baseRefName == develop`, `headRefName == auto/sync-data` and `isCrossRepository == false`.
  Rationale: the guard matches any single open pull request whose head is the approved commit. The repository is public, so anyone can fork it, push that same commit and open a pull request against `main`. If the real pull request had been closed, the guard would find only the fork's, and `gh pr merge` would merge it straight into `main`, bypassing every promotion check. Raised by the Codex review of 2026-09-27 and verified by reasoning against the guard's documented contract.
  Date/Author: 2026-09-27, agent.

- Decision: the deploy is dispatched as `gh workflow run pages.yml --ref main`, not pinned to the promotion's merge commit. The safety guarantee is about what the promotion adds to `main`; the deploy builds the tip of `main`.
  Rationale: `workflow_dispatch` accepts only a branch or tag as `--ref`, not a commit sha, and the `github-pages` environment accepts deployments only from branch `main`. So pinning is not possible without a tag scheme this repository does not use. Only the maintainer pushes to `main`, and a push of theirs to `main` triggers its own deploy anyway. Raised by the Codex review of 2026-09-27; the claim is narrowed rather than the design changed.
  Date/Author: 2026-09-27, agent.

- Decision: the CLAUDE.md "Auto-sync approval via Discord" subsection is committed with Milestone 3, not Milestone 1. The ADR states the guards as requirements ("must enforce"), not as existing behaviour.
  Rationale: commits land on `develop` one per milestone. Present-tense documentation of a handler that does not exist yet would mislead anyone reading `develop` in between. Raised by both the Codex review and a `/code-review` pass on 2026-09-27.
  Date/Author: 2026-09-27, agent.

- Decision: the deploy dispatch is a separate step after the promotion, and the `promote` job also outputs `promoted`. The `report` job uses it to say "promoted to main (#P); the deploy could not be started" instead of "not promoted".
  Rationale: with the dispatch inside the promotion step, a failed dispatch after a successful promotion would be reported as "not promoted", which is false and would send the maintainer to fix the wrong thing. Found while writing the handler.
  Date/Author: 2026-09-27, agent.

- Decision: the handler validates `client_payload.actor` as digits before writing it into the promotion pull request's body, and uses "unknown" otherwise. Every `client_payload` value reaches the scripts only through `env`.
  Rationale: `repository_dispatch` payload fields are free-form. Only Nudge's GitHub App can send them, but the handler should not trust their shape. The guard action already rejects a `commit` that is not a 40-character lowercase sha.
  Date/Author: 2026-09-27, agent.

- Decision: after the promotion merge, whichever path saw it merged, the handler checks that the promotion pull request's `baseRefName` is `main` and its `headRefOid` is exactly `M`. If not, it fails with "deploy not started, check main". The develop merge writes `merged=true` straight after `gh pr merge` succeeds, and the next step confirms the pull request's base is `develop`.
  Rationale: Codex review 2026-09-27. The earlier retry loop treated any `MERGED` state as success, so a promotion merged by someone else after `develop` moved would have been reported `done` and deployed. `--match-head-commit` pins only the head, not the base, so a retarget between check and merge can only be detected afterwards, not prevented. Recording `merged` separately stops a successful merge from being reported as "not merged".
  Date/Author: 2026-09-27, agent.

- Decision (review items deferred, Codex 2026-09-27): (a) preventing, not just detecting, a retarget of the source or promotion pull request between check and merge; (b) a promotion that succeeds but whose step dies before writing `promoted=true`; (c) the report job not running when the workflow is cancelled or the runner is lost; (d) the `merge` job's workflow-level write permissions also reaching the guard action.
  Rationale: (a) Only the maintainer and workflows can retarget these pull requests; fork authors cannot, and the binding check rejects fork pull requests. The window is seconds long. Preventing it outright would mean merging through `POST /repos/{owner}/{repo}/merges`, which pins base and head, instead of through pull requests. That reverses the "promote through a pull request" decision above and is the maintainer's call. (b) The window is the moment between two shell lines and needs a runner loss. (c) Already covered in `Idempotence and Recovery`: the buttons stay, and a later tap reports `stale`. (d) The guard is the maintainer's own action, pinned by hash; isolating it would cost a separate job.
  Date/Author: 2026-09-27, agent.

- Decision: add `GH_REPO: ${{ github.repository }}` to every job that runs `gh` without a checkout. Apart from the binding step above, this is the only deviation from the Nudge README snippet.
  Rationale: without it, `gh pr merge` fails; see `Surprises & Discoveries`. The Nudge repository is not edited from this work. The maintainer is told about the snippet gap so they can fix it there.
  Date/Author: 2026-09-27, agent.

- Decision: no `nudge-declined` handler.
  Rationale: it is optional. A Decline already shows on the Discord message who declined. Leaving the pull request open lets the maintainer fix the data on GitHub, and a later push raises a fresh request (see Milestone 2's "updated" case). If closing on Decline turns out to be wanted, a handler that only runs `gh pr close` can be added later.
  Date/Author: 2026-09-27, agent.

- Decision: `promote-to-main.yml` stays as it is.
  Rationale: it still serves the manual path. If the maintainer merges an `auto/` pull request on GitHub by hand, their own token triggers it and the promotion pull request is opened as before. It never fires for the handler's merges (no workflow runs from `GITHUB_TOKEN` events), so the two cannot collide.
  Date/Author: 2026-09-27, agent.

- Decision: `.github/dependabot.yml` sets `target-branch: develop` for the `github-actions` ecosystem.
  Rationale: Dependabot opens its pull requests against the default branch (`main`) unless told otherwise, and in git-flow `main` receives only merges from `develop`. Dependabot will also propose bumps for the tag-pinned actions (`actions/checkout@v4` and others). That is expected and is how the Nudge hash pin stays current.
  Date/Author: 2026-09-27, agent.

- Decision: ADRs live in `_docs/adr/`, with `_docs/adr/README.md` copied from `Taka499/project-template` (`docs/adr/README.md`) and its paths adapted to `_docs/`.
  Rationale: this repository keeps design documents in `_docs/` and had no ADR directory. The user asked for the decision to be recorded as an ADR or equivalent. Copying the template's README keeps the ADR format and lifecycle the same as in the maintainer's other repositories instead of inventing one.
  Date/Author: 2026-09-27, agent.

- Decision: the handler workflow gets `concurrency: { group: nudge-approved, cancel-in-progress: false }`.
  Rationale: two taps in quick succession on two different requests must not interleave. Otherwise the second run's "develop still points at M" check would race the first run's promotion. Queued runs still execute; they are not cancelled.
  Date/Author: 2026-09-27, agent.


## Outcomes & Retrospective

(Not started. Fill in at the end of Milestone 5.)


## Context and Orientation

This repository is a client-side web app published to GitHub Pages. It follows git-flow: work lands on `develop` through pull requests, and `main` receives only merge commits from `develop`. Pushing to `main` deploys the site. The default branch on GitHub is `main`.

Four GitHub Actions workflow files matter here, all in `.github/workflows/`.

`auto-character.yml` runs weekly (Wednesdays 14:00 UTC) and on manual dispatch. It has one job, `sync`, which checks out `develop` with LFS and runs `npm run sync:data -- --output-json /tmp/sync-result.json`. That script is `scripts/auto-character/sync.ts`; it exits 0 when data changed and 2 when nothing changed. The job then validates the data and builds a pull request title and body from the JSON. Finally it runs `peter-evans/create-pull-request@v7` with `base: develop` and `branch: auto/sync-data`. That action creates the pull request, updates it by force-pushing the branch, or does nothing if the content is unchanged. It reports what it did through the step outputs `pull-request-operation` (`created`, `updated`, `closed` or `none`), `pull-request-number`, `pull-request-url` and `pull-request-head-sha` (the full 40-character commit at the pull request's head). The step currently has no `id`, so none of these outputs are reachable yet. The JSON file's `newCharacters` field is a list of `{ id, name_ja }`, for example `{ "id": "char-039", "name_ja": "エレノア" }`. The icon for a character with id `X` is `public/assets/characters/X.png`, an LFS object.

`promote-to-main.yml` runs when a pull request into `develop` is closed. If the pull request was merged and its head branch starts with `auto/`, it opens a pull request from `develop` into `main` titled "release: promote develop to main", unless one is already open. It never merges anything.

`pages.yml` builds and deploys the site. It runs on a push to `main` that touches `package.json`, `data-sources/**`, `data/*.src.json`, `i18n/**` or `public/assets/**`, and on manual dispatch (`workflow_dispatch`).

`nudge-approved.yml` does not exist yet; Milestone 3 creates it.

Nudge (repository `Taka499/nudge`, instance `https://nudge.tia.run`) is a small web service the maintainer runs. It lets a workflow post to the maintainer's private Discord channel with no secret stored in this repository. Here is how it proves which repository is calling. A job with the permission `id-token: write` can ask GitHub for an OIDC token: a short-lived signed statement from GitHub saying "this is a workflow run of repository X". The job sends that token, and Nudge verifies it. Nudge provides three composite actions (reusable bundles of steps). They are always pinned by the full commit hash `d9f7f1ac185050506d526532a0e24861564422cf` (version v1.1.0), never by a tag, because a tag can be moved to other code.

`Taka499/nudge/actions/request` takes the inputs `endpoint`, `title`, `body`, `url` (optional), `commit` (a full 40-character sha) and `image` (optional; an http(s) URL Discord can fetch; empty means none). It posts a message with Approve and Decline buttons and outputs `id`, the Discord message id. The `commit` is what a tap approves. So a new request must be raised every time the pull request is created or updated, because an older message can only ever resolve as stale. Taps on messages older than 7 days do nothing.

When an allowed Discord user taps, Nudge sends a `repository_dispatch` event to this repository. `event_type` is `nudge-approved` or `nudge-declined`, and `client_payload` is `{ id, commit, actor }`, where `actor` is a Discord user id. GitHub runs the workflow file for that event from the default branch, `main`. So the handler does nothing until it has been merged into `main`.

`Taka499/nudge/actions/guard` takes `commit`. It finds the single open pull request whose head is exactly that commit and outputs `pull-request` (its number). Otherwise it fails the job. It sets `stale` to `"true"` when GitHub answered but no open pull request (or more than one) has that head. It leaves `stale` unset when the lookup itself failed.

`Taka499/nudge/actions/resolve` takes `endpoint`, `id`, `outcome` (`done`, `failed` or `stale`) and `detail` (optional). It writes the outcome onto the Discord message and removes its buttons. It must run on every exit path of the handler, from a job whose only permission is `id-token: write`.

A job that holds `id-token: write` should hold nothing else. Any code in that job could obtain a token naming this repository, so it is kept away from write permissions and secrets.


## Plan of Work

Milestone 1 is documentation and configuration only, with no behaviour change. Create `.github/dependabot.yml`:

    version: 2
    updates:
      - package-ecosystem: github-actions
        directory: /
        target-branch: develop
        schedule:
          interval: weekly

Create `_docs/adr/README.md` as a copy of `docs/adr/README.md` from `Taka499/project-template` (fetch it with `gh api repos/Taka499/project-template/contents/docs/adr/README.md --jq .content | base64 -d`). Change its paths from `docs/adr/` to `_docs/adr/`. Create `_docs/adr/0001-one-tap-discord-approval-releases-to-production.md` with `status: accepted`. Its body says, in a few sentences, three things. One tap on Approve in the maintainer's Discord channel merges the `auto/sync-data` pull request into `develop` and promotes to `main`, deploying to production. The message showing the character's name and icon replaces the promotion pull request on GitHub as the release checkpoint. The rejected alternative was a second approval step, which kept a GitHub promotion review. It also names the guards that keep one tap safe: the exact approved commit, `develop` unchanged, and no other unreleased work. Its source line reads: "maintainer decision 2026-09-22 (Nudge plan decision A7); implemented by `_docs/execplan-nudge-approval.md`". In `CLAUDE.md`, under "Deployment", add a short subsection "Auto-sync approval via Discord". It describes the flow in two or three sentences and cites `_docs/adr/0001-…`. It also states that the handler must be on `main` to run. This subsection is written now but committed with Milestone 3, so `develop` never documents a handler it does not have. Milestone 1 ends when these files exist and `git diff` shows only them.

Milestone 2 raises the request. In `.github/workflows/auto-character.yml`, give the create-pull-request step `id: cpr`. After it, add a step `id: ask`, run only when `steps.cpr.outputs.pull-request-operation` is `created` or `updated`. That step runs a small `node -e` script. The script reads `/tmp/sync-result.json` and writes three multi-line-safe outputs to `$GITHUB_OUTPUT` using the `name<<DELIMITER … DELIMITER` form.

The first output is `title`. For one new character it is `New character: <name_ja>`. For several it is `New characters: <name_ja>, <name_ja>`. For none it falls back to the pull request title from `steps.pr_title.outputs.title`.

The second output is `body`. Its first line is "Approve merges #<number> into develop and promotes develop to main, deploying to production. Nothing newer than commit <first 7 characters of head sha> is merged." It then lists the new characters as `<id>: <name_ja>`. When there is more than one, it adds "Icon shown: <first name>; check the others on the pull request." It ends with the counts of new commissions and updated characters and commissions.

The third output is `image`. It is `https://media.githubusercontent.com/media/<GITHUB_REPOSITORY>/<head sha>/public/assets/characters/<first new id>.png`, or empty when there is no new character.

Pass the head sha and number to the script through `env`, never by interpolating `${{ }}` inside the script text. Add `outputs:` to the `sync` job: `operation`, `number`, `url`, `head`, `title`, `body`, `image`, mapped from `steps.cpr` and `steps.ask`.

Then add a second job `ask` with `needs: sync`, `if: needs.sync.outputs.operation == 'created' || needs.sync.outputs.operation == 'updated'`, `runs-on: ubuntu-latest`, and `permissions: id-token: write` only. Its single step uses `Taka499/nudge/actions/request@d9f7f1ac185050506d526532a0e24861564422cf # v1.1.0` with `endpoint: https://nudge.tia.run` and `title`, `body` and `image` from the `sync` outputs. It also sets `url: ${{ needs.sync.outputs.url }}` and `commit: ${{ needs.sync.outputs.head }}`. The workflow-level `permissions` (contents and pull-requests write) stay. A job-level `permissions` block replaces the workflow-level one entirely, so `ask` gets only `id-token: write`.

Milestone 3 adds the handler, `.github/workflows/nudge-approved.yml`, triggered by `on: repository_dispatch: types: [nudge-approved]`. It sets the workflow-level permissions `contents: write` and `pull-requests: write` as in the Nudge snippet, plus the concurrency group from the Decision Log. It has three jobs.

Job `merge` is the README snippet, with two changes: `GH_REPO` in the `env` of the steps that run `gh`, and one added binding step. Step `guard` runs the guard action with `commit: ${{ github.event.client_payload.commit }}`. The added step `id: bind` then reads `gh pr view "$NUMBER" --json baseRefName,headRefName,isCrossRepository`. It requires `develop`, `auto/sync-data` and `false`, and otherwise fails the job before anything is merged. The next step runs `gh pr merge "$NUMBER" --merge --match-head-commit "$COMMIT"`. After it, one added step `id: merged` reads the merge commit with `gh pr view "$NUMBER" --json mergeCommit --jq .mergeCommit.oid` and writes it to `$GITHUB_OUTPUT` as `commit`. The job outputs are `stale`, `number` (both from the guard, as in the snippet) and `merge-commit`.

Job `promote` has `needs: merge`, runs only when `merge` succeeded (the default), and has `permissions: contents: write, pull-requests: write, actions: write`. Its `env` holds `GH_TOKEN: ${{ github.token }}`, `GH_REPO: ${{ github.repository }}`, `M: ${{ needs.merge.outputs.merge-commit }}`, `APPROVED: ${{ github.event.client_payload.commit }}`, `SOURCE: ${{ needs.merge.outputs.number }}` and `ACTOR: ${{ github.event.client_payload.actor }}`. It runs these steps with `set -euo pipefail`. Every failure path first writes a one-line `reason=` to `$GITHUB_OUTPUT` and then exits 1. Failures the script does not anticipate (an API error under `set -e`) write no reason; the `report` job's fallback "see <run URL>" covers them. To make that rare, each `gh` call whose failure is foreseeable is wrapped so it writes a reason before exiting.

1. Check `M`. Read its parents with `gh api "repos/$GH_REPO/commits/$M" --jq '[.parents[].sha] | join(" ")'`. Require exactly two, with the second equal to `$APPROVED`. Read `develop` with `gh api "repos/$GH_REPO/git/ref/heads/develop" --jq .object.sha` and require it to equal `$M`. Read `gh api "repos/$GH_REPO/compare/main...<first parent>" --jq .status`. `behind` or `identical` means clean; anything else sets `unreleased=true`.
2. Find an open promotion pull request with `gh pr list --base main --head develop --state open --json number --jq '.[0].number'`. If there is none, create one with `gh pr create --base main --head develop --title "release: promote develop to main"` and a body. The body says it was approved in Discord (actor id `$ACTOR`) at commit `$APPROVED` and promotes #`$SOURCE`. Output its number as `promotion`.
3. If `unreleased=true`, write the reason "develop has other unreleased commits; promotion #<n> left open for review" and exit 1.
4. Merge with `gh pr merge "$PROMOTION" --merge --match-head-commit "$M"`. Retry up to 5 times, 5 seconds apart, because GitHub computes a new pull request's mergeability asynchronously and can briefly refuse. After each failed attempt, re-read `develop` through the API. If it no longer equals `$M`, stop at once with the reason "develop moved during promotion; promotion #<n> left open for review". The decision to stop depends on state, not on the wording of `gh`'s error message.
After a successful merge the step writes `promoted=true`.
5. In a separate step `id: deploy`, run `gh workflow run pages.yml --ref main`. If it fails, write the reason "the deploy could not be started; run pages.yml by hand" and exit 1. The job output `reason` is the promote step's reason, or failing that the deploy step's.

Job `report` has `needs: [merge, promote]`, `if: always()`, and `permissions: id-token: write` only. Its first step `id: outcome` is plain bash. It receives `needs.merge.result`, `needs.merge.outputs.stale`, `needs.merge.outputs.number`, `needs.promote.result`, `needs.promote.outputs.promotion` and `needs.promote.outputs.reason` through `env`, plus the run URL `${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}`. It writes `outcome` and `detail` according to these rules:

- Merge and promote both succeeded: `done`, "merged #N into develop, promoted to main (#P), deploy started".
- The merge job's `stale` output is `true`: `stale`, "pull request head moved or it was closed; nothing merged".
- The merge job failed otherwise: `failed`, "not merged; see <run URL>".
- The merge succeeded and the promotion merged, but the deploy could not be started (`promoted` is `true`): `failed`, "merged #N into develop, promoted to main (#P); <reason>".
- The merge succeeded but promote failed otherwise: `failed`, "merged #N into develop; not promoted: <reason, or 'see <run URL>'>".

The second step runs `Taka499/nudge/actions/resolve@d9f7f1ac185050506d526532a0e24861564422cf # v1.1.0` with `endpoint: https://nudge.tia.run`, `id: ${{ github.event.client_payload.id }}` and the two computed values.

Milestone 4 validates, commits and ships the files in the right order (see Concrete Steps). Milestone 5 is the maintainer's end-to-end run (see Validation and Acceptance). No agent runs any workflow at any point.


## Concrete Steps

All commands run from the repository root, `/Users/ghensk/Developer/ss-assist`, on branch `feature/nudge-approval`.

Validate the YAML after Milestones 2 and 3 with `actionlint`, a linter for GitHub Actions workflows. It is installed locally (1.7.12, via Homebrew, approved by the maintainer 2026-09-27). It also runs `shellcheck` over every `run:` script. Run:

    actionlint .github/workflows/auto-character.yml .github/workflows/nudge-approved.yml

It should print nothing and exit 0. Then verify every Nudge reference is pinned:

    grep -n "Taka499/nudge" .github/workflows/*.yml

Every line printed must end in `@d9f7f1ac185050506d526532a0e24861564422cf # v1.1.0`. Finally run the unchanged project checks to confirm nothing else broke:

    npm run type-check && npm test

Commits need the maintainer's explicit permission (see `CLAUDE.md` and the user-level rules). Propose one commit per milestone, adding files individually and never with `git add .`:

    docs: record one-tap Discord release decision — ADR 0001, dependabot for github-actions
    feat: raise a Nudge approval request for auto-sync pull requests — name and icon in Discord
    feat: nudge-approved handler — merge into develop, guarded promotion to main, deploy, resolve  (includes the CLAUDE.md subsection)

The ExecPlan file itself goes into the first commit. The unrelated untracked file `_docs/ss-assist-auto-character-pipeline-v2.md` stays untracked.

The merge order matters because `repository_dispatch` and the weekly `schedule` both run workflow files from the default branch, `main`:

1. Push `feature/nudge-approval` and open a pull request into `develop`; the maintainer merges it.
2. Open (or reuse) the pull request `develop` → `main` and let the maintainer merge it on GitHub. That push touches only `.github/`, `_docs/` and `CLAUDE.md`, none of which match `pages.yml`'s path filter, so no deploy runs.
3. After step 2, `develop` is contained in `main`. That is the steady state the handler's "no other unreleased work" check expects.

Only after step 2 can the maintainer test (Milestone 5).


## Validation and Acceptance

The maintainer performs the acceptance run; the agent only prepares it.

First, run the workflow on a day when StellaSoraData has something new. Go to GitHub → Actions → "Auto-detect new characters" → "Run workflow" on `main`. If the run says "No changes detected.", there is nothing to approve and the `ask` job is skipped. That is correct behaviour, and the test must wait for new data. When there are changes, the `sync` job opens or updates pull request #N from `auto/sync-data` into `develop`. The `ask` job then succeeds, and a Discord message appears. It is headed by the repository name, its title is "New character: <name>" linked to #N, its body explains what a tap does, the new icon is displayed, and it has Approve and Decline buttons.

Second, tap Approve. Within a minute or two, GitHub → Actions shows an "Approved from Discord" run (the handler) with `merge`, `promote` and `report` all green, and #N shows as merged into `develop`. A pull request "release: promote develop to main" is shown as merged. A "Deploy to GitHub Pages" run with the event `workflow_dispatch` starts and succeeds. After it, the live site (https://taka499.github.io/ss-assist/) lists the new character. The Discord message has lost its buttons and reads "done: merged #N into develop, promoted to main (#P), deploy started".

Negative checks, when convenient. Tapping the same message again changes nothing, because it has been answered. Pushing another commit to `auto/sync-data` before tapping an old message makes that tap report `stale`, with #N untouched. Merging something else into `develop` first makes the tap report "merged #N into develop; not promoted: develop has other unreleased commits; promotion #P left open for review". In that last case `main` is unchanged.


## Idempotence and Recovery

Editing files is repeatable. A handler run cannot double-act. The guard fails once #N is merged, because an open pull request with that head no longer exists, and Nudge ignores taps on answered messages.

If the `promote` job fails after the merge into `develop`, `main` is untouched. The Discord message says why, and the promotion pull request is either open or can be opened by hand. Merging it on GitHub with the maintainer's own account triggers `pages.yml` normally.

If the `report` job fails (Nudge unreachable), the Discord message keeps its buttons, but GitHub's state is correct. A further tap then reports `stale`, which is harmless.

To roll the whole feature back, revert the merge of `feature/nudge-approval` on `develop` and promote. `promote-to-main.yml` is unchanged and continues to serve the manual path.


## Artifacts and Notes

The approval payload and the guard's contract, as seen by the handler:

    github.event.action           = "nudge-approved"
    github.event.client_payload   = { "id": "<discord message id>", "commit": "<40-hex sha>", "actor": "<discord user id>" }
    guard outputs                 = pull-request: "<number>", stale: "true" | unset

The outcome mapping written by the `report` job is listed in `Plan of Work`, Milestone 3.


## Interfaces and Dependencies

These are external actions, each pinned by commit hash with the version in a trailing comment:

    Taka499/nudge/actions/request@d9f7f1ac185050506d526532a0e24861564422cf # v1.1.0
    Taka499/nudge/actions/guard@d9f7f1ac185050506d526532a0e24861564422cf   # v1.1.0
    Taka499/nudge/actions/resolve@d9f7f1ac185050506d526532a0e24861564422cf # v1.1.0

The Nudge instance is `https://nudge.tia.run`. The tools used inside jobs are the GitHub CLI `gh` and `jq`, both preinstalled on `ubuntu-latest`, plus `node` in the `sync` job (already set up there).

At the end of Milestone 2, the `sync` job in `.github/workflows/auto-character.yml` exposes these outputs: `operation`, `number`, `url`, `head`, `title`, `body`, `image`. At the end of Milestone 3, `.github/workflows/nudge-approved.yml` has these jobs and outputs: `merge` (outputs `stale`, `number`, `merged`, `merge-commit`), `promote` (outputs `promotion`, `promoted`, `reason`), and `report`. Among the jobs this plan adds or changes, only `report` and `auto-character.yml`'s `ask` hold `id-token: write`, and they hold nothing else. (`pages.yml`'s deploy job also holds `id-token: write`, alongside `pages: write`, as GitHub Pages deployment requires. This plan leaves it alone.)

Nothing in the `Taka499/nudge` repository is changed by this plan.
