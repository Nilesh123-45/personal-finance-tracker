const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// this is the middleware part where i can go
app.use(cors());
app.use(bodyParser.json());

// this is the import routes for the authroutes , transasction routes and the budget routes
const authRoutes = require('./routes/Authroutes');
const transactionRoutes = require('./routes/TransactionRoutes');
const budgetRoutes = require('./routes/Budgetroutes');

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

