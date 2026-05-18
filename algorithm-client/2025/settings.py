import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[2]
env_file = ROOT_DIR / ".env.local"

if not env_file.exists():
    raise FileNotFoundError(f".env.local not found: {env_file}")

load_dotenv(env_file)

def get_env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None:
        raise ValueError(f"{name} not found in environment")
    return value

TOKEN = get_env("TOKEN")
WS_URL = get_env("WS_URL", "ws://localhost:7071")
