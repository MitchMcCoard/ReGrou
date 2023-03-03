module.exports = {

    development: {
        client: 'pg',
        connection: {
            host : 'localhost',
            user : 'kiearmccoard',
            password : 'password',
            database : 'nodelogin',
            port : 5432
        },
        migrations: {
            directory: __dirname + '/knex/migrations',
        },
        seeds: {
            directory: __dirname + 'knex/seeds'
        }
    },

    production: {
        client: 'pg',
            connection: {
                connectionString : process.env.DATABASE_URL,
                ssl :{
                    rejectUnauthorized: false
                }
            },
            migrations: {
                directory: './knex/migrations',
                tableName: 'knex_migrations',
            },
            seeds: {directory: './knex/seeds'},
    }
};