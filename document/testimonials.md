# Testimonials API

Endpoints for managing testimonials (guest submissions and admin moderation).

- GET /api/testimonials
  - Query params: `event_id`, `city_id`, `status`
  - Returns list of testimonials

- GET /api/testimonials/:id
  - Returns single testimonial

- POST /api/testimonials (protected)
  - Payload: { name, city_id?, event_id?, rating?, testimonial?, submitted_at?, status?, image_url?, priority?, is_active? }
  - Returns created id

- PUT /api/testimonials/:id (protected)
  - Accepts any of the fields in POST

- DELETE /api/testimonials/:id (protected)
  - Deletes the testimonial

Notes:
- `rating` must be between 1 and 5.
- `status` defaults to `Pending`.
- `submitted_at` defaults to current date if omitted.
