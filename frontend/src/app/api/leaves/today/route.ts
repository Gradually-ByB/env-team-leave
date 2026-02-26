import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/leaves/today - 오늘의 휴무자 (로그인 화면용, 인증 불필요)
export async function GET() {
    try {
        const query = `
            SELECT l.*, u.name as user_name, u.role as user_role, u.job_role as user_job_role
            FROM leaves l
            JOIN users u ON l.user_id = u.id
            WHERE (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE >= start_date
              AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE <= end_date
        `;
        const result = await pool.query(query);
        return NextResponse.json(result.rows);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
