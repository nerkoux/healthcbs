const crypto = require('crypto');

console.log('\n🔐 Generating AES-256 Encryption Key\n');
console.log('Add this to your .env.local file:\n');
console.log('ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('base64'));
console.log('\n⚠️  Keep this key secure and never commit it to version control!\n');
