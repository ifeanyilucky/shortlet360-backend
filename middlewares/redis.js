const redis = require('redis');

module.exports.redisClient = redis.createClient({
  url: 'redis://localhost:6379',
});
