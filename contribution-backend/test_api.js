const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 8000,
  path: '/api/customers?per_page=1&status=in_progress',
  method: 'GET',
  headers: {
    'Accept': 'application/json',
    'Origin': 'https://viotortrading.neziz.cloud'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { 
    try {
        const json = JSON.parse(data);
        console.log(JSON.stringify(json.data[0], null, 2));
    } catch(e) {
        console.log('Error parsing JSON:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.end();
