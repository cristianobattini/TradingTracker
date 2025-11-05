# 🚀 Project Management Guide

Questo progetto include due script Bash per automatizzare il ciclo di vita del tuo ambiente di sviluppo e produzione:

- `scripts/start_project.sh` → avvia e prepara backend + frontend  
- `scripts/manage_project.sh` → gestisce stato, log, aggiornamenti e riavvii

Entrambi funzionano su **Linux** e **macOS**. Su **Windows** puoi usare **WSL** o **Git Bash**.

---

## 🧩 1. Struttura generale del progetto

| Directory | Descrizione |
|------------|-------------|
| `api/` | Backend FastAPI (Python) |
| `ui/` | Frontend (Vite + React / TypeScript) |
| `scripts/` | Script di gestione e automazione |
| `logs/` | Log dei servizi |
| `pids/` | PID dei processi backend/frontend |
| `.project_config` | File generato automaticamente con info sull’ambiente |

---

## ⚙️ 2. Requisiti

Assicurati che siano installati:

- `python3` (≥ 3.9)
- `pip`
- `npm`
- `curl`
- `bash`

E che l’ambiente `DATABASE_URL` sia configurato nel file `api/.env`:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/tradingtracker
```

---

## ▶️ 3. Avvio del progetto

Esegui dalla root del progetto:

```bash
chmod +x scripts/start_project.sh
chmod +x scripts/manage_project.sh
```

### Avvio in modalità sviluppo
```bash
./scripts/manage_project.sh dev
```
oppure
```bash
./scripts/manage_project.sh start development
```

### Avvio in modalità produzione
```bash
./scripts/manage_project.sh prod
```
oppure
```bash
./scripts/manage_project.sh start production
```

Durante l’avvio:

- Crea e attiva un virtual environment (`api/venv`)
- Installa le dipendenze Python e Node.js
- Avvia il backend (`FastAPI` su `http://localhost:8000`)
- Avvia il frontend (`Vite` su `http://localhost:3039`)
- Genera il client TypeScript (`ui/src/client`) da `/openapi.json`
- Salva PID e log in `pids/` e `logs/`
- Registra l’ambiente in `.project_config`

---

## 🧠 4. Comandi disponibili (`manage_project.sh`)

### 🔹 Avvio
```bash
./scripts/manage_project.sh start [env]
```

### 🔹 Stop
```bash
./scripts/manage_project.sh stop
```

### 🔹 Stato
```bash
./scripts/manage_project.sh status
```

### 🔹 Riavvio
```bash
./scripts/manage_project.sh restart
```

### 🔹 Log
```bash
./scripts/manage_project.sh logs [service] [lines]
```

### 🔹 Aggiornamento
```bash
./scripts/manage_project.sh update
```

---

## 🧱 5. Dettagli di `start_project.sh`

Questo script viene richiamato automaticamente da `manage_project.sh` e si occupa di:

1. Setup ambiente Python (`api/venv` + `requirements.txt`)
2. Setup frontend (`npm install`)
3. Avvio backend (FastAPI su porta 8000)
4. Attesa `/openapi.json`
5. Generazione client TypeScript
6. Avvio frontend (porta 3039)
7. Gestione PID e log

---

## 🪶 6. File generati automaticamente

| File / Directory | Descrizione |
|------------------|-------------|
| `.project_config` | Contiene l’ambiente attivo e parametri di servizio |
| `logs/backend.log` | Log del backend |
| `logs/frontend.log` | Log del frontend |
| `pids/backend.pid` | PID backend |
| `pids/frontend.pid` | PID frontend |

---

## 💡 7. Troubleshooting

| Problema | Soluzione |
|-----------|------------|
| `DATABASE_URL non trovata` | Crea `api/.env` con la variabile |
| `Error loading ASGI app` | Assicurati che in `api/main.py` esista `app = FastAPI()` |
| `Permission denied` | Esegui `chmod +x scripts/*.sh` |
| `422 su /users/me` | Metti `/users/me` sopra `/users/{user_id}` in FastAPI |
| Frontend non si avvia | Controlla la porta 3039 |
| OpenAPI client non generato | Controlla `http://localhost:8000/openapi.json` |

---

## 🪟 8. Utilizzo su Windows

Usa **WSL (Ubuntu)** o **Git Bash**.  
In alternativa, la versione PowerShell è `scripts/start_project.ps1`:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\scripts\start_project.ps1
```

---

## 🧭 9. Esempio di ciclo completo

```bash
./scripts/manage_project.sh start development
./scripts/manage_project.sh status
./scripts/manage_project.sh logs backend 30
./scripts/manage_project.sh restart
./scripts/manage_project.sh update
./scripts/manage_project.sh stop
```
