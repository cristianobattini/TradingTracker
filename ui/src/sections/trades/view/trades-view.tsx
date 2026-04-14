import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Typography,
  Stack,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  CircularProgress,
  Alert,
  Select
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { DashboardContent } from 'src/layouts/dashboard';
import { deleteTradeApiTradesTradeIdDelete, DeleteTradeApiTradesTradeIdDeleteData, deleteTradesApiTradesDelete, listTradesApiTradesGet, TradeResponse } from 'src/client';
import { AddTradeModal } from 'src/sections/overview/add-trade-modal';
import Checkbox from '@mui/material/Checkbox';
import { UpdateTradeModal } from 'src/sections/overview/update-trade-modal';

export function TradesView() {
  const { t } = useTranslation();
  const [trades, setTrades] = useState<TradeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pairFilter, setPairFilter] = useState<string>('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<TradeResponse | null>(null);
  const [selectedTrades, setSelectedTrades] = useState<number[]>([]);

  // Fetch trades on component mount
  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    listTradesApiTradesGet().then(response => {
      if (response.error) {
        setError(t('trades.loadError'));
        console.error('Error fetching trades:', response.error);
      } else {
        setTrades(response.data || []);
      }
      setLoading(false);
    }).catch(err => {
      setError(t('trades.loadError'));
      console.error('Error fetching trades:', err);
      setLoading(false);
    });
  };

  const isSelected = (id: number) => selectedTrades.includes(id);

  const toggleSelectTrade = (id: number) => {
    setSelectedTrades(prev =>
      prev.includes(id)
        ? prev.filter(tid => tid !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTrades(paginatedTrades.map(t => t.id));
    } else {
      setSelectedTrades([]);
    }
  };


  // Filter trades based on search and filters
  const filteredTrades = trades.filter(trade => {
    const matchesSearch =
      (trade.pair ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (trade.system ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (trade.comments ?? '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'cancelled' && trade.cancelled) ||
      (statusFilter === 'win' && trade.profit_or_loss && trade.profit_or_loss > 0 && !trade.cancelled) ||
      (statusFilter === 'loss' && trade.profit_or_loss && trade.profit_or_loss < 0 && !trade.cancelled);

    const matchesPair = pairFilter === 'all' || trade.pair === pairFilter;

    return matchesSearch && matchesStatus && matchesPair;
  });

  // Get unique pairs for filter
  const uniquePairs = Array.from(
    new Set(
      trades
        .map(trade => trade.pair)
        .filter((pair): pair is string => typeof pair === 'string')
    )
  );

  // Pagination
  const paginatedTrades = filteredTrades.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleTradeAdded = (newTrade: TradeResponse) => {
    setTrades(prev => [newTrade, ...prev]);
    setAddModalOpen(false);
  };

  /*   const handleDeleteTrade = async (tradeId: number) => {
      if (!confirm('Are you sure you want to delete this trade?')) return;
  
      try {
        // Replace with actual API call
        // await fetch(`/api/trades/${tradeId}`, { method: 'DELETE' });
        
        setTrades(prev => prev.filter(trade => trade.id !== tradeId));
      } catch (err) {
        setError('Failed to delete trade');
        console.error('Error deleting trade:', err);
      }
    }; */

  const getStatusColor = (trade: TradeResponse) => {
    if (trade.cancelled) return 'warning';
    if (trade.profit_or_loss && trade.profit_or_loss > 0) return 'success';
    if (trade.profit_or_loss && trade.profit_or_loss < 0) return 'error';
    return 'default';
  };

  const getStatusText = (trade: TradeResponse) => {
    if (trade.cancelled) return t('trades.cancelled');
    if (trade.profit_or_loss && trade.profit_or_loss > 0) return t('trades.win');
    if (trade.profit_or_loss && trade.profit_or_loss < 0) return t('trades.loss');
    return t('trades.draw');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDeleteTrade = async (tradeId: number) => {
    if (confirm(t('trades.deleteTradeConfirm'))) {
      deleteTradeApiTradesTradeIdDelete({ path: { trade_id: tradeId } }).then(() => {
        setTrades(prev => prev.filter(trade => trade.id !== tradeId));
      }).catch(() => {
        setError(t('trades.deleteError'));
      });
    };
  }

  if (loading && trades.length === 0) {
    return (
      <DashboardContent>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h4">
            {t('trades.title')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddModalOpen(true)}
          >
            {t('trades.newTrade')}
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Search and Filter Bar */}
        <Card sx={{ p: 2, mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              placeholder={t('trades.title') + '…'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />

            <Tooltip title={t('trades.filterTrades')}>
              <IconButton
                onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                color={statusFilter !== 'all' || pairFilter !== 'all' ? 'primary' : 'default'}
              >
                <FilterIcon />
              </IconButton>
            </Tooltip>

            {selectedTrades.length > 0 && (
              <Button
                color="error"
                variant="outlined"
                onClick={async () => {
                  if (!confirm(t('trades.deleteConfirm', { count: selectedTrades.length }))) return;

                  deleteTradesApiTradesDelete({ body: selectedTrades }).then(() => {
                    setTrades(prev => prev.filter(t => !selectedTrades.includes(t.id)));
                    setSelectedTrades([]);
                  })
                }
              }
              >
                {t('trades.deleteSelected', { count: selectedTrades.length })}
              </Button>
            )}


            <Button
              startIcon={<RefreshIcon />}
              onClick={fetchTrades}
              disabled={loading}
            >
              {t('trades.refresh')}
            </Button>

            <Box sx={{ flexGrow: 1 }} />

            <Typography variant="body2" color="text.secondary">
              {t('trades.tradesFound', { count: filteredTrades.length })}
            </Typography>
          </Stack>

          {/* Filter Menu */}
          <Menu
            anchorEl={filterAnchorEl}
            open={Boolean(filterAnchorEl)}
            onClose={() => setFilterAnchorEl(null)}
          >
            <MenuItem>
              <Typography variant="subtitle2" sx={{ minWidth: 80 }}>{t('trades.statusLabel')}</Typography>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                size="small"
                sx={{ ml: 1, minWidth: 120 }}
              >
                <MenuItem value="all">{t('trades.filterAll')}</MenuItem>
                <MenuItem value="win">{t('trades.filterWin')}</MenuItem>
                <MenuItem value="loss">{t('trades.filterLoss')}</MenuItem>
                <MenuItem value="cancelled">{t('trades.filterCancelled')}</MenuItem>
              </Select>
            </MenuItem>
            <MenuItem>
              <Typography variant="subtitle2" sx={{ minWidth: 80 }}>{t('trades.pairLabel')}</Typography>
              <Select
                value={pairFilter}
                onChange={(e) => setPairFilter(e.target.value)}
                size="small"
                sx={{ ml: 1, minWidth: 120 }}
              >
                <MenuItem value="all">{t('trades.allPairs')}</MenuItem>
                {uniquePairs.map(pair => (
                  <MenuItem key={pair} value={pair}>{pair}</MenuItem>
                ))}
              </Select>
            </MenuItem>
          </Menu>
        </Card>

        {/* Trades Table */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={
                        selectedTrades.length > 0 &&
                        selectedTrades.length < paginatedTrades.length
                      }
                      checked={
                        paginatedTrades.length > 0 &&
                        selectedTrades.length === paginatedTrades.length
                      }
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>{t('trades.date')}</TableCell>
                  <TableCell>{t('trades.pair')}</TableCell>
                  <TableCell>{t('trades.action')}</TableCell>
                  <TableCell>{t('trades.system')}</TableCell>
                  <TableCell>{t('trades.risk')}</TableCell>
                  <TableCell>{t('trades.lots')}</TableCell>
                  <TableCell>{t('trades.entry')}</TableCell>
                  <TableCell>SL/TP</TableCell>
                  <TableCell>P&L</TableCell>
                  <TableCell>{t('trades.status')}</TableCell>
                  <TableCell>{t('common.edit')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTrades.map((trade) => (
                  <TableRow key={trade.id} hover
                    selected={isSelected(trade.id)}
                    sx={{
                      cursor: 'pointer'
                    }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected(trade.id)}
                        onChange={() => toggleSelectTrade(trade.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {trade.date && new Date(trade.date).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {trade.pair}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={trade.action}
                        color={trade.action === 'BUY' ? 'success' : 'error'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {trade.system}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {trade.risk}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {trade.lots}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {trade.entry}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontSize="12px">
                        SL1: {trade.sl1_pips} | TP1: {trade.tp1_pips}
                      </Typography>
                      {(trade.sl2_pips || trade.tp2_pips) && (
                        <Typography variant="body2" fontSize="12px">
                          SL2: {trade.sl2_pips} | TP2: {trade.tp2_pips}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight="medium"
                        color={
                          trade.profit_or_loss && trade.profit_or_loss > 0 ? 'success.main' :
                            trade.profit_or_loss && trade.profit_or_loss < 0 ? 'error.main' :
                              'text.primary'
                        }
                      >
                        {trade.profit_or_loss && formatCurrency(trade.profit_or_loss)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(trade)}
                        color={getStatusColor(trade) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title={t('trades.editTrade')}>
                          <IconButton size="small" onClick={() => { setSelectedTrade(trade); setEditModalOpen(true); }}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('trades.deleteTrade')}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteTrade(trade.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {paginatedTrades.length === 0 && !loading && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                {t('trades.noTradesFound')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {searchTerm || statusFilter !== 'all' || pairFilter !== 'all'
                  ? t('trades.adjustFilters')
                  : t('trades.addFirstTrade')
                }
              </Typography>
              {(searchTerm || statusFilter !== 'all' || pairFilter !== 'all') && (
                <Button
                  variant="outlined"
                  sx={{ mt: 2 }}
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setPairFilter('all');
                  }}
                >
                  {t('trades.removeFilters')}
                </Button>
              )}
            </Box>
          )}

          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={filteredTrades.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Card>
      </Box>

      {/* Add Trade Modal */}
      <AddTradeModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onTradeAdded={handleTradeAdded}
        loading={false}
      />

      {/* Update Trade Modal */}
      <UpdateTradeModal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setSelectedTrade(null); }}
        trade={selectedTrade}
        onTradeUpdated={(updated) => {
          setTrades(prev => prev.map(t => (t.id === updated.id ? updated : t)));
          setEditModalOpen(false);
          setSelectedTrade(null);
        }}
        loading={false}
      />
    </DashboardContent>
  );
}