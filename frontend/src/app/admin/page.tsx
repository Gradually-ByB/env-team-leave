'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { LogOut, Calendar, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { getHolidayName } from '@/lib/koreanHolidays';
import Image from 'next/image';

interface Leave {
    id: number;
    user_name: string;
    user_role: string;
    user_job_role: string;
    leave_type: string;
    leave_subtype: string;
    start_date: string;
    end_date: string;
}

export default function AdminPage() {
    const { user, logout } = useAuth();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

    const fetchLeaves = React.useCallback(async () => {
        try {
            const response = await api.get(`/leaves?month=${format(currentMonth, 'yyyy-MM')}`);
            setLeaves(response.data);
        } catch (err) {
            console.error('Failed to fetch leaves', err);
        }
    }, [currentMonth]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchLeaves();
    }, [fetchLeaves]);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const getDayLeaves = (day: Date) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        return leaves.filter(l => {
            const startStr = format(new Date(l.start_date), 'yyyy-MM-dd');
            const endStr = format(new Date(l.end_date), 'yyyy-MM-dd');
            const isWeekday = day.getDay() !== 0 && day.getDay() !== 6;
            return isWeekday && dayStr >= startStr && dayStr <= endStr;
        });
    };

    const selectedDayLeaves = selectedDay ? getDayLeaves(selectedDay) : [];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Sidebar/Header Integration */}
            <header className="bg-white px-8 py-4 flex items-center justify-between shadow-sm z-10 border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center shrink-0 drop-shadow-md">
                        <Image src="/logo.png" alt="환경팀 로고" width={48} height={48} className="object-contain" priority />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">환경팀 휴무 통합관리 시스템</h1>
                        <p className="text-sm text-slate-500 font-medium">관리자 전용 대시보드</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 pr-6 border-r border-slate-200">
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                            <p className="text-xs text-blue-600 font-bold tracking-widest">{user?.role === 'admin' ? '관리자' : user?.role}</p>
                        </div>
                    </div>
                    <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <LogOut className="w-6 h-6" />
                    </button>
                </div>
            </header>

            <main className="flex-1 p-8 grid grid-cols-1 xl:grid-cols-[7fr_3fr] gap-8 overflow-hidden">
                {/* Left Component: Main Calendar */}
                <section className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-bold text-slate-800">{format(currentMonth, 'yyyy년 MM월')}</h2>
                            <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200">
                                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 bg-white text-slate-700 shadow-sm hover:text-blue-600 hover:shadow-md rounded-lg transition-all active:scale-95"><ChevronLeft className="w-5 h-5" /></button>
                                <button onClick={() => setCurrentMonth(new Date())} className="px-4 text-sm font-bold text-blue-600 hover:bg-white hover:shadow-sm rounded-lg transition-all">오늘</button>
                                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 bg-white text-slate-700 shadow-sm hover:text-blue-600 hover:shadow-md rounded-lg transition-all active:scale-95"><ChevronRight className="w-5 h-5" /></button>
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
                            <div key={`pad-${i}`} className="bg-white min-h-[120px]" />
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
                                    className={`bg-white min-h-[120px] p-3 transition-all cursor-pointer group ${isSelected ? 'ring-2 ring-blue-500 z-10' : 'hover:bg-slate-50'}`}
                                >
                                    <div className="flex flex-row-reverse justify-between items-start mb-2">
                                        <span className={`text-lg font-bold flex items-center justify-center w-9 h-9 rounded-full ${isToday(day) ? 'bg-blue-600 text-white' : day.getDay() === 0 || holidayName ? 'text-red-500' : day.getDay() === 6 ? 'text-blue-500' : 'text-slate-900'}`}>
                                            {format(day, 'd')}
                                        </span>
                                        <div className="flex flex-col gap-1 items-start">
                                            {dayLeaves.length > 0 && (
                                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                                    {dayLeaves.length}명
                                                </span>
                                            )}
                                            {holidayName && (
                                                <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md truncate max-w-[60px]" title={holidayName}>
                                                    {holidayName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        {dayLeaves.slice(0, 3).map((l, i) => {
                                            const getCalendarColor = (type: string) => {
                                                switch (type) {
                                                    case '연차': return 'bg-blue-50 border-blue-500 text-blue-700';
                                                    case '반차': return 'bg-green-50 border-green-500 text-green-700';
                                                    case '대체휴무': return 'bg-amber-50 border-amber-500 text-amber-700';
                                                    default: return 'bg-slate-50 border-slate-500 text-slate-700';
                                                }
                                            };
                                            return (
                                                <div key={i} className={`px-2 py-0.5 border-l-2 rounded text-[10px] font-bold truncate ${getCalendarColor(l.leave_type)}`}>
                                                    {l.user_name} ({l.leave_type})
                                                </div>
                                            );
                                        })}
                                        {dayLeaves.length > 3 && (
                                            <div className="text-[10px] text-slate-400 pl-2 font-bold">+ {dayLeaves.length - 3} more</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Right Component: Daily Summary & Stats */}
                <aside className="space-y-8 flex flex-col h-full overflow-hidden">
                    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-slate-800">일별 휴무 상세</h3>
                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
                                <Calendar className="w-4 h-4 text-blue-600" />
                                <span className="text-xs font-bold text-slate-600">{selectedDay ? format(selectedDay, 'yyyy.MM.dd') : '날짜 선택'}</span>
                            </div>
                        </div>

                        <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-hide">
                            {selectedDayLeaves.length > 0 ? selectedDayLeaves.map((l, i) => (
                                <div key={i} className="group flex items-center gap-4 p-4 bg-slate-50 hover:bg-blue-50 rounded-2xl transition-all border border-transparent hover:border-blue-100 h-20 min-h-[80px]">
                                    <div className="flex-1 flex items-center gap-2">
                                        <p className="font-bold text-slate-800">{l.user_name}</p>
                                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md uppercase tracking-tight">
                                            {l.user_job_role}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-lg mb-1 ${l.leave_type === '연차' ? 'bg-blue-100 text-blue-700' :
                                            l.leave_type === '반차' ? 'bg-green-100 text-green-700' :
                                                l.leave_type === '대체휴무' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-slate-100 text-slate-700'
                                            }`}>
                                            {l.leave_type}
                                        </span>
                                        {l.leave_subtype === '기간' ? (
                                            <p className="text-[11px] font-bold text-slate-600">
                                                {format(new Date(l.start_date), 'MM.dd', { locale: ko })} ~ {format(new Date(l.end_date), 'MM.dd', { locale: ko })}
                                            </p>
                                        ) : l.leave_subtype !== '종일' ? (
                                            <p className="text-xs font-bold text-slate-700">{l.leave_subtype}</p>
                                        ) : null}
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
