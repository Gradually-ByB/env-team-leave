import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

// POST /api/auth/login
export async function POST(req: NextRequest) {
    const { name, password } = await req.json();
    try {
        const result = await pool.query('SELECT * FROM users WHERE name = $1', [name]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return NextResponse.json({ message: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, role: user.role },
            process.env.JWT_SECRET!,
            { expiresIn: '4h' }
        );

        return NextResponse.json({
            token,
            user: { id: user.id, name: user.name, role: user.role },
        });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
