require('dotenv').config();
const nodemailer = require('nodemailer');

// Create email transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'mail.spacemail.com',
    port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 465,
    secure: (process.env.SMTP_SECURE === 'true' || process.env.EMAIL_SECURE === 'true') || true, // SSL
    auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@dserver-team.com',
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '' // Password should be set in .env
    }
});

// Verify connection configuration
// Verify connection configuration
const hasCredentials = (process.env.SMTP_PASS || process.env.EMAIL_PASSWORD);

if (hasCredentials) {
    transporter.verify(function (error, success) {
        if (error) {
            console.log('⚠️  Email server connection error:', error.message);
            console.log('   Email functionality will be disabled');
        } else {
            console.log('✅ Email server ready to send messages');
        }
    });
} else {
    console.log('⚠️  No email credentials found. Email service running in MOCK mode.');
    console.log('   Emails will be logged to the console instead of being sent.');
}

// Email templates
const emailTemplates = {
    welcome: (username) => ({
        subject: 'Welcome to N.Social! 🎉',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        background: #15202B;
                        color: #FFFFFF;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px 20px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 40px;
                    }
                    .logo {
                        font-size: 32px;
                        font-weight: 700;
                        background: linear-gradient(135deg, #1DA1F2 0%, #0D8BD9 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        margin-bottom: 10px;
                    }
                    .content {
                        background: rgba(25, 39, 52, 0.8);
                        border: 1px solid rgba(139, 152, 165, 0.1);
                        border-radius: 16px;
                        padding: 30px;
                    }
                    h1 {
                        color: #1DA1F2;
                        margin-top: 0;
                    }
                    p {
                        line-height: 1.6;
                        color: #8B98A5;
                    }
                    .button {
                        display: inline-block;
                        background: linear-gradient(135deg, #1DA1F2 0%, #0D8BD9 100%);
                        color: white;
                        padding: 12px 32px;
                        border-radius: 50px;
                        text-decoration: none;
                        margin-top: 20px;
                        font-weight: 600;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 40px;
                        color: #6E7C8C;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">n.social</div>
                    </div>
                    <div class="content">
                        <h1>Welcome to N.Social, ${username}! 🎉</h1>
                        <p>We're excited to have you join our community!</p>
                        <p>N.Social is a modern social platform where you can:</p>
                        <ul>
                            <li>Share your thoughts and ideas</li>
                            <li>Connect with like-minded people</li>
                            <li>Discover trending topics</li>
                            <li>Engage with posts through likes and reposts</li>
                        </ul>
                        <p>Start exploring and make your first post today!</p>
                        <a href="http://localhost:3000" class="button">Go to N.Social</a>
                    </div>
                    <div class="footer">
                        <p>This email was sent from N.Social</p>
                        <p>© 2025 N.Social. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `Welcome to N.Social, ${username}! We're excited to have you join our community. Start exploring and make your first post today!`
    }),

    newFollower: (followerName, username) => ({
        subject: `${followerName} started following you on N.Social`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        background: #15202B;
                        color: #FFFFFF;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px 20px;
                    }
                    .content {
                        background: rgba(25, 39, 52, 0.8);
                        border: 1px solid rgba(139, 152, 165, 0.1);
                        border-radius: 16px;
                        padding: 30px;
                    }
                    h1 {
                        color: #1DA1F2;
                        margin-top: 0;
                    }
                    p {
                        line-height: 1.6;
                        color: #8B98A5;
                    }
                    .button {
                        display: inline-block;
                        background: linear-gradient(135deg, #1DA1F2 0%, #0D8BD9 100%);
                        color: white;
                        padding: 12px 32px;
                        border-radius: 50px;
                        text-decoration: none;
                        margin-top: 20px;
                        font-weight: 600;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="content">
                        <h1>New Follower! 🎉</h1>
                        <p>Hi ${username},</p>
                        <p><strong>${followerName}</strong> started following you on N.Social!</p>
                        <p>Check out their profile and connect with them.</p>
                        <a href="http://localhost:3000" class="button">View Profile</a>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `${followerName} started following you on N.Social!`
    }),

    postLiked: (likerName, username, postContent) => ({
        subject: `${likerName} liked your post`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        background: #15202B;
                        color: #FFFFFF;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px 20px;
                    }
                    .content {
                        background: rgba(25, 39, 52, 0.8);
                        border: 1px solid rgba(139, 152, 165, 0.1);
                        border-radius: 16px;
                        padding: 30px;
                    }
                    h1 {
                        color: #F91880;
                        margin-top: 0;
                    }
                    p {
                        line-height: 1.6;
                        color: #8B98A5;
                    }
                    .post-preview {
                        background: rgba(34, 48, 60, 0.5);
                        border-left: 3px solid #1DA1F2;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 8px;
                        color: #FFFFFF;
                    }
                    .button {
                        display: inline-block;
                        background: linear-gradient(135deg, #1DA1F2 0%, #0D8BD9 100%);
                        color: white;
                        padding: 12px 32px;
                        border-radius: 50px;
                        text-decoration: none;
                        margin-top: 20px;
                        font-weight: 600;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="content">
                        <h1>❤️ Your post was liked!</h1>
                        <p>Hi ${username},</p>
                        <p><strong>${likerName}</strong> liked your post:</p>
                        <div class="post-preview">${postContent}</div>
                        <a href="http://localhost:3000" class="button">View Post</a>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `${likerName} liked your post: "${postContent}"`
    }),

    account_deleted: (username) => ({
        subject: 'Your N.Social Account Has Been Deleted',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        background: #15202B;
                        color: #FFFFFF;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px 20px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 40px;
                    }
                    .logo {
                        font-size: 32px;
                        font-weight: 700;
                        background: linear-gradient(135deg, #1DA1F2 0%, #0D8BD9 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        margin-bottom: 10px;
                    }
                    .content {
                        background: rgba(25, 39, 52, 0.8);
                        border: 1px solid rgba(139, 152, 165, 0.1);
                        border-radius: 16px;
                        padding: 30px;
                    }
                    h1 {
                        color: #F91880;
                        margin-top: 0;
                    }
                    p {
                        line-height: 1.6;
                        color: #8B98A5;
                    }
                    .warning {
                        background: rgba(249, 24, 128, 0.1);
                        border-left: 3px solid #F91880;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 8px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 40px;
                        color: #6E7C8C;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">n.social</div>
                    </div>
                    <div class="content">
                        <h1>Account Deleted</h1>
                        <p>Hi ${username},</p>
                        <p>Your N.Social account has been permanently deleted by an administrator.</p>
                        <div class="warning">
                            <strong>⚠️ This action is permanent</strong><br>
                            All your data including posts, likes, reposts, and replies have been removed from our system.
                        </div>
                        <p>If you believe this was done in error, please contact our support team.</p>
                        <p>Thank you for being part of N.Social.</p>
                    </div>
                    <div class="footer">
                        <p>This email was sent from N.Social</p>
                        <p>© 2025 N.Social. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `Hi ${username}, Your N.Social account has been permanently deleted. All your data has been removed from our system. If you believe this was done in error, please contact support.`
    }),

    email_verification: (username, token) => ({
        subject: 'Verify your N.Social email address',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        background: #15202B;
                        color: #FFFFFF;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px 20px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 40px;
                    }
                    .logo {
                        font-size: 32px;
                        font-weight: 700;
                        background: linear-gradient(135deg, #1DA1F2 0%, #0D8BD9 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        margin-bottom: 10px;
                    }
                    .content {
                        background: rgba(25, 39, 52, 0.8);
                        border: 1px solid rgba(139, 152, 165, 0.1);
                        border-radius: 16px;
                        padding: 30px;
                    }
                    h1 {
                        color: #1DA1F2;
                        margin-top: 0;
                    }
                    p {
                        line-height: 1.6;
                        color: #8B98A5;
                    }
                    .button {
                        display: inline-block;
                        background: linear-gradient(135deg, #1DA1F2 0%, #0D8BD9 100%);
                        color: white;
                        padding: 12px 32px;
                        border-radius: 50px;
                        text-decoration: none;
                        margin-top: 20px;
                        font-weight: 600;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 40px;
                        color: #6E7C8C;
                        font-size: 14px;
                    }
                    .token-box {
                        background: rgba(34, 48, 60, 0.5);
                        border: 1px solid rgba(139, 152, 165, 0.2);
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 8px;
                        font-family: monospace;
                        color: #1DA1F2;
                        word-break: break-all;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">n.social</div>
                    </div>
                    <div class="content">
                        <h1>Verify Your Email</h1>
                        <p>Hi ${username},</p>
                        <p>Thanks for signing up for N.Social! Please verify your email address to complete your registration.</p>
                        <a href="http://localhost:3000/verify-email.html?token=${token}" class="button">Verify Email</a>
                        <p style="margin-top: 30px; font-size: 14px;">Or copy and paste this link into your browser:</p>
                        <div class="token-box">http://localhost:3000/verify-email.html?token=${token}</div>
                        <p style="font-size: 14px; color: #6E7C8C;">This link will expire in 24 hours.</p>
                    </div>
                    <div class="footer">
                        <p>If you didn't create an account, you can safely ignore this email.</p>
                        <p>© 2025 N.Social. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `Hi ${username}, Thanks for signing up for N.Social! Please verify your email address by visiting: http://localhost:3000/verify-email.html?token=${token}`
    }),

    password_reset: (username, token) => ({
        subject: 'Reset your N.Social password',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        background: #15202B;
                        color: #FFFFFF;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px 20px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 40px;
                    }
                    .logo {
                        font-size: 32px;
                        font-weight: 700;
                        background: linear-gradient(135deg, #1DA1F2 0%, #0D8BD9 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        margin-bottom: 10px;
                    }
                    .content {
                        background: rgba(25, 39, 52, 0.8);
                        border: 1px solid rgba(139, 152, 165, 0.1);
                        border-radius: 16px;
                        padding: 30px;
                    }
                    h1 {
                        color: #F91880;
                        margin-top: 0;
                    }
                    p {
                        line-height: 1.6;
                        color: #8B98A5;
                    }
                    .button {
                        display: inline-block;
                        background: linear-gradient(135deg, #1DA1F2 0%, #0D8BD9 100%);
                        color: white;
                        padding: 12px 32px;
                        border-radius: 50px;
                        text-decoration: none;
                        margin-top: 20px;
                        font-weight: 600;
                    }
                    .warning {
                        background: rgba(249, 24, 128, 0.1);
                        border-left: 3px solid #F91880;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 8px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 40px;
                        color: #6E7C8C;
                        font-size: 14px;
                    }
                    .token-box {
                        background: rgba(34, 48, 60, 0.5);
                        border: 1px solid rgba(139, 152, 165, 0.2);
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 8px;
                        font-family: monospace;
                        color: #1DA1F2;
                        word-break: break-all;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">n.social</div>
                    </div>
                    <div class="content">
                        <h1>Reset Your Password</h1>
                        <p>Hi ${username},</p>
                        <p>We received a request to reset your password. Click the button below to create a new password:</p>
                        <a href="http://localhost:3000/reset-password.html?token=${token}" class="button">Reset Password</a>
                        <p style="margin-top: 30px; font-size: 14px;">Or copy and paste this link into your browser:</p>
                        <div class="token-box">http://localhost:3000/reset-password.html?token=${token}</div>
                        <div class="warning">
                            <strong>⚠️ Security Notice</strong><br>
                            This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
                        </div>
                    </div>
                    <div class="footer">
                        <p>If you didn't request this, you can safely ignore this email.</p>
                        <p>© 2025 N.Social. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `Hi ${username}, We received a request to reset your password. Visit this link to reset it: http://localhost:3000/reset-password.html?token=${token} (expires in 1 hour)`
    })
};

// Send email function
// Send email function
async function sendEmail(to, template, ...args) {
    try {
        const emailContent = emailTemplates[template](...args);

        // Check if email credentials are configured
        const hasCredentials = (process.env.SMTP_PASS || process.env.EMAIL_PASSWORD);

        if (!hasCredentials) {
            console.log('⚠️  Email credentials missing. Mocking email send:');
            console.log(`   To: ${to}`);
            console.log(`   Subject: ${emailContent.subject}`);
            console.log(`   Link (if any):`, emailContent.text.match(/http[s]?:\/\/[^\s]+/)?.[0] || 'No link found');
            return { success: true, messageId: 'mock-email-id' };
        }

        const mailOptions = {
            from: `"N.Social" <${process.env.EMAIL_FROM || 'noreply@dserver-team.com'}>`,
            to: to,
            subject: emailContent.subject,
            text: emailContent.text,
            html: emailContent.html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email send error:', error.message);
        return { success: false, error: error.message };
    }
}

// Export functions
module.exports = {
    sendEmail,
    emailTemplates,
    transporter
};
