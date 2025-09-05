from sqlalchemy import create_engine
from auth import AuthService
from models import User, RoleEnum
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

engine = create_engine(os.getenv("DATABASE_URL"))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

db = SessionLocal()

auth_service = AuthService(db)

username = str(input("Insert the admin username* (required): "))
password = str(input("Insert the admin password (leave blank if it is an already existing user): "))
email = str(input("Insert the admin email (leave blank if it is an already existing user): "))
initial_capital = int(input("Insert the admin initial capital (leave blank if it is an already existing user): "))

if(username == ""):
    print("Username is required")
    exit()

if db.query(User).filter(User.username == username).first():
    print("Admin already exists")
else:
    if(password == ""):
        print("Password is required")
        exit()
    elif(email == ""):
        print("Email is required")
        exit()
    elif(initial_capital == 0):
        print("Initial capital is required")
        exit()
    hashed_pw = auth_service.get_password_hash(password)
    admin_user = User(
        username=username,
        email=email,
        hashed_password=hashed_pw,
        role=RoleEnum.admin,
        initial_capital=initial_capital
    )
    db.add(admin_user)
    db.commit()
    print("Admin user created")
db.close()
