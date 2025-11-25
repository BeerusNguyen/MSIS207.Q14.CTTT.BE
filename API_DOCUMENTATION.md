# Recipe Finder API Documentation

## 📚 Swagger API Documentation

### 🌐 Access API Documentation

**Local Development:**
```
http://localhost:3000/api-docs
```

**Production (After Deployment):**
```
https://your-api-url.onrender.com/api-docs
```

---

## 🚀 Quick Start

### View API Documentation:
1. Start the backend server:
   ```bash
   npm start
   ```

2. Open browser and navigate to:
   ```
   http://localhost:3000/api-docs
   ```

3. You'll see an interactive Swagger UI with all API endpoints documented

---

## 📋 Available Endpoints

### 🏠 Root
- **GET /** - API information and available endpoints

### ❤️ Health Check
- **GET /health** - Server health status

### 🍳 Recipes
- **GET /recipes** - Get all recipes
- **GET /recipes/:id** - Get a specific recipe by ID
- **POST /recipes** - Create a new recipe
- **PUT /recipes/:id** - Update an existing recipe
- **DELETE /recipes/:id** - Delete a recipe

### 📊 Nutrition
- **GET /recipes/:id/nutrition** - Get nutrition information for a recipe

---

## 🧪 Testing Endpoints

### Using Swagger UI (Recommended)
1. Go to http://localhost:3000/api-docs
2. Click on any endpoint to expand it
3. Click "Try it out"
4. Fill in parameters (if required)
5. Click "Execute"
6. View the response

### Using PowerShell
```powershell
# Get all recipes
Invoke-RestMethod -Uri "http://localhost:3000/recipes"

# Get recipe by ID
Invoke-RestMethod -Uri "http://localhost:3000/recipes/1"

# Create new recipe
$body = @{
    title = "Test Recipe"
    ingredients = "ingredient1, ingredient2"
    servings = "4"
    instructions = "Step 1, Step 2..."
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/recipes" -Method POST -Body $body -ContentType "application/json"

# Health check
Invoke-RestMethod -Uri "http://localhost:3000/health"
```

### Using cURL
```bash
# Get all recipes
curl http://localhost:3000/recipes

# Get recipe by ID
curl http://localhost:3000/recipes/1

# Create new recipe
curl -X POST http://localhost:3000/recipes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Recipe",
    "ingredients": "ingredient1, ingredient2",
    "servings": "4",
    "instructions": "Step 1, Step 2..."
  }'

# Health check
curl http://localhost:3000/health
```

---

## 📖 API Response Examples

### Get All Recipes
**Request:**
```
GET /recipes
```

**Response:**
```json
[
  {
    "id": 1,
    "title": "Spaghetti Carbonara",
    "ingredients": "400g spaghetti, 200g pancetta, 4 eggs...",
    "servings": "4",
    "instructions": "Cook pasta, fry pancetta...",
    "created_at": "2025-11-24T10:30:00.000Z"
  }
]
```

### Get Recipe by ID
**Request:**
```
GET /recipes/1
```

**Response:**
```json
{
  "id": 1,
  "title": "Spaghetti Carbonara",
  "ingredients": "400g spaghetti, 200g pancetta, 4 eggs...",
  "servings": "4",
  "instructions": "Cook pasta, fry pancetta...",
  "created_at": "2025-11-24T10:30:00.000Z"
}
```

### Create Recipe
**Request:**
```
POST /recipes
Content-Type: application/json

{
  "title": "Chicken Curry",
  "ingredients": "500g chicken, curry powder, coconut milk",
  "servings": "4",
  "instructions": "Cook chicken, add curry powder..."
}
```

**Response:**
```json
{
  "id": 12,
  "title": "Chicken Curry",
  "ingredients": "500g chicken, curry powder, coconut milk",
  "servings": "4",
  "instructions": "Cook chicken, add curry powder...",
  "created_at": "2025-11-24T11:00:00.000Z"
}
```

### Get Nutrition
**Request:**
```
GET /recipes/1/nutrition
```

**Response:**
```json
{
  "id": 1,
  "recipe_id": 1,
  "calories": 520.00,
  "protein": 28.00,
  "carbs": 65.00,
  "fat": 18.00,
  "fiber": 3.00,
  "sugar": 2.00,
  "sodium": 680.00
}
```

### Health Check
**Request:**
```
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "message": "Server is running"
}
```

---

## 🔧 Swagger Configuration

The API uses **Swagger/OpenAPI 3.0** specification with the following features:

- ✅ Interactive API documentation
- ✅ Try-it-out functionality
- ✅ Request/Response schemas
- ✅ Example values
- ✅ Grouped endpoints by tags
- ✅ Detailed parameter descriptions

---

## 📦 Swagger Packages Used

```json
{
  "swagger-jsdoc": "^6.2.8",
  "swagger-ui-express": "^5.0.0"
}
```

---

## 🎨 Customization

The Swagger UI has been customized with:
- Hidden top bar for cleaner look
- Custom site title: "Recipe Finder API Documentation"
- Organized endpoint grouping (Recipes, Nutrition, Health)
- Multiple server configurations (Development & Production)

---

## 🌍 Deployment

When deploying to production:

1. Update the server URL in `server.js`:
   ```javascript
   servers: [
     {
       url: 'https://your-api-url.onrender.com',
       description: 'Production Server'
     }
   ]
   ```

2. The Swagger documentation will be automatically available at:
   ```
   https://your-api-url.onrender.com/api-docs
   ```

---

## 💡 Tips

1. **Always test in Swagger first** - It's the easiest way to understand the API
2. **Use the "Try it out" button** - No need for external tools
3. **Check response schemas** - Know what data structure to expect
4. **Review examples** - Copy-paste ready request bodies
5. **Export OpenAPI spec** - Available in Swagger UI for integration with other tools

---

## 📞 Support

For API issues or questions:
- Check the Swagger documentation at `/api-docs`
- Review error messages in server logs
- Test endpoints with Swagger's interactive UI

---

**Last Updated:** November 24, 2025  
**API Version:** 1.0.0  
**Documentation:** Swagger/OpenAPI 3.0
