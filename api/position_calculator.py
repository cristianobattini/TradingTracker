"""
Position calculation service with multi-currency support.
Takes into account the trader's account currency and converts positions accordingly.
"""

from typing import Optional, Dict, Tuple
from sqlalchemy.orm import Session
from models import Trade, User
from exchange_rate_service import ExchangeRateService


class PositionCalculator:
    """Calculate trading positions considering account currency and FX rates."""
    
    @staticmethod
    def get_exchange_rate(from_currency: str, to_currency: str) -> float:
        """Get exchange rate from one currency to another using live API."""
        return ExchangeRateService.get_rate(from_currency, to_currency)
    
    @staticmethod
    def convert_amount(amount: float, from_currency: str, to_currency: str) -> float:
        """Convert amount from one currency to another using live rates."""
        rate = PositionCalculator.get_exchange_rate(from_currency, to_currency)
        return amount * rate
    
    @staticmethod
    def calculate_position_value(
        trade: Trade,
        account_currency: str
    ) -> Tuple[float, str]:
        """
        Calculate position value in account currency.
        
        Returns:
            Tuple of (value_in_account_currency, original_currency)
        """
        if trade.profit_or_loss is None:
            return 0.0, account_currency
        
        # If trade has explicit currency, use it
        if trade.currency:
            converted = PositionCalculator.convert_amount(
                trade.profit_or_loss,
                trade.currency,
                account_currency
            )
            return converted, trade.currency
        
        # If trade has exchange_rate and is forex (pair-based), use it
        if trade.exchange_rate and trade.pair:
            # Try to extract currency from pair (e.g., EUR/USD -> USD for profit)
            pair_parts = trade.pair.split('/')
            if len(pair_parts) == 2:
                quote_currency = pair_parts[1]
                converted = PositionCalculator.convert_amount(
                    trade.profit_or_loss,
                    quote_currency,
                    account_currency
                )
                return converted, quote_currency
        
        # Default: assume profit_or_loss is already in account_currency
        return trade.profit_or_loss, account_currency
    
    @staticmethod
    def calculate_report(
        db: Session,
        current_user: User
    ) -> Dict:
        """
        Calculate trading report considering account currency.
        
        Returns:
            Dictionary with metrics converted to account currency
        """
        trades = db.query(Trade).filter(
            Trade.owner_id == current_user.id,
            Trade.cancelled == False
        ).all()
        
        account_currency = current_user.account_currency or "USD"
        
        # Convert all profit/loss to account currency
        converted_pnl = []
        for trade in trades:
            value, _ = PositionCalculator.calculate_position_value(
                trade,
                account_currency
            )
            converted_pnl.append(value)
        
        # Calculate metrics
        total_profit = sum(v for v in converted_pnl if v > 0)
        total_loss = sum(v for v in converted_pnl if v < 0)
        wins = [v for v in converted_pnl if v > 0]
        losses = [v for v in converted_pnl if v < 0]
        
        num_trades = len(trades)
        win_probability = (len(wins) / num_trades * 100) if num_trades else 0.0
        loss_probability = (len(losses) / num_trades * 100) if num_trades else 0.0
        avg_win = (sum(wins) / len(wins)) if wins else 0.0
        avg_loss = (sum(losses) / len(losses)) if losses else 0.0
        expectancy = (avg_win * win_probability / 100) + (avg_loss * loss_probability / 100)
        
        # Capital calculation in account currency
        total_pnl = sum(converted_pnl)
        capital = current_user.initial_capital + total_pnl
        
        return {
            'total_profit': total_profit,
            'total_loss': total_loss,
            'win_probability': win_probability,
            'loss_probability': loss_probability,
            'avg_win': avg_win,
            'avg_loss': avg_loss,
            'expectancy': expectancy,
            'capital': capital,
            'account_currency': account_currency,
            'total_pnl': total_pnl,
            'num_trades': num_trades,
        }
    
    @staticmethod
    def get_position_summary(
        db: Session,
        current_user: User
    ) -> Dict:
        """Get summary of current open positions by currency."""
        trades = db.query(Trade).filter(
            Trade.owner_id == current_user.id,
            Trade.cancelled == False
        ).all()
        
        account_currency = current_user.account_currency or "USD"
        
        # Group by currency
        positions_by_currency: Dict[str, list] = {}
        total_in_account_currency = 0.0
        
        for trade in trades:
            if trade.profit_or_loss is None:
                continue
            
            value, currency = PositionCalculator.calculate_position_value(
                trade,
                account_currency
            )
            
            if currency not in positions_by_currency:
                positions_by_currency[currency] = []
            
            positions_by_currency[currency].append({
                'trade_id': trade.id,
                'pair': trade.pair,
                'pnl_original': trade.profit_or_loss,
                'currency': currency,
                'pnl_in_account': value,
            })
            
            total_in_account_currency += value
        
        return {
            'account_currency': account_currency,
            'total_pnl': total_in_account_currency,
            'positions_by_currency': {
                curr: {
                    'trades': trades,
                    'total': sum(t['pnl_in_account'] for t in trades),
                    'count': len(trades),
                }
                for curr, trades in positions_by_currency.items()
            },
        }
