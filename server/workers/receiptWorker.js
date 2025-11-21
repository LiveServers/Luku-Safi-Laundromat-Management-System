const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const ReceiptGenerator = require('../utils/receiptGenerator');

if (isMainThread) {
  // Main thread - export function to create worker
  function generateReceiptAsync(receiptData) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(__filename, {
        workerData: receiptData
      });

      worker.on('message', (result) => {
        if (result.success) {
          resolve(result);
        } else {
          reject(new Error(result.error));
        }
      });

      worker.on('error', reject);
      
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }

  module.exports = { generateReceiptAsync };
} else {
  // Worker thread - generate receipt
  async function generateReceipt() {
    try {
      const generator = new ReceiptGenerator();
      const result = await generator.generateReceipt(workerData);
      parentPort.postMessage(result);
    } catch (error) {
      parentPort.postMessage({
        success: false,
        error: error.message
      });
    }
  }

  generateReceipt();
}