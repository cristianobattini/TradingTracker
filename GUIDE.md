GUIDE — Deploy su Linux (systemd + nginx)
=======================================

Questo documento descrive come distribuire in produzione l'API FastAPI (`api/`) e il frontend (`ui/`) su un server Linux (con `systemd` e `nginx`). Le istruzioni assumono che il servizio backend venga chiamato `fastapi` (file systemd: `fastapi.service`). Se preferisci un altro nome, sostituiscilo nelle istruzioni.

Prerequisiti sul server
- Ubuntu / Debian / CentOS con `systemd`
- `python3` (>= 3.10)
- `pip` o `python3 -m pip`
- `node` (per build frontend) e `npm`
- `nginx`
- `git`
- Un database PostgreSQL disponibile e raggiungibile

Passo 1 — Preparazione del server
1. Aggiorna il sistema e installa pacchetti base:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-venv python3-pip nginx git
```

2. (Opzionale) Installa Node.js per build frontend:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Passo 2 — Clona il progetto e configura l'ambiente

```bash
sudo mkdir -p /opt/tradingtracker
sudo chown $USER:$USER /opt/tradingtracker
cd /opt/tradingtracker
git clone <repo-url> .
```

Creare il file delle variabili ambiente per il backend `api/.env` (non committare):

```bash
cat > api/.env <<'EOF'
DATABASE_URL=postgresql://trading_user:strongpassword@db-host:5432/trading_db
SECRET_KEY=una_super_secret_key
OTHER_ENV=...
EOF
```

Passo 3 — Creare virtualenv e installare dipendenze (backend)

```bash
cd /opt/tradingtracker/api
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
```

Passo 4 — Build del frontend

```bash
cd /opt/tradingtracker/ui
npm ci
npm run build
# Il build Vite genera la cartella `dist/`
```

Passo 5 — Creare il servizio systemd per FastAPI

Esempio di unit file (`/etc/systemd/system/fastapi.service`):

```ini
[Unit]
Description=TradingTracker FastAPI
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/tradingtracker/api
EnvironmentFile=/opt/tradingtracker/api/.env
ExecStart=/opt/tradingtracker/api/venv/bin/python -m uvicorn api:app --host 127.0.0.1 --port 8000 --workers 1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Note:
- `User`/`Group`: puoi usare `www-data` o creare un utente dedicato (es. `tradingtracker`).
- `ExecStart`: usa il path al binario Python del virtualenv. Puoi passare `--workers` o usare `gunicorn` con `uvicorn.workers.UvicornWorker` per più worker.

Ricarica systemd e abilita il servizio:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now fastapi.service
```

Comandi utili (inseriti anche nel README richiesto):
- LOG: `sudo journalctl -u fastapi -f`
- RESTART: `sudo systemctl restart fastapi`
- RELOAD (di systemd dopo modifica unit): `sudo systemctl daemon-reload`

Verifica lo stato:

```bash
sudo systemctl status fastapi
```

Passo 6 — Configurare nginx (reverse proxy + static)

Esempio di blocco server nginx (`/etc/nginx/sites-available/tradingtracker`) :

```nginx
server {
    listen 80;
    server_name example.com; # sostituisci con il tuo dominio

    # Serve i file statici del frontend
    root /opt/tradingtracker/ui/dist;
    index index.html;

    location /static/ {
        # se il tuo dist mette risorse in /assets o /static
        try_files $uri $uri/ =404;
    }

    # API reverse proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    # Fallback per SPA (history mode)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Abilita e ricarica nginx:

```bash
sudo ln -s /etc/nginx/sites-available/tradingtracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Passo 7 — Permessi e SELinux / firewall

- Assicurati che l'utente del servizio (`www-data` o tuo utente) abbia accesso a `/opt/tradingtracker`.
- Se usi `ufw`:

```bash
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Passo 8 — Aggiornamenti e deploy continui

- Per aggiornare il codice:

```bash
cd /opt/tradingtracker
git pull origin main
cd api && source venv/bin/activate && pip install -r requirements.txt && deactivate
cd ui && npm ci && npm run build
sudo systemctl restart fastapi
sudo systemctl reload nginx
```

Esempio di script di deploy rapido:

```bash
#!/bin/bash
set -e
cd /opt/tradingtracker
git pull origin main
cd api
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ../ui
npm ci
npm run build
sudo systemctl restart fastapi
sudo systemctl reload nginx
```

Debug e log
- Vedere log del servizio FastAPI con: `sudo journalctl -u fastapi -f`
- Verificare log nginx con: `sudo tail -f /var/log/nginx/error.log`

Consigli aggiuntivi
- Usa HTTPS (Let’s Encrypt + certbot) prima di mettere in produzione.
- Considera di usare un processo manager come `gunicorn` con `UvicornWorker` per produzione e più worker.
- Valuta containerizzazione (Docker) se preferisci deploy portabili.

Se vuoi, posso generare i file systemd e il blocco nginx già pronti per il tuo dominio e percorso (es. utente diverso da `www-data`). Dimmi il nome del servizio e il dominio.
