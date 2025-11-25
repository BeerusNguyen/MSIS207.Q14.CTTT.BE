# Recipe Finder - Backend API 🔧

RESTful API backend for Recipe Finder and Meal Planner application.

## 🚀 Tech Stack

- **Node.js** & **Express.js** 5.1.0 - Web framework
- **MySQL** - Relational database
- **MySQL2** 3.15.3 - MySQL driver for Node.js
- **Swagger/OpenAPI 3.0** - API Documentation
- **CORS** - Cross-Origin Resource Sharing
- **dotenv** - Environment variable management

## 📚 API Documentation

**Interactive Swagger UI:**
- Local: http://localhost:3000/api-docs
- Production: https://your-api-url.onrender.com/api-docs

For detailed API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## 📋 Prerequisites

- Node.js (v14 or higher)
- MySQL Server (v8.0 or higher)
- npm or yarn

## 🛠️ Installation

1. Clone repository:
```bash
git clone <your-backend-repo-url>
cd Recipe-Finder-BE
```

2. Install dependencies:
```bash
npm install
```

3. Setup environment variables:
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=recipe_finder
```

4. Setup MySQL Database:
```bash
# Login to MySQL
mysql -u root -p

# Run setup script
source database/setup.sql
```

Or run SQL script in MySQL Workbench:
- Open `database/setup.sql`
- Execute all statements

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

Server will run at `http://localhost:3000`

### Import Sample Data (Optional)
```bash
npm run import
```

## 📁 Project Structure

```
Recipe-Finder-BE/
├── server/
│   ├── server.js       # Main server file
│   ├── db.js          # Database connection
│   └── importData.js  # Data import script
├── database/
│   └── setup.sql      # Database schema
├── .env.example       # Environment template
├── .gitignore
├── package.json
└── README.md
```

## 🗄️ Database Schema

### Tables

#### `recipes`
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- title (VARCHAR(255))
- ingredients (TEXT)
- servings (VARCHAR(50))
- instructions (TEXT)
- image (VARCHAR(500))
- category (VARCHAR(100))
- area (VARCHAR(100))
- videoUrl (VARCHAR(500))
- recipeId (VARCHAR(100))
- source (VARCHAR(50))
- created_at (TIMESTAMP)
```

#### `nutrition`
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- recipe_id (INT, FOREIGN KEY)
- calories (DECIMAL(10,2))
- protein (DECIMAL(10,2))
- carbs (DECIMAL(10,2))
- fat (DECIMAL(10,2))
- fiber (DECIMAL(10,2))
- sugar (DECIMAL(10,2))
- sodium (DECIMAL(10,2))
```

## 🔌 API Endpoints

### 📖 Swagger Documentation (Recommended)
Visit http://localhost:3000/api-docs for interactive API documentation with:
- Try-it-out functionality
- Request/Response examples
- Schema definitions
- All endpoints organized by category

### Health Check
```http
GET /health
```
Response: `{ "status": "OK", "message": "Server is running" }`

### Recipes

#### Get All Recipes
```http
GET /recipes
```
Response: Array of recipe objects

#### Get Single Recipe
```http
GET /recipes/:id
```
Response: Single recipe object

#### Create New Recipe
```http
POST /recipes
Content-Type: application/json

{
  "title": "Recipe Name",
  "ingredients": "Ingredient list",
  "servings": "4",
  "instructions": "Cooking instructions",
  "nutrition": {
    "totalNutrients": {
      "ENERC_KCAL": { "quantity": 200 },
      "PROCNT": { "quantity": 10 },
      "CHOCDF": { "quantity": 30 },
      "FAT": { "quantity": 5 }
    }
  }
}
```

#### Update Recipe
```http
PUT /recipes/:id
Content-Type: application/json

{
  "title": "Updated Recipe Name",
  "ingredients": "Updated ingredients",
  "servings": "6",
  "instructions": "Updated instructions"
}
```

#### Delete Recipe
```http
DELETE /recipes/:id
```

### Nutrition

#### Get Nutrition for Recipe
```http
GET /recipes/:id/nutrition
```
Response: Nutrition data object

## 🧪 Testing API

### Using cURL
```bash
# Get all recipes
curl http://localhost:3000/recipes

# Get single recipe
curl http://localhost:3000/recipes/1

# Create recipe
curl -X POST http://localhost:3000/recipes \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Recipe","ingredients":"Test","servings":"2","instructions":"Test"}'
```

### Using Postman
Import the API endpoints or create a new collection with the endpoints above.

## 📦 Deployment

### Deploy to Render.com

1. Push code to GitHub
2. Create account on [Render.com](https://render.com)
3. Create new Web Service
4. Connect GitHub repository
5. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Add environment variables in Render dashboard
7. Deploy!

### Deploy to Railway.app

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

## 🔒 CORS Configuration

CORS is enabled for all origins in development. For production, update CORS settings in `server/server.js`:

```javascript
app.use(cors({
  origin: 'https://your-frontend-url.com'
}));
```

## 🐛 Troubleshooting

### Database Connection Error
- Check MySQL is running: `mysql -u root -p`
- Verify credentials in `.env` file
- Ensure database exists: `SHOW DATABASES;`

### Port Already in Use
- Change PORT in `.env` file
- Or kill process: `netstat -ano | findstr :3000`

## 👥 Authors

- Your Name
- Team Member Name (if applicable)

## 📄 License

MIT License

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Database Schema Diagram**: See `database/setup.sql` for complete schema.
