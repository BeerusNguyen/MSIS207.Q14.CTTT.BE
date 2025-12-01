const mysql = require('mysql2/promise');

(async () => {
  try {
    const pool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: 'Thuathienhue75.',
      database: 'recipe_finder'
    });

    console.log('📊 Checking database...\n');

    const [tables] = await pool.query('SHOW TABLES');
    console.log('Tables in database:');
    console.log(tables);

    const [users] = await pool.query("SHOW TABLES LIKE 'users'");
    if (users.length === 0) {
      console.log('\n❌ ERROR: Table "users" does NOT exist!');
      console.log('You MUST run the migration SQL file in MySQL Workbench!');
      console.log('File: Recipe-Finder-BE/database/run_migration.sql');
    } else {
      console.log('\n✅ Table "users" exists');
      const [columns] = await pool.query('DESCRIBE users');
      console.log('Columns:', columns.map(c => c.Field).join(', '));
    }

    const [recipes] = await pool.query("SHOW TABLES LIKE 'recipes'");
    if (recipes.length > 0) {
      console.log('\n✅ Table "recipes" exists');
      const [recipeColumns] = await pool.query('DESCRIBE recipes');
      const hasUserId = recipeColumns.some(c => c.Field === 'user_id');
      if (hasUserId) {
        console.log('✅ Column "user_id" exists in recipes');
      } else {
        console.log('❌ Column "user_id" MISSING in recipes - run migration!');
      }
    }

    await pool.end();
  } catch (err) {
    console.error('❌ Database error:', err.message);
  }
})();
