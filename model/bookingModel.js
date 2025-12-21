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
  },

  /**
   * Get user profile with all booking details by user_id
   * Returns user info, parent info, bookings with children, games, slots, and payments
   */
  async getUserProfileWithBookings(userId) {
    try {
      // Get user profile
      const [userRows] = await promisePool.query(`
        SELECT u.*, c.city_name, c.state
        FROM users u
        LEFT JOIN cities c ON u.city_id = c.id
        WHERE u.user_id = ?
      `, [userId]);

      if (!userRows || userRows.length === 0) {
        return null;
      }

      const user = userRows[0];

      // Get parent info associated with this user
      const [parentRows] = await promisePool.query(`
        SELECT id, parent_name, email, phone, created_at, updated_at
        FROM parents
        WHERE user_id = ?
      `, [userId]);

      // Get all bookings for this user through parent relationship
      const [bookingRows] = await promisePool.query(`
        SELECT 
          b.id as booking_id,
          b.booking_ref,
          b.status as booking_status,
          b.total_amount,
          b.payment_method,
          b.payment_status,
          b.created_at as booking_created_at,
          b.updated_at as booking_updated_at,
          p.id as parent_id,
          p.parent_name,
          p.email as parent_email,
          p.phone as parent_phone,
          e.id as event_id,
          e.title as event_name,
          e.event_date,
          e.description as event_description,
          e.image_url as event_image_url,
          e.status as event_status,
          v.id as venue_id,
          v.venue_name,
          v.address as venue_address,
          v.contact_number as venue_contact,
          c.city_name as venue_city,
          c.state as venue_state
        FROM bookings b
        INNER JOIN parents p ON b.parent_id = p.id
        LEFT JOIN events e ON b.event_id = e.id
        LEFT JOIN venues v ON e.venue_id = v.id
        LEFT JOIN cities c ON v.city_id = c.id
        WHERE p.user_id = ?
        ORDER BY b.created_at DESC
      `, [userId]);

      // Get detailed info for each booking
      const bookings = [];
      for (const booking of bookingRows) {
        // Get children for this booking
        const [childrenRows] = await promisePool.query(`
          SELECT DISTINCT
            c.id as child_id,
            c.full_name,
            c.date_of_birth,
            c.gender,
            c.school_name,
            c.created_at,
            c.updated_at
          FROM children c
          INNER JOIN booking_games bg ON c.id = bg.child_id
          WHERE bg.booking_id = ?
        `, [booking.booking_id]);

        // Get booking games with game details for each child
        const children = [];
        for (const child of childrenRows) {
          const [gamesRows] = await promisePool.query(`
            SELECT 
              bg.id as booking_game_id,
              bg.game_price,
              bg.created_at as booking_game_created_at,
              g.id as game_id,
              g.game_name,
              g.description as game_description,
              g.min_age,
              g.max_age,
              g.duration_minutes,
              g.image_url as game_image_url,
              egs.id as slot_id,
              egs.start_time as slot_start_time,
              egs.end_time as slot_end_time,
              egs.max_participants as available_spots,
              egs.custom_title as slot_custom_title,
              egs.custom_description as slot_custom_description,
              egs.custom_price as slot_custom_price
            FROM booking_games bg
            LEFT JOIN baby_games g ON bg.game_id = g.id
            LEFT JOIN event_games_with_slots egs ON bg.slot_id = egs.id
            WHERE bg.booking_id = ? AND bg.child_id = ?
          `, [booking.booking_id, child.child_id]);

          children.push({
            ...child,
            booking_games: gamesRows
          });
        }

        // Get payment details for this booking
        const [paymentRows] = await promisePool.query(`
          SELECT 
            id as payment_id,
            transaction_id,
            amount,
            payment_method,
            payment_status,
            created_at as payment_created_at,
            updated_at as payment_updated_at
          FROM payments
          WHERE booking_id = ?
        `, [booking.booking_id]);

        bookings.push({
          booking_id: booking.booking_id,
          booking_ref: booking.booking_ref,
          status: booking.booking_status,
          total_amount: booking.total_amount,
          payment_method: booking.payment_method,
          payment_status: booking.payment_status,
          created_at: booking.booking_created_at,
          updated_at: booking.booking_updated_at,
          parent: {
            parent_id: booking.parent_id,
            parent_name: booking.parent_name,
            email: booking.parent_email,
            phone: booking.parent_phone
          },
          event: {
            event_id: booking.event_id,
            event_name: booking.event_name,
            event_date: booking.event_date,
            event_description: booking.event_description,
            event_image_url: booking.event_image_url,
            event_status: booking.event_status,
            venue: {
              venue_id: booking.venue_id,
              venue_name: booking.venue_name,
              address: booking.venue_address,
              contact_number: booking.venue_contact,
              city: booking.venue_city,
              state: booking.venue_state
            }
          },
          children: children,
          payments: paymentRows
        });
      }

      return {
        user: user,
        parents: parentRows,
        bookings: bookings
      };

    } catch (err) {
      throw err;
    }
  },

  /**
   * Get all bookings with complete details
   * Returns list of all bookings with parent, event, children, games, and payment info
   */
  async getAllBookings() {
    try {
      // Get all bookings
      const [bookingRows] = await promisePool.query(`
        SELECT 
          b.id as booking_id,
          b.booking_ref,
          b.status as booking_status,
          b.total_amount,
          b.payment_method,
          b.payment_status,
          b.created_at as booking_date,
          b.updated_at as booking_updated_at,
          p.id as parent_id,
          p.parent_name,
          p.email as parent_email,
          p.phone as parent_phone,
          p.user_id,
          e.id as event_id,
          e.title as event_name,
          e.event_date,
          e.description as event_description,
          e.image_url as event_image_url,
          e.status as event_status,
          v.id as venue_id,
          v.venue_name,
          v.address as venue_address,
          v.contact_number as venue_contact,
          c.city_name as venue_city,
          c.state as venue_state
        FROM bookings b
        INNER JOIN parents p ON b.parent_id = p.id
        LEFT JOIN events e ON b.event_id = e.id
        LEFT JOIN venues v ON e.venue_id = v.id
        LEFT JOIN cities c ON v.city_id = c.id
        ORDER BY b.created_at DESC
      `);

      const bookings = [];
      for (const booking of bookingRows) {
        // Get children for this booking
        const [childrenRows] = await promisePool.query(`
          SELECT DISTINCT
            c.id as child_id,
            c.full_name,
            c.date_of_birth,
            c.gender,
            c.school_name
          FROM children c
          INNER JOIN booking_games bg ON c.id = bg.child_id
          WHERE bg.booking_id = ?
        `, [booking.booking_id]);

        // Get booking games for each child
        const children = [];
        for (const child of childrenRows) {
          const [gamesRows] = await promisePool.query(`
            SELECT 
              bg.id as booking_game_id,
              bg.game_price,
              g.id as game_id,
              g.game_name,
              g.description as game_description,
              g.min_age,
              g.max_age,
              g.image_url as game_image_url,
              egs.id as slot_id,
              egs.start_time as slot_start_time,
              egs.end_time as slot_end_time,
              egs.custom_title as slot_custom_title
            FROM booking_games bg
            LEFT JOIN baby_games g ON bg.game_id = g.id
            LEFT JOIN event_games_with_slots egs ON bg.slot_id = egs.id
            WHERE bg.booking_id = ? AND bg.child_id = ?
          `, [booking.booking_id, child.child_id]);

          children.push({
            ...child,
            booking_games: gamesRows
          });
        }

        // Get payment details
        const [paymentRows] = await promisePool.query(`
          SELECT 
            id as payment_id,
            transaction_id,
            amount,
            payment_method,
            payment_status,
            created_at as payment_date
          FROM payments
          WHERE booking_id = ?
        `, [booking.booking_id]);

        bookings.push({
          id: booking.booking_id,
          booking_ref: booking.booking_ref,
          status: booking.booking_status,
          total_amount: booking.total_amount,
          payment_method: booking.payment_method,
          payment_status: booking.payment_status,
          booking_date: booking.booking_date,
          parent: {
            id: booking.parent_id,
            name: booking.parent_name,
            email: booking.parent_email,
            phone: booking.parent_phone,
            user_id: booking.user_id
          },
          event: {
            id: booking.event_id,
            name: booking.event_name,
            date: booking.event_date,
            description: booking.event_description,
            image_url: booking.event_image_url,
            status: booking.event_status,
            venue: {
              id: booking.venue_id,
              name: booking.venue_name,
              address: booking.venue_address,
              contact: booking.venue_contact,
              city: booking.venue_city,
              state: booking.venue_state
            }
          },
          children: children,
          payments: paymentRows
        });
      }

      return bookings;
    } catch (err) {
      throw err;
    }
  },

  /**
   * Get single booking details by booking ID
   * Returns complete booking info with parent, event, children, games, and payments
   */
  async getBookingById(bookingId) {
    try {
      // Get booking details
      const [bookingRows] = await promisePool.query(`
        SELECT 
          b.id as booking_id,
          b.booking_ref,
          b.status as booking_status,
          b.total_amount,
          b.payment_method,
          b.payment_status,
          b.created_at as booking_date,
          b.updated_at as booking_updated_at,
          p.id as parent_id,
          p.parent_name,
          p.email as parent_email,
          p.phone as parent_phone,
          p.user_id,
          e.id as event_id,
          e.title as event_name,
          e.event_date,
          e.description as event_description,
          e.image_url as event_image_url,
          e.status as event_status,
          v.id as venue_id,
          v.venue_name,
          v.address as venue_address,
          v.contact_number as venue_contact,
          c.city_name as venue_city,
          c.state as venue_state
        FROM bookings b
        INNER JOIN parents p ON b.parent_id = p.id
        LEFT JOIN events e ON b.event_id = e.id
        LEFT JOIN venues v ON e.venue_id = v.id
        LEFT JOIN cities c ON v.city_id = c.id
        WHERE b.id = ?
      `, [bookingId]);

      if (!bookingRows || bookingRows.length === 0) {
        return null;
      }

      const booking = bookingRows[0];

      // Get children for this booking
      const [childrenRows] = await promisePool.query(`
        SELECT DISTINCT
          c.id as child_id,
          c.full_name,
          c.date_of_birth,
          c.gender,
          c.school_name,
          c.created_at,
          c.updated_at
        FROM children c
        INNER JOIN booking_games bg ON c.id = bg.child_id
        WHERE bg.booking_id = ?
      `, [bookingId]);

      // Get booking games for each child
      const children = [];
      for (const child of childrenRows) {
        const [gamesRows] = await promisePool.query(`
          SELECT 
            bg.id as booking_game_id,
            bg.game_price,
            bg.created_at as booked_at,
            g.id as game_id,
            g.game_name,
            g.description as game_description,
            g.min_age,
            g.max_age,
            g.duration_minutes,
            g.image_url as game_image_url,
            egs.id as slot_id,
            egs.start_time as slot_start_time,
            egs.end_time as slot_end_time,
            egs.custom_title as slot_custom_title,
            egs.custom_description as slot_custom_description,
            egs.custom_price as slot_custom_price,
            egs.max_participants as slot_max_participants
          FROM booking_games bg
          LEFT JOIN baby_games g ON bg.game_id = g.id
          LEFT JOIN event_games_with_slots egs ON bg.slot_id = egs.id
          WHERE bg.booking_id = ? AND bg.child_id = ?
        `, [bookingId, child.child_id]);

        children.push({
          ...child,
          booking_games: gamesRows
        });
      }

      // Get payment details
      const [paymentRows] = await promisePool.query(`
        SELECT 
          id as payment_id,
          transaction_id,
          amount,
          payment_method,
          payment_status,
          created_at as payment_date,
          updated_at as payment_updated_at
        FROM payments
        WHERE booking_id = ?
      `, [bookingId]);

      return {
        id: booking.booking_id,
        booking_ref: booking.booking_ref,
        status: booking.booking_status,
        total_amount: booking.total_amount,
        payment_method: booking.payment_method,
        payment_status: booking.payment_status,
        booking_date: booking.booking_date,
        updated_at: booking.booking_updated_at,
        parent: {
          id: booking.parent_id,
          name: booking.parent_name,
          email: booking.parent_email,
          phone: booking.parent_phone,
          user_id: booking.user_id
        },
        event: {
          id: booking.event_id,
          name: booking.event_name,
          date: booking.event_date,
          description: booking.event_description,
          image_url: booking.event_image_url,
          status: booking.event_status,
          venue: {
            id: booking.venue_id,
            name: booking.venue_name,
            address: booking.venue_address,
            contact: booking.venue_contact,
            city: booking.venue_city,
            state: booking.venue_state
          }
        },
        children: children,
        payments: paymentRows
      };
    } catch (err) {
      throw err;
    }
  }
};

module.exports = BookingModel;
