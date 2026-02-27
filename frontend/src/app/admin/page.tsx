'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { LogOut, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { getHolidayName } from '@/lib/koreanHolidays';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface Leave {
    id: number;
    user_name: string;
    user_job_role: string;
    leave_type: string;
    leave_subtype: string;
    start_date: string;
    end_date: string;
}

export default function AdminPage() {
    const { user, logout, loading } = useAuth();
    const router = useRouter();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

    useEffect(() => {
        if (!loading && (!user || user.role !== 'admin')) {
            router.push('/');
        }
    }, [user, loading, router]);

    const fetchLeaves = React.useCallback(async () => {
        if (!user || user.role !== 'admin') return;
        try {
            const response = await api.get(`/leaves?month=${format(currentMonth, 'yyyy-MM')}`);
            setLeaves(response.data);
        } catch (err) {
            console.error('Failed to fetch leaves', err);
        }
    }, [currentMonth, user]);

    useEffect(() => {
        fetchLeaves();
    }, [fetchLeaves]);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const getDayLeaves = (day: Date) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        return leaves.filter(l => {
            const start = l.start_date.split('T')[0];
            const end = l.end_date.split('T')[0];
            const isWeekday = day.getDay() !== 0 && day.getDay() !== 6;
            return isWeekday && dayStr >= start && dayStr <= end;
        });
    };

    const selectedDayLeaves = selectedDay ? getDayLeaves(selectedDay) : [];

    return (
        <div className="min-h-screen bg-transparent flex flex-col">
            {/* Sidebar/Header Integration */}
            <header className="bg-white/80 backdrop-blur-md px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-20 border-b border-white/20">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center shrink-0 drop-shadow-md">
                        <Image src="/logo.png" alt="환경팀 로고" width={48} height={48} className="object-contain" priority />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">환경팀 휴무 일정</h1>
                        <p className="text-sm text-slate-500 font-medium">관리자 전용</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 py-2 px-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                        <div className="text-right">
                            <p className="text-xs font-medium text-slate-400 leading-tight">접속 중인 관리자</p>
                            <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95 border border-transparent hover:border-red-100"
                        title="로그아웃"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="flex-1 p-8 grid grid-cols-1 xl:grid-cols-[7fr_3fr] gap-8 overflow-hidden bg-slate-50/10">
                {/* Left Component: Main Calendar */}
                <div className="flex flex-col gap-8 h-full">
                    {/* Stats Section Overlay Inspired */}

                    <section className="bg-white/90 backdrop-blur-md rounded-4xl p-8 shadow-2xl border border-white/20 flex-1 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-6">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                        <span className="text-slate-500 mr-2">{format(currentMonth, 'yyyy년')}</span>
                                        <span className="text-5xl">{format(currentMonth, 'M월')}</span>
                                    </h2>
                                    <p className="text-sm font-medium text-slate-400 mt-1">팀원들의 휴무 일정을 한눈에 확인하세요.</p>
                                </div>
                                <div className="flex gap-2 bg-slate-100/50 p-1 rounded-2xl border border-slate-200">
                                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2.5 bg-white text-slate-700 shadow-sm hover:text-blue-600 hover:shadow-md rounded-xl transition-all active:scale-90"><ChevronLeft className="w-5 h-5" /></button>
                                    <button onClick={() => setCurrentMonth(new Date())} className="px-5 text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-white rounded-xl transition-all">오늘</button>
                                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2.5 bg-white text-slate-700 shadow-sm hover:text-blue-600 hover:shadow-md rounded-xl transition-all active:scale-90"><ChevronRight className="w-5 h-5" /></button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-2xl overflow-hidden border border-slate-100">
                            {['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'].map((d, i) => (
                                <div key={d} className={`bg-slate-50 py-4 text-center text-xs font-bold uppercase tracking-widest ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-900'}`}>
                                    {d}
                                </div>
                            ))}

                            {/* Calendar Cells */}
                            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                                <div key={`pad-${i}`} className="bg-white min-h-30" />
                            ))}

                            {calendarDays.map((day) => {
                                const dayStr = format(day, 'yyyy-MM-dd');
                                const dayLeaves = getDayLeaves(day);
                                const isSelected = selectedDay && isSameDay(day, selectedDay);
                                const holidayName = getHolidayName(dayStr);

                                return (
                                    <div
                                        key={day.toISOString()}
                                        onClick={() => setSelectedDay(day)}
                                        className={`bg-white min-h-32 p-3 transition-all cursor-pointer group relative ${isSelected ? 'shadow-[inset_0_0_0_2px_#2563eb] z-10 bg-blue-50/10' : 'hover:bg-slate-50/80 border-transparent'}`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`text-base font-black flex items-center justify-center w-8 h-8 rounded-xl transition-colors ${isToday(day) ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : isSelected ? 'text-blue-600' : day.getDay() === 0 || holidayName ? 'text-red-500' : day.getDay() === 6 ? 'text-blue-500' : 'text-slate-800'}`}>
                                                {format(day, 'd')}
                                            </span>
                                            <div className="flex flex-col gap-1 items-end">
                                                {dayLeaves.length > 0 && (
                                                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100">
                                                        {dayLeaves.length} PERS
                                                    </span>
                                                )}
                                                {holidayName && (
                                                    <span className="text-[9px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100 truncate max-w-[60px]" title={holidayName}>
                                                        {holidayName}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            {dayLeaves.slice(0, 3).map((l, i) => {
                                                const getCalendarColor = (type: string) => {
                                                    switch (type) {
                                                        case '연차': return 'bg-blue-50 text-blue-700 border-blue-100';
                                                        case '반차': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
                                                        case '대체휴무': return 'bg-amber-50 text-amber-700 border-amber-100';
                                                        case '공휴일': return 'bg-red-50 text-red-700 border-red-100';
                                                        default: return 'bg-slate-50 text-slate-700 border-slate-100';
                                                    }
                                                };
                                                return (
                                                    <div key={i} className={`px-2 py-0.5 border rounded-lg text-[10px] font-bold truncate transition-transform hover:scale-[1.02] ${getCalendarColor(l.leave_type)}`}>
                                                        {l.user_name}
                                                    </div>
                                                );
                                            })}
                                            {dayLeaves.length > 3 && (
                                                <div className="text-[9px] text-slate-400 pl-1 font-black uppercase tracking-tighter self-end">+ {dayLeaves.length - 3} OTHERS</div>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <div className="absolute bottom-1 right-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>

                {/* Right Component: Daily Summary & Stats */}
                <aside className="space-y-8 flex flex-col h-full overflow-hidden">
                    <div className="bg-white/90 backdrop-blur-md rounded-4xl p-8 shadow-2xl border border-white/20 flex-1 flex flex-col">
                        <div className="flex flex-col gap-1 mb-6">
                            <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest">{selectedDay ? format(selectedDay, 'EEEE', { locale: ko }) : ''}</span>
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-black text-slate-800">휴무 상세</h3>
                                <div className="px-3 py-1.5 bg-slate-100 rounded-xl flex items-center gap-2 border border-slate-200">
                                    <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
                                    <span className="text-[11px] font-bold text-slate-700 leading-none pb-0.5">{selectedDay ? format(selectedDay, 'yyyy.MM.dd') : '날짜 선택'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-hide">
                            {selectedDayLeaves.length > 0 ? selectedDayLeaves.map((l, i) => (
                                <div key={i} className="group relative flex flex-col gap-4 p-5 bg-white hover:bg-blue-50/50 rounded-3xl transition-all border border-slate-100 hover:border-blue-200 shadow-sm hover:shadow-md">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <p className="font-bold text-slate-800">{l.user_name}</p>
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{l.user_job_role}</p>
                                            </div>
                                        </div>
                                        <span className={`inline-block px-2.5 py-1 text-[10px] font-black rounded-lg ${l.leave_type === '연차' ? 'bg-blue-100 text-blue-700' :
                                            l.leave_type === '반차' ? 'bg-green-100 text-green-700' :
                                                l.leave_type === '대체휴무' ? 'bg-amber-100 text-amber-700' :
                                                    l.leave_type === '공휴일' ? 'bg-red-100 text-red-700' :
                                                        'bg-slate-100 text-slate-700'
                                            }`}>
                                            {l.leave_type}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                        <div className="flex items-center gap-1.5 text-slate-400">
                                            <Info className="w-3.5 h-3.5" />
                                            <span className="text-xs font-bold text-slate-500">{l.leave_subtype}</span>
                                        </div>
                                        {l.leave_subtype === '기간' && (
                                            <p className="text-[11px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                {format(new Date(l.start_date), 'MM.dd', { locale: ko })} - {format(new Date(l.end_date), 'MM.dd', { locale: ko })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                        <Info className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <p className="text-slate-400 font-medium">휴무자 데이터가 없습니다.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </aside>
            </main>
        </div>
    );
}
