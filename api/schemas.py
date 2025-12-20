from typing import Optional
from pydantic import BaseModel
from datetime import date
from models import RoleEnum

# --- Users ---
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: RoleEnum = RoleEnum.user
    initial_capital: float = 1000.0

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: RoleEnum
    valid: bool
    initial_capital: float
    avatar: str

    class Config:
        from_attributes = True
        
class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    initial_capital: Optional[float] = None
    valid: Optional[bool] = None
    
class PasswordChange(BaseModel):
    current_password: str
    new_password: str

# --- Token ---
class TokenSchema(BaseModel):
    access_token: str
    token_type: str
    role: RoleEnum

# --- Trades ---
class TradeCreate(BaseModel):
    # --- Trading system ---
    date: Optional[date]
    pair: Optional[str] = None
    system: Optional[str] = None
    action: Optional[str] = None
    risk: Optional[str] = None
    risk_percent: Optional[float] = None
    lots: Optional[float] = None
    entry: Optional[float] = None
    sl1_pips: Optional[float] = None
    tp1_pips: Optional[float] = None
    sl2_pips: Optional[float] = None
    tp2_pips: Optional[float] = None
    cancelled: Optional[bool] = False
    profit_or_loss: Optional[float] = None
    comments: Optional[str] = None

    # --- Campi bancari ---
    instrument_name: Optional[str] = None
    isin: Optional[str] = None
    currency: Optional[str] = None
    operation_type: Optional[str] = None
    sign: Optional[str] = None
    quantity: Optional[float] = None
    exchange_rate: Optional[float] = None
    gross_amount: Optional[float] = None

    # --- Commissioni ---
    commission_fund: Optional[float] = None
    commission_bank: Optional[float] = None
    commission_sgr: Optional[float] = None
    commission_admin: Optional[float] = None


class TradeResponse(TradeCreate):
    id: int
    owner_id: int

    class Config:
        from_attributes = True

        
class TradeUpdate(BaseModel):
    date: Optional[date]
    pair: Optional[str] = None
    system: Optional[str] = None
    action: Optional[str] = None
    risk: Optional[str] = None
    risk_percent: Optional[float] = None
    lots: Optional[float] = None
    entry: Optional[float] = None
    sl1_pips: Optional[float] = None
    tp1_pips: Optional[float] = None
    sl2_pips: Optional[float] = None
    tp2_pips: Optional[float] = None
    cancelled: Optional[bool] = None
    profit_or_loss: Optional[float] = None
    comments: Optional[str] = None

    instrument_name: Optional[str] = None
    isin: Optional[str] = None
    currency: Optional[str] = None
    operation_type: Optional[str] = None
    sign: Optional[str] = None
    quantity: Optional[float] = None
    exchange_rate: Optional[float] = None
    gross_amount: Optional[float] = None

    commission_fund: Optional[float] = None
    commission_bank: Optional[float] = None
    commission_sgr: Optional[float] = None
    commission_admin: Optional[float] = None


# --- Reports ---
class ReportResponse(BaseModel):
    total_profit: float
    total_loss: float
    win_probability: float
    loss_probability: float
    avg_win: float
    avg_loss: float
    expectancy: float
    capital: float
