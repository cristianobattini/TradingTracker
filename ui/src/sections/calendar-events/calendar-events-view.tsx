import { useState, useEffect, useCallback } from 'react';
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
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
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
  impact: string;
  forecast: string;
  previous: string;
  actual: string;
  source: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const IMPACT_COLOR: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  High: 'error',
  Medium: 'warning',
  Low: 'success',
};

const IMPACT_BG: Record<string, string> = {
  High: '#FF563022',
  Medium: '#FFAB0022',
  Low: '#22C55E22',
};

const FLAG_MAP: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', CHF: '🇨🇭',
  AUD: '🇦🇺', CAD: '🇨🇦', NZD: '🇳🇿', CNY: '🇨🇳', SEK: '🇸🇪',
  NOK: '🇳🇴', DKK: '🇩🇰', SGD: '🇸🇬', HKD: '🇭🇰', MXN: '🇲🇽',
};

function flag(country: string): string {
  return FLAG_MAP[country?.toUpperCase()] ?? '🌐';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: '2-digit', month: 'short' }).format(d);
  } catch {
    return dateStr;
  }
}


function groupByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  return events.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
    const key = ev.date || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CalendarEventsView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [impactFilter, setImpactFilter] = useState<string[]>(['High', 'Medium', 'Low']);
  const [error, setError] = useState('');

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

  const filtered = events.filter((ev) =>
    impactFilter.some((f) => f.toLowerCase() === ev.impact?.toLowerCase())
  );

  const grouped = groupByDate(filtered);
  const sortedDates = Object.keys(grouped).sort();

  return (
    <DashboardContent>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Economic Calendar</Typography>
          <Typography variant="body2" color="text.secondary">
            This week's events — source: ForexFactory &nbsp;·&nbsp;
            <a
              href="https://www.forexfactory.com/calendar"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit' }}
            >
              investing.com calendar
              <OpenInNewIcon sx={{ fontSize: 12, ml: 0.3, verticalAlign: 'middle' }} />
            </a>
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Impact filter */}
          <ToggleButtonGroup
            value={impactFilter}
            onChange={(_, val) => val.length > 0 && setImpactFilter(val)}
            size="small"
          >
            <ToggleButton value="High" sx={{ color: 'error.main', borderColor: 'error.main' }}>
              🔴 High
            </ToggleButton>
            <ToggleButton value="Medium" sx={{ color: 'warning.main', borderColor: 'warning.main' }}>
              🟠 Medium
            </ToggleButton>
            <ToggleButton value="Low" sx={{ color: 'success.main', borderColor: 'success.main' }}>
              🟡 Low
            </ToggleButton>
          </ToggleButtonGroup>

          <Tooltip title="Refresh calendar">
            <IconButton onClick={() => loadCalendar(true)} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* External links */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        {[
          { label: 'Investing.com Calendar', url: 'https://www.investing.com/economic-calendar/' },
          { label: 'ForexFactory Calendar', url: 'https://www.forexfactory.com/calendar' },
        ].map((link) => (
          <Chip
            key={link.url}
            label={link.label}
            component="a"
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            clickable
            icon={<OpenInNewIcon fontSize="small" />}
            variant="outlined"
            size="small"
          />
        ))}
      </Box>

      {/* Table */}
      {loading ? (
        <Paper elevation={1}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Box key={i} sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Skeleton variant="text" width={`${60 + Math.random() * 30}%`} />
            </Box>
          ))}
        </Paper>
      ) : sortedDates.length === 0 ? (
        <Alert severity="info">No events match the selected filters.</Alert>
      ) : (
        sortedDates.map((dateKey) => (
          <Box key={dateKey} sx={{ mb: 3 }}>
            {/* Day header */}
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ mb: 1, px: 1, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              📅 {formatDate(dateKey)}
              <Chip label={`${grouped[dateKey].length} events`} size="small" variant="outlined" />
            </Typography>

            <TableContainer component={Paper} elevation={1}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'background.neutral' }}>
                    <TableCell sx={{ fontWeight: 700, width: 70 }}>Time</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 60 }}>Ccy</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 70 }}>Impact</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Event</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 80 }} align="right">Forecast</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 80 }} align="right">Previous</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 80 }} align="right">Actual</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {grouped[dateKey].map((ev, i) => {
                    const impactKey = ev.impact
                      ? ev.impact.charAt(0).toUpperCase() + ev.impact.slice(1).toLowerCase()
                      : 'Low';
                    return (
                      <TableRow
                        key={i}
                        sx={{
                          bgcolor: IMPACT_BG[impactKey] ?? 'transparent',
                          '&:last-child td': { border: 0 },
                        }}
                      >
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace">
                            {ev.time || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <span>{flag(ev.country)}</span>
                            <Typography variant="caption" fontWeight={700}>{ev.country}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={ev.impact || '—'}
                            color={IMPACT_COLOR[impactKey] ?? 'default'}
                            size="small"
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{ev.title}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" color="text.secondary">{ev.forecast || '—'}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" color="text.secondary">{ev.previous || '—'}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="caption"
                            fontWeight={ev.actual ? 700 : 400}
                            color={ev.actual ? 'text.primary' : 'text.disabled'}
                          >
                            {ev.actual || '—'}
                          </Typography>
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

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError('')} variant="filled">{error}</Alert>
      </Snackbar>
    </DashboardContent>
  );
}
