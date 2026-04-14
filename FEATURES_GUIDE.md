# TradingTracker: Analysis Sharing & i18n Implementation

## Quick Start Guide

### Prerequisites
- Python 3.8+
- Node.js 20+
- SQLite or compatible database
- npm or yarn

### Installation Steps

#### 1. Backend Setup (Python)

```bash
cd api
pip install -r requirements.txt
```

#### 2. Database Migration

```bash
# Navigate to project root
cd ..

# Run migration based on your OS:
# Windows:
./migrate_win.sh

# macOS:
./migrate_mac.sh

# Linux/Prod:
./migrate_prod.sh

# Or manually:
alembic upgrade head
```

#### 3. Frontend Setup (Node.js)

```bash
cd ui
npm install --legacy-peer-deps
npm run dev
```

---

## Features Implemented

### 1. Analysis Sharing (Read-Only Access)

Share your trading analyses with other users while maintaining control and security.

#### How to Share:
1. Open an analysis in detail view
2. Click the **"Share"** button (📤 icon) in the top toolbar
3. Search for users by name or email
4. Select one or multiple users
5. Click **"Share"** to confirm

#### Recipient Experience:
- Shared analyses appear in the Analysis Journal list
- Badge shows **"Shared by [username]"**
- Read-only access (cannot modify or delete)
- Full content visibility

#### Unsharing:
- From analysis details, access the share settings
- Revoke access for any user at any time

### 2. Analysis Pinning

Pin important analyses for quick access.

#### How to Pin:
- Click the **pin icon** (📌) on any analysis card
- Filled icon = pinned, outline icon = unpinned
- Pinned status persists automatically

### 3. Internationalization (i18n)

Full multi-language support with automatic language detection and persistence.

#### Supported Languages:
- 🇬🇧 **English**
- 🇮🇹 **Italiano**

#### How to Change Language:
1. Go to **Profile** → **Settings**
2. Select language from dropdown
3. Changes apply immediately
4. Language preference saved for future sessions

#### Features:
- Auto-detection based on browser language
- localStorage persistence
- Instant UI updates
- Comprehensive translation coverage

---

## Architecture Overview

### Database Schema

#### analysis_shares Table
```sql
CREATE TABLE analysis_shares (
  id INTEGER PRIMARY KEY,
  analysis_id INTEGER NOT NULL,
  shared_with_user_id INTEGER NOT NULL,
  shared_by_user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### analyses Table Updates
```sql
ALTER TABLE analyses ADD COLUMN pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE analyses ADD COLUMN pin_order INTEGER DEFAULT 0;
```

### API Endpoints

#### Analysis Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| GET | `/api/analyses/` | List all analyses (owned + shared) | Yes |
| GET | `/api/analyses/{id}` | Get single analysis (if owner or shared) | Yes |
| POST | `/api/analyses/` | Create new analysis | Yes |
| PUT | `/api/analyses/{id}` | Update analysis (owner only) | Yes |
| DELETE | `/api/analyses/{id}` | Delete analysis (owner only) | Yes |
| POST | `/api/analyses/{id}/share` | Share with users | Yes* |
| DELETE | `/api/analyses/{id}/share/{user_id}` | Revoke access | Yes* |

*Owner only

### Frontend Structure

```
src/
├── i18n.ts                              # i18n configuration
├── locales/
│   ├── en/translation.json             # English translations
│   └── it/translation.json             # Italian translations
├── components/
│   └── language-selector.tsx           # Language selector component
└── sections/analysis/
    ├── share-dialog.tsx                # Share dialog component
    ├── analysis-dashboard-view.tsx     # Analysis list (updated)
    ├── analysis-fullscreen-view.tsx    # Analysis detail (updated)
    └── analysis-api.ts                 # API service (updated)
```

---

## Translation System

### How It Works

1. **Initialization** (`i18n.ts`):
   - Loads translations from JSON files
   - Detects browser language
   - Checks localStorage for saved preference
   - Falls back to English

2. **Usage in Components**:
   ```typescript
   import { useTranslation } from 'react-i18next';
   
   function MyComponent() {
     const { t, i18n } = useTranslation();
     
     return (
       <div>
         <h1>{t('analysis.title')}</h1>
         <select onChange={(e) => i18n.changeLanguage(e.target.value)}>
           <option value="en">{t('language.english')}</option>
           <option value="it">{t('language.italian')}</option>
         </select>
       </div>
     );
   }
   ```

3. **Adding New Translations**:
   - Add key-value pairs to `locales/en/translation.json`
   - Add corresponding Italian translation to `locales/it/translation.json`
   - Use `t('namespace.key')` in components

### Translation Keys Structure

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel"
  },
  "analysis": {
    "title": "Analysis Journal",
    "share": "Share"
  },
  "language": {
    "english": "English",
    "italian": "Italiano"
  }
}
```

---

## Permission Model

### Analysis Owner
- ✅ View full analysis
- ✅ Edit analysis
- ✅ Delete analysis
- ✅ Share with other users
- ✅ Revoke access
- ✅ See all share information
- ✅ Pin/unpin analysis

### Shared User
- ✅ View shared analysis
- ✅ Search/filter shared analyses
- ❌ Edit analysis
- ❌ Delete analysis
- ❌ Share with others
- ❌ Pin shared analysis

### Non-Shared User
- ❌ View analysis
- ❌ Any modifications

---

## Development Guide

### Adding New Language

1. Create translation file:
   ```bash
   mkdir -p ui/src/locales/es
   ```

2. Create `translation.json` with translations:
   ```json
   {
     "common": { ... },
     "analysis": { ... }
   }
   ```

3. Update `ui/src/i18n.ts`:
   ```typescript
   import esTranslation from './locales/es/translation.json';
   
   const resources = {
     // ... existing
     es: { translation: esTranslation }
   };
   ```

4. Add option in LanguageSelector:
   ```typescript
   <MenuItem value="es">Español</MenuItem>
   ```

### Adding Share Functionality to New Components

```typescript
// In component
const [shareDialogOpen, setShareDialogOpen] = useState(false);

// In JSX
<Tooltip title="Share with users">
  <IconButton onClick={() => setShareDialogOpen(true)}>
    <ShareIcon />
  </IconButton>
</Tooltip>

<ShareDialog
  open={shareDialogOpen}
  onClose={() => setShareDialogOpen(false)}
  analysisId={analysis.id}
  onShared={() => refreshData()}
/>
```

### Backend: Adding Share Permission Check

```python
from models import AnalysisShare

def get_analysis_or_404(analysis_id: int, current_user: User, db: Session):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Check if owner or shared
    if analysis.owner_id != current_user.id:
        share = db.query(AnalysisShare).filter(
            AnalysisShare.analysis_id == analysis_id,
            AnalysisShare.shared_with_user_id == current_user.id
        ).first()
        
        if not share:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return analysis
```

---

## Testing

### Manual Testing Checklist

#### Analysis Sharing
- [ ] User can share analysis with single user
- [ ] User can share analysis with multiple users
- [ ] Shared user sees analysis in journal
- [ ] Shared user sees "Shared by" badge
- [ ] Shared user cannot edit analysis
- [ ] Shared user cannot delete analysis
- [ ] Owner can revoke access
- [ ] User search works (name and email)

#### Pinning
- [ ] Analysis can be pinned
- [ ] Pin icon shows correct state
- [ ] Pin persists after page reload

#### i18n
- [ ] Language selector appears in profile
- [ ] English displays correctly
- [ ] Italian displays correctly
- [ ] Language persists after page reload
- [ ] No console errors

### Unit Testing Example

```typescript
// Test language change
test('language selector changes language', () => {
  const { getByRole } = render(<LanguageSelector />);
  const selector = getByRole('combobox');
  
  fireEvent.change(selector, { target: { value: 'it' } });
  
  expect(localStorage.getItem('language')).toBe('it');
});
```

---

## Troubleshooting

### Common Issues

#### 1. npm install fails
**Solution**: Use `--legacy-peer-deps` flag
```bash
npm install --legacy-peer-deps
```

#### 2. i18n not loading
**Verify**:
- i18n import in `main.tsx`
- Translation files exist in `locales/`
- No typos in key paths

#### 3. Share button not working
**Check**:
- User API endpoint `/api/users/` returns users
- AnalysisShare model imported in api.py
- Database migration applied

#### 4. Shared analysis not appearing
**Verify**:
- Analysis shares in database
- GET `/api/analyses/` query joins AnalysisShare
- Frontend receiving is_shared flag

---

## Performance Considerations

- **Share API**: Uses indexed lookups on user_id and analysis_id
- **Language Detection**: One-time check on app load
- **Search**: 300ms debounce to avoid excessive API calls
- **localStorage**: Minimal storage footprint

---

## Security

### Share Access Control
- Owner verification on all share operations
- Foreign key constraints prevent orphaned shares
- Cascade delete removes shares when analysis deleted

### Language Preferences
- Stored in user browser localStorage
- No sensitive data exposed
- Language change doesn't affect user data

---

## Future Enhancements

### High Priority
- [ ] Share expiration dates
- [ ] Bulk share/unshare operations
- [ ] Share notifications
- [ ] Comment/annotation system

### Medium Priority
- [ ] Additional languages (Spanish, French, German)
- [ ] Share permission levels (viewer, commentor, editor)
- [ ] Share analytics/logs
- [ ] Real-time collaboration

### Low Priority
- [ ] Machine translation integration
- [ ] Offline support
- [ ] Advanced permission groups
- [ ] API rate limiting

---

## Support & Documentation

For more information:
- See `IMPLEMENTATION_SUMMARY.md` for technical details
- Check `GUIDE.md` for general usage
- Review code comments for implementation specifics

---

## Version Info

- Implementation Date: April 13, 2026
- Backend Framework: FastAPI + SQLAlchemy
- Frontend Framework: React 19 + Vite + Material-UI 6
- i18n Library: i18next + react-i18next
- Database: SQLite (with Alembic migrations)

---

## Contributors

Development completed as part of TradingTracker feature enhancement.

Last Updated: April 13, 2026
