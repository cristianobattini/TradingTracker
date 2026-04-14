import shutil
from typing import List, Optional
import uuid
from fastapi import FastAPI, Depends, File, HTTPException, UploadFile, status, APIRouter
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from database import Base, SessionLocal, engine, seed_sqlite_defaults
from models import User, Trade, Analysis, FavoriteBookmark, ReadLaterBookmark, AnalysisShare
from ai import ask_ai, import_excel_ai
from news_service import fetch_all_news, fetch_calendar
from position_calculator import PositionCalculator
from schemas import UserCreate, UserResponse, TokenSchema, TradeCreate, TradeResponse, ReportResponse, UserUpdate, PasswordChange, TradeUpdate, AnalysisCreate, AnalysisResponse, AnalysisUpdate, FavoriteBookmarkCreate, FavoriteBookmarkUpdate, FavoriteBookmarkResponse, ReorderRequest, ReadLaterBookmarkCreate, ReadLaterExpiryUpdate, ReadLaterBookmarkResponse, ReadLaterReorderRequest, ShareAnalysisRequest, AnalysisResponseWithShares, UserBasicResponse, AnalysisShareResponse
from auth import AuthService, oauth2_scheme 
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

Base.metadata.create_all(bind=engine)
seed_sqlite_defaults()

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

os.makedirs("uploads/avatars", exist_ok=True)
os.makedirs("uploads/analysis-images", exist_ok=True)

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

# === CREATE ROUTER ===
router = APIRouter(prefix="/api")

app.mount("/avatars", StaticFiles(directory="uploads/avatars"), name="avatars")
app.mount("/analysis-images", StaticFiles(directory="uploads/analysis-images"), name="analysis-images")

# === EXCEL ===
EXCEL_UPLOAD_FOLDER = "uploads/excel/"
@router.post("/trades/import")
async def import_trades(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    os.makedirs(EXCEL_UPLOAD_FOLDER, exist_ok=True)
    file_location = os.path.join(EXCEL_UPLOAD_FOLDER, file.filename)

    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    trades, issues = import_excel_ai(file_location, current_user.id)

    os.remove(file_location)

    db.add_all(trades)
    db.commit()

    return {
        "imported": len(trades),
        "issues": issues
    }

    

# === AVATAR ===
UPLOAD_FOLDER = "uploads/avatars/"

@router.post("/users/{user_id}/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Recupera l'utente
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        return {"error": "User not found"}

    # Se esiste un avatar precedente, elimina il file
    if user.avatar:
        old_avatar_path = os.path.join(UPLOAD_FOLDER, user.avatar)
        if os.path.exists(old_avatar_path):
            os.remove(old_avatar_path)

    # Genera un nuovo filename
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    # Salva il nuovo file
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Aggiorna il DB
    user.avatar = filename
    db.commit()
    db.refresh(user)

    return {"message": "Avatar updated", "avatar": filename}

@router.get("/users/{user_id}/avatar")
async def get_avatar(
    current_user: User = Depends(get_current_user),
):
    return current_user.avatar

# === AI INTERFACE ===
@router.post("/ai/ask")
def ask_question(
    question: str,
    user_data_required: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ask the AI a question and include a summary of the current user's recent trades
    so the AI can make considerations about the user's trading activity.
    Requires the request to be authenticated (uses current_user dependency).
    """
    try:
        # fetch recent non-cancelled trades for the current user (limit 20)
        recent_trades = (
            db.query(Trade)
            .filter(Trade.owner_id == current_user.id, Trade.cancelled == False)
            .order_by(Trade.id.desc())
            .limit(20)
            .all()
        )

        # build a markdown table with recent trades for the AI prompt using actual Trade fields
        if current_user and recent_trades and user_data_required:
            lines = [
                "Recent trades (most recent first):",
                "| id | date | pair | system | action | risk | risk_pct | lots | entry | sl1_pips | tp1_pips | sl2_pips | tp2_pips | profit_or_loss | comments |",
                "|---:|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|",
            ]
            for t in recent_trades:
                # format values (fallback to empty string if None)
                date = getattr(t, 'date', '')
                pair = getattr(t, 'pair', '')
                system = getattr(t, 'system', '')
                action = getattr(t, 'action', '')
                risk = getattr(t, 'risk', '')
                risk_pct = getattr(t, 'risk_percent', '')
                lots = getattr(t, 'lots', '')
                entry = getattr(t, 'entry', '')
                sl1 = getattr(t, 'sl1_pips', '')
                tp1 = getattr(t, 'tp1_pips', '')
                sl2 = getattr(t, 'sl2_pips', '')
                tp2 = getattr(t, 'tp2_pips', '')
                profit = getattr(t, 'profit_or_loss', '')
                comments = getattr(t, 'comments', '')

                # escape pipe characters in comments to not break the table
                if isinstance(comments, str):
                    comments = comments.replace('|', '\\|')

                lines.append(
                    f"| {t.id} | {date} | {pair} | {system} | {action} | {risk} | {risk_pct} | {lots} | {entry} | {sl1} | {tp1} | {sl2} | {tp2} | {profit} | {comments} |"
                )

            trades_md = "\n".join(lines)
        else:
            trades_md = "Ask theuser to check the checkbox called \"Upload\", by checking the checkbox you will recive trades data."

        # compose a prompt that includes user info, trades summary and the question
        # add clear instructions so the AI knows which fields are available and how to use them
        user_info = f"User: {current_user.username} (id: {current_user.id})" if current_user else "Anonymous user"
        instruction = "You are a professional trader, helping another trader."
        
        if(user_data_required):
            instruction += (
                "You are a professional trader and risk manager. You will receive a table of the user's recent trades "
                "with the following available fields: id, date, pair, system, action, risk, risk_pct, lots, entry, sl1_pips, tp1_pips, sl2_pips, tp2_pips, profit_or_loss, comments. "
                "If a particular value is missing, note it. Use the provided data to evaluate trade selection, risk management, position sizing, and execution quality. "
                "Provide actionable recommendations and, where possible, show simple calculations (e.g., average profit, win rate) derived from these trades."
            )

        composed_prompt = f"{instruction}\n\n{user_info}\n\n{trades_md}\n\nQuestion: {question}"

        answer = ask_ai(composed_prompt)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# === USER MANAGEMENT ===

# --- User registration by admin ---
@router.post("/users/", response_model=UserResponse)
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
@router.get("/users/", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    users = db.query(User).all()
    return users

##### LEAVE HERE !!!!!!! UPSIDE get_user, or it will missmatch the names !!!!! ####
# --- Get current user ---
@router.get("/users/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# --- Update current user (self-update, any authenticated user) ---
@router.put("/users/me", response_model=UserResponse)
def update_current_user(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_update.username and user_update.username != user.username:
        if db.query(User).filter(User.username == user_update.username, User.id != user.id).first():
            raise HTTPException(status_code=400, detail="Username already exists")

    if user_update.email and user_update.email != user.email:
        if db.query(User).filter(User.email == user_update.email, User.id != user.id).first():
            raise HTTPException(status_code=400, detail="Email already exists")

    if user_update.username is not None:
        user.username = user_update.username
    if user_update.email is not None:
        user.email = user_update.email
    if user_update.initial_capital is not None:
        user.initial_capital = user_update.initial_capital
    if user_update.account_currency is not None:
        user.account_currency = user_update.account_currency
    # role and valid can only be changed by admin

    db.commit()
    db.refresh(user)
    return user

# --- Get user by ID (admin only) ---
@router.get("/users/{user_id}", response_model=UserResponse)
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
@router.put("/users/{user_id}", response_model=UserResponse)
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
@router.delete("/users/{user_id}")
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
@router.post("/users/me/change-password")
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
@router.post("/users/{user_id}/change-password")
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
@router.post("/login", response_model=TokenSchema)
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
@router.post("/trades/", response_model=TradeResponse)
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
@router.get("/trades/", response_model=List[TradeResponse])
def list_trades(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Trade).filter(Trade.owner_id == current_user.id).all()

# --- Get specific trade ---
@router.get("/trades/{trade_id}", response_model=TradeResponse)
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
@router.put("/trades/{trade_id}", response_model=TradeResponse)
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
@router.delete("/trades/{trade_id}")
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

# --- Delete trade ---
@router.delete("/trades/")
def delete_trades(
    trade_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deleted = (
        db.query(Trade)
        .filter(
            Trade.id.in_(trade_ids),
            Trade.owner_id == current_user.id
        )
        .delete(synchronize_session=False)
    )

    db.commit()

    return {
        "requested": len(trade_ids),
        "deleted": deleted
    }

# --- Cancel trade (soft delete) ---
@router.post("/trades/{trade_id}/cancel")
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

# --- Report per user with multi-currency support ---
@router.get("/report/", response_model=ReportResponse)
def get_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get trading report with multi-currency support.
    All P&L values are converted to the user's account currency.
    """
    report_data = PositionCalculator.calculate_report(db, current_user)
    
    return ReportResponse(
        total_profit=report_data['total_profit'],
        total_loss=report_data['total_loss'],
        win_probability=report_data['win_probability'],
        loss_probability=report_data['loss_probability'],
        avg_win=report_data['avg_win'],
        avg_loss=report_data['avg_loss'],
        expectancy=report_data['expectancy'],
        capital=report_data['capital'],
        account_currency=report_data['account_currency'],
        total_pnl=report_data['total_pnl'],
        num_trades=report_data['num_trades'],
    )

@router.get("/report/positions-by-currency")
def get_positions_by_currency(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get position summary grouped by currency.
    All values converted to account currency.
    """
    summary = PositionCalculator.get_position_summary(db, current_user)
    return summary

# --- Exchange Rates (Live) ---
@router.get("/exchange-rates")
def get_exchange_rates(
    from_currency: str = "EUR",
    to_currency: str = "USD",
):
    """
    Get live exchange rate between two currencies.
    
    Query Parameters:
    - from_currency: Source currency (default: EUR)
    - to_currency: Target currency (default: USD)
    
    Returns:
    {
        "from": "EUR",
        "to": "USD",
        "rate": 1.10,
        "timestamp": "2026-04-13T10:30:00Z"
    }
    """
    from exchange_rate_service import ExchangeRateService
    from datetime import datetime
    
    rate = ExchangeRateService.get_rate(from_currency.upper(), to_currency.upper())
    
    return {
        "from": from_currency.upper(),
        "to": to_currency.upper(),
        "rate": round(rate, 6),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@router.get("/exchange-rates/all")
def get_all_exchange_rates(base_currency: str = "USD"):
    """
    Get all supported currency rates relative to a base currency.
    
    Query Parameters:
    - base_currency: Base currency (default: USD)
    
    Returns dictionary of all supported rates relative to base.
    """
    from exchange_rate_service import ExchangeRateService
    from datetime import datetime
    
    # Get all rates (fetches from ECB)
    all_rates = ExchangeRateService.get_all_rates_usd()
    
    # Convert to requested base currency if not USD
    base = base_currency.upper()
    if base != "USD":
        base_rate = all_rates.get(base, 1.0)
        converted_rates = {}
        for curr, rate in all_rates.items():
            converted_rates[curr] = round(rate / base_rate, 6)
        all_rates = converted_rates
    else:
        all_rates = {k: round(v, 6) for k, v in all_rates.items()}
    
    return {
        "base": base,
        "rates": all_rates,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

# --- Health check ---
@router.get("/health")
def health_check():
    return {
        "status": "healthy", 
        "environment": os.getenv("PROJECT_ENV", "development"),
        "debug": os.getenv("DEBUG", "False")
    }

@router.get("/")
async def root():
    return {
        "message": "Trading API", 
        "environment": os.getenv("PROJECT_ENV", "development"),
        "version": "1.0.0"
    }

# === ANALYSIS ===

ANALYSIS_IMAGES_FOLDER = "uploads/analysis-images/"

@router.post("/analyses/images/upload")
async def upload_analysis_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(ANALYSIS_IMAGES_FOLDER, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"url": f"/{ANALYSIS_IMAGES_FOLDER}/{filename}"}


@router.post("/analyses/", response_model=AnalysisResponse)
def create_analysis(
    analysis: AnalysisCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_analysis = Analysis(**analysis.dict(), owner_id=current_user.id)
    db.add(db_analysis)
    db.commit()
    db.refresh(db_analysis)
    return db_analysis


@router.get("/analyses/", response_model=List[AnalysisResponseWithShares])
def list_analyses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all analyses owned by the user and analyses shared with the user."""
    # Get owned analyses
    owned_analyses = db.query(Analysis).filter(Analysis.owner_id == current_user.id).order_by(Analysis.created_at.desc()).all()
    
    # Convert to response objects
    response_list = []
    for analysis in owned_analyses:
        shares_response = []
        if hasattr(analysis, 'shares') and analysis.shares:
            for share in analysis.shares:
                shares_response.append(AnalysisShareResponse(
                    id=share.id,
                    analysis_id=share.analysis_id,
                    shared_with_user_id=share.shared_with_user_id,
                    shared_by_user_id=share.shared_by_user_id,
                    created_at=share.created_at,
                    shared_by_user=UserBasicResponse(
                        id=share.shared_by_user.id,
                        username=share.shared_by_user.username,
                        avatar=share.shared_by_user.avatar
                    ),
                    shared_with_user=UserBasicResponse(
                        id=share.shared_with_user.id,
                        username=share.shared_with_user.username,
                        avatar=share.shared_with_user.avatar
                    )
                ))
        # Create a dict without the 'shares' key to avoid conflict
        analysis_dict = {k: v for k, v in analysis.__dict__.items() if k != 'shares' and not k.startswith('_')}
        response_list.append(AnalysisResponseWithShares(
            **analysis_dict,
            is_shared=False,
            shared_by_user=None,
            shares=shares_response
        ))
    
    # Get shared analyses
    shared_analyses = db.query(AnalysisShare).filter(AnalysisShare.shared_with_user_id == current_user.id).all()
    for share in shared_analyses:
        analysis = share.analysis
        shared_by_user_data = UserBasicResponse(
            id=share.shared_by_user.id,
            username=share.shared_by_user.username,
            avatar=share.shared_by_user.avatar
        )
        response_list.append(AnalysisResponseWithShares(
            id=analysis.id,
            title=analysis.title,
            pair=analysis.pair,
            timeframe=analysis.timeframe,
            content=analysis.content,
            pinned=share.pinned,
            pin_order=analysis.pin_order,
            created_at=analysis.created_at,
            updated_at=analysis.updated_at,
            owner_id=analysis.owner_id,
            is_shared=True,
            shared_by_user=shared_by_user_data,
            shares=[]
        ))
    
    # Sort by created_at descending
    response_list.sort(key=lambda x: x.created_at, reverse=True)
    return response_list


@router.get("/analyses/{analysis_id}", response_model=AnalysisResponseWithShares)
def get_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Check if user is owner
    if analysis.owner_id == current_user.id:
        shares_response = []
        if hasattr(analysis, 'shares') and analysis.shares:
            for share in analysis.shares:
                shares_response.append(AnalysisShareResponse(
                    id=share.id,
                    analysis_id=share.analysis_id,
                    shared_with_user_id=share.shared_with_user_id,
                    shared_by_user_id=share.shared_by_user_id,
                    created_at=share.created_at,
                    shared_by_user=UserBasicResponse(
                        id=share.shared_by_user.id,
                        username=share.shared_by_user.username,
                        avatar=share.shared_by_user.avatar
                    ),
                    shared_with_user=UserBasicResponse(
                        id=share.shared_with_user.id,
                        username=share.shared_with_user.username,
                        avatar=share.shared_with_user.avatar
                    )
                ))
        # Create a dict without the 'shares' key to avoid conflict
        analysis_dict = {k: v for k, v in analysis.__dict__.items() if k != 'shares' and not k.startswith('_')}
        return AnalysisResponseWithShares(
            **analysis_dict,
            is_shared=False,
            shared_by_user=None,
            shares=shares_response
        )
    
    # Check if shared with user
    share = db.query(AnalysisShare).filter(
        AnalysisShare.analysis_id == analysis_id,
        AnalysisShare.shared_with_user_id == current_user.id
    ).first()
    
    if not share:
        raise HTTPException(status_code=403, detail="You don't have access to this analysis")
    
    shared_by_user_data = UserBasicResponse(
        id=share.shared_by_user.id,
        username=share.shared_by_user.username,
        avatar=share.shared_by_user.avatar
    )
    
    return AnalysisResponseWithShares(
        id=analysis.id,
        title=analysis.title,
        pair=analysis.pair,
        timeframe=analysis.timeframe,
        content=analysis.content,
        pinned=share.pinned,
        pin_order=analysis.pin_order,
        created_at=analysis.created_at,
        updated_at=analysis.updated_at,
        owner_id=analysis.owner_id,
        is_shared=True,
        shared_by_user=shared_by_user_data,
        shares=[]
    )


@router.put("/analyses/{analysis_id}", response_model=AnalysisResponse)
def update_analysis(
    analysis_id: int,
    analysis_update: AnalysisUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id, Analysis.owner_id == current_user.id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    update_data = analysis_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(analysis, field, value)

    from datetime import datetime
    analysis.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(analysis)
    return analysis


@router.patch("/analyses/{analysis_id}/pin")
def pin_analysis(
    analysis_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle pinned for an analysis. Owner pins the analysis itself; recipients pin their share."""
    pinned = body.get("pinned", False)

    # Check ownership first
    analysis = db.query(Analysis).filter(
        Analysis.id == analysis_id,
        Analysis.owner_id == current_user.id
    ).first()

    if analysis:
        analysis.pinned = pinned
        db.commit()
        return {"pinned": analysis.pinned}

    # Check if shared with current user
    share = db.query(AnalysisShare).filter(
        AnalysisShare.analysis_id == analysis_id,
        AnalysisShare.shared_with_user_id == current_user.id
    ).first()

    if share:
        share.pinned = pinned
        db.commit()
        return {"pinned": share.pinned}

    raise HTTPException(status_code=403, detail="Not authorized")


@router.delete("/analyses/{analysis_id}")
def delete_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id, Analysis.owner_id == current_user.id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    db.delete(analysis)
    db.commit()
    return {"message": "Analysis deleted successfully"}


@router.post("/analyses/{analysis_id}/share")
def share_analysis(
    analysis_id: int,
    request: ShareAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Share an analysis with one or more users (owner only)."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id, Analysis.owner_id == current_user.id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    shared_users = []
    for user_id in request.user_ids:
        # Check if user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            continue  # Skip non-existent users
        
        # Check if already shared
        existing_share = db.query(AnalysisShare).filter(
            AnalysisShare.analysis_id == analysis_id,
            AnalysisShare.shared_with_user_id == user_id
        ).first()
        
        if not existing_share:
            share = AnalysisShare(
                analysis_id=analysis_id,
                shared_with_user_id=user_id,
                shared_by_user_id=current_user.id
            )
            db.add(share)
            shared_users.append(user_id)
    
    db.commit()
    return {"message": f"Analysis shared with {len(shared_users)} user(s)", "shared_user_ids": shared_users}


@router.delete("/analyses/{analysis_id}/share/{user_id}")
def unshare_analysis(
    analysis_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke share: owner can remove any recipient; recipient can remove themselves."""
    is_owner = db.query(Analysis).filter(
        Analysis.id == analysis_id,
        Analysis.owner_id == current_user.id
    ).first() is not None

    is_self_removal = current_user.id == user_id

    if not is_owner and not is_self_removal:
        raise HTTPException(status_code=403, detail="Not authorized")

    share = db.query(AnalysisShare).filter(
        AnalysisShare.analysis_id == analysis_id,
        AnalysisShare.shared_with_user_id == user_id
    ).first()

    if not share:
        raise HTTPException(status_code=404, detail="Share not found")

    db.delete(share)
    db.commit()
    return {"message": "Access revoked successfully"}


# === NEWS ===

@router.get("/news/")
def get_news(
    source: Optional[str] = None,
    force_refresh: bool = False,
    current_user: User = Depends(get_current_user),
):
    """Return forex news articles from all RSS sources, optionally filtered by source_id."""
    articles = fetch_all_news(force=force_refresh)
    if source:
        articles = [a for a in articles if a["source_id"] == source]
    return {"articles": articles, "total": len(articles)}


@router.post("/news/ai-summary")
def news_ai_summary(
    current_user: User = Depends(get_current_user),
):
    """Ask the AI to summarise today's top forex news headlines."""
    articles = fetch_all_news()
    if not articles:
        raise HTTPException(status_code=503, detail="No news articles available at the moment.")

    headlines = "\n".join(
        f"- [{a['source']}] {a['title']}: {a['summary'][:150]}"
        for a in articles[:20]
    )

    prompt = (
        "You are a professional forex analyst. "
        "Below are the latest forex news headlines collected from multiple sources.\n\n"
        f"{headlines}\n\n"
        "Please provide:\n"
        "1. A concise executive summary of the main market themes (3-5 sentences).\n"
        "2. Key currency pairs potentially impacted and why.\n"
        "3. Any notable risk events traders should watch.\n\n"
        "Format your response in clear Markdown with sections."
    )

    try:
        summary = ask_ai(prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"summary": summary}


@router.post("/news/ai-report")
def news_ai_report(
    question: str = "Generate a comprehensive forex market report",
    current_user: User = Depends(get_current_user),
):
    """Generate a detailed AI forex report (Markdown) ready to be exported as PDF."""
    articles = fetch_all_news()
    calendar = fetch_calendar()

    headlines = "\n".join(
        f"- [{a['source']}] {a['title']}: {a['summary'][:200]}"
        for a in articles[:25]
    )

    upcoming = "\n".join(
        f"- {ev['date']} {ev['time']} [{ev['country']}] {ev['title']} | Impact: {ev['impact']} | Forecast: {ev['forecast']} | Previous: {ev['previous']}"
        for ev in calendar[:20]
        if ev.get("impact", "").lower() in ("high", "medium")
    ) or "No high/medium-impact events found."

    prompt = (
        "You are a senior forex analyst writing a professional market report.\n\n"
        f"USER REQUEST: {question}\n\n"
        "## Latest News Headlines\n"
        f"{headlines}\n\n"
        "## Upcoming High/Medium-Impact Economic Events\n"
        f"{upcoming}\n\n"
        "Write a complete, professional **Forex Market Report** in Markdown including:\n"
        "- Executive Summary\n"
        "- Major Currency Pair Analysis (EUR/USD, GBP/USD, USD/JPY, etc.)\n"
        "- Market Sentiment & Risk Appetite\n"
        "- Key Economic Events to Watch\n"
        "- Trading Opportunities & Risks\n"
        "- Conclusion\n\n"
        "Use clear headings, bullet points, and be specific with levels where possible."
    )

    try:
        report = ask_ai(prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"report": report, "generated_at": __import__("datetime").datetime.utcnow().isoformat()}


# === ECONOMIC CALENDAR ===

@router.get("/calendar/")
def get_calendar(
    force_refresh: bool = False,
    impact: Optional[str] = None,
    country: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """Return this week's economic calendar events (ForexFactory)."""
    events = fetch_calendar(force=force_refresh)

    if impact:
        events = [e for e in events if e.get("impact", "").lower() == impact.lower()]
    if country:
        events = [e for e in events if e.get("country", "").upper() == country.upper()]

    return {"events": events, "total": len(events)}


# === FAVORITE BOOKMARKS ===

@router.get("/bookmarks/favorites/", response_model=list[FavoriteBookmarkResponse])
def list_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(FavoriteBookmark)
        .filter(FavoriteBookmark.owner_id == current_user.id)
        .order_by(FavoriteBookmark.sort_order)
        .all()
    )


@router.post("/bookmarks/favorites/", response_model=FavoriteBookmarkResponse)
def create_favorite(
    payload: FavoriteBookmarkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    max_order = (
        db.query(FavoriteBookmark)
        .filter(FavoriteBookmark.owner_id == current_user.id)
        .count()
    )
    bm = FavoriteBookmark(**payload.model_dump(), owner_id=current_user.id, sort_order=max_order)
    db.add(bm)
    db.commit()
    db.refresh(bm)
    return bm


@router.put("/bookmarks/favorites/{bm_id}", response_model=FavoriteBookmarkResponse)
def update_favorite(
    bm_id: int,
    payload: FavoriteBookmarkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bm = db.query(FavoriteBookmark).filter(
        FavoriteBookmark.id == bm_id, FavoriteBookmark.owner_id == current_user.id
    ).first()
    if not bm:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(bm, field, value)
    db.commit()
    db.refresh(bm)
    return bm


@router.delete("/bookmarks/favorites/{bm_id}")
def delete_favorite(
    bm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bm = db.query(FavoriteBookmark).filter(
        FavoriteBookmark.id == bm_id, FavoriteBookmark.owner_id == current_user.id
    ).first()
    if not bm:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    db.delete(bm)
    db.commit()
    return {"ok": True}


@router.put("/bookmarks/favorites/reorder/")
def reorder_favorites(
    payload: ReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for idx, bm_id in enumerate(payload.order):
        db.query(FavoriteBookmark).filter(
            FavoriteBookmark.id == bm_id, FavoriteBookmark.owner_id == current_user.id
        ).update({"sort_order": idx})
    db.commit()
    return {"ok": True}


# === READ LATER BOOKMARKS ===

def _purge_expired(db: Session, user_id: int):
    """Delete expired read-later bookmarks for a user."""
    db.query(ReadLaterBookmark).filter(
        ReadLaterBookmark.owner_id == user_id,
        ReadLaterBookmark.expires_at != None,
        ReadLaterBookmark.expires_at <= datetime.utcnow(),
    ).delete()
    db.commit()


@router.get("/bookmarks/read-later/", response_model=list[ReadLaterBookmarkResponse])
def list_read_later(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _purge_expired(db, current_user.id)
    return (
        db.query(ReadLaterBookmark)
        .filter(ReadLaterBookmark.owner_id == current_user.id)
        .order_by(ReadLaterBookmark.saved_at.desc())
        .all()
    )


@router.post("/bookmarks/read-later/", response_model=ReadLaterBookmarkResponse)
def create_read_later(
    payload: ReadLaterBookmarkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Avoid duplicates by URL
    existing = db.query(ReadLaterBookmark).filter(
        ReadLaterBookmark.owner_id == current_user.id,
        ReadLaterBookmark.url == payload.url,
    ).first()
    if existing:
        return existing

    expires_at = None
    if payload.expires_days is not None:
        expires_at = datetime.utcnow() + timedelta(days=payload.expires_days)

    data = payload.model_dump(exclude={"expires_days"})
    bm = ReadLaterBookmark(**data, owner_id=current_user.id, expires_at=expires_at)
    db.add(bm)
    db.commit()
    db.refresh(bm)
    return bm


@router.patch("/bookmarks/read-later/{bm_id}/expiry", response_model=ReadLaterBookmarkResponse)
def update_read_later_expiry(
    bm_id: int,
    payload: ReadLaterExpiryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bm = db.query(ReadLaterBookmark).filter(
        ReadLaterBookmark.id == bm_id, ReadLaterBookmark.owner_id == current_user.id
    ).first()
    if not bm:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    if payload.expires_days is None:
        bm.expires_at = None  # never expire
    else:
        bm.expires_at = datetime.utcnow() + timedelta(days=payload.expires_days)

    db.commit()
    db.refresh(bm)
    return bm


@router.delete("/bookmarks/read-later/{bm_id}")
def delete_read_later(
    bm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bm = db.query(ReadLaterBookmark).filter(
        ReadLaterBookmark.id == bm_id, ReadLaterBookmark.owner_id == current_user.id
    ).first()
    if not bm:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    db.delete(bm)
    db.commit()
    return {"ok": True}


@router.patch("/bookmarks/read-later/{bm_id}/pin", response_model=ReadLaterBookmarkResponse)
def toggle_pin_read_later(
    bm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bm = db.query(ReadLaterBookmark).filter(
        ReadLaterBookmark.id == bm_id, ReadLaterBookmark.owner_id == current_user.id
    ).first()
    if not bm:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    bm.pinned = not bm.pinned
    if bm.pinned:
        max_pin = db.query(ReadLaterBookmark).filter(
            ReadLaterBookmark.owner_id == current_user.id,
            ReadLaterBookmark.pinned == True,
        ).count()
        bm.pin_order = max_pin
    else:
        bm.pin_order = 0

    db.commit()
    db.refresh(bm)
    return bm


@router.put("/bookmarks/read-later/reorder/")
def reorder_pinned_read_later(
    payload: ReadLaterReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for idx, bm_id in enumerate(payload.order):
        db.query(ReadLaterBookmark).filter(
            ReadLaterBookmark.id == bm_id,
            ReadLaterBookmark.owner_id == current_user.id,
            ReadLaterBookmark.pinned == True,
        ).update({"pin_order": idx})
    db.commit()
    return {"ok": True}


# === INCLUDE ROUTER ===
app.include_router(router)
