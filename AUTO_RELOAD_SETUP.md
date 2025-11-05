# Auto-Reload Setup for Production

This guide explains how to enable automatic server reloading when files change in production.

## What Changed

The `ecosystem.config.js` file has been updated to enable PM2 watch mode. This means:
- ✅ Server automatically restarts when you modify code files
- ✅ No need to manually restart PM2 after changes
- ✅ Changes take effect within 1-2 seconds

## How to Apply the Changes

### Step 1: Upload the Updated Config File

Upload the updated `ecosystem.config.js` to your production server at:
```
/var/www/LTOWebsiteCapstone/ecosystem.config.js
```

### Step 2: Reload PM2 with New Configuration

SSH into your production server and run:

```bash
cd /var/www/LTOWebsiteCapstone
pm2 reload ecosystem.config.js
```

Or if you want to restart everything:

```bash
pm2 restart ecosystem.config.js
```

### Step 3: Verify Watch Mode is Active

Check if watch mode is enabled:

```bash
pm2 describe lto-backend
```

You should see `watch: true` in the output.

## How It Works

- **Watch Mode**: PM2 monitors all files in the backend directory
- **Watch Delay**: 1 second delay prevents rapid restarts during file saves
- **Ignored Directories**: These directories are ignored to prevent unnecessary restarts:
  - `node_modules` - Dependencies
  - `logs` - Log files
  - `uploads` - User uploads
  - `*.log` - All log files
  - `.git` - Git files
  - `json` - JSON data files
  - `scripts` - Utility scripts
  - `data` - Data files
  - `model/ml_models` - ML model files

## Testing

1. Make a small change to any backend file (e.g., `backend/controller/dashboardController.js`)
2. Save the file
3. Wait 1-2 seconds
4. Check PM2 logs: `pm2 logs lto-backend`
5. You should see the server automatically restart

## Disabling Watch Mode (Optional)

If you want to disable auto-reload, edit `ecosystem.config.js` and change:

```javascript
watch: true,
```

to:

```javascript
watch: false,
```

Then reload: `pm2 reload ecosystem.config.js`

## Monitoring

To monitor the server in real-time:

```bash
pm2 logs lto-backend --lines 50
```

To see PM2 status:

```bash
pm2 status
```

## Important Notes

⚠️ **File Changes**: Only changes to files in these directories will trigger restarts:
- `backend/controller/`
- `backend/routes/`
- `backend/middleware/`
- `backend/model/` (except ml_models)
- `backend/util/`
- `backend/server.js`

⚠️ **Database Changes**: Watch mode does NOT apply database migrations. You still need to run those manually.

⚠️ **Dependencies**: If you add new npm packages, you'll need to:
1. Run `npm install` in the backend directory
2. PM2 will automatically restart when it detects the package.json change

## Troubleshooting

### Server Not Restarting?

1. Check if watch mode is enabled:
   ```bash
   pm2 describe lto-backend | grep watch
   ```

2. Check PM2 logs for errors:
   ```bash
   pm2 logs lto-backend --err
   ```

3. Manually restart if needed:
   ```bash
   pm2 restart lto-backend
   ```

### Too Many Restarts?

If the server restarts too frequently, you can:
1. Increase `watch_delay` (e.g., `2000` for 2 seconds)
2. Add more directories to `ignore_watch`

### Performance Impact

Watch mode has minimal performance impact. The delay ensures only significant changes trigger restarts.

