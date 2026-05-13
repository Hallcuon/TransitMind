const pool = require('./src/config/database');

(async () => {
  try {
    console.log('🌱 Seeding Ukraine cities and roads...\n');

    // Ukrainian cities with coordinates
    const cities = [
      { name: 'Київ', lat: 50.4501, lng: 30.5234, region: 'Київська' },
      { name: 'Харків', lat: 50.0028, lng: 36.2360, region: 'Харківська' },
      { name: 'Одеса', lat: 46.4858, lng: 30.7326, region: 'Одеська' },
      { name: 'Львів', lat: 49.8397, lng: 24.0297, region: 'Львівська' },
      { name: 'Дніпро', lat: 48.4647, lng: 35.0468, region: 'Дніпропетровська' },
      { name: 'Запоріжжя', lat: 47.8388, lng: 35.1395, region: 'Запорізька' },
      { name: 'Кривий Ріг', lat: 47.9093, lng: 33.3807, region: 'Дніпропетровська' },
      { name: 'Полтава', lat: 49.5883, lng: 34.5514, region: 'Полтавська' },
      { name: 'Ужгород', lat: 48.6208, lng: 22.2879, region: 'Закарпатська' },
      { name: 'Чернівці', lat: 48.2912, lng: 25.9424, region: 'Чернівецька' },
      { name: 'Вінниця', lat: 49.2331, lng: 28.4682, region: 'Вінницька' },
      { name: 'Суми', lat: 50.9216, lng: 34.7988, region: 'Сумська' },
      { name: 'Миколаїв', lat: 46.9750, lng: 32.0006, region: 'Миколаївська' },
      { name: 'Дніпродзержинськ', lat: 48.5152, lng: 34.5589, region: 'Дніпропетровська' },
      { name: 'Житомир', lat: 50.2547, lng: 28.6587, region: 'Житомирська' },
      { name: 'Черкаси', lat: 49.4444, lng: 32.0598, region: 'Черкаська' },
      { name: 'Чернігів', lat: 51.4982, lng: 31.2893, region: 'Чернігівська' },
      { name: 'Тернопіль', lat: 49.5535, lng: 25.5948, region: 'Тернопільська' },
      { name: 'Івано-Франківськ', lat: 48.9226, lng: 24.7111, region: 'Івано-Франківська' },
      { name: 'Луцьк', lat: 50.7472, lng: 25.3254, region: 'Волинська' },
      { name: 'Рівне', lat: 50.6199, lng: 26.2516, region: 'Рівненська' },
      { name: 'Хмельницький', lat: 49.4229, lng: 26.9871, region: 'Хмельницька' },
      { name: 'Кропивницький', lat: 48.5079, lng: 32.2623, region: 'Кіровоградська' },
      { name: 'Кременчук', lat: 49.0661, lng: 33.4179, region: 'Полтавська' },
      { name: 'Біла Церква', lat: 49.7980, lng: 30.1152, region: 'Київська' },
      { name: 'Бровари', lat: 50.5111, lng: 30.7900, region: 'Київська' },
      { name: 'Бориспіль', lat: 50.3505, lng: 30.9550, region: 'Київська' },
      { name: 'Вишневе', lat: 50.3891, lng: 30.3705, region: 'Київська' },
    ];

    // Clear old data
    await pool.query('DELETE FROM roads');
    await pool.query('DELETE FROM cities');
    await pool.query('ALTER SEQUENCE cities_id_seq RESTART WITH 1');

    // Insert cities
    const cityMap = {};
    for (const city of cities) {
      const result = await pool.query(
        `INSERT INTO cities (name, lat, lng, region) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        [city.name, city.lat, city.lng, city.region]
      );
      cityMap[city.name] = result.rows[0].id;
    }
    console.log(`✅ Added ${cities.length} cities`);

    // Roads with realistic driving times (car)
    // Format: [from, to, distance_km, driving_time_minutes]
    const roads = [
      // Київ hub
      ['Київ', 'Харків', 430, 390],
      ['Київ', 'Львів', 540, 480],
      ['Київ', 'Одеса', 450, 420],
      ['Київ', 'Дніпро', 480, 420],
      ['Київ', 'Полтава', 160, 150],
      ['Київ', 'Вінниця', 200, 180],
      ['Київ', 'Суми', 320, 300],
      
      // Харків hub
      ['Харків', 'Дніпро', 280, 240],
      ['Харків', 'Суми', 180, 150],
      ['Харків', 'Полтава', 130, 120],
      
      // Дніпро hub
      ['Дніпро', 'Запоріжжя', 230, 200],
      ['Дніпро', 'Кривий Ріг', 160, 140],
      ['Дніпро', 'Дніпродзержинськ', 50, 45],
      ['Дніпро', 'Одеса', 400, 360],
      
      // Запоріжжя hub
      ['Запоріжжя', 'Миколаїв', 280, 240],
      ['Запоріжжя', 'Одеса', 280, 240],
      
      // Western connections
      ['Львів', 'Ужгород', 240, 220],
      ['Львів', 'Чернівці', 280, 260],
      ['Львів', 'Вінниця', 340, 300],
      ['Ужгород', 'Чернівці', 280, 250],
      ['Чернівці', 'Вінниця', 380, 340],
      
      // Additional connections
      ['Вінниця', 'Полтава', 240, 220],
      ['Полтава', 'Суми', 260, 240],
      ['Одеса', 'Миколаїв', 120, 100],
      ['Кривий Ріг', 'Запоріжжя', 200, 180],

      // Central / short pomodoro-friendly links
      ['Київ', 'Житомир', 140, 120],
      ['Київ', 'Чернігів', 150, 130],
      ['Київ', 'Черкаси', 190, 170],
      ['Київ', 'Біла Церква', 85, 75],
      ['Київ', 'Бровари', 25, 30],
      ['Київ', 'Бориспіль', 35, 35],
      ['Київ', 'Вишневе', 18, 25],
      ['Черкаси', 'Кропивницький', 130, 120],
      ['Черкаси', 'Кременчук', 115, 100],
      ['Кропивницький', 'Кривий Ріг', 120, 110],
      ['Кременчук', 'Полтава', 115, 100],
      ['Кременчук', 'Дніпро', 170, 150],

      // Western denser network
      ['Львів', 'Тернопіль', 130, 115],
      ['Львів', 'Івано-Франківськ', 140, 130],
      ['Львів', 'Луцьк', 150, 130],
      ['Луцьк', 'Рівне', 75, 65],
      ['Рівне', 'Тернопіль', 160, 145],
      ['Тернопіль', 'Хмельницький', 110, 95],
      ['Хмельницький', 'Вінниця', 120, 105],
      ['Івано-Франківськ', 'Чернівці', 130, 120],
      ['Житомир', 'Рівне', 190, 170],
      ['Житомир', 'Вінниця', 130, 115],
    ];

    // Insert roads (bidirectional - car can go both ways)
    let roadCount = 0;
    for (const [from, to, distance, time] of roads) {
      const fromId = cityMap[from];
      const toId = cityMap[to];

      if (!fromId || !toId) {
        console.warn(`⚠️  Skipping road: ${from} -> ${to} (city not found)`);
        continue;
      }

      // Add both directions (roads are bidirectional)
      await pool.query(
        `INSERT INTO roads (city_from_id, city_to_id, distance_km, driving_time_minutes) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT DO NOTHING`,
        [fromId, toId, distance, time]
      );

      await pool.query(
        `INSERT INTO roads (city_from_id, city_to_id, distance_km, driving_time_minutes) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT DO NOTHING`,
        [toId, fromId, distance, time]
      );

      roadCount += 2;
    }

    console.log(`✅ Added ${roadCount} road connections (bidirectional)`);
    console.log(`\n📊 Graph Summary:`);
    console.log(`   - Nodes (cities): ${cities.length}`);
    console.log(`   - Edges (roads): ${roadCount}`);
    console.log(`   - Ready for Dijkstra algorithm ✨`);

    process.exit(0);
  } catch (e) {
    console.error('❌ Seeding error:', e.message);
    process.exit(1);
  }
})();
