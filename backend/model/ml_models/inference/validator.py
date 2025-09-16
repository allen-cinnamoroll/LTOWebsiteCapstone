"""
Data Validator for LTO Accident Prediction System
Validates input data before processing
"""

import pandas as pd
import numpy as np
from datetime import datetime
import re

class DataValidator:
    def __init__(self):
        """Initialize validator with validation rules"""
        self.validation_rules = {
            'accident_id': {
                'required': True,
                'pattern': r'^[A-Z]{3}-\d{4}-\d{3}$',
                'description': 'Format: XXX-YYYY-ZZZ'
            },
            'plateNo': {
                'required': True,
                'pattern': r'^[A-Z]{3}-\d{4}$',
                'description': 'Format: XXX-YYYY'
            },
            'accident_date': {
                'required': True,
                'type': 'datetime',
                'description': 'ISO 8601 datetime format'
            },
            'street': {
                'required': True,
                'min_length': 3,
                'max_length': 100,
                'description': 'Street name'
            },
            'barangay': {
                'required': True,
                'min_length': 2,
                'max_length': 50,
                'description': 'Barangay name'
            },
            'municipality': {
                'required': True,
                'min_length': 2,
                'max_length': 50,
                'description': 'Municipality name'
            },
            'vehicle_type': {
                'required': True,
                'allowed_values': ['car', 'motorcycle', 'truck', 'bus', 'van', 'jeepney', 'tricycle'],
                'description': 'Vehicle type'
            },
            'latitude': {
                'required': True,
                'type': 'float',
                'min_value': 6.0,
                'max_value': 8.0,
                'description': 'Latitude coordinate'
            },
            'longitude': {
                'required': True,
                'type': 'float',
                'min_value': 125.0,
                'max_value': 127.0,
                'description': 'Longitude coordinate'
            },
            'severity': {
                'required': False,
                'allowed_values': ['minor', 'moderate', 'severe'],
                'description': 'Accident severity (for training data)'
            },
            'notes': {
                'required': False,
                'max_length': 500,
                'description': 'Additional notes'
            }
        }
    
    def validate_single_record(self, record):
        """Validate a single accident record"""
        errors = []
        warnings = []
        
        # Check required fields
        for field, rules in self.validation_rules.items():
            if rules.get('required', False):
                if field not in record or record[field] is None or record[field] == '':
                    errors.append(f"Missing required field: {field}")
                    continue
            
            if field in record and record[field] is not None:
                field_errors, field_warnings = self._validate_field(field, record[field], rules)
                errors.extend(field_errors)
                warnings.extend(field_warnings)
        
        return {
            'is_valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings
        }
    
    def _validate_field(self, field_name, value, rules):
        """Validate a single field"""
        errors = []
        warnings = []
        
        # Type validation
        if 'type' in rules:
            if rules['type'] == 'datetime':
                try:
                    pd.to_datetime(value)
                except (ValueError, TypeError):
                    errors.append(f"Invalid datetime format for {field_name}: {value}")
            elif rules['type'] == 'float':
                try:
                    float(value)
                except (ValueError, TypeError):
                    errors.append(f"Invalid float value for {field_name}: {value}")
            elif rules['type'] == 'int':
                try:
                    int(value)
                except (ValueError, TypeError):
                    errors.append(f"Invalid integer value for {field_name}: {value}")
        
        # Pattern validation
        if 'pattern' in rules:
            if not re.match(rules['pattern'], str(value)):
                errors.append(f"Invalid format for {field_name}: {value}. Expected: {rules.get('description', '')}")
        
        # Allowed values validation
        if 'allowed_values' in rules:
            if str(value).lower() not in [v.lower() for v in rules['allowed_values']]:
                errors.append(f"Invalid value for {field_name}: {value}. Allowed values: {rules['allowed_values']}")
        
        # Length validation
        if 'min_length' in rules:
            if len(str(value)) < rules['min_length']:
                errors.append(f"{field_name} too short. Minimum length: {rules['min_length']}")
        
        if 'max_length' in rules:
            if len(str(value)) > rules['max_length']:
                errors.append(f"{field_name} too long. Maximum length: {rules['max_length']}")
        
        # Numeric range validation
        if 'min_value' in rules:
            try:
                if float(value) < rules['min_value']:
                    errors.append(f"{field_name} value too low. Minimum: {rules['min_value']}")
            except (ValueError, TypeError):
                pass  # Type error already handled above
        
        if 'max_value' in rules:
            try:
                if float(value) > rules['max_value']:
                    errors.append(f"{field_name} value too high. Maximum: {rules['max_value']}")
            except (ValueError, TypeError):
                pass  # Type error already handled above
        
        return errors, warnings
    
    def validate_batch(self, records):
        """Validate multiple records"""
        results = []
        
        for i, record in enumerate(records):
            validation_result = self.validate_single_record(record)
            validation_result['record_index'] = i
            validation_result['record_id'] = record.get('accident_id', f'record_{i}')
            results.append(validation_result)
        
        # Summary
        total_records = len(records)
        valid_records = sum(1 for r in results if r['is_valid'])
        invalid_records = total_records - valid_records
        
        return {
            'summary': {
                'total_records': total_records,
                'valid_records': valid_records,
                'invalid_records': invalid_records,
                'validation_rate': valid_records / total_records if total_records > 0 else 0
            },
            'results': results
        }
    
    def get_validation_schema(self):
        """Get validation schema for API documentation"""
        return {
            'fields': self.validation_rules,
            'example_record': {
                'accident_id': 'ACC-2024-001',
                'plateNo': 'ABC-1234',
                'accident_date': '2024-01-15T10:30:00.000Z',
                'street': 'Rizal Street',
                'barangay': 'Poblacion',
                'municipality': 'Mati',
                'vehicle_type': 'car',
                'latitude': 6.95,
                'longitude': 126.20,
                'severity': 'moderate',
                'notes': 'Sample accident record'
            }
        }
    
    def sanitize_record(self, record):
        """Sanitize and clean a record"""
        sanitized = {}
        
        for key, value in record.items():
            if value is not None:
                # Convert to string and strip whitespace
                sanitized[key] = str(value).strip()
                
                # Handle empty strings
                if sanitized[key] == '':
                    sanitized[key] = None
            else:
                sanitized[key] = None
        
        return sanitized

class ValidationService:
    """Service class for data validation"""
    
    def __init__(self):
        self.validator = DataValidator()
    
    def validate_for_prediction(self, record):
        """Validate record for prediction (severity not required)"""
        # Create a copy of validation rules without severity requirement
        prediction_rules = self.validator.validation_rules.copy()
        prediction_rules['severity']['required'] = False
        
        # Temporarily modify validator
        original_rules = self.validator.validation_rules
        self.validator.validation_rules = prediction_rules
        
        try:
            result = self.validator.validate_single_record(record)
            return result
        finally:
            # Restore original rules
            self.validator.validation_rules = original_rules
    
    def validate_for_training(self, record):
        """Validate record for training (all fields required)"""
        return self.validator.validate_single_record(record)
    
    def get_schema(self):
        """Get validation schema"""
        return self.validator.get_validation_schema()

if __name__ == "__main__":
    import sys
    import json
    import argparse
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='LTO Accident Data Validator')
    parser.add_argument('--validate', type=str, help='Validate input data as JSON string')
    parser.add_argument('--schema', action='store_true', help='Get validation schema')
    
    args = parser.parse_args()
    
    try:
        if args.schema:
            # Return validation schema
            validator = DataValidator()
            schema = validator.get_validation_schema()
            print(json.dumps(schema))
            
        elif args.validate:
            # Validation mode
            validator = DataValidator()
            record = json.loads(args.validate)
            result = validator.validate_single_record(record)
            print(json.dumps(result))
            
        else:
            # Test mode
            validator = DataValidator()
            
            # Test record
            test_record = {
                'accident_id': 'ACC-2024-001',
                'plateNo': 'ABC-1234',
                'accident_date': '2024-01-15T10:30:00.000Z',
                'street': 'Rizal Street',
                'barangay': 'Poblacion',
                'municipality': 'Mati',
                'vehicle_type': 'car',
                'latitude': 6.95,
                'longitude': 126.20,
                'severity': 'moderate',
                'notes': 'Test accident record'
            }
            
            # Validate record
            result = validator.validate_single_record(test_record)
            
            print("Validation Result:")
            print(f"Valid: {result['is_valid']}")
            if result['errors']:
                print(f"Errors: {result['errors']}")
            if result['warnings']:
                print(f"Warnings: {result['warnings']}")
            
            # Test invalid record
            invalid_record = {
                'accident_id': 'INVALID',
                'plateNo': '123',
                'accident_date': 'invalid-date',
                'vehicle_type': 'invalid_type',
                'latitude': 200.0,  # Out of range
                'longitude': 300.0  # Out of range
            }
            
            invalid_result = validator.validate_single_record(invalid_record)
            print(f"\nInvalid Record Validation:")
            print(f"Valid: {invalid_result['is_valid']}")
            print(f"Errors: {invalid_result['errors']}")
    
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)
