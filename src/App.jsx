import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, DollarSign, Plus, X, Check, ChevronLeft, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { supabase } from './supabaseClient';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// 48 slots for dropdowns (30-min increments)
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2).toString().padStart(2, '0');
  const minutes = i % 2 === 0 ? '00' : '30';
  return `${hour}:${minutes}`;
});

// 24 slots for the Timetable grid rows (Visual Hour lines)
const HOUR_ROWS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

export default function TutoringManager() {
  const [currentView, setCurrentView] = useState('timetable');
  const [students, setStudents] = useState([]);
  const [historyPending, setHistoryPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const [editingStudent, setEditingStudent] = useState(null);

  const [newStudent, setNewStudent] = useState({
    name: '', phone: '', day: 'Monday',
    start_time: '09:00', end_time: '10:00', grade: 'Grade 9',
    payment_amount: '', type: 'client'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: scheduleData } = await supabase.from('schedule').select('*');
    const { data: historyData } = await supabase.from('lesson_history').select('*');
    if (scheduleData) setStudents(scheduleData);
    if (historyData) {
      setHistory(historyData.filter(h => h.status === 'paid').sort((a, b) => new Date(b.date) - new Date(a.date)));
      setHistoryPending(historyData.filter(h => h.status === 'taught'));
    }
    setLoading(false);
  };

  const handleMarkAsTaught = async (student) => {
    const { error } = await supabase.from('lesson_history').insert([{ 
      client_id: student.id, client_name: student.name, amount: student.payment_amount,
      status: 'taught', date: new Date().toISOString().split('T')[0]
    }]);
    if (!error) await fetchData();
  };

  const handleMarkAsPaid = async (recordId) => {
    const { error } = await supabase.from('lesson_history').update({ status: 'paid' }).eq('id', recordId);
    if (!error) await fetchData();
  };

  const addOrUpdateStudent = async () => {
    if (!newStudent.name || !newStudent.phone || !newStudent.payment_amount) return alert('Fill required fields');
    const table = editingStudent ? supabase.from('schedule').update({ ...newStudent }).eq('id', editingStudent.id) : 
                                   supabase.from('schedule').insert([{ ...newStudent, added_date: new Date().toISOString() }]);
    const { error } = await table;
    if (error) alert(error.message);
    await fetchData();
    resetForm();
    setShowAddStudent(false);
  };

  const deleteHistoryRecord = async (id) => {
    if (confirm('Delete this record?')) {
      await supabase.from('lesson_history').delete().eq('id', id);
      await fetchData();
    }
  };

  const deleteStudent = async (id) => {
  if (confirm('Are you sure you want to delete this client from the schedule?')) {
    const { error } = await supabase.from('schedule').delete().eq('id', id);
    if (!error) await fetchData();
  }
};

  // --- CALENDAR MATH ---
  const todayDate = new Date();
  const diff = todayDate.getDay() === 0 ? -6 : 1 - todayDate.getDay();
  const currentViewMonday = new Date(todayDate);
  currentViewMonday.setDate(todayDate.getDate() + diff + (selectedWeekOffset * 7));

  const weekDates = DAYS.map((_, i) => {
    const d = new Date(currentViewMonday);
    d.setDate(currentViewMonday.getDate() + i);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const todayISO = new Date().toISOString().split('T')[0];
  const todayName = DAYS[todayDate.getDay() === 0 ? 6 : todayDate.getDay() - 1];
  const todayProcessedIds = [...historyPending.filter(h => h.date === todayISO).map(h => h.client_id), ...history.filter(h => h.date === todayISO).map(h => h.client_id)];

  const totalPending = historyPending.reduce((sum, h) => sum + parseFloat(h.amount || 0), 0);
  const totalEarned = history.reduce((sum, h) => sum + parseFloat(h.amount || 0), 0);

  const resetForm = () => {
    setNewStudent({ name: '', phone: '', day: 'Monday', start_time: '09:00', end_time: '10:00', grade: 'Grade 9', payment_amount: '', type: 'client' });
    setEditingStudent(null);
  };

  const editStudent = (student) => {
    setNewStudent(student);
    setEditingStudent(student);
    setShowAddStudent(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-indigo-50 font-medium">Syncing...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl">
        <div className="px-5 py-6">
          <h1 className="text-2xl font-bold text-white">Client Pay</h1>
          <p className="text-indigo-100 text-sm mt-1">Manage schedules & payments</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white shadow-md border-b">
        <div className="px-5 py-4 flex gap-4 overflow-x-auto">
          <div className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl px-4 py-3 min-w-[100px]">
            <p className="text-blue-100 text-xs font-medium">Total clients</p>
            <p className="text-white text-2xl font-bold">{students.length}</p>
          </div>
          <div className="flex-shrink-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl px-4 py-3 min-w-[100px]">
            <p className="text-amber-100 text-xs font-medium">Pending Payment</p>
            <p className="text-white text-2xl font-bold">${totalPending}</p>
          </div>
          <div className="flex-shrink-0 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl px-4 py-3 min-w-[100px]">
            <p className="text-green-100 text-xs font-medium">Total Earned</p>
            <p className="text-white text-2xl font-bold">${totalEarned}</p>
          </div>
        </div>
      </div>


      {/* Nav */}
      <div className="bg-white shadow-sm sticky top-0 z-50 flex">
        {[{id:'timetable', icon: Calendar, label: 'Schedule'}, {id:'students', icon: Users, label: 'Today'}, {id:'history', icon: Clock, label: 'History'}].map(tab => (
          <button key={tab.id} onClick={() => setCurrentView(tab.id)} className={`flex-1 p-4 text-xs font-bold ${currentView === tab.id ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-400'}`}>
            <tab.icon className="w-5 h-5 mx-auto mb-1" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {currentView === 'timetable' && (
          <div className="w-full">
            <div className="flex items-center justify-between mb-4 bg-white rounded-2xl p-3 shadow-md">
              <button onClick={() => setSelectedWeekOffset(selectedWeekOffset - 1)} className="p-2 text-indigo-600"><ChevronLeft/></button>
              <div className="text-center font-bold text-gray-800 text-xs">
                {selectedWeekOffset === 0 ? 'This Week' : weekDates[0] + ' - ' + weekDates[6]}
              </div>
              <button onClick={() => setSelectedWeekOffset(selectedWeekOffset + 1)} className="p-2 text-indigo-600"><ChevronRight/></button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col">
              <div className="flex bg-indigo-600 text-white font-bold text-[10px]">
                <div className="w-8 p-2 text-center border-r border-white/10">Hr</div>
                {DAYS.map((day, i) => (
                  <div key={day} className="flex-1 p-2 text-center border-l border-white/10">
                    <div>{day.charAt(0)}</div>
                    <div className="text-[7px] opacity-70 font-normal">{weekDates[i].split(' ')[1]}</div>
                  </div>
                ))}
              </div>

              <div className="overflow-y-auto max-h-[60vh]">
                {HOUR_ROWS.map(time => (
                  <div key={time} className="flex border-b border-gray-50 min-h-[60px] relative">
                    <div className="w-8 bg-gray-50 flex items-center justify-center border-r border-gray-100 text-[10px] font-bold text-indigo-900">{time.split(':')[0]}</div>
                    {DAYS.map((day, idx) => {
                      const hourPrefix = time.split(':')[0];
                      // Show students who start in this hour (:00 or :30)
                      const studentsInHour = students.filter(s => s.day === day && s.start_time.startsWith(hourPrefix));
                      
                      const d = new Date(currentViewMonday);
                      d.setDate(currentViewMonday.getDate() + idx);
                      const cellDateISO = d.toISOString().split('T')[0];

                      return (
                        <div key={`${day}-${time}`} className="flex-1 border-r border-gray-50 last:border-r-0 relative bg-white">
                          {/* Visual 30-min divider */}
                          <div className="absolute top-1/2 w-full border-t border-gray-100 border-dashed pointer-events-none"></div>
                          
                          {studentsInHour.map(student => {
                            const isProcessed = historyPending.some(h => h.client_id === student.id && h.date === cellDateISO) || 
                                                history.some(h => h.client_id === student.id && h.date === cellDateISO);

                            const isHalfHourStart = student.start_time.endsWith(':30');
                            const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
                            const duration = toMin(student.end_time) - toMin(student.start_time);
                            
                            const heightPercentage = (duration / 60) * 100;

                            return (
                              <div key={student.id} onClick={() => editStudent(student)} 
                                className={`absolute left-0 right-0 z-20 flex items-center justify-center shadow-md transition-all active:scale-95 text-white ${isProcessed ? 'bg-amber-400 text-amber-950' : 'bg-indigo-500'}`}
                                style={{ 
                                  // SHIFTING LOGIC: :00 starts at 50% of the PREVIOUS row (which visually is the solid line)
                                  // Since we are inside the current hour row, :00 starts at 50% and :30 starts at 100% (top of next)
                                  // To simplify, we'll keep the :00 at 50% of the current row so it aligns with the solid line.
                                  top: isHalfHourStart ? '100%' : '50%', 
                                  height: `${heightPercentage}%`,
                                  borderRadius: '4px',
                                  margin: '0 2px'
                                }}>
                                <span className="text-[7px] font-black uppercase px-1 leading-tight text-center">{student.name.split(' ')[0]}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}


{currentView === 'students' && (

<div className="space-y-6">

{/* SECTION 1: TODAY'S CLASSES (TO TEACH) */}

<div>

<h2 className="text-1xl font-bold text-gray-800 mb-4 flex items-center gap-2">

<div className="w-2 h-8 bg-blue-500 rounded-full"></div>

Upcoming Classes

<span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">

{students.filter(s => s.day === todayName && !todayProcessedIds.includes(s.id)).length}

</span>

</h2>


{students

.filter(s => s.day === todayName)

.filter(s => !todayProcessedIds.includes(s.id))

.map(student => (

<div key={student.id} className="bg-white rounded-2xl shadow-lg p-5 mb-4 border-l-4 border-blue-500">

<div className="flex justify-between items-start mb-3">

<div className="flex-1">

<h3 className="font-bold text-xl text-gray-900 uppercase">{student.name}</h3>

<p className="text-sm text-indigo-600 font-semibold mt-1">{student.grade}</p>

</div>

<div className="flex gap-2">

<button

onClick={() => editStudent(student)}

className="p-2 bg-indigo-100 text-indigo-700 rounded-xl"

>

<Edit2 className="w-5 h-5" />

</button>

<button

onClick={() => handleMarkAsTaught(student)}

className="p-2 bg-green-500 text-white rounded-xl shadow-md active:bg-green-600"

>

<Check className="w-5 h-5" />

</button>

</div>

</div>

<div className="grid grid-cols-2 gap-3 text-sm">

<div className="bg-gray-50 p-3 rounded-xl">

<p className="text-gray-600 text-xs mb-1">📞 Phone</p>

<p className="font-semibold text-gray-800">{student.phone}</p>

</div>

<div className="bg-indigo-50 p-3 rounded-xl">

<p className="text-indigo-600 text-xs mb-1">🕒 Time</p>

<p className="font-bold text-indigo-900">{student.start_time}</p>

</div>

</div>

</div>

))}

</div>



{/* SECTION 2: AWAITING PAYMENT */}

<div>

<h2 className="text-1xl font-bold text-gray-800 mb-4 flex items-center gap-2">

<div className="w-2 h-8 bg-amber-500 rounded-full"></div>

Awaiting Payment

<span className="text-sm bg-amber-100 text-amber-700 px-3 py-1 rounded-full">{historyPending.length}</span>

</h2>


{historyPending.map(record => (

<div key={record.id} className="bg-white rounded-2xl shadow-lg p-5 mb-4 border-l-4 border-amber-500">

<div className="flex justify-between items-start mb-3">

<div className="flex-1">

<h3 className="font-bold text-xl text-gray-900 uppercase">{record.client_name}</h3>

<p className="text-sm text-amber-600 font-semibold mt-1">Session on: {record.date}</p>

</div>

<button

onClick={() => handleMarkAsPaid(record.id)}

className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-md"

>

<DollarSign className="w-5 h-5" />

</button>

</div>

<div className="mt-3 bg-amber-50 border-2 border-amber-300 p-4 rounded-xl">

<p className="text-amber-700 text-xs font-semibold mb-1">Amount Due</p>

<p className="text-amber-900 text-2xl font-bold">${record.amount}</p>

</div>

</div>

))}

</div>

</div>

)}
      
{currentView === 'history' && (

<div className="space-y-6">

{/* HEADER SECTION */}

<div className="flex items-center justify-between mb-2">

<h2 className="text-1xl font-bold text-gray-800 flex items-center gap-2">

<div className="w-2 h-8 bg-green-500 rounded-full"></div>

Completed Sessions

<span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full">

{history.length}

</span>

</h2>

</div>



{history.length === 0 ? (

<div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-dashed border-gray-200">

<div className="text-6xl mb-4">🏆</div>

<p className="text-gray-500 font-medium text-lg">Your history is currently empty.</p>

<p className="text-gray-400 text-sm">Completed payments will appear here.</p>

</div>

) : (

history.map(record => (

<div key={record.id} className="bg-white rounded-2xl shadow-lg p-5 mb-4 border-l-4 border-green-500 overflow-hidden relative">

{/* Subtle Background Watermark Icon */}

<DollarSign className="absolute -right-4 -bottom-4 w-24 h-24 text-green-50 opacity-10 pointer-events-none" />


<div className="flex justify-between items-start mb-4">

<div className="flex-1">

<h3 className="font-bold text-1xl text-gray-900 uppercase tracking-tight">{record.client_name}</h3>

<div className="flex items-center gap-2 mt-1">

<span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-md font-bold uppercase">

PAID

</span>

<p className="text-xs text-gray-400 font-medium">Ref ID: {record.id.slice(0,8)}</p>

</div>

</div>


<button

onClick={() => deleteHistoryRecord(record.id)}

className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"

>

<Trash2 className="w-5 h-5" />

</button>

</div>



<div className="grid grid-cols-2 gap-3 text-sm mb-4">

<div className="bg-gray-50 p-3 rounded-xl">

<p className="text-gray-500 text-[10px] font-bold uppercase mb-1">📅 Completed On</p>

<p className="font-bold text-gray-800">{new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>

</div>

<div className="bg-blue-50 p-3 rounded-xl">

<p className="text-blue-600 text-[10px] font-bold uppercase mb-1">💰 Revenue</p>

<p className="font-black text-blue-900 text-lg">${record.amount}</p>

</div>

</div>



<div className="bg-gradient-to-r from-green-500 to-emerald-600 p-0.5 rounded-full">

<div className="bg-white px-4 py-2 rounded-full flex items-center justify-between">

<div className="flex items-center gap-2">

<Check className="w-4 h-4 text-green-600 font-bold" />

<span className="text-xs font-bold text-green-700 uppercase">Payment Finalized</span>

</div>

<p className="text-[10px] text-gray-400 font-medium italic">Sent to Dashboard</p>

</div>

</div>

</div>

))

)}


{/* TOTAL ACCUMULATED CARD */}

<div className="bg-indigo-900 rounded-3xl p-6 shadow-2xl text-white relative overflow-hidden">

<div className="relative z-10">

<p className="text-indigo-200 text-xs font-bold uppercase tracking-[0.2em] mb-1">Lifetime Earnings</p>

<p className="text-4xl font-black">${totalEarned}</p>

<div className="mt-4 flex items-center gap-2 text-indigo-300 text-[10px] font-medium bg-white/10 w-fit px-3 py-1 rounded-full">

<Clock className="w-3 h-3" /> Automatic sync enabled

</div>

</div>

<DollarSign className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 rotate-12" />

</div>

</div>

)}
      </div>

      <button onClick={() => { resetForm(); setShowAddStudent(true); }} className="fixed bottom-6 right-6 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-transform active:scale-90"><Plus className="w-8 h-8" /></button>

      {showAddStudent && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-indigo-900">{editingStudent ? 'Edit' : 'Add'} Client</h2><X className="cursor-pointer text-gray-400" onClick={() => setShowAddStudent(false)} /></div>
            <input type="text" placeholder="Client Name" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl" />
            <input type="tel" placeholder="Phone Number" value={newStudent.phone} onChange={e => setNewStudent({...newStudent, phone: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl" />
            <input type="number" placeholder="Payment Amount ($)" value={newStudent.payment_amount} onChange={e => setNewStudent({...newStudent, payment_amount: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl" />
            <select value={newStudent.day} onChange={e => setNewStudent({ ...newStudent, day: e.target.value })} className="w-full p-4 bg-gray-50 border-none rounded-2xl">{DAYS.map(d => <option key={d} value={d}>{d}</option>)}</select>
            <div className="grid grid-cols-2 gap-2">
              <select value={newStudent.start_time} onChange={e => setNewStudent({ ...newStudent, start_time: e.target.value })} className="w-full p-4 bg-gray-50 border-none rounded-2xl">{TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select>
              <select value={newStudent.end_time} onChange={e => setNewStudent({ ...newStudent, end_time: e.target.value })} className="w-full p-4 bg-gray-50 border-none rounded-2xl">{TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select>
            </div>
           <button 
  onClick={addOrUpdateStudent} 
  className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold"
>
  Save Student
</button>

{editingStudent && (
  <button 
    onClick={() => { 
      deleteStudent(editingStudent.id); 
      setShowAddStudent(false); 
    }} 
    className="w-full mt-2 bg-red-50 text-red-600 p-3 rounded-xl font-bold border border-red-100 active:scale-95 transition-transform"
  >
    Delete Student
  </button>
)}
          </div>
        </div>
      )}
    </div>
  );
}