// GET /api/attendance/report — live attendance from ticket-scan check-ins
exports.report = async (req, res) => {
  try {
    const pool = require('../config/config').promisePool;
    const paidIn = `LOWER(b.payment_status) IN ('paid','completed','success')`;
    const evId = parseInt(req.query.event_id, 10);
    const evFilter = evId ? `AND b.event_id = ${evId}` : '';

    // summary + per-event
    const [events] = await pool.query(`
      SELECT b.event_id, COALESCE(e.title, 'Unknown Event') AS event_name,
             DATE_FORMAT(e.event_date, '%d %b %Y') AS event_date,
             COALESCE(v.venue_name, '') AS venue_name, COALESCE(c.city_name, '') AS city_name,
             CAST(COUNT(*) AS SIGNED) AS registered,
             CAST(COALESCE(SUM(CASE WHEN b.checked_in_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS SIGNED) AS attended
      FROM bookings b
      LEFT JOIN events e ON e.id = b.event_id
      LEFT JOIN venues v ON e.venue_id = v.id
      LEFT JOIN cities c ON e.city_id = c.id
      WHERE ${paidIn}
      ${evFilter}
      GROUP BY b.event_id, e.title, e.event_date, v.venue_name, c.city_name
      ORDER BY e.event_date DESC, attended DESC
    `);

    const byEvent = events.map(ev => {
      const noShow = Math.max(0, ev.registered - ev.attended);
      return { ...ev, no_show: noShow, attendance_rate: ev.registered ? Math.round((ev.attended / ev.registered) * 100) : 0 };
    });

    const totalRegistered = byEvent.reduce((s, e) => s + e.registered, 0);
    const totalAttended = byEvent.reduce((s, e) => s + e.attended, 0);

    // recent check-ins feed
    const [recent] = await pool.query(`
      SELECT b.id AS booking_id, b.checked_in_at, b.checked_in_by,
             COALESCE(e.title, 'Unknown Event') AS event_name,
             COALESCE(ch.full_name, 'Unknown') AS child_name,
             COALESCE((SELECT GROUP_CONCAT(g.game_name SEPARATOR ', ')
                       FROM booking_games bg LEFT JOIN baby_games g ON g.id = bg.game_id
                       WHERE bg.booking_id = b.id), '-') AS games
      FROM bookings b
      LEFT JOIN events e ON e.id = b.event_id
      LEFT JOIN children ch ON ch.id = (SELECT bg.child_id FROM booking_games bg WHERE bg.booking_id = b.id LIMIT 1)
      WHERE b.checked_in_at IS NOT NULL
      ${evFilter}
      ORDER BY b.checked_in_at DESC
      LIMIT 50
    `);

    res.json({
      summary: {
        registered: totalRegistered,
        attended: totalAttended,
        no_show: Math.max(0, totalRegistered - totalAttended),
        attendance_rate: totalRegistered ? Math.round((totalAttended / totalRegistered) * 100) : 0,
      },
      by_event: byEvent,
      recent_checkins: recent,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('attendance report:', err.message);
    res.status(500).json({ error: err.message });
  }
};
