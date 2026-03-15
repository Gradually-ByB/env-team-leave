import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET /api/leaves?month=YYYY-MM - 월별 휴무 목록 (달력용)
export async function GET(req: NextRequest) {
    const user = verifyToken(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM

    try {
        const query = `
            SELECT l.*, u.name as user_name, u.role as user_role, u.job_role as user_job_role
            FROM leaves l
            JOIN users u ON l.user_id = u.id
            WHERE (start_date < (($1 || '-01')::DATE + INTERVAL '1 month') AND end_date >= ($1 || '-01')::DATE)
        `;
        const result = await pool.query(query, [month]);
        return NextResponse.json(result.rows);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

// POST /api/leaves - 휴무 등록
export async function POST(req: NextRequest) {
    const user = verifyToken(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { leave_type, leave_subtype, start_date, end_date, memo, target_user_id } = await req.json();
    try {
        // 관리자인 경우 target_user_id가 있으면 해당 유저의 휴무를 등록, 없으면 본인
        const userId = (user.role === 'admin' && target_user_id) ? target_user_id : user.id;

        await pool.query(
            'INSERT INTO leaves (user_id, leave_type, leave_subtype, start_date, end_date, memo) VALUES ($1, $2, $3, $4, $5, $6)',
            [userId, leave_type, leave_subtype, start_date, end_date, memo || null]
        );
        return NextResponse.json({ message: 'Leave registered' }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
