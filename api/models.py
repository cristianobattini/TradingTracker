from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
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
    account_currency = Column(String, default="USD")
    avatar = Column(String, default="default_avatar.png")

    trades = relationship("Trade", back_populates="owner")
    analyses = relationship("Analysis", back_populates="owner")
    favorite_bookmarks = relationship("FavoriteBookmark", back_populates="owner")
    read_later_bookmarks = relationship("ReadLaterBookmark", back_populates="owner")
    shared_analyses = relationship("AnalysisShare", foreign_keys="AnalysisShare.shared_with_user_id", back_populates="shared_with_user")
    analyses_shared_by_me = relationship("AnalysisShare", foreign_keys="AnalysisShare.shared_by_user_id", back_populates="shared_by_user")

class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)

    # === Trading system (già esistenti)
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

    # === Nuovi campi "bancari"
    instrument_name = Column(String)      
    isin = Column(String)
    currency = Column(String)             
    operation_type = Column(String)       
    sign = Column(String)                 
    quantity = Column(Float)              
    exchange_rate = Column(Float)         
    gross_amount = Column(Float)          

    # === Commissioni
    commission_fund = Column(Float)
    commission_bank = Column(Float)
    commission_sgr = Column(Float)
    commission_admin = Column(Float)

    # === Leverage / Margin
    leverage = Column(Float, nullable=True)           # es. 1:10, 1:50
    percentage_margin = Column(Float, nullable=True)  # es. 2.0 (2% margin required)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="trades")


class FavoriteBookmark(Base):
    __tablename__ = "favorite_bookmarks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    description = Column(Text, default="")
    color = Column(String, default="#2196F3")
    emoji = Column(String, default="🔖")
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="favorite_bookmarks")


class ReadLaterBookmark(Base):
    __tablename__ = "read_later_bookmarks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    summary = Column(Text, default="")
    url = Column(String, nullable=False)
    published_at = Column(String, nullable=True)
    source = Column(String, default="")
    source_id = Column(String, default="")
    source_color = Column(String, default="")
    site_url = Column(String, default="")
    saved_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)  # None = never expire
    pinned = Column(Boolean, default=False)
    pin_order = Column(Integer, default=0)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="read_later_bookmarks")


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    pair = Column(String, nullable=True)
    timeframe = Column(String, nullable=True)
    content = Column(Text, default="")
    pinned = Column(Boolean, default=False)
    pin_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="analyses")
    shares = relationship("AnalysisShare", back_populates="analysis", cascade="all, delete-orphan")


class AnalysisShare(Base):
    __tablename__ = "analysis_shares"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    shared_with_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    shared_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    pinned = Column(Boolean, default=False)

    analysis = relationship("Analysis", back_populates="shares")
    shared_with_user = relationship("User", foreign_keys=[shared_with_user_id], back_populates="shared_analyses")
    shared_by_user = relationship("User", foreign_keys=[shared_by_user_id], back_populates="analyses_shared_by_me")


