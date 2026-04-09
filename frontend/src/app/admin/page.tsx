'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isToday, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { LogOut, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Info, PlusCircle, Trash2, ClipboardList, Users, Clock, UserPlus, Edit2, Save, X, UserCog } from 'lucide-react';
import { getHolidayName } from '@/lib/koreanHolidays';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface User {
    id: number;
    name: string;
    role: string;
    job_role: string;
}

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
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [targetUserId, setTargetUserId] = useState<number | string>('');

    const [isMobile, setIsMobile] = useState(false);
    const [mounted, setMounted] = useState(false);

    // User Management State
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userForm, setUserForm] = useState({
        name: '',
        role: 'member',
        job_role: '',
        password: ''
    });
    const [activeUserTab, setActiveUserTab] = useState<'list' | 'form'>('list');

    // Optimized: Pre-calculate leaves for each day to avoid repeated filtering
    const leavesByDate = React.useMemo(() => {
        const map = new Map<string, Leave[]>();
        leaves.forEach(l => {
            try {
                const start = new Date(l.start_date);
                const end = new Date(l.end_date);
                const days = eachDayOfInterval({ start, end });
                days.forEach(day => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    if (!map.has(dayStr)) map.set(dayStr, []);
                    map.get(dayStr)?.push(l);
                });
            } catch (e) {
                console.error('Invalid date in leave record', l, e);
            }
        });
        return map;
    }, [leaves]);

    const getDayLeaves = React.useCallback((day: Date) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        return leavesByDate.get(dayStr) || [];
    }, [leavesByDate]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (!loading && mounted && (!user || user.role !== 'admin')) {
            router.push('/');
        }
    }, [user, loading, router, mounted]);

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
    const fetchTeamMembers = React.useCallback(async () => {
        try {
            const response = await api.get('/users');
            setTeamMembers(response.data);
            // Default to current user if not set
            if (user) setTargetUserId(user.id);
        } catch (err) {
            console.error('Failed to fetch team members', err);
        }
    }, [user]);

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
        } catch (err) {
            console.error('Failed to fetch leaves', err);
        }
    }, [user, currentMonth]);

    const handleUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await api.put(`/users/${editingUser.id}`, userForm);
            } else {
                await api.post('/users', userForm);
            }
            setShowUserModal(false);
            setEditingUser(null);
            setUserForm({ name: '', role: 'member', job_role: '', password: '' });
            fetchTeamMembers();
            fetchLeaves();
        } catch (err) {
            console.error('User action failed', err);
            alert('작업에 실패했습니다.');
        }
    };

    const handleEditUser = (u: User) => {
        setEditingUser(u);
        setUserForm({
            name: u.name,
            role: u.role,
            job_role: u.job_role,
            password: '' // Don't show password
        });
        if (isMobile) setActiveUserTab('form');
    };

    const handleDeleteUser = async (id: number) => {
        if (!confirm('정말 이 팀원을 삭제하시겠습니까? 관련 휴무 데이터가 로직에 따라 영향을 받을 수 있습니다.')) return;
        try {
            await api.delete(`/users/${id}`);
            fetchTeamMembers();
        } catch (err) {
            console.error('Delete user failed', err);
            alert('삭제에 실패했습니다.');
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/leaves', {
                leave_type: leaveType,
                leave_subtype: leaveSubtype,
                start_date: startDate,
                end_date: endDate,
                memo: leaveType === '대체휴무' ? memo : undefined,
                target_user_id: targetUserId ? Number(targetUserId) : undefined,
            });
            setShowForm(false);
            setMemo('');
            if (user) setTargetUserId(user.id);
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
        fetchTeamMembers();

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
    }, [fetchLeaves, fetchTeamMembers]);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const getLeaveColorClass = (type: string) => {
        switch (type) {
            case '연차': return 'bg-blue-100 text-blue-700';
            case '반차': return 'bg-green-100 text-green-700';
            case '대체휴무': return 'bg-amber-100 text-amber-700';
            case '공휴일': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    if (!mounted || loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-transparent flex flex-col">
            {/* Header */}
            <header className={`${isMobile ? 'px-6 py-4' : 'px-8 py-4'} bg-white/80 backdrop-blur-md flex items-center justify-between shadow-sm sticky top-0 z-20 border-b border-white/20`}>
                <div className="flex items-center gap-4">
                    <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} flex items-center justify-center shrink-0 drop-shadow-md`}>
                        <Image src="/logo.png" alt="환경팀 로고" width={isMobile ? 40 : 48} height={isMobile ? 40 : 48} className="object-contain" priority />
                    </div>
                    <div>
                        <h1 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-slate-800`}>환경팀 휴무{!isMobile && ' 일정'}</h1>
                        <p className={`${isMobile ? 'text-[10px]' : 'text-sm'} text-slate-500 font-medium`}>{isMobile ? `관리자: ${user?.name}` : '관리자 전용'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {!isMobile && (
                        <div className="flex items-center gap-3 py-1 px-4 bg-slate-50/50 rounded-xl border border-slate-100">
                            <div className="text-right">
                                <p className="text-[10px] font-medium text-slate-400 leading-tight">접속 중인 관리자</p>
                                <p className="text-xs font-bold text-slate-800">{user?.name}</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => setShowUserModal(true)}
                        className={`flex items-center gap-2 ${isMobile ? 'p-2.5' : 'py-2 px-4'} bg-blue-50 text-blue-600 rounded-xl border border-blue-100 font-bold hover:bg-blue-100 transition-all active:scale-95`}
                        title="팀원 관리"
                    >
                        <UserCog className={isMobile ? "w-5 h-5" : "w-4 h-4"} />
                        {!isMobile && "팀원 관리"}
                    </button>
                    <button
                        onClick={logout}
                        className={`${isMobile ? 'p-2' : 'p-3'} text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95 border border-transparent hover:border-red-100`}
                        title="로그아웃"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {isMobile ? (
                /* Mobile Layout */
                <main className="flex-1 p-4 pb-24 space-y-6 bg-transparent">
                    {/* Month Selector & Calendar Card */}
                    <section className="bg-white/90 backdrop-blur-xl rounded-[32px] p-6 shadow-2xl border border-white/40 overflow-hidden relative group">
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Calendar View</p>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                    <span className="text-slate-400 font-medium">{format(currentMonth, 'yyyy년')}</span>
                                    {format(currentMonth, 'M월')}
                                </h2>
                            </div>
                            <div className="flex gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-9 h-9 flex items-center justify-center bg-white text-slate-700 shadow-sm rounded-xl active:scale-90 transition-all"><ChevronLeft className="w-5 h-5" /></button>
                                <button onClick={() => setCurrentMonth(new Date())} className="px-3 text-xs font-black text-slate-600 hover:text-blue-600 transition-all">오늘</button>
                                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-9 h-9 flex items-center justify-center bg-white text-slate-700 shadow-sm rounded-xl active:scale-90 transition-all"><ChevronRight className="w-5 h-5" /></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-1 relative z-10 mb-2">
                            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                                <div key={d} className={`py-2 text-center text-[11px] font-black uppercase tracking-wider ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-300'}`}>
                                    {d}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1 relative z-10">
                            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                                <div key={`pad-${i}`} className="h-14 opacity-20" />
                            ))}

                            {calendarDays.map((day) => {
                                const dayStr = format(day, 'yyyy-MM-dd');
                                const dayLeaves = getDayLeaves(day);
                                const isSelected = selectedDay && isSameDay(day, selectedDay);
                                const holidayName = getHolidayName(dayStr);
                                const isTodayDay = isToday(day);

                                return (
                                    <div
                                        key={dayStr}
                                        onClick={() => setSelectedDay(day)}
                                        className={`h-16 flex flex-col items-center justify-center rounded-2xl transition-all relative overflow-hidden ${isSelected
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 ring-2 ring-blue-400/50 scale-105 z-10'
                                            : isTodayDay
                                                ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                                : 'bg-white/50 hover:bg-white text-slate-800 border border-slate-100/50 shadow-sm'}`}
                                    >
                                        <span className={`text-sm font-black z-10 ${isSelected ? 'text-white' : isTodayDay ? 'text-blue-600' : day.getDay() === 0 || holidayName ? 'text-red-500' : day.getDay() === 6 ? 'text-blue-500' : 'text-slate-800'}`}>
                                            {format(day, 'd')}
                                        </span>
                                        {dayLeaves.length > 0 && (
                                            <div className="flex gap-1 mt-1 z-10">
                                                {dayLeaves.slice(0, 3).map((l, i) => (
                                                    <div key={i} className={`w-1.5 h-1.5 rounded-full shadow-sm ${isSelected ? 'bg-white/80' :
                                                        l.leave_type === '연차' ? 'bg-blue-400' :
                                                            l.leave_type === '반차' ? 'bg-emerald-400' :
                                                                l.leave_type === '대체휴무' ? 'bg-amber-400' : 'bg-slate-300'
                                                        }`} />
                                                ))}
                                            </div>
                                        )}

                                        {holidayName && !isSelected && (
                                            <div className="absolute top-1 right-1 w-1 h-1 bg-red-400 rounded-full" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Background Decoration */}
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                    </section>

                    {/* Details Card */}
                    <section className="bg-white/90 backdrop-blur-xl rounded-[32px] p-6 shadow-2xl border border-white/40 min-h-[350px]">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                                    <ClipboardList className="w-5 h-5 text-slate-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none">
                                        {selectedDay ? format(selectedDay, 'M월 d일 (EEE)', { locale: ko }) : '선택 날짜'}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Schedule Details</p>
                                </div>
                            </div>
                            {selectedDay && getDayLeaves(selectedDay).length > 0 && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-100">
                                    <Users className="w-3.5 h-3.5 text-blue-600" />
                                    <span className="text-[10px] font-black text-blue-600">
                                        {getDayLeaves(selectedDay).length}명 휴무
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            {selectedDay && getDayLeaves(selectedDay).length > 0 ? (
                                getDayLeaves(selectedDay).map((l, i) => (
                                    <div key={i} className="flex flex-col gap-3 p-5 bg-white rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                        <div className="flex items-center justify-between relative z-10">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base shadow-sm ${l.leave_type === '공휴일' ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-600'}`}>
                                                    {l.user_name[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[15px] font-black text-slate-800 truncate">{l.user_name}</p>
                                                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-md ${getLeaveColorClass(l.leave_type)} border border-current opacity-30`}>
                                                            {l.leave_type}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{l.user_job_role}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setLeaveToDelete(l.id)}
                                                className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-slate-50 relative z-10">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                </div>
                                                <span className="text-xs font-black text-slate-700">{l.leave_subtype}</span>
                                            </div>
                                            {l.leave_subtype === '기간' && (
                                                <div className="px-3 py-1 bg-blue-50 rounded-lg border border-blue-100/50">
                                                    <p className="text-[10px] font-black text-blue-600">
                                                        {format(new Date(l.start_date), 'MM.dd')} - {format(new Date(l.end_date), 'MM.dd')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {l.leave_type === '대체휴무' && l.memo && (
                                            <div className="mt-1 p-3 bg-amber-50/50 rounded-xl border border-amber-100/50 relative z-10">
                                                <p className="text-[11px] text-amber-700 font-bold italic leading-relaxed">
                                                    &quot;{l.memo}&quot;
                                                </p>
                                            </div>
                                        )}

                                        {/* Card Accent */}
                                        <div className={`absolute right-0 top-0 bottom-0 w-1 ${l.leave_type === '연차' ? 'bg-blue-400' : l.leave_type === '반차' ? 'bg-emerald-400' : l.leave_type === '대체휴무' ? 'bg-amber-400' : 'bg-slate-200'}`} />
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 flex flex-col items-center justify-center opacity-40">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                        <Users className="w-10 h-10 text-slate-200" />
                                    </div>
                                    <p className="text-sm font-black text-slate-400 text-center">
                                        등록된 휴무가 없습니다.<br />
                                        <span className="text-[10px] font-medium">새로운 휴무를 등록해보세요!</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>
                </main>
            ) : (
                /* Desktop Layout */
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
                                                        <div key={i} className={`px-2 py-0.5 border rounded-lg text-[10px] font-bold transition-transform hover:scale-[1.02] ${getCalendarColor(l.leave_type)} flex items-center justify-between gap-1 overflow-hidden`} title={l.leave_type === '대체휴무' ? l.memo : l.leave_subtype}>
                                                            <span className="truncate">{l.user_name}</span>
                                                            {l.leave_type === '대체휴무' && l.memo && (
                                                                <span className="text-[8px] opacity-80 shrink-0 bg-blue-600/10 px-1 rounded-sm">MEMO</span>
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
                            {(() => {
                                const baseDate = selectedDay || new Date();
                                const isBaseToday = isToday(baseDate);
                                const isBaseWeekend = baseDate.getDay() === 0 || baseDate.getDay() === 6;

                                const nextDay = baseDate.getDay() === 5 ? addDays(baseDate, 3) : addDays(baseDate, 1);
                                const isNextWeekend = nextDay.getDay() === 0 || nextDay.getDay() === 6;

                                const todaysDisplayLeaves = isBaseWeekend ? [] : getDayLeaves(baseDate);
                                const nextDisplayLeaves = isNextWeekend ? [] : getDayLeaves(nextDay);

                                return (
                                    <>
                                        {/* Today Section */}
                                        {!isBaseWeekend && (
                                            <div className="flex-1 flex flex-col min-h-0">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="flex flex-col gap-1">
                                                        <h3 className="text-xl font-black text-slate-800">
                                                            {isBaseToday ? '오늘의 휴무자' : '선택한 날의 휴무자'}
                                                        </h3>
                                                    </div>
                                                    <div className="px-3 py-1.5 bg-blue-50 rounded-xl flex items-center gap-2 border border-blue-100">
                                                        <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
                                                        <span className="text-[11px] font-bold text-blue-700 leading-none pb-0.5">
                                                            {format(baseDate, 'MM.dd(EEE)', { locale: ko })}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-3">
                                                    {todaysDisplayLeaves.length > 0 ? todaysDisplayLeaves.map((l, i) => (
                                                        <div key={i} className="group relative flex flex-col gap-1.5 p-2.5 bg-white hover:bg-blue-50/30 rounded-2xl transition-all border border-slate-100 hover:border-blue-100 shadow-sm">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div>
                                                                        <p className="text-sm font-bold text-slate-800">{l.user_name}</p>
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{l.user_job_role}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`inline-block px-2 py-0.5 text-[9px] font-black rounded-md ${getLeaveColorClass(l.leave_type)}`}>
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
                                                                        {l.leave_type === '대체휴무' && l.memo && (
                                                                            <span className="block mt-0.5 text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 italic">
                                                                                &quot;{l.memo}&quot;
                                                                            </span>
                                                                        )}
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
                                                            <p className="text-xs text-slate-400 font-medium">휴무자가 없습니다.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Divider */}
                                        {!isBaseWeekend && !isNextWeekend && (
                                            <div className="h-px bg-slate-100 my-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)]" />
                                        )}

                                        {/* Tomorrow Section */}
                                        {!isNextWeekend && (
                                            <div className="flex-1 flex flex-col min-h-0">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="flex flex-col gap-1">
                                                        <h3 className="text-xl font-black text-slate-800">
                                                            {baseDate.getDay() === 5 ? '월요일의 휴무자' : '다음날의 휴무자'}
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
                                                    {nextDisplayLeaves.length > 0 ? nextDisplayLeaves.map((l, i) => (
                                                        <div key={i} className="group relative flex flex-col gap-1.5 p-2.5 bg-white hover:bg-slate-50/80 rounded-2xl transition-all border border-slate-100 hover:border-slate-200 shadow-sm">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div>
                                                                        <p className="text-sm font-bold text-slate-800">{l.user_name}</p>
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{l.user_job_role}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`inline-block px-2 py-0.5 text-[9px] font-black rounded-md ${getLeaveColorClass(l.leave_type)}`}>
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
                                                                        {l.leave_type === '대체휴무' && l.memo && (
                                                                            <span className="block mt-0.5 text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 italic">
                                                                                &quot;{l.memo}&quot;
                                                                            </span>
                                                                        )}
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
                                                            <p className="text-xs text-slate-400 font-medium">휴무자가 없습니다.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </aside>
                </main>
            )}

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
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-0 md:p-4 transition-all duration-300">
                    <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-xl bg-white md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-full md:slide-in-from-bottom-10 md:zoom-in-95 duration-500">
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">휴무 등록</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1.5 tracking-wider">Add New Leave Schedule</p>
                            </div>
                            <button
                                onClick={() => setShowForm(false)}
                                className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-all active:scale-90"
                            >
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1">
                            <form onSubmit={handleRegister} className="space-y-8 pb-4">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-800 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        대상 팀원
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={targetUserId}
                                            onChange={(e) => setTargetUserId(e.target.value)}
                                            className="w-full h-14 bg-slate-50 border border-slate-200 rounded-[20px] px-5 font-black text-slate-700 appearance-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all"
                                            required
                                        >
                                            <option value="" disabled>팀원을 선택하세요</option>
                                            {teamMembers.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.name} ({m.job_role})
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <ChevronRight className="w-5 h-5 text-slate-300 rotate-90" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-800 uppercase tracking-widest mb-3 ml-1">휴무 구분</label>
                                        <select
                                            value={leaveType}
                                            onChange={(e) => setLeaveType(e.target.value)}
                                            className="w-full h-14 bg-slate-50 border border-slate-200 rounded-[20px] px-5 font-black text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all"
                                        >
                                            <option value="연차">연차</option>
                                            <option value="반차">반차</option>
                                            <option value="대체휴무">대체휴무</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-800 uppercase tracking-widest mb-3 ml-1">상세 구분</label>
                                        <select
                                            value={leaveSubtype}
                                            onChange={(e) => setLeaveSubtype(e.target.value)}
                                            className="w-full h-14 bg-slate-50 border border-slate-200 rounded-[20px] px-5 font-black text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all"
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
                                        <label className="block text-[11px] font-black text-slate-800 uppercase tracking-widest mb-3 ml-1">메모 (선택사항)</label>
                                        <input
                                            type="text"
                                            value={memo}
                                            onChange={(e) => setMemo(e.target.value)}
                                            placeholder="예: 3/1 삼일절 근무 대체"
                                            className="w-full h-14 bg-slate-50 border border-slate-200 rounded-[20px] px-5 font-black text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-300 placeholder:font-medium"
                                        />
                                    </div>
                                )}

                                <div className="space-y-8 pt-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-3 px-1">
                                            <label className="block text-[11px] font-black text-slate-800 uppercase tracking-widest">신청 일자 (시작)</label>
                                            <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{startDate ? format(new Date(startDate), 'yyyy.MM.dd') : '날짜를 선택하세요'}</span>
                                        </div>
                                        <div className="bg-slate-50 rounded-[24px] p-4 border border-slate-100 shadow-inner">
                                            <div className="flex items-center gap-2 mb-4 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                                                <select
                                                    value={startViewYear}
                                                    onChange={e => setStartViewYear(Number(e.target.value))}
                                                    className="flex-1 text-xs font-black bg-transparent px-2 py-2 text-slate-700 focus:outline-none"
                                                >
                                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                                                        <option key={y} value={y}>{y}년</option>
                                                    ))}
                                                </select>
                                                <div className="w-px h-4 bg-slate-100" />
                                                <select
                                                    value={startViewMonthNum}
                                                    onChange={e => setStartViewMonthNum(Number(e.target.value))}
                                                    className="flex-1 text-xs font-black bg-transparent px-2 py-2 text-slate-700 focus:outline-none"
                                                >
                                                    {Array.from({ length: 12 }, (_, i) => i).map(m => (
                                                        <option key={m} value={m}>{m + 1}월</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-7 gap-1 text-center mb-2 px-1">
                                                {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                                                    <span key={d} className={`text-[10px] font-black uppercase tracking-tighter ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-300'}`}>{d}</span>
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-7 gap-1">
                                                {Array.from({ length: new Date(startViewYear, startViewMonthNum, 1).getDay() }).map((_, i) => (
                                                    <div key={i} className="h-9" />
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
                                                            className={`h-9 text-xs font-black rounded-xl transition-all relative overflow-hidden ${isSelected
                                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110 z-10'
                                                                : isDisabled
                                                                    ? `opacity-20 cursor-not-allowed ${dayOfWeek === 0 || isHoliday ? 'text-red-500' : 'text-blue-500'}`
                                                                    : `hover:bg-white text-slate-600 active:scale-95 shadow-sm`
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
                                            <div className="flex items-center justify-between mb-3 px-1">
                                                <label className="block text-[11px] font-black text-slate-800 uppercase tracking-widest">신청 일자 (종료)</label>
                                                <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{endDate ? format(new Date(endDate), 'yyyy.MM.dd') : '날짜를 선택하세요'}</span>
                                            </div>
                                            <div className="bg-slate-50 rounded-[24px] p-4 border border-slate-100 shadow-inner">
                                                <div className="flex items-center gap-2 mb-4 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                                                    <select
                                                        value={endViewYear}
                                                        onChange={e => setEndViewYear(Number(e.target.value))}
                                                        className="flex-1 text-xs font-black bg-transparent px-2 py-2 text-slate-700 focus:outline-none"
                                                    >
                                                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                                                            <option key={y} value={y}>{y}년</option>
                                                        ))}
                                                    </select>
                                                    <div className="w-px h-4 bg-slate-100" />
                                                    <select
                                                        value={endViewMonthNum}
                                                        onChange={e => setEndViewMonthNum(Number(e.target.value))}
                                                        className="flex-1 text-xs font-black bg-transparent px-2 py-2 text-slate-700 focus:outline-none"
                                                    >
                                                        {Array.from({ length: 12 }, (_, i) => i).map(m => (
                                                            <option key={m} value={m}>{m + 1}월</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-7 gap-1 text-center mb-2 px-1">
                                                    {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                                                        <span key={d} className={`text-[10px] font-black uppercase tracking-tighter ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-300'}`}>{d}</span>
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-7 gap-1">
                                                    {Array.from({ length: new Date(endViewYear, endViewMonthNum, 1).getDay() }).map((_, i) => (
                                                        <div key={i} className="h-9" />
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
                                                                className={`h-9 text-xs font-black rounded-xl transition-all relative overflow-hidden ${isSelected
                                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110 z-10'
                                                                    : isDisabled
                                                                        ? `opacity-20 cursor-not-allowed ${dayOfWeek === 0 || isHoliday ? 'text-red-500' : 'text-blue-500'}`
                                                                        : isStart
                                                                            ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100'
                                                                            : `hover:bg-white text-slate-600 active:scale-95 shadow-sm`
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

                                <div className="pt-6">
                                    <button
                                        type="submit"
                                        className="w-full h-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-lg rounded-[22px] shadow-xl shadow-blue-100 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                    >
                                        <Save className="w-6 h-6" />
                                        등록 완료하기
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="w-full h-14 mt-3 bg-white text-slate-400 font-black text-sm rounded-[20px] hover:bg-slate-50 transition-all flex items-center justify-center"
                                    >
                                        취소하고 돌아가기
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {leaveToDelete !== null && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-[200]">
                    <div className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
                        <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">휴무 삭제</h3>
                        <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">
                            이 휴무 기록을 삭제하시겠습니까?<br />
                            <span className="text-red-400 text-[11px]">삭제된 데이터는 복구할 수 없습니다.</span>
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setLeaveToDelete(null)}
                                className="flex-1 py-4 rounded-[20px] bg-slate-100 text-slate-600 font-black text-xs hover:bg-slate-200 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="flex-1 py-4 rounded-[20px] bg-red-500 text-white font-black text-xs hover:bg-red-600 transition-all shadow-lg shadow-red-200 active:scale-95"
                            >
                                삭제하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* User Management Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-0 md:p-4 transition-all duration-300">
                    <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl bg-white md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-full md:slide-in-from-bottom-10 md:zoom-in-95 duration-500">
                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                                    <Users className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">팀원 관리</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Team Member Management</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowUserModal(false);
                                    setEditingUser(null);
                                    setUserForm({ name: '', role: 'member', job_role: '', password: '' });
                                    setActiveUserTab('list');
                                }}
                                className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-all active:scale-90"
                            >
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        {/* Mobile Tabs */}
                        {isMobile && (
                            <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                                <button
                                    onClick={() => setActiveUserTab('list')}
                                    className={`flex-1 h-10 rounded-xl text-xs font-black transition-all ${activeUserTab === 'list' ? 'bg-white text-blue-600 shadow-sm border border-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    팀원 목록
                                </button>
                                <button
                                    onClick={() => setActiveUserTab('form')}
                                    className={`flex-1 h-10 rounded-xl text-xs font-black transition-all ${activeUserTab === 'form' ? 'bg-white text-blue-600 shadow-sm border border-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {editingUser ? '정보 수정' : '팀원 추가'}
                                </button>
                            </div>
                        )}

                        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                            {/* User List Section */}
                            <div className={`flex-[1.4] border-r border-slate-100 flex flex-col min-h-0 ${isMobile && activeUserTab !== 'list' ? 'hidden' : 'flex'}`}>
                                <div className="p-6 overflow-y-auto space-y-4">
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                            현재 팀원 ({teamMembers.length}명)
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
                                        {teamMembers.map(u => (
                                            <div
                                                key={u.id}
                                                className={`p-4 rounded-[20px] border transition-all flex items-center justify-between group relative overflow-hidden ${editingUser?.id === u.id ? 'bg-blue-50 border-blue-200 shadow-md transform scale-[1.02]' : 'bg-white border-slate-100 hover:border-blue-100 hover:shadow-lg shadow-sm hover:-translate-y-0.5'}`}
                                            >
                                                <div className="flex items-center gap-4 relative z-10">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm ${u.role === 'admin' ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                        {u.name[0]}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-base font-black text-slate-800 truncate">{u.name}</p>
                                                            {u.role === 'admin' && (
                                                                <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md border border-blue-200">ADMIN</span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                                                            <span>{u.job_role}</span>
                                                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                                                            <span className="uppercase text-[10px]">{u.role}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 transition-all opacity-100 relative z-10">
                                                    <button
                                                        onClick={() => handleEditUser(u)}
                                                        className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-100/50 rounded-xl transition-all active:scale-95"
                                                        title="수정"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(u.id)}
                                                        className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95 disabled:opacity-20"
                                                        disabled={user?.id === u.id}
                                                        title={user?.id === u.id ? "본인은 삭제할 수 없습니다" : "삭제"}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {/* Card Background Pattern */}
                                                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-slate-50/50 to-transparent pointer-events-none opacity-50" />
                                            </div>
                                        ))}
                                    </div>

                                    {teamMembers.length === 0 && (
                                        <div className="py-20 flex flex-col items-center justify-center opacity-40">
                                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                <Users className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-400">등록된 팀원이 없습니다.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Form Section */}
                            <div className={`flex-1 bg-slate-50/50 flex flex-col min-h-0 ${isMobile && activeUserTab !== 'form' ? 'hidden' : 'flex'}`}>
                                <div className="p-6 md:p-8 overflow-y-auto w-full max-w-lg mx-auto">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${editingUser ? 'bg-blue-600 text-white' : 'bg-white text-blue-600'}`}>
                                            {editingUser ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">
                                                {editingUser ? '정보 수정' : '새 팀원 추가'}
                                            </h3>
                                            <p className="text-xs text-slate-400 font-bold mt-1.5">
                                                {editingUser ? `${editingUser.name} 님의 정보를 수정합니다.` : '새로운 팀원을 등록합니다.'}
                                            </p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleUserSubmit} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest ml-1">성함</label>
                                            <input
                                                type="text"
                                                value={userForm.name}
                                                onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                                                className="w-full h-14 px-5 bg-white border border-slate-200 rounded-[20px] font-bold text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm placeholder:text-slate-300 placeholder:font-medium"
                                                placeholder="성함을 입력해주세요"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest ml-1">직무 및 소속</label>
                                            <input
                                                type="text"
                                                value={userForm.job_role}
                                                onChange={e => setUserForm({ ...userForm, job_role: e.target.value })}
                                                className="w-full h-14 px-5 bg-white border border-slate-200 rounded-[20px] font-bold text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm placeholder:text-slate-300 placeholder:font-medium"
                                                placeholder="예: 유치원, 고등, PAC, 기숙사A..."
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest ml-1">계정 권한</label>
                                            <div className="grid grid-cols-2 gap-3 p-1.5 bg-white border border-slate-200 rounded-[22px] shadow-sm">
                                                {['member', 'admin'].map((r) => (
                                                    <button
                                                        key={r}
                                                        type="button"
                                                        onClick={() => setUserForm({ ...userForm, role: r })}
                                                        className={`h-11 rounded-[16px] font-black text-xs transition-all flex items-center justify-center gap-2 ${userForm.role === r ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
                                                    >
                                                        {r === 'admin' ? <UserCog className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                                                        {r === 'admin' ? '관리자' : '일반 팀원'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest ml-1">
                                                {editingUser ? '비밀번호 변경 (미입력시 유지)' : '비밀번호 (4자리)'}
                                            </label>
                                            <input
                                                type="password"
                                                value={userForm.password}
                                                onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                                className="w-full h-14 px-5 bg-white border border-slate-200 rounded-[20px] font-bold text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm tracking-[0.5em] placeholder:tracking-normal placeholder:text-slate-300 placeholder:font-medium"
                                                placeholder="••••"
                                                maxLength={4}
                                                required={!editingUser}
                                            />
                                        </div>

                                        <div className="pt-4 flex flex-col gap-3">
                                            <button
                                                type="submit"
                                                className="w-full h-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[20px] font-black text-lg shadow-xl shadow-blue-200 hover:opacity-90 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                                            >
                                                <Save className="w-6 h-6" />
                                                {editingUser ? '저장하기' : '등록하기'}
                                            </button>
                                            {editingUser && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingUser(null);
                                                        setUserForm({ name: '', role: 'member', job_role: '', password: '' });
                                                        if (isMobile) setActiveUserTab('list');
                                                    }}
                                                    className="w-full h-14 rounded-[20px] bg-white text-slate-500 font-black border border-slate-200 hover:bg-slate-50 transition-all active:scale-[0.98]"
                                                >
                                                    수정 취소
                                                </button>
                                            )}
                                        </div>
                                    </form>

                                    {/* Footer Info */}
                                    <div className="mt-8 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                        <p className="text-[10px] text-blue-600/70 font-bold leading-relaxed text-center">
                                            팀원은 등록된 비밀번호로 본인의 휴무 일정을<br />
                                            직접 등록하고 관리할 수 있습니다.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
