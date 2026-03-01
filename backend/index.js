const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- AUTH API ---

app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, role FROM users ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { name, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE name = $1', [name]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
        );

        res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- LEAVES API ---

// Post multiple leaves or single
app.post('/api/leaves', authenticateToken, async (req, res) => {
    const { leave_type, leave_subtype, start_date, end_date } = req.body;
    try {
        await pool.query(
            'INSERT INTO leaves (user_id, leave_type, leave_subtype, start_date, end_date) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, leave_type, leave_subtype, start_date, end_date]
        );
        res.status(201).json({ message: 'Leave registered' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get today's leaves (for login page)
app.get('/api/leaves/today', async (req, res) => {
    try {
        const query = `
      SELECT l.*, u.name as user_name, u.role as user_role, u.job_role as user_job_role
      FROM leaves l
      JOIN users u ON l.user_id = u.id
      WHERE (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE >= start_date 
      AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE <= end_date
    `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get leaves by month (for calendar), or all leaves if month query is not provided
app.get('/api/leaves', authenticateToken, async (req, res) => {
    const { month } = req.query; // YYYY-MM
    try {
        let query = `
      SELECT l.*, u.name as user_name, u.role as user_role, u.job_role as user_job_role
      FROM leaves l
      JOIN users u ON l.user_id = u.id
    `;
        let params = [];
        if (month) {
            query += ` WHERE (start_date < (($1 || '-01')::DATE + INTERVAL '1 month') AND end_date >= ($1 || '-01')::DATE)`;
            params.push(month);
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get my leaves
app.get('/api/leaves/my', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM leaves WHERE user_id = $1 ORDER BY start_date ASC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get team leaves (±7 days)
app.get('/api/leaves/week', authenticateToken, async (req, res) => {
    try {
        const query = `
      SELECT l.*, u.name as user_name, u.job_role as user_job_role
      FROM leaves l
      JOIN users u ON l.user_id = u.id
      WHERE (start_date <= (date_trunc('week', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE + 1)::DATE + 5)
        AND end_date >= (date_trunc('week', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE + 1)::DATE - 1))
      AND u.id != $1
    `;
        const result = await pool.query(query, [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a leave
app.delete('/api/leaves/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM leaves WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Leave not found or unauthorized' });
        }

        res.json({ message: 'Leave deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
