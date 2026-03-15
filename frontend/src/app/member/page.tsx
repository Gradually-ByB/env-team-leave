'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon, ClipboardList, Users, LogOut, ChevronLeft, ChevronRight, PlusCircle, Clock, Trash2 } from 'lucide-react';
import { isKoreanHoliday } from '@/lib/koreanHolidays';

interface Leave {
    id: number;
    user_id: number;
    leave_type: string;
    leave_subtype: string;
    start_date: string;
    end_date: string;
    user_name?: string;
    memo?: string;
}

export default function MemberPage() {
    const { user, logout } = useAuth();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [myLeaves, setMyLeaves] = useState<Leave[]>([]);
    const [teamLeaves, setTeamLeaves] = useState<Leave[]>([]);
    const [monthLeaves, setMonthLeaves] = useState<Leave[]>([]);
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

    const fetchData = React.useCallback(async () => {
        try {
            const [myRes, teamRes, monthRes] = await Promise.all([
                api.get('/leaves/my'),
                api.get('/leaves/week'),
                api.get(`/leaves?month=${format(currentMonth, 'yyyy-MM')}`)
            ]);
            setMyLeaves(myRes.data);
            setTeamLeaves(teamRes.data);
            setMonthLeaves(monthRes.data);
        } catch (err) {
            console.error('Failed to fetch data', err);
        }
    }, [currentMonth]);


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
            fetchData();
        } catch {
            alert('휴무 등록에 실패했습니다.');
        }
    };

    const handleDelete = async () => {
        if (!leaveToDelete) return;
        try {
            await api.delete(`/leaves/${leaveToDelete}`);
            // Optimistically remove from UI state
            setMyLeaves(prev => prev.filter(l => l.id !== leaveToDelete));
            setTeamLeaves(prev => prev.filter(l => l.id !== leaveToDelete));
            setMonthLeaves(prev => prev.filter(l => l.id !== leaveToDelete));
            // Refetch to ensure consistency
            fetchData();
            setLeaveToDelete(null);
        } catch (err) {
            console.error('Delete failed', err);
            alert('삭제에 실패했습니다.');
        }
    };

    useEffect(() => {
        fetchData();

        // 10초마다 자동 새로고침 (Polling)
        const interval = setInterval(() => {
            fetchData();
        }, 10000);

        // 창이 다시 활성화될 때 즉시 새로고침
        const handleFocus = () => fetchData();
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }, [fetchData]);

    // Calendar Logic
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
        <div className="min-h-screen bg-transparent pb-24">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-20 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                        {user?.name[0]}
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800">{user?.name}님</h1>
                        <p className="text-xs text-slate-500">환경팀 {user?.role}</p>
                    </div>
                </div>
                <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <LogOut className="w-6 h-6" />
                </button>
            </header>

            <main className="p-4 space-y-6">
                {/* Calendar Section */}
                <section className="bg-white/90 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-white/20">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-blue-600" />
                            휴무 일정
                        </h2>
                        <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200">
                            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 bg-white text-slate-700 shadow-sm hover:text-blue-600 hover:shadow-md rounded-lg transition-all active:scale-95"><ChevronLeft className="w-5 h-5" /></button>
                            <span className="font-bold text-sm text-slate-700 min-w-[90px] text-center">{format(currentMonth, 'yyyy. MM')}</span>
                            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 bg-white text-slate-700 shadow-sm hover:text-blue-600 hover:shadow-md rounded-lg transition-all active:scale-95"><ChevronRight className="w-5 h-5" /></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                            <div key={d} className={`text-center text-[10px] font-bold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-800'}`}>
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {/* Padding for first day */}
                        {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                            <div key={`pad-${i}`} className="h-10" />
                        ))}
                        {calendarDays.map((day) => {
                            const dayStr = format(day, 'yyyy-MM-dd');
                            const userLeave = monthLeaves.find(l => {
                                const startStr = format(new Date(l.start_date), 'yyyy-MM-dd');
                                const endStr = format(new Date(l.end_date), 'yyyy-MM-dd');
                                const isWeekday = day.getDay() !== 0 && day.getDay() !== 6;
                                return isWeekday && dayStr >= startStr && dayStr <= endStr && l.user_id === user?.id;
                            });

                            const teamMembersOnLeave = monthLeaves.filter(l => {
                                const startStr = format(new Date(l.start_date), 'yyyy-MM-dd');
                                const endStr = format(new Date(l.end_date), 'yyyy-MM-dd');
                                const isWeekday = day.getDay() !== 0 && day.getDay() !== 6;
                                return isWeekday && dayStr >= startStr && dayStr <= endStr && l.user_id !== user?.id;
                            });

                            const getLeaveBgColor = (type?: string) => {
                                switch (type) {
                                    case '연차': return 'bg-blue-600 text-white shadow-blue-100';
                                    case '반차': return 'bg-green-300 text-white shadow-green-100';
                                    case '대체휴무': return 'bg-amber-300 text-white shadow-amber-100';
                                    default: return 'bg-slate-100';
                                }
                            };

                            const getDotColor = (type: string) => {
                                switch (type) {
                                    case '연차': return 'bg-blue-400';
                                    case '반차': return 'bg-green-300';
                                    case '대체휴무': return 'bg-amber-200';
                                    default: return 'bg-slate-300';
                                }
                            };

                            return (
                                <div
                                    key={dayStr}
                                    className={`relative h-10 flex flex-col items-center justify-center rounded-xl transition-all ${isToday(day) ? 'ring-1 ring-blue-400' : ''
                                        } ${userLeave ? `${getLeaveBgColor(userLeave.leave_type)} shadow-md` : 'hover:bg-slate-100'}`}
                                >
                                    <span className={`text-sm font-bold ${!userLeave && (day.getDay() === 0 || isKoreanHoliday(dayStr) ? 'text-red-500' : day.getDay() === 6 ? 'text-blue-500' : 'text-slate-700')}`}>
                                        {format(day, 'd')}
                                    </span>
                                    {teamMembersOnLeave.length > 0 && !userLeave && (
                                        <div className="flex gap-0.5 mt-0.5">
                                            {teamMembersOnLeave.slice(0, 3).map((l, i) => (
                                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${getDotColor(l.leave_type)}`} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* My Leaves */}
                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2 px-2">
                        <ClipboardList className="w-5 h-5 text-blue-600" />
                        일정 상세
                    </h2>
                    <div className="space-y-3">
                        {myLeaves.length > 0 ? myLeaves.slice(0, 10).map(leave => {
                            const todayStr = format(new Date(), 'yyyy-MM-dd');
                            const startStr = format(new Date(leave.start_date), 'yyyy-MM-dd');
                            const endStr = format(new Date(leave.end_date), 'yyyy-MM-dd');
                            const isToday = todayStr >= startStr && todayStr <= endStr;

                            const getLeaveColor = (type: string, isOngoing: boolean) => {
                                if (isOngoing) return 'bg-blue-600 text-white';
                                switch (type) {
                                    case '연차': return 'bg-blue-100 text-blue-700';
                                    case '반차': return 'bg-green-50 text-green-700';
                                    case '대체휴무': return 'bg-amber-50 text-amber-700';
                                    default: return 'bg-slate-100 text-slate-700';
                                }
                            };

                            return (
                                <div key={leave.id} className={`bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-xl flex items-center justify-between border-l-4 ${isToday ? 'border-blue-500 shadow-md' : 'border-white/20'}`}>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${getLeaveColor(leave.leave_type, isToday)}`}>
                                                {leave.leave_type}
                                            </span>
                                            <span className="text-sm font-bold text-slate-700">
                                                {leave.leave_subtype}
                                                {leave.leave_type === '대체휴무' && leave.memo && <span className="text-xs text-slate-500 font-normal ml-1">({leave.memo})</span>}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                            <Clock className="w-3 h-3" />
                                            {leave.leave_type === '연차' && leave.leave_subtype === '기간' ? (
                                                `${format(new Date(leave.start_date), 'MM.dd(eee)', { locale: ko })} ~ ${format(new Date(leave.end_date), 'MM.dd(eee)', { locale: ko })}`
                                            ) : (
                                                format(new Date(leave.start_date), 'MM.dd(eee)', { locale: ko })
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button type="button"
                                            onClick={() => setLeaveToDelete(leave.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="bg-white p-8 rounded-2xl text-center text-slate-400 text-sm italic">등록된 휴무가 없습니다.</div>
                        )}
                    </div>
                </section>

                {/* Team Leaves */}
                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2 px-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        팀원 휴무
                    </h2>
                    <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl shadow-2xl border border-white/20 space-y-4">
                        {(() => {
                            const today = new Date();
                            const weekStart = startOfWeek(today, { locale: ko });
                            const weekEnd = endOfWeek(today, { locale: ko });
                            const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

                            const getTeamLeaveColor = (type: string) => {
                                switch (type) {
                                    case '연차': return 'bg-blue-50 text-blue-600';
                                    case '반차': return 'bg-green-50 text-green-500';
                                    case '대체휴무': return 'bg-amber-50 text-amber-500';
                                    default: return 'bg-slate-50 text-slate-600';
                                }
                            };

                            const hasAnyWeekLeaves = weekDays.some(day => {
                                const dayStr = format(day, 'yyyy-MM-dd');
                                const isWeekday = day.getDay() !== 0 && day.getDay() !== 6;
                                if (!isWeekday) return false;
                                return teamLeaves.some(leave => {
                                    const start = format(new Date(leave.start_date), 'yyyy-MM-dd');
                                    const end = format(new Date(leave.end_date), 'yyyy-MM-dd');
                                    return dayStr >= start && dayStr <= end;
                                });
                            });

                            return (
                                <div className="space-y-4">
                                    {weekDays.map(day => {
                                        const dayStr = format(day, 'yyyy-MM-dd');
                                        const isWeekday = day.getDay() !== 0 && day.getDay() !== 6;
                                        const dayLeaves = isWeekday ? teamLeaves.filter(leave => {
                                            const start = format(new Date(leave.start_date), 'yyyy-MM-dd');
                                            const end = format(new Date(leave.end_date), 'yyyy-MM-dd');
                                            return dayStr >= start && dayStr <= end;
                                        }) : [];

                                        // 주말이고 휴무자가 없으면 숨김
                                        if (dayLeaves.length === 0 && (day.getDay() === 0 || day.getDay() === 6)) return null;

                                        return (
                                            <div key={dayStr} className={`flex items-start gap-3 ${isToday(day) ? 'bg-blue-50/50 -mx-2 px-2 py-2 rounded-xl' : ''}`}>
                                                <div className="flex flex-col items-center min-w-[45px] pt-0.5">
                                                    <span className={`text-[10px] font-bold ${day.getDay() === 0 ? 'text-red-500' : day.getDay() === 6 ? 'text-blue-500' : 'text-slate-600'}`}>
                                                        {format(day, 'eee', { locale: ko })}
                                                    </span>
                                                    <span className={`text-sm font-black ${isToday(day) ? 'text-blue-600' : 'text-slate-700'}`}>
                                                        {format(day, 'dd')}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {dayLeaves.length > 0 ? dayLeaves.map(leave => (
                                                        <div key={`${dayStr}-${leave.id}`} className="flex items-center gap-1.5">
                                                            <span className="text-sm font-bold text-slate-800">{leave.user_name}</span>
                                                            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${getTeamLeaveColor(leave.leave_type)}`}>
                                                                {leave.leave_type}
                                                            </span>
                                                            {leave.leave_type === '대체휴무' && leave.memo && (
                                                                <span className="text-[10px] text-slate-400 font-medium ml-[-4px]">({leave.memo})</span>
                                                            )}
                                                        </div>
                                                    )) : (
                                                        <span className="text-xs text-slate-300 italic py-1">휴무 없음</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {!hasAnyWeekLeaves && (
                                        <div className="w-full text-center py-2 text-slate-400 text-sm italic">이번 주 팀원 휴무가 없습니다.</div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </section>
            </main>

            {/* Floating Action Button */}
            <button
                onClick={() => setShowForm(true)}
                className="fixed bottom-6 right-6 h-14 w-auto px-5 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-20"
            >
                <PlusCircle className="w-8 h-8" />
                <span className="font-bold ml-1">등록</span>
            </button>

            {/* Registration Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
                    <div className="w-full max-w-lg bg-white rounded-t-[40px] sm:rounded-3xl p-8 animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold text-slate-800">휴무 등록</h2>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1">닫기</button>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">휴무 구분</label>
                                    <select
                                        value={leaveType}
                                        onChange={(e) => setLeaveType(e.target.value)}
                                        className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="연차">연차</option>
                                        <option value="반차">반차</option>
                                        <option value="대체휴무">대체휴무</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">상세 구분</label>
                                    <select
                                        value={leaveSubtype}
                                        onChange={(e) => setLeaveSubtype(e.target.value)}
                                        className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500"
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
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">메모 (어느 날에 대한 대체휴무인지 등)</label>
                                    <input
                                        type="text"
                                        value={memo}
                                        onChange={(e) => setMemo(e.target.value)}
                                        placeholder="예: 3/1 삼일절 근무 대체"
                                        className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}

                            {/* Custom Date Picker Integration */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider ml-1">신청 일자 (시작)</label>
                                    <div className="bg-slate-50 rounded-2xl p-3 border-2 border-slate-100">
                                        {/* Year / Month selectors */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <select
                                                value={startViewYear}
                                                onChange={e => setStartViewYear(Number(e.target.value))}
                                                className="flex-1 text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-blue-400"
                                            >
                                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                                                    <option key={y} value={y}>{y}년</option>
                                                ))}
                                            </select>
                                            <select
                                                value={startViewMonthNum}
                                                onChange={e => setStartViewMonthNum(Number(e.target.value))}
                                                className="flex-1 text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-blue-400"
                                            >
                                                {Array.from({ length: 12 }, (_, i) => i).map(m => (
                                                    <option key={m} value={m}>{m + 1}월</option>
                                                ))}
                                            </select>
                                            <span className="text-xs font-black text-blue-600 whitespace-nowrap">{startDate ? format(new Date(startDate), 'dd일') : '--'}</span>
                                        </div>
                                        {/* Day grid */}
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
                                                const isHoliday = isKoreanHoliday(dayStr);
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
                                        <label className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider ml-1">종료 일자</label>
                                        <div className="bg-slate-50 rounded-2xl p-3 border-2 border-slate-100 text-slate-800">
                                            {/* Year / Month selectors */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <select
                                                    value={endViewYear}
                                                    onChange={e => setEndViewYear(Number(e.target.value))}
                                                    className="flex-1 text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-blue-400"
                                                >
                                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                                                        <option key={y} value={y}>{y}년</option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={endViewMonthNum}
                                                    onChange={e => setEndViewMonthNum(Number(e.target.value))}
                                                    className="flex-1 text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-blue-400"
                                                >
                                                    {Array.from({ length: 12 }, (_, i) => i).map(m => (
                                                        <option key={m} value={m}>{m + 1}월</option>
                                                    ))}
                                                </select>
                                                <span className="text-xs font-black text-blue-600 whitespace-nowrap">{endDate ? format(new Date(endDate), 'dd일') : '--'}</span>
                                            </div>
                                            {/* Day grid */}
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
                                                    const isHoliday = isKoreanHoliday(dayStr);
                                                    const isDisabled = dayOfWeek === 0 || dayOfWeek === 6 || isHoliday;
                                                    return (
                                                        <button
                                                            key={dayStr}
                                                            type="button"
                                                            disabled={isDisabled}
                                                            onClick={() => setEndDate(dayStr)}
                                                            className={`h-8 text-xs font-bold rounded-lg transition-all ${isSelected
                                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200 scale-105 font-black'
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
                                className="w-full h-14 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-all mt-4"
                            >
                                신청하기
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {leaveToDelete !== null && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl transition-all animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-black text-slate-800 mb-2">휴무 기록 삭제</h3>
                        <p className="text-sm text-slate-500 mb-6 font-medium">삭제 할까요?</p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setLeaveToDelete(null)}
                                className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="flex-1 py-3.5 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-200 active:scale-95"
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
