/**
 * Script to check and display nutrition data status
 * Run: node update-nutrition.js
 */

const { pool } = require('./server/db');

async function checkNutritionStatus() {
    try {
        console.log('📊 Checking nutrition data status...\n');

        // Get all recipes
        const [recipes] = await pool.query('SELECT id, title FROM recipes');
        console.log(`Total recipes: ${recipes.length}`);

        // Get recipes with nutrition
        const [withNutrition] = await pool.query(`
            SELECT r.id, r.title, n.calories, n.protein, n.carbs, n.fat
            FROM recipes r
            INNER JOIN nutrition n ON r.id = n.recipe_id
        `);
        console.log(`Recipes with nutrition: ${withNutrition.length}`);

        // Get recipes without nutrition
        const [withoutNutrition] = await pool.query(`
            SELECT r.id, r.title
            FROM recipes r
            LEFT JOIN nutrition n ON r.id = n.recipe_id
            WHERE n.id IS NULL
        `);
        console.log(`Recipes without nutrition: ${withoutNutrition.length}\n`);

        if (withNutrition.length > 0) {
            console.log('✅ Recipes WITH nutrition:');
            withNutrition.forEach(r => {
                console.log(`  - [${r.id}] ${r.title}: ${r.calories} cal, ${r.protein}g protein, ${r.carbs}g carbs, ${r.fat}g fat`);
            });
            console.log('');
        }

        if (withoutNutrition.length > 0) {
            console.log('⚠️ Recipes WITHOUT nutrition:');
            withoutNutrition.forEach(r => {
                console.log(`  - [${r.id}] ${r.title}`);
            });
            console.log('\n💡 These recipes will use estimated nutrition based on ingredients.');
            console.log('   To get accurate nutrition, search and save them again from the app.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkNutritionStatus();
