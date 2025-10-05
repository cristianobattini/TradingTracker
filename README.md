
# start_project.sh — usage and behavior

This README documents the purpose and usage of the `start_project.sh` helper script included in this repository. The script is intended to automate a local development workflow (Linux/macOS) by:

- creating/activating a Python virtual environment under `api/venv`,
- installing Python backend dependencies from `api/requirements.txt`,
- installing frontend dependencies (in `ui/`),
- starting the backend and frontend dev servers, and
- generating TypeScript client code from the running backend OpenAPI spec (if available).

The script is written for POSIX shells (bash) and is best run on Linux or macOS. For Windows, use WSL/Git Bash or adapt the commands manually (see notes below).

## Quick run (Linux / macOS)

Make the script executable and run it from the repository root:

```bash
chmod +x start_project.sh
./start_project.sh
```

What the script will do (high level):

- Check for required commands: `python3`, `npm`, `curl`.
- Create a Python venv at `api/venv` if missing and activate it.
- Install Python packages from `api/requirements.txt` (or fall back to a small default set).
- Install frontend dependencies in `ui/` using `npm install --legacy-peer-deps`.
- Start the backend (runs `python3 main.py` in `api/`) in the background on port 8000.
- Wait for the backend to serve `/docs` and `/openapi.json`.
- Generate TypeScript client code under `ui/src/client` using `npx @hey-api/openapi-ts` (with a fallback approach when direct generation fails).
- Patch the generated client OpenAPI base URL to `http://localhost:8000` if necessary.
- Start the frontend dev server (`npm run dev`) in the background (Vite default port used by the project is 3039).
- Monitor both processes and stop them (cleanup) on Ctrl+C.

The script prints progress messages and returns non-zero exit codes on fatal errors (like missing commands or failed installs).

## Required environment variables / files

- `DATABASE_URL` — The backend will raise an error if this environment variable is not present. Create a file `api/.env` with this line or export the variable in your shell before running the script.

Example `api/.env`:

DATABASE_URL=postgresql://user:password@localhost:5432/tradingtracker

Other environment variables used by the backend (secrets, admin credentials) should be set as needed.

## Behavior and idempotency

- If `api/venv` exists the script will attempt to activate it rather than recreate it.
- The script is safe to re-run; it will skip venv creation if present and will reinstall npm dependencies each time (unless you modify it).
- The script runs backend and frontend as background processes and prints PIDs. It traps SIGINT (Ctrl+C) to gracefully kill both processes.

## Troubleshooting and common errors

- "Python3 / npm / curl not found": install the missing program(s) or ensure they are in PATH.
- "DATABASE_URL non trovata": create `api/.env` or export `DATABASE_URL` in your shell before running.
- Frontend install errors: try `npm install --legacy-peer-deps` manually in `ui/` or use `yarn install`.
- OpenAPI generation failures: ensure `http://localhost:8000/openapi.json` is reachable. The script attempts a second approach (download then generate) if the direct generation fails.

If a command in the script fails, the script prints helpful messages and often stops further execution.

## Notes for Windows users


The script is POSIX/bash only. Recommended options for Windows environments:

- Use WSL (Windows Subsystem for Linux) and run the script from a WSL shell.
- Use Git Bash or another POSIX-compatible shell that supports bash scripts.
- Alternatively, run the included PowerShell helper: `start_project.ps1` (Windows PowerShell / PowerShell Core). This script mirrors `start_project.sh` behavior for Windows-native environments.

To run the PowerShell script from the repository root (PowerShell):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\start_project.ps1
```

The PowerShell script will create `api\venv`, install Python and frontend dependencies, start the backend and frontend, attempt OpenAPI-based client generation, and keep processes running until stopped.

## Database setup (PostgreSQL)

The backend requires a PostgreSQL database reachable from the server running the backend. Below are quick steps to create a database and user.

Linux (Ubuntu) example:

```bash
# Install Postgres if needed
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Switch to postgres user
sudo -u postgres psql

# Inside psql create user and database (replace password and names)
CREATE USER trading_user WITH PASSWORD 'strongpassword';
CREATE DATABASE trading_db OWNER trading_user;
# Exit
\q

# Example DATABASE_URL
export DATABASE_URL="postgresql://trading_user:strongpassword@localhost:5432/trading_db"
```

Windows (PowerShell) example using PostgreSQL installer:

1. Install PostgreSQL from https://www.postgresql.org/download/windows/ and note the postgres superuser password.
2. Open PowerShell and run psql (adjust path if necessary):

```powershell
# Start psql (you may need to provide the full path to psql.exe)
pSQL -U postgres

# In psql create user and database
CREATE USER trading_user WITH PASSWORD 'strongpassword';
CREATE DATABASE trading_db OWNER trading_user;
\q

# Example DATABASE_URL (PowerShell)
$env:DATABASE_URL = 'postgresql://trading_user:strongpassword@localhost:5432/trading_db'
```

Notes:

- Use strong passwords and consider creating the database and user with restrictive permissions appropriate for production.
- You can also use managed Postgres services (RDS, Azure Database for PostgreSQL, etc.) and set `DATABASE_URL` accordingly.

