import Grid2 from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import { DashboardContent } from 'src/layouts/dashboard';

interface PerformanceMetrics {
  totalTrades: number;
  executedTrades: number;
  winningTrades: number;
  losingTrades: number;
  cancelledTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  currentCapital: number;
}

// Import trading-specific components
import { TradingRecentTrades } from '../trading-recent-trades';
import { TradingPerformanceSummary } from '../trading-performance-summary';
import { TradingWinLossChart } from '../trading-win-loss-chart';
import { getReportApiReportGet, listTradesApiTradesGet, readUsersMeApiUsersMeGet, ReportResponse, TradeResponse, UserResponse } from 'src/client';
import { TradingCapitalGrowth } from '../trading-capital-growth';
import { TradingPairsDistribution } from '../trading-pairs-distribution';
import { TradingSystemPerformance } from '../trading-system-performance';
import { Iconify } from 'src/components/iconify';
import React, { useEffect, useState } from 'react';
import { Alert, Button, Snackbar } from '@mui/material';
import { AddTradeModal } from '../add-trade-modal';

// ----------------------------------------------------------------------

export function OverviewAnalyticsView() {
  const [trades, setTrades] = useState<TradeResponse[]>([]);
  const [report, setReport] = useState<ReportResponse>();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '' });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    listTradesApiTradesGet()
      .then((response) => {
        if (response.data) {
          setTrades(Array.isArray(response.data) ? response.data : []);
        } else {
          setTrades([]);
        }
      })
      .catch(() => {
        setTrades([]);
      });

    // fetch current user (to get initial capital)
    readUsersMeApiUsersMeGet()
      .then((response) => {
        setUser(response.data || null);
      })
      .catch(() => setUser(null));

    getReportApiReportGet()
      .then((response) => {
        setReport(response.data);
      })
      .catch(() => {
        setReport(undefined);
      });

    setMounted(true);
  }, []);

  // Calculate additional metrics from trades
  const winningTrades = trades.filter((trade) => trade.profit_or_loss && trade.profit_or_loss > 0 && !trade.cancelled);
  const losingTrades = trades.filter((trade) => trade.profit_or_loss && trade.profit_or_loss < 0 && !trade.cancelled);
  const cancelledTrades = trades.filter((trade) => trade.cancelled);

  const performanceMetrics: PerformanceMetrics = {
    totalTrades: trades.length,
    executedTrades: trades.filter((trade) => !trade.cancelled).length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    cancelledTrades: cancelledTrades.length,
    winRate:
      winningTrades.length + losingTrades.length > 0
        ? (winningTrades.length / (winningTrades.length + losingTrades.length)) * 100
        : 0,
    totalProfit: report?.total_profit ?? 0,
    totalLoss: report?.total_loss ?? 0,
    netProfit: (report?.total_profit ?? 0) + (report?.total_loss ?? 0),
    currentCapital: report?.capital ?? 0,
  };

  if (!mounted) return null;

  if (typeof document === 'undefined') return null;

  return (
    <DashboardContent maxWidth="xl">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
          Trading Dashboard 📈
        </Typography>

        <Button variant="contained" onClick={() => setModalOpen(true)} startIcon={<span>+</span>}>
          Add New Trade
        </Button>
      </div>

      <Grid2 container spacing={3}>
        {/* Performance Summary Cards */}
        <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
          <TradingPerformanceSummary
            title="Net Profit"
            value={performanceMetrics.netProfit}
            currency="$"
            color={performanceMetrics.netProfit >= 0 ? 'success' : 'error'}
            icon={<Iconify width={24} icon="eva:trending-up-fill" />}
          />
        </Grid2>

        <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
          <TradingPerformanceSummary
            title="Win Rate"
            value={performanceMetrics.winRate}
            suffix="%"
            color="info"
            icon={<Iconify width={24} icon="eva:checkmark-fill" />}
          />
        </Grid2>

        <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
          <TradingPerformanceSummary
            title="Total Trades"
            value={performanceMetrics.totalTrades}
            color="warning"
            icon={<Iconify width={24} icon="eva:done-all-fill" />}
          />
        </Grid2>

        <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
          <TradingPerformanceSummary
            title="Current Capital"
            value={performanceMetrics.currentCapital}
            currency="$"
            color="primary"
            icon={<Iconify width={24} icon="solar:cart-3-bold" />}
          />
        </Grid2>

        {/* Capital Growth Chart */}
        <Grid2 size={{ xs: 12, md: 8, lg: 9 }}>
          <TradingCapitalGrowth
            title="Capital Growth"
            data={
              // use initial capital from user if available, otherwise fallback to report.capital or 0
              (() => {
                const initialCapital = user?.initial_capital ?? report?.capital ?? 0;
                // sort trades by date ascending to build a chronological series
                const sorted = [...trades].sort((a, b) => {
                  const ta = a.date ? new Date(a.date).getTime() : 0;
                  const tb = b.date ? new Date(b.date).getTime() : 0;
                  return ta - tb;
                });

                return sorted.reduce<{ date: string; capital: number }[]>((acc, trade) => {
                  const prevCapital = acc.length > 0 ? acc[acc.length - 1].capital : initialCapital;
                  const newCapital = prevCapital + (trade.profit_or_loss ?? 0);
                  acc.push({ date: trade.date ?? '', capital: newCapital });
                  return acc;
                }, []);
              })()
            }
          />
        </Grid2>

        {/* Win/Loss Distribution */}
        <Grid2 size={{ xs: 12, md: 4, lg: 3 }}>
          <TradingWinLossChart
            title="Trade Distribution"
            data={{
              win: winningTrades.length,
              loss: losingTrades.length,
              cancelled: cancelledTrades.length,
            }}
          />
        </Grid2>

        {/* Recent Trades Table */}
        <Grid2 size={{ xs: 12, md: 8 }}>
          <TradingRecentTrades title="Recent Trades" trades={trades} />
        </Grid2>

        {/* Pairs Distribution */}
        <Grid2 size={{ xs: 12, md: 4 }}>
          <TradingPairsDistribution
            title="Pairs Distribution"
            data={trades.reduce((acc: Record<string, number>, trade) => {
              if(trade.pair) {
                acc[trade.pair] = (acc[trade.pair] || 0) + 1;
              }
              return acc;
            }, {})}
          />
        </Grid2>

        {/* System Performance */}
        <Grid2 size={{ xs: 12 }}>
          <TradingSystemPerformance
            title="System Performance"
            data={trades.reduce(
              (
                acc: Record<
                  string,
                  { wins: number; losses: number; total: number; profit: number }
                >,
                trade
              ) => {
                if (trade.system && !acc[trade.system]) {
                  acc[trade.system] = { wins: 0, losses: 0, total: 0, profit: 0 };
                }
                if (trade.system && trade.profit_or_loss && trade.profit_or_loss > 0) acc[trade.system].wins++;
                if (trade.system && trade.profit_or_loss && trade.profit_or_loss < 0) acc[trade.system].losses++;
                if(trade.system) {
                  acc[trade.system].total++;
                  if(trade.profit_or_loss) {
                    acc[trade.system].profit += trade.profit_or_loss;
                  }
                }
                return acc;
              },
              {}
            )}
          />
        </Grid2>
      </Grid2>

      <AddTradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onTradeAdded={() => {
          setLoading(true);
          listTradesApiTradesGet()
            .then((response) => {
              if (response.data) {
                setTrades(Array.isArray(response.data) ? response.data : []);
              } else {
                setTrades([]);
              }
              setNotification({ open: true, message: 'Trade added successfully!' });
            })
            .catch(() => {
              setTrades([]);
              setNotification({
                open: true,
                message: 'Error fetching trades after adding new trade.',
              });
            })
            .finally(() => setLoading(false));

          getReportApiReportGet()
            .then((response) => {
              setReport(response.data);
            })
            .catch(() => {
              setReport(undefined);
            });
        }}
        loading={loading}
      />

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert
          severity={notification.message.includes('Error') ? 'error' : 'success'}
          onClose={() => setNotification({ ...notification, open: false })}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}
