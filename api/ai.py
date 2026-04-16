import os
import json
import requests

# ---------------------------------------------------------------------------
# OpenRouter configuration
# ---------------------------------------------------------------------------

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

FREE_MODELS = [
    {"id": "deepseek/deepseek-chat-v3-0324:free",      "name": "DeepSeek Chat V3 (Free)"},
    {"id": "meta-llama/llama-4-scout:free",            "name": "Meta Llama 4 Scout (Free)"},
    {"id": "meta-llama/llama-4-maverick:free",         "name": "Meta Llama 4 Maverick (Free)"},
    {"id": "google/gemma-3-27b-it:free",               "name": "Google Gemma 3 27B (Free)"},
    {"id": "google/gemma-2-9b-it:free",                "name": "Google Gemma 2 9B (Free)"},
    {"id": "mistralai/mistral-7b-instruct:free",       "name": "Mistral 7B Instruct (Free)"},
    {"id": "qwen/qwen3-8b:free",                       "name": "Qwen 3 8B (Free)"},
    {"id": "microsoft/phi-4-reasoning-plus:free",      "name": "Microsoft Phi-4 Reasoning+ (Free)"},
]

_current_model: str = os.environ.get("OPENROUTER_MODEL", "deepseek/deepseek-chat-v3-0324:free")


def get_model() -> str:
    return _current_model


def set_model(model_id: str) -> None:
    global _current_model
    valid_ids = {m["id"] for m in FREE_MODELS}
    if model_id not in valid_ids:
        raise ValueError(f"Unknown model: {model_id}")
    _current_model = model_id


def get_free_models() -> list[dict]:
    return FREE_MODELS


# ---------------------------------------------------------------------------
# Core call
# ---------------------------------------------------------------------------

def ask_ai(question: str, system: str = "You are a professional trader evaluating other traders work and giving alerts.") -> str:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY environment variable is not set.")

    payload = {
        "model": _current_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": question},
        ],
        "max_tokens": 2000,
    }

    resp = requests.post(
        OPENROUTER_BASE_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://tradingtracker.app",
            "X-Title": "TradingTracker",
        },
        json=payload,
        timeout=90,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


# ---------------------------------------------------------------------------
# Excel import helpers
# ---------------------------------------------------------------------------

def ai_map_columns(excel_columns: list[str], sample_rows: dict) -> dict:
    """
    Ask AI to map Excel columns to Trade model fields.
    Returns a dict: {excel_column: trade_field}
    """
    prompt = f"""
You are a professional trader and data analyst.

I have an Excel trading journal with inconsistent column names.
Your task is to map Excel columns to this Trade model:

Trade fields:
- date
- pair
- system
- action
- risk
- risk_percent
- lots
- entry
- sl1_pips
- tp1_pips
- sl2_pips
- tp2_pips
- cancelled
- profit_or_loss
- comments

Excel columns:
{excel_columns}

Sample data (first rows):
{json.dumps(sample_rows, indent=2)}

Rules:
- Return ONLY valid JSON
- Keys = Excel column names
- Values = Trade fields OR null if irrelevant
- Do NOT invent fields
"""
    raw = ask_ai(prompt)
    start = raw.find("{")
    end = raw.rfind("}") + 1
    return json.loads(raw[start:end])


import pandas as pd
from datetime import datetime
from models import Trade
from typing import List


TRADE_FIELDS = {
    "date", "pair", "system", "action", "risk", "risk_percent",
    "lots", "entry",
    "sl1_pips", "tp1_pips", "sl2_pips", "tp2_pips",
    "cancelled", "profit_or_loss", "comments",
    "instrument_name", "isin", "currency",
    "operation_type", "sign",
    "quantity",
    "exchange_rate", "gross_amount",
    "commission_fund", "commission_bank",
    "commission_sgr", "commission_admin"
}


def import_excel_ai(file_path: str, owner_id: int):
    df = pd.read_excel(file_path)
    df.columns = df.columns.astype(str)

    df = df.apply(
        lambda col: pd.to_datetime(col, errors="coerce")
        if "date" in col.name.lower()
        else col
    )

    df = df.apply(
        lambda col: col.dt.strftime("%Y-%m-%d")
        if pd.api.types.is_datetime64_any_dtype(col)
        else col
    )

    df = df.where(pd.notna(df), None)

    sample_rows = df.head(3).to_dict(orient="records")
    column_mapping = ai_map_columns(df.columns.tolist(), sample_rows)

    trades = []
    issues = []

    for idx, row in df.iterrows():
        data = {}
        missing_fields = []
        conversion_errors = []

        for field in TRADE_FIELDS:
            excel_cols = [
                col for col, mapped in column_mapping.items()
                if mapped == field
            ]

            if not excel_cols:
                missing_fields.append(field)
                continue

            excel_col = excel_cols[0]
            value = row.get(excel_col)

            if pd.isna(value):
                missing_fields.append(field)
                continue

            try:
                if field == "date":
                    if isinstance(value, str):
                        value = datetime.fromisoformat(value).date()
                    else:
                        value = value.date()
                elif field == "cancelled":
                    value = bool(value)
                else:
                    value = value
            except Exception:
                conversion_errors.append(field)
                continue

            data[field] = value

        trade = Trade(**data, owner_id=owner_id)
        trades.append(trade)

        if missing_fields or conversion_errors:
            issues.append({
                "row": idx + 2,
                "missing_fields": missing_fields,
                "conversion_errors": conversion_errors
            })

    return trades, issues
