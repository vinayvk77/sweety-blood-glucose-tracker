# Sweety — Blood Glucose Tracker

Sweety is a small full-stack tracker for recording up to four daily blood glucose readings and reviewing daily, month-to-date, and previous-month summaries.

## What is implemented

- Sign up and log in with name, email, and password. Passwords are hashed with bcrypt; API sessions use a signed JWT.
- User-scoped create, list, edit, and delete operations for readings.
- Validation for required values, whole-number values from 40 to 600 mg/dL, the four supported daily slots, one reading per slot/day, and dates not in the future.
- PostgreSQL constraints enforce ownership relationships, valid slots/ranges, and one reading per time slot per day.
- Daily, month-to-date, and whole-previous-month reports with minimum, maximum, average rounded to one decimal place, count, date range, and friendly empty states.
- Responsive React interface, server-side API, focused validation tests, and a repeatable demo seed.

No paid or third-party API is used. The browser talks to the local Express API, which talks to your PostgreSQL database. Fonts use local system fallbacks; no third-party browser request is required.

## Requirements

- Node.js LTS (Node 20 or newer; this project was prepared with Node 22).
- PostgreSQL 14 or newer installed and running locally.
- MySQL Workbench alone is not sufficient: it connects to MySQL, while this assignment uses PostgreSQL. You can keep Workbench installed; install PostgreSQL separately. pgAdmin is optional.

## PostgreSQL setup on Windows

1. Install PostgreSQL for Windows from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/). During setup, remember the password you assign to the PostgreSQL `postgres` administrator.
2. Open **SQL Shell (psql)** from the Start menu, or open pgAdmin's Query Tool and connect to your local server.
3. Run these statements in order (replace the example password with your own):

   ```sql
   CREATE USER sweety_user WITH PASSWORD 'choose-a-local-password';
   CREATE DATABASE sweety_tracker OWNER sweety_user;
   ```

4. The server runs from its own workspace folder, so copy `.env.example` to `server\.env`. From the project folder, run:

   ```powershell
   Copy-Item .env.example server\.env
   ```

5. Edit `.env` and set `DATABASE_URL` to use the password you chose. For example:

   ```text
   DATABASE_URL=postgresql://sweety_user:choose-a-local-password@localhost:5432/sweety_tracker
   ```

   Replace `JWT_SECRET` with a long random value. Do not commit `server\.env`; it is ignored by Git. The server creates the tables automatically the first time it starts.

## Install and run

Use **Command Prompt** or **PowerShell** in the project directory. On Windows, use `npm.cmd` if PowerShell blocks the `npm.ps1` script:

```powershell
npm.cmd install
npm.cmd run dev
```

Open **http://localhost:5173** in your browser. The React development server runs on port 5173 and the Express API runs on port 4000. Keep the terminal open while using the app. Stop both servers with `Ctrl+C`.

To confirm the API is up, open **http://localhost:4000/api/health**. It should return `{"status":"ok"}`.

## Demo account

After PostgreSQL is configured and the dependencies are installed, run this once from the project folder:

```powershell
npm.cmd run seed
```

Sign in at http://localhost:5173 with:

- Email: `demo@sweety.local`
- Password: `SweetyDemo123!`

The seed adds three readings for the current date. You can instead create your own account from the sign-in screen.

## Tests and production build

```powershell
npm.cmd test
npm.cmd run build
```

The tests cover required-value/range checks, invalid and future dates, and unsupported slots. The build creates the static frontend bundle in `client/dist`.

## GitHub Actions

The workflow in `.github/workflows/ci.yml` runs the backend tests and frontend production build on pushes and pull requests. It does not need PostgreSQL because the current tests exercise the validation layer without connecting to a database.

## API overview

All endpoints are local at `http://localhost:4000/api`.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/register` | Create an account and return a token |
| `POST` | `/auth/login` | Sign in and return a token |
| `GET` | `/readings?date=YYYY-MM-DD` | List the signed-in user's readings for a date |
| `POST` | `/readings` | Add a reading |
| `PUT` | `/readings/:id` | Edit one of the signed-in user's readings |
| `DELETE` | `/readings/:id` | Delete one of the signed-in user's readings |
| `GET` | `/reports?date=YYYY-MM-DD` | Return daily, month-to-date, and previous-month summaries |
| `GET` | `/health` | Local API health check |

Reading writes and report/list requests require `Authorization: Bearer <token>`. Example reading JSON: `{"date":"2026-11-13","slot":"Morning (fasting)","value":104}`.

## GitHub submission checklist

1. Create a **public** repository on GitHub (do not upload `server\.env` or any other `.env` file).
2. In this folder, run `git init`.
3. Before staging, confirm the local environment file is ignored:

   ```powershell
   git check-ignore -v server\.env
   git status --short
   ```

4. Run `git add .` and `git commit -m "Build Sweety glucose tracker"`.
5. Add the repository URL as `origin`, then push the branch to GitHub. Make regular small commits while working, rather than one final large commit.
6. Run the app and capture screenshots or a 2–3 minute screen recording showing signup/login, add/edit/delete, validation, and each report period. Add the evidence to the repository if the company expects it.
7. Include the repository's public URL when forwarding the submission.

## Notes and assumptions

- “Previous month” means the entire calendar month immediately before the selected date's month.
- A date without readings has a friendly empty report; the daily reading list is for the currently selected date.
- The database is local PostgreSQL. No cloud API, paid service, or external credentials are needed to run it.
- The browser UI requires the backend and PostgreSQL to use the actual account and reading features. To preview only the sign-in screen before installing PostgreSQL, run `npm.cmd install` and then `npm.cmd run dev`; the sign-in screen renders, but submitting it will correctly report that the local API/database is unavailable.
- With more time: add frontend automated tests, pagination, a chart, rate limiting, account/session management, and deployment documentation. This app is a learning project and is not a substitute for medical advice.
