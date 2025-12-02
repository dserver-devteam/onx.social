import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Notifications from './pages/Notifications';
import Bookmarks from './pages/Bookmarks';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Updates from './pages/Updates';
import ChannelDetail from './pages/ChannelDetail';
import ChannelManage from './pages/ChannelManage';
import Social from './pages/Social';
import PostDetail from './pages/PostDetail';
import HashtagFeed from './pages/HashtagFeed';
import FollowersFollowing from './pages/FollowersFollowing';
import Messages from './pages/Messages';
import ErrorBoundary from './components/ui/ErrorBoundary';

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="explore" element={<Explore />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="updates" element={<Updates />} />
            <Route path="updates/manage" element={<ChannelManage />} />
            <Route path="updates/:id" element={<ChannelDetail />} />
            <Route path="social" element={<Social />} />
            <Route path="messages" element={<Messages />} />
            <Route path="messages/:userId" element={<Messages />} />
            <Route path="bookmarks" element={<Bookmarks />} />
            <Route path="profile/:username" element={<Profile />} />
            <Route path="profile/:username/following" element={<FollowersFollowing />} />
            <Route path="post/:id" element={<PostDetail />} />
            <Route path="hashtag/:hashtag" element={<HashtagFeed />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
