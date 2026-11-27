// https://www.postgresql.org/docs/15/errcodes-appendix.html
const FOREIGN_KEY_VIOLATION = '23503';
const UNIQUE_VIOLATION = '23505';

module.exports = { FOREIGN_KEY_VIOLATION, UNIQUE_VIOLATION };
