const { getDB } = require('../dbConfig/db');
const { ObjectId } = require('mongodb');

const COLLECTION = 'users';

async function createUser(user) {
    const db = getDB();
    return db.collection(COLLECTION).insertOne(user);
}

async function findUserByEmail(email) {
    const db = getDB();
    return db.collection(COLLECTION).findOne({ email });
}

async function findUserById(id) {
    const db = getDB();
    return db.collection(COLLECTION).findOne({ _id: new ObjectId(id)  });
}

async function updateGoogleTokens(userId, accessToken, refreshToken) {
    const db = getDB();
    return db.collection(COLLECTION).updateOne(
        { _id: new ObjectId(userId) },
        {
            $set: {
                'platforms.google.accessToken': accessToken,
                'platforms.google.refreshToken': refreshToken,
                'platforms.google.updatedAt': new Date(),
            }
        }
    );
}

async function connectGoogle(userId, { googleId, accessToken, refreshToken, googleName, googleEmail }) {
    const db = getDB();
    return db.collection(COLLECTION).updateOne(
        { _id: new ObjectId(userId) },
        {
            $set: {
                googleId,
                'platforms.google': {
                    accessToken,
                    refreshToken,
                    googleName,
                    googleEmail,
                    connectedAt: new Date(),
                }
            }
        }
    );
}

async function updateBusinessInfo(userId, data) {
    console.log('data: ', data);
    const db = getDB();
    return db.collection(COLLECTION).updateOne(
        { _id: new ObjectId(userId) },
        {
            $set: data
        }
    );
}

async function findUserByGoogleId(googleId) {
    const db = getDB();
    return db.collection(COLLECTION).findOne({ googleId });
}

module.exports = {
    findUserByEmail,
    createUser,
    findUserById,
    updateGoogleTokens,
    connectGoogle,
    updateBusinessInfo,
    findUserByGoogleId
};
