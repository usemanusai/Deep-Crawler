#!/usr/bin/env node

/**
 * Development Server Startup Script
 * 
 * This script:
 * 1. Checks if port 3002 is in use
 * 2. Kills any process using port 3002 (Windows and Unix compatible)
 * 3. Starts the Next.js development server
 * 
 * Usage: node scripts/start-dev.js
 */

const { spawn } = require('child_process');
const net = require('net');
const os = require('os');
const path = require('path');

const PORT = 3002;
const TIMEOUT = 5000; // 5 seconds to wait for port to be free

/**
 * Check if a port is in use
 */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Kill process using the specified port
 * Works on Windows and Unix systems
 */
function killProcessOnPort(port) {
  return new Promise((resolve, reject) => {
    const isWindows = os.platform() === 'win32';
    
    if (isWindows) {
      // Windows: Use taskkill command
      const cmd = `netstat -ano | findstr :${port}`;
      const { exec } = require('child_process');
      
      exec(cmd, (error, stdout, stderr) => {
        if (error || !stdout.trim()) {
          console.log(`✓ Port ${port} is free (no process found)`);
          resolve();
          return;
        }
        
        // Extract PID from netstat output
        // Format: TCP    127.0.0.1:3002         0.0.0.0:0              LISTENING       12345
        const lines = stdout.trim().split('\n');
        const pids = new Set();
        
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length > 0) {
            const pid = parts[parts.length - 1];
            if (pid && !isNaN(pid) && pid !== '0') {
              pids.add(pid);
            }
          }
        });
        
        if (pids.size === 0) {
          console.log(`✓ Port ${port} is free (no process found)`);
          resolve();
          return;
        }
        
        console.log(`⚠ Found ${pids.size} process(es) using port ${port}. Killing...`);
        
        let killed = 0;
        pids.forEach(pid => {
          exec(`taskkill /PID ${pid} /F`, (error) => {
            if (error) {
              console.warn(`  ⚠ Failed to kill PID ${pid}: ${error.message}`);
            } else {
              console.log(`  ✓ Killed process ${pid}`);
              killed++;
            }
            
            if (killed === pids.size) {
              setTimeout(() => resolve(), 500);
            }
          });
        });
      });
    } else {
      // Unix/Linux/Mac: Use lsof command
      const { exec } = require('child_process');
      const cmd = `lsof -i :${port} -t`;
      
      exec(cmd, (error, stdout, stderr) => {
        if (error || !stdout.trim()) {
          console.log(`✓ Port ${port} is free (no process found)`);
          resolve();
          return;
        }
        
        const pids = stdout.trim().split('\n').filter(pid => pid && !isNaN(pid));
        
        if (pids.length === 0) {
          console.log(`✓ Port ${port} is free (no process found)`);
          resolve();
          return;
        }
        
        console.log(`⚠ Found ${pids.length} process(es) using port ${port}. Killing...`);
        
        let killed = 0;
        pids.forEach(pid => {
          exec(`kill -9 ${pid}`, (error) => {
            if (error) {
              console.warn(`  ⚠ Failed to kill PID ${pid}: ${error.message}`);
            } else {
              console.log(`  ✓ Killed process ${pid}`);
              killed++;
            }
            
            if (killed === pids.length) {
              setTimeout(() => resolve(), 500);
            }
          });
        });
      });
    }
  });
}

/**
 * Wait for port to be free
 */
function waitForPortFree(port, timeout = TIMEOUT) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkPort = async () => {
      const inUse = await isPortInUse(port);
      
      if (!inUse) {
        console.log(`✓ Port ${port} is now free`);
        resolve();
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Port ${port} is still in use after ${timeout}ms`));
        return;
      }
      
      setTimeout(checkPort, 100);
    };
    
    checkPort();
  });
}

/**
 * Start the Next.js development server
 */
function startDevServer() {
  console.log(`\n🚀 Starting Next.js development server on port ${PORT}...\n`);
  
  const devProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: path.dirname(path.dirname(__filename))
  });
  
  devProcess.on('error', (error) => {
    console.error('❌ Failed to start dev server:', error);
    process.exit(1);
  });
  
  devProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ Dev server exited with code ${code}`);
      process.exit(code);
    }
  });
}

/**
 * Main startup sequence
 */
async function main() {
  try {
    console.log('🔍 Checking port 3002...');
    
    const inUse = await isPortInUse(PORT);
    
    if (inUse) {
      console.log(`⚠ Port ${PORT} is already in use. Attempting to free it...\n`);
      await killProcessOnPort(PORT);
      
      console.log('\n⏳ Waiting for port to be free...');
      await waitForPortFree(PORT);
    } else {
      console.log(`✓ Port ${PORT} is free\n`);
    }
    
    startDevServer();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the startup sequence
main();

