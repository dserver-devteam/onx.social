-- Insert sample users (Password for all: Password123!)
INSERT INTO users (username, display_name, email, password_hash, avatar_url, bio, role, email_verified) VALUES
('alice_dev', 'Alice Johnson', 'alice@nsocial.dev', '$2b$10$uqBk5eDwmxWSYYcMJ5jkMeY2YiFyUuBWbiiqBBBm24AQ8rjamBJtO', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', 'Full-stack developer | Coffee enthusiast ☕ | Building cool stuff', 'user', true),
('bob_design', 'Bob Smith', 'bob@nsocial.dev', '$2b$10$uqBk5eDwmxWSYYcMJ5jkMeY2YiFyUuBWbiiqBBBm24AQ8rjamBJtO', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob', 'UI/UX Designer | Making the web beautiful 🎨', 'support', true),
('charlie_tech', 'Charlie Brown', 'charlie@nsocial.dev', '$2b$10$uqBk5eDwmxWSYYcMJ5jkMeY2YiFyUuBWbiiqBBBm24AQ8rjamBJtO', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie', 'Tech blogger | AI & ML enthusiast 🤖', 'user', true),
('diana_code', 'Diana Prince', 'diana@nsocial.dev', '$2b$10$uqBk5eDwmxWSYYcMJ5jkMeY2YiFyUuBWbiiqBBBm24AQ8rjamBJtO', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diana', 'Software Engineer @ TechCorp | Open source contributor', 'support', true),
('eve_data', 'Eve Martinez', 'eve@nsocial.dev', '$2b$10$uqBk5eDwmxWSYYcMJ5jkMeY2YiFyUuBWbiiqBBBm24AQ8rjamBJtO', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eve', 'Data Scientist | Python lover 🐍 | Analytics geek', 'user', true);

-- Insert sample posts
INSERT INTO posts (user_id, content, created_at) VALUES
(1, 'Just launched my new portfolio website! Check it out and let me know what you think 🚀', NOW() - INTERVAL '2 hours'),
(2, 'Working on a new design system with dark mode support. The blue accents are looking amazing! #design #ui', NOW() - INTERVAL '4 hours'),
(3, 'Interesting article about the future of AI in web development. The possibilities are endless! 🤖', NOW() - INTERVAL '6 hours'),
(4, 'Finally fixed that bug that''s been haunting me for days. Time to celebrate! 🎉', NOW() - INTERVAL '8 hours'),
(5, 'Just finished analyzing a massive dataset. The insights are mind-blowing! 📊 #datascience', NOW() - INTERVAL '10 hours'),
(1, 'Pro tip: Always write tests for your code. Your future self will thank you! 💡', NOW() - INTERVAL '12 hours'),
(2, 'The new Figma features are incredible. Design workflow just got so much better! 🎨', NOW() - INTERVAL '14 hours'),
(3, 'Machine learning models are getting smarter every day. Exciting times ahead! 🚀', NOW() - INTERVAL '16 hours'),
(4, 'Code review tip: Be kind, be constructive, and always explain your suggestions 👍', NOW() - INTERVAL '18 hours'),
(5, 'Data visualization is an art form. Making complex data beautiful and understandable 📈', NOW() - INTERVAL '20 hours');

-- Insert sample likes
INSERT INTO likes (user_id, post_id) VALUES
(2, 1), (3, 1), (4, 1),
(1, 2), (3, 2), (5, 2),
(1, 3), (2, 3), (4, 3), (5, 3),
(2, 4), (3, 4),
(1, 5), (2, 5), (3, 5), (4, 5),
(3, 6), (4, 6), (5, 6),
(1, 7), (3, 7), (4, 7),
(2, 8), (4, 8), (5, 8),
(1, 9), (2, 9), (5, 9),
(1, 10), (3, 10), (4, 10);

-- Insert sample reposts
INSERT INTO reposts (user_id, post_id) VALUES
(2, 1), (3, 1),
(1, 2), (4, 2),
(2, 3), (5, 3),
(1, 4), (3, 4),
(2, 5), (4, 5),
(1, 6), (5, 6),
(3, 7), (5, 7),
(1, 8), (4, 8),
(3, 9), (5, 9),
(2, 10), (4, 10);

INSERT INTO replies (user_id, post_id, content) VALUES
(2, 1, 'Looks amazing! Love the color scheme 🎨'),
(3, 1, 'Great work! The animations are smooth'),
(4, 2, 'Can''t wait to see the full design system!'),
(1, 3, 'Thanks for sharing! Very insightful article'),
(5, 4, 'Congrats! I know that feeling 😄'),
(3, 5, 'Would love to hear more about your findings!'),
(4, 6, 'So true! Testing saves so much time'),
(2, 8, 'ML is definitely the future!'),
(5, 9, 'Great advice! Code reviews are so important'),
(1, 10, 'Beautiful visualizations! What tools do you use?');

-- Insert sample reports
INSERT INTO reports (post_id, reporter_id, reason, description, status, assigned_to) VALUES
(3, 1, 'spam', 'This looks like promotional content', 'pending', NULL),
(5, 3, 'inappropriate', 'Contains misleading information', 'reviewing', 2),
(8, 5, 'spam', 'Repeated similar content', 'resolved', 4);
