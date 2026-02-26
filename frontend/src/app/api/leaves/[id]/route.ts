import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// DELETE /api/leaves/[id] - 특정 휴무 삭제
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = verifyToken(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    try {
        const result = await pool.query(
            'DELETE FROM leaves WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, user.id]
        );

        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Leave not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Leave deleted successfully' });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
