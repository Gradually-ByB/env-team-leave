import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET /api/leaves/my - 내 휴무 목록
export async function GET(req: NextRequest) {
    const user = verifyToken(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const result = await pool.query(
            'SELECT * FROM leaves WHERE user_id = $1 ORDER BY start_date ASC',
            [user.id]
        );
        return NextResponse.json(result.rows);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
