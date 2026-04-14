# Production Deployment & Migration Guide

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Database Migrations](#database-migrations)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [NGINX Configuration](#nginx-configuration)
6. [systemd Service Setup](#systemd-service-setup)
7. [SSL/TLS Configuration](#ssltls-configuration)
8. [Monitoring & Logs](#monitoring--logs)
9. [Troubleshooting](#troubleshooting)
10. [Rollback Procedures](#rollback-procedures)

---

## Pre-Deployment Checklist

Before deploying to production:

- [ ] All code committed to git
- [ ] Local environment tested
- [ ] Database migrations reviewed
- [ ] Environment variables configured
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] Frontend built successfully (`npm run build`)
- [ ] API endpoints tested with authentication
- [ ] Database backed up
- [ ] Firewall rules configured
- [ ] SSL/TLS certificates ready

---

## Database Migrations

### Understanding Alembic

**Alembic** is the migration tool for SQLAlchemy. It manages database schema changes safely and reversibly.

Migration files are located in:
```
api/alembic/versions/
```

### Pre-Migration Steps

**1. Backup current database**
```bash
# SQLite
cp api/trading.db api/trading.db.backup

# PostgreSQL (if used in production)
pg_dump tradingtracker > tradingtracker_backup.sql
```

**2. Check current migration status**
```bash
cd api
alembic current
```

Output example:
```
INFO  [alembic.runtime.migration] Context impl SQLiteImpl.
INFO  [alembic.runtime.migration] Will assume non-transactional DDL.
...
c1a2b3d4e5f6 (head)
```

### Applying Migrations

#### Option 1: Using Migration Scripts (Recommended)

Windows:
```bash
.\migrate_win.sh
```

macOS:
```bash
./migrate_mac.sh
```

Linux/Production:
```bash
./migrate_prod.sh
```

#### Option 2: Manual Alembic Command

```bash
cd api
alembic upgrade head
```

This will apply all pending migrations in sequence.

#### Option 3: Specific Migration

```bash
cd api
# Upgrade to specific revision
alembic upgrade <revision_id>

# Example: upgrade to account_currency migration
alembic upgrade c1a2b3d4e5f6
```

### Post-Migration Verification

**1. Check migration status**
```bash
alembic current
```

**2. Verify database structure**
```bash
# SQLite
sqlite3 api/trading.db

.tables  # List all tables
.schema users  # Show users table structure
.schema trades  # Show trades table structure
```

**3. Test API endpoints**
```bash
# Test report endpoint with multi-currency support
curl -X GET http://localhost:8000/api/report/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test exchange rates endpoint
curl -X GET "http://localhost:8000/api/exchange-rates?from_currency=EUR&to_currency=USD"
```

### Migration History

View all migrations:
```bash
alembic history
```

Output example:
```
<base> -> c1a2b3d4e5f6 (head), add_account_currency
<base> -> 0e6c87b0f322, trade_model_changes
<base> -> 6537291496ae, user
```

### Available Migrations

| Revision | Description | Status |
|----------|-------------|--------|
| `6537291496ae` | Initial user setup | Applied |
| `a8283f106d90` | User avatar support | Applied |
| `0e6c87b0f322` | Trade model changes | Applied |
| `c1a2b3d4e5f6` | Add analysis shares table | Applied |
| `c1a2b3d4e5f6` | Add account_currency to users | Pending |
| `1a2b3c4d5e6f` | Add leverage and margin to trades | Pending |

---

## Backend Deployment

### 1. Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Python and dependencies
sudo apt install -y python3 python3-pip python3-venv sqlite3

# Create application directory
sudo mkdir -p /var/www/tradingtracker
sudo chown $USER:$USER /var/www/tradingtracker
cd /var/www/tradingtracker
```

### 2. Deploy Application Files

```bash
# Clone or copy repository
git clone <your-repo-url> .
# OR
# scp -r ./* user@server:/var/www/tradingtracker/
```

### 3. Setup Python Environment

```bash
cd /var/www/tradingtracker/api

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install production server
pip install gunicorn
```

### 4. Configure Environment

Create `.env` file:
```bash
cat > .env << EOF
PROJECT_ENV=production
DEBUG=False
DATABASE_URL=sqlite:///./trading.db
SECRET_KEY=your-secure-random-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
USE_EXCHANGE_RATE_API=True
EXCHANGE_RATE_CACHE_TTL=3600
EOF
```

**Generate secure secret key:**
```python
import secrets
print(secrets.token_urlsafe(32))
```

### 5. Run Migrations

```bash
cd /var/www/tradingtracker/api
source venv/bin/activate
alembic upgrade head
```

### 6. Test Backend

```bash
# Test locally first
python main.py

# Test API endpoints
curl http://localhost:8000/health
curl http://localhost:8000/docs
```

### 7. Start with Gunicorn (Production)

```bash
# In background with nohup
nohup gunicorn -w 4 -b 0.0.0.0:8000 main:app &

# Or use systemd (recommended, see systemd section)
```

**Gunicorn workers formula:** `(2 × CPU cores) + 1`
- For 2-core server: 5 workers
- For 4-core server: 9 workers

---

## Frontend Deployment

### 1. Install Dependencies

```bash
cd /var/www/tradingtracker/ui
npm install
```

### 2. Build for Production

```bash
npm run build
```

Output directory: `ui/dist/`

### 3. Verify Build

```bash
# Check build output
ls -la dist/
du -sh dist/  # Check size

# Look for index.html and assets
file dist/index.html
```

### 4. Setup Web Server

Move built files to web server directory:
```bash
sudo cp -r dist/* /var/www/html/
```

Or configure NGINX to serve from build directory (see NGINX section).

---

## NGINX Configuration

### 1. Install NGINX

```bash
sudo apt install -y nginx
```

### 2. Create Configuration

Create `/etc/nginx/sites-available/tradingtracker`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    # Serve frontend
    root /var/www/tradingtracker/ui/dist;
    index index.html;

    # SPA routing - try to serve file, if not found serve index.html
    location / {
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }

    # Static assets - cache longer
    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API reverse proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        
        # Headers for proper proxying
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Deny access to sensitive files
    location ~ /\.env {
        deny all;
    }

    location ~ /\.git {
        deny all;
    }
}
```

### 3. Enable and Test

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/tradingtracker /etc/nginx/sites-enabled/

# Disable default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart NGINX
sudo systemctl restart nginx
```

### 4. Verify

```bash
# Check NGINX is running
sudo systemctl status nginx

# Check logs for errors
sudo tail -f /var/log/nginx/error.log
```

---

## systemd Service Setup

### 1. Create Service File

Create `/etc/systemd/system/tradingtracker-api.service`:

```ini
[Unit]
Description=TradingTracker FastAPI Service
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/tradingtracker/api
Environment="PATH=/var/www/tradingtracker/api/venv/bin"
Environment="PROJECT_ENV=production"
ExecStart=/var/www/tradingtracker/api/venv/bin/gunicorn \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 60 \
    --access-logfile /var/log/tradingtracker/access.log \
    --error-logfile /var/log/tradingtracker/error.log \
    main:app

# Restart policy
Restart=always
RestartSec=10

# Resource limits
MemoryLimit=512M

[Install]
WantedBy=multi-user.target
```

### 2. Create Log Directory

```bash
sudo mkdir -p /var/log/tradingtracker
sudo chown www-data:www-data /var/log/tradingtracker
sudo chmod 755 /var/log/tradingtracker
```

### 3. Enable and Start Service

```bash
# Reload systemd daemon
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable tradingtracker-api

# Start service
sudo systemctl start tradingtracker-api

# Check status
sudo systemctl status tradingtracker-api
```

### 4. Verify Service

```bash
# View service logs
sudo journalctl -u tradingtracker-api -f

# Check if API is responding
curl http://localhost:8000/health
```

---

## SSL/TLS Configuration

### Using Let's Encrypt with Certbot

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d your-domain.com

# Auto-renewal (runs daily)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verify auto-renewal
sudo systemctl status certbot.timer
```

### Manual Certificate Renewal

```bash
sudo certbot renew --dry-run  # Test renewal
sudo certbot renew             # Actual renewal
sudo systemctl restart nginx   # Restart NGINX
```

---

## Monitoring & Logs

### Backend Logs

```bash
# Real-time logs
sudo journalctl -u tradingtracker-api -f

# Last 100 lines
sudo journalctl -u tradingtracker-api -n 100

# Errors only
sudo journalctl -u tradingtracker-api -p err

# Since last hour
sudo journalctl -u tradingtracker-api --since "1 hour ago"
```

### NGINX Logs

```bash
# Access log
sudo tail -f /var/log/nginx/access.log

# Error log
sudo tail -f /var/log/nginx/error.log

# Service logs
sudo journalctl -u nginx -f
```

### Database Health

```bash
# Check database size
ls -lh /var/www/tradingtracker/api/trading.db

# Backup database
cp /var/www/tradingtracker/api/trading.db \
   /var/backups/trading.db.$(date +%Y%m%d_%H%M%S)

# Verify database integrity
sqlite3 /var/www/tradingtracker/api/trading.db "PRAGMA integrity_check;"
```

### Monitoring with uptime

```bash
# Install htop for resource monitoring
sudo apt install -y htop
htop

# Or use built-in commands
ps aux | grep gunicorn
ps aux | grep nginx
```

---

## Troubleshooting

### Issue: API not responding

**Check if service is running:**
```bash
sudo systemctl status tradingtracker-api
sudo systemctl restart tradingtracker-api
```

**Check logs:**
```bash
sudo journalctl -u tradingtracker-api -n 50
```

**Test API directly:**
```bash
curl http://localhost:8000/health
```

### Issue: NGINX showing 502 Bad Gateway

**Check if backend is running:**
```bash
curl http://127.0.0.1:8000/health
```

**Check NGINX logs:**
```bash
sudo tail /var/log/nginx/error.log
```

**Restart both services:**
```bash
sudo systemctl restart tradingtracker-api
sudo systemctl restart nginx
```

### Issue: Database migrations failed

**Check current status:**
```bash
cd /var/www/tradingtracker/api
source venv/bin/activate
alembic current
```

**Rollback and retry:**
```bash
alembic downgrade -1
alembic upgrade head
```

### Issue: SSL certificate not working

**Check certificate:**
```bash
sudo certbot certificates
```

**Check NGINX configuration:**
```bash
sudo nginx -t
```

**Renew certificate:**
```bash
sudo certbot renew --force-renewal
```

---

## Rollback Procedures

### Rollback Database Migration

```bash
cd /var/www/tradingtracker/api
source venv/bin/activate

# Downgrade by 1 migration
alembic downgrade -1

# Or specific revision
alembic downgrade <revision_id>
```

**Steps:**
1. Stop the API service
2. Backup current database
3. Run downgrade command
4. Verify with previous version
5. Restart service

### Rollback Application Code

```bash
# If using git
cd /var/www/tradingtracker
git log --oneline -10
git revert <commit_hash>

# Or restore from backup
cp /path/to/backup/* .
```

### Rollback Frontend

```bash
cd /var/www/tradingtracker/ui

# Restore previous build
cp -r dist.backup/* dist/

# Restart NGINX
sudo systemctl restart nginx
```

---

## Post-Deployment Verification

After deployment, verify everything works:

```bash
# 1. Check API health
curl https://your-domain.com/api/health

# 2. Test authentication
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# 3. Check API docs
curl https://your-domain.com/api/docs

# 4. Test exchange rates
curl "https://your-domain.com/api/exchange-rates?from_currency=EUR&to_currency=USD"

# 5. Test frontend
curl https://your-domain.com/ | grep -o "<title>.*</title>"
```

---

## Security Best Practices

1. **Use HTTPS everywhere** - Never expose HTTP in production
2. **Restrict SSH access** - Use key-based authentication only
3. **Firewall rules** - Only allow necessary ports (80, 443, 22)
4. **Keep packages updated** - Run `sudo apt update && sudo apt upgrade` regularly
5. **Backup regularly** - Daily database backups to secure location
6. **Monitor logs** - Set up log rotation and monitoring
7. **Disable debug mode** - Always set `DEBUG=False` in production
8. **Rotate secrets** - Change API keys and passwords periodically

---

## Quick Commands Reference

```bash
# Service management
sudo systemctl status tradingtracker-api
sudo systemctl restart tradingtracker-api
sudo systemctl stop tradingtracker-api
sudo systemctl start tradingtracker-api

# View logs
sudo journalctl -u tradingtracker-api -f

# Database operations
alembic current
alembic upgrade head
alembic downgrade -1

# NGINX operations
sudo nginx -t
sudo systemctl restart nginx

# Check API
curl http://localhost:8000/health
```

---

## Need Help?

- Check logs: `sudo journalctl -u tradingtracker-api -f`
- Review NGINX config: `sudo nginx -t`
- Test database: `sqlite3 api/trading.db ".tables"`
- View migration status: `alembic history`
