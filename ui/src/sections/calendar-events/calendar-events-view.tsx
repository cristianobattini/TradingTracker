import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Badge from '@mui/material/Badge';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import TodayIcon from '@mui/icons-material/Today';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const CALENDAR_PREF_KEY = 'calendar_preferred_source';
type CalendarSource = 'ForexFactory' | 'Investing';

import { DashboardContent } from 'src/layouts/dashboard';
import { getAuthHeaders } from 'src/lib/client-config';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CalendarEvent {
  title: string;
  country: string;
  date: string;
  time: string;
  datetime_utc: string;
  impact: string;
  forecast: string;
  previous: string;
  actual: string;
  source: string;
  detail_url: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const IMPACT_COLOR: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  High: 'error',
  Medium: 'warning',
  Low: 'success',
};

const IMPACT_BG: Record<string, string> = {
  High: '#FF563014',
  Medium: '#FFAB0014',
  Low: '#22C55E0d',
};

const MAJOR_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'CNY'];

const FLAG_MAP: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', CHF: '🇨🇭',
  AUD: '🇦🇺', CAD: '🇨🇦', NZD: '🇳🇿', CNY: '🇨🇳', SEK: '🇸🇪',
  NOK: '🇳🇴', DKK: '🇩🇰', SGD: '🇸🇬', HKD: '🇭🇰', MXN: '🇲🇽',
};

// Browser timezone (resolved once at module load)
const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Short UTC offset label, e.g. "UTC+2"
function getTimezoneOffset(): string {
  try {
    return (
      new Intl.DateTimeFormat('en-GB', { timeZoneName: 'shortOffset', timeZone: BROWSER_TZ })
        .formatToParts(new Date())
        .find((p) => p.type === 'timeZoneName')?.value ?? ''
    );
  } catch {
    return '';
  }
}
const TZ_OFFSET_LABEL = getTimezoneOffset(); // e.g. "UTC+2"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function flag(country: string): string {
  return FLAG_MAP[country?.toUpperCase()] ?? '🌐';
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Parse a numeric value from strings like "2.3%", "3.98M", "2990B", "-0.4%", "1.6K".
 * Returns NaN if not parseable.
 */
function parseEconomicValue(s: string): number {
  if (!s) return NaN;
  const clean = s.trim().replace(/,/g, '');
  const m = clean.match(/^([+-]?\d+(?:\.\d+)?)\s*([KMBT%]?)$/i);
  if (!m) return NaN;
  let val = parseFloat(m[1]);
  const suffix = m[2].toUpperCase();
  if (suffix === 'K') val *= 1_000;
  else if (suffix === 'M') val *= 1_000_000;
  else if (suffix === 'B') val *= 1_000_000_000;
  else if (suffix === 'T') val *= 1_000_000_000_000;
  return val;
}

/** Compare actual vs forecast: returns 'better' | 'worse' | 'neutral'. */
function compareActualForecast(actual: string, forecast: string): 'better' | 'worse' | 'neutral' {
  const a = parseEconomicValue(actual);
  const f = parseEconomicValue(forecast);
  if (Number.isNaN(a) || Number.isNaN(f)) return 'neutral';
  if (a > f) return 'better';
  if (a < f) return 'worse';
  return 'neutral';
}

/** Convert a UTC ISO string to the browser's local time (HH:MM). */
function formatLocalTime(datetime_utc: string): string {
  if (!datetime_utc) return '—';
  try {
    const d = new Date(datetime_utc);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: BROWSER_TZ,
    }).format(d);
  } catch {
    return '—';
  }
}

/** Convert a UTC ISO string to local date (YYYY-MM-DD) for grouping. */
function localDateStr(datetime_utc: string): string {
  if (!datetime_utc) return '';
  try {
    const d = new Date(datetime_utc);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', { timeZone: BROWSER_TZ }).format(d); // en-CA gives YYYY-MM-DD
  } catch {
    return '';
  }
}

function formatDayTab(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).format(d);
  } catch { return dateStr; }
}

function formatDayHeader(dateStr: string, todayLabel: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T12:00:00');
    const isToday = dateStr === todayStr();
    const label = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: '2-digit', month: 'long' }).format(d);
    return isToday ? `${label} — ${todayLabel}` : label;
  } catch { return dateStr; }
}

function normaliseImpact(raw: string): string {
  if (!raw) return 'Low';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function groupByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  return events.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
    // Use local date derived from datetime_utc if available, otherwise ev.date
    const key = (ev.datetime_utc ? localDateStr(ev.datetime_utc) : '') || ev.date || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});
}

// ---------------------------------------------------------------------------
// Impact summary bar
// ---------------------------------------------------------------------------
function ImpactSummary({ events }: { events: CalendarEvent[] }) {
  const { t } = useTranslation();
  const counts = useMemo(() => ({
    High: events.filter((e) => normaliseImpact(e.impact) === 'High').length,
    Medium: events.filter((e) => normaliseImpact(e.impact) === 'Medium').length,
    Low: events.filter((e) => normaliseImpact(e.impact) === 'Low').length,
  }), [events]);

  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
      {(['High', 'Medium', 'Low'] as const).map((lvl) => (
        <Box key={lvl} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{
            width: 8, height: 8, borderRadius: '50%',
            bgcolor: lvl === 'High' ? 'error.main' : lvl === 'Medium' ? 'warning.main' : 'success.main',
          }} />
          <Typography variant="caption" color="text.secondary">
            {counts[lvl]} {lvl}
          </Typography>
        </Box>
      ))}
      <Typography variant="caption" color="text.disabled">· {events.length} {t('calendar.total')}</Typography>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CalendarEventsView() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preferredSource, setPreferredSource] = useState<CalendarSource>(
    () => (localStorage.getItem(CALENDAR_PREF_KEY) as CalendarSource) || 'ForexFactory'
  );

  const togglePreferred = (source: CalendarSource) => {
    const next = preferredSource === source ? 'ForexFactory' : source;
    setPreferredSource(next);
    localStorage.setItem(CALENDAR_PREF_KEY, next);
  };

  // Filters — default tab to today
  const [impactFilter, setImpactFilter] = useState<string[]>(['High', 'Medium', 'Low']);
  const [currencyFilter, setCurrencyFilter] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [dayTab, setDayTab] = useState<string>(todayStr());
  const [onlyActual, setOnlyActual] = useState(false);

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------
  const loadCalendar = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/calendar/?force_refresh=${forceRefresh}`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setEvents(data.events);
    } catch (e: any) {
      setError(e.message || 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------
  // All unique local days (sorted) — using local date conversion
  const allDays = useMemo(() => {
    const days = Array.from(new Set(
      events.map((e) => (e.datetime_utc ? localDateStr(e.datetime_utc) : '') || e.date).filter(Boolean)
    )).sort();
    return days;
  }, [events]);

  // Days visible in tabs: yesterday + today + future (max 1 day back)
  const visibleDays = useMemo(() => {
    const yesterday = yesterdayStr();
    return allDays.filter((d) => d >= yesterday);
  }, [allDays]);

  // Currencies present in the loaded events
  const presentCurrencies = useMemo(() => {
    const s = new Set(events.map((e) => e.country?.toUpperCase()).filter(Boolean));
    return MAJOR_CURRENCIES.filter((c) => s.has(c));
  }, [events]);

  // Events per day (for badge counts on tabs) — using local dates
  const countsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    events.forEach((e) => {
      const day = (e.datetime_utc ? localDateStr(e.datetime_utc) : '') || e.date;
      if (day) map[day] = (map[day] || 0) + 1;
    });
    return map;
  }, [events]);

  // Apply all filters; when "all", restrict to visibleDays (no more than 1 day back)
  const filtered = useMemo(() => {
    const yesterday = yesterdayStr();
    const q = search.trim().toLowerCase();
    return events.filter((ev) => {
      const localDay = (ev.datetime_utc ? localDateStr(ev.datetime_utc) : '') || ev.date;
      const impact = normaliseImpact(ev.impact);
      if (!impactFilter.includes(impact)) return false;
      if (currencyFilter.length > 0 && !currencyFilter.includes(ev.country?.toUpperCase())) return false;
      if (dayTab !== 'all' && localDay !== dayTab) return false;
      // When showing "all", hide events older than yesterday
      if (dayTab === 'all' && localDay < yesterday) return false;
      if (onlyActual && !ev.actual) return false;
      if (q && !ev.title.toLowerCase().includes(q) && !ev.country?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [events, impactFilter, currencyFilter, dayTab, onlyActual, search]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);
  const sortedDates = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  // ---------------------------------------------------------------------------
  // Quick filters
  // ---------------------------------------------------------------------------
  const applyToday = () => {
    const t = todayStr();
    setDayTab(allDays.includes(t) ? t : todayStr());
    setImpactFilter(['High', 'Medium', 'Low']);
    setCurrencyFilter([]);
    setOnlyActual(false);
    setSearch('');
  };

  const applyHighOnly = () => {
    setImpactFilter(['High']);
    setDayTab('all');
    setCurrencyFilter([]);
    setOnlyActual(false);
    setSearch('');
  };

  const resetAll = () => {
    setImpactFilter(['High', 'Medium', 'Low']);
    setCurrencyFilter([]);
    setDayTab(todayStr());
    setOnlyActual(false);
    setSearch('');
  };

  const hasActiveFilters =
    impactFilter.length < 3 ||
    currencyFilter.length > 0 ||
    dayTab !== todayStr() ||
    onlyActual ||
    search.trim() !== '';

  const toggleCurrency = (ccy: string) => {
    setCurrencyFilter((prev) =>
      prev.includes(ccy) ? prev.filter((c) => c !== ccy) : [...prev, ccy]
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <DashboardContent>
      {/* ── Header ── */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>{t('calendar.title')}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              {t('calendar.subtitle')}
            </Typography>
            <Chip
              icon={<AccessTimeIcon sx={{ fontSize: '13px !important' }} />}
              label={`${BROWSER_TZ} · ${TZ_OFFSET_LABEL}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.68rem', height: 20, '& .MuiChip-label': { px: 0.75 } }}
            />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Investing.com chip with star */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <Chip
              label="Investing.com"
              component="a"
              href="https://www.investing.com/economic-calendar/"
              target="_blank"
              rel="noopener noreferrer"
              clickable
              icon={<OpenInNewIcon fontSize="small" />}
              variant={preferredSource === 'Investing' ? 'filled' : 'outlined'}
              color={preferredSource === 'Investing' ? 'primary' : 'default'}
              size="small"
            />
            <Tooltip title={preferredSource === 'Investing' ? t('calendar.removePreferred') : t('calendar.setPreferred')}>
              <IconButton size="small" onClick={() => togglePreferred('Investing')} sx={{ p: 0.25 }}>
                {preferredSource === 'Investing'
                  ? <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                  : <StarBorderIcon sx={{ fontSize: 16 }} />}
              </IconButton>
            </Tooltip>
          </Box>

          {/* ForexFactory chip with star */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <Chip
              label="ForexFactory"
              component="a"
              href="https://www.forexfactory.com/calendar"
              target="_blank"
              rel="noopener noreferrer"
              clickable
              icon={<OpenInNewIcon fontSize="small" />}
              variant={preferredSource === 'ForexFactory' ? 'filled' : 'outlined'}
              color={preferredSource === 'ForexFactory' ? 'primary' : 'default'}
              size="small"
            />
            <Tooltip title={preferredSource === 'ForexFactory' ? t('calendar.removePreferred') : t('calendar.setPreferred')}>
              <IconButton size="small" onClick={() => togglePreferred('ForexFactory')} sx={{ p: 0.25 }}>
                {preferredSource === 'ForexFactory'
                  ? <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                  : <StarBorderIcon sx={{ fontSize: 16 }} />}
              </IconButton>
            </Tooltip>
          </Box>

          <Tooltip title={t('calendar.refresh')}>
            <IconButton onClick={() => loadCalendar(true)} disabled={loading} size="small">
              {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Filter panel ── */}
      <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>

        {/* Row 1: search + quick filters + reset */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
          <TextField
            size="small"
            placeholder={`${t('calendar.event')} / ${t('calendar.currency')}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 220, flex: '1 1 220px' }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton>
                </InputAdornment>
              ) : null,
            }}
          />

          <Divider orientation="vertical" flexItem />

          {/* Quick filters */}
          <Tooltip title={t('calendar.goToToday')}>
            <Button
              size="small" variant="outlined" startIcon={<TodayIcon />}
              onClick={applyToday}
              color={dayTab === todayStr() ? 'primary' : 'inherit'}
            >
              {t('calendar.today')}
            </Button>
          </Tooltip>
          <Tooltip title={t('calendar.highOnlyTooltip')}>
            <Button
              size="small" variant="outlined" startIcon={<WhatshotIcon />}
              onClick={applyHighOnly}
              color={impactFilter.length === 1 && impactFilter[0] === 'High' ? 'error' : 'inherit'}
            >
              {t('calendar.highOnly')}
            </Button>
          </Tooltip>
          <Tooltip title={t('calendar.hasResultTooltip')}>
            <Button
              size="small"
              variant={onlyActual ? 'contained' : 'outlined'}
              startIcon={<CheckCircleOutlineIcon />}
              onClick={() => setOnlyActual((v) => !v)}
              color={onlyActual ? 'success' : 'inherit'}
            >
              {t('calendar.hasResult')}
            </Button>
          </Tooltip>

          {hasActiveFilters && (
            <Tooltip title={t('calendar.resetAll')}>
              <Button size="small" variant="text" startIcon={<FilterListOffIcon />}
                onClick={resetAll} color="warning">
                {t('calendar.reset')}
              </Button>
            </Tooltip>
          )}

          <Box sx={{ ml: 'auto' }}>
            <ImpactSummary events={filtered} />
          </Box>
        </Box>

        {/* Row 2: Impact toggle + Currency chips */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <ToggleButtonGroup
            value={impactFilter}
            onChange={(_, val) => val.length > 0 && setImpactFilter(val)}
            size="small"
          >
            <ToggleButton value="High"
              sx={{ gap: 0.5, color: 'error.main', '&.Mui-selected': { bgcolor: '#FF563022', color: 'error.main' } }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} /> High
            </ToggleButton>
            <ToggleButton value="Medium"
              sx={{ gap: 0.5, color: 'warning.main', '&.Mui-selected': { bgcolor: '#FFAB0022', color: 'warning.main' } }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main' }} /> Medium
            </ToggleButton>
            <ToggleButton value="Low"
              sx={{ gap: 0.5, color: 'success.main', '&.Mui-selected': { bgcolor: '#22C55E22', color: 'success.main' } }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} /> Low
            </ToggleButton>
          </ToggleButtonGroup>

          <Divider orientation="vertical" flexItem />

          {/* Currency chips */}
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="caption" color="text.disabled" sx={{ mr: 0.5 }}>{t('calendar.currencyLabel')}</Typography>
            {presentCurrencies.map((ccy) => {
              const active = currencyFilter.includes(ccy);
              return (
                <Chip
                  key={ccy}
                  label={`${flag(ccy)} ${ccy}`}
                  size="small"
                  onClick={() => toggleCurrency(ccy)}
                  variant={active ? 'filled' : 'outlined'}
                  color={active ? 'primary' : 'default'}
                  sx={{ fontWeight: active ? 700 : 400, fontSize: '0.72rem' }}
                />
              );
            })}
            {currencyFilter.length > 0 && (
              <Chip label={t('calendar.reset')} size="small" variant="outlined" color="warning"
                onClick={() => setCurrencyFilter([])} sx={{ fontSize: '0.72rem' }} />
            )}
          </Box>
        </Box>
      </Paper>

      {/* ── Day tabs ── */}
      {!loading && visibleDays.length > 0 && (
        <Tabs
          value={dayTab}
          onChange={(_, v) => setDayTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            value="all"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {t('calendar.allDays')}
                <Chip label={filtered.length} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
              </Box>
            }
          />
          {visibleDays.map((day) => {
            const isToday = day === todayStr();
            const count = countsByDay[day] || 0;
            return (
              <Tab
                key={day}
                value={day}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Badge
                      badgeContent={count}
                      color={isToday ? 'primary' : 'default'}
                      sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16 } }}
                    >
                      <Typography variant="caption" fontWeight={isToday ? 700 : 400}>
                        {formatDayTab(day)}
                      </Typography>
                    </Badge>
                  </Box>
                }
                sx={isToday ? { color: 'primary.main', fontWeight: 700 } : {}}
              />
            );
          })}
        </Tabs>
      )}

      {/* ── Table ── */}
      {loading ? (
        <Paper elevation={1}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Box key={i} sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Skeleton variant="text" width={`${55 + (i * 17) % 40}%`} />
            </Box>
          ))}
        </Paper>
      ) : sortedDates.length === 0 ? (
        <Alert severity="info"
          action={hasActiveFilters ? <Button color="inherit" size="small" onClick={resetAll}>{t('calendar.resetFilters')}</Button> : undefined}>
          {t('calendar.noEvents')}
        </Alert>
      ) : (
        sortedDates.map((dateKey) => (
          <Box key={dateKey} sx={{ mb: 3 }}>
            {/* Day header */}
            <Box sx={{ mb: 1, px: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                📅 {formatDayHeader(dateKey, t('calendar.today'))}
              </Typography>
              <Chip
                label={`${grouped[dateKey].length}`}
                size="small" variant="outlined"
              />
              {/* Mini impact breakdown per day */}
              {(['High', 'Medium', 'Low'] as const).map((lvl) => {
                const n = grouped[dateKey].filter((e) => normaliseImpact(e.impact) === lvl).length;
                if (!n) return null;
                return (
                  <Chip
                    key={lvl}
                    label={`${n} ${lvl}`}
                    size="small"
                    color={IMPACT_COLOR[lvl]}
                    variant="outlined"
                    sx={{ fontSize: '0.65rem', height: 20 }}
                  />
                );
              })}
            </Box>

            <TableContainer component={Paper} elevation={1}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'background.neutral' }}>
                    <TableCell sx={{ fontWeight: 700, width: 70 }}>
                      <Tooltip title={`${t('calendar.timezoneLabel')}: ${BROWSER_TZ} (${TZ_OFFSET_LABEL})`} placement="top">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, cursor: 'default' }}>
                          {t('calendar.time')}
                          <AccessTimeIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 70 }}>{t('calendar.currency')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 80 }}>{t('calendar.impact')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('calendar.event')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 90 }} align="right">{t('calendar.forecast')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 90 }} align="right">{t('calendar.previous')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 90 }} align="right">{t('calendar.actual')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {grouped[dateKey].map((ev, i) => {
                    const impactKey = normaliseImpact(ev.impact);
                    const localTime = formatLocalTime(ev.datetime_utc);
                    return (
                      <TableRow
                        key={i}
                        sx={{
                          bgcolor: IMPACT_BG[impactKey] ?? 'transparent',
                          '&:last-child td': { border: 0 },
                        }}
                      >
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace" fontWeight={500}>
                            {localTime}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <span style={{ fontSize: 16 }}>{flag(ev.country)}</span>
                            <Typography variant="caption" fontWeight={700}>{ev.country}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={impactKey}
                            color={IMPACT_COLOR[impactKey] ?? 'default'}
                            size="small"
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" fontWeight={500}>{ev.title}</Typography>
                            {ev.detail_url && (
                              <Tooltip title={t('calendar.eventDetails')} placement="top">
                                <IconButton
                                  size="small"
                                  component="a"
                                  href={ev.detail_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  sx={{ opacity: 0.35, '&:hover': { opacity: 1 }, p: 0.3 }}
                                >
                                  <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" color="text.secondary">{ev.forecast || '—'}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" color="text.secondary">{ev.previous || '—'}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          {ev.actual ? (() => {
                            const cmp = compareActualForecast(ev.actual, ev.forecast);
                            const color =
                              cmp === 'better' ? 'success.main' :
                              cmp === 'worse'  ? 'error.main' :
                              'text.primary';
                            return (
                              <Typography variant="caption" fontWeight={700} color={color}>
                                {ev.actual}
                              </Typography>
                            );
                          })() : (
                            <Typography variant="caption" color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ))
      )}

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setError('')} variant="filled">{error}</Alert>
      </Snackbar>
    </DashboardContent>
  );
}
