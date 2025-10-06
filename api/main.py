import uvicorn
from dotenv import load_dotenv
import os

# Carica le variabili d'ambiente
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL non trovata nel file .env o nelle variabili d'ambiente")

# Configurazione basata sull'ambiente
def get_uvicorn_config():
    environment = os.getenv("PROJECT_ENV", "development")
    host = os.getenv("BACKEND_HOST", "127.0.0.1")
    port = int(os.getenv("BACKEND_PORT", "8000"))
    
    if environment == "production":
        return {
            "host": host,
            "port": port,
            "reload": False,
            "workers": 2,
            "log_level": "info",
            "access_log": True
        }
    else:
        # Development
        return {
            "host": host,
            "port": port,
            "reload": True,
            "workers": 1,
            "log_level": "debug",
            "access_log": True
        }

if __name__ == "__main__":
    config = get_uvicorn_config()
    
    print(f"🚀 Starting server in {os.getenv('PROJECT_ENV', 'development')} mode")
    print(f"📍 Host: {config['host']}")
    print(f"🔌 Port: {config['port']}")
    print(f"🔄 Reload: {config['reload']}")
    print(f"👥 Workers: {config['workers']}")
    print(f"📝 Log Level: {config['log_level']}")
    
    uvicorn.run(
        "api:app", 
        host=config["host"],
        port=config["port"], 
        reload=config["reload"],
        log_level=config["log_level"],
        access_log=config["access_log"]
    )