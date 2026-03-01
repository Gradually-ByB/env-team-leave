import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET /api/leaves?month=YYYY-MM - 월별 휴무 목록 (달력용), month 없으면 전체 반환
export async function GET(req: NextRequest) {
    const user = verifyToken(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM (optional)

    try {
        let query: string;
        let params: string[];

        if (month) {
            query = `
                SELECT 
                    l.id, l.user_id, l.leave_type, l.leave_subtype, 
                    l.start_date, l.end_date, l.created_at,
                    u.name as user_name, u.role as user_role, u.job_role as user_job_role
                FROM leaves l
                JOIN users u ON l.user_id = u.id
                WHERE (l.start_date < (($1 || '-01')::DATE + INTERVAL '1 month') AND l.end_date >= ($1 || '-01')::DATE)
            `;
            params = [month];
        } else {
            query = `
                SELECT 
                    l.id, l.user_id, l.leave_type, l.leave_subtype, 
                    l.start_date, l.end_date, l.created_at,
                    u.name as user_name, u.role as user_role, u.job_role as user_job_role
                FROM leaves l
                JOIN users u ON l.user_id = u.id
            `;
            params = [];
        }

        const result = await pool.query(query, params);
        return NextResponse.json(result.rows);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

// POST /api/leaves - 휴무 등록
export async function POST(req: NextRequest) {
    const user = verifyToken(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { leave_type, leave_subtype, start_date, end_date } = await req.json();
    try {
        await pool.query(
            'INSERT INTO leaves (user_id, leave_type, leave_subtype, start_date, end_date) VALUES ($1, $2, $3, $4, $5)',
            [user.id, leave_type, leave_subtype, start_date, end_date]
        );
        return NextResponse.json({ message: 'Leave registered' }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
