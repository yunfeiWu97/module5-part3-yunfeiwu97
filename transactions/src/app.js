const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI || 'mongodb://mongo:27017';

console.log('Starting transactions service...');
console.log('MongoDB URI:', mongoUri);

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const client = new MongoClient(mongoUri);

async function connectToMongo() {
  try {
    console.log('Attempting MongoDB connection...');
    await client.connect();
    await client.db().command({ ping: 1 });
    console.log('Successfully connected to MongoDB!');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
}

connectToMongo();

app.get('/api/transactions/:userId', async (req, res) => {
  try {
    const db = client.db('bank_app');

    let userId;
    try {
      userId = new ObjectId(req.params.userId);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const user = await db.collection('users').findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const transactions = user.transactions || [];
    const grouped = {};

    transactions.forEach((transaction) => {
      const transactionDate = transaction.date ? new Date(transaction.date) : new Date();
      const monthKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;

      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }

      grouped[monthKey].push({
        type: transaction.type,
        amount: transaction.amount,
        date: transactionDate
      });
    });

    const result = Object.keys(grouped)
      .sort()
      .reverse()
      .map((month) => ({
        month,
        transactions: grouped[month]
      }));

    res.json(result);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Server Error', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Transactions service running on http://localhost:${port}`);
});