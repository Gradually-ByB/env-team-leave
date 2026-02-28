'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Image from 'next/image';
import { ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface UserOption {
  id: number;
  name: string;
  role: string;
}

interface LeavePreview {
  leave_type: string;
  user_name?: string;
  name?: string;
}

export default function LoginPage() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [todayLeaves, setTodayLeaves] = useState<LeavePreview[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, leavesRes] = await Promise.all([
          api.get('/users'),
          api.get('/leaves/today')
        ]);
        setUsers(usersRes.data);
        setTodayLeaves(leavesRes.data);
      } catch (err) {
        console.error('Failed to fetch initial data', err);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post('/auth/login', {
        name: selectedName,
        password: password,
      });
      login(response.data.token, response.data.user);
    } catch (err: unknown) {
      const typedErr = err as { response?: { data?: { message?: string } } };
      setError(typedErr.response?.data?.message || '로그인에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent p-4">
      <div className="w-full max-w-[380px] bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/20">
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 flex items-center justify-center shrink-0 drop-shadow-md">
              <Image src="/logo.png" alt="환경팀 로고" width={40} height={40} className="object-contain" priority />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">환경팀 휴무일정</h1>
          </div>

          <div className="mb-6 p-4 bg-blue-100/90 rounded-2xl border border-blue-200/60">
            <div className="flex items-center gap-2 mb-3 px-1">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-blue-800">오늘의 휴무자 {todayLeaves.length > 0 ? `(${todayLeaves.length})` : ''}</h2>
            </div>
            {todayLeaves.length > 0 ? (
              <div className="flex flex-wrap gap-x-4 gap-y-2 px-1">
                {todayLeaves.map((l, i) => {
                  let badgeColors = 'text-slate-600 bg-slate-50';
                  if (l.leave_type === '연차') badgeColors = 'text-blue-600 bg-blue-50';
                  else if (l.leave_type === '반차') badgeColors = 'text-green-500 bg-green-50';
                  else if (l.leave_type === '대체휴무') badgeColors = 'text-amber-500 bg-amber-50';

                  return (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-slate-800">{l.user_name || l.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${badgeColors}`}>
                        {l.leave_type}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 px-1 font-medium italic">오늘 휴무인 팀원이 없습니다.</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-100 scrollbar-hide">
                {/* 관리자 섹션 */}
                {users.some(u => u.role === 'admin') && (
                  <div>
                    <label className="block text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1 ml-1">관리자</label>
                    <div className="grid grid-cols-5 gap-1">
                      {users.filter(u => u.role === 'admin').map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setSelectedName(u.name)}
                          className={`h-9 rounded-lg text-sm font-bold transition-all ${selectedName === u.name
                            ? 'bg-blue-700 text-white shadow-md shadow-blue-200 scale-95'
                            : 'bg-white text-slate-800 hover:bg-white hover:shadow-sm border border-slate-200'
                            }`}
                        >
                          {u.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 팀원 섹션 */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">팀원</label>
                  <div className="grid grid-cols-5 gap-1">
                    {users.filter(u => u.role === 'member').map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedName(u.name)}
                        className={`h-9 rounded-lg text-sm font-bold transition-all ${selectedName === u.name
                          ? 'bg-blue-700 text-white shadow-md shadow-blue-200 scale-95'
                          : 'bg-white text-slate-600 hover:bg-white hover:shadow-sm border border-slate-100'
                          }`}
                      >
                        {u.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className={selectedName ? 'animate-in fade-in slide-in-from-top-2 duration-300' : 'opacity-50 pointer-events-none'}>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">비밀번호</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="4자리"
                    disabled={!selectedName}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-black text-lg tracking-[0.25em] focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent transition-all placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 placeholder:tracking-normal"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="h-12 px-6 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-100 flex items-center justify-center group whitespace-nowrap"
                >
                  로그인
                  <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          </form>
        </div>
        <div className="p-6 bg-slate-50 text-center">
          <p className="text-xs text-slate-400 font-medium">© 2026 환경팀. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
