# Multi-Currency Position Calculation Guide

## Overview

Il sistema di tracking dei trade supporta ora il calcolo delle posizioni considerando la valuta del conto del trader. Tutti i profitti/perdite vengono automaticamente convertiti nella valuta del conto per un'analisi coerente.

## Features

### 1. Account Currency (Valuta del Conto)
Ogni utente ha una valuta di conto definita (default: USD):
- Impostabile nel profilo utente
- Tutte le metriche di report vengono calcolate in questa valuta
- I tassi di cambio vengono applicati automaticamente

### 2. Multi-Currency Trades
I trade possono essere in qualsiasi valuta:
- **Forex Pairs** (EUR/USD, GBP/JPY, etc.)
  - Currency estratta automaticamente dal pair
  - `exchange_rate` nella table trades
  
- **Stocks/Bonds** (instrument_name, ISIN)
  - Valuta specificata nel campo `currency`
  - Exchange rate utilizzato per conversione

- **Default**
  - Profit/Loss assumunto in account currency

### 3. Exchange Rates
I tassi di cambio supportati (in `position_calculator.py`):
```
USD: 1.0   (base currency)
EUR: 1.10
GBP: 1.27
JPY: 0.0067
CHF: 1.12
CAD: 0.74
AUD: 0.67
NZD: 0.61
CNY: 0.14
INR: 0.012
```

**Nota**: In produzione, integrare un'API di tassi di cambio live (es. Alpha Vantage, IEX Cloud, European Central Bank).

---

## Database Schema

### Migrazione Alembic
File: `alembic/versions/add_account_currency.py`

```sql
ALTER TABLE users ADD COLUMN account_currency VARCHAR DEFAULT 'USD';
```

### User Model Update
```python
class User(Base):
    ...
    account_currency = Column(String, default="USD")
    ...
```

---

## API Endpoints

### 1. GET /api/report/
Calcola il report di trading con conversione multi-valuta.

**Esempio Response:**
```json
{
  "total_profit": 1500.50,
  "total_loss": -300.25,
  "win_probability": 75.0,
  "loss_probability": 25.0,
  "avg_win": 250.08,
  "avg_loss": -150.12,
  "expectancy": 175.09,
  "capital": 11200.50,
  "account_currency": "USD",
  "total_pnl": 1200.25,
  "num_trades": 24
}
```

**Come funziona:**
1. Recupera tutti i trade dell'utente
2. Per ogni trade:
   - Se ha una valuta specifica, converte da quella valuta alla valuta del conto
   - Se è un forex pair (EUR/USD), estrae la quote currency e converte
   - Altrimenti assume che P&L sia già nella valuta del conto
3. Aggrega i valori convertiti
4. Calcola le metriche (probabilità, medie, aspettativa)
5. Restituisce tutto con `account_currency` per riferimento

### 2. GET /api/report/positions-by-currency
Mostra le posizioni raggruppate per valuta.

**Esempio Response:**
```json
{
  "account_currency": "USD",
  "total_pnl": 2500.75,
  "positions_by_currency": {
    "EUR": {
      "trades": [
        {
          "trade_id": 1,
          "pair": "EUR/USD",
          "pnl_original": 100.0,
          "currency": "EUR",
          "pnl_in_account": 110.0
        }
      ],
      "total": 550.0,
      "count": 5
    },
    "GBP": {
      "trades": [...],
      "total": 1950.75,
      "count": 3
    }
  }
}
```

### 3. PUT /api/users/me
Aggiorna il profilo dell'utente inclusa la valuta del conto.

**Payload:**
```json
{
  "username": "trader123",
  "email": "trader@example.com",
  "initial_capital": 10000.0,
  "account_currency": "EUR"
}
```

---

## Position Calculator Service

File: `api/position_calculator.py`

### Classi e Metodi

#### `PositionCalculator.get_exchange_rate(from_currency, to_currency)`
```python
# Esempio
rate = PositionCalculator.get_exchange_rate("EUR", "USD")
# Restituisce: 1.1 (EUR 1 = USD 1.1)
```

#### `PositionCalculator.convert_amount(amount, from_currency, to_currency)`
```python
# Esempio
usd_value = PositionCalculator.convert_amount(1000, "EUR", "USD")
# 1000 EUR → 1100 USD
```

#### `PositionCalculator.calculate_position_value(trade, account_currency)`
Calcola il valore di una singola posizione nella valuta del conto.

```python
# Esempio
trade = Trade(...)
trade.currency = "EUR"
trade.profit_or_loss = 500.0

value, currency = PositionCalculator.calculate_position_value(
    trade, 
    account_currency="USD"
)
# Restituisce: (550.0, "EUR")  - P&L convertito in USD
```

#### `PositionCalculator.calculate_report(db, current_user)`
Calcola il report completo con tutti i trade convertiti.

```python
report = PositionCalculator.calculate_report(db, current_user)
# {
#   'total_profit': 1500.0,
#   'total_loss': -300.0,
#   'account_currency': 'USD',
#   ...
# }
```

#### `PositionCalculator.get_position_summary(db, current_user)`
Riassunto posizioni per valuta.

---

## Esempi di Utilizzo

### Scenario 1: Trader con conto in USD
```python
user = User(
    username="john_trader",
    initial_capital=10000.0,
    account_currency="USD"  # Conto in USD
)

# Trade in EUR
trade1 = Trade(
    pair="EUR/USD",
    profit_or_loss=100.0,  # 100 EUR di profitto
    currency="EUR",
    exchange_rate=1.10
)

# Calcolo:
# 100 EUR * 1.10 = 110 USD (convertito nel report)

# Trade in USD
trade2 = Trade(
    pair="GBP/USD",
    profit_or_loss=200.0,  # 200 USD di profitto
    currency="USD"  # Già in USD, nessuna conversione
)

# Report mostra:
# total_profit = 110 + 200 = 310 USD
# account_currency = "USD"
```

### Scenario 2: Trader con conto in EUR
```python
user = User(
    username="maria_trader",
    initial_capital=5000.0,
    account_currency="EUR"  # Conto in EUR
)

# Trade in USD
trade = Trade(
    pair="SPX500",
    profit_or_loss=300.0,  # 300 USD di profitto
    currency="USD"
)

# Calcolo:
# 300 USD / 1.10 ≈ 272.73 EUR (convertito per account EUR)

# Report mostra:
# total_profit = 272.73 EUR
# account_currency = "EUR"
```

---

## Integrazione Frontend

### Update UserResponse nel frontend
```typescript
interface User {
  id: number;
  username: string;
  email: string;
  initial_capital: number;
  account_currency: string;  // ← Nuovo
  avatar: string;
  // ...
}
```

### Aggiornare il profilo con nuova valuta
```typescript
const updateProfile = async (accountCurrency: string) => {
  await fetch('/api/users/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_currency: accountCurrency })
  });
};
```

### Mostrare report con valuta
```typescript
const report = await fetch('/api/report/').then(r => r.json());

console.log(`
  Total Profit: ${report.total_profit} ${report.account_currency}
  Capital: ${report.capital} ${report.account_currency}
`);
```

---

## Deployment

### Fase 1: Database Migration
```bash
alembic upgrade head
```

### Fase 2: Restart API
```bash
python main.py
# oppure
gunicorn -w 4 -b 0.0.0.0:8000 main:app
```

### Fase 3: Frontend Rebuild
```bash
cd ui
npm run build
npm run deploy
```

---

## Future Enhancements

### 1. Live Exchange Rates
Integrare un'API per tassi di cambio real-time:
```python
import requests

def get_live_exchange_rate(from_curr, to_curr):
    url = f"https://api.example.com/rates/{from_curr}/{to_curr}"
    response = requests.get(url)
    return response.json()['rate']
```

### 2. Historical Rates
Tracciare il tasso di cambio al momento del trade:
```python
class Trade(Base):
    ...
    trade_exchange_rate = Column(Float)  # Rate al momento del trade
    trade_date = Column(Date)            # Data del trade
```

### 3. Multi-Account Support
Permettere a un trader di avere più conti in valute diverse:
```python
class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    currency = Column(String)
    initial_capital = Column(Float)
    trades = relationship("Trade", back_populates="account")
```

### 4. Currency Conversion API
Esporre un endpoint pubblico per conversioni:
```
GET /api/convert?amount=100&from=EUR&to=USD
Response: { "amount": 110, "rate": 1.10 }
```

---

## Testing

### Unit Test: Conversione valuta
```python
def test_exchange_rate():
    rate = PositionCalculator.get_exchange_rate("EUR", "USD")
    assert rate == pytest.approx(1.10, rel=0.01)

def test_convert_amount():
    usd = PositionCalculator.convert_amount(100, "EUR", "USD")
    assert usd == pytest.approx(110.0, rel=0.01)
```

### Integration Test: Report multi-valuta
```python
def test_report_with_multi_currency(db, user, trades_eur_usd):
    user.account_currency = "USD"
    report = PositionCalculator.calculate_report(db, user)
    
    assert report['account_currency'] == "USD"
    assert report['total_profit'] > 0
    # All values in USD
```

---

## Troubleshooting

### Problema: Tassi di cambio non corretti
**Soluzione:** Aggiornare la tabella `EXCHANGE_RATES` in `position_calculator.py` con valori correnti.

### Problema: Valuta del conto non salvata
**Soluzione:** Verificare che la migrazione Alembic sia stata eseguita:
```bash
alembic current
alembic history
```

### Problema: P&L non convertiti
**Soluzione:** Verificare che il campo `currency` del Trade sia compilato correttamente.

---

## References

- ECB Exchange Rates: https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
- Alpha Vantage API: https://www.alphavantage.co/
- IEX Cloud API: https://iexcloud.io/
- Open Exchange Rates: https://openexchangerates.org/

---

Version: 1.0.0
Last Updated: April 13, 2026
