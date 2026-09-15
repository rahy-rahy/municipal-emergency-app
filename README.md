# Municipal Emergency Reporting App

Together for a safer community. Residents report incidents, operators respond, admins send town alerts. This build uses a secure Node and Express backend, a real PostgreSQL database, and an installable web app that works on any Android phone from the browser.

This is a demonstration build. It is not connected to real emergency services.

## What you need

- Node.js 18 or newer, from https://nodejs.org
- One of these for the database:
  - Docker Desktop, which the launcher uses to start Postgres for you, or
  - your own PostgreSQL, set through DATABASE_URL in `.env`

## Run it on Windows

1. Extract the folder.
2. Open the folder, then open PowerShell inside it.
3. Run: `.\launch-windows.cmd`
4. When it prints the address, open it: http://localhost:3000

The first run starts the database, installs dependencies, and creates the tables and demo data. Later runs keep your data. Press Ctrl + C to stop.

## Run it on macOS or Linux

```
./start-mac-linux.sh
```

## Demo accounts

All demo accounts use the password `demo1234`. The sign in page also has one tap buttons.

- Admin: admin@admin.metn.gov.lb
- Operator: support@staff.metn.gov.lb
- Verified resident: resident@example.com
- Pending signup: pending@example.com

## How sign up works

New people sign up with an email and a password. They confirm the email through a link. An operator then reviews the account before it can report. A new account is always a resident. Operator and admin roles are granted only by an admin, never by the email a person types.

When no mail server is set, the confirmation link is printed to the server log and shown on screen in demo mode, so you can test without email.

## Security in this build

- Passwords hashed with bcrypt. Plain passwords are never stored.
- Server side sessions stored in Postgres. The cookie holds only a signed id.
- CSRF protection on every state changing request.
- Rate limits on the API and tighter limits on sign in.
- Security headers including a content security policy.
- Every database query uses parameters, so there is no SQL injection.
- Uploaded ID images live outside the public folder and are served only through access controlled links.
- Role checks run on the server for every protected call and every protected page.

## Using your own database

Open `.env` and set one line:

```
DATABASE_URL=postgres://user:password@host:5432/dbname
PGSSL=true
```

Then run the launcher. It will migrate and seed on first run.

## Project layout

```
server/            Express app, security, routes, auth, database
server/db/         connection pool and SQL migrations
public/            the web app: pages, styles, scripts, PWA files
views/             protected page shells served only after a role check
scripts/           migrate, seed, reset helpers
docker-compose.yml local Postgres for development
```

## Before real use

This build is complete and secure for a demo, but a real deployment still needs:

- Serve over HTTPS and set `COOKIE_SECURE=true` and a long random `SESSION_SECRET`.
- Set `DEMO_MODE=false` to remove the quick login and reset.
- Real email sending for verification links.
- Real phone verification if you want SMS. This needs a provider and testing for Lebanese numbers.
- Move ID images to encrypted object storage with a retention policy.
- Fill in the legal entity, contact, and data retention details in the Terms and Privacy pages.
- A backup plan for the database.

## Commands

- `npm start` run the server
- `npm run migrate` apply database migrations
- `npm run seed` add demo data if the database is empty
- `npm run reset` restore the demo data
- `npm run setup` migrate then seed
