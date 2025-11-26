"""
Daily Data Preprocessor for Vehicle Registration Data
Optimized version for daily SARIMA forecasting with exogenous variables
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import holidays
from config import DAVAO_ORIENTAL_MUNICIPALITIES

class DailyDataPreprocessor:
    """
    Preprocesses daily vehicle registration data for optimized SARIMA modeling.
    Handles missing days, creates exogenous variables, and prepares data for daily forecasting.
    """
    
    def __init__(self, csv_path):
        """
        Initialize the daily data preprocessor
        
        Args:
            csv_path: Path to the CSV file containing vehicle registration data
        """
        self.csv_path = csv_path
        self.davao_oriental_municipalities = DAVAO_ORIENTAL_MUNICIPALITIES
        # Philippine holidays for exogenous variable creation (national set)
        self.ph_holidays = holidays.Philippines()

        # Custom holiday calendar loaded from local CSV (holiday_data.csv), if available
        self.custom_holiday_dates = set()
        self.custom_holiday_categories = {}

        try:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            holiday_csv_path = os.path.join(base_dir, "holiday_data.csv")

            if os.path.exists(holiday_csv_path):
                # Try UTF-8 first, then fall back to a more permissive encoding
                try:
                    df_holidays = pd.read_csv(holiday_csv_path)
                except UnicodeDecodeError:
                    # Many Windows-edited CSVs use cp1252/latin-1; this keeps things simple
                    df_holidays = pd.read_csv(holiday_csv_path, encoding="latin1")

                if "date" in df_holidays.columns:
                    # Holiday CSV uses day/month/year (e.g., 01/07/2020 for July 1)
                    df_holidays["date_parsed"] = pd.to_datetime(
                        df_holidays["date"],
                        dayfirst=True,
                        errors="coerce"
                    )
                    df_holidays = df_holidays.dropna(subset=["date_parsed"])

                    # Normalize to midnight for safe comparison against DatetimeIndex.normalize()
                    df_holidays["date_parsed"] = df_holidays["date_parsed"].dt.normalize()

                    self.custom_holiday_dates = set(df_holidays["date_parsed"].tolist())

                    # Optionally keep categories for potential future use/analysis
                    if "category" in df_holidays.columns:
                        for _, row in df_holidays.iterrows():
                            self.custom_holiday_categories[row["date_parsed"]] = row["category"]

                    print(
                        f"Loaded {len(self.custom_holiday_dates)} custom holiday date(s) "
                        f"from holiday_data.csv"
                    )
                else:
                    print(
                        "Warning: holiday_data.csv found but has no 'date' column. "
                        "Custom holiday dates will not be used."
                    )
            else:
                # Not fatal; we just fall back to the built‑in PH holiday calendar
                print("holiday_data.csv not found – using built‑in Philippines holidays only.")
        except Exception as e:
            # Fail gracefully so training still works even if the holiday file is malformed
            print(f"Warning: Failed to load custom holiday_data.csv: {str(e)}")
            self.custom_holiday_dates = set()
            self.custom_holiday_categories = {}
    
    def load_and_process_daily_data(self, fill_missing_days=True, fill_method='forward', municipality=None):
        """
        Load CSV data and process it into daily time series format
        
        Args:
            fill_missing_days: If True, fill missing days with 0 or forward-fill
            fill_method: 'zero' to fill with 0, 'forward' to forward-fill last value
            municipality: Specific municipality name to filter by (None for all municipalities)
        
        Returns:
            tuple: (daily_data DataFrame with DateTime index, exogenous_vars DataFrame, processing_info dict)
        """
        csv_dir = os.path.dirname(self.csv_path)
        
        # Check if directory exists
        if not os.path.exists(csv_dir):
            raise FileNotFoundError(f"Directory not found: {csv_dir}")
        
        # Find all CSV files in the directory
        all_csv_files = [f for f in os.listdir(csv_dir) if f.endswith('.csv')]
        
        if not all_csv_files:
            raise FileNotFoundError(f"No CSV files found in: {csv_dir}")
        
        print(f"Found {len(all_csv_files)} CSV file(s) in directory: {csv_dir}")
        print(f"Files: {', '.join(all_csv_files)}")
        
        # Load and combine all CSV files
        dfs = []
        total_rows = 0
        
        for csv_file in all_csv_files:
            csv_path = os.path.join(csv_dir, csv_file)
            try:
                df_temp = pd.read_csv(csv_path)
                dfs.append(df_temp)
                total_rows += len(df_temp)
                print(f"  - Loaded {csv_file}: {len(df_temp)} rows")
            except Exception as e:
                print(f"  - Warning: Could not load {csv_file}: {str(e)}")
                continue
        
        if not dfs:
            raise ValueError("No valid CSV files could be loaded")
        
        # Combine all dataframes
        df = pd.concat(dfs, ignore_index=True)
        
        # Validate required columns
        required_columns = ['fileNo', 'dateOfRenewal', 'address_municipality']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValueError(
                f"CSV file is missing required columns: {', '.join(missing_columns)}. "
                f"Required columns are: {', '.join(required_columns)}. "
                f"Found columns: {', '.join(df.columns.tolist())}"
            )
        
        # Remove duplicates based on fileNo + dateOfRenewal
        duplicates_removed = 0
        if 'fileNo' in df.columns and 'dateOfRenewal' in df.columns:
            before_dedup = len(df)
            df = df.drop_duplicates(subset=['fileNo', 'dateOfRenewal'], keep='first')
            after_dedup = len(df)
            duplicates_removed = before_dedup - after_dedup
            if duplicates_removed > 0:
                print(f"  - Removed {duplicates_removed} duplicate rows using fileNo + dateOfRenewal")
        
        print(f"Combined total: {len(df)} rows from {len(all_csv_files)} CSV file(s)")
        
        # Filter for Davao Oriental municipalities
        df['municipality_upper'] = df['address_municipality'].str.upper().str.strip()
        davao_mask = df['municipality_upper'].isin(self.davao_oriental_municipalities)
        df_filtered = df[davao_mask].copy()
        
        # Filter by specific municipality if provided
        if municipality:
            municipality_upper = municipality.upper().strip()
            if municipality_upper not in self.davao_oriental_municipalities:
                raise ValueError(f"Municipality '{municipality}' not found in Davao Oriental. Available municipalities: {', '.join(self.davao_oriental_municipalities)}")
            df_filtered = df_filtered[df_filtered['municipality_upper'] == municipality_upper].copy()
            print(f"Filtered to {len(df_filtered)} rows from {municipality_upper}")
        else:
            print(f"Filtered to {len(df_filtered)} rows from Davao Oriental municipalities")
        
        if len(df_filtered) == 0:
            if municipality:
                raise ValueError(f"No data found for municipality '{municipality}'")
            else:
                raise ValueError("No data found for Davao Oriental municipalities")
        
        # Parse dateOfRenewal
        df_filtered['dateOfRenewal_parsed'] = pd.to_datetime(
            df_filtered['dateOfRenewal'],
            format='%m/%d/%Y',
            errors='coerce'
        )
        
        # Drop rows with invalid dates
        df_filtered = df_filtered.dropna(subset=['dateOfRenewal_parsed'])
        print(f"After date parsing: {len(df_filtered)} rows")
        
        # Sort by date
        df_filtered = df_filtered.sort_values('dateOfRenewal_parsed')
        
        # Aggregate by day (count registrations per day)
        daily_data = df_filtered.groupby('dateOfRenewal_parsed').agg({
            'plateNo': 'count'
        }).rename(columns={'plateNo': 'count'}).reset_index()
        
        daily_data = daily_data.sort_values('dateOfRenewal_parsed')
        
        print(f"Aggregated to {len(daily_data)} days with registrations")
        print(f"Date range: {daily_data['dateOfRenewal_parsed'].min()} to {daily_data['dateOfRenewal_parsed'].max()}")
        
        # Create complete date range from min to max date
        min_date = daily_data['dateOfRenewal_parsed'].min()
        max_date = daily_data['dateOfRenewal_parsed'].max()
        complete_date_range = pd.date_range(start=min_date, end=max_date, freq='D')
        
        # Set date as index
        daily_data = daily_data.set_index('dateOfRenewal_parsed')
        daily_data.index.name = 'date'
        
        # Reindex to include all days in the range
        daily_data = daily_data.reindex(complete_date_range)
        
        # Fill missing days
        if fill_missing_days:
            if fill_method == 'zero':
                daily_data['count'] = daily_data['count'].fillna(0)
                print(f"Filled {daily_data['count'].isna().sum()} missing days with 0")
            elif fill_method == 'forward':
                daily_data['count'] = daily_data['count'].ffill().fillna(0)
                print(f"Forward-filled missing days, then filled remaining with 0")
            else:
                raise ValueError(f"Unknown fill_method: {fill_method}. Use 'zero' or 'forward'")
        else:
            # Keep NaN for missing days (not recommended for SARIMA)
            print("Warning: Missing days not filled. SARIMA may have issues with NaN values.")
        
        # Ensure count is integer
        daily_data['count'] = daily_data['count'].astype(int)
        
        # Sort by date to ensure proper time series order
        daily_data = daily_data.sort_index()
        
        print(f"Final daily data: {len(daily_data)} days")
        print(f"Total registrations: {daily_data['count'].sum()}")
        print(f"Mean per day: {daily_data['count'].mean():.2f}")
        print(f"Days with zero registrations: {(daily_data['count'] == 0).sum()}")
        
        # Track actual min/max registration dates (not the filled date range)
        # This is critical for correct prediction start date
        actual_min_date = df_filtered['dateOfRenewal_parsed'].min()
        actual_max_date = df_filtered['dateOfRenewal_parsed'].max()
        
        print(f"Actual registration date range: {actual_min_date} to {actual_max_date}")
        
        # Create exogenous variables
        exogenous_vars = self._create_exogenous_variables(daily_data.index, df_filtered)
        
        # Prepare processing info
        processing_info = {
            'total_csv_files': len(all_csv_files),
            'csv_files': all_csv_files,
            'total_rows_before_dedup': total_rows,
            'duplicates_removed': duplicates_removed,
            'total_rows_after_dedup': len(df),
            'filtered_rows': len(df_filtered),
            'total_days': len(daily_data),
            'days_with_registrations': (daily_data['count'] > 0).sum(),
            'days_with_zero': (daily_data['count'] == 0).sum(),
            'total_registrations': int(daily_data['count'].sum()),
            'mean_per_day': float(daily_data['count'].mean()),
            'date_range': {
                'start': str(min_date),
                'end': str(max_date)
            },
            'actual_date_range': {
                'start': str(actual_min_date),
                'end': str(actual_max_date)
            },
            'fill_method': fill_method if fill_missing_days else None,
            'municipality': municipality.upper().strip() if municipality else None
        }
        
        return daily_data[['count']], exogenous_vars, processing_info
    
    def _create_exogenous_variables(self, date_index, raw_df=None):
        """
        Create exogenous variables for weekends and holidays
        
        Args:
            date_index: pandas DatetimeIndex
            
        Returns:
            DataFrame with exogenous variables
        """
        exog_data = pd.DataFrame(index=date_index)
        raw_df = raw_df.copy() if raw_df is not None else None

        # Normalize dates to midnight so comparisons against sets work reliably
        normalized_dates = date_index.normalize()
        
        # Weekend indicator (1 = Saturday or Sunday, 0 = weekday)
        exog_data['is_weekend'] = (normalized_dates.dayofweek >= 5).astype(int)

        # Holiday indicator from built‑in Philippines holiday library
        exog_data['is_holiday_library'] = normalized_dates.map(
            lambda x: x in self.ph_holidays
        ).astype(int)

        # Holiday indicator from custom holiday_data.csv (if loaded)
        if self.custom_holiday_dates:
            exog_data['is_custom_holiday'] = normalized_dates.isin(
                self.custom_holiday_dates
            ).astype(int)
        else:
            exog_data['is_custom_holiday'] = 0

        # Unified holiday flag: either library holiday or custom holiday
        exog_data['is_holiday'] = (
            (exog_data['is_holiday_library'] == 1) |
            (exog_data['is_custom_holiday'] == 1)
        ).astype(int)
        
        # Combined weekend/holiday indicator (1 = weekend or any holiday, 0 = otherwise)
        exog_data['is_weekend_or_holiday'] = (
            (exog_data['is_weekend'] == 1) |
            (exog_data['is_holiday'] == 1)
        ).astype(int)
        
        # Day of week (0=Monday, 6=Sunday) - can be useful for more granular patterns
        exog_data['day_of_week'] = date_index.dayofweek
        
        # Month (1-12) - calendar month
        exog_data['month'] = date_index.month

        # --- LTO-specific renewal schedule features ---
        # Default zeros in case raw_df or plateNo is missing
        exog_data['is_scheduled_month'] = 0
        exog_data['is_scheduled_week'] = 0

        if raw_df is not None and 'plateNo' in raw_df.columns:
            # Map plate -> (scheduled_month, scheduled_week)
            def get_schedule(plate):
                if not isinstance(plate, str) or not plate:
                    return None, None
                digits = ''.join(ch for ch in plate if ch.isdigit())
                if len(digits) < 2:
                    return None, None
                last = digits[-1]
                second_last = digits[-2]

                # Month mapping based on last digit
                month_map = {
                    '1': 1,  # Jan
                    '2': 2,  # Feb
                    '3': 3,  # Mar
                    '4': 4,  # Apr
                    '5': 5,  # May
                    '6': 6,  # Jun
                    '7': 7,  # Jul
                    '8': 8,  # Aug
                    '9': 9,  # Sep
                    '0': 10, # Oct
                }
                sched_month = month_map.get(last)

                # Week mapping based on second-to-last digit
                if second_last in ('1', '2', '3'):
                    sched_week = 1
                elif second_last in ('4', '5', '6'):
                    sched_week = 2
                elif second_last in ('7', '8'):
                    sched_week = 3
                elif second_last in ('9', '0'):
                    sched_week = 4
                else:
                    sched_week = None

                return sched_month, sched_week

            # Compute scheduled month/week for each original registration row
            schedule_info = raw_df[['dateOfRenewal_parsed', 'plateNo']].copy()
            schedule_info['scheduled_month'], schedule_info['scheduled_week'] = zip(
                *schedule_info['plateNo'].map(get_schedule)
            )

            # Keep only rows where schedule is defined
            schedule_info = schedule_info.dropna(subset=['scheduled_month', 'scheduled_week'])

            if not schedule_info.empty:
                # Derive calendar month and week-of-month for each actual renewal date
                schedule_info['calendar_month'] = schedule_info['dateOfRenewal_parsed'].dt.month
                # Week of month: 1–5 based on day of month
                schedule_info['week_of_month'] = ((schedule_info['dateOfRenewal_parsed'].dt.day - 1) // 7) + 1

                # Flag whether the actual renewal falls in its scheduled month/week
                schedule_info['is_scheduled_month'] = (
                    schedule_info['calendar_month'] == schedule_info['scheduled_month']
                ).astype(int)
                schedule_info['is_scheduled_week'] = (
                    (schedule_info['calendar_month'] == schedule_info['scheduled_month']) &
                    (schedule_info['week_of_month'] == schedule_info['scheduled_week'])
                ).astype(int)

                # Aggregate to daily level to match exog_data index
                daily_sched = schedule_info.groupby('dateOfRenewal_parsed').agg({
                    'is_scheduled_month': 'max',
                    'is_scheduled_week': 'max',
                }).rename_axis('date')

                # Align with full date_index
                daily_sched = daily_sched.reindex(date_index.normalize(), fill_value=0)

                exog_data['is_scheduled_month'] = daily_sched['is_scheduled_month'].values
                exog_data['is_scheduled_week'] = daily_sched['is_scheduled_week'].values
        
        print(f"Created exogenous variables:")
        print(f"  - Weekends: {exog_data['is_weekend'].sum()} days")
        print(f"  - Holidays: {exog_data['is_holiday'].sum()} days")
        print(f"  - Weekend/Holiday: {exog_data['is_weekend_or_holiday'].sum()} days")
        
        return exog_data
    
    def get_data_info(self, processed_data):
        """
        Get information about the processed daily data
        
        Args:
            processed_data: Processed DataFrame with daily counts
            
        Returns:
            Dictionary with data statistics
        """
        return {
            'total_days': len(processed_data),
            'date_range': {
                'start': str(processed_data.index.min()),
                'end': str(processed_data.index.max())
            },
            'total_registrations': int(processed_data['count'].sum()),
            'mean_daily_registrations': float(processed_data['count'].mean()),
            'median_daily_registrations': float(processed_data['count'].median()),
            'std_daily_registrations': float(processed_data['count'].std()),
            'min_daily_registrations': int(processed_data['count'].min()),
            'max_daily_registrations': int(processed_data['count'].max()),
            'days_with_zero': int((processed_data['count'] == 0).sum()),
            'days_with_registrations': int((processed_data['count'] > 0).sum())
        }

