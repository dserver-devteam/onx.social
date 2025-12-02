# Email Integration Guide

## Overview

RealTalk now includes email functionality using Nodemailer with SMTP configuration for sending notifications and welcome emails.

## Configuration

### SMTP Settings
- **Server**: mail.spacemail.com
- **Port**: 465
- **Encryption**: SSL
- **From Address**: noreply@dserver-team.com

### Environment Variables

Add these to your `.env` file (password not included for security):

```env
SMTP_HOST=mail.spacemail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@dserver-team.com
SMTP_PASS=your_password_here
EMAIL_FROM=noreply@dserver-team.com
```

## Email Templates

### 1. Welcome Email
Sent when a new user joins RealTalk.

**Features:**
- RealTalk branding with gradient logo
- Dark theme matching the app
- Call-to-action button
- Responsive HTML design

### 2. New Follower Notification
Sent when someone follows a user.

**Features:**
- Follower name and profile link
- Blue accent colors
- View profile button

### 3. Post Liked Notification
Sent when someone likes a user's post.

**Features:**
- Liker's name
- Post preview with content
- Pink heart accent (matching like color)
- View post button

## API Endpoint

### Send Email
```
POST /api/email/send
```

**Request Body:**
```json
{
  "to": "user@example.com",
  "template": "welcome",
  "username": "John Doe"
}
```

**Templates Available:**
- `welcome` - Requires: `username`
- `newFollower` - Requires: `followerName`, `username`
- `postLiked` - Requires: `likerName`, `username`, `postContent`

**Response:**
```json
{
  "message": "Email sent successfully",
  "messageId": "<message-id>"
}
```

## Usage Examples

### Send Welcome Email
```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "newuser@example.com",
    "template": "welcome",
    "username": "Alice"
  }'
```

### Send Follower Notification
```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "template": "newFollower",
    "followerName": "Bob Smith",
    "username": "Alice"
  }'
```

### Send Like Notification
```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "template": "postLiked",
    "likerName": "Charlie",
    "username": "Alice",
    "postContent": "Just launched my new project!"
  }'
```

## Integration in Code

### Import Email Service
```javascript
const { sendEmail } = require('./services/email');
```

### Send Email Programmatically
```javascript
// Send welcome email
await sendEmail('user@example.com', 'welcome', 'John Doe');

// Send follower notification
await sendEmail('user@example.com', 'newFollower', 'Bob Smith', 'Alice');

// Send like notification
await sendEmail('user@example.com', 'postLiked', 'Charlie', 'Alice', 'Great post!');
```

## Email Design

All emails feature:
- **Dark theme** (#15202B background)
- **Blue accents** (#1DA1F2)
- **Glassmorphism** effects
- **Responsive** design
- **Inter font** family
- **HTML + plain text** versions

## Server Startup

When the server starts, you'll see:
```
✅ Email server ready to send messages
```

Or if there's a configuration issue:
```
⚠️  Email server connection error: [error message]
   Email functionality will be disabled
```

## Troubleshooting

### Email not sending
1. Check SMTP credentials in `.env`
2. Verify SMTP_PASS is set correctly
3. Check server logs for error messages
4. Ensure port 465 is not blocked by firewall

### Connection timeout
- Verify mail.spacemail.com is accessible
- Check network connectivity
- Ensure SSL/TLS is properly configured

## Future Enhancements

Potential additions:
- Email verification for new users
- Password reset emails
- Daily/weekly digest emails
- Reply notification emails
- Mention notification emails
- Custom email preferences per user

## Security Notes

- Never commit `.env` file with passwords
- Use environment variables for all sensitive data
- Email passwords should be stored securely
- Consider using OAuth2 for Gmail/Outlook
- Implement rate limiting for email sending

## Files Created

- [services/email.js](file:///home/david/dserver-pay/deploy-dserver/services/email.js) - Email service module
- Updated [routes/api.js](file:///home/david/dserver-pay/deploy-dserver/routes/api.js) - Added email endpoint
- Updated [package.json](file:///home/david/dserver-pay/deploy-dserver/package.json) - Added nodemailer dependency

## Testing

Test the email functionality:

```bash
# Test welcome email
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{"to":"your-email@example.com","template":"welcome","username":"Test User"}'
```

Check your inbox for the beautifully designed welcome email!
