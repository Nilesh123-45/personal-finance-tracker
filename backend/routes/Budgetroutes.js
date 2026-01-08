const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. SET BUDGET (POST /api/budgets) <-- THIS WAS MISSING
router.post('/', async (req, res) => {
    try {
        const { userId, categoryId, amount, month, year } = req.body;
        
        // Updates budget if it exists, inserts if it doesn't
        const sql = `INSERT INTO budgets (user_id, category_id, amount_limit, month, year) 
                     VALUES (?, ?, ?, ?, ?) 
                     ON DUPLICATE KEY UPDATE amount_limit = ?`;
                     
        await db.query(sql, [userId, categoryId, amount, month, year, amount]);
        res.json({ message: "Budget set!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. GET BUDGET STATUS (GET /api/budgets/status/:userId)
router.get('/status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const currentMonth = new Date().getMonth() + 1; // 1 = Jan, 2 = Feb...

        const sql = `
            SELECT c.name, b.amount_limit, COALESCE(SUM(t.amount), 0) as spent
            FROM budgets b
            JOIN categories c ON b.category_id = c.id
            LEFT JOIN transactions t ON t.category_id = c.id 
                                     AND t.user_id = b.user_id 
                                     AND MONTH(t.transaction_date) = ?
            WHERE b.user_id = ? AND b.month = ?
            GROUP BY b.id`;

        const [rows] = await db.query(sql, [currentMonth, userId, currentMonth]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;