const pool = require('./src/config/database');

(async () => {
  try {
    // Get Вінниця and Суми IDs
    const cities = await pool.query("SELECT id, name FROM cities WHERE name IN ('Вінниця', 'Суми')");
    const vinna = cities.rows.find(c => c.name === 'Вінниця');
    const sumy = cities.rows.find(c => c.name === 'Суми');
    
    console.log('📍 Вінниця ID:', vinna.id);
    console.log('📍 Суми ID:', sumy.id);
    
    // Check if direct connection exists
    const direct = await pool.query(
      `SELECT * FROM roads 
       WHERE (city_from_id = $1 AND city_to_id = $2) 
          OR (city_from_id = $2 AND city_to_id = $1)`,
      [vinna.id, sumy.id]
    );
    console.log('\n🚗 Direct connection Вінниця↔Суми:', direct.rows.length > 0 ? 'YES' : 'NO');
    
    // Show all roads from Вінниця
    const vinnaRoads = await pool.query(
      `SELECT c.name, r.distance_km, r.driving_time_minutes 
       FROM roads r 
       JOIN cities c ON c.id = r.city_to_id 
       WHERE r.city_from_id = $1 
       ORDER BY r.distance_km`,
      [vinna.id]
    );
    console.log('\n🛣️  Roads from Вінниця:');
    vinnaRoads.rows.forEach(r => console.log(`  -> ${r.name}: ${r.distance_km} км, ${r.driving_time_minutes} хв`));
    
    // Show all roads from Київ (should have Суми)
    const kievRoads = await pool.query(
      `SELECT c.name, r.distance_km FROM roads r 
       JOIN cities c ON c.id = r.city_to_id 
       WHERE r.city_from_id = (SELECT id FROM cities WHERE name = 'Київ') 
       ORDER BY r.distance_km`,
      []
    );
    console.log('\n🛣️  Roads from Київ:');
    kievRoads.rows.forEach(r => console.log(`  -> ${r.name}: ${r.distance_km} км`));
    
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
