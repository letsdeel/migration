'use strict';
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

try {
    Object.assign(process.env, Object.assign(JSON.parse(fs.readFileSync('/var/secrets/secrets.json', 'utf8')), process.env));
} catch (err) {
    if (err.code != 'ENOENT') throw err;
}

(async ([url, schema], dirname = './migrations') => {
    if (/\b(all|migration)\b/i.test(String(process.env.MAINTENANCE))) return console.warn('maintenance mode');
    const sequelize = new Sequelize(url, {
        schema,
        define: {timestamps: false},
        pool: {max: 1, acquire: 20000},
        logging: (sql) => console.info(sql),
    });
    try {
        const SequelizeMeta = sequelize.define('SequelizeMeta', {name: {type: Sequelize.STRING, primaryKey: true}}, {});
        const files = new Set(fs.readdirSync(path.resolve(dirname), 'utf8').filter((filename) => filename.endsWith('.js')));
        const meta = new Set((await SequelizeMeta.findAll({logging: false, raw: true})).map(({name}) => name));

        for (const name of [...files].filter((name) => !meta.has(name)).sort()) {
            const resolved = require.resolve(dirname, `./${name}`);
            console.info('running migration for', path.basename(name, '.js'));
            await require(resolved).up(sequelize.getQueryInterface(), Sequelize);
            await SequelizeMeta.create({name});
            delete require.cache[resolved];
        }

        await (async (name) => {
            if (!name.length) return;
            await SequelizeMeta.destroy({where: {name}});
        })([...meta].filter((name) => !files.has(name)));
    } finally {
        await sequelize.close();
    }
})(process.env.DATABASE_URL.split('#'), ...process.argv.slice(2)).catch((err) => {
    console.error(err);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
});

module.exports = async ([url, schema], dirname = './migrations') => {
    if (/\b(all|migration)\b/i.test(String(process.env.MAINTENANCE))) return console.warn('maintenance mode');
    const sequelize = new Sequelize(url, {
        schema,
        define: {timestamps: false},
        pool: {max: 1, acquire: 20000},
        logging: (sql) => console.info(sql),
    });
    try {
        const SequelizeMeta = sequelize.define('SequelizeMeta', {name: {type: Sequelize.STRING, primaryKey: true}}, {});
        const files = new Set(fs.readdirSync(path.resolve(dirname), 'utf8').filter((filename) => filename.endsWith('.js')));
        const meta = new Set((await SequelizeMeta.findAll({logging: false, raw: true})).map(({name}) => name));

        for (const name of [...files].filter((name) => !meta.has(name)).sort()) {
            const resolved = require.resolve(dirname, `./${name}`);
            console.info('running migration for', path.basename(name, '.js'));
            await require(resolved).up(sequelize.getQueryInterface(), Sequelize);
            await SequelizeMeta.create({name});
            delete require.cache[resolved];
        }

        await (async (name) => {
            if (!name.length) return;
            await SequelizeMeta.destroy({where: {name}});
        })([...meta].filter((name) => !files.has(name)));
    } finally {
        await sequelize.close();
    }
};
