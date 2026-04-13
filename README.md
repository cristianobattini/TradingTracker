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
python3 main.py
```
or
``` bash
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

------------------------------------------------------------------------

## Frontend (SPA)

### 1. Install dependencies

``` bash
cd frontend
npm install --legacy-peer
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

Look at GUIDE_PROD.md

------------------------------------------------------------------------

# 🎉 Done!

Your TradingTracker project is now fully documented and deployable in
both **local** and **production** environments using **FastAPI**,
**systemd**, and **NGINX**.
