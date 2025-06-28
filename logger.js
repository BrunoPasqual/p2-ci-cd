require('dotenv').config();
const axios = require('axios');


const BETTERSTACK_LOG_URL = process.env.BETTERSTACK_LOG_URL;

async function sendLog(level, message, meta = {}) {
  if (!BETTERSTACK_LOG_URL) {
    console.warn('BetterStack log URL não configurada');
    return;
  }
  
  const logPayload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
  
  try {
    await axios.post(BETTERSTACK_LOG_URL, logPayload);
  } catch (error) {
    console.error('Erro ao enviar log para BetterStack:', error.message);
  }
}

module.exports = {
  info: (msg, meta) => sendLog('info', msg, meta),
  error: (msg, meta) => sendLog('error', msg, meta),
};
