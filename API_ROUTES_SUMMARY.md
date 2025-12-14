# API Routes Summary

## All Implemented Routes in server.js

### ✅ Implemented Routes

| Route File | Endpoint | Status | Documentation |
|-----------|----------|--------|---------------|
| helloworld.js | `/api/helloworld` | ✅ Implemented | Basic test route |
| employee.js | `/api/employee` | ✅ Implemented | [employee.md](./document/employee.md) |
| privacyPolicy.js | `/api/privacy-policy` | ✅ Implemented | [privacy_policy.md](./document/privacy_policy.md) |
| terms.js | `/api/terms` | ✅ Implemented | [terms.md](./document/terms.md) |
| refundPolicy.js | `/api/refund-policy` | ✅ Implemented | [refund_policy.md](./document/refund_policy.md) |
| faq.js | `/api/faq` | ✅ Implemented | [faq.md](./document/faq.md) |
| socialMediaSettings.js | `/api/social-media-settings` | ✅ Implemented | [social_media_settings.md](./document/social_media_settings.md) |
| generalSettings.js | `/api/general-settings` | ✅ Implemented | [general_settings.md](./document/general_settings.md) |
| footerSettings.js | `/api/footer-settings` | ✅ Implemented | [footer_settings.md](./document/footer_settings.md) |
| city.js | `/api/city` | ✅ Implemented | [city.md](./document/city.md) |
| babyGames.js | `/api/baby-games` | ✅ Implemented | [baby_games.md](./document/baby_games.md) |
| venue.js | `/api/venue` | ✅ Implemented | [venue.md](./document/venue.md) |
| partners.js | `/api/partners` | ✅ Implemented | [partners.md](./document/partners.md) |
| homepageSections.js | `/api/homepage-sections` | ✅ Implemented | [homepage_sections.md](./document/homepage_sections.md) |

## Quick API Reference

### Public Endpoints (No Authentication Required)
- `GET /api/helloworld` - Test endpoint
- `GET /api/privacy-policy` - Get privacy policy
- `GET /api/terms` - Get terms & conditions
- `GET /api/refund-policy` - Get refund policy
- `GET /api/faq` - Get FAQs
- `GET /api/social-media-settings` - Get social media links
- `GET /api/general-settings` - Get general site settings
- `GET /api/footer-settings` - Get footer settings
- `GET /api/city` - List all cities
- `GET /api/city/with-venues/list` - List cities with venues
- `GET /api/city/:id` - Get city by ID
- `GET /api/baby-games` - List all baby games
- `GET /api/baby-games/:id` - Get baby game by ID
- `GET /api/venue` - List all venues
- `GET /api/venue/:id` - Get venue by ID
- `GET /api/partners` - List all partners
- `GET /api/partners/:id` - Get partner by ID
- `GET /api/homepage-sections` - List homepage sections
- `GET /api/homepage-sections/:id` - Get homepage section by ID

### Protected Endpoints (Requires Employee Authentication)
All POST, PUT, DELETE operations require Bearer token authentication:
- Employee management
- City CRUD operations
- Venue CRUD operations
- Baby games CRUD operations
- Partners CRUD operations
- Homepage sections CRUD operations
- Settings updates (general, footer, social media)
- Policy updates (privacy, terms, refund)
- FAQ management

## Server Configuration
- **Port:** 3004 (default)
- **Base URL:** http://localhost:3004
- **Environment:** Configured via .env file

## Authentication
Protected routes require:
```
Authorization: Bearer <employee_token>
```

## Status
All routes from the routes folder are now properly registered in server.js! ✅
