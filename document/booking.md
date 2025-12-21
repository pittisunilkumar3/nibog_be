# Booking API Documentation

## Create Booking

**POST** `/api/bookings`

Create a new booking with parent, children, and multiple games/slots per child.


### Request Body Example
```json
{
  "parent_name": "Parent Name",
  "email": "parent@email.com",
  "phone": "9876543210",
  "event_id": 1,
  "booking_ref": "MAN2025123456",
  "status": "Pending",
  "total_amount": 998.00,
  "children": [
    {
      "full_name": "Child One",
      "date_of_birth": "2023-01-01",
      "gender": "Male",
      "school_name": "ABC School",
      "booking_games": [
        {
          "game_id": 1,
          "slot_id": 8,
          "game_price": 499.00
        }
      ]
    },
    {
      "full_name": "Child Two",
      "date_of_birth": "2021-05-10",
      "gender": "Female",
      "school_name": "XYZ School",
      "booking_games": [
        {
          "game_id": 1,
          "slot_id": 9,
          "game_price": 499.00
        }
      ]
    }
  ],
  "payment": {
    "transaction_id": "TXN123456789",
    "amount": 998.00,
    "payment_method": "Cash",
    "payment_status": "Paid"
  }
}
```


### Success Response
- **201 Created**
```json
{
  "message": "Booking created successfully",
  "booking_id": 123,
  "payment_id": 456
}
```

### Error Response
- **400 Bad Request**
- **500 Internal Server Error**

### Notes
- All children array is required (minimum 1 child).
- At least one child must have booking_games array with games/slots.
- Each child's booking_games array contains their games and time slots.
- **No need to pass child_id** - The API automatically uses the database-generated child ID.
- Parent is automatically created in the `parents` table with the provided details.
- Children are automatically created in the `children` table with the provided details.
- After each child is created, their booking_games are linked using the auto-generated child_id.
- The `payment` object is optional but recommended for payment record creation.

### Data Flow
1. API creates parent record → gets `parent_id` from database
2. For each child in the array:
   - Creates child record → gets `child_id` from database
   - Creates booking_games for that child using the auto-generated `child_id`
3. All records are properly linked with correct foreign keys

### Example: Multiple Games for One Child
```json
{
  "children": [
    {
      "full_name": "Alice Johnson",
      "date_of_birth": "2020-01-01",
      "gender": "Female",
      "school_name": "ABC School",
      "booking_games": [
        {
          "game_id": 1,
          "slot_id": 8,
          "game_price": 1799.00
        },
        {
          "game_id": 1,
          "slot_id": 9,
          "game_price": 1799.00
        }
      ]
    }
  ]
}
```
This will book 2 different time slots for Alice.
