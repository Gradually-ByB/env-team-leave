import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

interface JwtPayload {
    id: number;
    name: string;
    role: string;
}

export function verifyToken(req: NextRequest): JwtPayload | null {
    const authHeader = req.headers.get('authorization');
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return null;

    try {
        return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    } catch {
        return null;
    }
}
