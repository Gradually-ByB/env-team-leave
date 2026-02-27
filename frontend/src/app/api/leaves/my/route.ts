import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET /api/leaves/my - 내 휴무 목록
export async function GET(req: NextRequest) {
    const user = verifyToken(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const result = await pool.query(
            `SELECT l.*, u.name as user_name, u.job_role as user_job_role 
             FROM leaves l 
             JOIN users u ON l.user_id = u.id 
             WHERE l.user_id = $1 
             ORDER BY l.start_date ASC`,
            [user.id]
        );
        return NextResponse.json(result.rows);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
