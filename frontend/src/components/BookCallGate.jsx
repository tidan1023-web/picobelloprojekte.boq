import React, { useState } from 'react';
import { Calendar, Clock, CheckCircle, Building2, ChevronLeft, ChevronRight, MapPin, Phone, Mail, Play } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const TIME_SLOTS = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];

// Replace this with your actual YouTube/Vimeo embed URL when ready
const VIDEO_EMBED_URL = null; // e.g. 'https://www.youtube.com/embed/YOUR_VIDEO_ID'

function getAvailableDays(count = 14) {
  const days = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  while (days.length < count) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

const DAY_NAMES   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function fmt(date) {
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function VideoBlock() {
  if (VIDEO_EMBED_URL) {
    return (
      <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-200 aspect-video">
        <iframe
          src={VIDEO_EMBED_URL}
          title="Pico Bello Onboarding"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 aspect-video flex flex-col items-center justify-center gap-3 text-center px-6">
      <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
        <Play size={22} className="text-primary-900 ml-1" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700">Onboarding Video</p>
        <p className="text-xs text-gray-400 mt-1">Your intro video will appear here.<br />Replace <code className="bg-gray-100 px-1 rounded text-xs">VIDEO_EMBED_URL</code> in <code className="bg-gray-100 px-1 rounded text-xs">BookCallGate.jsx</code></p>
      </div>
    </div>
  );
}

export default function BookCallGate() {
  const { user, setUser } = useAuth();
  const [days]        = useState(() => getAvailableDays(14));
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [booked, setBooked]   = useState(user?.callBooked || false);
  const [bookedSlot, setBookedSlot] = useState(user?.callBookedSlot || '');

  const weekDays     = days.slice(weekOffset * 5, weekOffset * 5 + 5);
  const canGoBack    = weekOffset > 0;
  const canGoForward = (weekOffset + 1) * 5 < days.length;

  const handleBook = async () => {
    if (!selectedDay || !selectedTime) return;
    const slot = `${fmt(selectedDay)} at ${selectedTime}`;
    setSaving(true);
    try {
      const { data } = await api.patch('/auth/me/book-call', { slot });
      setUser(data.user);
      setBookedSlot(slot);
      setBooked(true);
    } catch {
      setSaving(false);
    }
  };

  if (booked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">You're on the calendar!</h1>
          <p className="text-sm text-gray-500 mb-4">Your onboarding call is booked for</p>
          <div className="bg-primary-50 border border-primary-200 rounded-xl px-5 py-3 mb-6 inline-block">
            <p className="font-semibold text-primary-900 text-sm">{bookedSlot}</p>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            We'll walk you through everything before you get started. Keep an eye out for a confirmation from our team.
          </p>

          <div className="mt-6 pt-6 border-t border-gray-100 space-y-2 text-left">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Our Office</p>
            <div className="flex items-start gap-2.5 text-sm text-gray-600">
              <MapPin size={14} className="text-primary-900 mt-0.5 shrink-0" />
              <span>Garki, Abuja, Nigeria</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              <Phone size={14} className="text-primary-900 shrink-0" />
              <a href="tel:+2340000000000" className="hover:text-primary-900 transition-colors">+234 000 000 0000</a>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              <Mail size={14} className="text-primary-900 shrink-0" />
              <a href="mailto:hello@picobelloprojekte.com" className="hover:text-primary-900 transition-colors">hello@picobelloprojekte.com</a>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Building2 size={13} />
            <span>Pico Bello Projekte</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-primary-900 rounded-2xl px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
              <Building2 size={18} />
            </div>
            <span className="font-bold">Pico Bello Projekte</span>
          </div>
          <h1 className="text-xl font-bold mb-1">Welcome, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-sm text-blue-200">
            Watch the intro video below, then pick a time for your onboarding call so we can get you set up properly.
          </p>
        </div>

        {/* Two-column: video + contact | calendar */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Left — video + contact */}
          <div className="space-y-5">
            <VideoBlock />

            {/* Contact + location */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Get in Touch</p>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                  <MapPin size={15} className="text-primary-900" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Office</p>
                  <p className="text-sm text-gray-500">Garki, Abuja, Nigeria</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                  <Phone size={15} className="text-primary-900" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Phone</p>
                  <a href="tel:+2340000000000" className="text-sm text-gray-500 hover:text-primary-900 transition-colors">
                    +234 000 000 0000
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                  <Mail size={15} className="text-primary-900" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Email</p>
                  <a href="mailto:hello@picobelloprojekte.com" className="text-sm text-gray-500 hover:text-primary-900 transition-colors">
                    hello@picobelloprojekte.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right — booking calendar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5 text-sm text-gray-500">
              <Calendar size={15} className="text-primary-900" />
              <span>Pick a date and time that works for you</span>
            </div>

            {/* Day picker */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => { setWeekOffset((w) => w - 1); setSelectedDay(null); setSelectedTime(null); }}
                  disabled={!canGoBack}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {MONTH_NAMES[weekDays[0]?.getMonth()]} {weekDays[0]?.getFullYear()}
                </span>
                <button
                  onClick={() => { setWeekOffset((w) => w + 1); setSelectedDay(null); setSelectedTime(null); }}
                  disabled={!canGoForward}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {weekDays.map((day, i) => {
                  const isSelected = selectedDay?.toDateString() === day.toDateString();
                  return (
                    <button key={i}
                      onClick={() => { setSelectedDay(day); setSelectedTime(null); }}
                      className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 text-center transition-colors ${
                        isSelected
                          ? 'border-primary-900 bg-primary-900 text-white'
                          : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                      }`}>
                      <span className={`text-xs font-medium mb-1 ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                        {DAY_NAMES[day.getDay()]}
                      </span>
                      <span className="text-lg font-bold leading-none">{day.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slots */}
            {selectedDay && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
                  <Clock size={14} className="text-primary-900" />
                  <span>Times on <strong className="text-gray-700">{fmt(selectedDay)}</strong></span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((t) => {
                    const isSelected = selectedTime === t;
                    return (
                      <button key={t}
                        onClick={() => setSelectedTime(t)}
                        className={`py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                          isSelected
                            ? 'border-primary-900 bg-primary-900 text-white'
                            : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-gray-700'
                        }`}>
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Confirm summary */}
            {selectedDay && selectedTime && (
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-5">
                <p className="text-sm text-primary-900 font-medium">
                  📅 {fmt(selectedDay)} at {selectedTime}
                </p>
                <p className="text-xs text-primary-700 mt-0.5">30-minute onboarding call · Video or phone</p>
              </div>
            )}

            <button
              onClick={handleBook}
              disabled={!selectedDay || !selectedTime || saving}
              className="w-full bg-primary-900 text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {saving ? 'Booking…' : 'Confirm Booking'}
            </button>

            <p className="text-xs text-gray-400 text-center mt-3">
              All times are in West Africa Time (WAT, UTC+1)
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
