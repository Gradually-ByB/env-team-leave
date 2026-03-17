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

export const AuthProvider = ({ children, initialUser }: { children: React.ReactNode, initialUser: User | null }) => {
    const [user, setUser] = useState<User | null>(initialUser);
    const [loading, setLoading] = useState(!initialUser);
    const router = useRouter();
    useEffect(() => {
        // State is initialized from initialUser prop (passed from Server Component)
        // This effect ensures hydration completeness
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(false);
    }, []);

    const login = (token: string, user: User) => {
        Cookies.set('token', token, { expires: 4 / 24 });
        Cookies.set('user', JSON.stringify(user), { expires: 4 / 24 });
        setUser(user);
        // Instant redirect based on role
        if (user.role === 'admin') {
            router.replace('/admin');
        } else {
            router.replace('/member');
        }
    };

    const logout = () => {
        Cookies.remove('token');
        Cookies.remove('user');
        setUser(null);
        router.replace('/');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
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
