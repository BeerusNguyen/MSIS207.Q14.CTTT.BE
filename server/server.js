require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { pool, initDatabase } = require('./db');
const authRoutes = require('./routes/auth');
const authenticateToken = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Swagger Configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Recipe Finder API',
            version: '2.0.0',
            description: 'REST API for Recipe Finder and Meal Planner application with 20 endpoints',
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
                name: 'Authentication',
                description: 'User authentication and authorization (5 endpoints)'
            },
            {
                name: 'Recipes',
                description: 'Recipe management - Get recipes (2 endpoints)'
            },
            {
                name: 'Favorites',
                description: 'Manage favorite recipes (3 endpoints)'
            },
            {
                name: 'Meal Planner',
                description: 'Plan meals for different days (4 endpoints)'
            },
            {
                name: 'Shopping List',
                description: 'Manage shopping list items (5 endpoints)'
            },
            {
                name: 'Statistics',
                description: 'Nutrition summary (1 endpoint)'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    },
    apis: ['./server/server.js', './server/routes/*.js']
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

// Routes
app.use('/api/auth', authRoutes);

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
 *     summary: Get all recipes for the authenticated user
 *     tags: [Recipes]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve a list of all recipes saved by the current user
 *     responses:
 *       200:
 *         description: List of user's recipes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Recipe'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET all recipes for authenticated user (with nutrition)
app.get('/recipes', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT r.*, n.calories, n.protein, n.carbs, n.fat, n.fiber, n.sugar, n.sodium
             FROM recipes r
             LEFT JOIN nutrition n ON r.id = n.recipe_id
             WHERE r.user_id = ? 
             ORDER BY r.created_at DESC`,
            [req.user.id]
        );
        
        // Format nutrition as object for each recipe
        const recipesWithNutrition = rows.map(row => {
            const { calories, protein, carbs, fat, fiber, sugar, sodium, ...recipe } = row;
            return {
                ...recipe,
                nutrition: calories !== null ? { calories, protein, carbs, fat, fiber, sugar, sodium } : null
            };
        });
        
        res.json(recipesWithNutrition);
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
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve a single recipe by its ID (must be owned by user)
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
 *       403:
 *         description: Not authorized to access this recipe
 *       404:
 *         description: Recipe not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */
// GET single recipe by ID (with nutrition)
app.get('/recipes/:id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT r.*, n.calories, n.protein, n.carbs, n.fat, n.fiber, n.sugar, n.sodium
             FROM recipes r
             LEFT JOIN nutrition n ON r.id = n.recipe_id
             WHERE r.id = ? AND r.user_id = ?`, 
            [req.params.id, req.user.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        
        const { calories, protein, carbs, fat, fiber, sugar, sodium, ...recipe } = rows[0];
        const recipeWithNutrition = {
            ...recipe,
            nutrition: calories !== null ? { calories, protein, carbs, fat, fiber, sugar, sodium } : null
        };
        
        res.json(recipeWithNutrition);
    } catch (error) {
        console.error('Error fetching recipe:', error);
        res.status(500).json({ error: 'Failed to fetch recipe' });
    }
});

// POST new recipe (internal use - not exposed in Swagger)
app.post('/recipes', authenticateToken, async (req, res) => {
    try {
        const { title, ingredients, servings, instructions, image, nutrition } = req.body;
        
        console.log('📝 Received POST /recipes:');
        console.log('  - User ID:', req.user.id);
        console.log('  - Title:', title);
        console.log('  - Image:', image);
        
        // Check if user already saved this recipe
        const [existing] = await pool.query(
            'SELECT id FROM recipes WHERE LOWER(title) = LOWER(?) AND user_id = ?',
            [title, req.user.id]
        );
        
        if (existing.length > 0) {
            return res.status(409).json({ 
                error: 'Recipe already exists',
                message: 'You have already saved this recipe',
                existingId: existing[0].id
            });
        }
        
        // Insert recipe with user_id
        const [result] = await pool.query(
            'INSERT INTO recipes (title, ingredients, servings, instructions, image, user_id) VALUES (?, ?, ?, ?, ?, ?)',
            [title, ingredients, servings, instructions, image || null, req.user.id]
        );
        
        const recipeId = result.insertId;
        console.log('✅ Inserted recipe ID:', recipeId, 'for user:', req.user.id);
        
        // Insert nutrition data if provided (support both Spoonacular and Edamam formats)
        if (nutrition) {
            let nutritionValues = {
                calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0
            };
            
            // Format 1: Direct values from Spoonacular (calories, protein, carbs, fat, etc.)
            if (nutrition.calories !== undefined) {
                nutritionValues = {
                    calories: nutrition.calories || 0,
                    protein: nutrition.protein || 0,
                    carbs: nutrition.carbs || 0,
                    fat: nutrition.fat || 0,
                    fiber: nutrition.fiber || 0,
                    sugar: nutrition.sugar || 0,
                    sodium: nutrition.sodium || 0
                };
            }
            // Format 2: Edamam format (totalNutrients)
            else if (nutrition.totalNutrients) {
                const nutrients = nutrition.totalNutrients;
                nutritionValues = {
                    calories: nutrients.ENERC_KCAL?.quantity || 0,
                    protein: nutrients.PROCNT?.quantity || 0,
                    carbs: nutrients.CHOCDF?.quantity || 0,
                    fat: nutrients.FAT?.quantity || 0,
                    fiber: nutrients.FIBTG?.quantity || 0,
                    sugar: nutrients.SUGAR?.quantity || 0,
                    sodium: nutrients.NA?.quantity || 0
                };
            }
            
            // Only insert if we have some nutrition data
            if (nutritionValues.calories > 0 || nutritionValues.protein > 0) {
                await pool.query(
                    `INSERT INTO nutrition (recipe_id, calories, protein, carbs, fat, fiber, sugar, sodium) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        recipeId,
                        nutritionValues.calories,
                        nutritionValues.protein,
                        nutritionValues.carbs,
                        nutritionValues.fat,
                        nutritionValues.fiber,
                        nutritionValues.sugar,
                        nutritionValues.sodium
                    ]
                );
                console.log('✅ Inserted nutrition for recipe:', recipeId);
            }
        }
        
        // Get the created recipe
        const [rows] = await pool.query('SELECT * FROM recipes WHERE id = ?', [recipeId]);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error creating recipe:', error);
        res.status(500).json({ error: 'Failed to create recipe' });
    }
});

// PUT update recipe (internal use - not exposed in Swagger)
app.put('/recipes/:id', authenticateToken, async (req, res) => {
    try {
        const { title, ingredients, servings, instructions } = req.body;
        
        await pool.query(
            'UPDATE recipes SET title = ?, ingredients = ?, servings = ?, instructions = ? WHERE id = ? AND user_id = ?',
            [title, ingredients, servings, instructions, req.params.id, req.user.id]
        );
        
        const [rows] = await pool.query(
            'SELECT * FROM recipes WHERE id = ? AND user_id = ?', 
            [req.params.id, req.user.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error updating recipe:', error);
        res.status(500).json({ error: 'Failed to update recipe' });
    }
});

// DELETE recipe (internal use - not exposed in Swagger)
app.delete('/recipes/:id', authenticateToken, async (req, res) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM recipes WHERE id = ? AND user_id = ?', 
            [req.params.id, req.user.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        res.json({ message: 'Recipe deleted successfully' });
    } catch (error) {
        console.error('Error deleting recipe:', error);
        res.status(500).json({ error: 'Failed to delete recipe' });
    }
});

// GET nutrition for a recipe (internal use - not exposed in Swagger)
app.get('/recipes/:id/nutrition', authenticateToken, async (req, res) => {
    try {
        // Verify recipe belongs to user
        const [recipeRows] = await pool.query(
            'SELECT id FROM recipes WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        
        if (recipeRows.length === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        
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

// Health check endpoint (internal use - not exposed in Swagger)
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// ============================================
// SEARCH ENDPOINTS (internal use - not exposed in Swagger)
// ============================================

// Search recipes by name (internal use)
app.get('/api/search/recipes', authenticateToken, async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;
        const [rows] = await pool.query(
            `SELECT * FROM recipes WHERE user_id = ? AND title LIKE ? ORDER BY created_at DESC LIMIT ?`,
            [req.user.id, `%${q || ''}%`, parseInt(limit)]
        );
        res.json({ results: rows, total: rows.length });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Search recipes by ingredients (internal use)
app.get('/api/search/ingredients', authenticateToken, async (req, res) => {
    try {
        const { ingredients } = req.query;
        if (!ingredients) {
            return res.json({ results: [], total: 0 });
        }
        
        const ingredientList = ingredients.split(',').map(i => i.trim());
        let query = `SELECT * FROM recipes WHERE user_id = ?`;
        const params = [req.user.id];
        
        ingredientList.forEach(ingredient => {
            query += ` AND LOWER(ingredients) LIKE LOWER(?)`;
            params.push(`%${ingredient}%`);
        });
        
        const [rows] = await pool.query(query, params);
        res.json({ results: rows, total: rows.length });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// ============================================
// FAVORITES ENDPOINTS (3 endpoints)
// ============================================

/**
 * @swagger
 * /api/favorites:
 *   get:
 *     summary: Get user's favorite recipes
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of favorite recipes
 */
app.get('/api/favorites', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, recipe_id, recipe_title as title, recipe_image as image, source_type, created_at as favorited_at 
             FROM favorites 
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching favorites:', error);
        res.status(500).json({ error: 'Failed to get favorites' });
    }
});

/**
 * @swagger
 * /api/favorites:
 *   post:
 *     summary: Add recipe to favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipeId
 *               - title
 *             properties:
 *               recipeId:
 *                 type: string
 *               title:
 *                 type: string
 *               image:
 *                 type: string
 *               sourceType:
 *                 type: string
 *                 enum: [local, spoonacular, themealdb]
 *     responses:
 *       201:
 *         description: Added to favorites
 *       400:
 *         description: Already in favorites
 */
app.post('/api/favorites', authenticateToken, async (req, res) => {
    try {
        const { recipeId, title, image, sourceType = 'spoonacular' } = req.body;
        
        if (!recipeId || !title) {
            return res.status(400).json({ error: 'Recipe ID and title are required' });
        }
        
        await pool.query(
            `INSERT INTO favorites (user_id, recipe_id, recipe_title, recipe_image, source_type) VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, recipeId.toString(), title, image || null, sourceType]
        );
        res.status(201).json({ message: 'Added to favorites', recipeId: recipeId.toString() });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Already in favorites' });
        }
        console.error('Error adding favorite:', error);
        res.status(500).json({ error: 'Failed to add favorite' });
    }
});

/**
 * @swagger
 * /api/favorites/{recipeId}:
 *   delete:
 *     summary: Remove recipe from favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Removed from favorites
 */
app.delete('/api/favorites/:recipeId', authenticateToken, async (req, res) => {
    try {
        const { recipeId } = req.params;
        await pool.query(
            `DELETE FROM favorites WHERE user_id = ? AND recipe_id = ?`,
            [req.user.id, recipeId]
        );
        res.json({ message: 'Removed from favorites' });
    } catch (error) {
        console.error('Error removing favorite:', error);
        res.status(500).json({ error: 'Failed to remove favorite' });
    }
});

// ============================================
// MEAL PLANNER ENDPOINTS (4 endpoints)
// ============================================

/**
 * @swagger
 * /api/meal-plans:
 *   get:
 *     summary: Get user's meal plans
 *     tags: [Meal Planner]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of meal plans
 */
app.get('/api/meal-plans', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = `SELECT mp.*, DATE_FORMAT(mp.date, '%Y-%m-%d') as date, r.title as recipe_title, r.image as recipe_image 
                     FROM meal_plans mp 
                     LEFT JOIN recipes r ON mp.recipe_id = r.id 
                     WHERE mp.user_id = ?`;
        const params = [req.user.id];
        
        if (startDate && endDate) {
            query += ` AND mp.date BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }
        
        query += ` ORDER BY mp.date ASC, FIELD(mp.meal_type, 'breakfast', 'lunch', 'dinner', 'snack')`;
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching meal plans:', error);
        res.status(500).json({ error: 'Failed to get meal plans' });
    }
});

/**
 * @swagger
 * /api/meal-plans:
 *   post:
 *     summary: Create a meal plan
 *     tags: [Meal Planner]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - meal_type
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-01"
 *               meal_type:
 *                 type: string
 *                 enum: [breakfast, lunch, dinner, snack]
 *               recipe_id:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Meal plan created
 */
app.post('/api/meal-plans', authenticateToken, async (req, res) => {
    try {
        const { date, meal_type, recipe_id, notes } = req.body;
        console.log('📅 Creating meal plan with date:', date, 'meal_type:', meal_type);
        const [result] = await pool.query(
            `INSERT INTO meal_plans (user_id, date, meal_type, recipe_id, notes) VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, date, meal_type, recipe_id || null, notes || null]
        );
        console.log('✅ Meal plan created with ID:', result.insertId);
        res.status(201).json({ 
            id: result.insertId, 
            message: 'Meal plan created',
            date,
            meal_type
        });
    } catch (error) {
        console.error('Error creating meal plan:', error);
        res.status(500).json({ error: 'Failed to create meal plan' });
    }
});

/**
 * @swagger
 * /api/meal-plans/{id}:
 *   put:
 *     summary: Update a meal plan
 *     tags: [Meal Planner]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               meal_type:
 *                 type: string
 *                 enum: [breakfast, lunch, dinner, snack]
 *               recipe_id:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Meal plan updated
 */
app.put('/api/meal-plans/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { date, meal_type, recipe_id, notes } = req.body;
        
        await pool.query(
            `UPDATE meal_plans SET date = ?, meal_type = ?, recipe_id = ?, notes = ? 
             WHERE id = ? AND user_id = ?`,
            [date, meal_type, recipe_id, notes, id, req.user.id]
        );
        res.json({ message: 'Meal plan updated' });
    } catch (error) {
        console.error('Error updating meal plan:', error);
        res.status(500).json({ error: 'Failed to update meal plan' });
    }
});

/**
 * @swagger
 * /api/meal-plans/{id}:
 *   delete:
 *     summary: Delete a meal plan
 *     tags: [Meal Planner]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Meal plan deleted
 */
app.delete('/api/meal-plans/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            `DELETE FROM meal_plans WHERE id = ? AND user_id = ?`,
            [id, req.user.id]
        );
        res.json({ message: 'Meal plan deleted' });
    } catch (error) {
        console.error('Error deleting meal plan:', error);
        res.status(500).json({ error: 'Failed to delete meal plan' });
    }
});

// ============================================
// SHOPPING LIST ENDPOINTS (5 endpoints)
// ============================================

/**
 * @swagger
 * /api/shopping-list:
 *   get:
 *     summary: Get user's shopping list
 *     tags: [Shopping List]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shopping list items
 */
app.get('/api/shopping-list', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT sl.*, r.title as recipe_title 
             FROM shopping_list sl 
             LEFT JOIN recipes r ON sl.recipe_id = r.id 
             WHERE sl.user_id = ? 
             ORDER BY sl.is_checked ASC, sl.created_at DESC`,
            [req.user.id]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching shopping list:', error);
        res.status(500).json({ error: 'Failed to get shopping list' });
    }
});

/**
 * @swagger
 * /api/shopping-list:
 *   post:
 *     summary: Add item to shopping list
 *     tags: [Shopping List]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ingredient
 *             properties:
 *               ingredient:
 *                 type: string
 *                 example: "Chicken breast"
 *               quantity:
 *                 type: string
 *                 example: "500g"
 *               recipe_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Item added
 */
app.post('/api/shopping-list', authenticateToken, async (req, res) => {
    try {
        const { ingredient, quantity, recipe_id } = req.body;
        const [result] = await pool.query(
            `INSERT INTO shopping_list (user_id, ingredient, quantity, recipe_id) VALUES (?, ?, ?, ?)`,
            [req.user.id, ingredient, quantity || null, recipe_id || null]
        );
        res.status(201).json({ 
            id: result.insertId, 
            message: 'Item added',
            ingredient,
            quantity
        });
    } catch (error) {
        console.error('Error adding to shopping list:', error);
        res.status(500).json({ error: 'Failed to add item' });
    }
});

/**
 * @swagger
 * /api/shopping-list/{id}/toggle:
 *   patch:
 *     summary: Toggle item checked status
 *     tags: [Shopping List]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Item toggled
 */
app.patch('/api/shopping-list/:id/toggle', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            `UPDATE shopping_list SET is_checked = NOT is_checked WHERE id = ? AND user_id = ?`,
            [id, req.user.id]
        );
        res.json({ message: 'Item toggled' });
    } catch (error) {
        console.error('Error toggling item:', error);
        res.status(500).json({ error: 'Failed to toggle item' });
    }
});

// Update shopping list item (internal use - not exposed in Swagger)
app.put('/api/shopping-list/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { ingredient, quantity } = req.body;
        
        await pool.query(
            `UPDATE shopping_list SET ingredient = ?, quantity = ? WHERE id = ? AND user_id = ?`,
            [ingredient, quantity || '', id, req.user.id]
        );
        
        const [rows] = await pool.query(
            `SELECT * FROM shopping_list WHERE id = ? AND user_id = ?`,
            [id, req.user.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

/**
 * @swagger
 * /api/shopping-list/clear-checked:
 *   delete:
 *     summary: Clear all checked items
 *     tags: [Shopping List]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Checked items cleared
 */
app.delete('/api/shopping-list/clear-checked', authenticateToken, async (req, res) => {
    try {
        const [result] = await pool.query(
            `DELETE FROM shopping_list WHERE user_id = ? AND is_checked = 1`,
            [req.user.id]
        );
        res.json({ message: 'Checked items cleared', deletedCount: result.affectedRows });
    } catch (error) {
        console.error('Error clearing items:', error);
        res.status(500).json({ error: 'Failed to clear items' });
    }
});

/**
 * @swagger
 * /api/shopping-list/{id}:
 *   delete:
 *     summary: Remove item from shopping list
 *     tags: [Shopping List]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Item removed
 */
app.delete('/api/shopping-list/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            `DELETE FROM shopping_list WHERE id = ? AND user_id = ?`,
            [id, req.user.id]
        );
        res.json({ message: 'Item removed' });
    } catch (error) {
        console.error('Error removing item:', error);
        res.status(500).json({ error: 'Failed to remove item' });
    }
});

// ============================================
// CATEGORIES ENDPOINTS (internal use - not exposed in Swagger)
// ============================================

// Get all recipe categories (internal use)
app.get('/api/categories', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT c.*, COUNT(rc.recipe_id) as recipe_count 
             FROM categories c 
             LEFT JOIN recipe_categories rc ON c.id = rc.category_id 
             GROUP BY c.id 
             ORDER BY c.name ASC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to get categories' });
    }
});

// Get recipes by category (internal use)
app.get('/api/categories/:id/recipes', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            `SELECT r.* FROM recipes r 
             INNER JOIN recipe_categories rc ON r.id = rc.recipe_id 
             WHERE rc.category_id = ? AND r.user_id = ?`,
            [id, req.user.id]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching recipes by category:', error);
        res.status(500).json({ error: 'Failed to get recipes' });
    }
});

// Assign category to recipe (internal use)
app.post('/api/recipes/:id/category', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { category_id } = req.body;
        
        // Verify recipe belongs to user
        const [recipe] = await pool.query(
            'SELECT id FROM recipes WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );
        if (recipe.length === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        
        await pool.query(
            `INSERT IGNORE INTO recipe_categories (recipe_id, category_id) VALUES (?, ?)`,
            [id, category_id]
        );
        res.status(201).json({ message: 'Category assigned' });
    } catch (error) {
        console.error('Error assigning category:', error);
        res.status(500).json({ error: 'Failed to assign category' });
    }
});

// ============================================
// RATINGS ENDPOINTS (internal use - not exposed in Swagger)
// ============================================

// Get ratings for a recipe (internal use)
app.get('/api/recipes/:id/ratings', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            `SELECT r.*, u.username 
             FROM ratings r 
             INNER JOIN users u ON r.user_id = u.id 
             WHERE r.recipe_id = ? 
             ORDER BY r.created_at DESC`,
            [id]
        );
        const [avg] = await pool.query(
            `SELECT AVG(rating) as average, COUNT(*) as total FROM ratings WHERE recipe_id = ?`,
            [id]
        );
        res.json({ 
            ratings: rows, 
            average: parseFloat(avg[0].average) || 0, 
            total: avg[0].total 
        });
    } catch (error) {
        console.error('Error fetching ratings:', error);
        res.status(500).json({ error: 'Failed to get ratings' });
    }
});

// Rate a recipe (internal use)
app.post('/api/recipes/:id/ratings', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, review } = req.body;
        
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }
        
        // Check if user already rated
        const [existing] = await pool.query(
            `SELECT id FROM ratings WHERE user_id = ? AND recipe_id = ?`,
            [req.user.id, id]
        );
        
        if (existing.length > 0) {
            // Update existing rating
            await pool.query(
                `UPDATE ratings SET rating = ?, review = ? WHERE user_id = ? AND recipe_id = ?`,
                [rating, review || null, req.user.id, id]
            );
            return res.json({ message: 'Rating updated' });
        }
        
        // Create new rating
        await pool.query(
            `INSERT INTO ratings (user_id, recipe_id, rating, review) VALUES (?, ?, ?, ?)`,
            [req.user.id, id, rating, review || null]
        );
        res.status(201).json({ message: 'Rating submitted' });
    } catch (error) {
        console.error('Error submitting rating:', error);
        res.status(500).json({ error: 'Failed to submit rating' });
    }
});

// ============================================
// USER PROFILE ENDPOINTS (internal use - not exposed in Swagger)
// ============================================

// Get user profile with statistics (internal use)
app.get('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const [user] = await pool.query(
            `SELECT id, username, email, created_at FROM users WHERE id = ?`,
            [req.user.id]
        );
        
        const [recipeCount] = await pool.query(
            `SELECT COUNT(*) as count FROM recipes WHERE user_id = ?`,
            [req.user.id]
        );
        
        const [favoriteCount] = await pool.query(
            `SELECT COUNT(*) as count FROM favorites WHERE user_id = ?`,
            [req.user.id]
        );
        
        const [mealPlanCount] = await pool.query(
            `SELECT COUNT(*) as count FROM meal_plans WHERE user_id = ?`,
            [req.user.id]
        );
        
        res.json({
            ...user[0],
            stats: {
                recipes: recipeCount[0].count,
                favorites: favoriteCount[0].count,
                mealPlans: mealPlanCount[0].count
            }
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Update user profile (internal use)
app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const { username, email } = req.body;
        await pool.query(
            `UPDATE users SET username = ?, email = ? WHERE id = ?`,
            [username, email, req.user.id]
        );
        res.json({ message: 'Profile updated' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Change user password (internal use)
const bcrypt = require('bcryptjs');
app.post('/api/users/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        // Get current password hash
        const [rows] = await pool.query(
            `SELECT password FROM users WHERE id = ?`,
            [req.user.id]
        );
        
        const validPassword = await bcrypt.compare(currentPassword, rows[0].password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        
        // Hash new password and update
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            `UPDATE users SET password = ? WHERE id = ?`,
            [hashedPassword, req.user.id]
        );
        
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// ============================================
// STATISTICS ENDPOINTS
// ============================================

// Get user dashboard statistics (internal use - not exposed in Swagger)
app.get('/api/stats/dashboard', authenticateToken, async (req, res) => {
    try {
        const [recipes] = await pool.query(
            `SELECT COUNT(*) as total FROM recipes WHERE user_id = ?`,
            [req.user.id]
        );
        const [favorites] = await pool.query(
            `SELECT COUNT(*) as total FROM favorites WHERE user_id = ?`,
            [req.user.id]
        );
        const [mealPlans] = await pool.query(
            `SELECT COUNT(*) as total FROM meal_plans WHERE user_id = ? AND date >= CURDATE()`,
            [req.user.id]
        );
        const [shoppingItems] = await pool.query(
            `SELECT COUNT(*) as total, SUM(is_checked) as checked FROM shopping_list WHERE user_id = ?`,
            [req.user.id]
        );
        const [recentRecipes] = await pool.query(
            `SELECT * FROM recipes WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`,
            [req.user.id]
        );
        const [upcomingMeals] = await pool.query(
            `SELECT mp.*, r.title as recipe_title 
             FROM meal_plans mp 
             LEFT JOIN recipes r ON mp.recipe_id = r.id 
             WHERE mp.user_id = ? AND mp.date >= CURDATE() 
             ORDER BY mp.date ASC LIMIT 5`,
            [req.user.id]
        );
        
        res.json({
            totalRecipes: recipes[0].total,
            totalFavorites: favorites[0].total,
            upcomingMeals: mealPlans[0].total,
            shoppingList: {
                total: shoppingItems[0].total || 0,
                checked: shoppingItems[0].checked || 0
            },
            recentRecipes: recentRecipes,
            upcomingMealPlans: upcomingMeals
        });
    } catch (error) {
        console.error('Error fetching dashboard:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

/**
 * @swagger
 * /api/stats/nutrition-summary:
 *   get:
 *     summary: Get nutrition summary for a date
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date for nutrition summary (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Nutrition summary for the day
 */
app.get('/api/stats/nutrition-summary', authenticateToken, async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];
        
        const [meals] = await pool.query(
            `SELECT mp.*, r.title, r.ingredients, n.calories, n.protein, n.carbs, n.fat 
             FROM meal_plans mp 
             LEFT JOIN recipes r ON mp.recipe_id = r.id 
             LEFT JOIN nutrition n ON r.id = n.recipe_id 
             WHERE mp.user_id = ? AND mp.date = ?`,
            [req.user.id, targetDate]
        );
        
        // Calculate totals
        const totals = meals.reduce((acc, meal) => ({
            calories: acc.calories + (meal.calories || 0),
            protein: acc.protein + (meal.protein || 0),
            carbs: acc.carbs + (meal.carbs || 0),
            fat: acc.fat + (meal.fat || 0)
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
        
        res.json({
            date: targetDate,
            meals: meals,
            totalMeals: meals.length,
            nutrition: totals
        });
    } catch (error) {
        console.error('Error fetching nutrition summary:', error);
        res.status(500).json({ error: 'Failed to get nutrition summary' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`📊 Total API Endpoints: 20`);
});

