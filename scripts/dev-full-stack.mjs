#!/usr/bin/env node
/**
 * Full Stack Development Server
 * Starts Frontend + Backend + OCR Model with health checks
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60) + '\n');
}

// Check if MongoDB URI is configured
function checkMongoDBConfig() {
  logSection('🔍 Checking MongoDB Configuration');
  
  const backendEnvPath = join(rootDir, 'backend', '.env');
  
  if (!fs.existsSync(backendEnvPath)) {
    log('❌ backend/.env file not found!', 'red');
    log('\n📝 Please create backend/.env from backend/.env.example:', 'yellow');
    log('   1. Copy backend/.env.example to backend/.env', 'yellow');
    log('   2. Set MONGODB_URI with your MongoDB connection string', 'yellow');
    log('   3. Set other required variables', 'yellow');
    return false;
  }
  
  const envContent = fs.readFileSync(backendEnvPath, 'utf-8');
  const hasMongoUri = envContent.includes('MONGODB_URI=') && 
                      !envContent.includes('MONGODB_URI=mongodb+srv://USER:PASSWORD');
  
  if (!hasMongoUri) {
    log('❌ MONGODB_URI not configured in backend/.env!', 'red');
    log('\n📝 Please set your MongoDB connection string:', 'yellow');
    log('   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/', 'yellow');
    return false;
  }
  
  log('✅ MongoDB configuration found', 'green');
  return true;
}

// Check if OCR Python environment is ready
function checkOCREnvironment() {
  logSection('🔍 Checking OCR Environment');
  
  const requirementsPath = join(rootDir, 'requirements_ocr.txt');
  const ocrRunnerPath = join(rootDir, 'scripts', 'ocr_runner.py');
  
  if (!fs.existsSync(requirementsPath)) {
    log('⚠️  requirements_ocr.txt not found', 'yellow');
    log('   OCR may not work properly', 'yellow');
    return false;
  }
  
  if (!fs.existsSync(ocrRunnerPath)) {
    log('⚠️  scripts/ocr_runner.py not found', 'yellow');
    log('   OCR may not work properly', 'yellow');
    return false;
  }
  
  log('✅ OCR scripts found', 'green');
  log('💡 Run "npm run ocr:setup" to install OCR dependencies', 'cyan');
  return true;
}

// Health check for backend
async function waitForBackend(maxAttempts = 30) {
  log('\n⏳ Waiting for backend to start...', 'yellow');
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch('http://localhost:4000/api/health');
      const bodyText = await response.clone().text().catch(() => '');
      const isDegraded =
        bodyText.includes('"status":"degraded"') ||
        bodyText.includes('"mongodb":false');

      if (response.ok || isDegraded) {
        log('✅ Backend is ready!', 'green');
        const mongodbReady = bodyText.includes('"mongodb":true');
        log(
          `   MongoDB: ${mongodbReady ? '✅ Connected' : '❌ Not connected'}`,
          mongodbReady ? 'green' : 'red',
        );
        if (isDegraded) {
          log('   Backend is running without MongoDB; database-backed routes remain disabled.', 'yellow');
        }
        return true;
      }
    } catch (error) {
      // Backend not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    process.stdout.write('.');
  }
  
  log('\n❌ Backend failed to start within 30 seconds', 'red');
  return false;
}

// Health check for frontend
async function waitForFrontend(maxAttempts = 30) {
  log('\n⏳ Waiting for frontend to start...', 'yellow');
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch('http://localhost:3000');
      if (response.ok) {
        log('✅ Frontend is ready!', 'green');
        return true;
      }
    } catch (error) {
      // Frontend not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    process.stdout.write('.');
  }
  
  log('\n❌ Frontend failed to start within 30 seconds', 'red');
  return false;
}

// Start a process
function startProcess(name, command, args, cwd, color) {
  log(`\n🚀 Starting ${name}...`, color);
  
  const proc = spawn(command, args, {
    cwd: cwd || rootDir,
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, FORCE_COLOR: '1' }
  });
  
  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${colors[color]}[${name}]${colors.reset} ${line}`);
      }
    });
  });
  
  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${colors.red}[${name} ERROR]${colors.reset} ${line}`);
      }
    });
  });
  
  proc.on('close', (code) => {
    if (code !== 0) {
      log(`\n❌ ${name} exited with code ${code}`, 'red');
    }
  });
  
  return proc;
}

// Main function
async function main() {
  logSection('🚀 Full Stack Development Server');
  
  log('Starting Frontend + Backend + OCR Model', 'bright');
  log('Press Ctrl+C to stop all services\n', 'yellow');
  
  // Check configurations
  const mongoOk = checkMongoDBConfig();
  if (!mongoOk) {
    process.exit(1);
  }
  
  checkOCREnvironment();
  
  // Start backend
  const backendProc = startProcess(
    'Backend',
    'npm',
    ['run', 'dev'],
    join(rootDir, 'backend'),
    'magenta'
  );
  
  // Wait for backend to be ready
  const backendReady = await waitForBackend();
  if (!backendReady) {
    log('\n⚠️  Backend may not be fully ready, but continuing...', 'yellow');
  }
  
  // Start frontend
  const frontendProc = startProcess(
    'Frontend',
    'npm',
    ['run', 'dev:web'],
    rootDir,
    'cyan'
  );
  
  // Wait for frontend to be ready
  const frontendReady = await waitForFrontend();
  if (!frontendReady) {
    log('\n⚠️  Frontend may not be fully ready, but continuing...', 'yellow');
  }
  
  // Show success message
  logSection('✅ All Services Started!');
  
  log('📱 Frontend:  http://localhost:3000', 'cyan');
  log('🔧 Backend:   http://localhost:4000', 'magenta');
  log('📊 Health:    http://localhost:4000/api/health', 'blue');
  log('\n🎯 Quick Links:', 'bright');
  log('   • Upload:    http://localhost:3000/upload', 'cyan');
  log('   • Dashboard: http://localhost:3000/dashboard', 'cyan');
  log('   • Search:    http://localhost:3000/search', 'cyan');
  
  log('\n💡 OCR Model:', 'bright');
  log('   • Model location: model/', 'yellow');
  log('   • OCR endpoint: POST /api/ocr', 'yellow');
  log('   • Test OCR: npm run ocr:test', 'yellow');
  
  log('\n📝 Logs:', 'bright');
  log('   • Frontend logs are prefixed with [Frontend]', 'cyan');
  log('   • Backend logs are prefixed with [Backend]', 'magenta');
  
  log('\n⚠️  Press Ctrl+C to stop all services', 'yellow');
  
  // Handle shutdown
  const cleanup = () => {
    log('\n\n🛑 Shutting down services...', 'yellow');
    
    if (backendProc) {
      log('   Stopping backend...', 'magenta');
      backendProc.kill();
    }
    
    if (frontendProc) {
      log('   Stopping frontend...', 'cyan');
      frontendProc.kill();
    }
    
    log('\n✅ All services stopped', 'green');
    process.exit(0);
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  // Keep the process running
  await new Promise(() => {});
}

// Run
main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
