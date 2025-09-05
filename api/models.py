from sqlalchemy import Column, Integer, String, Float, Boolean, Date, Enum, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import enum

class RoleEnum(str, enum.Enum):
    admin = "admin"
    user = "user"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    valid = Column(Boolean, default=True)
    role = Column(Enum(RoleEnum), default=RoleEnum.user)
    initial_capital = Column(Float, default=1000.0)

    trades = relationship("Trade", back_populates="owner")

class Trade(Base):
    __tablename__ = "trades"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date)
    pair = Column(String)
    system = Column(String)
    action = Column(String)
    risk = Column(String)
    risk_percent = Column(Float)
    lots = Column(Float)
    entry = Column(Float)
    sl1_pips = Column(Float)
    tp1_pips = Column(Float)
    sl2_pips = Column(Float)
    tp2_pips = Column(Float)
    cancelled = Column(Boolean, default=False)
    profit_or_loss = Column(Float)
    comments = Column(String)
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="trades")
