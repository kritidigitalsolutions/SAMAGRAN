# SAMAGRAN Order APIs Postman Guide

## Import file
- Import `SAMAGRAN-Order-APIs.postman_collection.json` into Postman.

## Set variables
- `baseUrl`: backend URL (local or deployed)
- `authToken`: user JWT token from verify-otp response

## API flow
1. Run **Auth - Verify OTP (Get Token)** and copy `data.token` to `authToken`.
2. For online payment, run **Create Razorpay Order (Cart/Direct)**.
3. Complete checkout on frontend with Razorpay using `data.razorpayOrder.id` and get:
   - `razorpay_payment_id`
   - `razorpay_order_id`
   - `razorpay_signature`
4. Run **Place Order - Razorpay Online** with those 3 fields.
5. For COD, directly run **Place Order - COD**.

## Supported productType values
- `Item`
- `FestivalKit`
- `DefaultKit`
- `UserKit`

## Notes
- If `items` is omitted, backend uses cart items automatically.
- If `deliveryFee` is omitted, backend uses `ORDER_DELIVERY_FEE` from env, fallback 20.
- Pune sample address is already included in COD and ONLINE request bodies.
