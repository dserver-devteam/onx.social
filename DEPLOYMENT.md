# RealTalk - Deployment Guide

## Quick Start (Already Running)

Your RealTalk application is currently running at:
- **URL:** http://localhost:3000
- **Database:** Connected to PostgreSQL (testdb_ph3c)
- **Status:** ✅ Active

## Server Management

### Start Server
```bash
cd /home/david/dserver-pay/deploy-dserver
npm start
```

### Stop Server
Press `Ctrl+C` in the terminal where the server is running

### Restart Server
```bash
# Stop the current server (Ctrl+C), then:
npm start
```

## Environment Configuration

The `.env` file contains all configuration:
```env
PORT=3000
DB_HOST=dpg-d4dk9m24d50c73dqu3og-a.frankfurt-postgres.render.com
DB_PORT=5432
DB_NAME=testdb_ph3c
DB_USER=testdb_ph3c_user
DB_PASSWORD=NyJBGfY9C5A1f1MepsVGeRjNvpNLJxwB
```

## Database Management

### Reset Database
```bash
# Drop and recreate all tables
PGPASSWORD=NyJBGfY9C5A1f1MepsVGeRjNvpNLJxwB psql -h dpg-d4dk9m24d50c73dqu3og-a.frankfurt-postgres.render.com -U testdb_ph3c_user testdb_ph3c < db/schema.sql
```

### Reseed Data
```bash
# Add sample data
PGPASSWORD=NyJBGfY9C5A1f1MepsVGeRjNvpNLJxwB psql -h dpg-d4dk9m24d50c73dqu3og-a.frankfurt-postgres.render.com -U testdb_ph3c_user testdb_ph3c < db/seed.sql
```

### Connect to Database
```bash
PGPASSWORD=NyJBGfY9C5A1f1MepsVGeRjNvpNLJxwB psql -h dpg-d4dk9m24d50c73dqu3og-a.frankfurt-postgres.render.com -U testdb_ph3c_user testdb_ph3c
```

## Production Deployment

### Option 1: Deploy to Render.com

1. **Create Web Service:**
   - Connect your Git repository
   - Build Command: `npm install`
   - Start Command: `npm start`

2. **Environment Variables:**
   Add all variables from `.env` to Render dashboard

3. **Database:**
   Already using Render PostgreSQL (configured)

### Option 2: Deploy to Heroku

```bash
# Install Heroku CLI, then:
heroku create nsocial-app
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set PORT=3000

# Deploy
git push heroku main
```

### Option 3: Deploy to VPS (DigitalOcean, AWS, etc.)

1. **Install Node.js and PostgreSQL**
2. **Clone repository**
3. **Install dependencies:** `npm install`
4. **Configure environment variables**
5. **Use PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start server.js --name nsocial
   pm2 save
   pm2 startup
   ```

## Nginx Configuration (Optional)

For production with Nginx reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring

### Check Server Status
```bash
# If using PM2
pm2 status
pm2 logs nsocial

# If running directly
# Check terminal output for errors
```

### Database Health
```bash
# Connect and run:
PGPASSWORD=NyJBGfY9C5A1f1MepsVGeRjNvpNLJxwB psql -h dpg-d4dk9m24d50c73dqu3og-a.frankfurt-postgres.render.com -U testdb_ph3c_user testdb_ph3c -c "SELECT COUNT(*) FROM posts;"
```

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use: `lsof -i :3000`
- Verify `.env` file exists and has correct values
- Check database connection: `npm start` should show "✅ Database connected"

### Database connection fails
- Verify database credentials in `.env`
- Check network connectivity to Render
- Ensure PostgreSQL service is running

### Posts not loading
- Check browser console for errors
- Verify API endpoints: `curl http://localhost:3000/api/posts`
- Check server logs for database errors

## Backup

### Backup Database
```bash
PGPASSWORD=NyJBGfY9C5A1f1MepsVGeRjNvpNLJxwB pg_dump -h dpg-d4dk9m24d50c73dqu3og-a.frankfurt-postgres.render.com -U testdb_ph3c_user testdb_ph3c > backup.sql
```

### Restore Database
```bash
PGPASSWORD=NyJBGfY9C5A1f1MepsVGeRjNvpNLJxwB psql -h dpg-d4dk9m24d50c73dqu3og-a.frankfurt-postgres.render.com -U testdb_ph3c_user testdb_ph3c < backup.sql
```

## Performance Tips

1. **Enable gzip compression** in Express
2. **Add caching headers** for static assets
3. **Use CDN** for fonts and images
4. **Implement pagination** for posts (currently limited to 50)
5. **Add database indexes** for frequently queried fields (already done)
6. **Use connection pooling** (already configured)

## Security Checklist

- ✅ Environment variables for sensitive data
- ✅ Parameterized SQL queries (prevents SQL injection)
- ✅ HTML escaping (prevents XSS)
- ✅ CORS enabled
- ✅ SSL for database connection
- ⚠️ Add rate limiting for production
- ⚠️ Add authentication/authorization
- ⚠️ Add HTTPS (use Let's Encrypt)

## Current Status

✅ **Application is running successfully!**
- Server: http://localhost:3000
- Database: Connected and seeded
- All features: Working
- Ready for: Development and testing

Access the application in your browser at **http://localhost:3000**
