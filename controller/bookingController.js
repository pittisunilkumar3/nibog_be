
const BookingModel = require('../model/bookingModel');
const EmailSettingsModel = require('../model/emailSettingsModel');


/**
 * Update an existing booking and its related data
 * PATCH /api/bookings/:id
 */
exports.updateBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }
    // Validate input (at least one field to update)
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'No data provided for update' });
    }
    await BookingModel.updateBooking(bookingId, req.body);
    // Optionally, return the updated booking
    const updatedBooking = await BookingModel.getBookingById(bookingId);
    res.status(200).json({
      message: 'Booking updated successfully',
      data: updatedBooking
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/**
 * Create a new booking with parent, children, and games/slots
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 *
 * POST /api/bookings
 */
exports.createBooking = async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.children || req.body.children.length === 0) {
      return res.status(400).json({ error: 'At least one child is required' });
    }
    
    // Validate that at least one child has booking_games
    const hasBookingGames = req.body.children.some(child => 
      child.booking_games && Array.isArray(child.booking_games) && child.booking_games.length > 0
    );
    
    if (!hasBookingGames) {
      return res.status(400).json({ error: 'At least one child must have booking_games' });
    }
    
    if (!req.body.event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }
    if (!req.body.parent_name || !req.body.email || !req.body.phone) {
      return res.status(400).json({ error: 'Parent information (parent_name, email, phone) is required' });
    }
    
    const result = await BookingModel.createBooking(req.body);
    
    // Get complete booking details for email
    const bookingDetails = await BookingModel.getBookingById(result.booking_id);
    
    // Send emails asynchronously (don't wait for them to complete)
    sendBookingEmails(bookingDetails, req.body).catch(err => {
      console.error('Error sending booking emails:', err.message);
    });
    
    res.status(201).json({
      message: 'Booking created successfully',
      booking_id: result.booking_id,
      payment_id: result.payment_id || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Send booking confirmation emails to parent and admin
 */
async function sendBookingEmails(booking, requestData) {
  try {
    const parentEmail = requestData.email;
    // ...existing code...
    // const adminEmail = 'newindiababyolympics@gmail.com';
    const adminEmail = process.env.ADMIN_EMAIL || 'newindiababyolympics@gmail.com';
    // ...existing code...
    
    // Format children and games details
    const childrenDetails = booking.children.map(child => {
      const games = booking.booking_games
        .filter(g => g.child_id === child.child_id)
        .map(g => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${g.game_name}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${g.slot_time || 'N/A'}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${parseFloat(g.game_price).toFixed(2)}</td>
          </tr>
        `).join('');
      
      return {
        name: child.full_name,
        age: child.date_of_birth ? new Date().getFullYear() - new Date(child.date_of_birth).getFullYear() : 'N/A',
        gender: child.gender,
        school: child.school_name || 'N/A',
        games: games
      };
    });

    // Email to Parent - Booking Confirmation
    const parentEmailContent = {
      to: parentEmail,
      subject: `🎉 Booking Confirmation - ${booking.booking_ref}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 650px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { padding: 30px; }
            .booking-ref { background-color: #fff3cd; border: 2px solid #ffc107; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; font-size: 20px; font-weight: bold; color: #856404; }
            .info-section { margin: 20px 0; }
            .info-section h3 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th { background-color: #667eea; color: white; padding: 10px; text-align: left; }
            td { padding: 8px; border: 1px solid #ddd; }
            .total-row { background-color: #f8f9fa; font-weight: bold; font-size: 18px; }
            .footer { background-color: #f8f9fa; text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .child-card { background-color: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #667eea; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Booking Confirmed!</h1>
              <p style="margin: 10px 0 0 0;">Thank you for choosing Nibog</p>
            </div>
            
            <div class="content">
              <p>Dear <strong>${requestData.parent_name}</strong>,</p>
              <p>Your booking has been confirmed successfully! We're excited to host your event.</p>
              
              <div class="booking-ref">
                📋 Booking Reference: ${booking.booking_ref}
              </div>

              <div class="info-section">
                <h3>📅 Event Details</h3>
                <table>
                  <tr>
                    <td style="width: 30%; font-weight: bold;">Event</td>
                    <td>${booking.event?.event_name || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold;">Date</td>
                    <td>${booking.event?.event_date ? new Date(booking.event.event_date).toLocaleDateString('en-IN') : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold;">Venue</td>
                    <td>${booking.event?.venue?.venue_name || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold;">Status</td>
                    <td><span style="background-color: #28a745; color: white; padding: 3px 10px; border-radius: 3px;">${booking.status}</span></td>
                  </tr>
                </table>
              </div>

              <div class="info-section">
                <h3>👶 Children & Games Details</h3>
                ${childrenDetails.map(child => `
                  <div class="child-card">
                    <h4 style="margin: 0 0 10px 0; color: #667eea;">👤 ${child.name}</h4>
                    <p style="margin: 5px 0;"><strong>Age:</strong> ${child.age} years | <strong>Gender:</strong> ${child.gender} | <strong>School:</strong> ${child.school}</p>
                    <h5 style="margin: 10px 0 5px 0;">Games Booked:</h5>
                    <table>
                      <thead>
                        <tr>
                          <th>Game Name</th>
                          <th>Time Slot</th>
                          <th style="text-align: right;">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${child.games}
                      </tbody>
                    </table>
                  </div>
                `).join('')}
              </div>

              <div class="info-section">
                <h3>💰 Payment Summary</h3>
                <table>
                  <tr class="total-row">
                    <td>Total Amount</td>
                    <td style="text-align: right;">₹${parseFloat(booking.total_amount).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>Payment Status</td>
                    <td style="text-align: right;"><span style="background-color: ${booking.payment_status === 'Paid' ? '#28a745' : '#ffc107'}; color: white; padding: 3px 10px; border-radius: 3px;">${booking.payment_status}</span></td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p style="margin: 0;"><strong>📞 Need Help?</strong></p>
                <p style="margin: 5px 0 0 0;">Contact us with your booking reference for any queries.</p>
              </div>

              <p style="margin-top: 30px;">We look forward to seeing you!</p>
              <p style="margin: 5px 0;"><strong>Best regards,</strong><br>The Nibog Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated confirmation email</p>
              <p><strong>Booking Date:</strong> ${new Date(booking.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
              <p>&copy; 2025 Nibog Events. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
🎉 Booking Confirmed!

Dear ${requestData.parent_name},

Your booking has been confirmed successfully!

📋 Booking Reference: ${booking.booking_ref}

📅 Event Details:
- Event: ${booking.event?.event_name || 'N/A'}
- Date: ${booking.event?.event_date ? new Date(booking.event.event_date).toLocaleDateString('en-IN') : 'N/A'}
- Venue: ${booking.event?.venue?.venue_name || 'N/A'}
- Status: ${booking.status}

👶 Children & Games:
${childrenDetails.map(child => `
${child.name} (${child.age} years, ${child.gender})
School: ${child.school}
Games: ${booking.booking_games.filter(g => g.child_name === child.name).map(g => g.game_name).join(', ')}
`).join('\n')}

💰 Payment Summary:
Total Amount: ₹${parseFloat(booking.total_amount).toFixed(2)}
Payment Status: ${booking.payment_status}

We look forward to seeing you!

Best regards,
The Nibog Team

---
Booking Date: ${new Date(booking.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
© 2025 Nibog Events. All rights reserved.
      `
    };

    // Email to Admin - New Booking Notification
    const adminEmailContent = {
      to: adminEmail,
      subject: `🔔 New Booking Created - ${booking.booking_ref}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 650px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { padding: 30px; }
            .booking-ref { background-color: #fff3cd; border: 2px solid #ffc107; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; font-size: 20px; font-weight: bold; color: #856404; }
            .info-section { margin: 20px 0; }
            .info-section h3 { color: #ff6b6b; border-bottom: 2px solid #ff6b6b; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th { background-color: #ff6b6b; color: white; padding: 10px; text-align: left; }
            td { padding: 8px; border: 1px solid #ddd; }
            .total-row { background-color: #f8f9fa; font-weight: bold; font-size: 18px; }
            .footer { background-color: #f8f9fa; text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .child-card { background-color: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #ff6b6b; }
            .alert-badge { background-color: #ff6b6b; color: white; padding: 5px 15px; border-radius: 20px; display: inline-block; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 New Booking Alert</h1>
              <p style="margin: 10px 0 0 0;">Admin Notification</p>
            </div>
            
            <div class="content">
              <div class="alert-badge">⚡ NEW BOOKING</div>
              
              <p>A new booking has been created in the system.</p>
              
              <div class="booking-ref">
                📋 Booking Reference: ${booking.booking_ref}
              </div>

              <div class="info-section">
                <h3>👤 Parent Information</h3>
                <table>
                  <tr>
                    <td style="width: 30%; font-weight: bold;">Name</td>
                    <td>${requestData.parent_name}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold;">Email</td>
                    <td><a href="mailto:${parentEmail}">${parentEmail}</a></td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold;">Phone</td>
                    <td><a href="tel:${requestData.phone}">${requestData.phone}</a></td>
                  </tr>
                </table>
              </div>

              <div class="info-section">
                <h3>📅 Event Details</h3>
                <table>
                  <tr>
                    <td style="width: 30%; font-weight: bold;">Event</td>
                    <td>${booking.event?.event_name || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold;">Date</td>
                    <td>${booking.event?.event_date ? new Date(booking.event.event_date).toLocaleDateString('en-IN') : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold;">Venue</td>
                    <td>${booking.event?.venue?.venue_name || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold;">Status</td>
                    <td><span style="background-color: #28a745; color: white; padding: 3px 10px; border-radius: 3px;">${booking.status}</span></td>
                  </tr>
                </table>
              </div>

              <div class="info-section">
                <h3>👶 Children Details (${booking.children.length})</h3>
                ${childrenDetails.map(child => `
                  <div class="child-card">
                    <h4 style="margin: 0 0 10px 0; color: #ff6b6b;">👤 ${child.name}</h4>
                    <p style="margin: 5px 0;"><strong>Age:</strong> ${child.age} years | <strong>Gender:</strong> ${child.gender} | <strong>School:</strong> ${child.school}</p>
                    <h5 style="margin: 10px 0 5px 0;">Games Booked:</h5>
                    <table>
                      <thead>
                        <tr>
                          <th>Game Name</th>
                          <th>Time Slot</th>
                          <th style="text-align: right;">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${child.games}
                      </tbody>
                    </table>
                  </div>
                `).join('')}
              </div>

              <div class="info-section">
                <h3>💰 Payment Summary</h3>
                <table>
                  <tr class="total-row">
                    <td>Total Amount</td>
                    <td style="text-align: right;">₹${parseFloat(booking.total_amount).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>Payment Method</td>
                    <td style="text-align: right;">${booking.payment_method || 'Not specified'}</td>
                  </tr>
                  <tr>
                    <td>Payment Status</td>
                    <td style="text-align: right;"><span style="background-color: ${booking.payment_status === 'Paid' ? '#28a745' : '#ffc107'}; color: white; padding: 3px 10px; border-radius: 3px;">${booking.payment_status}</span></td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p style="margin: 0;"><strong>⏰ Booking Time:</strong></p>
                <p style="margin: 5px 0 0 0;">${new Date(booking.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
              </div>
            </div>
            
            <div class="footer">
              <p>This is an automated admin notification</p>
              <p><strong>Booking ID:</strong> ${booking.booking_id}</p>
              <p>&copy; 2025 Nibog Events Admin Panel</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
🔔 New Booking Alert - Admin Notification

A new booking has been created in the system.

📋 Booking Reference: ${booking.booking_ref}

👤 Parent Information:
- Name: ${requestData.parent_name}
- Email: ${parentEmail}
- Phone: ${requestData.phone}

📅 Event Details:
- Event: ${booking.event?.event_name || 'N/A'}
- Date: ${booking.event?.event_date ? new Date(booking.event.event_date).toLocaleDateString('en-IN') : 'N/A'}
- Venue: ${booking.event?.venue?.venue_name || 'N/A'}
- Status: ${booking.status}

👶 Children Details (${booking.children.length}):
${childrenDetails.map(child => `
${child.name} (${child.age} years, ${child.gender})
School: ${child.school}
Games: ${booking.booking_games.filter(g => g.child_name === child.name).map(g => g.game_name).join(', ')}
`).join('\n')}

💰 Payment Summary:
Total Amount: ₹${parseFloat(booking.total_amount).toFixed(2)}
Payment Status: ${booking.payment_status}

⏰ Booking Time: ${new Date(booking.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

---
Booking ID: ${booking.booking_id}
© 2025 Nibog Events Admin Panel
      `
    };

    // Send both emails
    await Promise.all([
      EmailSettingsModel.sendEmail(parentEmailContent),
      EmailSettingsModel.sendEmail(adminEmailContent)
    ]);

    console.log(`✓ Booking emails sent successfully for booking ${booking.booking_ref}`);
    console.log(`  - Parent: ${parentEmail}`);
    console.log(`  - Admin: ${adminEmail}`);
    
  } catch (error) {
    console.error('Failed to send booking emails:', error.message);
    throw error;
  }
}

/**
 * Get user profile with all booking details by user_id
 * Returns user info, parent info, bookings with children, games, and payments
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 *
 * GET /api/bookings/user/:userId
 */
exports.getUserProfileWithBookings = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await BookingModel.getUserProfileWithBookings(userId);
    
    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get all bookings with complete details (upcoming events only)
 * Returns list of bookings for events that haven't passed
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 *
 * GET /api/bookings
 */
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await BookingModel.getAllBookings();
    
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get all bookings including past and upcoming events
 * Returns complete list of all bookings regardless of event date
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 *
 * GET /api/bookings/all
 */
exports.getAllBookingsComplete = async (req, res) => {
  try {
    const bookings = await BookingModel.getAllBookingsComplete();
    
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get single booking details by booking ID
 * Returns complete booking info with parent, event, children, games, and payments
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 *
 * GET /api/bookings/:id
 */
exports.getBookingById = async (req, res) => {
  try {
    const bookingId = req.params.id;
    
    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    const booking = await BookingModel.getBookingById(bookingId);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Check and get booking details by booking reference
 * Returns complete booking info with parent, event, children, games, and payments
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 *
 * GET /api/bookings/check?booking_ref=PPT251227045
 */
exports.checkBookingByReference = async (req, res) => {
  try {
    const bookingRef = req.query.booking_ref;
    
    if (!bookingRef) {
      return res.status(400).json({ 
        success: false,
        error: 'booking_ref query parameter is required',
        message: 'Please provide booking reference in the format: ?booking_ref=PPT251227045'
      });
    }

    const booking = await BookingModel.getBookingByReference(bookingRef);
    
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        error: 'Booking not found',
        message: `No booking found with reference: ${bookingRef}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Booking found successfully',
      data: booking
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

/**
 * Delete a booking and all related data
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 *
 * DELETE /api/bookings/:id
 */
exports.deleteBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    
    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    const result = await BookingModel.deleteBooking(bookingId);
    
    if (result === null) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
