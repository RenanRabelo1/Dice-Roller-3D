// Stand-in for the history API during E2E (playwright.config.ts points VITE_API_URL here). It answers 204 to
// everything, CORS preflight included, so a POST no test intercepts leaves the console clean.
import { createServer } from 'node:http';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

createServer((request, response) => {
  request.resume();
  request.on('end', () => { response.writeHead(204, CORS); response.end(); });
}).listen(Number(process.env.PORT ?? 5180), '127.0.0.1');
