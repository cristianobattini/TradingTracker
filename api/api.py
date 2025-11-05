from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, APIRouter
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from database import Base, SessionLocal, engine
from models import User, Trade
from schemas import UserCreate, UserResponse, TokenSchema, TradeCreate, TradeResponse, ReportResponse, UserUpdate, PasswordChange, TradeUpdate
from auth import AuthService, oauth2_scheme 
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

Base.metadata.create_all(bind=engine)

# Configurazione CORS basata sull'ambiente
def get_cors_origins():
    env = os.getenv("PROJECT_ENV", "development")
    if env == "production":
        return ["https://vmtrbc01.northeurope.cloudapp.azure.com"]
    else:
        return [
            "http://localhost:3039",
            "http://127.0.0.1:3039",
            "https://vmtrbc01.northeurope.cloudapp.azure.com",
            "http://vmtrbc01.northeurope.cloudapp.azure.com",
        ]

app = FastAPI(
    title="Trading API",
    description="A trading platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    debug=os.getenv("DEBUG", "False").lower() == "true"
)

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="Trading API",
        version="1.0.0",
        description="A trading platform API",
        routes=app.routes,
    )
    
    openapi_schema["components"]["securitySchemes"] = {
        "OAuth2PasswordBearer": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)

# --- Dependencies ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_auth_service(db: Session = Depends(get_db)):
    return AuthService(db)

def get_current_user(
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service)
):
    return auth_service.get_current_user(token)

def get_current_active_user(
    current_user: User = Depends(get_current_user)
):
    if not current_user.valid:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def require_admin(
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

# === USER MANAGEMENT ===

# --- User registration by admin ---
@app.post("/users/", response_model=UserResponse)
def create_user(
    new_user: UserCreate,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
    current_admin: User = Depends(require_admin),
):
    if db.query(User).filter(User.username == new_user.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    
    if db.query(User).filter(User.email == new_user.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    
    hashed_pw = auth_service.get_password_hash(new_user.password)
    user = User(
        username=new_user.username,
        email=new_user.email,
        hashed_password=hashed_pw,
        role=new_user.role,
        initial_capital=new_user.initial_capital
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# --- Get all users (admin only) ---
@app.get("/users/", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    users = db.query(User).all()
    return users

##### LEAVE HERE !!!!!!! UPSIDE get_user, or it will missmatch the names !!!!! ####
# --- Get current user ---
@app.get("/users/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# --- Get user by ID (admin only) ---
@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# --- Update user (admin only) ---
@app.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if username already exists (excluding current user)
    if user_update.username and user_update.username != user.username:
        existing_user = db.query(User).filter(User.username == user_update.username, User.id != user_id).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email already exists (excluding current user)
    if user_update.email and user_update.email != user.email:
        existing_email = db.query(User).filter(User.email == user_update.email, User.id != user_id).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already exists")
    
    # Update fields
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user

# --- Delete user (admin only) ---
@app.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent admin from deleting themselves
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

# === PASSWORD MANAGEMENT ===

# --- Change own password ---
@app.post("/users/me/change-password")
def change_own_password(
    password_change: PasswordChange,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
    current_user: User = Depends(get_current_active_user),
):
    # Verify current password
    if not auth_service.verify_password(password_change.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update password
    current_user.hashed_password = auth_service.get_password_hash(password_change.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}

# --- Change user password (admin only) ---
@app.post("/users/{user_id}/change-password")
def change_user_password(
    user_id: int,
    password_change: PasswordChange,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
    current_admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # For admin changing another user's password, we don't require current password
    user.hashed_password = auth_service.get_password_hash(password_change.new_password)
    db.commit()
    
    return {"message": f"Password for user {user.username} changed successfully"}

# === AUTHENTICATION ===

# --- Login ---
@app.post("/login", response_model=TokenSchema)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    auth_service: AuthService = Depends(get_auth_service)
):
    user = auth_service.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60)))
    access_token = auth_service.create_access_token(
        data={"sub": user.username}, 
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

# === TRADE MANAGEMENT ===

# --- Create trade ---
@app.post("/trades/", response_model=TradeResponse)
def create_trade(
    trade: TradeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_trade = Trade(**trade.dict(), owner_id=current_user.id)
    db.add(db_trade)
    db.commit()
    db.refresh(db_trade)
    return db_trade

# --- List trades for current user ---
@app.get("/trades/", response_model=List[TradeResponse])
def list_trades(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Trade).filter(Trade.owner_id == current_user.id).all()

# --- Get specific trade ---
@app.get("/trades/{trade_id}", response_model=TradeResponse)
def get_trade(
    trade_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    trade = db.query(Trade).filter(Trade.id == trade_id, Trade.owner_id == current_user.id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade

# --- Update trade ---
@app.put("/trades/{trade_id}", response_model=TradeResponse)
def update_trade(
    trade_id: int,
    trade_update: TradeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    trade = db.query(Trade).filter(Trade.id == trade_id, Trade.owner_id == current_user.id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    # Update fields
    update_data = trade_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(trade, field, value)
    
    db.commit()
    db.refresh(trade)
    return trade

# --- Delete trade ---
@app.delete("/trades/{trade_id}")
def delete_trade(
    trade_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    trade = db.query(Trade).filter(Trade.id == trade_id, Trade.owner_id == current_user.id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    db.delete(trade)
    db.commit()
    return {"message": "Trade deleted successfully"}

# --- Cancel trade (soft delete) ---
@app.post("/trades/{trade_id}/cancel")
def cancel_trade(
    trade_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    trade = db.query(Trade).filter(Trade.id == trade_id, Trade.owner_id == current_user.id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    trade.cancelled = True
    db.commit()
    return {"message": "Trade cancelled successfully"}

# === REPORTS ===

# --- Report per user ---
@app.get("/report/", response_model=ReportResponse)
def get_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    trades = db.query(Trade).filter(Trade.owner_id == current_user.id, Trade.cancelled == False).all()
    total_profit = sum(t.profit_or_loss for t in trades if t.profit_or_loss > 0)
    total_loss = sum(t.profit_or_loss for t in trades if t.profit_or_loss < 0)
    wins = [t.profit_or_loss for t in trades if t.profit_or_loss > 0]
    losses = [t.profit_or_loss for t in trades if t.profit_or_loss < 0]
    num_trades = len(trades)
    win_probability = (len(wins)/num_trades*100) if num_trades else 0.0
    loss_probability = (len(losses)/num_trades*100) if num_trades else 0.0
    avg_win = (sum(wins)/len(wins)) if wins else 0.0
    avg_loss = (sum(losses)/len(losses)) if losses else 0.0
    expectancy = (avg_win * win_probability/100) + (avg_loss * loss_probability/100)
    capital = current_user.initial_capital + sum(t.profit_or_loss for t in trades)
    return ReportResponse(
        total_profit=total_profit,
        total_loss=total_loss,
        win_probability=win_probability,
        loss_probability=loss_probability,
        avg_win=avg_win,
        avg_loss=avg_loss,
        expectancy=expectancy,
        capital=capital
    )

# --- Health check ---
@app.get("/health")
def health_check():
    return {
        "status": "healthy", 
        "environment": os.getenv("PROJECT_ENV", "development"),
        "debug": os.getenv("DEBUG", "False")
    }

@app.get("/")
async def root():
    return {
        "message": "Trading API", 
        "environment": os.getenv("PROJECT_ENV", "development"),
        "version": "1.0.0"
    }