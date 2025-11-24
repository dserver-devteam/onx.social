const bcrypt = require('bcrypt');

async function generateHashedPasswords() {
    const defaultPassword = 'Password123!';
    const hash = await bcrypt.hash(defaultPassword, 10);
    console.log('Default password:', defaultPassword);
    console.log('Hashed password:', hash);
    console.log('\nUse this hash in your seed.sql file');
}

generateHashedPasswords();
