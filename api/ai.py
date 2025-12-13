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


def import_excel_ai(file_path: str, owner_id: int) -> List[Trade]:
    df = pd.read_excel(file_path)

    # Convert columns to strings
    df.columns = df.columns.astype(str)

    # Send sample rows to AI
    sample_rows = df.head(3).to_dict(orient="records")

    column_mapping = ai_map_columns(
        excel_columns=df.columns.tolist(),
        sample_rows=sample_rows
    )

    trades: List[Trade] = []

    for _, row in df.iterrows():
        data = {}

        for excel_col, model_col in column_mapping.items():
            if model_col is None:
                continue

            value = row.get(excel_col)

            if pd.isna(value):
                continue

            data[model_col] = value

        # Type normalization
        if "date" in data:
            if isinstance(data["date"], str):
                data["date"] = datetime.fromisoformat(data["date"]).date()
            else:
                data["date"] = data["date"].date()

        if "cancelled" in data:
            data["cancelled"] = bool(data["cancelled"])

        trade = Trade(
            **data,
            owner_id=owner_id
        )

        trades.append(trade)

    return trades
