'use strict';
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

module.exports = async ([url, schema], dirname = './migrations') => {
    if (/\b(all|migration)\b/i.test(String(process.env.MAINTENANCE))) return console.warn('maintenance mode');
    console.info('loading from', path.resolve(dirname));
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
            const resolved = require.resolve(path.resolve(dirname, `./${name}`));
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
