#!/usr/bin/env node
'use strict';
const fs = require('fs');
const migrate = require('../index');

if (/\b(all|migration)\b/i.test(String(process.env.MAINTENANCE))) return console.warn('maintenance mode');

try {
    Object.assign(process.env, Object.assign(JSON.parse(fs.readFileSync('/var/secrets/secrets.json', 'utf8')), process.env));
} catch (err) {
    if (err.code != 'ENOENT') throw err;
}

migrate(process.env.DATABASE_URL.split('#'), ...process.argv.slice(2)).catch((err) => {
    console.error(err);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
});
