const fs = require('fs');
const path = require('path');
const { pool, initDatabase } = require('./db');

async function importData() {
    try {
        // Initialize database and tables
        console.log('🔄 Initializing database...');
        await initDatabase();

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await pool.query('DELETE FROM nutrition');
        await pool.query('DELETE FROM recipes');
        await pool.query('ALTER TABLE recipes AUTO_INCREMENT = 1');
        console.log('✅ Existing data cleared');

        // Read db.json file
        const dbJsonPath = path.join(__dirname, '..', 'db.json');
        const rawData = fs.readFileSync(dbJsonPath, 'utf8');
        const jsonData = JSON.parse(rawData);

        console.log(`📦 Found ${jsonData.recipes.length} recipes to import`);

        let importedCount = 0;
        let skippedCount = 0;

        // Import each recipe
        for (const recipe of jsonData.recipes) {
            try {
                // Insert recipe with image
                const [result] = await pool.query(
                    'INSERT INTO recipes (title, ingredients, servings, instructions, image) VALUES (?, ?, ?, ?, ?)',
                    [
                        recipe.title || 'Untitled Recipe',
                        recipe.ingredients || '',
                        recipe.servings || '1',
                        recipe.instructions || '',
                        recipe.image || null
                    ]
                );

                const recipeId = result.insertId;

                // Insert nutrition data if available
                if (recipe.nutrition && recipe.nutrition.totalNutrients) {
                    const nutrients = recipe.nutrition.totalNutrients;
                    await pool.query(
                        `INSERT INTO nutrition (recipe_id, calories, protein, carbs, fat, fiber, sugar, sodium) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            recipeId,
                            nutrients.ENERC_KCAL?.quantity || 0,
                            nutrients.PROCNT?.quantity || 0,
                            nutrients.CHOCDF?.quantity || 0,
                            nutrients.FAT?.quantity || 0,
                            nutrients.FIBTG?.quantity || 0,
                            nutrients.SUGAR?.quantity || 0,
                            nutrients.NA?.quantity || 0
                        ]
                    );
                }

                importedCount++;
                if (importedCount % 10 === 0) {
                    console.log(`   ✓ Imported ${importedCount} recipes...`);
                }
            } catch (error) {
                console.error(`   ✗ Error importing recipe "${recipe.title}":`, error.message);
                skippedCount++;
            }
        }

        console.log('\n✅ Import completed!');
        console.log(`   📊 Successfully imported: ${importedCount} recipes`);
        if (skippedCount > 0) {
            console.log(`   ⚠️  Skipped: ${skippedCount} recipes`);
        }

        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Import failed:', error);
        process.exit(1);
    }
}

// Run the import
importData();
