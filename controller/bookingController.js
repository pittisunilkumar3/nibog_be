
// Helper function to normalize payment status
function normalizePaymentStatus(status) {
  if (!status) return "Pending";
  const normalized = status.toString().toLowerCase().trim();
  const successValues = ["paid", "success", "successful", "completed", "confirmed"];
  return successValues.includes(normalized) ? "Paid" : "Pending";
}

const BookingModel = require('../model/bookingModel');
const EmailSettingsModel = require('../model/emailSettingsModel');
const { promisePool } = require('../config/config');
const QRCode = require('qrcode');
const { jsPDF } = require('jspdf');


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
    // Handle nested structure from webhook (flatten parent, child, booking objects)
    let bookingData = { ...req.body };

    // If data has nested parent/child/booking structure, flatten it
    if (req.body.parent && req.body.child && req.body.booking) {
      bookingData = {
        user_id: req.body.user_id || null,
        parent_name: req.body.parent.parent_name,
        email: req.body.parent.email,
        phone: req.body.parent.additional_phone || req.body.parent.phone,
        event_id: req.body.booking.event_id,
        status: normalizePaymentStatus(req.body.booking.payment_status) === 'Paid' ? 'Confirmed' : 'Pending',
        total_amount: req.body.total_amount || req.body.booking.total_amount || 0,
        payment_method: req.body.booking.payment_method,
        payment_status: normalizePaymentStatus(req.body.booking.payment_status),
        children: [{
          full_name: req.body.child.full_name,
          date_of_birth: req.body.child.date_of_birth,
          gender: req.body.child.gender,
          school_name: req.body.child.school_name,
          booking_games: req.body.booking_games || []
        }]
      };
    }
    // Handle payment object structure from admin manual bookings
    if (req.body.payment && typeof req.body.payment === "object") {
      bookingData.payment_status = normalizePaymentStatus(req.body.payment.payment_status);
      bookingData.payment_method = req.body.payment.payment_method;
      bookingData.transaction_id = req.body.payment.transaction_id;
      bookingData.total_amount = req.body.payment.amount || bookingData.total_amount;
      // If payment is already paid (e.g., Cash payment), confirm the booking
      if (bookingData.payment_status === "Paid") {
        bookingData.status = "Confirmed";
      }
    }


    // Validate required fields
    if (!bookingData.children || bookingData.children.length === 0) {
      return res.status(400).json({ error: 'At least one child is required' });
    }

    // Validate that at least one child has booking_games
    const hasBookingGames = bookingData.children.some(child =>
      child.booking_games && Array.isArray(child.booking_games) && child.booking_games.length > 0
    );

    if (!hasBookingGames) {
      return res.status(400).json({ error: 'At least one child must have booking_games' });
    }

    if (!bookingData.event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }
    if (!bookingData.parent_name || !bookingData.email || !bookingData.phone) {
      return res.status(400).json({ error: 'Parent information (parent_name, email, phone) is required' });
    }

    // Safety net: auto-calculate total_amount from booking_games if it's 0 or missing
    if (!bookingData.total_amount || parseFloat(bookingData.total_amount) === 0) {
      let calculatedTotal = 0;
      if (bookingData.children) {
        for (const child of bookingData.children) {
          if (child.booking_games && Array.isArray(child.booking_games)) {
            for (const game of child.booking_games) {
              calculatedTotal += parseFloat(game.game_price || 0);
            }
          }
        }
      }
      if (calculatedTotal > 0) {
        bookingData.total_amount = calculatedTotal;
        console.log(`⚠️ Auto-calculated total_amount for booking: ₹${calculatedTotal} (was 0 or missing)`);
      }
    }

    const result = await BookingModel.createBooking(bookingData);

    // Get complete booking details for email
    const bookingDetails = await BookingModel.getBookingById(result.booking_id);

    // Ensure booking_id is available (the model returns "id", but email templates expect "booking_id")
    if (bookingDetails && !bookingDetails.booking_id) {
      bookingDetails.booking_id = bookingDetails.id || result.booking_id;
    }

    // Send emails asynchronously (don't wait for them to complete)
    sendBookingEmails(bookingDetails, bookingData).catch(err => {
      console.error('Failed to send booking emails:', err.message);
      console.error('Error details:', err);
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking_id: result.booking_id,
      booking_ref: bookingDetails.booking_ref,
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

    // ===== PAYMENT GATE: send ticket ONLY after successful payment =====
    const isPaid = normalizePaymentStatus(booking.payment_status || requestData.payment_status) === 'Paid';
    if (!isPaid) {
      console.log('⚠️ Payment not completed - sending payment failed/retry email (no ticket)');
      await sendPaymentFailedEmail(booking, requestData);
      return;
    }
    // ...existing code...
    // const adminEmail = 'Nibog100@gmail.com';
    const adminEmail = process.env.ADMIN_EMAIL || 'Nibog100@gmail.com';
    // ...existing code...
    
    // Helper to format 24h time to 12h AM/PM
    const formatTime = (time) => {
      if (!time) return 'N/A';
      const [h, m] = time.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const h12 = hour % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    };

    // Format children and games details
    const childrenDetails = booking.children.map(child => {
      const games = (child.booking_games || [])
        .map(g => {
          const timeSlot = g.slot_start_time && g.slot_end_time 
            ? `${formatTime(g.slot_start_time)} - ${formatTime(g.slot_end_time)}` 
            : 'N/A';
          const noteRow = g.slot_note 
            ? `<tr><td colspan="3" style="padding: 6px 8px; border: 1px solid #ddd; background-color: #fff3f3; color: #dc2626; font-size: 13px; font-weight: 600;">⚠️ ${g.slot_note}</td></tr>` 
            : '';
          return `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${g.game_name || 'N/A'}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${timeSlot}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${parseFloat(g.game_price || 0).toFixed(2)}</td>
          </tr>
          ${noteRow}`;
        }).join('');
      
      // Calculate age in months (based on event date if available, otherwise current date)
      let ageInMonths = 'N/A';
      if (child.date_of_birth) {
        const birthDate = new Date(child.date_of_birth);
        const referenceDate = booking.event?.date ? new Date(booking.event.date) : new Date();
        const months = (referenceDate.getFullYear() - birthDate.getFullYear()) * 12 + 
                       (referenceDate.getMonth() - birthDate.getMonth());
        ageInMonths = Math.max(0, months) + ' months';
      }
      
      return {
        name: child.full_name,
        age: ageInMonths,
        gender: child.gender,
        school: child.school_name || 'N/A',
        games: games
      };
    });

    // ===== Generate entry ticket PDF + QR (Booking ID only) =====
    let ticketAttachments = [];
    try {
      const ticketBookingId = booking.booking_id || booking.id;
      if (ticketBookingId) {
        // QR payload uses ONLY the booking id; format is compatible with the admin QR scanner
        const qrPayload = JSON.stringify({ type: 'event-ticket', ticketId: String(ticketBookingId), booking_id: Number(ticketBookingId) });
        const qrPngBuffer = await QRCode.toBuffer(qrPayload, { type: 'png', width: 320, margin: 1 });
        const pdfBuffer = await buildTicketPDF(booking, ticketBookingId, qrPngBuffer);
        if (pdfBuffer && pdfBuffer.length > 0) {
          ticketAttachments.push({ filename: `NIBOG_Ticket_${ticketBookingId}.pdf`, content: pdfBuffer, contentType: 'application/pdf' });
          ticketAttachments.push({ filename: `ticket-qr-${ticketBookingId}.png`, content: qrPngBuffer, contentType: 'image/png', cid: 'bookingqr' });
          console.log(`🎫 Ticket PDF + QR generated for Booking ID: ${ticketBookingId}`);
        }
      }
    } catch (ticketErr) {
      console.error('Failed to generate ticket PDF/QR (email continues without attachment):', ticketErr.message);
    }

    // Email to Parent - Booking Confirmation
    const parentEmailContent = {
      to: parentEmail,
      subject: `🎉 Booking Confirmation - Booking #${booking.booking_id}`,
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
                🆔 Booking ID: ${booking.booking_id}<br>
                <span style="font-size: 14px;">🎫 Your entry ticket (PDF + QR) is attached below</span>
              </div>
              <div style="text-align: center; margin: 15px 0;">
                <img src="cid:bookingqr" alt="Booking QR Code" width="140" height="140" style="border: 1px solid #ddd; border-radius: 8px; background: #ffffff;" />
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #666; font-weight: bold;">SCAN AT VENUE</p>
              </div>

              <div class="info-section">
                <h3>📅 Event Details</h3>
                <table>
                  <tr>
                    <td style="width: 30%; font-weight: bold;">Event</td>
                    <td>${booking.event?.name || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold;">Date</td>
                    <td>${booking.event?.date ? new Date(booking.event.date).toLocaleDateString('en-IN') : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold;">Venue</td>
                    <td>${booking.event?.venue?.name || 'N/A'}</td>
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
                    <p style="margin: 5px 0;"><strong>Age:</strong> ${child.age} | <strong>Gender:</strong> ${child.gender} | <strong>School:</strong> ${child.school}</p>
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
                    <td style="text-align: right;"><span style="background-color: ${booking.payment_status === 'Paid' || booking.payment_status === 'Confirmed' ? '#28a745' : '#ffc107'}; color: white; padding: 3px 10px; border-radius: 3px;">${booking.payment_status}</span></td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p style="margin: 0;"><strong>📞 Need Help?</strong></p>
                <p style="margin: 5px 0 0 0;">Contact us with your Booking ID for any queries.</p>
              </div>

              <p style="margin-top: 30px;">We look forward to seeing you!</p>
              <p style="margin: 5px 0;"><strong>Best regards,</strong><br>The Nibog Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated confirmation email</p>
              <p><strong>Booking ID:</strong> ${booking.booking_id}</p>
              <p><strong>Booking Date:</strong> ${new Date(booking.booking_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
              <p>&copy; 2026 Nibog Events. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
🎉 Booking Confirmed!

Dear ${requestData.parent_name},

Your booking has been confirmed successfully!

🆔 Booking ID: ${booking.booking_id}

📅 Event Details:
- Event: ${booking.event?.name || 'N/A'}
- Date: ${booking.event?.date ? new Date(booking.event.date).toLocaleDateString('en-IN') : 'N/A'}
- Venue: ${booking.event?.venue?.name || 'N/A'}
- Status: ${booking.status}

👶 Children & Games:
${childrenDetails.map(child => `
${child.name} (${child.age}, ${child.gender})
School: ${child.school}
Games: ${(child.games.match(/<td[^>]*>([^<]+)<\/td>/g) || []).map(g => g.replace(/<[^>]+>/g, '')).filter(g => g.trim()).slice(0,1).join(', ')}
`).join('\n')}

💰 Payment Summary:
Total Amount: ₹${parseFloat(booking.total_amount).toFixed(2)}
Payment Status: ${booking.payment_status}

We look forward to seeing you!

Best regards,
The Nibog Team

---
Booking ID: ${booking.booking_id}
Booking Date: ${new Date(booking.booking_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

© 2026 Nibog Events. All rights reserved.
      `,
      attachments: ticketAttachments
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
                🆔 Booking ID: ${booking.booking_id}
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
                    <td>${booking.event?.name || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold;">Date</td>
                    <td>${booking.event?.date ? new Date(booking.event.date).toLocaleDateString('en-IN') : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold;">Venue</td>
                    <td>${booking.event?.venue?.name || 'N/A'}</td>
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
                    <p style="margin: 5px 0;"><strong>Age:</strong> ${child.age} | <strong>Gender:</strong> ${child.gender} | <strong>School:</strong> ${child.school}</p>
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
                    <td style="text-align: right;"><span style="background-color: ${booking.payment_status === 'Paid' || booking.payment_status === 'Confirmed' ? '#28a745' : '#ffc107'}; color: white; padding: 3px 10px; border-radius: 3px;">${booking.payment_status}</span></td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p style="margin: 0;"><strong>⏰ Booking Time:</strong></p>
                <p style="margin: 5px 0 0 0;">${new Date(booking.booking_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
              </div>
            </div>
            
            <div class="footer">
              <p>This is an automated admin notification</p>
              <p><strong>Booking ID:</strong> ${booking.booking_id}</p>
              <p>&copy; 2026 Nibog Events Admin Panel</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
🔔 New Booking Alert - Admin Notification

A new booking has been created in the system.

🆔 Booking ID: ${booking.booking_id}

👤 Parent Information:
- Name: ${requestData.parent_name}
- Email: ${parentEmail}
- Phone: ${requestData.phone}

📅 Event Details:
- Event: ${booking.event?.name || 'N/A'}
- Date: ${booking.event?.date ? new Date(booking.event.date).toLocaleDateString('en-IN') : 'N/A'}
- Venue: ${booking.event?.venue?.name || 'N/A'}
- Status: ${booking.status}

👶 Children Details (${childrenDetails.length}):
${childrenDetails.map(child => `
${child.name} (${child.age}, ${child.gender})
School: ${child.school}
Games: ${(child.games.match(/<td[^>]*>([^<]+)<\/td>/g) || []).map(g => g.replace(/<[^>]+>/g, '')).filter(g => g.trim()).slice(0,1).join(', ')}
`).join('\n')}

💰 Payment Summary:
Total Amount: ₹${parseFloat(booking.total_amount).toFixed(2)}
Payment Status: ${booking.payment_status}

⏰ Booking Time: ${new Date(booking.booking_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

---
Booking ID: ${booking.id}
© 2026 Nibog Events Admin Panel
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
    console.error('Error stack:', error.stack);
    // Don't throw - we don't want to break the booking process if email fails
    // throw error;
  }
}

/**
 * Build the entry ticket PDF for a booking.
 * Uses ONLY the booking id as the ticket identifier (no booking reference).
 */
async function buildTicketPDF(booking, bookingId, qrPngBuffer) {
  // --- Collect children & games (supports multiple children / multiple games) ---
  const children = (booking.children || []).map(c => ({
    name: c.full_name || 'Participant',
    dob: c.date_of_birth || '',
    school: (c.school_name || '').trim(),
    games: (c.booking_games || []).map(g => ({
      name: g.game_name || 'Game',
      start: g.slot_start_time || '',
      end: g.slot_end_time || '',
      price: parseFloat(g.game_price || 0)
    }))
  }));
  const event = booking.event || {};
  const venue = event.venue || {};

  const fmtTime = (t) => { if (!t) return ''; const p = String(t).split(':'); const h = parseInt(p[0], 10); return (h % 12 || 12) + ':' + p[1] + ' ' + (h >= 12 ? 'PM' : 'AM'); };
  const fmtDate = (d) => { if (!d) return 'N/A'; try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return String(d); } };

  let tStart = '', tEnd = '';
  children.forEach(c => c.games.forEach(g => {
    if (g.start && (!tStart || g.start < tStart)) tStart = g.start;
    if (g.end && (!tEnd || g.end > tEnd)) tEnd = g.end;
  }));

  return new Promise((resolve, reject) => {
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const PW = pdf.internal.pageSize.getWidth();

      const C = {
        purple: [147, 51, 234], fuchsia: [217, 70, 239], pink: [236, 72, 153], purpleDark: [126, 34, 206],
        ink: [15, 23, 42], slate8: [30, 41, 59], slate5: [100, 116, 139], slate4: [148, 163, 184],
        slate3: [203, 213, 225], slate2: [226, 232, 240], slate1: [241, 245, 249], slate0: [248, 250, 252],
        emerald: [5, 150, 105], emeraldD: [4, 120, 87], emeraldL: [110, 231, 183], emeraldInk: [2, 44, 34],
        amberL: [252, 211, 77], amberInk: [69, 26, 3],
        purple100: [237, 223, 253], blue100: [219, 234, 254], green100: [209, 250, 229]
      };

      const cardX = 30, cardW = PW - 60;
      const bandH = 56, footH = 30;
      const col1W = cardW * 0.365, col2W = cardW * 0.365, col3W = cardW - col1W - col2W;
      const col1X = cardX, col2X = cardX + col1W, col3X = cardX + col1W + col2W;
      const pad = 16;
      const col1TextW = col1W - pad * 2 - 24;
      const col2TextW = col2W - pad * 2;

      // ============ PRE-COMPUTE ALL WRAPPED TEXT (responsive layout) ============
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15);
      const evTitle = pdf.splitTextToSize(String(event.name || 'Nibog Event'), col1W - pad * 2).slice(0, 4);
      pdf.setFontSize(10);
      const dateLines = [fmtDate(event.date)];
      const timeVal = tStart ? fmtTime(tStart) + ' - ' + fmtTime(tEnd) : 'Time TBD';
      const timeLines = pdf.splitTextToSize(timeVal, col1TextW);
      const venueLines = pdf.splitTextToSize(String(venue.name || 'N/A'), col1TextW).slice(0, 3);
      const addr = [venue.address, venue.city_name, venue.city_state].filter(Boolean).join(', ');
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
      const addrLines = addr ? pdf.splitTextToSize(addr, col1TextW).slice(0, 3) : [];

      const childrenLaid = children.map(c => {
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13);
        const nameLines = pdf.splitTextToSize(String(c.name), col2TextW).slice(0, 2);
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5);
        const metaVal = 'DOB: ' + fmtDate(c.dob) + (c.school ? '  |  ' + c.school : '');
        const metaLines = pdf.splitTextToSize(metaVal, col2TextW).slice(0, 3);
        const games = c.games.map(g => {
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9);
          const priceText = 'Rs.' + g.price.toFixed(0);
          const priceW = pdf.getTextWidth(priceText);
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9.5);
          const gl = pdf.splitTextToSize(String(g.name), Math.max(60, col2TextW - priceW - 14)).slice(0, 3);
          return { ...g, priceText, nameLines: gl };
        });
        return { ...c, nameLines, metaLines, games };
      });

      // ============ HEIGHT CALCULATION ============
      const perChildH = (c) =>
        18                                     // PARTICIPANT label
        + c.nameLines.length * 15              // name lines
        + c.metaLines.length * 10              // DOB/school lines
        + 12 + 12                              // separator + gap
        + 16                                   // GAMES (n) label
        + c.games.reduce((n, g) => n + g.nameLines.length * 10 + 15, 0)
        + 6;                                   // gap after child
      const col2Need = childrenLaid.reduce((n, c) => n + perChildH(c), 0) + 70; // + payment block
      const col1Need = 24 + evTitle.length * 17 + 8
        + (10 + 24 + dateLines.length * 11)
        + (10 + 24 + timeLines.length * 11)
        + (10 + 24 + venueLines.length * 11)
        + addrLines.length * 10 + 10;
      const bodyH = Math.max(210, col2Need, col1Need) + pad;
      const cardY = 40, cardH = bandH + bodyH + footH;
      const bodyY = cardY + bandH;
      const footY = bodyY + bodyH;
      const steps = 120;

      // ============ DRAW ============
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(...C.slate2);
      pdf.setLineWidth(1.2);
      pdf.roundedRect(cardX, cardY, cardW, cardH, 12, 12, 'FD');

      // top gradient band
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        let rgb;
        if (t < 0.5) rgb = C.purple.map((v, k) => Math.round(v + (C.fuchsia[k] - v) * (t / 0.5)));
        else rgb = C.fuchsia.map((v, k) => Math.round(v + (C.pink[k] - v) * ((t - 0.5) / 0.5)));
        pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
        pdf.rect(cardX + (cardW / steps) * i, cardY, cardW / steps + 0.6, bandH, 'F');
      }
      // footer gradient band
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const rgb = C.purple.map((v, k) => Math.round(v + (C.pink[k] - v) * t));
        pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
        pdf.rect(cardX + (cardW / steps) * i, footY, cardW / steps + 0.6, footH, 'F');
      }
      // clean rounded corners
      pdf.setFillColor(255, 255, 255);
      pdf.circle(cardX, cardY, 12, 'F');
      pdf.circle(cardX + cardW, cardY, 12, 'F');
      pdf.circle(cardX, footY + footH, 12, 'F');
      pdf.circle(cardX + cardW, footY + footH, 12, 'F');
      pdf.setDrawColor(...C.slate2);
      pdf.setLineWidth(1.2);
      pdf.roundedRect(cardX, cardY, cardW, cardH, 12, 12, 'S');

      // band texts
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15);
      pdf.text('NIBOG EVENT TICKET', cardX + 20, cardY + 25);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7);
      pdf.text('OFFICIAL ENTRY PASS', cardX + 20, cardY + 38);

      const statusTxt = String(booking.status || 'Confirmed').toUpperCase();
      const confirmed = statusTxt === 'CONFIRMED';
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9);
      let pillFs = 9;
      while (pdf.getTextWidth(statusTxt) > 118 && pillFs > 6) { pillFs -= 0.5; pdf.setFontSize(pillFs); }
      pdf.setFillColor(...(confirmed ? C.emeraldL : C.amberL));
      pdf.roundedRect(cardX + cardW - 150, cardY + 12, 130, 18, 9, 9, 'F');
      pdf.setTextColor(...(confirmed ? C.emeraldInk : C.amberInk));
      pdf.text(statusTxt, cardX + cardW - 85, cardY + 24.5, { align: 'center' });
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Booked ' + fmtDate(booking.booking_date || booking.created_at), cardX + cardW - 85, cardY + 42, { align: 'center' });

      // column separators
      pdf.setDrawColor(...C.slate2); pdf.setLineWidth(1);
      pdf.line(col2X, bodyY + 10, col2X, footY - 10);
      pdf.setDrawColor(...C.slate3); pdf.setLineDashPattern([4, 3], 0);
      pdf.line(col3X, bodyY + 10, col3X, footY - 10);
      pdf.setLineDashPattern([], 0);

      // ---- Col3 QR stub ----
      pdf.setFillColor(...C.slate0);
      pdf.rect(col3X + 1, bodyY + 1, col3W - 2, bodyH - 2, 'F');
      const qrBox = 104, qx = col3X + (col3W - qrBox) / 2, qy = bodyY + Math.max(26, (bodyH - 190) / 2);
      pdf.setFillColor(255, 255, 255); pdf.setDrawColor(...C.slate2);
      pdf.roundedRect(qx - 6, qy - 6, qrBox + 12, qrBox + 12, 8, 8, 'FD');
      if (qrPngBuffer) pdf.addImage('data:image/png;base64,' + Buffer.from(qrPngBuffer).toString('base64'), 'PNG', qx, qy, qrBox, qrBox);
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(...C.slate4);
      pdf.text('SCAN AT VENUE', col3X + col3W / 2, qy + qrBox + 24, { align: 'center' });
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(18); pdf.setTextColor(...C.purpleDark);
      pdf.text(String(bookingId), col3X + col3W / 2, qy + qrBox + 44, { align: 'center' });
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); pdf.setTextColor(...C.slate4);
      pdf.text('BOOKING ID', col3X + col3W / 2, qy + qrBox + 55, { align: 'center' });

      // ---- Col1 EVENT (all values wrap inside column) ----
      let y = bodyY + pad + 6;
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(...C.purple);
      pdf.text('EVENT', col1X + pad, y); y += 24;
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15); pdf.setTextColor(...C.ink);
      pdf.text(evTitle, col1X + pad, y); y += evTitle.length * 17 + 8;

      const iconRow = (iconBg, label, valueLines, yy) => {
        pdf.setFillColor(...iconBg); pdf.circle(col1X + pad + 8, yy - 4, 8, 'F');
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); pdf.setTextColor(...C.slate4);
        pdf.text(label, col1X + pad + 24, yy - 9);
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(...C.slate8);
        valueLines.forEach((ln, i) => pdf.text(ln, col1X + pad + 24, yy + 3 + i * 11));
        return yy + 24 + valueLines.length * 11;
      };
      y = iconRow(C.purple100, 'DATE', dateLines, y + 10);
      y = iconRow(C.blue100, 'TIME', timeLines, y);
      y = iconRow(C.green100, 'VENUE', venueLines, y);
      if (addrLines.length) {
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(...C.slate5);
        pdf.text(addrLines, col1X + pad + 24, y - 12);
      }

      // ---- Col2 PARTICIPANT + GAMES + PAYMENT (all values wrap inside column) ----
      let y2 = bodyY + pad + 6;
      childrenLaid.forEach((c, ci) => {
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(...C.pink);
        pdf.text('PARTICIPANT' + (childrenLaid.length > 1 ? ' ' + (ci + 1) : ''), col2X + pad, y2); y2 += 18;
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.setTextColor(...C.ink);
        pdf.text(c.nameLines, col2X + pad, y2); y2 += c.nameLines.length * 15;
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...C.slate5);
        pdf.text(c.metaLines, col2X + pad, y2); y2 += c.metaLines.length * 10;
        pdf.setDrawColor(...C.slate1); pdf.setLineWidth(0.8);
        pdf.line(col2X + pad, y2, col2X + col2W - pad, y2); y2 += 12;
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(...C.purple);
        pdf.text('GAMES (' + c.games.length + ')', col2X + pad, y2); y2 += 16;
        c.games.forEach(g => {
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9.5); pdf.setTextColor(...C.slate8);
          pdf.text(g.nameLines, col2X + pad, y2);
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(...C.purpleDark);
          pdf.text(g.priceText, col2X + col2W - pad, y2, { align: 'right' });
          y2 += g.nameLines.length * 10;
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(...C.slate5);
          pdf.text(g.start ? fmtTime(g.start) + ' - ' + fmtTime(g.end) : 'Slot TBD', col2X + pad, y2);
          y2 += 15;
        });
        y2 += 6;
      });
      pdf.setDrawColor(...C.slate1);
      pdf.line(col2X + pad, y2, col2X + col2W - pad, y2); y2 += 16;
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); pdf.setTextColor(...C.slate4);
      pdf.text('AMOUNT PAID', col2X + pad, y2);
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.setTextColor(...C.emeraldD);
      const amtVal = 'Rs.' + parseFloat(booking.total_amount || 0).toFixed(2);
      const amtW = pdf.getTextWidth(amtVal);
      pdf.text(amtVal, col2X + pad, y2 + 18);
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(...C.emerald);
      const payStatus = String(booking.payment_status || 'Paid').toUpperCase();
      const payLines = pdf.splitTextToSize(payStatus, Math.max(60, col2TextW - amtW - 18));
      pdf.text(payLines, col2X + col2W - pad, y2 + 4, { align: 'right' });
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(...C.slate5);
      pdf.text('via ' + String(booking.payment_method || 'Online'), col2X + col2W - pad, y2 + 6 + payLines.length * 11, { align: 'right' });

      // footer strip texts
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(255, 255, 255);
      pdf.text('Arrive 15 minutes early', cardX + 20, footY + 18);
      pdf.text('Parents must stay with children', cardX + cardW / 2, footY + 18, { align: 'center' });
      pdf.text('Bring printed or digital ticket', cardX + cardW - 20, footY + 18, { align: 'right' });

      resolve(Buffer.from(pdf.output('arraybuffer')));
    } catch (e) { reject(e); }
  });
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


/**
 * Send "Payment Failed - Please Retry" email (no ticket - booking not confirmed)
 */
async function sendPaymentFailedEmail(booking, requestData) {
  try {
    const parentEmail = requestData.email || booking.email;
    if (!parentEmail) return;
    const amount = parseFloat(booking.total_amount || 0).toFixed(2);
    const eventName = (booking.event && booking.event.name) || 'NIBOG Event';
    const parentName = requestData.parent_name || booking.parent_name || 'Parent';
    const bid = booking.booking_id || booking.id;
    const retryUrl = 'https://www.nibog.in/events';
    const html = `<!DOCTYPE html>
<html><head><style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; background: #f4f4f4; }
  .container { max-width: 650px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); color: white; padding: 30px; text-align: center; }
  .content { padding: 30px; }
  .amount-box { background: #fef2f2; border: 2px solid #ef4444; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; font-size: 18px; font-weight: bold; color: #991b1b; }
  .btn { display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; margin: 15px 0; }
  .step { background: #f8f9fa; border-left: 4px solid #f97316; padding: 10px 15px; margin: 8px 0; border-radius: 4px; }
  .footer { background: #f8f9fa; text-align: center; padding: 20px; font-size: 12px; color: #666; }
</style></head><body>
  <div class="container">
    <div class="header">
      <h1>&#9888;&#65039; Payment Failed</h1>
      <p>Your payment could not be processed</p>
    </div>
    <div class="content">
      <p>Dear <strong>${parentName}</strong>,</p>
      <p>Unfortunately, your payment for the <strong>${eventName}</strong> booking could not be completed. Your booking is <strong style="color:#dc2626;">NOT confirmed</strong> until the payment is successful.</p>
      <div class="amount-box">Amount to Pay: &#8377;${amount}${bid ? `<br><span style="font-size:14px;">Booking ID: ${bid} (unconfirmed)</span>` : ''}</div>
      <div style="text-align:center;">
        <a href="${retryUrl}" class="btn">RETRY PAYMENT</a>
      </div>
      <h3 style="color:#ef4444;">What you can do:</h3>
      <div class="step"><strong>1. Retry the payment</strong> &mdash; visit <a href="${retryUrl}">nibog.in/events</a> and book again.</div>
      <div class="step"><strong>2. Check your payment method</strong> &mdash; ensure UPI/card/wallet has sufficient balance.</div>
      <div class="step"><strong>3. Amount deducted?</strong> &mdash; If money was deducted, it will be auto-refunded by your bank/PhonePe within 5&ndash;7 working days.</div>
      <p style="margin-top:20px;">Need help? Contact us with your booking details.</p>
      <p><strong>Best regards,</strong><br>The Nibog Team</p>
    </div>
    <div class="footer"><p>&copy; 2026 Nibog Events. All rights reserved.</p></div>
  </div>
</body></html>`;
    const text = `Payment Failed - Please Retry Your Payment

Dear ${parentName},

Your payment for ${eventName} (Rs.${amount}) could not be completed.
Your booking is NOT confirmed until payment is successful.

Retry your payment at: ${retryUrl}

- If money was deducted, it will be auto-refunded in 5-7 working days.
- For help, contact Nibog support.

The Nibog Team`;
    await EmailSettingsModel.sendEmail({
      to: parentEmail,
      subject: '❌ Payment Failed - Please Retry Your Payment' + (bid ? ` (Booking #${bid})` : ''),
      html,
      text
    });
    console.log(`❌ Payment failed/retry email sent to ${parentEmail}`);
  } catch (err) {
    console.error('Failed to send payment failed email:', err.message);
  }
}

exports.sendPaymentFailedEmail = sendPaymentFailedEmail;


// ================= TICKET VERIFICATION & CHECK-IN (Flutter scanner app) =================
function __ticketSummary(booking) {
  const event = booking.event || {};
  const venue = event.venue || {};
  return {
    booking_id: booking.booking_id || booking.id,
    booking_ref: booking.booking_ref,
    event_name: event.name || null,
    event_date: event.date || null,
    venue_name: venue.name || null,
    parent_name: booking.parent_name || null,
    phone: booking.phone || null,
    total_amount: booking.total_amount,
    payment_status: booking.payment_status,
    status: booking.status,
    children: (booking.children || []).map(c => ({
      name: c.full_name,
      games: (c.booking_games || []).map(g => g.game_name)
    }))
  };
}

// GET /api/bookings/ticket/verify/:id - validate ticket only (no mutation)
exports.verifyTicket = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) {
      return res.json({ valid: false, reason: 'invalid_qr', message: 'Invalid ticket code' });
    }

    const booking = await BookingModel.getBookingById(id);
    if (!booking) {
      return res.json({ valid: false, reason: 'not_found', message: 'Ticket not found. Invalid or fake QR code.' });
    }

    const payStatus = normalizePaymentStatus(booking.payment_status);
    if (payStatus !== 'Paid') {
      return res.json({ valid: false, reason: 'unpaid', message: 'Payment not completed for this ticket', booking: __ticketSummary(booking) });
    }
    if (String(booking.status || '').toLowerCase() === 'cancelled') {
      return res.json({ valid: false, reason: 'cancelled', message: 'This booking was cancelled', booking: __ticketSummary(booking) });
    }

    let checkedInAt = null, checkedInBy = null;
    try {
      const [rows] = await promisePool.query('SELECT checked_in_at, checked_in_by FROM bookings WHERE id = ?', [id]);
      if (rows && rows[0]) { checkedInAt = rows[0].checked_in_at; checkedInBy = rows[0].checked_in_by; }
    } catch (e) { /* columns may not exist yet */ }

    if (checkedInAt) {
      return res.json({
        valid: false,
        reason: 'already_used',
        message: 'Ticket already checked in - EXPIRED (do not accept)',
        checked_in_at: checkedInAt,
        checked_in_by: checkedInBy,
        booking: __ticketSummary(booking)
      });
    }

    return res.json({ valid: true, reason: 'ok', message: 'Ticket is VALID - not yet checked in', booking: __ticketSummary(booking) });
  } catch (err) {
    res.status(500).json({ valid: false, reason: 'error', message: err.message });
  }
};

// POST /api/bookings/ticket/checkin/:id - validate + check in (QR expires after this)
exports.checkinTicket = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) {
      return res.json({ valid: false, reason: 'invalid_qr', message: 'Invalid ticket code' });
    }

    const booking = await BookingModel.getBookingById(id);
    if (!booking) {
      return res.json({ valid: false, reason: 'not_found', message: 'Ticket not found. Invalid or fake QR code.' });
    }

    const payStatus = normalizePaymentStatus(booking.payment_status);
    if (payStatus !== 'Paid') {
      return res.json({ valid: false, reason: 'unpaid', message: 'Payment not completed - cannot check in', booking: __ticketSummary(booking) });
    }
    if (String(booking.status || '').toLowerCase() === 'cancelled') {
      return res.json({ valid: false, reason: 'cancelled', message: 'This booking was cancelled', booking: __ticketSummary(booking) });
    }

    let checkedInAt = null, checkedInBy = null;
    try {
      const [rows] = await promisePool.query('SELECT checked_in_at, checked_in_by FROM bookings WHERE id = ?', [id]);
      if (rows && rows[0]) { checkedInAt = rows[0].checked_in_at; checkedInBy = rows[0].checked_in_by; }
    } catch (e) { /* columns may not exist yet */ }

    if (checkedInAt) {
      return res.json({
        valid: false,
        reason: 'already_used',
        message: 'ALREADY CHECKED IN - ticket EXPIRED (entry denied)',
        checked_in_at: checkedInAt,
        checked_in_by: checkedInBy,
        booking: __ticketSummary(booking)
      });
    }

    const by = (req.body && req.body.checked_in_by) || 'scanner-app';
    await promisePool.query('UPDATE bookings SET checked_in_at = NOW(), checked_in_by = ? WHERE id = ?', [by, id]);

    return res.json({
      valid: true,
      reason: 'checked_in',
      message: 'Checked in successfully. Ticket is now EXPIRED.',
      checked_in_at: new Date().toISOString(),
      checked_in_by: by,
      booking: __ticketSummary(booking)
    });
  } catch (err) {
    res.status(500).json({ valid: false, reason: 'error', message: err.message });
  }
};
