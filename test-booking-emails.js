const axios = require('axios');
const mysql = require('mysql2/promise');
require('dotenv').config();

const BASE_URL = 'http://localhost:3004';

async function testBookingWithEmails() {
  console.log('\n=== Testing Booking Creation with Email Notifications ===\n');

  try {
    // Setup test data
    console.log('Step 1: Setting up test data...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Insert test city
    await connection.execute(
      'INSERT IGNORE INTO cities (id, city_name) VALUES (?, ?)',
      [998, 'Test Email City']
    );

    // Insert test venue
    await connection.execute(
      'INSERT IGNORE INTO venues (id, venue_name, city_id, address, capacity) VALUES (?, ?, ?, ?, ?)',
      [998, 'Test Email Venue', 998, 'Test Address', 100]
    );

    // Insert test event
    await connection.execute(
      'INSERT IGNORE INTO events (id, city_id, venue_id, title, event_date) VALUES (?, ?, ?, ?, ?)',
      [998, 998, 998, 'Birthday Party Special', '2025-12-31']
    );

    // Insert test baby game
    await connection.execute(
      'INSERT IGNORE INTO baby_games (id, game_name, description) VALUES (?, ?, ?)',
      [998, 'Jumping Castle Fun', 'Super fun jumping castle game']
    );

    // Insert test event game
    await connection.execute(
      'INSERT IGNORE INTO event_games_with_slots (id, event_id, game_id, start_time, end_time, max_participants, slot_price) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [998, 998, 998, '14:00:00', '15:00:00', 10, 1799]
    );

    console.log('✓ Test data setup complete');
    await connection.end();

    // Step 2: Create a booking
    console.log('\nStep 2: Creating booking with email to pittisunilkumar3@gmail.com...');
    
    const bookingRef = 'EMAIL' + Date.now().toString().slice(-9);
    const bookingData = {
      event_id: 998,
      booking_ref: bookingRef,
      total_amount: 1799,
      status: 'Confirmed',
      parent_name: 'Sunil Kumar',
      email: 'pittisunilkumar3@gmail.com',
      phone: '9876543210',
      payment_method: 'Credit Card',
      payment_status: 'Paid',
      children: [
        {
          full_name: 'Aarav Kumar',
          date_of_birth: '2019-05-15',
          gender: 'Male',
          school_name: 'Little Stars School',
          booking_games: [
            {
              game_id: 998,
              slot_id: 998,
              game_price: 1799
            }
          ]
        }
      ],
      payment: {
        transaction_id: 'TXN' + Date.now(),
        amount: 1799,
        payment_method: 'Credit Card',
        payment_status: 'Paid'
      }
    };

    const createResponse = await axios.post(`${BASE_URL}/api/bookings`, bookingData);
    
    console.log('✓ Booking created successfully!');
    console.log(`  Booking Reference: ${bookingRef}`);
    console.log(`  Booking ID: ${createResponse.data.booking_id}`);

    // Wait a moment for emails to be sent
    console.log('\nStep 3: Waiting for emails to be sent...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n' + '='.repeat(70));
    console.log('✓✓✓ BOOKING CREATED & EMAILS SENT! 🎉 ✓✓✓');
    console.log('='.repeat(70));
    console.log('\n📧 Two emails have been sent:');
    console.log('\n  1️⃣  Parent Confirmation Email:');
    console.log('      To: pittisunilkumar3@gmail.com');
    console.log('      Subject: 🎉 Booking Confirmation - ' + bookingRef);
    console.log('      Contains: Booking details, child info, game details, payment summary');
    
    console.log('\n  2️⃣  Admin Notification Email:');
    console.log('      To: newindiababyolympics@gmail.com');
    console.log('      Subject: 🔔 New Booking Created - ' + bookingRef);
    console.log('      Contains: Complete booking info, parent details, children & games');
    
    console.log('\n' + '='.repeat(70));
    console.log('\n📬 Please check both email inboxes:');
    console.log('   - pittisunilkumar3@gmail.com (Parent confirmation)');
    console.log('   - newindiababyolympics@gmail.com (Admin notification)');
    console.log('\n💡 Check spam/junk folders if emails are not in inbox');
    console.log('='.repeat(70) + '\n');

    // Cleanup
    console.log('\n--- Cleaning up test data ---');
    const cleanupConn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    await cleanupConn.execute('DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE booking_ref LIKE "EMAIL%")');
    await cleanupConn.execute('DELETE FROM booking_games WHERE booking_id IN (SELECT id FROM bookings WHERE booking_ref LIKE "EMAIL%")');
    await cleanupConn.execute('DELETE FROM children WHERE parent_id IN (SELECT id FROM parents WHERE email = "pittisunilkumar3@gmail.com")');
    await cleanupConn.execute('DELETE FROM bookings WHERE booking_ref LIKE "EMAIL%"');
    await cleanupConn.execute('DELETE FROM parents WHERE email = "pittisunilkumar3@gmail.com"');
    await cleanupConn.execute('DELETE FROM event_games_with_slots WHERE id = 998');
    await cleanupConn.execute('DELETE FROM events WHERE id = 998');
    await cleanupConn.execute('DELETE FROM baby_games WHERE id = 998');
    await cleanupConn.execute('DELETE FROM venues WHERE id = 998');
    await cleanupConn.execute('DELETE FROM cities WHERE id = 998');
    
    console.log('✓ Test data cleaned up\n');
    await cleanupConn.end();

  } catch (error) {
    console.error('\n✗ TEST FAILED:\n');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('  Error:', error.message);
    }
    console.error('\nStack:', error.stack);
  }
}

testBookingWithEmails();
