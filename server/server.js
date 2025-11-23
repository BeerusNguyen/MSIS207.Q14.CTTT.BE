const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { pool, initDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize database
initDatabase();

// GET all recipes
app.get('/recipes', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM recipes ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching recipes:', error);
        res.status(500).json({ error: 'Failed to fetch recipes' });
    }
});

// GET single recipe by ID
app.get('/recipes/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM recipes WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching recipe:', error);
        res.status(500).json({ error: 'Failed to fetch recipe' });
    }
});

// POST new recipe
app.post('/recipes', async (req, res) => {
    try {
        const { title, ingredients, servings, instructions, nutrition } = req.body;
        
        // Insert recipe
        const [result] = await pool.query(
            'INSERT INTO recipes (title, ingredients, servings, instructions) VALUES (?, ?, ?, ?)',
            [title, ingredients, servings, instructions]
        );
        
        const recipeId = result.insertId;
        
        // Insert nutrition data if provided
        if (nutrition && nutrition.totalNutrients) {
            const nutrients = nutrition.totalNutrients;
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
        
        // Get the created recipe
        const [rows] = await pool.query('SELECT * FROM recipes WHERE id = ?', [recipeId]);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error creating recipe:', error);
        res.status(500).json({ error: 'Failed to create recipe' });
    }
});

// PUT update recipe
app.put('/recipes/:id', async (req, res) => {
    try {
        const { title, ingredients, servings, instructions } = req.body;
        
        await pool.query(
            'UPDATE recipes SET title = ?, ingredients = ?, servings = ?, instructions = ? WHERE id = ?',
            [title, ingredients, servings, instructions, req.params.id]
        );
        
        const [rows] = await pool.query('SELECT * FROM recipes WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error updating recipe:', error);
        res.status(500).json({ error: 'Failed to update recipe' });
    }
});

// DELETE recipe
app.delete('/recipes/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM recipes WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        res.json({ message: 'Recipe deleted successfully' });
    } catch (error) {
        console.error('Error deleting recipe:', error);
        res.status(500).json({ error: 'Failed to delete recipe' });
    }
});

// GET nutrition for a recipe
app.get('/recipes/:id/nutrition', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM nutrition WHERE recipe_id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Nutrition data not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching nutrition:', error);
        res.status(500).json({ error: 'Failed to fetch nutrition data' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
