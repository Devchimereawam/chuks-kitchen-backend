# Chuks Kitchen Backend

## Project Status

This README reflects:

1. The **current codebase structure** in this repo.
2. The API **design documentation**.

## Current Codebase Structure
.
├── app.js
├── authorization
│   ├── controller.js
│   └── routes.js
├── common
│   ├── database.js
│   ├── middlewares
│   │   └── IsAuthenticated.js
│   └── models
│       ├── Food.js
│       └── User.js
├── package.json
└── README.md

## Current Implemented Endpoints

### Health

- `GET /`
  - Returns a plain text API running message.
- `GET /status`
  - Returns backend status JSON.

### Authentication

- `POST /auth/signup`
  - Creates a user account and returns signup response (includes OTP in non-production).
- `POST /auth/signup/verify-otp`
  - Verifies signup OTP and marks user as verified.

### Food

- `GET /auth/foods`
  - Returns all foods (sorted by newest first).
- `POST /auth/foods`
  - Creates a food item.
  - Requires request header: `x-admin: true`.

## Not Implemented Yet

- Cart APIs:
  - `POST /cart/items`
  - `GET /cart/:userId`
  - `DELETE /clear-cart/:userId`
- Order APIs:
  - `POST /orders`
  - `GET /orders/:id`
- Admin order status update APIs.



## Chuks Kitchen Backend Design Documentation

Chuks Kitchen Backend Design Documentation  

## 1. System Overview (End-to-End)

Chuks Kitchen currently supports:

Customer: signs up, verifies account via OTP, browses foods.

Admin (simulated): creates food items using admin header validation (`x-admin: true`).

### End-to-end Journey

### Customer Registration

A user signs up using Email or Phone and a password (with optional first/last name and role).

System creates the account in unverified OTP state, stores OTP hash/expiry, and returns signup response.

Note: JWT token is also returned at signup.

#### Account Verification

User submits OTP using `userId`.

System validates OTP hash, marks account verified, clears OTP fields, and issues a JWT token.

### Food Browsing

Customer requests the food list via `GET /auth/foods`.

Backend returns foods from the database sorted by newest first.

### Admin Food Management

Admin adds food items via `POST /auth/foods` with header `x-admin: true`.

## 2. Flow Explanation (Step-by-Step + Design Reasons)

### A) User Registration & OTP Verification Flow

#### Step 1: Submit Signup

Frontend sends: `POST /auth/signup` with `{email OR phone, password, firstName?, lastName?, role?}`

Backend normalizes/validates role, checks admin-role simulation rule, and proceeds to duplicate check.

Why: Backend controls identity and role constraints.

#### Step 2: Duplicate Check

Backend checks if email/phone already exists.

If yes: returns `409`.

Why: Prevents account collisions.

#### Step 3: Create Unverified User

Backend creates user with OTP fields initialized and `otpVerified = false`.

Password is hashed before save.

Why: Keeps user unverified until OTP confirmation.

#### Step 4: Generate OTP

Backend generates OTP, stores OTP hash and expiry, and includes OTP in non-production response.

Why: Hashing/expiry improve OTP safety; non-production OTP exposure supports testing.

#### Step 5: Verify OTP

Frontend sends: `POST /auth/signup/verify-otp` with `{userId, otp}`

Backend fetches user by `userId`, checks OTP hash match, sets `otpVerified = true`, clears OTP fields, and issues JWT.

Why: OTP should be one-time use and removed after success.

### B) Food Browsing & Admin Food Management Flow

#### Customer

Frontend calls: `GET /auth/foods`

Backend returns foods sorted by newest.

Why: Simple meal browsing endpoint.

#### Admin (simulated)

Frontend calls: `POST /auth/foods`

Required header: `x-admin: true`

Backend creates food `{name, price, isAvailable}`.

Why: Restricts create access to simulated admin flow.

## 3. Edge Case Handling (Failures, Exceptions, Unusual Scenarios)

### Registration & Verification

Duplicate email/phone: `409 Conflict`

Invalid role: `400 Bad Request`

Admin role requested without admin simulation header: `403 Forbidden`

Invalid OTP: `400 Bad Request`

User not found during OTP verification: `404 Not Found`

### Food

Non-admin trying to create food: `403 Forbidden`

Unexpected server/database errors: `500 Internal Server Error`

## 4. Assumptions (Due to Missing Info)

OTP is exposed in non-production signup response for testing.

Authorization middleware for protected routes is not active yet.

Admin checks are currently simulated using `x-admin` header.

OTP expiry fields exist, but expiry enforcement is not yet implemented in verify flow.

Cart and order APIs are not implemented yet.

## 5. Scalability Thoughts (100 → 10,000+ Users)

If usage grows, first upgrades should include:

## Performance & Data

1. Add/maintain DB indexes: `User.email`, `User.phone`. (currently used in OTP verification lookups).
2. Add pagination to `GET /auth/foods` with `page` and `limit` plus a max `limit` cap: `GET /auth/foods?page=1&limit=20`.
3. Add `Food` indexes for list/query speed (for example `isAvailable`, `createdAt`, or a compound index).
4. Add Redis caching for `GET /auth/foods` and invalidate cache on food create/update.
5. Add rate limiting for signup and OTP verification endpoints to reduce abuse and burst load.
6. Add centralized request validation (e.g., AJV middleware) before controller/database logic.
7. Run multiple API instances behind a load balancer (stateless JWT supports horizontal scaling).

### OTP & Notifications

Move OTP delivery to a background job queue (e.g., BullMQ + Redis) for better latency and retries.

### Reliability & Security

Add rate limiting for signup and OTP verification endpoints to reduce abuse and burst load. (Rate-limit verification attempts).

Add observability: structured logs, latency metrics, error-rate monitoring, and alerts.