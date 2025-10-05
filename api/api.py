from typing import List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from database import Base, SessionLocal, engine
from models import User, Trade
from schemas import UserCreate, UserResponse, TokenSchema, TradeCreate, TradeResponse, ReportResponse
from auth import AuthService, oauth2_scheme 
import os
from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from database import Base, SessionLocal, engine
from models import User, Trade
from schemas import UserCreate, UserResponse, TokenSchema, TradeCreate, TradeResponse, ReportResponse
from auth import AuthService
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Trading API",
    description="A trading platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
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

origins = [
    "http://localhost:3039",
    "localhost:3039"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- OAuth2 Scheme ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# ... rest of your dependencies and routes remain the same ...

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

# --- User fetch by admin ---
@app.get("/users/", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
    current_admin: User = Depends(require_admin),
):
    users = db.query(User).all()
    return users

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
    access_token_expires = timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30)))
    access_token = auth_service.create_access_token(
        data={"sub": user.username}, 
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

# --- Get current user ---
@app.get("/users/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

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
@app.get("/trades/", response_model=list[TradeResponse])
def list_trades(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Trade).filter(Trade.owner_id == current_user.id).all()

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