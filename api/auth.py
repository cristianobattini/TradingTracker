from datetime import datetime, timedelta, timezone
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from models import User
from database import SessionLocal
from dotenv import load_dotenv

load_dotenv()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    # --- Password ---
    def verify_password(self, plain_password, hashed_password):
        return self.pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password):
        return self.pwd_context.hash(password)

    # --- Users ---
    def get_user(self, username: str):
        return self.db.query(User).filter(User.username == username).first()

    def authenticate_user(self, username: str, password: str):
        user = self.get_user(username)
        if not user or not self.verify_password(password, user.hashed_password):
            return None
        return user

    def create_access_token(self, data: dict, expires_delta: timedelta | None = None):
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))))
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, os.getenv("SECRET_KEY"), algorithm=os.getenv("ALGORITHM"))
        return encoded_jwt

    def get_current_user(self, token: str = Depends(oauth2_scheme)):
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, os.getenv("SECRET_KEY"), algorithms=[os.getenv("ALGORITHM")])
            username: str = payload.get("sub")
            if username is None:
                raise credentials_exception
        except InvalidTokenError:
            raise credentials_exception
        user = self.get_user(username)
        if user is None:
            raise credentials_exception
        return user

    def get_current_active_user(self, current_user: User = Depends(get_current_user)):
        if not current_user.valid:
            raise HTTPException(status_code=400, detail="Inactive user")
        return current_user

    def require_admin(self, current_user: User = Depends(get_current_active_user)):
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Not enough permissions")
        return current_user
