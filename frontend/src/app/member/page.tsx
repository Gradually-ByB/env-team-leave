'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isWeekend } from 'date-fns';
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
}

const leaveBgColors: Record<string, string> = {
    '연차': 'bg-blue-600 text-white shadow-blue-100',
    '반차': 'bg-green-300 text-white shadow-green-100',
    '대체휴무': 'bg-amber-300 text-white shadow-amber-100',
    '공휴일': 'bg-red-200 text-red-700 shadow-red-100'
};

const dotColors: Record<string, string> = {
    '연차': 'bg-blue-400',
    '반차': 'bg-green-300',
    '대체휴무': 'bg-amber-200',
    '공휴일': 'bg-red-400'
};

const getLeaveBgColor = (type?: string) => leaveBgColors[type || ''] || 'bg-slate-100';
const getDotColor = (type: string) => dotColors[type] || 'bg-slate-300';


export default function MemberPage() {
    const { user, logout, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [myLeaves, setMyLeaves] = useState<Leave[]>([]);
    const [teamLeaves, setTeamLeaves] = useState<Leave[]>([]);
    const [monthLeaves, setMonthLeaves] = useState<Leave[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [leaveToDelete, setLeaveToDelete] = useState<number | null>(null);
    const [selectedDateLeaves, setSelectedDateLeaves] = useState<{ date: string, leaves: Leave[] } | null>(null);

    // Form State
    const [leaveType, setLeaveType] = useState('연차');
    const [leaveSubtype, setLeaveSubtype] = useState('종일');
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Independent view month/year for date pickers
    const [startViewYear, setStartViewYear] = useState(new Date().getFullYear());
    const [startViewMonthNum, setStartViewMonthNum] = useState(new Date().getMonth());

    const resetForm = React.useCallback(() => {
        setLeaveType('연차');
        setLeaveSubtype('종일');
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');
        setStartDate(todayStr);
        setEndDate(todayStr);
        setStartViewYear(now.getFullYear());
        setStartViewMonthNum(now.getMonth());
    }, []);

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

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData();
    }, [fetchData]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!startDate) {
            alert('시작일을 선택해주세요.');
            return;
        }

        if (leaveType === '연차' && leaveSubtype === '기간' && !endDate) {
            alert('종료일을 선택해주세요.');
            return;
        }

        // 주말 체크
        const start = new Date(startDate);
        const end = new Date(endDate || startDate);

        if (isWeekend(start) || isWeekend(end)) {
            alert('토요일과 일요일은 휴무를 등록할 수 없습니다.');
            return;
        }

        try {
            await api.post('/leaves', {
                leave_type: leaveType,
                leave_subtype: leaveSubtype,
                start_date: startDate,
                end_date: endDate || startDate,
            });
            resetForm();
            setShowForm(false);
            fetchData();
        } catch {
            alert('휴무 등록에 실패했습니다.');
        }
    };

    const handleFormDateClick = (dayStr: string) => {
        const isRangeMode = leaveType === '연차' && leaveSubtype === '기간';
        if (isRangeMode) {
            if (!startDate || (startDate && endDate)) {
                setStartDate(dayStr);
                setEndDate('');
            } else {
                if (dayStr < startDate) {
                    setStartDate(dayStr);
                    setEndDate('');
                } else {
                    setEndDate(dayStr);
                }
            }
        } else {
            setStartDate(dayStr);
            setEndDate(dayStr);
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
                <section className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-white/20">
                    <div className="flex items-center justify-between mb-6">
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
                            <div key={d} className={`text-center text-xs font-bold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-400'}`}>{d}</div>
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

                            return (
                                <button
                                    key={dayStr}
                                    type="button"
                                    onClick={() => {
                                        if (teamMembersOnLeave.length > 0) {
                                            setSelectedDateLeaves({ date: dayStr, leaves: teamMembersOnLeave });
                                        }
                                    }}
                                    className={`relative h-12 w-full flex flex-col items-center justify-center rounded-xl transition-all ${isToday(day) ? 'ring-1 ring-blue-400' : ''
                                        } ${userLeave ? `${getLeaveBgColor(userLeave.leave_type)} shadow-md` : 'hover:bg-slate-100'} ${(teamMembersOnLeave.length > 0) ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                                >
                                    <span className={`text-sm font-bold ${!userLeave && (day.getDay() === 0 || isKoreanHoliday(dayStr) ? 'text-red-500' : day.getDay() === 6 ? 'text-blue-500' : 'text-slate-700')}`}>
                                        {format(day, 'd')}
                                    </span>
                                    {teamMembersOnLeave.length > 0 && (
                                        <div className="flex gap-0.5 mt-0.5">
                                            {teamMembersOnLeave.slice(0, 3).map((l, i) => (
                                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${userLeave ? 'bg-white/90' : getDotColor(l.leave_type)}`} />
                                            ))}
                                            {teamMembersOnLeave.length > 3 && (
                                                <div className={`w-1.5 h-1.5 rounded-full ${userLeave ? 'bg-white/90' : 'bg-slate-400'}`} />
                                            )}
                                        </div>
                                    )}
                                </button>
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
                                    case '공휴일': return 'bg-red-50 text-red-600';
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
                                            <span className="text-sm font-bold text-slate-700">{leave.user_name || user?.name}</span>
                                            <span className="text-xs font-medium text-slate-400">{leave.leave_subtype}</span>
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
                                            className="p-2 text-slate-900 hover:text-red-500 transition-colors">
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
                                    case '공휴일': return 'bg-red-50 text-red-500';
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
                                            <div key={dayStr} className={`flex items-start gap-3 border-b border-dotted border-slate-400 pb-4 last:border-0 ${isToday(day) ? 'bg-blue-50/50 -mx-2 px-2 py-4 rounded-xl' : ''}`}>
                                                <div className="flex flex-col items-center min-w-[45px] pt-0.5">
                                                    <span className={`text-[10px] font-bold ${day.getDay() === 0 || isKoreanHoliday(dayStr) ? 'text-red-700 transition-colors' : day.getDay() === 6 ? 'text-blue-700 transition-colors' : 'text-slate-800'}`}>
                                                        {format(day, 'eee', { locale: ko })}
                                                    </span>
                                                    <span className={`text-base font-semibold leading-none mt-0.5 ${isToday(day) ? 'text-blue-600' : 'text-slate-900'}`}>
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
                onClick={() => {
                    resetForm();
                    setShowForm(true);
                }}
                className="fixed bottom-6 right-6 h-14 w-auto px-5 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-20"
            >
                <PlusCircle className="w-8 h-8" />
                <span className="font-bold ml-1">등록</span>
            </button>

            {/* Registration Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
                    <div className="w-full max-w-lg bg-white rounded-t-[40px] sm:rounded-3xl p-6 animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-center mb-5">
                            <div>
                                <h2 className="text-xl font-black text-slate-800">휴무 등록</h2>
                                <p className="text-xs font-bold text-blue-600 mt-1">{user?.name}님으로 신청됩니다.</p>
                            </div>
                            <button onClick={() => {
                                setShowForm(false);
                                resetForm();
                            }} className="text-slate-400 hover:text-slate-600 font-bold p-1">닫기</button>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-900 mb-2 uppercase tracking-wider ml-1">휴무 구분</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['연차', '반차', '대체휴무', '공휴일'].map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => {
                                                    setLeaveType(type);
                                                    if (type === '연차') setLeaveSubtype('종일');
                                                    else if (type === '반차') setLeaveSubtype('오전');
                                                    else if (type === '대체휴무') setLeaveSubtype('');
                                                    else setLeaveSubtype('일반');

                                                    const todayStr = format(new Date(), 'yyyy-MM-dd');
                                                    setStartDate(todayStr);
                                                    setEndDate(todayStr);
                                                }}
                                                className={`py-1.5 rounded-lg text-xs font-black transition-all border-2 ${leaveType === type
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100'
                                                    : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200'
                                                    }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-900 mb-2 uppercase tracking-wider ml-1">상세 구분</label>
                                    <div className={leaveType === '대체휴무' ? '' : "grid grid-cols-2 gap-2"}>
                                        {leaveType === '대체휴무' ? (
                                            <input
                                                type="text"
                                                value={leaveSubtype}
                                                onChange={(e) => setLeaveSubtype(e.target.value)}
                                                placeholder="메모를 입력하세요 (예: 3/1 대체)"
                                                className="w-full h-9 px-3 bg-white border-2 border-slate-100 rounded-lg text-xs font-black focus:outline-none focus:border-blue-400 placeholder:text-slate-300 transition-all font-black text-slate-700"
                                            />
                                        ) : (
                                            (leaveType === '연차' ? ['종일', '기간'] :
                                                leaveType === '반차' ? ['오전', '오후'] : ['일반']).map((subtype) => (
                                                    <button
                                                        key={subtype}
                                                        type="button"
                                                        onClick={() => {
                                                            setLeaveSubtype(subtype);
                                                            if (subtype === '기간') {
                                                                setStartDate('');
                                                                setEndDate('');
                                                            } else if (!startDate || !endDate) {
                                                                const todayStr = format(new Date(), 'yyyy-MM-dd');
                                                                setStartDate(todayStr);
                                                                setEndDate(todayStr);
                                                            }
                                                        }}
                                                        className={`py-1.5 rounded-lg text-xs font-black transition-all border-2 ${leaveSubtype === subtype
                                                            ? 'bg-blue-50 border-blue-600 text-blue-600'
                                                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                                                            }`}
                                                    >
                                                        {subtype}
                                                    </button>
                                                ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Custom Date Picker Integration */}
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex flex-col items-center mb-6 py-4 px-6 bg-lime-50 rounded-2xl border border-lime-100 shadow-sm">
                                            <p className="text-sm font-black text-lime-700 mb-2">
                                                {leaveType === '연차' && leaveSubtype === '기간'
                                                    ? (!startDate ? '시작일을 선택하세요' : !endDate ? '종료일을 선택하세요' : '기간이 선택되었습니다')
                                                    : '선택된 날짜'}
                                            </p>
                                            <div className="text-2xl font-black text-slate-800 flex items-center justify-center gap-3">
                                                <span className={!startDate ? 'text-slate-200' : ''}>{startDate ? format(new Date(startDate), 'MM.dd') : '00.00'}</span>
                                                {leaveType === '연차' && leaveSubtype === '기간' && (
                                                    <>
                                                        <span className="text-slate-300 text-lg font-medium">~</span>
                                                        <span className={!endDate ? 'text-slate-200' : ''}>{endDate ? format(new Date(endDate), 'MM.dd') : '00.00'}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 rounded-2xl p-3 border-2 border-slate-100">
                                            <div className="flex items-center gap-2 mb-3">
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
                                            </div>

                                            <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                                                {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                                                    <span key={d} className={`text-[10px] font-black ${i === 0 ? 'text-red-700' : i === 6 ? 'text-blue-700' : 'text-slate-700'}`}>{d}</span>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-7 gap-0.5">
                                                {Array.from({ length: new Date(startViewYear, startViewMonthNum, 1).getDay() }).map((_, i) => (
                                                    <div key={i} className="h-9" />
                                                ))}
                                                {eachDayOfInterval({
                                                    start: new Date(startViewYear, startViewMonthNum, 1),
                                                    end: new Date(startViewYear, startViewMonthNum + 1, 0)
                                                }).map((day) => {
                                                    const dayStr = format(day, 'yyyy-MM-dd');
                                                    const isStart = startDate && dayStr === startDate;
                                                    const isEnd = endDate && dayStr === endDate;
                                                    const isRange = leaveType === '연차' && leaveSubtype === '기간' && startDate && endDate && dayStr > startDate && dayStr < endDate;
                                                    const dayOfWeek = day.getDay();
                                                    const isHoliday = isKoreanHoliday(dayStr);
                                                    const isDisabled = dayOfWeek === 0 || dayOfWeek === 6;

                                                    return (
                                                        <button
                                                            key={dayStr}
                                                            type="button"
                                                            disabled={isDisabled}
                                                            onClick={() => handleFormDateClick(dayStr)}
                                                            className={`h-9 text-xs font-black transition-all relative ${isStart || isEnd
                                                                ? 'bg-blue-600 text-white z-10 rounded-lg shadow-md shadow-blue-200'
                                                                : isRange
                                                                    ? 'bg-blue-50 text-blue-600'
                                                                    : isDisabled
                                                                        ? `opacity-30 cursor-not-allowed ${dayOfWeek === 0 || isHoliday ? 'text-red-500' : 'text-blue-500'}`
                                                                        : `hover:bg-white rounded-lg ${isHoliday ? 'text-red-500' : 'text-slate-600'}`
                                                                }`}
                                                        >
                                                            {format(day, 'd')}
                                                            {isToday(day) && !isStart && !isEnd && (
                                                                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
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

            {/* Team Leaves Popup Modal */}
            {selectedDateLeaves && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={(e) => {
                    if (e.target === e.currentTarget) setSelectedDateLeaves(null);
                }}>
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl transition-all animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-black text-slate-800">
                                {format(new Date(selectedDateLeaves.date), 'M월 d일')} 휴무자
                            </h3>
                            <button onClick={() => setSelectedDateLeaves(null)} className="text-slate-400 hover:text-slate-600 font-bold p-1">닫기</button>
                        </div>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                            {selectedDateLeaves.leaves.map(leave => (
                                <div key={leave.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-base font-bold text-slate-800">{leave.user_name}</span>
                                    </div>
                                    <span className={`text-[10px] font-extrabold px-2 py-1 rounded-md ${getLeaveBgColor(leave.leave_type)}`}>
                                        {leave.leave_type} {leave.leave_subtype !== '종일' && leave.leave_subtype !== '기간' && leave.leave_subtype !== '일반' ? `(${leave.leave_subtype})` : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
