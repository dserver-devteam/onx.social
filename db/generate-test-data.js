const { Pool } = require('pg');
const { hashPassword } = require('../utils/password');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
        rejectUnauthorized: false
    }
});

// Themes and related content
const themes = {
    technology: {
        topics: ['AI', 'MachineLearning', 'WebDev', 'JavaScript', 'Python', 'Cloud', 'DevOps', 'Cybersecurity', 'Blockchain', 'IoT'],
        content: [
            'Just deployed my first #AI model to production! The results are amazing 🚀',
            'Learning #Python has been a game changer for my career',
            'Hot take: #JavaScript is still the most versatile language out there',
            'Finally got my #AWS certification! Time to celebrate 🎉',
            'Anyone else excited about the new #WebDev frameworks coming out?',
            '#DevOps best practices have saved me so much time',
            'The future of #Blockchain is looking bright',
            'Working on a new #MachineLearning project, wish me luck!',
            '#Cybersecurity should be everyone\'s top priority',
            'Just built my first #IoT device and it actually works!'
        ]
    },
    design: {
        topics: ['UI', 'UX', 'Design', 'Figma', 'Adobe', 'Typography', 'ColorTheory', 'Branding', 'Animation', 'WebDesign'],
        content: [
            'New #UI design for my portfolio site. What do you think? 🎨',
            '#UX research is so underrated in the design process',
            'Loving the new features in #Figma, total game changer',
            'Color theory is the foundation of good #Design',
            'Just finished a #Branding project for a local startup',
            '#Typography can make or break a design',
            'Smooth #Animation makes all the difference in user experience',
            '#WebDesign trends for 2025 are looking interesting',
            'Minimalism in #Design never goes out of style',
            'The #Adobe Creative Suite is still unmatched'
        ]
    },
    gaming: {
        topics: ['Gaming', 'Esports', 'GameDev', 'Unity', 'Unreal', 'IndieGames', 'RPG', 'FPS', 'Streaming', 'PlayStation'],
        content: [
            'Just hit Diamond rank! #Gaming grind is real 🎮',
            'The #Esports scene is growing so fast',
            'Working on my first #GameDev project using #Unity',
            '#IndieGames have some of the best storytelling',
            'New #RPG release has me hooked for hours',
            '#FPS games are my go-to for competitive play',
            'Started #Streaming and loving the community',
            'The graphics on #PlayStation 5 are insane',
            '#Unreal Engine 5 is a masterpiece for developers',
            'Retro #Gaming will always have a special place in my heart'
        ]
    },
    fitness: {
        topics: ['Fitness', 'Gym', 'Running', 'Yoga', 'Nutrition', 'HealthyLiving', 'Workout', 'Cardio', 'Strength', 'Wellness'],
        content: [
            'Morning #Workout complete! Feeling energized 💪',
            '#Fitness journey update: down 10 pounds!',
            'Nothing beats a good #Running session at sunrise',
            '#Yoga has transformed my mental health',
            'Meal prep Sunday for #Nutrition goals 🥗',
            '#HealthyLiving is a lifestyle, not a diet',
            'New PR at the #Gym today! Progress feels good',
            '#Cardio days are tough but worth it',
            '#Strength training has been a game changer',
            '#Wellness is about mind and body balance'
        ]
    },
    food: {
        topics: ['Foodie', 'Cooking', 'Baking', 'Recipe', 'Vegan', 'Coffee', 'Dessert', 'HealthyEating', 'FoodPhotography', 'Chef'],
        content: [
            'Made the best pasta from scratch! #Foodie life 🍝',
            '#Cooking is my therapy after a long day',
            'First attempt at #Baking sourdough bread',
            'Sharing my favorite #Recipe for chocolate chip cookies',
            '#Vegan meals can be absolutely delicious',
            'Morning #Coffee is essential for productivity ☕',
            'This #Dessert turned out better than expected',
            '#HealthyEating doesn\'t have to be boring',
            '#FoodPhotography is an art form',
            'Aspiring #Chef documenting my culinary journey'
        ]
    },
    travel: {
        topics: ['Travel', 'Adventure', 'Wanderlust', 'Photography', 'Nature', 'Explore', 'Backpacking', 'Beach', 'Mountains', 'Culture'],
        content: [
            'Just booked my next #Travel adventure! ✈️',
            '#Adventure awaits in every corner of the world',
            '#Wanderlust hitting hard today',
            'Captured this amazing sunset #Photography',
            '#Nature never fails to amaze me',
            'Time to #Explore new destinations',
            '#Backpacking through Europe has been incredible',
            '#Beach days are the best days 🏖️',
            'The #Mountains are calling and I must go',
            'Learning about different #Culture through travel'
        ]
    },
    business: {
        topics: ['Startup', 'Entrepreneur', 'Business', 'Marketing', 'Sales', 'Leadership', 'Productivity', 'Innovation', 'Finance', 'Growth'],
        content: [
            'Launching my #Startup next month! Excited and nervous 🚀',
            '#Entrepreneur life is not for the faint of heart',
            '#Business strategy is everything',
            'New #Marketing campaign just went live',
            '#Sales tips that actually work',
            '#Leadership is about empowering others',
            '#Productivity hack: time blocking changed my life',
            '#Innovation comes from thinking differently',
            'Understanding #Finance is crucial for business success',
            '#Growth mindset is the key to success'
        ]
    },
    music: {
        topics: ['Music', 'Guitar', 'Piano', 'Producer', 'LiveMusic', 'Jazz', 'Rock', 'HipHop', 'Electronic', 'Vinyl'],
        content: [
            'New #Music release dropping soon! 🎵',
            'Been practicing #Guitar for hours today',
            '#Piano melodies are so therapeutic',
            'Life as a #Producer is challenging but rewarding',
            '#LiveMusic experiences are unmatched',
            '#Jazz has such a rich history',
            '#Rock music will never die',
            '#HipHop culture continues to evolve',
            '#Electronic music production is my passion',
            'Collecting #Vinyl records is my favorite hobby'
        ]
    },
    science: {
        topics: ['Science', 'Physics', 'Biology', 'Chemistry', 'Space', 'Research', 'Climate', 'Medicine', 'Engineering', 'Innovation'],
        content: [
            '#Science is the key to understanding our world',
            '#Physics concepts blow my mind every day',
            '#Biology is fascinating at every level',
            '#Chemistry experiments are so satisfying',
            '#Space exploration is the future',
            'Published my first #Research paper!',
            '#Climate action is urgent and necessary',
            '#Medicine advances are saving lives',
            '#Engineering solutions to real problems',
            '#Innovation in science is accelerating'
        ]
    },
    art: {
        topics: ['Art', 'Painting', 'Drawing', 'Digital', 'Illustration', 'Sculpture', 'Gallery', 'Artist', 'Creative', 'Abstract'],
        content: [
            'Finished a new #Art piece today! 🎨',
            '#Painting is my favorite form of expression',
            '#Drawing practice every day pays off',
            '#Digital art opens so many possibilities',
            '#Illustration work for a new book project',
            '#Sculpture requires patience and vision',
            'Visited an amazing #Gallery this weekend',
            'Life as an #Artist is beautifully chaotic',
            '#Creative process is different for everyone',
            '#Abstract art speaks to the soul'
        ]
    }
};

// Generate random username
function generateUsername(index) {
    const prefixes = ['cool', 'super', 'mega', 'ultra', 'pro', 'epic', 'awesome', 'real', 'the', 'just'];
    const suffixes = ['user', 'dev', 'creator', 'maker', 'builder', 'master', 'guru', 'ninja', 'wizard', 'legend'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${prefix}_${suffix}_${index}`;
}

// Generate random display name
function generateDisplayName() {
    const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Sage', 'River',
        'Phoenix', 'Dakota', 'Skyler', 'Cameron', 'Rowan', 'Parker', 'Reese', 'Charlie', 'Finley', 'Emerson'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
        'Chen', 'Kim', 'Patel', 'Singh', 'Lee', 'Wang', 'Liu', 'Kumar', 'Nguyen', 'Cohen'];
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${firstName} ${lastName}`;
}

// Generate random bio based on interests
function generateBio(interests) {
    const templates = [
        `Passionate about ${interests[0]} and ${interests[1]} | Creator | Dreamer`,
        `${interests[0]} enthusiast | ${interests[1]} lover | Living my best life`,
        `Exploring the world of ${interests[0]} | ${interests[1]} advocate`,
        `${interests[0]} + ${interests[1]} = ❤️ | Making things happen`,
        `Professional ${interests[0]} person | Amateur ${interests[1]} expert`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
}

// Assign random themes to user (1-3 themes per user)
function assignUserThemes() {
    const themeKeys = Object.keys(themes);
    const numThemes = Math.floor(Math.random() * 3) + 1; // 1-3 themes
    const userThemes = [];

    for (let i = 0; i < numThemes; i++) {
        const randomTheme = themeKeys[Math.floor(Math.random() * themeKeys.length)];
        if (!userThemes.includes(randomTheme)) {
            userThemes.push(randomTheme);
        }
    }

    return userThemes;
}

// Generate post content based on theme
function generatePost(theme) {
    const themeData = themes[theme];
    const content = themeData.content[Math.floor(Math.random() * themeData.content.length)];

    // Sometimes add extra hashtags
    if (Math.random() > 0.5) {
        const extraTopic = themeData.topics[Math.floor(Math.random() * themeData.topics.length)];
        return `${content} #${extraTopic}`;
    }

    return content;
}

// Generate random timestamp within last 30 days
function randomTimestamp() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const randomTime = thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime());
    return new Date(randomTime);
}

async function generateTestData() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log('🔐 Generating password hash...');
        const passwordHash = await hashPassword('testpass123');

        console.log('👥 Creating 100 test users...');
        const users = [];

        for (let i = 1; i <= 100; i++) {
            const username = generateUsername(i);
            const displayName = generateDisplayName();
            const email = `${username}@test.com`;
            const userThemes = assignUserThemes();
            const bio = generateBio(userThemes.map(t => themes[t].topics[0]));

            const result = await client.query(
                `INSERT INTO users (username, display_name, email, password_hash, bio, status)
                 VALUES ($1, $2, $3, $4, $5, 'active')
                 RETURNING id`,
                [username, displayName, email, passwordHash, bio]
            );

            users.push({
                id: result.rows[0].id,
                username,
                themes: userThemes
            });

            if (i % 10 === 0) {
                console.log(`   Created ${i}/100 users...`);
            }
        }

        console.log('✅ All users created!');
        console.log('📝 Creating 1,200 test posts...');

        let postCount = 0;
        const postsPerUser = 12; // 100 users * 12 posts = 1,200 posts

        for (const user of users) {
            for (let i = 0; i < postsPerUser; i++) {
                // Pick a random theme from user's interests
                const theme = user.themes[Math.floor(Math.random() * user.themes.length)];
                const content = generatePost(theme);
                const createdAt = randomTimestamp();

                await client.query(
                    `INSERT INTO posts (user_id, content, created_at)
                     VALUES ($1, $2, $3)`,
                    [user.id, content, createdAt]
                );

                postCount++;

                if (postCount % 100 === 0) {
                    console.log(`   Created ${postCount}/1200 posts...`);
                }
            }
        }

        console.log('✅ All posts created!');

        // Fetch all post IDs
        const postIdsResult = await client.query('SELECT id FROM posts ORDER BY id');
        const postIds = postIdsResult.rows.map(row => row.id);
        console.log(`📋 Found ${postIds.length} posts in database`);

        console.log('❤️ Generating random likes...');

        // Generate random likes (each user likes 20-50 random posts) - BATCH INSERT
        const likesData = [];
        for (const user of users) {
            const numLikes = Math.floor(Math.random() * 31) + 20; // 20-50 likes
            const likedPosts = new Set();

            while (likedPosts.size < numLikes) {
                const randomPostId = postIds[Math.floor(Math.random() * postIds.length)];
                if (!likedPosts.has(randomPostId)) {
                    likesData.push([user.id, randomPostId]);
                    likedPosts.add(randomPostId);
                }
            }
        }

        // Batch insert likes
        if (likesData.length > 0) {
            const likesValues = likesData.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(',');
            const likesParams = likesData.flat();

            await client.query(
                `INSERT INTO likes (user_id, post_id) VALUES ${likesValues} ON CONFLICT (user_id, post_id) DO NOTHING`,
                likesParams
            );
        }

        console.log(`✅ Created ${likesData.length} likes!`);
        console.log('🔄 Generating random reposts...');

        // Generate random reposts (each user reposts 5-15 posts) - BATCH INSERT
        const repostsData = [];
        for (const user of users) {
            const numReposts = Math.floor(Math.random() * 11) + 5; // 5-15 reposts
            const repostedPosts = new Set();

            while (repostedPosts.size < numReposts) {
                const randomPostId = postIds[Math.floor(Math.random() * postIds.length)];
                if (!repostedPosts.has(randomPostId)) {
                    repostsData.push([user.id, randomPostId]);
                    repostedPosts.add(randomPostId);
                }
            }
        }

        // Batch insert reposts
        if (repostsData.length > 0) {
            const repostsValues = repostsData.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(',');
            const repostsParams = repostsData.flat();

            await client.query(
                `INSERT INTO reposts (user_id, post_id) VALUES ${repostsValues} ON CONFLICT (user_id, post_id) DO NOTHING`,
                repostsParams
            );
        }

        console.log(`✅ Created ${repostsData.length} reposts!`);
        console.log('💬 Generating random replies...');

        // Generate random replies (200-300 total) - BATCH INSERT
        const replyTemplates = [
            'Great post! 👍',
            'I totally agree with this!',
            'This is so true!',
            'Thanks for sharing!',
            'Interesting perspective!',
            'Love this! ❤️',
            'Couldn\'t have said it better myself',
            'This resonates with me',
            'Absolutely! 💯',
            'Well said!',
            'This is exactly what I needed to hear',
            'So inspiring!',
            'Facts! 🔥',
            'This made my day',
            'Saving this for later!'
        ];

        const repliesData = [];
        const numReplies = Math.floor(Math.random() * 101) + 200; // 200-300 replies
        for (let i = 0; i < numReplies; i++) {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const randomPostId = postIds[Math.floor(Math.random() * postIds.length)];
            const replyContent = replyTemplates[Math.floor(Math.random() * replyTemplates.length)];
            repliesData.push([randomUser.id, randomPostId, replyContent]);
        }

        // Batch insert replies
        if (repliesData.length > 0) {
            const repliesValues = repliesData.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(',');
            const repliesParams = repliesData.flat();

            await client.query(
                `INSERT INTO replies (user_id, post_id, content) VALUES ${repliesValues}`,
                repliesParams
            );
        }

        console.log(`✅ Created ${repliesData.length} replies!`);

        await client.query('COMMIT');

        console.log('\n🎉 Test data generation complete!');
        console.log('📊 Summary:');
        console.log(`   - 100 users created`);
        console.log(`   - 1,200 posts created`);
        console.log(`   - ${likesData.length} likes created`);
        console.log(`   - ${repostsData.length} reposts created`);
        console.log(`   - ${repliesData.length} replies created`);
        console.log('\n✨ Your database is now populated with diverse test data!');
        console.log('🔍 Users have different interests across 10 themes:');
        console.log('   Technology, Design, Gaming, Fitness, Food,');
        console.log('   Travel, Business, Music, Science, Art');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error generating test data:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the script
generateTestData().catch(console.error);
