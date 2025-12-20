import os
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential

endpoint = "https://models.github.ai/inference"
model = "deepseek/DeepSeek-V3-0324"
token = os.environ["GITHUB_TOKEN"]
if not token:
    raise ValueError("GITHUB_TOKEN environment variable is not set.")

client = ChatCompletionsClient(
    endpoint=endpoint,
    credential=AzureKeyCredential(token),
)

def ask_ai(question: str):
    response = client.complete(
        messages=[
            SystemMessage("You are a professional trader evaluating other traders work and givig alerts."),
            UserMessage(question),
        ],
        temperature=1.0,
        top_p=1.0,
        max_tokens=1000,
        model=model
    )

    return response.choices[0].message.content 

# === EXCEL ===
import json

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

    # Extract JSON safely
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

    sample_rows = df.head(3).to_dict(orient="records")
    column_mapping = ai_map_columns(df.columns.tolist(), sample_rows)

    trades = []
    issues = []

    for idx, row in df.iterrows():
        data = {}
        missing_fields = []
        conversion_errors = []

        for field in TRADE_FIELDS:
            # find excel column mapped to this field
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

