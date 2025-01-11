const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const keywordsToUrls = {
  'nodejs': ['http://example.com/node1', 'http://example.com/node2'],
  'javascript': ['http://example.com/js1', 'http://example.com/js2'],
};

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    fs.readFile(path.join(__dirname, 'public', 'index.html'), 'utf-8', (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error reading the file');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else if (req.method === 'GET' && req.url.startsWith('/public/')) {
    const filePath = path.join(__dirname, req.url);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('File not found');
        return;
      }
      const ext = path.extname(filePath);
      let contentType = 'text/plain';
      if (ext === '.html') contentType = 'text/html';
      else if (ext === '.css') contentType = 'text/css';
      else if (ext === '.js') contentType = 'application/javascript';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.action === 'getURLs') {
      const urls = keywordsToUrls[data.keyword];
      if (urls && urls.length > 0) {
        // Отправляем список URL, если ключевое слово найдено
        ws.send(JSON.stringify({ action: 'sendURLs', urls }));
      } else {
        // Если ключевое слово не найдено, отправляем ошибку
        ws.send(JSON.stringify({ action: 'error', message: 'Ключевое слово не найдено!' }));
      }
    }

    if (data.action === 'downloadContent') {
      downloadContent(data.url, ws);
    }
  });
});

// Эмуляция скачивания контента
function downloadContent(url, ws) {
  const content = `Content from ${url}`; // Эмуляция контента
  const filePath = path.join(__dirname, 'downloads', path.basename(url) + '.txt');

  let progress = 0;
  const totalSize = 100;
  const downloadInterval = setInterval(() => {
    if (progress < totalSize) {
      progress += 50;
      ws.send(JSON.stringify({
        action: 'downloadProgress',
        progress,
        totalSize,
        currentThreadCount: 1
      }));
    } else {
      clearInterval(downloadInterval);
      fs.writeFileSync(filePath, content);
      ws.send(JSON.stringify({ action: 'downloadComplete', filePath }));
    }
  }, 1000);
}

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
