const keys = require("./keys");

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

app.use(cors()); // allows request from one domain to other
app.use(bodyParser.json()); // parse body of request to js object

// Postgres client setup
const { Pool } = require("pg");
// pool constructor
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort,
    ssl:
        process.env.NODE_ENV !== "production"
            ? false
            : { rejectUnauthorized: false },
});

// pgClient.on("error", () => console.log("Lost PG connection"));

pgClient.on("connect", (client) => {
    client
        .query("CREATE TABLE IF NOT EXISTS values (number INT)")
        .catch((err) => console.error(err));
});

// Redis Client setup
const redis = require("redis");
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});
const redisPublisher = redisClient.duplicate();


// Express route handlers
app.get("/", (req, res) => {
    res.send("Hi");
});

// returns all values submitted
app.get("/values/all", async (req, res) => {
    const values = await pgClient.query("SELECT * FROM values");

    res.send(values.rows);
});

app.get("/values/current", async (req, res) => {
    redisClient.hgetall("values", (err, values) => {
        res.send(values);
    });
});

// receive new values
app.post("/values", async (req, res) => {
    const index = req.body.index;

    if (parseInt(index) > 40) {
        return res.status(422).send("Index too high");
    }

    redisClient.hset("values", index, "Nothing yet!"); // replaces nothing by index
    redisPublisher.publish("insert", index); // start worker
    pgClient.query("INSERT INTO values(number) VALUES($1)", [index]); // store it in postgres

    res.send({ working: true });
});

app.listen(5000, err => {
    console.log("Listening");
})