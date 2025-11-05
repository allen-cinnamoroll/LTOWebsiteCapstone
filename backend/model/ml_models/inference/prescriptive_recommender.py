"""
Prescriptive Analytics Recommender
Provides actionable recommendations based on ML predictions and location analysis
"""

import pandas as pd
import numpy as np
import yaml
import os
from datetime import datetime
from collections import defaultdict

class PrescriptiveRecommender:
    def __init__(self, config_path):
        """Initialize recommender with configuration"""
        with open(config_path, 'r') as file:
            self.config = yaml.safe_load(file)
        
        self.prescriptive_actions = self.config['rule_system']['prescriptive_actions']
        self.resource_allocation = self.config['rule_system']['resource_allocation']
        self.outreach_strategy = self.config['rule_system']['outreach_strategy']
    
    def get_recommendations(self, prediction_data, location_data, temporal_data):
        """
        Generate comprehensive recommendations based on predictions
        
        Args:
            prediction_data: {
                'offense_type': 'Crimes Against Persons',
                'confidence': 0.78,
                'risk_level': 'high'
            }
            location_data: {
                'municipality': 'Mati',
                'barangay': 'Central',
                'location_type': 'urban_areas',
                'lat': 6.95,
                'lng': 126.20
            }
            temporal_data: {
                'hour': 18,
                'day_of_week': 5,  # Friday
                'is_rush_hour': True
            }
        
        Returns:
            Comprehensive recommendation dictionary
        """
        recommendations = {
            'immediate_actions': [],
            'short_term_strategies': [],
            'long_term_initiatives': [],
            'resource_deployment': {},
            'outreach_campaigns': [],
            'expected_impact': {}
        }
        
        # 1. Get offense-type specific recommendations
        offense_type = prediction_data.get('offense_type', '')
        risk_level = prediction_data.get('risk_level', 'medium')
        
        if offense_type == 'Crimes Against Persons':
            if risk_level == 'high':
                actions = self.prescriptive_actions['high_risk_persons']
                recommendations['immediate_actions'].extend(actions['enforcement'])
                recommendations['short_term_strategies'].extend(actions['infrastructure'])
                recommendations['long_term_initiatives'].extend(actions['public_outreach'])
                recommendations['medical_response'] = actions['medical_response']
        elif offense_type == 'Crimes Against Property':
            actions = self.prescriptive_actions['low_risk_property']
            recommendations['immediate_actions'].extend(actions['enforcement'])
            recommendations['short_term_strategies'].extend(actions['infrastructure'])
        
        # 2. Add location-specific recommendations
        location_type = location_data.get('location_type', 'urban_areas')
        if location_type in self.prescriptive_actions:
            recommendations['location_specific'] = self.prescriptive_actions[location_type]
        
        # 3. Resource allocation recommendations
        resources = self._recommend_resources(temporal_data, location_data, risk_level)
        recommendations['resource_deployment'] = resources
        
        # 4. Outreach campaign recommendations
        campaigns = self._plan_outreach(offense_type, location_data)
        recommendations['outreach_campaigns'] = campaigns
        
        # 5. Expected impact estimation
        recommendations['expected_impact'] = self._estimate_impact(
            risk_level, 
            offense_type, 
            location_data
        )
        
        # 6. Priority scoring
        recommendations['priority_score'] = self._calculate_priority(
            prediction_data,
            location_data,
            temporal_data
        )
        
        return recommendations
    
    def _recommend_resources(self, temporal_data, location_data, risk_level):
        """Recommend resource deployment"""
        resources = {
            'patrol_units': [],
            'medical_units': [],
            'enforcement_checkpoints': []
        }
        
        # Patrol recommendations
        hour = temporal_data.get('hour', 12)
        day_of_week = temporal_data.get('day_of_week', 0)
        
        patrol_config = self.resource_allocation['patrol_units']
        if hour in patrol_config['high_priority_hours']:
            resources['patrol_units'].append({
                'units_needed': patrol_config['minimum_units_per_hotspot'],
                'location': f"{location_data.get('barangay')}, {location_data.get('municipality')}",
                'reason': 'Peak traffic hour - increased accident risk',
                'deployment_time': f"{hour}:00 - {hour+2}:00"
            })
        
        if day_of_week in patrol_config['high_priority_days']:
            resources['patrol_units'].append({
                'units_needed': patrol_config['minimum_units_per_hotspot'] + 1,
                'location': location_data.get('municipality'),
                'reason': 'High-risk day (weekend) - increased incidents',
                'deployment_time': 'All day coverage'
            })
        
        # Medical unit recommendations
        if risk_level == 'high':
            medical_config = self.resource_allocation['medical_units']
            resources['medical_units'].append({
                'unit_type': 'Mobile Medical Response',
                'location': f"{location_data.get('municipality')} - {location_data.get('barangay')}",
                'reason': 'High risk of Crimes Against Persons',
                'response_time_target': medical_config['response_time_target'],
                'coverage_radius': medical_config['coverage_radius']
            })
        
        # Checkpoint recommendations
        checkpoint_config = self.resource_allocation['enforcement_checkpoints']
        frequency = (checkpoint_config['frequency_high_risk'] if risk_level == 'high' 
                    else checkpoint_config['frequency_medium_risk'])
        
        resources['enforcement_checkpoints'].append({
            'frequency': frequency,
            'location': f"{location_data.get('barangay')}, {location_data.get('municipality')}",
            'focus': 'DUI checks, helmet compliance, vehicle documentation',
            'recommended_times': checkpoint_config['recommended_times'],
            'duration': checkpoint_config['optimal_duration']
        })
        
        return resources
    
    def _plan_outreach(self, offense_type, location_data):
        """Plan public outreach campaigns"""
        campaigns = []
        
        strategy = self.outreach_strategy
        
        if offense_type == 'Crimes Against Persons':
            campaigns.append({
                'campaign_name': 'Safe Roads, Save Lives',
                'target_area': f"{location_data.get('barangay')}, {location_data.get('municipality')}",
                'target_groups': ['Young drivers (18-25 years)', 'Motorcycle riders'],
                'themes': ['Helmet saves lives', "Don't drink and drive"],
                'channels': strategy['channels'],
                'timing': strategy['timing'][0],  # Before major holidays
                'materials_needed': [
                    'Educational flyers (1000 copies)',
                    'Tarpaulin posters (10 pieces)',
                    'Social media content (20 posts)'
                ],
                'partnerships': [
                    'Barangay Council',
                    'Local schools',
                    'Community radio stations'
                ]
            })
        
        campaigns.append({
            'campaign_name': 'Documentation Compliance Drive',
            'target_area': location_data.get('municipality'),
            'target_groups': ['All vehicle owners'],
            'themes': ['Valid registration', 'Insurance coverage', 'License validity'],
            'channels': ['Barangay meetings', 'Social media'],
            'timing': 'Monthly',
            'focus': 'Prevent Crimes Against Property incidents'
        })
        
        return campaigns
    
    def _estimate_impact(self, risk_level, offense_type, location_data):
        """Estimate expected impact of recommendations"""
        impact = {
            'accident_reduction': {},
            'timeline': {},
            'confidence': {}
        }
        
        if risk_level == 'high' and offense_type == 'Crimes Against Persons':
            impact['accident_reduction'] = {
                '1_month': '10-15%',
                '3_months': '15-20%',
                '6_months': '20-30%'
            }
            impact['timeline'] = 'Immediate action required'
            impact['confidence'] = 0.75
        elif risk_level == 'medium':
            impact['accident_reduction'] = {
                '1_month': '5-10%',
                '3_months': '10-15%',
                '6_months': '15-20%'
            }
            impact['timeline'] = '2-4 weeks for implementation'
            impact['confidence'] = 0.65
        else:
            impact['accident_reduction'] = {
                '1_month': '2-5%',
                '3_months': '5-10%',
                '6_months': '10-15%'
            }
            impact['timeline'] = 'Standard monitoring schedule'
            impact['confidence'] = 0.55
        
        impact['key_success_indicators'] = [
            'Reduced accident frequency in target area',
            'Increased compliance with traffic rules',
            'Improved public awareness',
            'Faster emergency response times'
        ]
        
        return impact
    
    def _calculate_priority(self, prediction_data, location_data, temporal_data):
        """Calculate priority score for recommendations (0-100)"""
        score = 0
        
        # Risk level contribution (40 points max)
        risk_level = prediction_data.get('risk_level', 'low')
        if risk_level == 'high':
            score += 40
        elif risk_level == 'medium':
            score += 25
        else:
            score += 10
        
        # Offense type contribution (30 points max)
        offense_type = prediction_data.get('offense_type', '')
        if offense_type == 'Crimes Against Persons':
            score += 30  # Higher priority - life-threatening
        else:
            score += 15  # Lower priority - property damage
        
        # Confidence contribution (20 points max)
        confidence = prediction_data.get('confidence', 0.5)
        score += int(confidence * 20)
        
        # Temporal factors (10 points max)
        if temporal_data.get('is_rush_hour', False):
            score += 5
        if temporal_data.get('day_of_week', 0) in [5, 6, 0]:  # Weekend
            score += 5
        
        return min(score, 100)  # Cap at 100
    
    def generate_location_report(self, municipality, accidents_data, predictions):
        """
        Generate comprehensive prescriptive report for a municipality
        
        Args:
            municipality: Name of municipality
            accidents_data: Historical accident data for the municipality
            predictions: ML predictions for the area
        
        Returns:
            Detailed report with recommendations
        """
        report = {
            'municipality': municipality,
            'generated_date': datetime.now().isoformat(),
            'executive_summary': {},
            'recommendations': [],
            'resource_allocation_plan': {},
            'outreach_strategy': {},
            'implementation_timeline': {},
            'budget_estimate': {},
            'success_metrics': {}
        }
        
        # Executive summary
        total_accidents = len(accidents_data)
        high_risk_predictions = sum(1 for p in predictions if p.get('risk_level') == 'high')
        
        report['executive_summary'] = {
            'total_historical_accidents': total_accidents,
            'predicted_high_risk_areas': high_risk_predictions,
            'priority_level': 'HIGH' if high_risk_predictions > 5 else 'MEDIUM',
            'recommended_action': 'Immediate intervention required' if high_risk_predictions > 5 else 'Regular monitoring'
        }
        
        # Group predictions by barangay
        barangay_predictions = defaultdict(list)
        for pred in predictions:
            barangay = pred.get('location_data', {}).get('barangay', 'Unknown')
            barangay_predictions[barangay].append(pred)
        
        # Generate recommendations per barangay
        for barangay, preds in barangay_predictions.items():
            highest_risk = max(preds, key=lambda x: x.get('confidence', 0))
            
            recs = self.get_recommendations(
                highest_risk,
                {'municipality': municipality, 'barangay': barangay, 'location_type': 'urban_areas'},
                {'hour': 18, 'day_of_week': 5, 'is_rush_hour': True}
            )
            
            report['recommendations'].append({
                'barangay': barangay,
                'priority_score': recs['priority_score'],
                'actions': recs['immediate_actions'][:3],  # Top 3 actions
                'resources': recs['resource_deployment']
            })
        
        # Success metrics
        report['success_metrics'] = self.outreach_strategy['success_metrics']
        
        return report


def main():
    """Demonstration of prescriptive recommender"""
    # Initialize recommender
    config_path = os.path.join(os.path.dirname(__file__), '..', 'training', 'model_config.yaml')
    recommender = PrescriptiveRecommender(config_path)
    
    # Example prediction data
    prediction = {
        'offense_type': 'Crimes Against Persons',
        'confidence': 0.78,
        'risk_level': 'high'
    }
    
    location = {
        'municipality': 'Mati',
        'barangay': 'Central',
        'location_type': 'urban_areas',
        'lat': 6.95,
        'lng': 126.20
    }
    
    temporal = {
        'hour': 18,  # 6 PM
        'day_of_week': 5,  # Friday
        'is_rush_hour': True
    }
    
    # Get recommendations
    recommendations = recommender.get_recommendations(prediction, location, temporal)
    
    # Print recommendations
    print("=" * 80)
    print("PRESCRIPTIVE ANALYTICS RECOMMENDATIONS")
    print("=" * 80)
    print(f"\nLocation: {location['barangay']}, {location['municipality']}")
    print(f"Predicted Offense Type: {prediction['offense_type']}")
    print(f"Risk Level: {prediction['risk_level'].upper()}")
    print(f"Confidence: {prediction['confidence']*100:.1f}%")
    print(f"Priority Score: {recommendations['priority_score']}/100")
    
    print("\n" + "=" * 80)
    print("IMMEDIATE ACTIONS (Next 24-48 hours)")
    print("=" * 80)
    for i, action in enumerate(recommendations['immediate_actions'], 1):
        print(f"{i}. {action}")
    
    print("\n" + "=" * 80)
    print("RESOURCE DEPLOYMENT PLAN")
    print("=" * 80)
    resources = recommendations['resource_deployment']
    
    if resources.get('patrol_units'):
        print("\nPatrol Units:")
        for unit in resources['patrol_units']:
            print(f"  • {unit['units_needed']} units at {unit['location']}")
            print(f"    Reason: {unit['reason']}")
            print(f"    Time: {unit['deployment_time']}")
    
    if resources.get('medical_units'):
        print("\nMedical Units:")
        for unit in resources['medical_units']:
            print(f"  • {unit['unit_type']} at {unit['location']}")
            print(f"    Target Response Time: {unit['response_time_target']}")
    
    if resources.get('enforcement_checkpoints'):
        print("\nEnforcement Checkpoints:")
        for cp in resources['enforcement_checkpoints']:
            print(f"  • Frequency: {cp['frequency']}")
            print(f"    Location: {cp['location']}")
            print(f"    Focus: {cp['focus']}")
    
    print("\n" + "=" * 80)
    print("EXPECTED IMPACT")
    print("=" * 80)
    impact = recommendations['expected_impact']
    print(f"Timeline: {impact['timeline']}")
    print(f"Confidence: {impact['confidence']*100:.0f}%")
    print("\nAccident Reduction Estimates:")
    for timeframe, reduction in impact['accident_reduction'].items():
        print(f"  • {timeframe.replace('_', ' ').title()}: {reduction}")
    
    print("\n" + "=" * 80)
    print("PUBLIC OUTREACH CAMPAIGNS")
    print("=" * 80)
    for i, campaign in enumerate(recommendations['outreach_campaigns'], 1):
        print(f"\n{i}. {campaign['campaign_name']}")
        print(f"   Target Area: {campaign['target_area']}")
        print(f"   Focus: {', '.join(campaign.get('themes', []))}")
    
    print("\n" + "=" * 80)


if __name__ == "__main__":
    main()

