# Database Migrations - Quick Reference

## What is Alembic?

Alembic is a database migration tool that tracks and applies schema changes safely and reversibly.

**Key concepts:**
- **Revision**: A database schema version
- **Migration**: The process of moving from one revision to another
- **Head**: The latest/current revision
- **Upgrade**: Move forward in migrations
- **Downgrade**: Move backward in migrations

---

## Quick Commands

### Check Status
```bash
cd api
alembic current          # Show current revision
alembic history          # Show all migrations
alembic history -v       # Show verbose history
```

### Apply Migrations
```bash
alembic upgrade head     # Apply all pending
alembic upgrade +1       # Apply 1 migration
alembic upgrade <rev>    # Apply to specific revision
```

### Rollback
```bash
alembic downgrade -1     # Undo 1 migration
alembic downgrade base   # Undo all migrations
alembic downgrade <rev>  # Undo to specific revision
```

### Use Scripts (Recommended)
```bash
./migrate_win.sh         # Windows
./migrate_mac.sh         # macOS
./migrate_prod.sh        # Linux Production
```

---

## Current Migrations

| # | Revision | Description | Status |
|---|----------|-------------|--------|
| 1 | `6537291496ae` | Initial user setup | ✅ Applied |
| 2 | `a8283f106d90` | User avatar support | ✅ Applied |
| 3 | `0e6c87b0f322` | Trade model changes | ✅ Applied |
| 4 | `c1a2b3d4e5f6` | Analysis shares table | ✅ Applied |
| 5 | `c1a2b3d4e5f6` | Account currency support | Pending |
| 6 | `1a2b3c4d5e6f` | Leverage and margin | Pending |

---

## Database Fields by Migration

### Migration 1-3: Core Tables
- `users`: id, username, email, hashed_password, valid, role, initial_capital, avatar
- `trades`: id, date, pair, system, action, entry, lots, profit_or_loss, etc.
- `analyses`: id, title, pair, timeframe, content, created_at, updated_at, owner_id

### Migration 4: Sharing
- `analysis_shares`: id, analysis_id, shared_with_user_id, shared_by_user_id, created_at
- `analyses`: added pinned, pin_order columns

### Migration 5: Multi-Currency
- `users`: added account_currency (default: USD)

### Migration 6: Leverage/Margin
- `trades`: added leverage, percentage_margin columns

---

## Before Migration

**1. Backup database**
```bash
# SQLite
cp api/trading.db api/trading.db.backup

# PostgreSQL
pg_dump tradingtracker > backup_$(date +%Y%m%d).sql

# MySQL
mysqldump -u user -p tradingtracker > backup_$(date +%Y%m%d).sql
```

**2. Stop API server (production)**
```bash
sudo systemctl stop tradingtracker-api
```

**3. Check current state**
```bash
alembic current
alembic history
```

---

## After Migration

**1. Verify status**
```bash
alembic current  # Should show new revision
```

**2. Check database**
```bash
sqlite3 api/trading.db
.tables                # View all tables
.schema users          # View users schema
PRAGMA table_info(trades);  # View trades columns
```

**3. Test API**
```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/report/
curl "http://localhost:8000/api/exchange-rates?from=EUR&to=USD"
```

**4. Restart services (production)**
```bash
sudo systemctl start tradingtracker-api
sudo systemctl status tradingtracker-api
```

---

## Troubleshooting

### Migration Failed

```bash
# Check error details
alembic upgrade head  # See full error message

# Rollback if needed
alembic downgrade -1

# Restore backup
cp api/trading.db.backup api/trading.db

# Retry with verbose logging
alembic upgrade head -x sqlecho=true
```

### Database Locked

```bash
# Stop any processes using database
sudo lsof /var/www/tradingtracker/api/trading.db

# Kill processes if needed
kill -9 <PID>

# Then retry migration
alembic upgrade head
```

### Downgrade Issues

```bash
# Check downgrade function in migration file
nano api/alembic/versions/<revision>.py

# Verify downgrade function exists
# Then downgrade
alembic downgrade -1
```

---

## File Locations

```
api/
├── alembic/
│   ├── versions/            # Migration files
│   ├── env.py              # Alembic config
│   └── README
├── alembic.ini             # Main config
└── trading.db              # Database file
```

---

## Production Workflow

```
1. Backup database
   └─ cp trading.db trading.db.backup

2. Check current state
   └─ alembic current

3. Stop API server
   └─ sudo systemctl stop tradingtracker-api

4. Apply migrations
   └─ ./migrate_prod.sh
   or
   └─ alembic upgrade head

5. Verify
   └─ alembic current
   └─ sqlite3 trading.db ".tables"

6. Start API server
   └─ sudo systemctl start tradingtracker-api

7. Test endpoints
   └─ curl http://localhost:8000/health
   └─ curl http://localhost:8000/api/report/
```

---

## Emergency Rollback

If something goes wrong in production:

```bash
# 1. Stop API
sudo systemctl stop tradingtracker-api

# 2. Downgrade database
cd /var/www/tradingtracker/api
source venv/bin/activate
alembic downgrade -1

# 3. Verify
alembic current

# 4. Or restore full backup
cp /backups/trading.db.backup trading.db

# 5. Start API
sudo systemctl start tradingtracker-api

# 6. Test
curl http://localhost:8000/health
```

---

## Creating New Migrations

When adding new fields to models:

```bash
cd api

# Auto-generate from model changes
alembic revision --autogenerate -m "Add new_field to trades table"

# Review generated file
nano alembic/versions/<new_revision>.py

# Test locally
alembic upgrade head

# If OK, commit and push
git add alembic/versions/<new_revision>.py
git commit -m "Add migration: new_field"
```

---

## Best Practices

✅ **DO:**
- Backup before every migration
- Test migrations locally first
- Review migration files before applying
- Keep migrations small and focused
- Document what each migration does
- Run migrations during low-traffic times

❌ **DON'T:**
- Skip backups
- Run migrations on production without testing
- Mix multiple changes in one migration
- Apply migrations to production immediately
- Ignore error messages
- Delete migration files after applying them

---

## Need Help?

1. **Check logs**: `sudo journalctl -u tradingtracker-api -f`
2. **Read migration file**: `nano api/alembic/versions/<revision>.py`
3. **Test locally**: Copy database locally and test migration
4. **Review DEPLOYMENT.md**: Section on "Database Migration Management"
5. **Review GUIDE_PROD.md**: Section on "Database Migrations"

---

Last Updated: April 13, 2026
