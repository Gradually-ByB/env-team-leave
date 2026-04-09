import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcrypt';

// GET /api/users - 사용자 목록 조회
export async function GET(req: NextRequest) {
    try {
        const result = await pool.query('SELECT id, name, role, job_role FROM users ORDER BY id ASC');
        return NextResponse.json(result.rows);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

// POST /api/users - 새 사용자 추가 (관리자 전용)
export async function POST(req: NextRequest) {
    const user = verifyToken(req);
    if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { name, role, job_role, password } = await req.json();
        const password_hash = await bcrypt.hash(password || '1234', 10);
        
        const result = await pool.query(
            'INSERT INTO users (name, role, job_role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, role, job_role',
            [name, role || 'member', job_role || '팀원', password_hash]
        );
        
        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
