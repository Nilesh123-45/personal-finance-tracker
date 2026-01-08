const express = require('express');
const router = express.Router();
const db = require('../db');

// HELPER: Check and Insert Due Recurring Transactions
async function processRecurringTransactions(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Find rules that are due (next_run_date <= today)
    const [dues] = await db.query(
        'SELECT * FROM recurring_ops WHERE user_id = ? AND next_run_date <= ?', 
        [userId, today]
    );

    for (const op of dues) {
        // A. Insert the actual transaction into history
        await db.query(
            'INSERT INTO transactions (user_id, category_id, amount, description, transaction_date) VALUES (?, ?, ?, ?, ?)',
            [op.user_id, op.category_id, op.amount, op.description + ' (Auto)', op.next_run_date]
        );

        // B. Calculate NEXT run date
        let nextDate = new Date(op.next_run_date);
        if (op.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        if (op.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);

        // C. Update the rule for next time
        await db.query(
            'UPDATE recurring_ops SET next_run_date = ? WHERE id = ?',
            [nextDate.toISOString().split('T')[0], op.id]
        );
    }
}

// 1. ADD TRANSACTION (Handle One-Time AND Recurring)
router.post('/', async (req, res) => {
    try {
        const { userId, categoryId, amount, description, date, isRecurring, frequency } = req.body;

        // A. Save the main transaction
        await db.query(
            'INSERT INTO transactions (user_id, category_id, amount, description, transaction_date) VALUES (?, ?, ?, ?, ?)',
            [userId, categoryId, amount, description, date]
        );

        // B. If Recurring, save the rule
        if (isRecurring) {
            // Calculate first auto-run date (next month/week)
            let nextDate = new Date(date);
            if (frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
            if (frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);

            await db.query(
                'INSERT INTO recurring_ops (user_id, category_id, amount, description, frequency, next_run_date) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, categoryId, amount, description, frequency, nextDate.toISOString().split('T')[0]]
            );
        }

        res.status(201).json({ message: "Transaction added" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. GET HISTORY (Triggers the Auto-Process check)
router.get('/', async (req, res) => {
    try {
        const { userId } = req.query;

        // MAGIC: Process any due recurring payments BEFORE showing history
        await processRecurringTransactions(userId);

        // Now fetch history as usual
        const sql = `
            SELECT t.id, t.amount, t.description, t.transaction_date, c.name as category_name, c.type
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = ?
            ORDER BY t.transaction_date DESC`;
            
        const [rows] = await db.query(sql, [userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. DELETE TRANSACTION (DELETE /api/transactions/:id)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM transactions WHERE id = ?', [id]);
        res.json({ message: "Transaction deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;


// // backend/routes/transactionRoutes.js
// const express = require('express');
// const router = express.Router();
// const db = require('../db');

// // ADD TRANSACTION (POST /api/transactions)
// router.post('/', async (req, res) => {
//     try {
//         const { userId, categoryId, amount, description, date } = req.body;
        
//         await db.query(
//             'INSERT INTO transactions (user_id, category_id, amount, description, transaction_date) VALUES (?, ?, ?, ?, ?)',
//             [userId, categoryId, amount, description, date]
//         );
//         res.status(201).json({ message: "Transaction added" });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // GET HISTORY (GET /api/transactions?userId=1)
// router.get('/', async (req, res) => {
//     try {
//         const { userId } = req.query;
//         // Join users -> transactions -> categories to get readable names
//         const sql = `
//             SELECT t.id, t.amount, t.description, t.transaction_date, c.name as category_name, c.type
//             FROM transactions t
//             JOIN categories c ON t.category_id = c.id
//             WHERE t.user_id = ?
//             ORDER BY t.transaction_date DESC`;
            
//         const [rows] = await db.query(sql, [userId]);
//         res.json(rows);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// module.exports = router;