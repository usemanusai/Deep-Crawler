# Quick Start - Development Server

## 🚀 Start the Dev Server (Recommended)

```bash
npm run dev:clean
```

This command:
- ✅ Checks if port 3002 is in use
- ✅ Automatically kills any process using port 3002
- ✅ Starts the Next.js development server
- ✅ No manual intervention needed

## 📋 What You'll See

### If Port is Free
```
🔍 Checking port 3002...
✓ Port 3002 is free

🚀 Starting Next.js development server on port 3002...

> next dev -p 3002

  ▲ Next.js 14.2.33
  - Local:        http://localhost:3002
  - Environments: .env.local

✓ Ready in 2.5s
```

### If Port is In Use (Auto-Cleaned)
```
🔍 Checking port 3002...
⚠ Port 3002 is already in use. Attempting to free it...

⚠ Found 1 process(es) using port 3002. Killing...
  ✓ Killed process 12345

⏳ Waiting for port to be free...
✓ Port 3002 is now free

🚀 Starting Next.js development server on port 3002...

> next dev -p 3002

  ▲ Next.js 14.2.33
  - Local:        http://localhost:3002
  - Environments: .env.local

✓ Ready in 2.5s
```

## 🔧 Alternative Commands

### Original Dev Command (No Port Cleanup)
```bash
npm run dev
```

Use this if you're sure port 3002 is free.

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Run Linter
```bash
npm run lint
```

## 📝 How It Works

The `npm run dev:clean` command runs a Node.js script that:

1. **Checks Port**: Uses `net` module to check if port 3002 is in use
2. **Kills Process**: If in use, uses platform-specific commands:
   - **Windows**: `netstat` + `taskkill`
   - **Unix/Linux/Mac**: `lsof` + `kill`
3. **Waits**: Waits up to 5 seconds for port to be free
4. **Starts Server**: Launches Next.js dev server

## ✅ Benefits

- ✅ **No Manual Intervention**: Automatically handles port conflicts
- ✅ **Cross-Platform**: Works on Windows, macOS, and Linux
- ✅ **Safe**: Only affects port 3002, no other processes
- ✅ **Fast**: Minimal overhead (~1 second if cleanup needed)
- ✅ **Informative**: Clear status messages

## 🐛 Troubleshooting

### Port Still In Use After Cleanup

If you see "Port still in use after 5000ms":

**Windows**:
```bash
netstat -ano | findstr :3002
taskkill /PID <pid> /F
npm run dev:clean
```

**Unix/Linux/Mac**:
```bash
lsof -i :3002
kill -9 <pid>
npm run dev:clean
```

### Permission Denied (Unix/Linux/Mac)

Try with sudo:
```bash
sudo npm run dev:clean
```

### Script Not Found

Make sure you're in the project root:
```bash
cd hyperbrowser-app-examples/deep-crawler-bot
npm run dev:clean
```

## 📚 More Information

For detailed information, see:
- `PORT_CLEANUP_GUIDE.md` - Complete guide with advanced usage
- `scripts/start-dev.js` - The startup script source code

## 🎯 Next Steps

1. Run `npm run dev:clean`
2. Open http://localhost:3002 in your browser
3. Start developing!

---

**Status**: ✅ Ready to Use
**Last Updated**: October 31, 2025

