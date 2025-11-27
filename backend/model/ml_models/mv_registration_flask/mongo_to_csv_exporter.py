import os
from datetime import datetime

import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv

from config import DAVAO_ORIENTAL_MUNICIPALITIES

# Load environment variables from .env file
# Try multiple locations: current directory, backend directory, and parent directories
base_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(base_dir, '../../..')  # Go up to backend directory
project_root = os.path.join(backend_dir, '..')

# Try loading .env from multiple locations
for env_path in [
    os.path.join(backend_dir, '.env'),  # backend/.env
    os.path.join(project_root, '.env'),  # project root/.env
    os.path.join(base_dir, '.env'),      # current directory/.env
]:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break
else:
    # Try loading from backend directory even if file doesn't exist (dotenv will just skip)
    load_dotenv(os.path.join(backend_dir, '.env'))


def get_mongo_client():
    """
    Create a MongoDB client using the same connection string as the Node backend.

    Expects the DATABASE environment variable to be set (same as in Node .env).
    Example: DATABASE=mongodb://user:pass@host:27017/lto_db
    """
    mongo_uri = os.getenv("DATABASE")
    if not mongo_uri:
        raise RuntimeError(
            "DATABASE environment variable is not set. "
            "Please export the same MongoDB connection string used by the Node backend "
            "before running Mongo-based SARIMA retraining."
        )

    return MongoClient(mongo_uri)


def get_database(client):
    """
    Infer the database name from the connection string, or fall back to the
    default database in the URI.
    """
    # pymongo's get_default_database works when a database is specified in the URI
    db = client.get_default_database()
    if db is not None:
        return db

    # Fallback: try to parse the DB name from the URI manually (best‑effort)
    mongo_uri = os.getenv("DATABASE")
    if not mongo_uri:
        raise RuntimeError("DATABASE environment variable is not set.")

    # Strip query string
    uri_no_params = mongo_uri.split("?", 1)[0]
    # Take part after last slash
    parts = uri_no_params.rsplit("/", 1)
    if len(parts) == 2 and parts[1]:
        db_name = parts[1]
        return client[db_name]

    raise RuntimeError(
        "Could not determine MongoDB database name from DATABASE URI. "
        "Ensure the URI includes the database name, e.g. "
        "'mongodb://user:pass@host:27017/lto_db'."
    )


def export_mongo_to_csv(output_dir: str, filename: str = "DAVOR_data.csv") -> str:
    """
    Export vehicle registration data from MongoDB into a CSV file that matches
    the expected structure for SARIMA training.

    The CSV will contain at least:
    - fileNo
    - plateNo
    - dateOfRenewal  (MM/DD/YYYY string)
    - address_municipality

    It will:
    - Join Vehicles with Owners to fetch municipality
    - Unwind all dateOfRenewal entries
    - Filter to Davao Oriental municipalities
    - Drop duplicates based on (fileNo, dateOfRenewal)

    Returns:
        Full path to the generated CSV file.
    """
    os.makedirs(output_dir, exist_ok=True)

    client = get_mongo_client()
    db = get_database(client)

    vehicles_col = db["vehicles"]

    pipeline = [
        # Only keep documents that actually have renewal dates
        {"$match": {"dateOfRenewal": {"$exists": True, "$ne": []}}},
        # One row per renewal date
        {"$unwind": "$dateOfRenewal"},
        # Join with owners collection to get municipality
        {
            "$lookup": {
                "from": "owners",
                "localField": "ownerId",
                "foreignField": "_id",
                "as": "owner",
            }
        },
        {"$unwind": "$owner"},
        # Project the fields we need
        {
            "$project": {
                "_id": 0,
                "fileNo": 1,
                "plateNo": 1,
                "dateOfRenewal": "$dateOfRenewal.date",
                "address_municipality": "$owner.address.municipality",
            }
        },
    ]

    records = list(vehicles_col.aggregate(pipeline))
    if not records:
        raise RuntimeError(
            "No registration records found in MongoDB with dateOfRenewal and owner municipality."
        )

    df = pd.DataFrame(records)

    # Drop rows with missing critical fields
    df = df.dropna(subset=["fileNo", "dateOfRenewal", "address_municipality", "plateNo"])

    # Normalize municipality names to match config and filter to Davao Oriental
    df["municipality_upper"] = (
        df["address_municipality"].astype(str).str.upper().str.strip()
    )
    allowed = set(DAVAO_ORIENTAL_MUNICIPALITIES)
    df = df[df["municipality_upper"].isin(allowed)].copy()

    if df.empty:
        raise RuntimeError(
            "After filtering, no data remains for Davao Oriental municipalities. "
            "Check that owner.address.municipality is populated correctly in MongoDB."
        )

    # Format dateOfRenewal as MM/DD/YYYY strings
    df["dateOfRenewal"] = pd.to_datetime(df["dateOfRenewal"]).dt.strftime("%m/%d/%Y")

    # Drop duplicates based on (fileNo, dateOfRenewal) to avoid double‑counting
    before = len(df)
    df = df.drop_duplicates(subset=["fileNo", "dateOfRenewal"])
    removed = before - len(df)

    # Keep only expected columns
    df_out = df[["fileNo", "dateOfRenewal", "address_municipality", "plateNo"]].copy()

    output_path = os.path.join(output_dir, filename)
    df_out.to_csv(output_path, index=False)

    print(
        f"[Mongo Export] Wrote {len(df_out)} rows to {output_path} "
        f"(removed {removed} duplicate fileNo+dateOfRenewal pairs)"
    )

    return output_path


if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "../mv registration training")
    path = export_mongo_to_csv(data_dir)
    print(f"Export complete: {path}")


