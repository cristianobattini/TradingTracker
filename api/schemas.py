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
    date: Optional[date]
    pair: Optional[str]
    system: Optional[str]
    action: Optional[str]
    risk: Optional[str]
    risk_percent: Optional[float]
    lots: Optional[float]
    entry: Optional[float]
    sl1_pips: Optional[float]
    tp1_pips: Optional[float]
    sl2_pips: Optional[float]
    tp2_pips: Optional[float]
    cancelled: Optional[bool]
    profit_or_loss: Optional[float]
    comments: Optional[str]

class TradeResponse(TradeCreate):
    id: int
    owner_id: int
    class Config:
        from_attributes = True
        
class TradeUpdate(BaseModel):
    symbol: Optional[str] = None
    entry_price: Optional[float] = None
    exit_price: Optional[float] = None
    quantity: Optional[float] = None
    position_type: Optional[str] = None
    profit_or_loss: Optional[float] = None
    cancelled: Optional[bool] = None

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
