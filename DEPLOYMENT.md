# Deployment & Setup Instructions

## Pre-Deployment Checklist

- [ ] All database migrations tested locally
- [ ] i18n files created and verified
- [ ] Backend endpoints tested with Postman/curl
- [ ] Frontend compiled without errors
- [ ] All dependencies installed
- [ ] Environment variables set
- [ ] Git committed and pushed

---

## Database Migration

### Understanding Alembic

Alembic is a lightweight database migration tool for SQLAlchemy. It allows you to manage schema changes safely and reversibly.

**Migration files location:**
```
api/alembic/versions/
```

**Current migrations in the project:**

| Revision | Description | New Fields |
|----------|-------------|-----------|
| `6537291496ae` | Initial user setup | users table |
| `a8283f106d90` | User avatar support | avatar field |
| `0e6c87b0f322` | Trade model changes | - |
| `c1a2b3d4e5f6` | Analysis shares table | analysis_shares table |
| `c1a2b3d4e5f6` | Account currency support | account_currency (users) |
| `1a2b3c4d5e6f` | Leverage and margin | leverage, percentage_margin (trades) |

### Step 1: Backup Current Database

Always backup before migrations:

```bash
# SQLite
cp api/trading.db api/trading.db.backup

# PostgreSQL (if used in production)
pg_dump tradingtracker > backup_$(date +%Y%m%d_%H%M%S).sql

# MySQL
mysqldump -u user -p database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Check Current Status

Before applying migrations, see what's pending:

```bash
cd api
alembic current    # Shows current revision
alembic history    # Shows all past migrations
```

### Step 3: Apply Migrations

#### Option A: Use Migration Scripts (Recommended)

These scripts handle the complete migration process:

```bash
# Windows (PowerShell or CMD)
.\migrate_win.sh

# macOS/Linux
./migrate_mac.sh

# Linux Production
./migrate_prod.sh
```

#### Option B: Manual Alembic Command

```bash
cd api

# Apply all pending migrations
alembic upgrade head

# Apply specific number of migrations
alembic upgrade +2

# Apply to specific revision
alembic upgrade <revision_id>
```

#### Option C: Check migrations without applying

```bash
cd api
alembic current  # Current state
```

### Step 4: Verify Migration Success

```bash
# Check new status
alembic current

# Verify database structure
sqlite3 api/trading.db

# In sqlite prompt:
.tables                      # List all tables
.schema users               # Check users table
.schema trades              # Check trades table
.schema analysis_shares     # Check shares table (if migration applied)

# Verify new columns
PRAGMA table_info(users);           # See all columns in users
PRAGMA table_info(trades);          # See all columns in trades
```

### Step 5: Rollback if Needed

If something goes wrong, rollback:

```bash
cd api

# Rollback by 1 migration
alembic downgrade -1

# Rollback to specific revision
alembic downgrade <revision_id>

# Downgrade to very first state (WARNING: loses all data changes)
alembic downgrade base
```

---

## Backend Deployment

### Step 1: Backup Current Database
```bash
# Create backup
cp api/trading.db api/trading.db.backup
```

### Step 2: Apply Migration

#### Option A: Use Migration Scripts (Recommended)
```bash
# Windows
.\migrate_win.sh

# macOS
./migrate_mac.sh

# Linux/Production
./migrate_prod.sh
```

#### Option B: Manual Migration with Alembic
```bash
cd api
alembic upgrade head
```

#### Option C: Check Migration Status
```bash
alembic current
alembic history
```

### Step 3: Verify Migration

```bash
# Connect to database and verify tables
sqlite3 api/trading.db

# In sqlite prompt:
.tables  # Should show analysis_shares table
.schema analysis_shares  # Verify structure
.schema analyses  # Should have pinned and pin_order columns
```

---

## Backend Deployment

### 1. Install Dependencies
```bash
cd api
pip install -r requirements.txt
```

### 2. Update Environment
```bash
# .env or environment variables
PROJECT_ENV=production
DEBUG=false
DATABASE_URL=sqlite:///./trading.db  # Or your database URL
```

### 3. Start API Server
```bash
# Development
python main.py

# Production (with gunicorn)
gunicorn -w 4 -b 0.0.0.0:8000 main:app
```

### 4. Verify Endpoints
```bash
# Test share endpoint
curl -X GET http://localhost:8000/api/analyses/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test new analysis fields
curl -X GET http://localhost:8000/api/analyses/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Frontend Deployment

### 1. Install Dependencies
```bash
cd ui
npm install --legacy-peer-deps
```

### 2. Build for Production
```bash
npm run build
```

### 3. Verify Build Output
```bash
ls -la dist/  # Should contain index.html, assets/, etc.
```

### 4. Deploy Static Files
```bash
# Copy dist folder to web server
cp -r dist/* /var/www/tradingtracker/

# Or use deployment service (Vercel, Netlify, etc.)
npm run deploy  # If configured in package.json
```

### 5. Update API Base URL
```typescript
// In ui/src/config-global.ts or environment
VITE_API_BASE_URL=https://api.tradingtracker.com
```

---

## Environment Configuration

### Backend (.env or environment variables)
```env
PROJECT_ENV=["dev" or "prod"]
DEBUG=["true" or "false"]
DATABASE_URL=[postgres database url]
CORS_ORIGINS=[your cross origins]
SECRET_KEY=[your secret key]
ACCESS_TOKEN_EXPIRE_MINUTES=120
ALGORITHM=HS256
GITHUB_TOKEN=[your github token]
```

### Frontend (.env)
```env
VITE_API_BASE_URL=https://api.tradingtracker.com
VITE_APP_NAME=TradingTracker
```

---

## Post-Deployment Verification

### 1. Test Analysis Sharing
```bash
# User A creates analysis
curl -X POST http://api.com/api/analyses/ \
  -H "Authorization: Bearer TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "content": "..."}' \
  > /tmp/analysis.json

ANALYSIS_ID=$(jq '.id' /tmp/analysis.json)

# User A shares with User B (ID: 2)
curl -X POST http://api.com/api/analyses/$ANALYSIS_ID/share \
  -H "Authorization: Bearer TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"user_ids": [2]}'

# User B retrieves shared analyses
curl -X GET http://api.com/api/analyses/ \
  -H "Authorization: Bearer TOKEN_B" \
  | jq '.[] | select(.is_shared == true)'
```

### 2. Test Language Switching
```bash
# In browser console
localStorage.setItem('language', 'it');
location.reload();
# UI should be in Italian

localStorage.setItem('language', 'en');
location.reload();
# UI should be in English
```

### 3. Test Pin Functionality
```bash
# Update analysis with pin
curl -X PUT http://api.com/api/analyses/1 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pinned": true, "pin_order": 1}'
```

### 4. Monitor Logs
```bash
# Backend logs
tail -f logs/api.log

# Frontend console errors
# Open DevTools → Console
```

---

## Troubleshooting Deployment

### Database Migration Failed
```bash
# Downgrade migration
alembic downgrade -1

# Check migration history
alembic current
alembic history

# Fix and retry
alembic upgrade head
```

### API Endpoints Returning 404
```bash
# Verify endpoints exist
curl -X GET http://localhost:8000/docs
# Swagger UI should show all endpoints

# Check router registration
grep -r "@router" api/api.py
```

### Frontend Not Loading
```bash
# Check build output
npm run build
# Look for errors in console

# Verify static files served
curl http://localhost:3000/index.html
```

### Language Not Persisting
```bash
# Check localStorage
localStorage.getItem('language')

# Verify i18n initialization
console.log(i18n.language)
console.log(i18n.languages)
```

---

## Production Optimization

### Backend
```python
# Use connection pooling
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=40
)

# Enable query caching
@cache.cached(timeout=300)
def get_user_analyses(user_id):
    return db.query(Analysis)...
```

### Frontend
```typescript
// Lazy load routes
const AnalysisView = lazy(() => import('./sections/analysis'));

// Optimize bundle
npm run build --analyze

// Enable compression
// In web server config (nginx/apache)
gzip on;
gzip_types text/plain application/json;
```

### Database
```sql
-- Add indexes for common queries
CREATE INDEX idx_analysis_owner ON analyses(owner_id);
CREATE INDEX idx_share_user ON analysis_shares(shared_with_user_id);
CREATE INDEX idx_share_analysis ON analysis_shares(analysis_id);

-- Vacuum to optimize storage
VACUUM;
```

---

## Database Migration Management

### Creating New Migrations (Development)

When you modify the database models:

```bash
cd api

# Auto-generate migration from model changes
alembic revision --autogenerate -m "Description of your changes"

# Example: Adding a new field to trades
alembic revision --autogenerate -m "Add stop_loss_level field to trades"

# Or create empty migration (manual SQL)
alembic revision -m "Custom migration"
```

Review the generated migration file in `api/alembic/versions/` before applying.

### Applying Migrations in Different Environments

**Development:**
```bash
cd api
alembic upgrade head
```

**Staging:**
```bash
# Backup first
cp api/trading.db api/trading.db.backup

# Apply migrations
./migrate_mac.sh  # or appropriate script

# Verify
alembic current
```

**Production:**
```bash
# Always backup
cp /var/www/tradingtracker/api/trading.db /backups/trading.db.$(date +%Y%m%d_%H%M%S)

# Connect to server
ssh user@production-server

# Apply migrations
cd /var/www/tradingtracker
./migrate_prod.sh

# Verify
source api/venv/bin/activate
cd api
alembic current
```

### Monitoring Migrations

**Check migration history:**
```bash
alembic history --verbose

# Output example:
# a8283f106d90 -> c1a2b3d4e5f6 (head), add_analysis_shares_table
# 0e6c87b0f322 -> a8283f106d90, user_avatar
# 6537291496ae -> 0e6c87b0f322, trade_model_changes
```

**View current state:**
```bash
alembic current

# Output example:
# c1a2b3d4e5f6 (head)
```

**Verify database after migration:**
```bash
sqlite3 api/trading.db

# Check all tables
.tables

# Verify specific table structure
.schema trades
.schema users
.schema analysis_shares

# Check specific columns
PRAGMA table_info(trades);
```

### Common Migration Scenarios

**Scenario 1: Adding a new column**
```sql
-- Generated migration file
def upgrade():
    op.add_column('trades', sa.Column('leverage', sa.Float(), nullable=True))

def downgrade():
    op.drop_column('trades', 'leverage')
```

**Scenario 2: Adding a new table**
```sql
def upgrade():
    op.create_table(
        'analysis_shares',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('analysis_id', sa.Integer(), nullable=False),
        ...
    )

def downgrade():
    op.drop_table('analysis_shares')
```

**Scenario 3: Adding a foreign key**
```sql
def upgrade():
    op.create_foreign_key(
        'fk_analysis_shares_analysis_id',
        'analysis_shares', 'analyses',
        ['analysis_id'], ['id'],
        ondelete='CASCADE'
    )

def downgrade():
    op.drop_constraint('fk_analysis_shares_analysis_id', 'analysis_shares')
```

### Troubleshooting Migration Issues

**Issue: Migration conflicts**
```bash
# Check heads
alembic heads

# If multiple heads found, merge them
alembic merge --message "Merge branches"
```

**Issue: Migration failed halfway**
```bash
# Check current state
alembic current

# Try downgrading
alembic downgrade -1

# Backup database and retry
cp trading.db trading.db.bak
alembic upgrade head
```

**Issue: Database is locked**
```bash
# Stop all processes using the database
sudo systemctl stop tradingtracker-api

# Wait a moment, then retry
sleep 2
alembic upgrade head

# Restart service
sudo systemctl start tradingtracker-api
```

### Migration Performance Tips

1. **Test locally first** - Always test migrations on a development database
2. **Backup before production** - Never skip backups in production
3. **Schedule during low traffic** - Run migrations during off-peak hours
4. **Monitor during execution** - Watch logs while migration runs
5. **Have rollback ready** - Know your downgrade commands before running

---

## Monitoring

### Health Check Endpoint
```python
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "database": "connected"
    }
```

### Metrics to Monitor
- API response times
- Database query performance
- Share operation latency
- Language selector usage
- Failed share attempts
- Storage usage (database size)

### Logging
```python
import logging

logger = logging.getLogger(__name__)

logger.info(f"Analysis {id} shared with {len(user_ids)} users")
logger.error(f"Share failed: {error}")
logger.warning(f"Large share operation: {count} users")
```

---

## Rollback Plan

### If Migration Fails
```bash
# Downgrade database to previous state
alembic downgrade -1

# Or downgrade to specific revision
alembic downgrade <revision_id>

# Verify the downgrade
alembic current

# Redeploy old backend code
git checkout previous-version
pip install -r requirements.txt
```

### If Frontend Issues
```bash
# Rollback static files
git checkout dist/
# Or restore from backup
cp -r /backups/tradingtracker-dist/* dist/
```

### Data Recovery
```bash
# Restore from backup
cp trading.db.backup trading.db

# Verify integrity
sqlite3 trading.db "PRAGMA integrity_check;"
```

---

## Security Considerations

### API Security
```python
# Rate limiting
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@limiter.limit("100/minute")
@app.post("/analyses/{id}/share")
def share_analysis(...):
    ...
```

### Data Protection
- All share operations logged
- Access controlled at database level
- CORS properly configured
- HTTPS enforced

### Performance
```python
# Connection pooling
SQLALCHEMY_POOL_SIZE=20
SQLALCHEMY_POOL_RECYCLE=3600

# Query optimization
db.query(Analysis).options(joinedload(Analysis.shares))
```

---

## Support

For deployment issues:
1. Check logs: `tail -f logs/app.log`
2. Review this guide: See sections above
3. Test endpoints manually using curl/Postman
4. Check Git history for recent changes

---

## Deployment Checklist (Final)

- [ ] Database backed up successfully
- [ ] Migration files reviewed
- [ ] Migration compatibility tested locally
- [ ] Database migrated successfully (`alembic current` shows expected revision)
- [ ] Alembic history verified
- [ ] Backend API running without errors
- [ ] Frontend builds without warnings
- [ ] Static files deployed to web server
- [ ] CORS configured correctly
- [ ] Environment variables set
- [ ] Health check endpoint responding
- [ ] API endpoints tested (reports, exchange rates, positions)
- [ ] Multi-currency support verified
- [ ] Leverage/margin fields working
- [ ] Sharing functionality tested
- [ ] Language selector working
- [ ] Exchange rates API responding
- [ ] Logging configured
- [ ] Backups created
- [ ] SSL/TLS certificates valid
- [ ] Migration rollback plan documented
- [ ] Team notified of deployment

---

Version: 1.0.0
Last Updated: April 13, 2026
