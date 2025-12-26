# Event API Documentation

## Create Event

**POST** `/api/create`

Create a new event with event games with slots. Requires employee Bearer token authentication.

### Request Headers
- `Authorization: Bearer <employee_token>`

### Request Body Example
```json
{
  "title": "Event Title",
  "description": "Event description",
  "city_id": 1,
  "venue_id": 2,
  "event_date": "2025-12-31",
  "status": "Draft",
  "is_active": 1,
  "image_url": "http://...",
  "priority": 1,
  "event_games_with_slots": [
    {
      "game_id": 1,
      "custom_title": "Game Title",
      "custom_description": "Description",
      "custom_price": 100.00,
      "start_time": "10:00:00",
      "end_time": "11:00:00",
      "slot_price": 50.00,
      "max_participants": 10,
      "note": "Note",
      "is_active": 1,
      "min_age": 5,
      "max_age": 12
    }
  ]
}
```

### Success Response
- **201 Created**
```json
{
  "message": "Event created successfully",
  "event_id": 123
}
```

### Error Response
- **401 Unauthorized**
- **500 Internal Server Error**

### Notes
- Only authenticated employees can create events.
- The event_games_with_slots array is required for adding games to the event.


## Edit Event

**PUT** `/api/events/:id/edit`

Edit an existing event and its event games with slots. Requires employee Bearer token authentication.

### Request Headers
- `Authorization: Bearer <employee_token>`

### Request Body Example
```json
{
  "title": "Event Title",
  "description": "Event description",
  "city_id": 1,
  "venue_id": 2,
  "event_date": "2025-12-31",
  "status": "Published",
  "is_active": 1,
  "image_url": "http://...",
  "priority": 1,
  "event_games_with_slots": [
    {
      "id": 10, // Existing slot id (omit for new)
      "game_id": 1,
      "custom_title": "Game Title",
      "custom_description": "Description",
      "custom_price": 100.00,
      "start_time": "10:00:00",
      "end_time": "11:00:00",
      "slot_price": 50.00,
      "max_participants": 10,
      "note": "Note",
      "is_active": 1,
      "min_age": 5,
      "max_age": 12
    }
  ],
  "event_games_with_slots_to_delete": [11, 12] // Optional: slot ids to delete
}
```

### Success Response
- **200 OK**
```json
{
  "message": "Event updated successfully",
  "event_id": 123
}
```

### Error Response
- **401 Unauthorized**
- **404 Not Found**
- **500 Internal Server Error**


## Get Event With Details

**GET** `/api/events/:id/details`

Get an event with its games, venue name, city name, and event_games_with_slots. No authentication required.

### Request
- No authentication required

### Success Response
- **200 OK**
```json
{
  "id": 123,
  "title": "Event Title",
  "description": "Event description",
  "city_id": 1,
  "venue_id": 2,
  "event_date": "2025-12-31",
  "status": "Published",
  "is_active": 1,
  "image_url": "http://...",
  "priority": 1,
  "venue_name": "Venue Name",
  "city_name": "City Name",
  "event_games_with_slots": [
    {
      "id": 10,
      "game_id": 1,
      "custom_title": "Game Title",
      "custom_description": "Description",
      "custom_price": 100.00,
      "start_time": "10:00:00",
      "end_time": "11:00:00",
      "slot_price": 50.00,
      "max_participants": 10,
      "note": "Note",
      "is_active": 1,
      "min_age": 5,
      "max_age": 12,
      "game_title": "Game Title",
      "game_description": "Game Description"
    }
  ]
}
```

### Error Response
- **404 Not Found**
- **500 Internal Server Error**



## List Events With Details

**GET** `/api/events/list`

List all events with their slots, venue name, city name, and event_games_with_slots. No authentication required.

### Request
- No authentication required

### Success Response
- **200 OK**
```json
[
  {
    "id": 123,
    "title": "Event Title",
    "description": "Event description",
    "city_id": 1,
    "venue_id": 2,
    "event_date": "2025-12-31",
    "status": "Published",
    "is_active": 1,
    "image_url": "http://...",
    "priority": 1,
    "venue_name": "Venue Name",
    "city_name": "City Name",
    "event_games_with_slots": [
      {
        "id": 10,
        "game_id": 1,
        "custom_title": "Game Title",
        "custom_description": "Description",
        "custom_price": 100.00,
        "start_time": "10:00:00",
        "end_time": "11:00:00",
        "slot_price": 50.00,
        "max_participants": 10,
        "note": "Note",
        "is_active": 1,
        "min_age": 5,
        "max_age": 12,
        "game_title": "Game Title",
        "game_description": "Game Description"
      }
    ]
  }
]
```

### Error Response
- **500 Internal Server Error**



## Delete Event

**DELETE** `/api/events/:id/delete`

Delete an event and its slots. Requires employee Bearer token authentication.

### Request Headers
- `Authorization: Bearer <employee_token>`

### Success Response
- **200 OK**
```json
{
  "message": "Event deleted successfully",
  "event_id": 123
}
```

### Error Response
- **401 Unauthorized**
- **404 Not Found**
- **500 Internal Server Error**

### Notes
- Only authenticated employees can delete events.
## Get Completed Events with Statistics

**GET** `/api/events/completed`

Get all completed events (past events where event_date < current date) with comprehensive statistics including revenue, bookings, demographics, and analytics.

### Success Response
- **200 OK**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "event_id": 5,
      "event_name": "Summer Camp 2024",
      "event_date": "2024-07-15",
      "description": "Fun summer activities for kids",
      "image_url": "https://example.com/image.jpg",
      "status": "Completed",
      "venue": {
        "id": 2,
        "name": "Adventure Park",
        "address": "123 Park Street",
        "contact": "+1234567890"
      },
      "city": {
        "id": 1,
        "name": "Mumbai",
        "state": "Maharashtra"
      },
      "statistics": {
        "total_bookings": 45,
        "total_parents": 38,
        "total_children": 62,
        "total_game_bookings": 156,
        "bookings_by_status": {
          "confirmed": 40,
          "pending": 3,
          "cancelled": 2
        },
        "revenue": {
          "total": 125000,
          "paid": 118000,
          "pending": 7000
        },
        "payment_methods": [
          {
            "method": "Credit Card",
            "count": 25,
            "amount": 75000
          },
          {
            "method": "UPI",
            "count": 15,
            "amount": 43000
          }
        ],
        "top_games": [
          {
            "game_id": 3,
            "game_name": "Trampoline",
            "bookings": 42,
            "revenue": 21000
          },
          {
            "game_id": 5,
            "game_name": "Rock Climbing",
            "bookings": 35,
            "revenue": 28000
          }
        ],
        "age_distribution": [
          {
            "age_group": "3-5 years",
            "count": 18
          },
          {
            "age_group": "6-8 years",
            "count": 28
          },
          {
            "age_group": "9-12 years",
            "count": 16
          }
        ]
      }
    }
  ]
}
```

### Error Response
- **500 Internal Server Error**

### Features
- **Revenue Tracking**: Total, paid, and pending revenue
- **Registration Stats**: Total bookings, unique parents, children count
- **Booking Status**: Breakdown by confirmed, pending, cancelled
- **Payment Analytics**: Distribution by payment method (Credit Card, UPI, etc.)
- **Popular Games**: Top 5 games by booking count with revenue
- **Demographics**: Age distribution of children participants
- **City/Venue Info**: Complete location details for each event

### Use Cases
- Generate revenue reports for past events
- Analyze popular games and activities
- Track payment collection status
- Understand customer demographics
- Evaluate event performance metrics
- Export data for business intelligence