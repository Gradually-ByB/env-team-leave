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
            // 모든 휴무를 다 가져온다. (달력에서 월을 바꿔도 데이터가 모두 표시되도록)
            const response = await api.get('/leaves');
            setLeaves(response.data);
        } catch (err) {
            console.error('Failed to fetch leaves', err);
        }
    }, [user]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchLeaves();

        // 10초마다 자동 새로고침 (Polling)
        const interval = setInterval(() => {
            fetchLeaves();
        }, 10000);

        // 창이 다시 활성화될 때 즉시 새로고침
        const handleFocus = () => fetchLeaves();
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }, [fetchLeaves]);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const getDayLeaves = (day: Date) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        return leaves.filter(l => {
            const start = format(new Date(l.start_date), 'yyyy-MM-dd');
            const end = format(new Date(l.end_date), 'yyyy-MM-dd');
            const isWeekday = day.getDay() !== 0 && day.getDay() !== 6;
            return isWeekday && dayStr >= start && dayStr <= end;
        });
    };

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
                    <div className="flex items-center gap-3 py-1 px-4 bg-slate-50/50 rounded-xl border border-slate-100">
                        <div className="text-right">
                            <p className="text-[10px] font-medium text-slate-400 leading-tight">접속 중인 관리자</p>
                            <p className="text-xs font-bold text-slate-800">{user?.name}</p>
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
                                                        {dayLeaves.length}명
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
                                                    <div key={i} className={`px-2 py-0.5 border rounded-lg text-[10px] font-bold truncate transition-transform hover:scale-[1.02] ${getCalendarColor(l.leave_type)}`} title={`${l.user_name}: ${l.leave_subtype}`}>
                                                        {l.user_name}
                                                        {l.leave_subtype && (l.leave_type === '대체휴무' || l.leave_type === '반차') && (
                                                            <span className="ml-1 opacity-70 font-medium text-[9px]">({l.leave_subtype})</span>
                                                        )}
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
                    <div className="bg-white/90 backdrop-blur-md rounded-4xl p-8 shadow-2xl border border-white/20 flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-2xl font-black text-slate-800">
                                        {selectedDay ? (
                                            isToday(selectedDay) ? '오늘의 휴무자' : `${format(selectedDay, 'M월 d일')} 휴무자`
                                        ) : '휴무자 정보'}
                                    </h3>
                                    <p className="text-sm font-medium text-slate-400">선택된 날짜의 상세 휴무 현황입니다.</p>
                                </div>
                                {selectedDay && (
                                    <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 border ${isToday(selectedDay) ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                                        <CalendarIcon className={`w-4 h-4 ${isToday(selectedDay) ? 'text-blue-500' : 'text-slate-500'}`} />
                                        <span className={`text-xs font-bold ${isToday(selectedDay) ? 'text-blue-700' : 'text-slate-700'}`}>
                                            {format(selectedDay, 'MM.dd(EEE)', { locale: ko })}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-4">
                                {selectedDay && (selectedDay.getDay() === 0 || selectedDay.getDay() === 6) ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-12 opacity-60">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                            <CalendarIcon className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <p className="text-sm text-slate-400 font-bold">주말은 휴무자가 없습니다.</p>
                                    </div>
                                ) : selectedDay && getDayLeaves(selectedDay).length > 0 ? getDayLeaves(selectedDay).map((l, i) => (
                                    <div key={i} className="group relative flex flex-col gap-3 p-5 bg-white hover:bg-blue-50/30 rounded-3xl transition-all border border-slate-100 hover:border-blue-100 shadow-sm">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 font-bold text-sm">
                                                    {l.user_name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-base font-bold text-slate-800">{l.user_name}</p>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">{l.user_job_role}</p>
                                                </div>
                                            </div>
                                            <span className={`inline-block px-3 py-1 text-[10px] font-black rounded-lg ${l.leave_type === '연차' ? 'bg-blue-100 text-blue-700' :
                                                l.leave_type === '반차' ? 'bg-green-100 text-green-700' :
                                                    l.leave_type === '대체휴무' ? 'bg-amber-100 text-amber-700' :
                                                        l.leave_type === '공휴일' ? 'bg-red-100 text-red-700' :
                                                            'bg-slate-100 text-slate-700'
                                                }`}>
                                                {l.leave_type}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Info className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-xs font-bold">{l.leave_subtype || '상세내용 없음'}</span>
                                            </div>
                                            {l.leave_subtype === '기간' && (
                                                <p className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                                                    {format(new Date(l.start_date), 'MM.dd')} - {format(new Date(l.end_date), 'MM.dd')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-12 opacity-60">
                                        <Info className="w-12 h-12 text-slate-300 mb-4" />
                                        <p className="text-sm text-slate-400 font-medium">휴무자가 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Summary Footer for Today/Tomorrow */}
                        {!isToday(selectedDay!) && (
                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <button
                                    onClick={() => setSelectedDay(new Date())}
                                    className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                                >
                                    <CalendarIcon className="w-3.5 h-3.5" />
                                    오늘의 휴무 현황으로 돌아가기
                                </button>
                            </div>
                        )}
                    </div>
                </aside>
            </main>
        </div>
    );
}
