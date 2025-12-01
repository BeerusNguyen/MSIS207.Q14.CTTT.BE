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

## 📊 API Statistics

| Category | Endpoints | Description |
|----------|-----------|-------------|
| Authentication | 5 | Register, Login, Get User, Forgot Password, Reset Password |
| Recipes | 2 | Get all recipes, Get recipe by ID |
| Favorites | 3 | Manage favorite recipes |
| Meal Planner | 4 | Manage meal plans |
| Shopping List | 5 | Manage shopping list |
| Statistics | 1 | Nutrition summary |
| **Total** | **20** | **All API Endpoints** |

---

## 📋 Available Endpoints

### 🔐 Authentication
- **POST /api/auth/register** - Register a new user
- **POST /api/auth/login** - Login user
- **GET /api/auth/me** - Get current user info (requires auth)
- **POST /api/auth/forgot-password** - Request password reset email
- **POST /api/auth/reset-password** - Reset password with token

### 🍳 Recipes
- **GET /recipes** - Get all recipes for user (requires auth)
- **GET /recipes/:id** - Get a specific recipe by ID (requires auth)

### ❤️ Favorites
- **GET /api/favorites** - Get user's favorite recipes (requires auth)
- **POST /api/favorites** - Add recipe to favorites (requires auth)
- **DELETE /api/favorites/:recipeId** - Remove from favorites (requires auth)

### 📅 Meal Planner
- **GET /api/meal-plans** - Get meal plans with optional date filter (requires auth)
- **POST /api/meal-plans** - Create a meal plan (requires auth)
- **PUT /api/meal-plans/:id** - Update a meal plan (requires auth)
- **DELETE /api/meal-plans/:id** - Delete a meal plan (requires auth)

### 🛒 Shopping List
- **GET /api/shopping-list** - Get shopping list (requires auth)
- **POST /api/shopping-list** - Add item to list (requires auth)
- **PATCH /api/shopping-list/:id/toggle** - Toggle item checked status (requires auth)
- **DELETE /api/shopping-list/:id** - Remove item (requires auth)
- **DELETE /api/shopping-list/clear-checked** - Clear all checked items (requires auth)

### 📊 Statistics
- **GET /api/stats/nutrition-summary** - Get nutrition summary for a date (requires auth)

---

## 🧪 Testing Endpoints

### Using Swagger UI (Recommended)
1. Go to http://localhost:3000/api-docs
2. Click on any endpoint to expand it
3. Click "Try it out"
4. Fill in parameters (if required)
5. Click "Execute"
6. View the response

### Authentication Headers
Most endpoints require authentication. Use the Bearer token:
```
Authorization: Bearer <your_jwt_token>
```

### Using PowerShell
```powershell
# Register new user
$body = @{
    username = "testuser"
    email = "test@example.com"
    password = "Test123456"
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -Body $body -ContentType "application/json"

# Login
$body = @{
    email = "test@example.com"
    password = "Test123456"
} | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
$token = $response.token

# Get all recipes (with auth)
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3000/recipes" -Headers $headers

# Get favorites (with auth)
Invoke-RestMethod -Uri "http://localhost:3000/api/favorites" -Headers $headers

# Get meal plans (with auth)
Invoke-RestMethod -Uri "http://localhost:3000/api/meal-plans" -Headers $headers

# Get shopping list (with auth)
Invoke-RestMethod -Uri "http://localhost:3000/api/shopping-list" -Headers $headers
```

### Using cURL
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test123456"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'

# Get recipes (with auth)
curl http://localhost:3000/recipes \
  -H "Authorization: Bearer <your_jwt_token>"

# Get favorites (with auth)
curl http://localhost:3000/api/favorites \
  -H "Authorization: Bearer <your_jwt_token>"

# Get meal plans (with auth)
curl http://localhost:3000/api/meal-plans \
  -H "Authorization: Bearer <your_jwt_token>"

# Get shopping list (with auth)
curl http://localhost:3000/api/shopping-list \
  -H "Authorization: Bearer <your_jwt_token>"
```

---

## 📖 API Response Examples

### Get All Recipes
**Request:**
```
GET /recipes
Authorization: Bearer <token>
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

### Get Favorites
**Request:**
```
GET /api/favorites
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "recipe_id": "12345",
    "title": "Chicken Curry",
    "image": "https://example.com/image.jpg",
    "source_type": "spoonacular",
    "created_at": "2025-11-25T14:30:00.000Z"
  }
]
```

### Get Meal Plans
**Request:**
```
GET /api/meal-plans?startDate=2025-12-01&endDate=2025-12-07
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "recipe_id": "12345",
    "meal_date": "2025-12-01",
    "meal_type": "breakfast",
    "notes": "Healthy breakfast",
    "created_at": "2025-11-30T10:00:00.000Z"
  }
]
```

### Get Shopping List
**Request:**
```
GET /api/shopping-list
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "ingredient": "Chicken breast",
    "quantity": "500g",
    "is_checked": false,
    "recipe_id": "12345",
    "created_at": "2025-11-30T10:00:00.000Z"
  }
]
```

### Nutrition Summary
**Request:**
```
GET /api/stats/nutrition-summary?date=2025-12-01
Authorization: Bearer <token>
```

**Response:**
```json
{
  "date": "2025-12-01",
  "totalCalories": 1850,
  "totalProtein": 95,
  "totalCarbs": 220,
  "totalFat": 65,
  "meals": [...]
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
- Organized endpoint grouping
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

**Last Updated:** December 1, 2025  
**API Version:** 1.0.0  
**Documentation:** Swagger/OpenAPI 3.0

