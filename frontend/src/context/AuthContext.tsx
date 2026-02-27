'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

interface User {
    id: number;
    name: string;
    role: 'admin' | 'member';
}

interface AuthContextType {
    user: User | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const storedUser = Cookies.get('env_team_user');
        const token = Cookies.get('env_team_token');
        if (storedUser && token) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error('Failed to parse user cookie', e);
                Cookies.remove('env_team_user', { path: '/' });
                Cookies.remove('env_team_token', { path: '/' });
            }
        }
        setLoading(false);
    }, []);

    const login = (token: string, user: User) => {
        const cookieOptions = { expires: 4 / 24, path: '/' }; // 4 hours
        Cookies.set('env_team_token', token, cookieOptions);
        Cookies.set('env_team_user', JSON.stringify(user), cookieOptions);
        setUser(user);
        if (user.role === 'admin') {
            router.push('/admin');
        } else {
            router.push('/member');
        }
    };

    const logout = () => {
        const cookieOptions = { path: '/' };
        Cookies.remove('env_team_token', cookieOptions);
        Cookies.remove('env_team_user', cookieOptions);
        setUser(null);
        router.push('/');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
