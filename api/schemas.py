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

    class Config:
        from_attributes = True

# --- Token ---
class TokenSchema(BaseModel):
    access_token: str
    token_type: str
    role: RoleEnum

# --- Trades ---
class TradeCreate(BaseModel):
    date: date
    pair: str
    system: str
    action: str
    risk: str
    risk_percent: float
    lots: float
    entry: float
    sl1_pips: float
    tp1_pips: float
    sl2_pips: float
    tp2_pips: float
    cancelled: bool
    profit_or_loss: float
    comments: str

class TradeResponse(TradeCreate):
    id: int
    owner_id: int
    class Config:
        from_attributes = True

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
