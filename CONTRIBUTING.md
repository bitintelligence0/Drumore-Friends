# Drumore Friends GitHub rules of engagement

These rules give Bevan, Beth, Jim, and their agents one visible workflow. GitHub is the review ledger for code and structured records. Google Drive remains the source of truth for preserved source material and research.

## Roles

- **Contributor:** owns one bounded branch and its pull request. A contributor or agent never approves its own work.
- **Historical reviewer:** Beth, or a person she designates, reviews names, dates, relationships, wording, uncertainty, captions, and image-rights claims.
- **Implementation reviewer:** Jim or Bevan reviews code, generated data, navigation, accessibility, and validation evidence.
- **Maintainer:** Bevan administers the repository and authorizes publishing. Jim may merge an approved pull request when Bevan has granted repository access and the requested reviews and checks pass.

One person may hold more than one role, but a pull request still needs a reviewer other than its author. Agents act for the named human requester; they are not reviewers and cannot approve their own output.

## The one-repository rule

The review destination is always:

- Repository: `https://github.com/bitintelligence0/Drumore-Friends`
- Base branch: `main`

Before editing, every agent must run or visibly confirm:

```sh
git remote -v
gh auth status
gh repo view bitintelligence0/Drumore-Friends
git fetch origin
git switch main
git pull --ff-only origin main
```

If the contributor has write access, create the branch in the shared repository. Otherwise, fork the repository and keep `upstream` pointed at the repository above. Email addresses and Google Drive access do not grant GitHub access.

## One change, one branch, one PR

Name branches `contrib/<github-user>/<short-topic>` or `dru-<issue>-<short-topic>`. Do not share a working branch between agents.

```sh
git switch -c contrib/<github-user>/<short-topic>
# edit and validate
git add <specific-files>
git commit -m "Describe the bounded change"
git push -u origin HEAD
```

Open a draft PR as soon as the first coherent commit exists:

```sh
gh pr create --draft \
  --repo bitintelligence0/Drumore-Friends \
  --base main \
  --title "Clear description" \
  --body-file /path/to/pr-body.md
```

For a fork, add `--head <github-user>:<branch>`. If the command does not return a `github.com/.../pull/<number>` URL, the work has **not** been submitted. Fix the authentication, remote, fork, or permissions and try again. Do not report that a PR exists until `gh pr view <url>` succeeds.

## What belongs in every PR

Use the repository template and include:

1. Human requester and author or agent.
2. Exact scope and files changed.
3. Record IDs, archive post IDs, and Drive evidence consulted.
4. Claims that remain reported, uncertain, disputed, or unverified.
5. Image-rights or privacy implications.
6. Commands run and browser views checked.
7. Screenshots for visitor-facing changes.
8. The requested historical and implementation reviewers.

Keep generated `site/content.json` in the same commit as its canonical `site/data/` inputs.

## Review and merge

1. Leave the PR in **Draft** while checks, evidence, or questions remain.
2. The author updates from `main` before requesting final review and resolves conflicts on the branch.
3. A historical reviewer approves historical or media changes. An implementation reviewer approves code or data-contract changes. Changes spanning both need both kinds of review.
4. Reviewers use **Request changes** for blocking problems and **Approve** only after the relevant checks pass.
5. The author marks the PR ready only when the template is complete and all local validation available to that contributor has passed.
6. The maintainer or an authorized human merges. Agents merge only when a human explicitly requests that specific merge.
7. Use **Squash and merge** and delete the branch after merge. Pull `main` before beginning the next task.

## Required checks

GitHub runs the repository PR checks on every pull request. Contributors with the synchronized private archive also run:

```sh
cd site
python3 build_content.py
python3 validate.py
python3 validate_story.py
```

The cloud check rebuilds `site/content.json`, rejects stale generated data, compiles the Python files, validates story joins, and checks JSON syntax. It cannot read the private Google Drive archive, so the PR author must report the full local archive validation separately.

## Handoff sentence

Every agent finishes with one line containing the real PR state:

> PR: `<URL>` — draft/ready — checks passing/failing — waiting for `<reviewer>`.

If there is no URL, say: `No PR exists yet`, followed by the concrete blocker.
