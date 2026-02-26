import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET /api/leaves/week - 이번 주 팀원 휴무
export async function GET(req: NextRequest) {
    const user = verifyToken(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const query = `
            SELECT l.*, u.name as user_name, u.job_role as user_job_role
            FROM leaves l
            JOIN users u ON l.user_id = u.id
            WHERE (start_date <= (date_trunc('week', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE + 1)::DATE + 5)
              AND end_date >= (date_trunc('week', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE + 1)::DATE - 1))
              AND u.id != $1
        `;
        const result = await pool.query(query, [user.id]);
        return NextResponse.json(result.rows);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
