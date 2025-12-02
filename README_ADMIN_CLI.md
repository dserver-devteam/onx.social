# Admin CLI Commands

Quick reference for managing admin users via command line.

## Commands

### Add Admin User

Grant admin privileges to an existing user:

```bash
npm run admin user add <username>
```

**Examples:**
```bash
# Make alice_dev an admin
npm run admin user add alice_dev

# Make bob_design an admin
npm run admin user add bob_design
```

**Output:**
```
User alice_dev is now an admin.
```

## Requirements

- User must already exist in the database
- Server does not need to be running
- Changes take effect immediately

## What Happens

When you run the command:
1. The user's `role` field is updated to `admin`
2. The user can now access the admin panel
3. An "Admin" link appears in their sidebar
4. They can login to `http://localhost:3033` with their credentials

## Removing Admin Access

To remove admin privileges, you can:

1. **Via Admin Panel UI:**
   - Login to admin panel
   - Go to Users section
   - Change the user's role back to "user"

2. **Via Database:**
   ```sql
   UPDATE users SET role = 'user' WHERE username = 'alice_dev';
   ```

## Checking Current Admins

To see all admin users:

```bash
psql -h <DB_HOST> -U <DB_USER> -d <DB_NAME> -c "SELECT username, role FROM users WHERE role = 'admin';"
```

Or create a simple script:
```javascript
// list-admins.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
});

pool.query("SELECT username, display_name, role FROM users WHERE role = 'admin'")
    .then(res => {
        console.log('Current Admins:');
        res.rows.forEach(user => {
            console.log(`- ${user.username} (${user.display_name})`);
        });
        pool.end();
    });
```

Run with: `node list-admins.js`
