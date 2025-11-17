#!/usr/bin/env python3
"""
Helper script to check if today is the last day of the month
Used by systemd timer to only run retraining on the last day
"""

import sys
from datetime import datetime, timedelta

def is_last_day_of_month():
    """Check if today is the last day of the current month"""
    today = datetime.now()
    # Get tomorrow
    tomorrow = today + timedelta(days=1)
    # If tomorrow is the 1st, then today is the last day
    return tomorrow.day == 1

if __name__ == '__main__':
    if is_last_day_of_month():
        print("Last day of month detected")
        sys.exit(0)
    else:
        print("Not the last day of month")
        sys.exit(1)

