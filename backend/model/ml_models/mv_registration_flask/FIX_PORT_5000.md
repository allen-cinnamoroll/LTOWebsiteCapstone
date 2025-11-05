# Fix: Port 5000 Already in Use

## Quick Fix Options:

### Option 1: Find and Stop the Process Using Port 5000

```bash
# Find what's using port 5000
lsof -i :5000
# OR
netstat -tulpn | grep 5000
```

**If you see a process, kill it:**

```bash
kill -9 <PID>
# Replace <PID> with the actual process ID from above
```

### Option 2: Use a Different Port

Edit `app.py` to use port 5001:

```bash
nano app.py
```

Find the last line (around line 248):

```python
app.run(host='0.0.0.0', port=5000, debug=False)
```

Change to:

```python
app.run(host='0.0.0.0', port=5001, debug=False)
```

Save: `Ctrl+X`, then `Y`, then `Enter`

Then run:

```bash
python3 app.py
```

And test with:

```bash
curl http://localhost:5001/api/health
```

### Option 3: Kill All Python/Flask Processes (Nuclear Option)

```bash
# Kill all Python processes (be careful!)
pkill -f "python3 app.py"
pkill -f flask

# Wait a moment, then try again
python3 app.py
```

## Recommended: Option 1

First, check what's using port 5000:

```bash
lsof -i :5000
```

If you see something like:

```
COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
python    1234 root   4u  IPv4  ...
```

Kill it:

```bash
kill -9 1234
```

Then run:

```bash
python3 app.py
```

