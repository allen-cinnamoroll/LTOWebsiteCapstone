#!/bin/bash

# Quick Setup Script for Auto-Starting Flask API
# This script will set up the Flask API to run automatically on boot

echo "=========================================="
echo "Setting up MV Prediction API Auto-Start"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "Current directory: $SCRIPT_DIR"
echo ""

# Step 1: Copy service file
echo "Step 1: Copying systemd service file..."
cp mv-prediction-api.service /etc/systemd/system/
echo "✓ Service file copied"
echo ""

# Step 2: Reload systemd
echo "Step 2: Reloading systemd daemon..."
systemctl daemon-reload
echo "✓ Systemd reloaded"
echo ""

# Step 3: Enable service
echo "Step 3: Enabling service to start on boot..."
systemctl enable mv-prediction-api
echo "✓ Service enabled"
echo ""

# Step 4: Start service
echo "Step 4: Starting service..."
systemctl start mv-prediction-api
echo "✓ Service started"
echo ""

# Step 5: Wait a moment for service to start
echo "Waiting 3 seconds for service to initialize..."
sleep 3
echo ""

# Step 6: Check status
echo "Step 5: Checking service status..."
systemctl status mv-prediction-api --no-pager -l
echo ""

# Step 7: Check if port is listening
echo "Step 6: Checking if port 5001 is listening..."
if netstat -tlnp 2>/dev/null | grep -q ":5001" || ss -tlnp 2>/dev/null | grep -q ":5001"; then
    echo "✓ Port 5001 is listening"
else
    echo "⚠ Port 5001 is not listening yet. Check logs with: sudo journalctl -u mv-prediction-api -n 50"
fi
echo ""

# Step 8: Test API
echo "Step 7: Testing API health endpoint..."
if curl -s http://localhost:5001/api/health > /dev/null; then
    echo "✓ API is responding!"
    curl -s http://localhost:5001/api/health | head -c 200
    echo ""
else
    echo "⚠ API is not responding. Check logs: sudo journalctl -u mv-prediction-api -f"
fi
echo ""

# Step 9: Firewall check
echo "Step 8: Checking firewall..."
if command -v ufw > /dev/null; then
    if ufw status | grep -q "5001"; then
        echo "✓ Port 5001 is allowed in firewall"
    else
        echo "⚠ Port 5001 might not be open in firewall"
        echo "  Run: sudo ufw allow 5001"
    fi
else
    echo "⚠ ufw not found, skipping firewall check"
fi
echo ""

echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Useful commands:"
echo "  Status:    sudo systemctl status mv-prediction-api"
echo "  Start:     sudo systemctl start mv-prediction-api"
echo "  Stop:      sudo systemctl stop mv-prediction-api"
echo "  Restart:   sudo systemctl restart mv-prediction-api"
echo "  Logs:      sudo journalctl -u mv-prediction-api -f"
echo ""

