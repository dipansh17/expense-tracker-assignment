import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';


dotenv.config();


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());


const connectDB = async () => {
  try {
   
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await seedInitialData();
  } catch (err) {
    console.error('MongoDB connection error:', err);
    console.log('Using in-memory database instead');
    

    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    await mongoose.connect(uri);
    console.log('Connected to in-memory MongoDB');
    

    await seedInitialData();
  }
};


const expenseSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});


const Expense = mongoose.model('Expense', expenseSchema);


const seedInitialData = async () => {
  try {
    const count = await Expense.countDocuments();
    if (count === 0) {
      console.log('Seeding initial expense data...');
      
      const sampleExpenses = [
        {
          amount: 45.99,
          category: 'Food',
          date: '2025-01-15',
          description: 'Grocery shopping at Whole Foods'
        },
        {
          amount: 12.50,
          category: 'Transportation',
          date: '2025-01-14',
          description: 'Uber ride to work'
        },
        {
          amount: 1200.00,
          category: 'Housing',
          date: '2025-01-01',
          description: 'Monthly rent payment'
        },
        {
          amount: 35.75,
          category: 'Entertainment',
          date: '2025-01-10',
          description: 'Movie tickets and snacks'
        },
        {
          amount: 89.99,
          category: 'Utilities',
          date: '2025-01-05',
          description: 'Electricity bill'
        },
        {
          amount: 120.00,
          category: 'Healthcare',
          date: '2025-01-08',
          description: 'Doctor appointment co-pay'
        },
        {
          amount: 65.32,
          category: 'Shopping',
          date: '2025-01-12',
          description: 'New t-shirts from H&M'
        }
      ];
      
      await Expense.insertMany(sampleExpenses);
      console.log('Initial data seeded successfully!');
    }
  } catch (err) {
    console.error('Error seeding initial data:', err);
  }
};


app.get('/api/expenses', async (req, res) => {
  try {
    const { category, date } = req.query;
    let query = {};
    
    if (category) {
      query.category = category;
    }
    
    if (date) {
      query.date = date;
    }
    
    const expenses = await Expense.find(query).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


app.post('/api/expenses', async (req, res) => {
  try {
    const { amount, category, date, description } = req.body;
    
    if (!amount || !category || !date) {
      return res.status(400).json({ message: 'Please provide amount, category, and date' });
    }
    
    const newExpense = new Expense({
      amount,
      category,
      date,
      description
    });
    
    const savedExpense = await newExpense.save();
    res.status(201).json(savedExpense);
  } catch (err) {
    console.error('Error adding expense:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


app.get('/api/expenses/total', async (req, res) => {
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({ message: 'Please provide start and end dates' });
    }
    
    const expenses = await Expense.find({
      date: { $gte: start, $lte: end }
    });
    
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    res.json({ total });
  } catch (err) {
    console.error('Error calculating total:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


app.get('/api/expenses/by-category', async (req, res) => {
  try {
    const result = await Expense.aggregate([
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching category statistics:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start the server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();