// Rebuild the test schema from migrations + seed before the suite runs.
module.exports = async () => {
    require('./env');
    const { pool, schema } = require('../config/database');
    const { migrate } = require('../db/migrate');
    const { seed } = require('../db/seed');
    const quiet = () => {};
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await migrate({ log: quiet });
    await migrate({ log: quiet }); // second run must be a no-op
    await seed({ log: quiet });
    if (await seed({ log: quiet })) throw new Error('seed is not idempotent');
    await pool.end();
};
