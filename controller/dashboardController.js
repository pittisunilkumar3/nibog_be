const { promisePool: db } = require('../config/config');

// Get complete dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    // Get bookings stats
    const [bookingsStats] = await db.query(`
      SELECT
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'Confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_bookings,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_bookings,
        COALESCE(SUM(total_amount), 0) as total_revenue
      FROM bookings
    `);

    // Get users stats
    const [usersStats] = await db.query(`
      SELECT
        COUNT(*) as total_users,
        SUM(CASE WHEN email_verified = 1 THEN 1 ELSE 0 END) as active_users
      FROM users
    `);

    // Get events stats
    const [eventsStats] = await db.query(`
      SELECT
        COUNT(*) as total_events,
        SUM(CASE WHEN event_date >= CURDATE() THEN 1 ELSE 0 END) as upcoming_events,
        SUM(CASE WHEN event_date < CURDATE() THEN 1 ELSE 0 END) as completed_events
      FROM events
    `);

    // Get cities count
    const [citiesStats] = await db.query(`SELECT COUNT(*) as total_cities FROM cities`);

    // Get venues count
    const [venuesStats] = await db.query(`SELECT COUNT(*) as total_venues FROM venues`);

    // Get games count
    const [gamesStats] = await db.query(`SELECT COUNT(*) as total_games FROM baby_games`);

    // Get recent bookings (last 10)
    const [recentBookings] = await db.query(`
      SELECT
        b.id as booking_id,
        b.booking_ref,
        b.status,
        b.total_amount,
        b.created_at as booking_date,
        p.parent_name,
        p.email,
        p.phone,
        e.title as event_title,
        e.event_date,
        c.city_name,
        v.venue_name
      FROM bookings b
      LEFT JOIN parents p ON b.parent_id = p.id
      LEFT JOIN events e ON b.event_id = e.id
      LEFT JOIN cities c ON e.city_id = c.id
      LEFT JOIN venues v ON e.venue_id = v.id
      ORDER BY b.created_at DESC
      LIMIT 10
    `);

    // Get upcoming events (next 10)
    const [upcomingEvents] = await db.query(`
      SELECT
        e.id as event_id,
        e.title as event_title,
        e.event_date,
        e.description as event_description,
        c.city_name,
        v.venue_name,
        v.address as venue_address,
        (SELECT COUNT(*) FROM bookings b WHERE b.event_id = e.id) as booking_count
      FROM events e
      LEFT JOIN cities c ON e.city_id = c.id
      LEFT JOIN venues v ON e.venue_id = v.id
      WHERE e.event_date >= CURDATE()
      ORDER BY e.event_date ASC
      LIMIT 10
    `);

    // Get monthly revenue data (last 12 months)
    const [monthlyRevenue] = await db.query(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as bookings,
        COALESCE(SUM(CASE WHEN status IN ('Confirmed', 'Completed') THEN total_amount ELSE 0 END), 0) as revenue
      FROM bookings
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_format(created_at, '%Y-%m')
      ORDER BY month ASC
    `);

    // Calculate average ticket price
    const bookingData = bookingsStats[0];
    const avgTicketPrice = bookingData.total_bookings > 0
      ? parseFloat(bookingData.total_revenue) / bookingData.total_bookings
      : 0;

    // Calculate monthly growth (comparing last 30 days vs previous 30 days)
    const [growthStats] = await db.query(`
      SELECT
        SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as recent_bookings,
        SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND status IN ('Confirmed', 'Completed') THEN total_amount ELSE 0 END) as recent_revenue,
        SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) AND created_at < DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as previous_bookings,
        SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) AND created_at < DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND status IN ('Confirmed', 'Completed') THEN total_amount ELSE 0 END) as previous_revenue
      FROM bookings
    `);

    const growth = growthStats[0];
    const bookingGrowth = growth.previous_bookings > 0
      ? ((growth.recent_bookings - growth.previous_bookings) / growth.previous_bookings) * 100
      : 0;
    const revenueGrowth = growth.previous_revenue > 0
      ? ((growth.recent_revenue - growth.previous_revenue) / growth.previous_revenue) * 100
      : 0;

    // User growth
    const [userGrowthStats] = await db.query(`
      SELECT
        SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as recent_users,
        SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) AND created_at < DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as previous_users
      FROM users
    `);

    const userGrowth = userGrowthStats[0];
    const userGrowthPercent = userGrowth.previous_users > 0
      ? ((userGrowth.recent_users - userGrowth.previous_users) / userGrowth.previous_users) * 100
      : 0;

    const dashboardData = {
      // Overview stats
      totalRevenue: parseFloat(bookingData.total_revenue) || 0,
      totalBookings: bookingData.total_bookings || 0,
      confirmedBookings: bookingData.confirmed_bookings || 0,
      pendingBookings: bookingData.pending_bookings || 0,
      cancelledBookings: bookingData.cancelled_bookings || 0,
      completedBookings: bookingData.completed_bookings || 0,

      // Users
      totalUsers: usersStats[0].total_users || 0,
      activeUsers: usersStats[0].active_users || 0,

      // Events
      totalEvents: eventsStats[0].total_events || 0,
      upcomingEventsCount: eventsStats[0].upcoming_events || 0,
      completedEvents: eventsStats[0].completed_events || 0,

      // Other counts
      totalCities: citiesStats[0].total_cities || 0,
      totalVenues: venuesStats[0].total_venues || 0,
      totalGames: gamesStats[0].total_games || 0,

      // Calculated metrics
      averageTicketPrice: Math.round(avgTicketPrice * 100) / 100,

      // Growth percentages
      monthlyGrowth: {
        revenue: Math.round(revenueGrowth * 100) / 100,
        bookings: Math.round(bookingGrowth * 100) / 100,
        users: Math.round(userGrowthPercent * 100) / 100
      },

      // Lists
      recentBookings: recentBookings,
      upcomingEvents: upcomingEvents,
      monthlyRevenue: monthlyRevenue
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch dashboard statistics'
    });
  }
};

// Get summary stats only (lightweight endpoint)
const getSummaryStats = async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM bookings) as total_bookings,
        (SELECT COALESCE(SUM(total_amount), 0) FROM bookings) as total_revenue,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM events) as total_events,
        (SELECT COUNT(*) FROM cities) as total_cities,
        (SELECT COUNT(*) FROM venues) as total_venues,
        (SELECT COUNT(*) FROM baby_games) as total_games
    `);

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('Error fetching summary stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getSummaryStats
};
