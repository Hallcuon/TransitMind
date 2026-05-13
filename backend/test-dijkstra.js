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
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

(async () => {
  try {
    console.log('🧪 Testing Dijkstra API...\n');

    // First: Register/Login to get a token
    console.log('🔐 Logging in...');
    const loginRes = await makeRequest(
      'POST',
      '/api/auth/login',
      {
        email: 'test@example.com',
        password: 'test123456',
      }
    );

    let token = null;
    if (loginRes.status === 200 && loginRes.data.token) {
      token = `Bearer ${loginRes.data.token}`;
      console.log('✅ Login successful');
    } else if (loginRes.status === 401) {
      // Try registering instead
      console.log('📝 Registering new user...');
      const registerRes = await makeRequest(
        'POST',
        '/api/auth/register',
        {
          username: 'testuser',
          name: 'Test User',
          email: 'test@example.com',
          password: 'test123456',
        }
      );

      if (registerRes.status === 201 && registerRes.data.token) {
        token = `Bearer ${registerRes.data.token}`;
        console.log('✅ Registration successful');
      } else {
        console.error('❌ Auth failed:', registerRes.data);
        return;
      }
    }

    // Get cities
    const citiesRes = await makeRequest('GET', '/api/dijkstra/cities');
    console.log(`✅ Got ${citiesRes.data.length} cities`);
    
    if (citiesRes.data.length >= 2) {
      const city1 = citiesRes.data[0];
      const city2 = citiesRes.data[citiesRes.data.length - 1];
      
      console.log(`\n📍 Testing route: ${city1.name} (${city1.id}) → ${city2.name} (${city2.id})\n`);

      // Test shortest path
      console.log('⏱️  Testing SHORTEST path...');
      console.time('shortest');
      const res1 = await makeRequest(
        'POST',
        '/api/dijkstra/find-route',
        {
          startCityId: city1.id,
          endCityId: city2.id,
          pathType: 'shortest',
        },
        {
          'Authorization': token,
        }
      );
      console.timeEnd('shortest');

      if (res1.status === 201) {
        console.log('✅ SHORTEST Route found successfully!');
        console.log(`📍 ${res1.data.route.waypoints.join(' → ')}`);
        console.log(`📊 ${res1.data.statistics.totalDistance} км, ${res1.data.statistics.totalTime} хв\n`);
      } else {
        console.error(`❌ API Error (${res1.status}):`, res1.data);
      }

      // Test longest path
      console.log('⏱️  Testing LONGEST path...');
      console.time('longest');
      const res2 = await makeRequest(
        'POST',
        '/api/dijkstra/find-route',
        {
          startCityId: city1.id,
          endCityId: city2.id,
          pathType: 'longest',
        },
        {
          'Authorization': token,
        }
      );
      console.timeEnd('longest');

      if (res2.status === 201) {
        console.log('✅ LONGEST Route found successfully!');
        console.log(`📍 ${res2.data.route.waypoints.join(' → ')}`);
        console.log(`📊 ${res2.data.statistics.totalDistance} км, ${res2.data.statistics.totalTime} хв`);
      } else {
        console.error(`❌ API Error (${res2.status}):`, res2.data);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
