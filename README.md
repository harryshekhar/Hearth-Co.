Hearth & Co. — Full-Stack E-Commerce Platform
An end-to-end e-commerce store built from scratch by Shekhar Adala, with a React storefront, a PostgreSQL database, and an independent Python (FastAPI) backend.

I designed and built the entire system myself — storefront, database schema, server-side checkout logic, admin and delivery dashboards, and the Python backend — without using any website/app builder.

Features
Storefront (customers)
Browse products by category (Electronics, Men's & Women's Clothing, Mobile Phones, Kitchen Appliances, Food) with instant search
Product detail pages with images, pricing and stock status
Cart with quantity management (persisted in the browser)
Email/password sign-up and sign-in
Checkout with shipping address and payment-method selection (Card / Cash on Delivery)
My Orders page with a visual order-tracking timeline (Placed → Confirmed → Shipped → Delivered) and estimated delivery date
Live delivery updates: customers see location updates the admin posts, refreshed automatically every 15 seconds
Admin & Delivery dashboards
Full product CRUD: add products, change prices/stock, hide items
Order management: view all orders and total revenue, move orders through the fulfilment stages
Dedicated Delivery dashboard: one-click status changes, per-stage count cards with filters, search by order number / customer / city
Manual location tracking: post live location updates (e.g. "Mumbai hub", "Out for delivery") that customers see in near real time
Role-based access: the first account created becomes the admin
Data integrity & security
Server-side checkout: prices and stock are re-validated inside a transactional SQL function with row-level locking (FOR UPDATE), so stock can never be oversold and prices cannot be tampered with from the browser
Atomic stock decrements on every order
Row-Level Security (RLS) policies on all tables — users can only read their own orders; admin-only writes for tracking events
JWT-based auth on the Python backend (HS256, 24h expiry)
Tech Stack
Layer	Technology
Frontend	React 19, TypeScript, TanStack Start (SSR), TanStack Query, Tailwind CSS
Database	PostgreSQL (with RLS, triggers and transactional SQL functions)
Backend (alternate)	Python 3.11, FastAPI, SQLAlchemy, JWT auth, Stripe-ready
DevOps	Docker & Docker Compose, Vite, Vitest
Project Structure
├── src/                  # React storefront (routes, components, server functions)
├── drizzle/              # Database migrations (schema, RLS policies, checkout function, seed data)
├── public/               # Static assets and product images
└── shop-api/             # Standalone Python FastAPI backend (see its README)
    ├── app/              # auth, catalog, cart, orders, admin routers
    ├── Dockerfile
    └── docker-compose.yml
Getting Started (Storefront)
Prerequisites: Node.js 18+ and npm.

git clone https://github.com/harryshekhar/Hearth-Co..git
cd Hearth-Co.
npm install
npm run dev
The app runs at http://localhost:8080. The database connection is configured through environment variables in .env (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID).

Database schema and seed data live in drizzle/migrations/ — tables for users, roles, categories, products, orders, order items and tracking events, plus the place_order transactional checkout function.

Getting Started (Python Backend)
The repository also includes a complete independent backend in Python — same domain model (users, categories, products, cart, orders), JWT auth, admin routes and Stripe support.

With Docker (recommended):

cd shop-api
cp .env.example .env
docker compose up --build
Without Docker:

python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env             # point DATABASE_URL at your PostgreSQL
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
Interactive API docs: http://localhost:8000/docs (Swagger) and /redoc.

The first registered user automatically becomes the admin.

Connecting the storefront to the Python backend
Set VITE_API_BASE_URL in the frontend .env:

http://localhost:8000 for local development
your deployed API URL for production
Leave it empty to use the built-in cloud database.

API Highlights
Endpoint	Description
POST /auth/register / POST /auth/login	JWT authentication (first user = admin)
GET /products / GET /products/{id}	Catalog with category filtering
GET/POST/PUT/DELETE /cart	Cart management
POST /orders/checkout	Transactional checkout with stock validation
GET /orders	Customer order history with tracking
POST /admin/products	Admin product management
PATCH /admin/orders/{id}	Order status transitions
POST /webhooks/stripe	Stripe payment webhook (when STRIPE_SECRET_KEY is set)
Author
Shekhar Adala

GitHub: harryshekhar(opens in a new tab)
License
MIT
