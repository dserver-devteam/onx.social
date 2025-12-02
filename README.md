# RealTalk

A modern, full-stack social media platform for authentic conversations with a stunning dark theme and vibrant blue accents.

## 🚀 Features

- **Modern Dark UI**: Premium dark theme with glassmorphism effects
- **Blue Accents**: Vibrant #1DA1F2 blue color scheme
- **Real-time Interactions**: Like, repost, and reply to posts
- **PostgreSQL Database**: Persistent data storage
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Smooth Animations**: Micro-interactions and transitions
- **RESTful API**: Clean backend architecture

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express** - Web server framework
- **PostgreSQL** - Database
- **pg** - PostgreSQL client
- **dotenv** - Environment configuration

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Custom design system with CSS variables
- **Vanilla JavaScript** - No framework dependencies
- **Google Fonts (Inter)** - Modern typography

## 📦 Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd /home/david/dserver-pay/deploy-dserver
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - The `.env` file is already configured with database credentials
   - Modify if needed for different environments

4. **Initialize database**
   ```bash
   PGPASSWORD=NyJBGfY9C5A1f1MepsVGeRjNvpNLJxwB psql -h dpg-d4dk9m24d50c73dqu3og-a.frankfurt-postgres.render.com -U testdb_ph3c_user testdb_ph3c < db/schema.sql
   PGPASSWORD=NyJBGfY9C5A1f1MepsVGeRjNvpNLJxwB psql -h dpg-d4dk9m24d50c73dqu3og-a.frankfurt-postgres.render.com -U testdb_ph3c_user testdb_ph3c < db/seed.sql
   ```

5. **Start the server**
   ```bash
   npm start
   ```

6. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🎨 Design System

### Color Palette
- **Primary Blue**: `#1DA1F2` - Main accent color
- **Dark Backgrounds**: `#15202B`, `#192734`, `#22303C`
- **Text Colors**: White primary, gray secondary
- **Action Colors**: 
  - Like: `#F91880` (Pink)
  - Repost: `#17BF63` (Green)
  - Reply: `#1DA1F2` (Blue)

### Typography
- **Font Family**: Inter (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700

### Effects
- **Glassmorphism**: Backdrop blur with semi-transparent backgrounds
- **Smooth Transitions**: 0.15s - 0.5s ease animations
- **Micro-animations**: Heart beat, rotation, fade-in effects

## 📁 Project Structure

```
deploy-dserver/
├── db/
│   ├── schema.sql          # Database schema
│   └── seed.sql            # Sample data
├── routes/
│   └── api.js              # API endpoints
├── index.html              # Main HTML file
├── index.css               # Design system & styles
├── app.js                  # Frontend JavaScript
├── server.js               # Express server
├── package.json            # Dependencies
├── .env                    # Environment variables
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## 🔌 API Endpoints

### Posts
- `GET /api/posts` - Fetch all posts with user info and counts
- `POST /api/posts` - Create a new post
- `POST /api/posts/:id/like` - Toggle like on a post
- `POST /api/posts/:id/repost` - Toggle repost
- `POST /api/posts/:id/reply` - Add a reply

### Users
- `GET /api/users/:id` - Get user profile

### Trending
- `GET /api/trending` - Get trending topics

## 🗄️ Database Schema

### Tables
- **users** - User profiles (username, display_name, avatar_url, bio)
- **posts** - User posts (content, timestamps)
- **likes** - Post likes (user_id, post_id)
- **reposts** - Post reposts (user_id, post_id)
- **replies** - Post replies (content, timestamps)

## 🎯 Key Features

### Navigation Sidebar
- RealTalk branding with gradient logo
- Home, Explore, Notifications, Messages, Bookmarks, Profile
- Compose post button
- User profile card

### Main Feed
- Quick compose box with character counter (280 max)
- Post cards with user avatars and info
- Like, repost, reply, share actions
- Real-time interaction updates

### Right Sidebar
- Search functionality
- Trending topics with post counts
- Who to follow suggestions

### Compose Modal
- Full-screen compose experience
- Character counter
- Smooth animations

## 🎨 Responsive Breakpoints

- **Desktop**: 1024px+ (3-column layout)
- **Tablet**: 768px - 1024px (2-column layout)
- **Mobile**: < 768px (Single column)

## 🔒 Security

- Environment-based configuration
- SQL injection prevention with parameterized queries
- XSS prevention with HTML escaping
- CORS enabled for API access

## 📝 License

MIT

## 👨‍💻 Development

Built with ❤️ using modern web technologies and best practices.
