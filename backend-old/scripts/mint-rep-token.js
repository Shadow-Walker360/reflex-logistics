/**
 * Dev-only helper to mint a rep session token for local testing/Postman/curl.
 * Usage: node scripts/mint-rep-token.js agent@northstar.com [ttlHours]
 *
 * This is NOT how reps will authenticate in production — it exists purely
 * so you can exercise the REP path locally without standing up real SSO.
 */
require('../src/config'); // validates env is present before touching the secret
const { signRepToken } = require('../src/lib/repToken');

const email = process.argv[2];
const ttlHours = Number(process.argv[3]) || 12;

if (!email) {
  console.error('Usage: node scripts/mint-rep-token.js <repEmail> [ttlHours=12]');
  process.exit(1);
}

const token = signRepToken(email, ttlHours * 60 * 60 * 1000);
console.log(token);
console.log(`\nUse it as: Authorization: Bearer ${token}`);
console.log(`Expires in ${ttlHours}h.`);
