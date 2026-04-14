# TradingTracker Documentation Hub

Complete documentation for setup, development, deployment, and migrations.

---

## 📚 Documentation Files

### Getting Started
- **[README.md](README.md)** - Project overview, local development, production deployment basics
- **[GUIDE.md](GUIDE.md)** - Original user guide

### Deployment & Production
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Step-by-step deployment instructions with migrations, backend, frontend setup
- **[GUIDE_PROD.md](GUIDE_PROD.md)** - Comprehensive production guide with systemd, NGINX, SSL/TLS, monitoring, troubleshooting

### Migrations & Database
- **[MIGRATIONS_REFERENCE.md](MIGRATIONS_REFERENCE.md)** - Quick reference for Alembic commands and migration workflows
- [README.md#database-migrations](README.md#🗄️-database-migrations-alembic) - Basic migration info in README

### Features & Implementation
- **[FEATURES_GUIDE.md](FEATURES_GUIDE.md)** - User-facing features documentation
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Technical implementation details
- **[MULTI_CURRENCY_GUIDE.md](MULTI_CURRENCY_GUIDE.md)** - Multi-currency position calculation guide
- **[EXCHANGE_RATES_API.md](EXCHANGE_RATES_API.md)** - Live exchange rates API integration

---

## 🎯 Choose Your Path

### 👨‍💻 I'm a Developer

**Local Development Setup:**
1. Read [README.md - Local Development](README.md#🧩-1-local-development)
2. Set up backend: `cd api && python main.py`
3. Set up frontend: `cd ui && npm run dev`

**Creating New Features:**
1. Review [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
2. Check [MULTI_CURRENCY_GUIDE.md](MULTI_CURRENCY_GUIDE.md) for multi-currency logic
3. Test migrations locally using [MIGRATIONS_REFERENCE.md](MIGRATIONS_REFERENCE.md)

**Adding Database Changes:**
1. Modify models in `api/models.py`
2. Generate migration: `alembic revision --autogenerate -m "Description"`
3. Test: `alembic upgrade head`
4. Review [MIGRATIONS_REFERENCE.md](MIGRATIONS_REFERENCE.md) for troubleshooting

### 🚀 I'm Deploying to Production

**First Time Setup:**
1. Read [README.md - Production Deployment](README.md#🚢-2-production-deployment-on-linux)
2. Follow [DEPLOYMENT.md - Database Migration](DEPLOYMENT.md#database-migration)
3. Follow [DEPLOYMENT.md - Backend Setup](DEPLOYMENT.md#🏗-backend-setup-production)
4. Follow [DEPLOYMENT.md - Frontend Setup](DEPLOYMENT.md#🏗-frontend-setup-production)

**Complete Production Guide:**
- See [GUIDE_PROD.md](GUIDE_PROD.md) for:
  - NGINX configuration with SSL
  - systemd service setup
  - Monitoring and logs
  - SSL/TLS with Let's Encrypt
  - Troubleshooting guide

**Database Migrations:**
- [MIGRATIONS_REFERENCE.md](MIGRATIONS_REFERENCE.md) - Quick commands reference
- [DEPLOYMENT.md - Migration Management](DEPLOYMENT.md#database-migration-management) - Detailed instructions

### 🔧 I Need to Run Migrations

**Quick Commands:**
```bash
# Apply migrations
./migrate_prod.sh          # Recommended
# or manually
alembic upgrade head

# Check status
alembic current
alembic history
```

**Full Guide:**
- Read [MIGRATIONS_REFERENCE.md](MIGRATIONS_REFERENCE.md) for quick reference
- Read [DEPLOYMENT.md - Migration Management](DEPLOYMENT.md#database-migration-management) for detailed steps
- Read [GUIDE_PROD.md - Database Migrations](GUIDE_PROD.md#database-migrations) for comprehensive guide

### 🐛 I'm Troubleshooting

**API Issues:**
- Check [GUIDE_PROD.md - Troubleshooting](GUIDE_PROD.md#troubleshooting)
- Check backend logs: `sudo journalctl -u tradingtracker-api -f`

**Migration Issues:**
- See [MIGRATIONS_REFERENCE.md - Troubleshooting](MIGRATIONS_REFERENCE.md#troubleshooting)
- See [GUIDE_PROD.md - Troubleshooting](GUIDE_PROD.md#troubleshooting)

**Database Issues:**
- See [GUIDE_PROD.md - Database Health](GUIDE_PROD.md#database-health)

**NGINX Issues:**
- See [GUIDE_PROD.md - NGINX Logs](GUIDE_PROD.md#nginx-logs)

### 📊 I Want to Understand Features

**Multi-Currency Support:**
- Read [MULTI_CURRENCY_GUIDE.md](MULTI_CURRENCY_GUIDE.md)
- Understand position calculations and exchange rates

**Exchange Rates API:**
- Read [EXCHANGE_RATES_API.md](EXCHANGE_RATES_API.md)
- Learn about ECB integration, caching, and fallback mechanisms

**All Features:**
- Read [FEATURES_GUIDE.md](FEATURES_GUIDE.md)
- See what's available for users

### 📈 I Need to Monitor Production

**Logs:**
- Backend: `sudo journalctl -u tradingtracker-api -f`
- NGINX: `sudo tail -f /var/log/nginx/error.log`
- Check [GUIDE_PROD.md - Monitoring](GUIDE_PROD.md#monitoring--logs)

**Database Health:**
- Check database size: `ls -lh api/trading.db`
- Verify integrity: `sqlite3 api/trading.db "PRAGMA integrity_check;"`
- Backup: `cp api/trading.db /backups/trading.db.backup`

---

## 📋 Current Migrations

| # | Revision | Description | Fields Added |
|---|----------|-------------|--------------|
| 1 | `6537291496ae` | Initial user setup | users table |
| 2 | `a8283f106d90` | User avatar support | avatar field |
| 3 | `0e6c87b0f322` | Trade model changes | - |
| 4 | `c1a2b3d4e5f6` | Analysis shares table | analysis_shares table |
| 5 | `c1a2b3d4e5f6` | Account currency support | account_currency (users) |
| 6 | `1a2b3c4d5e6f` | Leverage and margin | leverage, percentage_margin (trades) |

---

## 🚀 Quick Start Commands

### Development
```bash
# Backend
cd api && python main.py

# Frontend
cd ui && npm run dev

# Migrations
cd api
alembic current
alembic upgrade head
```

### Production Deployment
```bash
# Backup
cp api/trading.db api/trading.db.backup

# Migrate
./migrate_prod.sh

# Verify
alembic current

# Restart services
sudo systemctl restart tradingtracker-api
sudo systemctl restart nginx
```

### Troubleshooting
```bash
# Check status
sudo systemctl status tradingtracker-api
alembic current
curl http://localhost:8000/health

# View logs
sudo journalctl -u tradingtracker-api -f
sudo tail -f /var/log/nginx/error.log

# Test database
sqlite3 api/trading.db ".tables"
```

---

## 📞 Support

For issues specific to:

1. **Development** - Check [README.md](README.md) or [GUIDE.md](GUIDE.md)
2. **Deployment** - Check [DEPLOYMENT.md](DEPLOYMENT.md) or [GUIDE_PROD.md](GUIDE_PROD.md)
3. **Migrations** - Check [MIGRATIONS_REFERENCE.md](MIGRATIONS_REFERENCE.md)
4. **Features** - Check [FEATURES_GUIDE.md](FEATURES_GUIDE.md) or [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
5. **Multi-Currency** - Check [MULTI_CURRENCY_GUIDE.md](MULTI_CURRENCY_GUIDE.md)
6. **Exchange Rates** - Check [EXCHANGE_RATES_API.md](EXCHANGE_RATES_API.md)

---

## 🔍 Find Information

- **How to deploy?** → [DEPLOYMENT.md](DEPLOYMENT.md) or [GUIDE_PROD.md](GUIDE_PROD.md)
- **How to run migrations?** → [MIGRATIONS_REFERENCE.md](MIGRATIONS_REFERENCE.md)
- **What features exist?** → [FEATURES_GUIDE.md](FEATURES_GUIDE.md)
- **How does multi-currency work?** → [MULTI_CURRENCY_GUIDE.md](MULTI_CURRENCY_GUIDE.md)
- **How is the exchange rate API set up?** → [EXCHANGE_RATES_API.md](EXCHANGE_RATES_API.md)
- **Technical implementation details?** → [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- **Local dev setup?** → [README.md](README.md)

---

Version: 1.0.0  
Last Updated: April 13, 2026  
Project: TradingTracker
