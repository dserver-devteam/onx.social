# N.Social Admin & Support Panels

## Quick Start

### Start All Servers
```bash
npm run dev
```

This starts:
- **Main App**: http://localhost:3000
- **Support Panel**: http://localhost:3022
- **Admin Panel**: http://localhost:3033

### Admin Panel Login

Access: http://localhost:3033

**Confirmation Codes:**
1. `Avt6JalpQc8XmLHsMpedvSMEIokJOn`
2. `vMNOuiytJXTNv5OPObkaQkZrI8tkmN`
3. `MLPlTYa3h867zaYpiEtJeXDMS8Rcmm`

### Support Panel Login

Access: http://localhost:3022

**Support Users** (from seed data):
- `bob_design` - Bob Smith
- `diana_code` - Diana Prince

> **Note**: Password authentication needs to be implemented. Currently only checks for support role.

## Features

### Admin Panel
- 📊 System statistics dashboard
- 👥 User management (view, change roles)
- 📝 Post moderation (view, delete)
- ⚠️ Reports overview
- 📜 Activity audit log

### Support Panel
- 📊 Support statistics
- ⚠️ View reports (pending, reviewing, all)
- ✅ Assign reports to self
- 🔄 Update report status
- 📝 Add notes to reports
- 👤 User lookup

## Environment Variables

Add to your `.env` file:

```env
ADMIN_CONFIRMCODE_1=Avt6JalpQc8XmLHsMpedvSMEIokJOn
ADMIN_CONFIRMCODE_2=vMNOuiytJXTNv5OPObkaQkZrI8tkmN
ADMIN_CONFIRMCODE_3=MLPlTYa3h867zaYpiEtJeXDMS8Rcmm
```

## Database Setup

```bash
# Run schema and seed
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f db/schema.sql
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f db/seed.sql
```

## Architecture

- **Three Servers**: Main app, Admin panel, Support panel
- **Concurrent Startup**: Using `concurrently` package
- **Authentication**: Three-code for admin, role-based for support
- **Sessions**: In-memory with 1-hour expiry
- **UI**: Premium dark theme with glassmorphism

## Security Notes

- Admin codes are stored in environment variables
- Sessions expire after 1 hour of inactivity
- Support panel requires "support" role in database
- All admin actions are logged in `admin_actions` table

## Development

Run individual servers:
```bash
npm run dev:main     # Main app only
npm run dev:admin    # Admin panel only
npm run dev:support  # Support panel only
```

## TODO

- [ ] Implement password hashing for support users
- [ ] Add report button to main app UI
- [ ] Move sessions to Redis for production
- [ ] Add email notifications for new reports
- [ ] Implement two-factor authentication for admin
