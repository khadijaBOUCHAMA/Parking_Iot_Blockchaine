// Simple script to create admin user in MongoDB
const { MongoClient } = require('mongodb');

async function createAdminUser() {
  const uri = 'mongodb://parksync_user:parksync_password_123@localhost:27017/parksync';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('parksync');

    // Create admin user
    const result = await db.collection('users').findOneAndUpdate(
      { walletAddress: '0x5aE80F47D3ABc81F820fd1C7E57e315DCC1DF8bF' },
      {
        $set: {
          walletAddress: '0x5aE80F47D3ABc81F820fd1C7E57e315DCC1DF8bF',
          role: 'admin',
          isActive: true,
          isVerified: true,
          nonce: Math.floor(Math.random() * 1000000)
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    console.log('Admin user created/updated:', result.value);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

createAdminUser();