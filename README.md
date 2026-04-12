# 📌 TradingTracker

**TradingTracker** is a full-stack web application designed to track and
visualize trading activity and performance.\
It includes:

-   A **FastAPI backend**
-   A **modern SPA frontend** (React / Angular / Vue / Vite)
-   Production deployment using **NGINX** (static + reverse proxy)
-   FastAPI running as a **systemd service**

This document includes:

1.  Project overview\
2.  Development setup\
3.  Full deployment guide for Linux servers\
4.  NGINX configuration\
5.  systemd service setup\
6.  Useful commands (logs, restart, reload)

------------------------------------------------------------------------

# 🚀 Features

-   Fast and scalable **FastAPI backend**
-   SPA frontend compiled to `dist/`
-   REST API with automatic docs (`/docs`, `/redoc`)
-   Can be deployed in production with:
    -   `systemd` service for API
    -   `NGINX` serving frontend and proxying backend

------------------------------------------------------------------------

# 📁 Repository Structure

    /
    ├── backend/
    │   ├── app/
    │   │   ├── api/
    │   │   ├── core/
    │   │   ├── db/
    │   │   ├── models/
    │   │   ├── schemas/
    │   │   └── main.py
    │   ├── requirements.txt
    │   └── alembic/
    ├── frontend/
    │   ├── src/
    │   ├── public/
    │   └── dist/          # production build output
    ├── README.md
    └── GUIDE.md (merged into this README)

------------------------------------------------------------------------

# 🧠 API Docs

After running the backend:

-   Swagger UI → `http://localhost:8000/docs`
-   ReDoc → `http://localhost:8000/redoc`

------------------------------------------------------------------------

# 🧩 1) Local Development

## Backend (FastAPI)

### 1. Create a virtual environment

``` bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

### 2. Install dependencies

``` bash
pip install -r requirements.txt
```

### 3. Run development server

``` bash
  uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

------------------------------------------------------------------------

## Frontend (SPA)

### 1. Install dependencies

``` bash
cd frontend
npm install
```

### 2. Start development server

``` bash
npm run dev
```

### 3. Build for production

``` bash
npm run build
```

The output appears in:

    frontend/dist/

------------------------------------------------------------------------

# 🚢 2) Production Deployment on Linux

This guide explains how to deploy:

-   Backend served by **systemd** (Uvicorn)
-   Frontend served by **NGINX**
-   NGINX reverse proxy forwarding `/api/*` to FastAPI

------------------------------------------------------------------------

# 🏗 Backend Setup (Production)

### 1. Copy repository to server

    /var/www/tradingtracker/

### 2. Create Python environment

``` bash
cd /var/www/tradingtracker/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Test manually

``` bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

------------------------------------------------------------------------

# 🏗 Frontend Setup (Production)

### 1. Build the frontend

``` bash
cd /var/www/tradingtracker/frontend
npm install
npm run build
```

Build output is stored in:

    /var/www/tradingtracker/frontend/dist

------------------------------------------------------------------------

# ⚙️ NGINX Configuration (Production)

Create:

    /etc/nginx/sites-available/tradingtracker

Paste:

``` nginx
server {
    listen 80;
    server_name your-domain.com;

    # Serve SPA
    root /var/www/tradingtracker/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API reverse proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable and restart nginx:

``` bash
sudo ln -s /etc/nginx/sites-available/tradingtracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

------------------------------------------------------------------------

# 🔁 3) FastAPI as a systemd Service

Create:

    /etc/systemd/system/fastapi.service

Paste:

``` ini
[Unit]
Description=FastAPI Uvicorn Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/tradingtracker/backend
Environment="PATH=/var/www/tradingtracker/backend/venv/bin"
ExecStart=/var/www/tradingtracker/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000

[Install]
WantedBy=multi-user.target
```

------------------------------------------------------------------------

## Enable & start service

``` bash
sudo systemctl daemon-reload
sudo systemctl start fastapi
sudo systemctl enable fastapi
```

------------------------------------------------------------------------

# 🧰 Useful Commands

### View logs

``` bash
sudo journalctl -u fastapi -f
```

### Restart service

``` bash
sudo systemctl restart fastapi
```

### Reload systemd config

``` bash
sudo systemctl daemon-reload
```

------------------------------------------------------------------------

# 🧪 Testing Your Deployment

Visit:

-   **Frontend** → `http://your-domain.com`
-   **API** → `http://your-domain.com/api/...`

------------------------------------------------------------------------

# 🎉 Done!

Your TradingTracker project is now fully documented and deployable in
both **local** and **production** environments using **FastAPI**,
**systemd**, and **NGINX**.
