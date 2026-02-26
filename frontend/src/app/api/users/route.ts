import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/users - 로그인 화면 사용자 목록
export async function GET() {
    try {
        const result = await pool.query('SELECT id, name, role FROM users ORDER BY id ASC');
        return NextResponse.json(result.rows);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
