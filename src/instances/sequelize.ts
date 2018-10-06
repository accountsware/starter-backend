import * as Sequelize from 'sequelize'

const db = process.env.DB_NAME || 'donaldmcdougal';
const username = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD || 'root';

export const sequelize = new Sequelize(db, username, password, {
    dialect: 'mysql',
    port: 3306,
    operatorsAliases: false,
    pool: {
        max: 5,
        min: 0,
        idle: 10000
    }
});