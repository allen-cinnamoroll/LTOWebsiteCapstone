"""
Configuration file for SARIMA prediction API
"""

# Feature Flags
ENABLE_PER_MUNICIPALITY = True  # Enable per-municipality predictions

# Minimum data requirements for per-municipality models
MIN_WEEKS_FOR_MUNICIPALITY_MODEL = 12  # Minimum weeks with registrations needed
MIN_AVG_REGISTRATIONS_PER_WEEK = 10    # Minimum average registrations per week

# Municipality list
DAVAO_ORIENTAL_MUNICIPALITIES = [
    'BAGANGA', 'BANAYBANAY', 'BOSTON', 'CARAGA', 'CATEEL',
    'GOVERNOR GENEROSO', 'LUPON', 'MANAY', 'SAN ISIDRO',
    'TARRAGONA', 'CITY OF MATI'
]


