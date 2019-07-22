module.exports = {
    PORT: process.env.PORT || 8000,
    NODE_ENV: process.env.NODE_ENV || 'production',
    DB_URL: process.env.DATABASE_URL || 'postgresql://dunder-mifflin@localhost/noteful-database',
    TEST_DB_URL: process.env.TEST_DB_URL || 'postgresql://dunder-mifflin@localhost/noteful-database-test',
    API_ENDPOINT: 'https://shrouded-falls-76226.herokuapp.com/'
  }