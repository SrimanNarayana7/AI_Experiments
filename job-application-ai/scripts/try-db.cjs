const { PrismaClient } = require('@prisma/client');

const url = process.argv[2];
if (!url) {
  console.error('usage: node try-db.js <database-url>');
  process.exit(1);
}

(async () => {
  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
  });
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('OK', url.replace(/:[^:@]*@/, ':***@'));
    process.exit(0);
  } catch (e) {
    console.log('FAIL', e.message.split('\n')[0]);
    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
})();
