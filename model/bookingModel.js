const { promisePool } = require('../config/config');

const BookingModel = {
  async createBooking(data) {
    const conn = await promisePool.getConnection();
    try {
      await conn.beginTransaction();
      // Insert or get parent
      let parentId = data.parent_id;
      if (!parentId) {
        const [parentRes] = await conn.query(
          'INSERT INTO parents (parent_name, email, phone) VALUES (?, ?, ?)',
          [data.parent_name, data.email, data.phone]
        );
        parentId = parentRes.insertId;
      }
      // Insert booking
      const [bookingRes] = await conn.query(
        'INSERT INTO bookings (parent_id, event_id, booking_ref, status, total_amount, payment_method, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [parentId, data.event_id, data.booking_ref, data.status || 'Pending', data.total_amount || 0, data.payment_method, data.payment_status || 'Pending']
      );
      const bookingId = bookingRes.insertId;
      
      // Insert children and their booking_games together
      for (const child of data.children) {
        // Create child
        const [childRes] = await conn.query(
          'INSERT INTO children (parent_id, full_name, date_of_birth, gender, school_name) VALUES (?, ?, ?, ?, ?)',
          [parentId, child.full_name, child.date_of_birth, child.gender, child.school_name]
        );
        const childId = childRes.insertId;
        
        // Create booking_games for this child (if any)
        if (child.booking_games && Array.isArray(child.booking_games)) {
          for (const game of child.booking_games) {
            await conn.query(
              'INSERT INTO booking_games (booking_id, child_id, game_id, slot_id, game_price) VALUES (?, ?, ?, ?, ?)',
              [bookingId, childId, game.game_id, game.slot_id, game.game_price || 0]
            );
          }
        }
      }
      // Insert payment record
      let paymentId = null;
      if (data.payment) {
        const [paymentRes] = await conn.query(
          'INSERT INTO payments (booking_id, transaction_id, amount, payment_method, payment_status) VALUES (?, ?, ?, ?, ?)',
          [
            bookingId,
            data.payment.transaction_id || null,
            data.payment.amount || data.total_amount || 0,
            data.payment.payment_method || data.payment_method || null,
            data.payment.payment_status || data.payment_status || 'Pending'
          ]
        );
        paymentId = paymentRes.insertId;
      }
      await conn.commit();
      return { booking_id: bookingId, payment_id: paymentId };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
};

module.exports = BookingModel;
