'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isToday, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { LogOut, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Info, PlusCircle, Clock, Trash2 } from 'lucide-react';
import { getHolidayName, isKoreanHoliday } from '@/lib/koreanHolidays';
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
    memo?: string;
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

    const [summaryTodayLeaves, setSummaryTodayLeaves] = useState<Leave[]>([]);
    const [summaryNextLeaves, setSummaryNextLeaves] = useState<Leave[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [leaveToDelete, setLeaveToDelete] = useState<number | null>(null);

    // Form State
    const [leaveType, setLeaveType] = useState('연차');
    const [leaveSubtype, setLeaveSubtype] = useState('종일');
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [memo, setMemo] = useState('');
    // Independent view month/year for date pickers
    const [startViewYear, setStartViewYear] = useState(new Date().getFullYear());
    const [startViewMonthNum, setStartViewMonthNum] = useState(new Date().getMonth());
    const [endViewYear, setEndViewYear] = useState(new Date().getFullYear());
    const [endViewMonthNum, setEndViewMonthNum] = useState(new Date().getMonth());
    const fetchLeaves = React.useCallback(async () => {
        if (!user || user.role !== 'admin') return;
        try {
            // 달력용 3개월치 데이터 가져오기
            const months = [
                format(subMonths(currentMonth, 1), 'yyyy-MM'),
                format(currentMonth, 'yyyy-MM'),
                format(addMonths(currentMonth, 1), 'yyyy-MM')
            ];
            const responses = await Promise.all(months.map(m => api.get(`/leaves?month=${m}`)));
            const allMonthLeaves = responses.flatMap(r => r.data);
            const uniqueLeaves = Array.from(new Map(allMonthLeaves.map((l: Leave) => [l.id, l])).values());
            setLeaves(uniqueLeaves);

            // 오늘/내일 요약 데이터 업데이트 (이미 가져온 데이터에서 필터링)
            const today = new Date();
            let nextDay = addDays(today, 1);
            if (today.getDay() === 5) nextDay = addDays(today, 3);

            const filterForDay = (day: Date, ignoreWeekendCheck: boolean = false) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                if (!ignoreWeekendCheck && isWeekend) return [];

                return uniqueLeaves.filter((l: Leave) => {
                    const start = format(new Date(l.start_date), 'yyyy-MM-dd');
                    const end = format(new Date(l.end_date), 'yyyy-MM-dd');
                    return dayStr >= start && dayStr <= end;
                });
            };

            setSummaryTodayLeaves(filterForDay(today));
            setSummaryNextLeaves(filterForDay(nextDay));
        } catch (err) {
            console.error('Failed to fetch leaves', err);
        }
    }, [user, currentMonth]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/leaves', {
                leave_type: leaveType,
                leave_subtype: leaveSubtype,
                start_date: startDate,
                end_date: endDate,
                memo: leaveType === '대체휴무' ? memo : undefined,
            });
            setShowForm(false);
            setMemo('');
            fetchLeaves();
        } catch {
            alert('휴무 등록에 실패했습니다.');
        }
    };

    const handleDelete = async () => {
        if (!leaveToDelete) return;
        try {
            await api.delete(`/leaves/${leaveToDelete}`);
            setLeaveToDelete(null);
            fetchLeaves();
        } catch (err) {
            console.error('Delete failed', err);
            alert('삭제에 실패했습니다.');
        }
    };

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
            return dayStr >= start && dayStr <= end;
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
                    <div className="bg-white/90 backdrop-blur-md rounded-4xl p-8 shadow-2xl border border-white/20 flex-1 flex flex-col overflow-hidden">
                        {/* Today Section */}
                            {!(new Date().getDay() === 0 || new Date().getDay() === 6) && (
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex flex-col gap-1">
                                            <h3 className="text-xl font-black text-slate-800">오늘의 휴무자</h3>
                                        </div>
                                        <div className="px-3 py-1.5 bg-blue-50 rounded-xl flex items-center gap-2 border border-blue-100">
                                            <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
                                            <span className="text-[11px] font-bold text-blue-700 leading-none pb-0.5">{format(new Date(), 'MM.dd(EEE)', { locale: ko })}</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-3">
                                        {summaryTodayLeaves.length > 0 ? summaryTodayLeaves.map((l, i) => (
                                            <div key={i} className="group relative flex flex-col gap-1.5 p-2.5 bg-white hover:bg-blue-50/30 rounded-2xl transition-all border border-slate-100 hover:border-blue-100 shadow-sm">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800">{l.user_name}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{l.user_job_role}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`inline-block px-2 py-0.5 text-[9px] font-black rounded-md ${l.leave_type === '연차' ? 'bg-blue-100 text-blue-700' :
                                                            l.leave_type === '반차' ? 'bg-green-100 text-green-700' :
                                                                l.leave_type === '대체휴무' ? 'bg-amber-100 text-amber-700' :
                                                                    l.leave_type === '공휴일' ? 'bg-red-100 text-red-700' :
                                                                        'bg-slate-100 text-slate-700'
                                                            }`}>
                                                            {l.leave_type}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setLeaveToDelete(l.id);
                                                            }}
                                                            className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between pt-1.5 border-t border-slate-50">
                                                    <div className="flex items-center gap-1.5 text-slate-400">
                                                        <Info className="w-3 h-3" />
                                                        <span className="text-[10px] font-bold text-slate-500">
                                                            {l.leave_subtype}
                                                            {l.leave_type === '대체휴무' && l.memo && <span className="text-[9px] text-slate-400 font-normal ml-1">({l.memo})</span>}
                                                        </span>
                                                    </div>
                                                    {l.leave_subtype === '기간' && (
                                                        <p className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                                            {format(new Date(l.start_date), 'MM.dd')} - {format(new Date(l.end_date), 'MM.dd')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center py-8 opacity-60">
                                                <Info className="w-8 h-8 text-slate-300 mb-2" />
                                                <p className="text-xs text-slate-400 font-medium">오늘 휴무자가 없습니다.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Divider for Today and Tomorrow if both are shown */}
                            {!(new Date().getDay() === 0 || new Date().getDay() === 6) && !((selectedDay || new Date()).getDay() === 0 || (selectedDay || new Date()).getDay() === 6) && (
                                <div className="h-px bg-slate-100 my-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)]" />
                            )}

                        {/* Tomorrow Section */}
                                {(() => {
                                    const baseDate = selectedDay || new Date();
                                    const nextDay = baseDate.getDay() === 5 ? addDays(baseDate, 3) : addDays(baseDate, 1);

                                    // 내일 섹션을 위한 휴무자 필터링 (선택된 날짜 기준)
                                    const nextDayLeaves = summaryNextLeaves;
                                    const isNextDayWeekend = nextDay.getDay() === 0 || nextDay.getDay() === 6;

                                    if (isNextDayWeekend) return null;

                                    return (
                                        <div className="flex-1 flex flex-col min-h-0">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex flex-col gap-1">
                                                    <h3 className="text-xl font-black text-slate-800">
                                                        {baseDate.getDay() === 5 ? '월요일의 휴무자' : '내일의 휴무자'}
                                                    </h3>
                                                </div>
                                                <div className="px-3 py-1.5 bg-slate-100 rounded-xl flex items-center gap-2 border border-slate-200">
                                                    <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
                                                    <span className="text-[11px] font-bold text-slate-700 leading-none pb-0.5">
                                                        {format(nextDay, 'MM.dd(EEE)', { locale: ko })}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-3">
                                                {nextDayLeaves.length > 0 ? nextDayLeaves.map((l, i) => (
                                                    <div key={i} className="group relative flex flex-col gap-1.5 p-2.5 bg-white hover:bg-slate-50/80 rounded-2xl transition-all border border-slate-100 hover:border-slate-200 shadow-sm">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-800">{l.user_name}</p>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{l.user_job_role}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`inline-block px-2 py-0.5 text-[9px] font-black rounded-md ${l.leave_type === '연차' ? 'bg-blue-100 text-blue-700' :
                                                                    l.leave_type === '반차' ? 'bg-green-100 text-green-700' :
                                                                        l.leave_type === '대체휴무' ? 'bg-amber-100 text-amber-700' :
                                                                            l.leave_type === '공휴일' ? 'bg-red-100 text-red-700' :
                                                                                'bg-slate-100 text-slate-700'
                                                                    }`}>
                                                                    {l.leave_type}
                                                                </span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setLeaveToDelete(l.id);
                                                                    }}
                                                                    className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-50">
                                                            <div className="flex items-center gap-1.5 text-slate-400">
                                                                <Info className="w-3 h-3" />
                                                                <span className="text-[10px] font-bold text-slate-500">
                                                                    {l.leave_subtype}
                                                                    {l.leave_type === '대체휴무' && l.memo && <span className="text-[9px] text-slate-400 font-normal ml-1">({l.memo})</span>}
                                                                </span>
                                                            </div>
                                                            {l.leave_subtype === '기간' && (
                                                                <p className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                                                    {format(new Date(l.start_date), 'MM.dd')} - {format(new Date(l.end_date), 'MM.dd')}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="h-full flex flex-col items-center justify-center text-center py-8 opacity-60">
                                                        <Info className="w-8 h-8 text-slate-300 mb-2" />
                                                        <p className="text-xs text-slate-400 font-medium">내일 휴무자가 없습니다.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                            {/* Divider if Tomorrow and Selected Day are shown */}
                            {!(new Date().getDay() === 0 || new Date().getDay() === 6) && selectedDay && !isSameDay(selectedDay, new Date()) && (
                                <div className="h-px bg-slate-100 my-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)]" />
                            )}

                            {/* Selected Day Details Section */}
                            {selectedDay && !isSameDay(selectedDay, new Date()) && (
                                <div className="flex-1 flex flex-col min-h-0 bg-blue-50/20 rounded-3xl p-4 border border-blue-100/50">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex flex-col gap-1">
                                            <h3 className="text-lg font-black text-slate-800">선택한 날짜의 휴무</h3>
                                        </div>
                                        <div className="px-3 py-1 bg-white rounded-xl flex items-center gap-2 border border-blue-100 shadow-sm">
                                            <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
                                            <span className="text-[10px] font-bold text-blue-700">{format(selectedDay, 'MM.dd(EEE)', { locale: ko })}</span>
                                        </div>
                                    </div>

                                    <div className="overflow-y-auto pr-1 space-y-2">
                                        {getDayLeaves(selectedDay).length > 0 ? getDayLeaves(selectedDay).map((l, i) => (
                                            <div key={i} className="flex flex-col gap-1 p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800">{l.user_name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 capitalize">{l.user_job_role}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`px-1.5 py-0.5 text-[8px] font-black rounded ${l.leave_type === '연차' ? 'bg-blue-100 text-blue-700' :
                                                            l.leave_type === '반차' ? 'bg-green-100 text-green-700' :
                                                                l.leave_type === '대체휴무' ? 'bg-amber-100 text-amber-700' :
                                                                    'bg-slate-100 text-slate-700'
                                                            }`}>
                                                            {l.leave_type}
                                                        </span>
                                                        <button onClick={() => setLeaveToDelete(l.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                                {l.memo && (
                                                    <div className="flex items-center gap-1 mt-0.5 pt-1 border-t border-slate-50">
                                                        <Info className="w-2.5 h-2.5 text-blue-400" />
                                                        <p className="text-[9px] text-slate-500 italic">"{l.memo}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        )) : (
                                            <div className="py-4 text-center opacity-40">
                                                <p className="text-[10px] text-slate-400 font-bold">휴무자가 없습니다.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                    </div>
                </aside>
            </main>

            {/* Floating Action Button */}
            <button
                onClick={() => setShowForm(true)}
                className="fixed bottom-10 right-10 h-16 px-6 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-20 group"
            >
                <PlusCircle className="w-8 h-8" />
                <span className="font-bold ml-2 text-lg">휴무 등록</span>
            </button>

            {/* Registration Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-white rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">휴무 등록</h2>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 font-bold p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <LogOut className="w-6 h-6 rotate-180" />
                            </button>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider ml-1">휴무 구분</label>
                                    <select
                                        value={leaveType}
                                        onChange={(e) => setLeaveType(e.target.value)}
                                        className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                    >
                                        <option value="연차">연차</option>
                                        <option value="반차">반차</option>
                                        <option value="대체휴무">대체휴무</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider ml-1">상세 구분</label>
                                    <select
                                        value={leaveSubtype}
                                        onChange={(e) => setLeaveSubtype(e.target.value)}
                                        className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                    >
                                        {leaveType === '연차' ? (
                                            <>
                                                <option value="종일">종일</option>
                                                <option value="기간">기간</option>
                                            </>
                                        ) : leaveType === '반차' ? (
                                            <>
                                                <option value="오전">오전</option>
                                                <option value="오후">오후</option>
                                            </>
                                        ) : (
                                            <option value="일반">일반</option>
                                        )}
                                    </select>
                                </div>
                            </div>

                            {leaveType === '대체휴무' && (
                                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider ml-1">메모 (어느 날에 대한 대체휴무인지 등)</label>
                                    <input
                                        type="text"
                                        value={memo}
                                        onChange={(e) => setMemo(e.target.value)}
                                        placeholder="예: 3/1 삼일절 근무 대체"
                                        className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                    />
                                </div>
                            )}

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider ml-1">신청 일자 (시작)</label>
                                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <select
                                                value={startViewYear}
                                                onChange={e => setStartViewYear(Number(e.target.value))}
                                                className="flex-1 text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none"
                                            >
                                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                                                    <option key={y} value={y}>{y}년</option>
                                                ))}
                                            </select>
                                            <select
                                                value={startViewMonthNum}
                                                onChange={e => setStartViewMonthNum(Number(e.target.value))}
                                                className="flex-1 text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none"
                                            >
                                                {Array.from({ length: 12 }, (_, i) => i).map(m => (
                                                    <option key={m} value={m}>{m + 1}월</option>
                                                ))}
                                            </select>
                                            <span className="text-xs font-black text-blue-600 whitespace-nowrap">{startDate ? format(new Date(startDate), 'dd일') : '--'}</span>
                                        </div>
                                        <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                                            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                                                <span key={d} className={`text-[9px] font-bold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-300'}`}>{d}</span>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7 gap-0.5">
                                            {Array.from({ length: new Date(startViewYear, startViewMonthNum, 1).getDay() }).map((_, i) => (
                                                <div key={i} className="h-8" />
                                            ))}
                                            {eachDayOfInterval({
                                                start: new Date(startViewYear, startViewMonthNum, 1),
                                                end: new Date(startViewYear, startViewMonthNum + 1, 0)
                                            }).map((day) => {
                                                const dayStr = format(day, 'yyyy-MM-dd');
                                                const isSelected = dayStr === startDate;
                                                const dayOfWeek = day.getDay();
                                                const isHoliday = !!getHolidayName(dayStr);
                                                const isDisabled = dayOfWeek === 0 || dayOfWeek === 6 || isHoliday;
                                                return (
                                                    <button
                                                        key={dayStr}
                                                        type="button"
                                                        disabled={isDisabled}
                                                        onClick={() => {
                                                            setStartDate(dayStr);
                                                            if (!(leaveType === '연차' && leaveSubtype === '기간')) setEndDate(dayStr);
                                                        }}
                                                        className={`h-8 text-xs font-bold rounded-lg transition-all ${isSelected
                                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200 scale-105'
                                                            : isDisabled
                                                                ? `opacity-30 cursor-not-allowed ${dayOfWeek === 0 || isHoliday ? 'text-red-500' : 'text-blue-500'}`
                                                                : `hover:bg-white text-slate-600`
                                                            }`}
                                                    >
                                                        {format(day, 'd')}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {leaveType === '연차' && leaveSubtype === '기간' && (
                                    <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                        <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider ml-1">종료 일자</label>
                                        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <select
                                                    value={endViewYear}
                                                    onChange={e => setEndViewYear(Number(e.target.value))}
                                                    className="flex-1 text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none"
                                                >
                                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                                                        <option key={y} value={y}>{y}년</option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={endViewMonthNum}
                                                    onChange={e => setEndViewMonthNum(Number(e.target.value))}
                                                    className="flex-1 text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none"
                                                >
                                                    {Array.from({ length: 12 }, (_, i) => i).map(m => (
                                                        <option key={m} value={m}>{m + 1}월</option>
                                                    ))}
                                                </select>
                                                <span className="text-xs font-black text-blue-600 whitespace-nowrap">{endDate ? format(new Date(endDate), 'dd일') : '--'}</span>
                                            </div>
                                            <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                                                {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                                                    <span key={d} className={`text-[9px] font-bold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-300'}`}>{d}</span>
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-7 gap-0.5">
                                                {Array.from({ length: new Date(endViewYear, endViewMonthNum, 1).getDay() }).map((_, i) => (
                                                    <div key={i} className="h-8" />
                                                ))}
                                                {eachDayOfInterval({
                                                    start: new Date(endViewYear, endViewMonthNum, 1),
                                                    end: new Date(endViewYear, endViewMonthNum + 1, 0)
                                                }).map((day) => {
                                                    const dayStr = format(day, 'yyyy-MM-dd');
                                                    const isSelected = dayStr === endDate;
                                                    const isStart = dayStr === startDate;
                                                    const dayOfWeek = day.getDay();
                                                    const isHoliday = !!getHolidayName(dayStr);
                                                    const isDisabled = dayOfWeek === 0 || dayOfWeek === 6 || isHoliday;
                                                    return (
                                                        <button
                                                            key={dayStr}
                                                            type="button"
                                                            disabled={isDisabled}
                                                            onClick={() => setEndDate(dayStr)}
                                                            className={`h-8 text-xs font-bold rounded-lg transition-all ${isSelected
                                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200 scale-105'
                                                                : isDisabled
                                                                    ? `opacity-30 cursor-not-allowed ${dayOfWeek === 0 || isHoliday ? 'text-red-500' : 'text-blue-500'}`
                                                                    : isStart
                                                                        ? 'bg-blue-100 text-blue-600'
                                                                        : `hover:bg-white text-slate-600`
                                                                }`}
                                                        >
                                                            {format(day, 'd')}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-all mt-4"
                            >
                                등록 완료
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {leaveToDelete !== null && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110]">
                    <div className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">휴무 삭제</h3>
                        <p className="text-sm text-slate-500 mb-8 font-bold">이 휴무 기록을 삭제하시겠습니까?</p>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setLeaveToDelete(null)}
                                className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-200 active:scale-95"
                            >
                                삭제하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
