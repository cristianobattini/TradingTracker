import React, { useState, useEffect } from 'react';
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
import { deleteTradeApiTradesTradeIdDelete, DeleteTradeApiTradesTradeIdDeleteData, listTradesApiTradesGet, TradeResponse } from 'src/client';
import { AddTradeModal } from 'src/sections/overview/add-trade-modal';
import { UpdateTradeModal } from 'src/sections/overview/update-trade-modal';

export function TradesView() {
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

  // Fetch trades on component mount
  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    listTradesApiTradesGet().then(response => {
      if (response.error) {
        setError('Failed to fetch trades');
        console.error('Error fetching trades:', response.error);
      } else {
        setTrades(response.data || []);
      }
      setLoading(false);
    }).catch(err => {
      setError('Failed to fetch trades');
      console.error('Error fetching trades:', err);
      setLoading(false);
    });
  };

  // Filter trades based on search and filters
  const filteredTrades = trades.filter(trade => {
    const matchesSearch = 
      trade.pair.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.system.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.comments.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'cancelled' && trade.cancelled) ||
      (statusFilter === 'win' && trade.profit_or_loss > 0 && !trade.cancelled) ||
      (statusFilter === 'loss' && trade.profit_or_loss < 0 && !trade.cancelled);

    const matchesPair = pairFilter === 'all' || trade.pair === pairFilter;

    return matchesSearch && matchesStatus && matchesPair;
  });

  // Get unique pairs for filter
  const uniquePairs = Array.from(new Set(trades.map(trade => trade.pair)));

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
    if (trade.profit_or_loss > 0) return 'success';
    if (trade.profit_or_loss < 0) return 'error';
    return 'default';
  };

  const getStatusText = (trade: TradeResponse) => {
    if (trade.cancelled) return 'Cancelled';
    if (trade.profit_or_loss > 0) return 'Win';
    if (trade.profit_or_loss < 0) return 'Loss';
    return 'Breakeven';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDeleteTrade = async (tradeId: number) => {
    if (confirm('Are you sure you want to delete this trade?')) {
      deleteTradeApiTradesTradeIdDelete({ path: { trade_id: tradeId } }).then(() => {
        setTrades(prev => prev.filter(trade => trade.id !== tradeId));
      }).catch(err => {
        setError('Failed to delete trade');
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
            Trade Journal
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddModalOpen(true)}
          >
            Add Trade
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
              placeholder="Search trades..."
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

            <Tooltip title="Filter trades">
              <IconButton
                onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                color={statusFilter !== 'all' || pairFilter !== 'all' ? 'primary' : 'default'}
              >
                <FilterIcon />
              </IconButton>
            </Tooltip>

            <Button
              startIcon={<RefreshIcon />}
              onClick={fetchTrades}
              disabled={loading}
            >
              Refresh
            </Button>

            <Box sx={{ flexGrow: 1 }} />

            <Typography variant="body2" color="text.secondary">
              {filteredTrades.length} trades found
            </Typography>
          </Stack>

          {/* Filter Menu */}
          <Menu
            anchorEl={filterAnchorEl}
            open={Boolean(filterAnchorEl)}
            onClose={() => setFilterAnchorEl(null)}
          >
            <MenuItem>
              <Typography variant="subtitle2" sx={{ minWidth: 80 }}>Status:</Typography>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                size="small"
                sx={{ ml: 1, minWidth: 120 }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="win">Winning</MenuItem>
                <MenuItem value="loss">Losing</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </MenuItem>
            <MenuItem>
              <Typography variant="subtitle2" sx={{ minWidth: 80 }}>Pair:</Typography>
              <Select
                value={pairFilter}
                onChange={(e) => setPairFilter(e.target.value)}
                size="small"
                sx={{ ml: 1, minWidth: 120 }}
              >
                <MenuItem value="all">All Pairs</MenuItem>
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
                  <TableCell>Date</TableCell>
                  <TableCell>Pair</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>System</TableCell>
                  <TableCell>Risk</TableCell>
                  <TableCell>Lots</TableCell>
                  <TableCell>Entry</TableCell>
                  <TableCell>SL/TP</TableCell>
                  <TableCell>P&L</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTrades.map((trade) => (
                  <TableRow key={trade.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(trade.date).toLocaleDateString()}
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
                          trade.profit_or_loss > 0 ? 'success.main' :
                          trade.profit_or_loss < 0 ? 'error.main' :
                          'text.primary'
                        }
                      >
                        {formatCurrency(trade.profit_or_loss)}
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
                          <Tooltip title="Edit Trade">
                            <IconButton size="small" onClick={() => { setSelectedTrade(trade); setEditModalOpen(true); }}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        <Tooltip title="Delete Trade">
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
                No trades found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {searchTerm || statusFilter !== 'all' || pairFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first trade'
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
                  Clear Filters
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