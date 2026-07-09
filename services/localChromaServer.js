const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const { CHROMA_HOST, CHROMA_PORT, ROOT_DIR } = require('../config/appConfig');

let chromaProcess = null;

function canConnect(host, port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;

    function finish(result) {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(result);
    }

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

async function waitForChroma(timeoutMs = 70000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await canConnect(CHROMA_HOST, CHROMA_PORT)) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return false;
}

function startChromaProcess() {
  if (chromaProcess) {
    return;
  }

  const scriptPath = path.join(ROOT_DIR, 'scripts', 'startChromaServer.py');
  chromaProcess = spawn('python', [scriptPath], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      CHROMA_SERVER_CORS_ALLOW_ORIGINS: process.env.CHROMA_SERVER_CORS_ALLOW_ORIGINS || '["*"]'
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  chromaProcess.stdout.on('data', (data) => {
    const text = data.toString().trim();
    if (text) {
      console.log(`[ChromaDB] ${text}`);
    }
  });

  chromaProcess.stderr.on('data', (data) => {
    const text = data.toString().trim();
    if (text) {
      console.warn(`[ChromaDB] ${text}`);
    }
  });

  chromaProcess.once('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.warn(`ChromaDB exited with code ${code}.`);
    }
    chromaProcess = null;
  });
}

async function ensureLocalChromaServer() {
  if (process.env.AUTO_START_CHROMA === 'false') {
    return;
  }

  if (await canConnect(CHROMA_HOST, CHROMA_PORT)) {
    console.log(`ChromaDB is already running at http://${CHROMA_HOST}:${CHROMA_PORT}`);
    return;
  }

  console.log(`Starting local ChromaDB at http://${CHROMA_HOST}:${CHROMA_PORT}...`);
  startChromaProcess();

  if (!(await waitForChroma())) {
    console.warn('ChromaDB did not become ready before startup timeout. Upload analysis will fail until ChromaDB is running.');
  }
}

function stopLocalChromaServer() {
  if (chromaProcess) {
    chromaProcess.kill();
    chromaProcess = null;
  }
}

process.once('exit', stopLocalChromaServer);
process.once('SIGINT', () => {
  stopLocalChromaServer();
  process.exit(0);
});
process.once('SIGTERM', () => {
  stopLocalChromaServer();
  process.exit(0);
});

module.exports = {
  ensureLocalChromaServer
};
