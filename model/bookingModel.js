const { promisePool } = require('../config/config');

const BookingModel = {
  async createBooking(data) {
    const conn = await promisePool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Create parent record
      const [parentResult] = await conn.query(
        'INSERT INTO parents (parent_name, email, phone) VALUES (?, ?, ?)',
        [data.parent_name, data.email, data.phone]
      );
      const parentId = parentResult.insertId;

      // 2. Create booking record
      const [bookingResult] = await conn.query(
        'INSERT INTO bookings (parent_id, event_id, booking_ref, status, total_amount, payment_method, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          parentId,
          data.event_id,
          data.booking_ref || null,
          data.status || 'Pending',
          data.total_amount || 0,
          data.payment_method || null,
          data.payment_status || 'Pending'
        ]
      );
      const bookingId = bookingResult.insertId;

      // 3. Create children and their booking_games
      for (const child of data.children) {
        const [childResult] = await conn.query(
          'INSERT INTO children (parent_id, full_name, date_of_birth, gender, school_name) VALUES (?, ?, ?, ?, ?)',
          [
            parentId,
            child.full_name,
            child.date_of_birth,
            child.gender,
            child.school_name || null
          ]
        );
        const childId = childResult.insertId;

        // Insert booking_games for this child
        if (child.booking_games && Array.isArray(child.booking_games)) {
          for (const game of child.booking_games) {
            await conn.query(
              'INSERT INTO booking_games (booking_id, child_id, game_id, slot_id, game_price) VALUES (?, ?, ?, ?, ?)',
              [
                bookingId,
                childId,
                game.game_id,
                game.slot_id,
                game.game_price || 0
              ]
            );
          }
        }
      }

      // 4. Create payment record (if provided)
      let paymentId = null;
      if (data.payment) {
        const [paymentResult] = await conn.query(
          'INSERT INTO payments (booking_id, transaction_id, amount, payment_method, payment_status) VALUES (?, ?, ?, ?, ?)',
          [
            bookingId,
            data.payment.transaction_id || null,
            data.payment.amount || 0,
            data.payment.payment_method || null,
            data.payment.payment_status || 'Pending'
          ]
        );
        paymentId = paymentResult.insertId;
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
   * Update an existing booking and its related data
   * @param {number} bookingId - Booking ID to update
   * @param {object} data - Updated booking data
   */
  async updateBooking(bookingId, data) {
    const conn = await promisePool.getConnection();
    try {
      await conn.beginTransaction();
      // Update booking main fields
      await conn.query(
        'UPDATE bookings SET status = ?, total_amount = ?, payment_method = ?, payment_status = ?, updated_at = NOW() WHERE id = ?',
        [data.status, data.total_amount, data.payment_method, data.payment_status, bookingId]
      );

      // Optionally update parent info
      if (data.parent && data.parent.id) {
        await conn.query(
          'UPDATE parents SET parent_name = ?, email = ?, phone = ? WHERE id = ?',
          [data.parent.name, data.parent.email, data.parent.phone, data.parent.id]
        );
      }

      // Optionally update children and booking_games (granular)
      if (Array.isArray(data.children)) {
        for (const child of data.children) {
          let childId = child.child_id;
          if (childId) {
            // Update existing child
            await conn.query(
              'UPDATE children SET full_name = ?, date_of_birth = ?, gender = ?, school_name = ? WHERE id = ?',
              [child.full_name, child.date_of_birth, child.gender, child.school_name, childId]
            );
          } else {
            // Insert new child
            const [childRes] = await conn.query(
              'INSERT INTO children (parent_id, full_name, date_of_birth, gender, school_name) VALUES (?, ?, ?, ?, ?)',
              [data.parent.id, child.full_name, child.date_of_birth, child.gender, child.school_name]
            );
            childId = childRes.insertId;
          }
          // Handle booking_games for this child
          if (Array.isArray(child.booking_games)) {
            for (const game of child.booking_games) {
              if (game.booking_game_id) {
                // Update existing booking_game
                await conn.query(
                  'UPDATE booking_games SET game_id = ?, slot_id = ?, game_price = ? WHERE id = ?',
                  [game.game_id, game.slot_id, game.game_price || 0, game.booking_game_id]
                );
              } else {
                // Insert new booking_game
                await conn.query(
                  'INSERT INTO booking_games (booking_id, child_id, game_id, slot_id, game_price) VALUES (?, ?, ?, ?, ?)',
                  [bookingId, childId, game.game_id, game.slot_id, game.game_price || 0]
                );
              }
            }
            // Optionally: handle deletion of removed games (if a list of to-delete IDs is provided)
            if (Array.isArray(child.delete_booking_game_ids) && child.delete_booking_game_ids.length > 0) {
              await conn.query(
                'DELETE FROM booking_games WHERE id IN (?) AND booking_id = ? AND child_id = ?',
                [child.delete_booking_game_ids, bookingId, childId]
              );
            }
          }
        }
        // Optionally: handle deletion of removed children (if a list of to-delete IDs is provided)
        if (Array.isArray(data.delete_child_ids) && data.delete_child_ids.length > 0) {
          await conn.query('DELETE FROM booking_games WHERE child_id IN (?) AND booking_id = ?', [data.delete_child_ids, bookingId]);
          await conn.query('DELETE FROM children WHERE id IN (?)', [data.delete_child_ids]);
        }
      }

      // Optionally update payment
      if (data.payment && data.payment.payment_id) {
        await conn.query(
          'UPDATE payments SET transaction_id = ?, amount = ?, payment_method = ?, payment_status = ?, updated_at = NOW() WHERE id = ?',
          [data.payment.transaction_id, data.payment.amount, data.payment.payment_method, data.payment.payment_status, data.payment.payment_id]
        );
      }

      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
    // ...existing code for createBooking...

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
  },

  /**
   * Delete a booking and all related data
   * @param {number} bookingId - Booking ID to delete
   * @returns {boolean} - True if successful
   */
  async deleteBooking(bookingId) {
    const conn = await promisePool.getConnection();
    try {
      await conn.beginTransaction();

      // Get booking to verify it exists and get parent_id
      const [bookingRows] = await conn.query(
        'SELECT parent_id FROM bookings WHERE id = ?',
        [bookingId]
      );

      if (!bookingRows || bookingRows.length === 0) {
        await conn.rollback();
        return null; // Booking not found
      }

      const parentId = bookingRows[0].parent_id;

      // Get all children IDs for this booking
      const [childrenRows] = await conn.query(
        'SELECT DISTINCT c.id FROM children c INNER JOIN booking_games bg ON c.id = bg.child_id WHERE bg.booking_id = ?',
        [bookingId]
      );
      const childIds = childrenRows.map(row => row.id);

      // Delete booking_games
      await conn.query('DELETE FROM booking_games WHERE booking_id = ?', [bookingId]);

      // Delete payments
      await conn.query('DELETE FROM payments WHERE booking_id = ?', [bookingId]);

      // Delete booking
      await conn.query('DELETE FROM bookings WHERE id = ?', [bookingId]);

      // Delete children if they exist
      if (childIds.length > 0) {
        await conn.query('DELETE FROM children WHERE id IN (?)', [childIds]);
      }

      // Check if parent has any other bookings
      const [otherBookings] = await conn.query(
        'SELECT id FROM bookings WHERE parent_id = ? LIMIT 1',
        [parentId]
      );

      // If no other bookings, delete the parent
      if (!otherBookings || otherBookings.length === 0) {
        await conn.query('DELETE FROM parents WHERE id = ?', [parentId]);
      }

      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
};

module.exports = BookingModel;
