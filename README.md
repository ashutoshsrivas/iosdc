# iOS Development Centre — Graphic Era University

Source for **https://iosdc.geu.ac.in/**.

The project has two halves that live in this folder but **deploy by different
pipelines to different places on the same server**. Mixing them up is the single
easiest way to leak credentials, so the split is documented here and enforced by
the deploy script's pre-flight check.

## 1. The static marketing site — this folder

Plain HTML/CSS/JS built on the purchased *Larson* theme. No build step.
Deployed to Apache at `/var/www/iosdc` on `15.206.107.186`.

**Real pages** (the only ones in `sitemap.xml`):

| File | URL |
|---|---|
| `index.html` | `/` |
| `about.html` | `/about.html` |
| `events.html` | `/events.html` |
| `cohort2025.html` | `/cohort2025.html` |
| `contact.html` | `/contact.html` |

Every other `*.html` is an **unused Larson theme demo** and is marked
`noindex, nofollow`. `about-old.html` is a superseded draft, also `noindex`.

### Contact form

`contact.html` posts to `php/mail.php` (PHPMailer over SMTP).
Credentials are **never** stored in this repo or under the web root — see
[`php/mail.ini.example`](php/mail.ini.example). Copy it to `/etc/iosdc/mail.ini`
on the server, `chmod 640`, `chown root:www-data`. Until it is filled in, the
form returns a clear "temporarily unavailable" message rather than silently
dropping submissions.

## 2. `ios-sdp/` — the cohort management app

A **separate git repository** (`ashutoshsrivas/ios-sdp`), nested here for
convenience. Express + MySQL + Next.js. It is gitignored by this repo so the two
histories stay independent.

It is served at `/bootcamp` and `/sdp` by the *same* Apache, reverse-proxied to
pm2 processes on ports 3100/4100. See [`ios-sdp/DEPLOYMENT.md`](ios-sdp/DEPLOYMENT.md).

> **`ios-sdp/backend/.env` holds the MySQL and AWS credentials.**
> It must never be copied into `/var/www/iosdc`. The deploy script excludes
> `ios-sdp/`, `node_modules/`, `.env*`, `*.pem` and friends, then runs an
> `rsync --dry-run` and **aborts** if any of those survived the exclude list.

## Deploying the static site

```bash
bash deploy/deploy.sh
```

Steps: back up the docroot → pre-flight exclude check → `rsync` (no `--delete`)
→ move any stray secrets out of the web root into `/home/ubuntu/iosdc-quarantine/`
→ install the Apache hardening conf (with `configtest` + auto-rollback) → verify
over HTTPS.

Deploying `ios-sdp` is a **separate** process; it does not touch the docroot.

## Things that are still open

- The EC2 key pair (`iosdc.pem`) was committed to this public repo and was
  downloadable from the web root. **It must be rotated in AWS** and the old
  public key removed from `~/.ssh/authorized_keys` — quarantining the file does
  not help anyone who already copied it.
- The key is still reachable in this repo's git history. Purging it needs a
  `git filter-repo` rewrite and a force-push, or the repo made private.
- `ios-sdp`'s AWS keys were shared in plaintext and should be rotated too
  (see `ios-sdp/README.md`).
