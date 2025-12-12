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
