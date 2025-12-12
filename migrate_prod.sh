read -p "Enter migration message: " migrationMessage
PYTHONPATH=/home/localadmin/TradingTracker/api alembic revision --autogenerate -m $migrationMessage
