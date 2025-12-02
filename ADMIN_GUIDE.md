# Admin Panel Guide

## Overview

The admin panel allows administrators to manage users, moderate content, and configure system settings. Admin access is granted on a per-user basis through the command line.

## Adding Admin Users

While the server is running, you can grant admin privileges to any existing user:

```bash
npm run admin user add <username>
```

**Example:**
```bash
npm run admin user add alice_dev
```

This will:
- Update the user's role to `admin` in the database
- Grant them access to the admin panel
- Show an "Admin" link in their sidebar (with shield icon)

## Accessing the Admin Panel

### For Admin Users

1. **Login to the main application** at `http://localhost:5173`
2. **Look for the "Admin" link** in the sidebar (only visible to admin users)
3. **Click the Admin link** - this opens the admin panel in a new tab at `http://localhost:3033`
4. **Login with your credentials** - use the same username and password as your main account

### Direct Access

You can also access the admin panel directly at:
```
http://localhost:3033
```

## Admin Panel Features

### Dashboard Overview
- Total users count
- Total posts count
- Total likes count
- Pending reports count
- Support users vs regular users breakdown

### User Management
- View all registered users
- See user statistics (posts, likes)
- Promote users to support role
- Demote support users back to regular users
- View user join dates

### Post Moderation
- View all posts with report counts
- Delete inappropriate posts
- See post authors and content
- Filter by most reported content

### Reports
- View all content reports
- See report reasons and status
- Track assigned moderators
- Monitor report resolution

### Activity Log
- Track all admin actions
- See who performed each action
- Monitor system changes
- Audit trail for accountability

### System Settings
- Enable/disable user registration
- Toggle email verification requirements
- Enable maintenance mode

## Security

### Authentication
- Admin panel uses separate authentication from the main app
- Sessions expire after 1 hour of inactivity
- Requires admin role in the database

### Role Hierarchy
- **user**: Regular platform user
- **support**: Can access support panel (not admin panel)
- **admin**: Full access to admin panel and all features

## Technical Details

### Database Schema
The `users` table includes a `role` column that accepts:
- `user` (default)
- `support`
- `admin`

### Ports
- Main application: `http://localhost:3000` (backend)
- Frontend: `http://localhost:5173`
- Admin panel: `http://localhost:3033`
- Support panel: `http://localhost:3001`

### CLI Tool Location
```
/scripts/admin-cli.js
```

## Troubleshooting

### "Admin" link not showing in sidebar
- Ensure you've granted admin role via CLI
- Log out and log back in to refresh user data
- Check that `user.role === 'admin'` in localStorage

### Cannot login to admin panel
- Verify the user has admin role in database
- Use the same credentials as main application
- Check that admin-server.js is running (port 3033)

### Admin panel not accessible
- Ensure `npm run dev` is running (starts all servers)
- Check that port 3033 is not in use
- Verify admin-server.js is included in the startup

## Future Enhancements

Potential additions to the admin system:
- Bulk user operations
- Advanced content filtering
- Analytics and reporting
- Email notification management
- Backup and restore functionality
- IP blocking and rate limiting
