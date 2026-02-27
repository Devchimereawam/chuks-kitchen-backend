# Chuks Kitchen Backend.

## Project Status & Documentation Scope

This README represents a comprehensive and authoritative reflection of:

1. The current codebase structure as implemented in this repository.

2. The officially documented API design architecture and behavioral flows.

3. The reconciled implementation decisions that emerged during the API planning and development lifecycle.

This document serves both as a technical reference and as an architectural explanation of design decisions, implementation trade-offs, and forward-looking scalability considerations.

## Current Codebase Structure

<img width="669" height="267" alt="Screenshot 2026-02-24 at 12 16 02" src="https://github.com/user-attachments/assets/a71a3295-0593-450a-af41-054c33df87c2" />


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

### Cart and Order

- `POST /cart/items`
  - Adds meal to cart.
- `GET /cart/:id`
  - Fetches cart details.
- `POST /orders`
  - Creates order from active cart.
- `GET /orders/:id`
  - Fetches order details and status.
- `DELETE /clear-cart/:id`
  - Clears active cart items.

## Not Implemented Yet

- Admin order status update APIs.

## Chuks Kitchen Backend Design Documentation

Chuks Kitchen Backend Design Documentation  

## 1. System Overview (End-to-End)

Chuks Kitchen currently supports:

Customer: signs up, verifies account via OTP, browses foods.

Admin (simulated): creates food items using admin header validation (`x-admin: true`).

## End-to-end Journey

### Customer Registration

A user signs up using Email or Phone and a password (with optional first/last name and role).

System creates the account in unverified OTP state, stores OTP hash/expiry, and returns signup response.

Note: JWT token is also returned at signup.

### Account Verification

User submits OTP using `userId`.

System validates OTP hash, marks account verified, clears OTP fields, and issues a JWT token.

### Food Browsing

Customer requests the food list via `GET /auth/foods`.

Backend returns foods from the database sorted by newest first.

### Admin Food Management

Admin adds food items via `POST /auth/foods` with header `x-admin: true`.

## 2. Flow Explanation (Step-by-Step + Design Reasons)

### A) User Registration & OTP Verification Flow

### Step 1: Submit Signup

Frontend sends: `POST /auth/signup` with `{email OR phone, password, firstName?, lastName?, role?}`

Backend normalizes/validates role, checks admin-role simulation rule, and proceeds to duplicate check.

Why: Backend controls identity and role constraints.

### Step 2: Duplicate Check

Backend checks if email/phone already exists.

If yes: returns `409`.

Why: Prevents account collisions.

### Step 3: Create Unverified User

Backend creates user with OTP fields initialized and `otpVerified = false`.

Password is hashed before save.

Why: Keeps user unverified until OTP confirmation.

### Step 4: Generate OTP

Backend generates OTP, stores OTP hash and expiry, and includes OTP in non-production response.

Why: Hashing/expiry improve OTP safety; non-production OTP exposure supports testing.

### Step 5: Verify OTP

Frontend sends: `POST /auth/signup/verify-otp` with `{userId, otp}`

Backend fetches user by `userId`, checks OTP hash match, sets `otpVerified = true`, clears OTP fields, and issues JWT.

Why: OTP should be one-time use and removed after success.

### B) Food Browsing & Admin Food Management Flow

### Customer

Frontend calls: `GET /auth/foods`

Backend returns foods sorted by newest.

Why: Simple meal browsing endpoint.

### Admin (simulated)

Frontend calls: `POST /auth/foods`

Required header: `x-admin: true`

Backend creates food `{name, price, isAvailable}`.

Why: Restricts create access to simulated admin flow.

### C) Cart and Order Flow Reorder (Instruction vs Final)

Initial instruction order captured during API planning:

- Option C — Order API:
  - `/orders` Create order from cart
  - `/orders/:id` Fetch order details and status
- Option D — Add meal to cart API:
  - `/orders` Add meal to cart
- Option E — View cart API:
  - `/orders/:id` Fetch order details and status
- Option F — Clear cart API:
  - `/clear cart`

Final reordered and implemented flow:

- Option D — Add meal to cart API:
  - `POST /cart/items`
- Option E — View cart API:
  - `GET /cart/:userId`
- Option C — Order API:
  - `POST /orders` Create order from cart
  - `GET /orders/:id` Fetch order details and status
- Option F — Clear cart API:
  - `DELETE /clear-cart/:userId`

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

The Cart and Order APIs were implemented using the revised route flow documented above. This adjustment was necessary because the original instruction sequence was not accurately captured and was only identified during the API planning and development phase.

## 5. Scalability Thoughts (100 → 10,000+ Users)

If usage grows, first upgrades should include:

### Performance & Data

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

## Data Modeling (ERD)

<img width="729" height="612" alt="Screenshot 2026-02-27 at 14 11 32" src="https://github.com/user-attachments/assets/988005f1-f763-43c0-a4e2-b8a2d75e8bbf" />


### Embedded code:

<iframe width="768" height="432" src="https://miro.com/app/live-embed/uXjVG6BwKzI=/?embedMode=view_only_without_ui&moveToViewport=-833,-859,2065,1110&embedId=633000995513" frameborder="0" scrolling="no" allow="fullscreen; clipboard-read; clipboard-write" allowfullscreen></iframe>

### Miro Link:

https://miro.com/app/live-embed/uXjVG6BwKzI=/?embedMode=view_only_without_ui&moveToViewport=-833%2C-859%2C2065%2C1110&embedId=633000995513

## Project Images

<img width="1161" height="548" alt="Screenshot 2026-02-26 at 09 36 49" src="https://github.com/user-attachments/assets/0d45be98-4482-42a8-bdcd-b1ffafa4fed9" />

<img width="553" height="564" alt="Screenshot 2026-02-26 at 09 37 10" src="https://github.com/user-attachments/assets/c5ac60cc-39f4-4120-b841-67a166fabf56" />

<img width="1194" height="502" alt="Screenshot 2026-02-26 at 09 37 31" src="https://github.com/user-attachments/assets/759bbfbf-65da-4a2f-8ae8-241137c1273c" />

<img width="1141" height="441" alt="Screenshot 2026-02-26 at 09 37 50" src="https://github.com/user-attachments/assets/3181e5ea-7a67-4691-a9ca-2ce47a775516" />

<img width="1138" height="479" alt="Screenshot 2026-02-26 at 09 38 03" src="https://github.com/user-attachments/assets/4b4731e5-efe8-44ac-92ce-1f26f1c11c05" />

<img width="1159" height="428" alt="Screenshot 2026-02-26 at 09 38 17" src="https://github.com/user-attachments/assets/6f6f8cc1-2aac-4010-86d4-5e51cf358f90" />

<img width="1139" height="509" alt="Screenshot 2026-02-26 at 09 38 47" src="https://github.com/user-attachments/assets/95321757-e9c5-4396-a47a-ebe8570362e1" />

<img width="1134" height="506" alt="Screenshot 2026-02-26 at 09 39 04" src="https://github.com/user-attachments/assets/ee8e605b-09ee-45e9-875c-29a1b3b345d9" />

<img width="1157" height="481" alt="Screenshot 2026-02-26 at 09 39 29" src="https://github.com/user-attachments/assets/7c8a8dcb-0ea3-43de-bf65-b056acc29a46" />

<img width="541" height="531" alt="Screenshot 2026-02-26 at 09 39 53" src="https://github.com/user-attachments/assets/6b6e6583-f264-488b-b808-31eb9512e89e" />


## TEST FLOW
    USING POSTMAN 

Run backend first:

node app.js

1. GET http://localhost:3000/
Expected: 200, text response.


2. GET http://localhost:3000/status
Expected: 200, JSON with status: "Running".


3. POST http://localhost:3000/auth/signup (Signup)

Headers: Content-Type: application/json
Body:
{
  "email": "qa.tester@example.com",
  "password": "Pass1234!",
  "firstName": "QA",
  "lastName": "Tester",
  "role": "customer"
}

Expected: 201, user created, OTP returned in non-production.


4. POST http://localhost:3000/auth/signup/verify-otp (Verify with OTP)

Headers: Content-Type: application/json
Body:
{
  "userId": "userId",
  "otp": "otp"
}

Expected: 200, message OTP verified successfully.


5. GET http://localhost:3000/auth/foods (View foods)

Expected: 200, data array.


6. POST http://localhost:3000/auth/foods (Add food as admin)

Headers: Content-Type: application/json
x-admin: true

Body:
{
  "name": "Jollof Rice + Chicken",
  "price": 4500,
  "isAvailable": true
}

Expected: 201.


7. POST http://localhost:3000/auth/foods (Unavailable food)

Body:
{
  "name": "Pepper Soup",
  "price": 3000,
  "isAvailable": false
}

Expected: 201.


8. POST http://localhost:3000/auth/cart/items (Add to cart)

Headers: Content-Type: application/json
Body:
{
  "userId": "userId",
  "foodId": "foodId1",
  "quantity": 2
}

Expected: 201, data.status = "cart".


9. GET http://localhost:3000/auth/cart/{{userId}} (View user cart)

Expected: 200, cart with items.


10. POST http://localhost:3000/auth/cart/items (Add another item to cart)
Body:

{
  "userId": "userId",
  "foodId": "foodId2",
  "quantity": 1
}

Expected: 201, quantity increases.


11. POST http://localhost:3000/auth/orders (Place order)

Body:
{
  "userId": "userId"
}

Expected: 201, status becomes placed.


12. GET http://localhost:3000/auth/orders/{{placedOrderId}} (Place the order)

Expected: 200, placed order details.

Note: Placed order id is gotten from when you view order details in step 11.


13. GET http://localhost:3000/auth/cart/{{userId}}

Expected: 200, empty cart view (because placed order is no longer active cart).

Add another food item from step 6 to test the clear cart feature.


14. DELETE http://localhost:3000/auth/clear-cart/{{userId}}

Expected: 200, cleared: true.
