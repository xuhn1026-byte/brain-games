const serverless = require('serverless-http');
const app = require('./server');

module.exports.main = serverless(app, {
  binary: false
});
