// event.api.test.js
// Test script for Event API endpoints using supertest and jest

const request = require('supertest');
const app = require('../server'); // Adjust if your express app is exported elsewhere

// Replace with a valid employee token for protected routes
defaultEmployeeToken = process.env.TEST_EMPLOYEE_TOKEN || 'REPLACE_WITH_VALID_TOKEN';

let createdEventId;
let createdSlotId;

describe('Event API', () => {
  // CREATE
  it('should create a new event with slots', async () => {
    const res = await request(app)
      .post('/api/events/create')
      .set('Authorization', `Bearer ${defaultEmployeeToken}`)
      .send({
        title: 'Test Event',
        description: 'Test event description',
        city_id: 1,
        venue_id: 1,
        event_date: '2025-12-31',
        status: 'Draft',
        is_active: 1,
        image_url: null,
        priority: 1,
        event_games_with_slots: [
          {
            game_id: 1,
            custom_title: 'Test Game',
            custom_description: 'Test game desc',
            custom_price: 100.0,
            start_time: '10:00:00',
            end_time: '11:00:00',
            slot_price: 50.0,
            max_participants: 10,
            note: 'Test note',
            is_active: 1,
            min_age: 5,
            max_age: 12
          }
        ]
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.event_id).toBeDefined();
    createdEventId = res.body.event_id;
  });

  // GET DETAILS
  it('should get event details', async () => {
    const res = await request(app)
      .get(`/api/events/${createdEventId}/details`);
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(createdEventId);
    expect(Array.isArray(res.body.event_games_with_slots)).toBe(true);
    if (res.body.event_games_with_slots.length > 0) {
      createdSlotId = res.body.event_games_with_slots[0].id;
    }
  });

  // LIST EVENTS
  it('should list all events', async () => {
    const res = await request(app)
      .get('/api/events/list');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // EDIT
  it('should edit the event and slots', async () => {
    const res = await request(app)
      .put(`/api/events/${createdEventId}/edit`)
      .set('Authorization', `Bearer ${defaultEmployeeToken}`)
      .send({
        title: 'Test Event Updated',
        description: 'Updated description',
        city_id: 1,
        venue_id: 1,
        event_date: '2025-12-31',
        status: 'Published',
        is_active: 1,
        image_url: null,
        priority: 1,
        event_games_with_slots: [
          {
            id: createdSlotId,
            game_id: 1,
            custom_title: 'Test Game Updated',
            custom_description: 'Updated desc',
            custom_price: 120.0,
            start_time: '10:00:00',
            end_time: '12:00:00',
            slot_price: 60.0,
            max_participants: 12,
            note: 'Updated note',
            is_active: 1,
            min_age: 6,
            max_age: 13
          }
        ],
        event_games_with_slots_to_delete: []
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.event_id).toBe(createdEventId);
  });

  // DELETE
  it('should delete the event', async () => {
    const res = await request(app)
      .delete(`/api/events/${createdEventId}/delete`)
      .set('Authorization', `Bearer ${defaultEmployeeToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.event_id).toBe(createdEventId);
    expect(res.body.event_games_with_slots_deleted).toBe(true);
  });

  // GET DETAILS (after delete)
  it('should return 404 for deleted event', async () => {
    const res = await request(app)
      .get(`/api/events/${createdEventId}/details`);
    expect(res.statusCode).toBe(404);
  });
});
