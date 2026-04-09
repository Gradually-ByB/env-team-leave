import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcrypt';

// PUT /api/users/[id] - 사용자 정보 수정 (관리자 전용)
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = verifyToken(req);
    if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name, role, job_role, password } = await req.json();

    try {
        let query = 'UPDATE users SET name = $1, role = $2, job_role = $3';
        let queryParams = [name, role, job_role];

        if (password) {
            const password_hash = await bcrypt.hash(password, 10);
            query += ', password_hash = $4 WHERE id = $5 RETURNING id, name, role, job_role';
            queryParams.push(password_hash, id);
        } else {
            query += ' WHERE id = $4 RETURNING id, name, role, job_role';
            queryParams.push(id);
        }

        const result = await pool.query(query, queryParams);
        
        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        return NextResponse.json(result.rows[0]);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

// DELETE /api/users/[id] - 사용자 삭제 (관리자 전용)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = verifyToken(req);
    if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // 본인 삭제 방지
    if (Number(id) === user.id) {
        return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        
        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        return NextResponse.json({ message: 'User deleted successfully' });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
