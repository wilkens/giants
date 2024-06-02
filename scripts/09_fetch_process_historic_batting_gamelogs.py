#!/usr/bin/env python
# coding: utf-8

"""
SF Giants cumulative batting statistics by season, 1958-2024
This script visusalizes fetches and processes current and past game-by-game and cumulative totals for hits, doubles, home runs, walks, strikeouts and other statistics using data from [Baseball Reference](https://www.baseball-reference.com/teams/tgl.cgi?team=SFG&t=b&year=2024).
"""

import os
import boto3
import datetime
import logging
import pandas as pd
from io import BytesIO

# Set up basic configuration for logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Determine if running in a GitHub Actions environment
is_github_actions = os.getenv('GITHUB_ACTIONS') == 'true'

# AWS credentials and session initialization
aws_key_id = os.environ.get("AWS_ACCESS_KEY_ID")
aws_secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
aws_region = "us-east-1"

# Conditional AWS session creation based on the environment
if is_github_actions:
    # In GitHub Actions, use environment variables directly
    session = boto3.Session(
        aws_access_key_id=aws_key_id,
        aws_secret_access_key=aws_secret_key,
        region_name=aws_region
    )
else:
    # Locally, use a specific profile
    session = boto3.Session(profile_name="mattwilkens", region_name=aws_region)

s3_resource = session.resource("s3")

# Base directory settings
base_dir = os.getcwd()
data_dir = os.path.join(base_dir, 'data', 'batting')
# os.makedirs(data_dir, exist_ok=True)

profile_name = os.environ.get("AWS_PERSONAL_PROFILE")
today = datetime.date.today()
year = today.year

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
}

# Fetch Archive game logs
archive_url = "http://giantsdata.s3.amazonaws.com/giants/data/batting/archive/giants_team_cumulative_batting_logs_1958_2023.parquet"
archive_df = pd.read_parquet(archive_url)

# Fetch Current game logs
current_url = f"https://www.baseball-reference.com/teams/tgl.cgi?team=SFG&t=b&year={year}"
current_df = pd.read_html(current_url)[0].assign(year=year).query('HR != "HR"')
current_df.columns = current_df.columns.str.lower()

# Process current game logs
current_df["game_date"] = pd.to_datetime(
    current_df["date"] + " " + current_df["year"].astype(str),
    format="%b %d %Y",
    errors="coerce"
).dt.strftime("%Y-%m-%d")

# Drop unnecessary columns
drop_cols = [
    "rk", "date", "unnamed: 3", "opp", "rslt", "ba", "obp", "slg", "ops", "lob", "#", "thr", "opp. starter (gmesc)"
]
current_df = current_df.drop(drop_cols, axis=1).copy()

# Define value columns
val_cols = [
    "gtm", "pa", "ab", "r", "h", "2b", "3b", "hr", "rbi", "bb", "ibb", "so", "hbp", "sh", "sf", "roe", "gdp", "sb", "cs"
]

# Convert value columns to integers
current_df[val_cols] = current_df[val_cols].astype(int)

# Calculate cumulative columns
for col in val_cols:
    current_df[f"{col}_cum"] = current_df.groupby("year")[col].cumsum()
current_df = current_df.drop("gtm_cum", axis=1)

# Combine current and archive data
df = (
    pd.concat([current_df, archive_df])
    .sort_values(["year", "gtm"], ascending=[False, True])
    .reset_index(drop=True)
    .drop_duplicates()
)

# Optimize DataFrame for output
optimized_df = df[
    ["gtm", "year", "r_cum", "h_cum", "2b_cum", "bb_cum", "so_cum", "hr_cum"]
].copy()

# Function to save DataFrame to local files
def save_dataframe(df, path_without_extension, formats):
    for file_format in formats:
        try:
            full_path = f"{path_without_extension}.{file_format}"
            if file_format == "csv":
                df.to_csv(full_path, index=False)
            elif file_format == "json":
                df.to_json(full_path, indent=4, orient="records", lines=False)
            elif file_format == "parquet":
                df.to_parquet(full_path, index=False)
            logging.info(f"Saved {file_format} format to {full_path}")
        except Exception as e:
            logging.error(f"Failed to save {file_format}: {e}")

# Function to save DataFrame to S3
def save_to_s3(df, base_path, s3_bucket, formats):
    for fmt in formats:
        try:
            buffer = BytesIO()
            if fmt == "csv":
                df.to_csv(buffer, index=False)
                content_type = "text/csv"
            elif fmt == "json":
                df.to_json(buffer, indent=4, orient="records", lines=False)
                content_type = "application/json"
            elif fmt == "parquet":
                df.to_parquet(buffer, index=False)
                content_type = "application/octet-stream"
            buffer.seek(0)
            s3_resource.Bucket(s3_bucket).put_object(Key=f"{base_path}.{fmt}", Body=buffer, ContentType=content_type)
            logging.info(f"Uploaded {fmt} to {s3_bucket}/{base_path}.{fmt}")
        except Exception as e:
            logging.error(f"Failed to upload {fmt} to S3: {e}")

# Saving files locally and to S3
file_path = os.path.join(data_dir, 'giants_historic_batting_gamelogs')
formats = ["csv", "json", "parquet"]
# save_dataframe(optimized_df, file_path, formats)
save_to_s3(optimized_df, "giants/data/batting/archive/giants_historic_batting_gamelogs", "giantsdata", formats)