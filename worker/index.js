const keys = require("./keys"); // api keys
const redis = require("redis");

const redisClient = redis.createClient({
	host: keys.redisHost,
	port: keys.redisPort,
	retry_strategy: () => 1000,
});
const sub = redisClient.duplicate(); // subscription

// calculate fib sequence recursively
function fib(index) {
	if (index < 2) return 1;
	return fib(index - 1) + fib(index - 2);
}

// every time we get a new message
sub.on("message", (channel, message) => {
	// calculate value an save it in a hash
	redisClient.hset("values", message, fib(parseInt(message)));
});
sub.subscribe("insert");
