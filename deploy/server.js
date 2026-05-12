const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');

// Standard Next.js server entry point for CPanel/Cloud deployment
// This script assumes 'output: standalone' in next.config.js

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// When using 'standalone' output, Next.js generates a .next/standalone directory.
// For CPanel, you should upload the contents of .next/standalone to your app directory.
// Then run this script.

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
