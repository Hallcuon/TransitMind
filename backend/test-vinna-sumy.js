const http = require('http');

function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

(async () => {
  try {
    console.log('🧪 Testing Вінниця → Суми\n');

    // Login
    console.log('🔐 Logging in...');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    });
    const token = loginRes.data.token;
    if (!token) {
      console.error('❌ Failed to get token:', loginRes.data);
      process.exit(1);
    }
    console.log('✅ Login successful\n');

    // Get cities
    const citiesRes = await makeRequest('GET', '/api/dijkstra/cities', null, { Authorization: token });
    const cities = citiesRes.data;
    const vinna = cities.find(c => c.name === 'Вінниця');
    const sumy = cities.find(c => c.name === 'Суми');

    console.log(`📍 Testing route: ${vinna.name} (${vinna.id}) → ${sumy.name} (${sumy.id})\n`);

    // Test shortest
    console.log('⏱️  Testing SHORTEST path...');
    console.time('shortest');
    const res1 = await makeRequest(
      'POST',
      '/api/dijkstra/find-route',
      {
        startCityId: vinna.id,
        endCityId: sumy.id,
        pathType: 'shortest',
      },
      { Authorization: token }
    );
    console.timeEnd('shortest');

    if (res1.status === 201) {
      console.log('✅ SHORTEST Route found!');
      console.log(`📍 ${res1.data.route.waypoints.join(' → ')}`);
      console.log(`📊 ${res1.data.statistics.totalDistance} км, ${res1.data.statistics.totalTime} хв\n`);
    }

    // Test longest
    console.log('⏱️  Testing LONGEST path...');
    console.time('longest');
    const res2 = await makeRequest(
      'POST',
      '/api/dijkstra/find-route',
      {
        startCityId: vinna.id,
        endCityId: sumy.id,
        pathType: 'longest',
      },
      { Authorization: token }
    );
    console.timeEnd('longest');

    if (res2.status === 201) {
      console.log('✅ LONGEST Route found!');
      console.log(`📍 ${res2.data.route.waypoints.join(' → ')}`);
      console.log(`📊 ${res2.data.statistics.totalDistance} км, ${res2.data.statistics.totalTime} хв`);
    }

    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
