import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, DollarSign, Plus, X, Check, ChevronLeft, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { supabase } from './supabaseClient';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

const GRADES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 
  'University', 'Adult Learning', 'Other'];

export default function TutoringManager() {
  const [currentView, setCurrentView] = useState('timetable');
  const [students, setStudents] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const [editingStudent, setEditingStudent] = useState(null);

  const [newStudent, setNewStudent] = useState({
    name: '', phone: '', email: '', day: 'Monday',
    start_time: '09:00', end_time: '10:00', grade: 'Grade 9',
    payment_amount: '', taught: false, paid: false
  });

  // --- SUPABASE DATABASE LOGIC ---

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Fetch all records from the 'students' table
    const { data, error } = await supabase
      .from('students')
      .select('*');

    if (error) {
      console.error('Error fetching data:', error);
    } else {
      // Split data into active students and history based on 'paid' status
      setStudents(data.filter(s => !s.paid));
      setHistory(data.filter(s => s.paid).sort((a, b) => 
        new Date(b.completed_date) - new Date(a.completed_date)
      ));
    }
    setLoading(false);
  };

  const addOrUpdateStudent = async () => {
    if (!newStudent.name || !newStudent.phone || !newStudent.payment_amount) {
      alert('Please fill in name, phone number, and payment amount');
      return;
    }

    if (editingStudent) {
      const { error } = await supabase
        .from('students')
        .update({ ...newStudent })
        .eq('id', editingStudent.id);
      if (error) alert(error.message);
    } else {
      const { error } = await supabase
        .from('students')
        .insert([{ ...newStudent, added_date: new Date().toISOString() }]);
      if (error) alert(error.message);
    }

    await fetchData();
    resetForm();
    setShowAddStudent(false);
  };

  const toggleTaught = async (id, currentTaughtStatus) => {
    const { error } = await supabase
      .from('students')
      .update({ taught: !currentTaughtStatus })
      .eq('id', id);
    if (!error) await fetchData();
  };

  const markAsPaid = async (id) => {
    const { error } = await supabase
      .from('students')
      .update({ 
        paid: true, 
        completed_date: new Date().toISOString() 
      })
      .eq('id', id);
    if (!error) await fetchData();
  };

  const deleteStudent = async (id) => {
    if (confirm('Are you sure you want to delete this student?')) {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (!error) await fetchData();
    }
  };

  // --- HELPER LOGIC ---
  const getWeekDates = (offset = 0) => {
    const today = new Date();
    const currentDay = today.getDay();
    const diff = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff + (offset * 7));
    return DAYS.map((_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
  };

  const weekDates = getWeekDates(selectedWeekOffset);

  const resetForm = () => {
    setNewStudent({
      name: '', phone: '', email: '', day: 'Monday',
      start_time: '09:00', end_time: '10:00', grade: 'Grade 9',
      payment_amount: '', taught: false, paid: false
    });
    setEditingStudent(null);
  };

  const editStudent = (student) => {
    setNewStudent(student);
    setEditingStudent(student);
    setShowAddStudent(true);
  };

  const getStudentsForSlot = (day, time) => {
    return students.filter(s => {
      if (s.day !== day) return false;
      const slotTime = parseInt(time.split(':')[0]);
      const startHour = parseInt(s.start_time.split(':')[0]);
      const endHour = parseInt(s.end_time.split(':')[0]);
      return slotTime >= startHour && slotTime < endHour;
    });
  };

  const sortedStudents = [...students].sort((a, b) => {
    const dayCompare = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
    if (dayCompare !== 0) return dayCompare;
    return a.start_time.localeCompare(b.start_time);
  });

  const upcomingStudents = sortedStudents.filter(s => !s.taught);
  const taughtStudents = sortedStudents.filter(s => s.taught && !s.paid);
  const totalPending = taughtStudents.reduce((sum, s) => sum + parseFloat(s.payment_amount || 0), 0);
  const totalEarned = history.reduce((sum, s) => sum + parseFloat(s.payment_amount || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Syncing schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl">
        <div className="px-5 py-6">
          <h1 className="text-3xl font-bold text-white">Tutoring Pro</h1>
          <p className="text-indigo-100 text-sm mt-1">Manage students & payments effortlessly</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white shadow-md border-b">
        <div className="px-5 py-4 flex gap-4 overflow-x-auto">
          <div className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl px-4 py-3 min-w-[140px]">
            <p className="text-blue-100 text-xs font-medium">Total Students</p>
            <p className="text-white text-2xl font-bold">{students.length}</p>
          </div>
          <div className="flex-shrink-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl px-4 py-3 min-w-[140px]">
            <p className="text-amber-100 text-xs font-medium">Pending Payment</p>
            <p className="text-white text-2xl font-bold">${totalPending}</p>
          </div>
          <div className="flex-shrink-0 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl px-4 py-3 min-w-[140px]">
            <p className="text-green-100 text-xs font-medium">Total Earned</p>
            <p className="text-white text-2xl font-bold">${totalEarned}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex">
          <button
            onClick={() => setCurrentView('timetable')}
            className={`flex-1 px-4 py-4 text-sm font-semibold transition-all ${
              currentView === 'timetable' 
                ? 'text-indigo-600 border-b-3 border-indigo-600 bg-indigo-50' 
                : 'text-gray-600 border-b-2 border-transparent'
            }`}
          >
            <Calendar className="w-5 h-5 mx-auto mb-1" />
            Schedule
          </button>
          <button
            onClick={() => setCurrentView('students')}
            className={`flex-1 px-4 py-4 text-sm font-semibold transition-all ${
              currentView === 'students' 
                ? 'text-indigo-600 border-b-3 border-indigo-600 bg-indigo-50' 
                : 'text-gray-600 border-b-2 border-transparent'
            }`}
          >
            <Users className="w-5 h-5 mx-auto mb-1" />
            Students
          </button>
          <button
            onClick={() => setCurrentView('history')}
            className={`flex-1 px-4 py-4 text-sm font-semibold transition-all ${
              currentView === 'history' 
                ? 'text-indigo-600 border-b-3 border-indigo-600 bg-indigo-50' 
                : 'text-gray-600 border-b-2 border-transparent'
            }`}
          >
            <Clock className="w-5 h-5 mx-auto mb-1" />
            History
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {currentView === 'timetable' && (
          <div>
            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-5 bg-white rounded-2xl p-4 shadow-lg">
              <button 
                onClick={() => setSelectedWeekOffset(selectedWeekOffset - 1)}
                className="p-2 hover:bg-indigo-50 rounded-xl transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-indigo-600" />
              </button>
              <span className="font-bold text-gray-800 text-lg">
                {selectedWeekOffset === 0 ? 'This Week' : 
                 selectedWeekOffset === 1 ? 'Next Week' : 
                 selectedWeekOffset === -1 ? 'Last Week' : 
                 `Week ${selectedWeekOffset > 0 ? '+' : ''}${selectedWeekOffset}`}
              </span>
              <button 
                onClick={() => setSelectedWeekOffset(selectedWeekOffset + 1)}
                className="p-2 hover:bg-indigo-50 rounded-xl transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-indigo-600" />
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl shadow-xl">
              <table className="w-full bg-white" style={{ minWidth: '700px' }}>
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                    <th className="p-4 text-left sticky left-0 bg-indigo-600 z-10 font-bold">Time</th>
                    {DAYS.map((day, idx) => (
                      <th key={day} className="p-4 text-center text-sm font-bold">
                        <div>{day.slice(0, 3)}</div>
                        <div className="text-xs font-normal opacity-90 mt-1">{weekDates[idx]}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map(time => (
                    <tr key={time} className="border-b hover:bg-indigo-50 transition-colors">
                      <td className="p-3 font-semibold text-sm sticky left-0 bg-white border-r text-indigo-900">
                        {time}
                      </td>
                      {DAYS.map(day => {
                        const studentsInSlot = getStudentsForSlot(day, time);
                        
                        return (
                          <td 
                            key={`${day}-${time}`}
                            className="p-2 text-center hover:bg-indigo-50"
                          >
                            {studentsInSlot.map(student => (
                              <div 
                                key={student.id}
                                className={`text-xs p-2 mb-1 rounded-lg font-medium shadow-sm ${
                                  student.taught 
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-blue-100 text-blue-900 border border-blue-300'
                                }`}
                              >
                                <div className="font-bold">{student.name}</div>
                                <div className="text-[10px] opacity-75">{student.start_time}-{student.end_time}</div>
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {currentView === 'students' && (
          <div>
            {/* Upcoming Classes */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
                Upcoming Classes
                <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{upcomingStudents.length}</span>
              </h2>
              {upcomingStudents.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                  <div className="text-6xl mb-3">📚</div>
                  <p className="text-gray-500 font-medium">No upcoming classes</p>
                </div>
              ) : (
                upcomingStudents.map(student => (
                  <div key={student.id} className="bg-white rounded-2xl shadow-lg p-5 mb-4 border-l-4 border-blue-500">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-xl text-gray-900">{student.name}</h3>
                        <p className="text-sm text-indigo-600 font-semibold mt-1">{student.grade}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => editStudent(student)}
                          className="p-2 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => toggleTaught(student.id, student.taught)}
                          className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-md"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => deleteStudent(student.id)}
                          className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-md"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-gray-50 p-3 rounded-xl">
                        <p className="text-gray-600 text-xs mb-1">📞 Phone</p>
                        <p className="font-semibold text-gray-800">{student.phone}</p>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-xl">
                        <p className="text-indigo-600 text-xs mb-1">📅 Schedule</p>
                        <p className="font-bold text-indigo-900">{student.day}</p>
                        <p className="font-semibold text-indigo-700 text-xs">{student.start_time} - {student.end_time}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-xl">
                        <p className="text-green-600 text-xs mb-1">💰 Payment</p>
                        <p className="font-bold text-green-900 text-lg">${student.payment_amount}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Awaiting Payment */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <div className="w-2 h-8 bg-amber-500 rounded-full"></div>
                Awaiting Payment
                <span className="text-sm bg-amber-100 text-amber-700 px-3 py-1 rounded-full">{taughtStudents.length}</span>
              </h2>
              {taughtStudents.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                  <div className="text-6xl mb-3">✅</div>
                  <p className="text-gray-500 font-medium">All payments collected!</p>
                </div>
              ) : (
                <>
                  <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl shadow-lg p-4 mb-4 text-white">
                    <p className="text-sm opacity-90 mb-1">Total Pending</p>
                    <p className="text-3xl font-bold">${totalPending}</p>
                  </div>
                  {taughtStudents.map(student => (
                    <div key={student.id} className="bg-white rounded-2xl shadow-lg p-5 mb-4 border-l-4 border-amber-500">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-xl text-gray-900">{student.name}</h3>
                          <p className="text-sm text-indigo-600 font-semibold mt-1">{student.grade}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => editStudent(student)}
                            className="p-2 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition-colors"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => markAsPaid(student.id)}
                            className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-md"
                          >
                            <DollarSign className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-gray-50 p-3 rounded-xl">
                          <p className="text-gray-600 text-xs mb-1">📞 Phone</p>
                          <p className="font-semibold text-gray-800">{student.phone}</p>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-xl">
                          <p className="text-indigo-600 text-xs mb-1">📅 Schedule</p>
                          <p className="font-bold text-indigo-900 text-xs">{student.day}</p>
                          <p className="font-semibold text-indigo-700 text-xs">{student.start_time}-{student.end_time}</p>
                        </div>
                      </div>
                      <div className="mt-3 bg-amber-50 border-2 border-amber-300 p-4 rounded-xl">
                        <p className="text-amber-700 text-xs font-semibold mb-1">Amount Due</p>
                        <p className="text-amber-900 text-2xl font-bold">${student.payment_amount}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {currentView === 'history' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-2 h-8 bg-green-500 rounded-full"></div>
              Completed Sessions
              <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full">{history.length}</span>
            </h2>
            {history.map(student => (
              <div key={student.id} className="bg-white rounded-2xl shadow-lg p-5 mb-4 border-l-4 border-green-500">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-xl text-gray-900">{student.name}</h3>
                    <p className="text-sm text-indigo-600 font-semibold">{student.grade}</p>
                  </div>
                  <button
                    onClick={() => deleteStudent(student.id)}
                    className="p-2 bg-red-100 text-red-700 rounded-xl"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-3 bg-green-50 p-3 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-green-700 text-xs font-semibold">Payment Received</p>
                    <p className="text-green-900 text-xl font-bold">${student.payment_amount}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    Completed on: {new Date(student.completed_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Student FAB */}
      <button
        onClick={() => { resetForm(); setShowAddStudent(true); }}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-2xl flex items-center justify-center z-20"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Modal - Same as before but updating addOrUpdateStudent */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-end sm:items-center justify-center z-30 p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-5 rounded-t-3xl flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">{editingStudent ? 'Edit' : 'Add'} Student</h2>
              <X className="text-white cursor-pointer" onClick={() => setShowAddStudent(false)} />
            </div>
            <div className="p-6 space-y-4">
              <input type="text" placeholder="Name" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} className="w-full p-3 border rounded-xl" />
              <input type="tel" placeholder="Phone" value={newStudent.phone} onChange={e => setNewStudent({...newStudent, phone: e.target.value})} className="w-full p-3 border rounded-xl" />
              <input type="number" placeholder="Amount" value={newStudent.payment_amount} onChange={e => setNewStudent({...newStudent, payment_amount: e.target.value})} className="w-full p-3 border rounded-xl" />
              <select value={newStudent.day} onChange={e => setNewStudent({...newStudent, day: e.target.value})} className="w-full p-3 border rounded-xl">
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select value={newStudent.start_time} onChange={e => setNewStudent({...newStudent, start_time: e.target.value})} className="p-3 border rounded-xl">
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={newStudent.end_time} onChange={e => setNewStudent({...newStudent, end_time: e.target.value})} className="p-3 border rounded-xl">
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button onClick={addOrUpdateStudent} className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold">Save Student</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




