const { MongoClient } = require('mongodb');

let db;

async function connectDB() {
    const client = new MongoClient(process.env.MONGO_URI, {
        tls: true,
        tlsAllowInvalidCertificates: true,
    });
    await client.connect();
    db = client.db("reviewpilot");
    console.log('MongoDB connected');
}

function getDB() {
    if (!db) {
        throw new Error('Database not initialized');
    }
    return db;
}

module.exports = { connectDB, getDB };
