require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { pool, initDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Swagger Configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Recipe Finder API',
            version: '1.0.0',
            description: 'A comprehensive REST API for Recipe Finder and Meal Planner application',
            contact: {
                name: 'API Support',
                email: 'support@recipefinder.com'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development Server'
            },
            {
                url: 'https://your-production-url.onrender.com',
                description: 'Production Server'
            }
        ],
        tags: [
            {
                name: 'Recipes',
                description: 'Recipe management endpoints'
            },
            {
                name: 'Nutrition',
                description: 'Nutrition information endpoints'
            },
            {
                name: 'Health',
                description: 'Server health check'
            }
        ]
    },
    apis: ['./server/server.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Recipe Finder API Documentation'
}));

// Initialize database
initDatabase();

// Root endpoint - redirect to API documentation
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Recipe Finder API',
        version: '1.0.0',
        documentation: '/api-docs',
        endpoints: {
            health: '/health',
            recipes: '/recipes',
            recipeById: '/recipes/:id',
            nutrition: '/recipes/:id/nutrition'
        }
    });
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Recipe:
 *       type: object
 *       required:
 *         - title
 *         - ingredients
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated recipe ID
 *         title:
 *           type: string
 *           description: Recipe title
 *         ingredients:
 *           type: string
 *           description: List of ingredients
 *         servings:
 *           type: string
 *           description: Number of servings
 *         instructions:
 *           type: string
 *           description: Cooking instructions
 *         image:
 *           type: string
 *           description: Image URL
 *         category:
 *           type: string
 *           description: Recipe category
 *         area:
 *           type: string
 *           description: Cuisine area
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *       example:
 *         id: 1
 *         title: "Spaghetti Carbonara"
 *         ingredients: "400g spaghetti, 200g pancetta, 4 eggs, 100g parmesan"
 *         servings: "4"
 *         instructions: "Cook pasta, fry pancetta, mix with eggs..."
 *     Nutrition:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         recipe_id:
 *           type: integer
 *         calories:
 *           type: number
 *           format: float
 *         protein:
 *           type: number
 *           format: float
 *         carbs:
 *           type: number
 *           format: float
 *         fat:
 *           type: number
 *           format: float
 *         fiber:
 *           type: number
 *           format: float
 *         sugar:
 *           type: number
 *           format: float
 *         sodium:
 *           type: number
 *           format: float
 *       example:
 *         recipe_id: 1
 *         calories: 520
 *         protein: 28
 *         carbs: 65
 *         fat: 18
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *       example:
 *         error: "Recipe not found"
 */

/**
 * @swagger
 * /recipes:
 *   get:
 *     summary: Get all recipes
 *     tags: [Recipes]
 *     description: Retrieve a list of all recipes from the database
 *     responses:
 *       200:
 *         description: List of all recipes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Recipe'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /recipes/{id}:
 *   get:
 *     summary: Get a recipe by ID
 *     tags: [Recipes]
 *     description: Retrieve a single recipe by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recipe ID
 *     responses:
 *       200:
 *         description: Recipe details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Recipe'
 *       404:
 *         description: Recipe not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /recipes:
 *   post:
 *     summary: Create a new recipe
 *     tags: [Recipes]
 *     description: Add a new recipe to the database
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - ingredients
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Chicken Stir Fry"
 *               ingredients:
 *                 type: string
 *                 example: "500g chicken, 2 peppers, soy sauce"
 *               servings:
 *                 type: string
 *                 example: "4"
 *               instructions:
 *                 type: string
 *                 example: "Cut chicken, stir fry with vegetables..."
 *               nutrition:
 *                 type: object
 *                 properties:
 *                   totalNutrients:
 *                     type: object
 *     responses:
 *       201:
 *         description: Recipe created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Recipe'
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /recipes/{id}:
 *   put:
 *     summary: Update a recipe
 *     tags: [Recipes]
 *     description: Update an existing recipe by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recipe ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               ingredients:
 *                 type: string
 *               servings:
 *                 type: string
 *               instructions:
 *                 type: string
 *     responses:
 *       200:
 *         description: Recipe updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Recipe'
 *       404:
 *         description: Recipe not found
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /recipes/{id}:
 *   delete:
 *     summary: Delete a recipe
 *     tags: [Recipes]
 *     description: Remove a recipe from the database
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recipe ID
 *     responses:
 *       200:
 *         description: Recipe deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Recipe deleted successfully"
 *       404:
 *         description: Recipe not found
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /recipes/{id}/nutrition:
 *   get:
 *     summary: Get nutrition information for a recipe
 *     tags: [Nutrition]
 *     description: Retrieve nutritional data for a specific recipe
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recipe ID
 *     responses:
 *       200:
 *         description: Nutrition data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Nutrition'
 *       404:
 *         description: Nutrition data not found
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     description: Check if the server is running
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 message:
 *                   type: string
 *                   example: "Server is running"
 */
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});

