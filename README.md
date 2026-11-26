# Bhshop

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.6.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Backend API and MongoDB Atlas

The backend is in `backend/` and uses Node.js, Express, and MongoDB Atlas. Create
a MongoDB Atlas cluster and database user, allow your machine's IP address in the
Atlas network access list, then install the backend packages and create a local
environment file:

```powershell
npm install --prefix backend
Copy-Item backend\.env.example backend\.env
```

Replace `MONGODB_URI` in `backend\.env` with the connection string from Atlas.
Set a strong `ADMIN_PASSWORD` and replace `ADMIN_SESSION_SECRET` with a random
secret of at least 32 characters. Set `SESSION_SECRET` to a separate random
secret of at least 32 characters for customer sessions. Keep `.env` private and
do not commit it.
`MONGODB_DB` selects the database name and defaults to `bhgarage`.

Open `http://localhost:4200/admin` to sign in with `ADMIN_USERNAME` and
`ADMIN_PASSWORD`. The admin page can manage products, categories, blog posts,
banners, and order statuses. Admin sessions use a signed, HTTP-only cookie; all
admin write API requests require a valid admin session.

Customers can register or sign in at `/account`, submit cash-on-delivery orders
from checkout, and view their own orders at `/orders`. Customer passwords are
stored as scrypt hashes, and order totals are recalculated by the API from
MongoDB product prices.

Generate a session secret with Node.js:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Initialize the sample categories, products, banners, and blog posts in empty
collections, then start the API:

```powershell
npm --prefix backend run seed
npm --prefix backend run dev
```

The seed command does not overwrite existing collections. The API also seeds
empty collections on startup, so running the seed command is optional. If
`backend\data\store.json` exists, its data is imported into empty Atlas
collections on first initialization; otherwise the sample data is used. The API
listens on `http://localhost:3000`. Start Angular in another terminal with
`npm start` and open `http://localhost:4200`.

### API endpoints

Each collection supports `GET /api/{collection}`, `GET /api/{collection}/:slug`,
`POST /api/{collection}`, `PUT /api/{collection}/:slug`, and
`DELETE /api/{collection}/:slug`:

- `categories`
- `products` (optional category filter: `?category=sieu-xe`; case-insensitive
  name search: `?search=Porsche`, max 100 characters)
- `blogs`
- `banners`

Additional endpoints:

- `GET /api/home` returns the three newest active banners, four newest products,
  four best sellers, four discounted products, and three newest blog posts.
- `GET /api/health` reports API and MongoDB Atlas connection status.
- `GET /api/products?promotion=true` returns discounted products.
- `POST /api/auth/register` and `POST /api/auth/login` create customer sessions.
- `GET /api/auth/me` and `POST /api/auth/logout` manage the current session.
- `POST /api/orders` creates an authenticated customer's COD order.
- `GET /api/orders/mine` returns the signed-in customer's orders.
- `GET /api/orders` lists orders for authenticated admins; admins can update
  status with `PATCH /api/orders/:id/status`.

The API generates a slug from `name` or `title` when one is not provided. The
CRUD endpoints require an authenticated admin session in every environment.

The Angular header searches products by name. Product cards and detail pages add
items to a browser-local cart stored in `localStorage`; quantities, line totals,
and the subtotal are calculated from each product's price. The cart belongs to
the current browser and is not shared across devices.

### Deploy to Vercel

The Angular frontend and Express API deploy as Vercel services. Before
deploying, add `MONGODB_URI` and `MONGODB_DB=bhgarage` to the Vercel project's
Environment Variables. The Atlas IP access list must allow Vercel's outbound
connections; on plans without static egress IPs, this may require `0.0.0.0/0`.
Use a dedicated database user and rotate any credentials that have been shared.

Deploy from the project root with the Vercel CLI:

```powershell
vercel
vercel --prod
```

Set the admin credentials, `ADMIN_SESSION_SECRET`, and `SESSION_SECRET` as
Vercel Environment Variables. Authenticated admins can manage content and
orders through `/admin`; public API reads remain available to the storefront.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
