import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Radio, 
  User, 
  Mail, 
  ShieldCheck, 
  MapPin,
  AlertCircle,
  CheckCircle2,
  X,
  LogIn,
  LogOut,
  UserPlus,
  Trash2,
  Download,
  Settings,
  Sun,
  Moon,
  Menu,
  RefreshCcw,
  Monitor,
  Activity,
  Stethoscope,
  CloudSun
} from 'lucide-react';
import { 
  format, 
  addWeeks, 
  subWeeks, 
  startOfWeek, 
  addDays, 
  subDays,
  isSameDay, 
  isToday, 
  parseISO,
  startOfHour,
  isBefore,
  addHours,
  isAfter,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  startOfDay,
  endOfDay
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

// Determine if we are running in a native app (Capacitor)
const isNative = window.location.protocol === 'capacitor:' || 
                 window.location.protocol === 'http:' && window.location.hostname === 'localhost' && /Android|iPhone|iPad/i.test(navigator.userAgent);

// THE REMOTE SERVER URL
const REMOTE_SERVER_URL = 'https://booking.ve6ao.ca'; 
const API_BASE_URL = isNative ? REMOTE_SERVER_URL : '';
const caraLogoImage = `${API_BASE_URL}/api/logo`; 

// Types
interface Booking {
  id: string;
  userId: string;
  name: string;
  callsign: string;
  email: string;
  license: string;
  mode: string;
  station: string;
  startTime: string; // ISO string
  notes?: string;
  recurringId?: string;
  createdAt: string;
}

interface UserProfile {
  id: string;
  callsign: string;
  name: string;
  email: string;
  license: string;
  role: 'admin' | 'user';
  pin?: string;
}

interface Station {
  id: string;
  name: string;
  status: 'operational' | 'out-of-service';
  isBooked: boolean;
  lastSeen?: string;
}

const STATIONS = [
  'North Station',
  'South Station',
  'East Station',
  'West Station',
  'Flex Station',
  'Basic+ Station'
];

const LICENSE_CLASSES = ['Basic', 'Basic+', 'Advanced'];
const MODES = ['In-Person', 'Remote'];

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);
  const [kioskLogs, setKioskLogs] = useState<any[]>([]);
  const [kioskPin, setKioskPin] = useState('');
  const [kioskUser, setKioskUser] = useState<any>(null);
  const [kioskActiveLog, setKioskActiveLog] = useState<any>(null);
  const [kioskCurrentBooking, setKioskCurrentBooking] = useState<any>(null);
  const [activeKioskLogs, setActiveKioskLogs] = useState<any[]>([]);
  const [kioskInactivityTimeout, setKioskInactivityTimeout] = useState<NodeJS.Timeout | null>(null);

  const resetKioskInactivity = () => {
    if (kioskInactivityTimeout) clearTimeout(kioskInactivityTimeout);
    const timeout = setTimeout(() => {
      setKioskUser(null);
      setKioskPin('');
      setKioskActiveLog(null);
      setKioskCurrentBooking(null);
    }, 10000); // 10 seconds
    setKioskInactivityTimeout(timeout);
  };

  useEffect(() => {
    if (kioskUser) {
      resetKioskInactivity();
      const handleActivity = () => resetKioskInactivity();
      window.addEventListener('mousedown', handleActivity);
      window.addEventListener('keydown', handleActivity);
      return () => {
        window.removeEventListener('mousedown', handleActivity);
        window.removeEventListener('keydown', handleActivity);
        if (kioskInactivityTimeout) clearTimeout(kioskInactivityTimeout);
      };
    }
  }, [kioskUser]);

  const fetchKioskLogs = async () => {
    if (!token) return;
    try {
      const response = await fetch(API_BASE_URL + '/api/kiosk/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setKioskLogs(data);
      }
    } catch (err) { console.error('Failed to fetch kiosk logs'); }
  };

  const fetchActiveKioskLogs = async () => {
    try {
      const response = await fetch(API_BASE_URL + '/api/kiosk/active');
      if (response.ok) {
        const data = await response.json();
        setActiveKioskLogs(data);
      }
    } catch (err) { console.error('Failed to fetch active kiosk logs'); }
  };

  useEffect(() => {
    fetchActiveKioskLogs();
    const interval = setInterval(fetchActiveKioskLogs, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleKioskLogin = async (pin: string) => {
    try {
      setError('');
      const response = await fetch(API_BASE_URL + '/api/kiosk/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setKioskUser(data.user);
        setKioskActiveLog(data.activeLog);
        setKioskCurrentBooking(data.currentBooking);
        setKioskPin('');
      } else {
        setError(data.error || 'Invalid PIN');
        setTimeout(() => setError(null), 3000);
        setKioskPin('');
      }
    } catch (err) { 
      setError('Kiosk login failed'); 
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleKioskCheckIn = async (station: string) => {
    if (!kioskUser) return;
    try {
      const response = await fetch(API_BASE_URL + '/api/kiosk/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: kioskUser.id, station })
      });
      if (response.ok) {
        const data = await response.json();
        setKioskActiveLog(data);
        setSuccess(`Checked in to ${station}`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) { setError('Check-in failed'); }
  };

  const handleKioskCheckOut = async () => {
    if (!kioskUser) return;
    try {
      const response = await fetch(API_BASE_URL + '/api/kiosk/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: kioskUser.id })
      });
      if (response.ok) {
        setKioskActiveLog(null);
        setSuccess('Checked out successfully');
        setTimeout(() => {
          setSuccess(null);
          setKioskUser(null);
        }, 2000);
      }
    } catch (err) { setError('Check-out failed'); }
  };

  const handleUpdateMyPin = async (pin: string) => {
    if (!token) return;
    try {
      const response = await fetch(API_BASE_URL + '/api/me/pin', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pin })
      });
      if (response.ok) {
        const data = await response.json();
        setSuccess('Your PIN has been updated');
        setUser(prev => prev ? { ...prev, pin: data.pin } : null);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update PIN');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) { setError('Failed to update PIN'); }
  };

  const handleUpdatePin = async (userId: string, pin: string) => {
    if (!token) return;
    try {
      const response = await fetch(API_BASE_URL + `/api/users/${userId}/pin`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pin })
      });
      if (response.ok) {
        setSuccess('PIN updated');
        fetchUsers();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update PIN');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) { setError('Failed to update PIN'); }
  };

  const downloadLogsCSV = () => {
    const headers = ['Operator Callsign', 'Operator Name', 'Station', 'Start Time', 'End Time', 'Duration (mins)'];
    const rows = kioskLogs.slice().reverse().map(log => {
      const start = parseISO(log.startTime);
      const end = log.endTime ? parseISO(log.endTime) : null;
      const duration = end ? Math.round((end.getTime() - start.getTime()) / 60000) : '';
      
      return [
        log.callsign,
        log.userName,
        log.station,
        format(start, 'yyyy-MM-dd HH:mm:ss'),
        end ? format(end, 'yyyy-MM-dd HH:mm:ss') : 'Active',
        duration
      ].map(field => `"${field}"`).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `kiosk-logs-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadBookingsCSV = () => {
    const headers = ['Callsign', 'Operator Name', 'Station', 'Start Time', 'Mode', 'License', 'Notes'];
    const rows = bookings.slice().sort((a, b) => b.startTime.localeCompare(a.startTime)).map(b => {
      const start = parseISO(b.startTime);
      return [
        b.callsign,
        b.name,
        b.station,
        format(start, 'yyyy-MM-dd HH:mm:ss'),
        b.mode,
        b.license,
        b.notes || ''
      ].map(field => `"${field.toString().replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `calendar-bookings-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedSlotDate, setSelectedSlotDate] = useState<Date | null>(null);
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('ve6ao_token'));
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');

  // Auth Form State
  const [authForm, setAuthForm] = useState({
    callsign: '',
    password: '',
    name: '',
    email: '',
    license: 'Basic',
    pin: ''
  });

  // Booking Form State
  const [formData, setFormData] = useState({
    name: '',
    callsign: '',
    email: '',
    license: 'Basic',
    mode: 'In-Person',
    station: STATIONS[0],
    notes: '',
    recurring: 1
  });

  // Fetch current user
  useEffect(() => {
    if (token) {
      fetch(API_BASE_URL + '/api/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Session expired');
      })
      .then(data => {
        setUser(data);
        // Pre-fill booking form
        setFormData(prev => ({
          ...prev,
          name: data.name,
          callsign: data.callsign,
          email: data.email,
          license: data.license
        }));
      })
      .catch(() => {
        setToken(null);
        localStorage.removeItem('ve6ao_token');
      });
    }
  }, [token]);

  // Fetch bookings
  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching bookings...');
      const response = await fetch(API_BASE_URL + '/api/bookings');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Fetch bookings failed:', response.status, errorData);
        throw new Error(errorData.error || `Failed to fetch bookings (${response.status})`);
      }
      const data = await response.json();
      console.log('Bookings loaded:', data.length);
      setBookings(data);
      fetchStations(); // Refresh stations when bookings change
    } catch (err) {
      console.error('Error in fetchBookings:', err);
      setError(err instanceof Error ? err.message : 'Could not load bookings.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStations = async () => {
    try {
      const response = await fetch(API_BASE_URL + '/api/stations');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Fetch stations failed:', response.status, errorData);
        return;
      }
      const data = await response.json();
      setStations(data);
    } catch (err) { 
      console.error('Error in fetchStations:', err); 
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchStations();
  }, []);

  // Calendar Logic
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handlePrev = () => {
    if (viewMode === 'day') setCurrentDate(subDays(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNext = () => {
    if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date());
  };

  const handleSlotClick = (date: Date, hour: number, stationName?: string) => {
    const slotBookings = getBookingsForSlot(date, hour);
    
    if (stationName) {
      const existingBooking = slotBookings.find(b => b.station === stationName);
      if (existingBooking) {
        setSelectedBooking(existingBooking);
        setIsDetailsModalOpen(true);
        return;
      }
    }

    if (!user) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }

    const slotDate = new Date(date);
    slotDate.setHours(hour, 0, 0, 0);
    
    if (isBefore(slotDate, new Date())) {
      setError('Cannot book slots in the past.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Handle Multi-Select Logic
    if (selectedSlotDate && isSameDay(selectedSlotDate, date)) {
      if (selectedHours.includes(hour)) {
        const newHours = selectedHours.filter(h => h !== hour);
        if (newHours.length === 0) {
          setSelectedSlotDate(null);
          setSelectedHours([]);
          setIsModalOpen(false);
        } else {
          setSelectedHours(newHours);
        }
      } else {
        setSelectedHours(prev => [...prev, hour].sort((a, b) => a - b));
        setIsModalOpen(true);
      }
    } else {
      setSelectedSlotDate(date);
      setSelectedHours([hour]);
      setIsModalOpen(true);
    }

    if (stationName) {
      setFormData(prev => ({ ...prev, station: stationName }));
    } else {
      const bookedStations = slotBookings.map(b => b.station);
      const availableStation = STATIONS.find(s => !bookedStations.includes(s));
      if (availableStation) {
        setFormData(prev => ({ ...prev, station: availableStation }));
      }
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
    try {
      const response = await fetch(API_BASE_URL + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setToken(data.token);
      localStorage.setItem('ve6ao_token', data.token);
      setUser(data.user);
      setIsAuthModalOpen(false);
      setSuccess(`Welcome back, ${data.user.callsign}!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('ve6ao_token');
    setUser(null);
    setSuccess('Logged out successfully.');
    setTimeout(() => setSuccess(null), 3000);
  };

  const [showSuccessModal, setShowSuccessModal] = useState<Booking | null>(null);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotDate || selectedHours.length === 0 || !token) return;

    try {
      setLoading(true);
      const results = [];
      
      for (const hour of selectedHours) {
        const startTime = new Date(selectedSlotDate);
        startTime.setHours(hour, 0, 0, 0);

        const response = await fetch(API_BASE_URL + '/api/bookings', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...formData,
            startTime: startTime.toISOString()
          })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Booking failed');
        results.push(result);
      }

      setShowSuccessModal(results[0]);
      setIsModalOpen(false);
      setSelectedHours([]);
      setSelectedSlotDate(null);
      fetchBookings();
      setSuccess(`Successfully booked ${selectedHours.length} time slots!`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message);
      // Keep modal open so user can fix issues
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    if (!token) return;

    try {
      const response = await fetch(API_BASE_URL + `/api/bookings/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to cancel booking');

      setSuccess('Booking cancelled.');
      fetchBookings();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const downloadICS = (booking: Booking) => {
    const start = parseISO(booking.startTime);
    const end = addHours(start, 1);
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${formatDate(start)}`,
      `DTEND:${formatDate(end)}`,
      `SUMMARY:VE6AO Radio Booking - ${booking.station}`,
      `DESCRIPTION:Callsign: ${booking.callsign}\\nMode: ${booking.mode}`,
      `LOCATION:${booking.station}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `ve6ao-booking-${booking.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isSlotBooked = (date: Date, hour: number, station: string) => {
    const slotTime = new Date(date);
    slotTime.setHours(hour, 0, 0, 0);
    const isoString = slotTime.toISOString();
    return bookings.some(b => b.startTime === isoString && b.station === station);
  };

  const getBookingsForSlot = (date: Date, hour: number) => {
    const slotTime = new Date(date);
    slotTime.setHours(hour, 0, 0, 0);
    const isoString = slotTime.toISOString();
    return bookings.filter(b => b.startTime === isoString);
  };

  const myUpcomingBookings = useMemo(() => {
    if (!user) return [];
    return bookings
      .filter(b => (b.userId === user.id || user.role === 'admin') && isAfter(parseISO(b.startTime), new Date()))
      .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());
  }, [bookings, user]);

  const currentOnAir = useMemo(() => {
    // Combine scheduled bookings for the current hour with active kiosk logs
    const now = new Date();
    const currentHour = now.getHours();
    const todayStr = now.toISOString().split('T')[0];
    
    const scheduled = bookings.filter(b => {
      const bDate = b.startTime.split('T')[0];
      const bHour = new Date(b.startTime).getHours();
      return bDate === todayStr && bHour === currentHour;
    });

    // Map active kiosk logs to a similar format
    const activeKiosk = activeKioskLogs.map(log => ({
      id: `kiosk-${log.id}`,
      callsign: log.callsign,
      station: log.station,
      isKiosk: true,
      userId: log.userId
    }));

    // Merge them, prioritizing kiosk logs if the same user is in both
    const combined = [...activeKiosk];
    scheduled.forEach(b => {
      if (!combined.some(a => a.userId === b.userId && a.station === b.station)) {
        combined.push({ ...b, isKiosk: false });
      }
    });

    return combined;
  }, [bookings, activeKioskLogs]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'dark' | 'light') || 'light';
    }
    return 'light';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'my-bookings' | 'kiosk' | 'kiosk-admin' | 'admin'>('calendar');
  const [solarData, setSolarData] = useState<any>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStation, setReportStation] = useState<Station | null>(null);
  const [reportForm, setReportForm] = useState({ severity: 'low', description: '' });

  // Solar Data Fetching
  const fetchSolarData = async () => {
    try {
      const response = await fetch(API_BASE_URL + '/api/solar');
      if (response.ok) {
        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        // The data is nested inside <solardata>
        const solarNode = xml.querySelector('solardata');
        if (solarNode) {
          const data: any = {};
          solarNode.childNodes.forEach((node: any) => {
            if (node.nodeType === 1) { // Element node
              data[node.nodeName] = node.textContent;
            }
          });
          setSolarData(data);
        }
      }
    } catch (err) { console.error('Failed to fetch solar data'); }
  };

  useEffect(() => {
    fetchSolarData();
    const interval = setInterval(fetchSolarData, 600000); // 10 mins
    return () => clearInterval(interval);
  }, []);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportStation || !token) return;

    try {
      const response = await fetch(API_BASE_URL + `/api/stations/${reportStation.id}/report`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reportForm)
      });

      if (response.ok) {
        setSuccess('Health report submitted. The station team has been notified.');
        setIsReportModalOpen(false);
        setReportForm({ severity: 'low', description: '' });
        fetchStations();
        setTimeout(() => setSuccess(null), 5000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit report');
      }
    } catch (err) { setError('Failed to submit report'); }
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // Fetch all users for admin
  const fetchUsers = async () => {
    if (!token || user?.role !== 'admin') return;
    try {
      const response = await fetch(API_BASE_URL + '/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setAllUsers(await response.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (activeTab === 'admin' || activeTab === 'kiosk-admin') {
      fetchUsers();
    }
    if (activeTab === 'kiosk-admin') {
      fetchKioskLogs();
    }
  }, [activeTab]);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!token) return;
    try {
      const response = await fetch(API_BASE_URL + `/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (response.ok) {
        setSuccess('User role updated.');
        fetchUsers();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) { setError('Failed to update role.'); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This will also remove all their bookings.')) return;
    if (!token) return;
    try {
      const response = await fetch(API_BASE_URL + `/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setSuccess('User deleted.');
        fetchUsers();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete user.');
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) { setError('Failed to delete user.'); }
  };

  const handleUpdateStationStatus = async (stationId: string, newStatus: string) => {
    if (!token) return;
    try {
      const response = await fetch(API_BASE_URL + `/api/stations/${stationId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        setSuccess('Station status updated.');
        fetchStations();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) { setError('Failed to update station.'); }
  };

  // Environment Widgets Component
  const EnvironmentWidgets = () => (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6 ${isMobileMenuOpen ? 'p-2' : ''}`}>
      {/* Solar Widget */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`lg:col-span-3 p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 flex flex-col gap-3 md:gap-4 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-amber-500">
            <CloudSun className="w-5 h-5" />
            <h3 className="text-xs md:text-sm font-black uppercase tracking-widest leading-none">Solar Conditions</h3>
          </div>
          <button onClick={fetchSolarData} className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-600 hover:text-zinc-400' : 'hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600'}`}>
            <RefreshCcw className="w-3 h-3" />
          </button>
        </div>

        {solarData ? (
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <div className="text-center">
              <p className="text-[9px] md:text-[10px] font-black uppercase text-zinc-500 mb-1">SFI</p>
              <p className="text-lg md:text-xl font-black">{solarData.solarflux || 'N/A'}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] md:text-[10px] font-black uppercase text-zinc-500 mb-1">SN</p>
              <p className="text-lg md:text-xl font-black">{solarData.sunspots || 'N/A'}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] md:text-[10px] font-black uppercase text-zinc-500 mb-1">K-Index</p>
              <p className="text-lg md:text-xl font-black">{solarData.kindex || 'N/A'}</p>
            </div>
          </div>
        ) : (
          <div className="h-10 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </motion.div>

      {/* Station Quick Health */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`lg:col-span-7 p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 flex flex-col gap-3 md:gap-4 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}
      >
        <div className="flex items-center gap-3 text-emerald-500">
          <Activity className="w-5 h-5" />
          <h3 className="text-xs md:text-sm font-black uppercase tracking-widest leading-none">Station Status</h3>
        </div>
        <div className="flex flex-wrap md:flex-nowrap gap-4 md:gap-2 justify-between">
          {stations.map(s => {
            const isOnline = s.lastSeen && (new Date().getTime() - new Date(s.lastSeen).getTime()) < 120000; // 2 minutes threshold
            return (
              <div key={s.id} className="flex flex-col items-center gap-1.5 min-w-[50px] md:min-w-[60px] flex-1">
                <div className="relative">
                  <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${
                    s.status === 'operational' ? 'bg-emerald-500' : 
                    s.status === 'maintenance' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
                  }`} />
                  {isOnline && (
                    <div className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse border border-white dark:border-zinc-900" title="Agent Online" />
                  )}
                </div>
                <span className="text-[8px] md:text-[9px] font-bold uppercase truncate w-full text-center text-zinc-500">{s.name.split(' ')[0]}</span>
                <span className={`text-[7px] font-black uppercase tracking-tighter ${isOnline ? 'text-blue-400' : 'text-zinc-600 opacity-50'}`}>
                  {isOnline ? 'Active' : 'Offline'}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Quick Report Widget */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`lg:col-span-2 p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all hover:scale-[0.98] ${theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700' : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 shadow-sm'}`}
        onClick={() => {
          if (!user) {
            setIsAuthModalOpen(true);
            return;
          }
          setReportStation(stations[0]);
          setIsReportModalOpen(true);
          if (isMobileMenuOpen) setIsMobileMenuOpen(false);
        }}
      >
        <div className="flex flex-col items-center gap-1 md:gap-2 text-zinc-500">
          <Stethoscope className="w-5 h-5 md:w-6 md:h-6 mb-0.5" />
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-center leading-tight">Report Issue</span>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-950 text-zinc-50' : 'bg-zinc-50 text-zinc-900'} font-sans selection:bg-zinc-500/30`}>
      {/* Header */}
      <header className={`border-b ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-white/80'} backdrop-blur-md sticky top-0 z-30`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center overflow-hidden">
              <img 
                src={caraLogoImage} 
                alt="CARA Logo" 
                className="w-full h-full object-contain p-1"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">VE6AO Bookings</h1>
              <p className={`text-[10px] ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} font-mono uppercase tracking-widest`}>Calgary Amateur Radio Association</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 ml-4">
            <button 
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'calendar' ? (theme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-900') : (theme === 'dark' ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600')}`}
            >
              Calendar
            </button>
            {user && (
              <button 
                onClick={() => setActiveTab('my-bookings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'my-bookings' ? (theme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-900') : (theme === 'dark' ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600')}`}
              >
                My Bookings
              </button>
            )}
            <button 
              onClick={() => setActiveTab('kiosk')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'kiosk' ? (theme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-900') : (theme === 'dark' ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600')}`}
            >
              Kiosk
            </button>
            {user?.role === 'admin' && (
              <>
                <button 
                  onClick={() => {
                    setActiveTab('kiosk-admin');
                    fetchKioskLogs();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'kiosk-admin' ? (theme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-900') : (theme === 'dark' ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600')}`}
                >
                  Kiosk Admin
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('admin');
                    fetchKioskLogs();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'admin' ? (theme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-900') : (theme === 'dark' ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600')}`}
                >
                  Admin
                </button>
              </>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-4 px-4 border-l border-zinc-800/50">
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors border ${theme === 'dark' ? 'hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900'}`}
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="hidden md:flex items-center gap-4">
                {user ? (
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold">{user.callsign}</p>
                      <p className={`text-[10px] uppercase tracking-widest ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>{user.role}</p>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className={`p-2 rounded-lg transition-colors border ${theme === 'dark' ? 'hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900'}`}
                      title="Logout"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-bold transition-all shadow-lg shadow-black/20 text-white border border-zinc-700"
                  >
                    <LogIn className="w-4 h-4" /> Login
                  </button>
                )}
            </div>

            <button 
              className="md:hidden p-2 rounded-lg border border-zinc-800"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`md:hidden border-t ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'} overflow-hidden`}
            >
              <div className="p-4 flex flex-col gap-4">
                {user ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">{user.callsign}</p>
                        <p className="text-xs text-zinc-500 uppercase">{user.role}</p>
                      </div>
                      <button onClick={handleLogout} className="text-red-400 text-sm font-bold">Logout</button>
                    </div>
                    {user.role === 'admin' && (
                      <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800/50">
                        <button 
                          onClick={() => { 
                            setActiveTab('admin'); 
                            setIsMobileMenuOpen(false); 
                            fetchKioskLogs();
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'admin' ? (theme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-900') : (theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}`}
                        >
                          <Settings className="w-4 h-4" /> Admin Panel
                        </button>
                        <button 
                          onClick={() => { setActiveTab('kiosk-admin'); setIsMobileMenuOpen(false); }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'kiosk-admin' ? (theme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-900') : (theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}`}
                        >
                          <ShieldCheck className="w-4 h-4" /> Kiosk Admin
                        </button>
                      </div>
                    )}
                    <div className={`flex flex-col gap-2 pt-2 border-t ${theme === 'dark' ? 'border-zinc-800/50' : 'border-zinc-200'}`}>
                      <button 
                        onClick={() => { setActiveTab('calendar'); setIsMobileMenuOpen(false); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'calendar' ? (theme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-900') : (theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}`}
                      >
                        <CalendarIcon className="w-4 h-4" /> Calendar
                      </button>
                      <button 
                        onClick={() => { setActiveTab('my-bookings'); setIsMobileMenuOpen(false); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'my-bookings' ? (theme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-900') : (theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}`}
                      >
                        <Radio className="w-4 h-4" /> My Bookings
                      </button>
                      <button 
                        onClick={() => { setActiveTab('kiosk'); setIsMobileMenuOpen(false); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'kiosk' ? (theme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-900') : (theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}`}
                      >
                        <Monitor className="w-4 h-4" /> Kiosk
                      </button>
                    </div>
                    <div className="mt-4 border-t border-zinc-800/50 pt-4">
                      <EnvironmentWidgets />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-4">
                    <button 
                      onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }}
                      className="w-full py-2 bg-zinc-800 rounded-lg font-bold text-white border border-zinc-700"
                    >
                      Login
                    </button>
                    <div className="mt-2 text-zinc-500">
                       <EnvironmentWidgets />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Global Alerts */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}
          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400"
            >
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{success}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'calendar' ? (
          <>
            {/* Radio Environment Widgets (Hidden on mobile home page, shown in menu) */}
            <div className="hidden md:block mb-8">
              <EnvironmentWidgets />
            </div>

            {/* On-Air Integration */}
            {currentOnAir.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-8 p-6 rounded-3xl border-4 flex flex-col md:flex-row items-center gap-8 ${theme === 'dark' ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-100 shadow-xl'}`}
              >
                <div className="flex items-center gap-4 text-red-500">
                  <div className="relative">
                    <div className="w-4 h-4 rounded-full bg-red-500 animate-ping absolute inset-0 opacity-75" />
                    <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] relative" />
                  </div>
                  <span className="text-xl font-black uppercase tracking-[0.3em] italic">On-Air</span>
                </div>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 flex-1">
                  {currentOnAir.map(b => (
                    <div 
                      key={b.id} 
                      onClick={() => {
                        setSelectedBooking(b as any);
                        setIsDetailsModalOpen(true);
                      }}
                      className={`group relative px-6 py-3 rounded-2xl border-2 text-sm font-black cursor-pointer transition-all hover:scale-105 flex items-center gap-3 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-100 hover:border-red-500/50' : 'bg-white border-zinc-200 text-zinc-900 hover:border-red-500/50 shadow-sm'}`}
                    >
                      <span className="text-red-500">{b.callsign}</span>
                      <span className="opacity-20">|</span>
                      <span>{b.station}</span>
                      {b.isKiosk && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] text-emerald-500 uppercase tracking-tighter">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Calendar Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1 ${theme === 'dark' ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-200/50 border-zinc-200'} p-1 rounded-xl border`}>
                  <button onClick={handlePrev} className={`p-2.5 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900'}`}><ChevronLeft className="w-5 h-5" /></button>
                  <button onClick={handleToday} className={`px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900'}`}>Today</button>
                  <button onClick={handleNext} className={`p-2.5 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900'}`}><ChevronRight className="w-5 h-5" /></button>
                </div>
                <h2 className="ml-4 text-2xl font-black tracking-tight uppercase">
                  {viewMode === 'day' ? format(currentDate, 'MMMM d, yyyy') : 
                   viewMode === 'week' ? `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}` :
                   format(currentDate, 'MMMM yyyy')}
                </h2>
              </div>

              <div className={`flex items-center gap-1 ${theme === 'dark' ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-200/50 border-zinc-200'} p-1 rounded-xl border`}>
                {(['day', 'week', 'month'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                      viewMode === mode 
                        ? (theme === 'dark' ? 'bg-zinc-700 text-white shadow-lg' : 'bg-white text-zinc-900 shadow-sm') 
                        : (theme === 'dark' ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600')
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {isMobile && (
              <div className="flex gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar">
                {weekDays.map(day => (
                    <button
                      key={day.toString()}
                      onClick={() => setSelectedDay(day)}
                      className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-xl border transition-all ${
                        isSameDay(day, selectedDay)
                          ? 'bg-zinc-800 border-zinc-700 text-white shadow-lg shadow-black/40'
                          : theme === 'dark'
                            ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                      }`}
                    >
                    <span className="text-[10px] uppercase font-bold">{format(day, 'EEE')}</span>
                    <span className="text-lg font-bold">{format(day, 'd')}</span>
                  </button>
                ))}
              </div>
            )}            {/* Calendar Grid */}
            <div className={`${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border rounded-3xl overflow-hidden shadow-2xl transition-all`}>
              <div className="overflow-x-auto">
                <div className={`${viewMode === 'month' ? 'min-w-[800px]' : isMobile ? 'w-full' : 'min-w-[800px] md:min-w-full'}`}>
                  {viewMode === 'month' ? (
                    <div className="grid grid-cols-7">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <div key={day} className={`p-4 text-center border-b border-r last:border-r-0 ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900/50 text-zinc-500' : 'border-zinc-200 bg-zinc-50 text-zinc-400'} text-[10px] font-black uppercase tracking-widest`}>
                          {day}
                        </div>
                      ))}
                      {(() => {
                        const monthStart = startOfMonth(currentDate);
                        const monthEnd = endOfMonth(currentDate);
                        const startDay = startOfWeek(monthStart, { weekStartsOn: 1 });
                        const endDay = endOfMonth(monthEnd);
                        const days = eachDayOfInterval({ start: startDay, end: addDays(endDay, (7 - (endDay.getDay() || 7)) % 7) });
                        
                        return days.map((day) => {
                          const dayBookings = bookings.filter(b => isSameDay(parseISO(b.startTime), day));
                          const isCurrentMonth = isSameMonth(day, monthStart);
                          
                          return (
                            <div 
                              key={day.toString()}
                              onClick={() => {
                                const isPast = isBefore(endOfDay(day), new Date());
                                if (!isPast) {
                                  setCurrentDate(day);
                                  setViewMode('day');
                                  // Optionally open booking modal directly
                                  // handleSlotClick(day, new Date().getHours());
                                }
                              }}
                              className={`min-h-[120px] p-2 border-b border-r last:border-r-0 transition-all cursor-pointer hover:bg-zinc-500/5 ${
                                !isCurrentMonth ? (theme === 'dark' ? 'bg-zinc-950/30' : 'bg-zinc-50/30') : ''
                              } ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-xs font-black ${
                                  isToday(day) 
                                    ? 'bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center' 
                                    : !isCurrentMonth ? 'text-zinc-600' : theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
                                }`}>
                                  {format(day, 'd')}
                                </span>
                                {dayBookings.length > 0 && (
                                  <span className="text-[10px] font-bold text-zinc-500">{dayBookings.length} slots</span>
                                )}
                              </div>
                              <div className="space-y-1">
                                {dayBookings.slice(0, 3).map(b => (
                                  <div 
                                    key={b.id}
                                    onClick={() => { setSelectedBooking(b); setIsDetailsModalOpen(true); }}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold truncate cursor-pointer border ${
                                      b.userId === user?.id 
                                        ? 'bg-zinc-700 border-zinc-600 text-white' 
                                        : theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                                    }`}
                                  >
                                    {format(parseISO(b.startTime), 'HH:00')} {b.callsign}
                                  </div>
                                ))}
                                {dayBookings.length > 3 && (
                                  <button 
                                    onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                                    className="text-[9px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
                                  >
                                    + {dayBookings.length - 3} more
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <>
                      {!isMobile && viewMode === 'week' && (
                        <div className={`grid grid-cols-[80px_repeat(7,1fr)] border-b ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'}`}>
                          <div className={`p-4 border-r ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}`} />
                          {weekDays.map((day) => (
                            <div key={day.toString()} className={`p-4 text-center border-r ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'} last:border-r-0 ${isToday(day) ? 'bg-zinc-500/10' : ''}`}>
                              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isToday(day) ? 'text-red-500' : theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>{format(day, 'EEE')}</p>
                              <p className={`text-2xl font-black ${isToday(day) ? 'text-red-500' : ''}`}>{format(day, 'd')}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                        {hours.map((hour) => (
                          <div key={hour} className={`grid ${viewMode === 'day' || isMobile ? 'grid-cols-[80px_1fr]' : 'grid-cols-[80px_repeat(7,1fr)]'} border-b ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'} last:border-b-0`}>
                            <div className={`p-4 text-center border-r ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'} text-lg font-black ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>{hour.toString().padStart(2, '0')}:00</div>
                            {viewMode === 'day' || isMobile ? (
                              (() => {
                                const dayToRender = viewMode === 'day' ? currentDate : selectedDay;
                                const slotBookings = getBookingsForSlot(dayToRender, hour);
                                const isFull = slotBookings.length >= STATIONS.length;
                                const isPast = isBefore(addHours(dayToRender, hour), new Date());
                                return (
                                    <div 
                                      onClick={() => !isPast && handleSlotClick(dayToRender, hour)}
                                      className={`relative min-h-[70px] p-3 transition-all group ${isPast ? theme === 'dark' ? 'bg-zinc-950/50 cursor-not-allowed' : 'bg-zinc-100/50 cursor-not-allowed' : theme === 'dark' ? 'cursor-pointer hover:bg-zinc-800/50' : 'cursor-pointer hover:bg-zinc-50'} ${isToday(dayToRender) ? 'bg-zinc-500/5' : ''} ${selectedSlotDate && isSameDay(dayToRender, selectedSlotDate) && selectedHours.includes(hour) ? 'bg-emerald-500/10' : ''}`}
                                    >
                                    <div className="flex flex-wrap gap-2">
                                      {slotBookings.map((b) => {
                                        const isCheckedIn = activeKioskLogs.some(log => log.userId === b.userId && log.station === b.station && !log.endTime);
                                        return (
                                          <div 
                                            key={b.id} 
                                            onClick={(e) => { e.stopPropagation(); handleSlotClick(dayToRender, hour, b.station); }}
                                            className={`px-3 py-1.5 border rounded-lg text-xs font-bold flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.02] ${b.userId === user?.id ? 'bg-zinc-700 border-zinc-600 text-white shadow-lg' : theme === 'dark' ? 'bg-zinc-800/60 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-800'}`} 
                                          >
                                            <div className="flex items-center gap-2">
                                              {isCheckedIn && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Checked In" />}
                                              <span>{b.callsign} <span className="opacity-40 mx-1">|</span> {b.station}</span>
                                            </div>
                                            {(b.userId === user?.id || user?.role === 'admin') && (
                                              <button onClick={(e) => { e.stopPropagation(); handleCancelBooking(b.id); }} className="hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                                            )}
                                          </div>
                                        );
                                      })}
                                      {!isFull && !isPast && (
                                        <div className="flex items-center gap-2 text-xs font-black text-zinc-500/30 group-hover:text-zinc-500 transition-colors">
                                          <Clock className="w-4 h-4" /> Available
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              weekDays.map((day) => {
                                const slotBookings = getBookingsForSlot(day, hour);
                                const isFull = slotBookings.length >= STATIONS.length;
                                const isPast = isBefore(addHours(day, hour), new Date());

                                return (
                                  <div 
                                    key={day.toString() + hour}
                                    onClick={() => !isPast && handleSlotClick(day, hour)}
                                    className={`relative min-h-[80px] p-2 border-r ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'} last:border-r-0 transition-all group ${isPast ? theme === 'dark' ? 'bg-zinc-950/50 cursor-not-allowed' : 'bg-zinc-100/50 cursor-not-allowed' : theme === 'dark' ? 'cursor-pointer hover:bg-zinc-800/50' : 'cursor-pointer hover:bg-zinc-50'} ${isToday(day) ? 'bg-zinc-500/5' : ''} ${selectedSlotDate && isSameDay(day, selectedSlotDate) && selectedHours.includes(hour) ? 'bg-emerald-500/10 shadow-[inset_0_0_0_2px_#10b981]' : ''}`}
                                  >
                                    <div className="flex flex-wrap gap-1">
                                      {slotBookings.map((b) => {
                                        const isCheckedIn = activeKioskLogs.some(log => log.userId === b.userId && log.station === b.station && !log.endTime);
                                        return (
                                          <div 
                                            key={b.id} 
                                            onClick={(e) => { e.stopPropagation(); handleSlotClick(day, hour, b.station); }}
                                            className={`px-1.5 py-1 border rounded text-[10px] font-black truncate max-w-full flex items-center justify-between gap-1 cursor-pointer transition-all hover:scale-[1.02] ${b.userId === user?.id ? 'bg-zinc-700 border-zinc-600 text-white' : theme === 'dark' ? 'bg-zinc-800/60 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-800'}`} 
                                            title={`${b.callsign} - ${b.station}${isCheckedIn ? ' (Checked In)' : ''}`}
                                          >
                                            <div className="flex items-center gap-1 truncate">
                                              {isCheckedIn && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
                                              <span className="truncate">{b.callsign}</span>
                                            </div>
                                            {(b.userId === user?.id || user?.role === 'admin') && (
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); handleCancelBooking(b.id); }}
                                                className="hover:text-red-400"
                                              >
                                                <X className="w-2.5 h-2.5" />
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                      {!isFull && !isPast && (
                                        <div className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity">
                                          <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 bg-zinc-400/10 px-3 py-1.5 rounded-full border border-zinc-400/20">Book</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : activeTab === 'my-bookings' ? (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
              <h3 className={`text-2xl font-bold flex items-center gap-3 ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900'}`}>
                <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-200 text-zinc-900'}`}>
                  <CalendarIcon className="w-6 h-6" />
                </div>
                {user?.role === 'admin' ? 'All Upcoming Bookings' : 'My Upcoming Bookings'}
              </h3>
              <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' : 'bg-zinc-100 text-zinc-500 border border-zinc-200'}`}>
                {myUpcomingBookings.length} {myUpcomingBookings.length === 1 ? 'Booking' : 'Bookings'}
              </div>
            </div>

            {myUpcomingBookings.length === 0 ? (
              <div className={`text-center py-20 rounded-3xl border-2 border-dashed ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-zinc-50/50'}`}>
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                  <CalendarIcon className="w-8 h-8 text-zinc-500" />
                </div>
                <h4 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>No upcoming bookings</h4>
                <p className="text-zinc-500 text-sm mb-6">You haven't scheduled any radio time yet.</p>
                <button 
                  onClick={() => setActiveTab('calendar')}
                  className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg ${theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700' : 'bg-zinc-900 hover:bg-zinc-800 text-white'}`}
                >
                  Go to Calendar
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {myUpcomingBookings.map(b => (
                  <motion.div 
                    layout
                    key={b.id}
                    className={`p-5 rounded-2xl flex flex-col justify-between border transition-all hover:scale-[1.02] ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 shadow-xl shadow-black/20' : 'bg-white border-zinc-200 shadow-sm hover:shadow-md'}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${theme === 'dark' ? 'text-zinc-300 bg-zinc-800 border-zinc-700' : 'text-zinc-600 bg-zinc-50 border-zinc-200'}`}>
                          {b.station}
                        </span>
                        <div className={`flex items-center gap-1.5 text-xs font-mono ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          <Clock className="w-3.5 h-3.5" />
                          {format(parseISO(b.startTime), 'MMM d, HH:00')}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-600'}`}>
                          {b.callsign.substring(0, 2)}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900'}`}>{b.callsign}</p>
                          <p className={`text-xs ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>{b.name}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${theme === 'dark' ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'}`}>
                          {b.mode}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${theme === 'dark' ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'}`}>
                          {b.license}
                        </span>
                      </div>
                      {b.notes && (
                        <div className={`p-3 rounded-xl text-[11px] italic mb-4 ${theme === 'dark' ? 'bg-zinc-950 text-zinc-400 border border-zinc-800' : 'bg-zinc-50 text-zinc-500 border border-zinc-100'}`}>
                          "{b.notes}"
                        </div>
                      )}
                    </div>
                    <div className={`flex items-center gap-2 pt-4 border-t ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'}`}>
                      <button 
                        onClick={() => downloadICS(b)}
                        className={`p-2.5 rounded-xl transition-colors border ${theme === 'dark' ? 'hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-zinc-900'}`}
                        title="Add to Calendar"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleCancelBooking(b.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${theme === 'dark' ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400' : 'bg-red-50 hover:bg-red-100 border border-red-100 text-red-600'}`}
                      >
                        <Trash2 className="w-4 h-4" /> Cancel Booking
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        ) : activeTab === 'kiosk' ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            {!kioskUser ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`w-full max-w-4xl p-8 rounded-3xl border-4 shadow-2xl ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                  <div className="text-center md:text-left">
                    <div className={`w-32 h-32 rounded-3xl flex items-center justify-center mx-auto md:mx-0 mb-8 border-2 overflow-hidden ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}`}>
                      <img src={caraLogoImage} alt="CARA Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                    </div>
                    <h2 className="text-5xl font-black uppercase tracking-tighter leading-none mb-4">Kiosk Login</h2>
                    <p className="text-2xl text-zinc-500 font-bold">Enter your 4-digit PIN to begin your session</p>
                    
                    <div className="flex justify-center md:justify-start gap-3 my-12">
                      {[...Array(4)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl font-black transition-all ${
                            kioskPin.length > i 
                              ? theme === 'dark' ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-200 border-zinc-300 text-zinc-900'
                              : theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                          }`}
                        >
                          {kioskPin.length > i ? '•' : ''}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'].map((key) => (
                      <button
                        key={key.toString()}
                        onClick={() => {
                          if (key === 'C') setKioskPin('');
                          else if (key === '⌫') setKioskPin(prev => prev.slice(0, -1));
                          else if (kioskPin.length < 4) {
                            const newPin = kioskPin + key;
                            setKioskPin(newPin);
                            if (newPin.length === 4) {
                              handleKioskLogin(newPin);
                            }
                          }
                        }}
                        className={`h-24 rounded-3xl text-3xl font-black transition-all active:scale-95 flex items-center justify-center ${
                          key === 'C' ? 'bg-red-500/10 text-red-500 border-2 border-red-500/20' :
                          key === '⌫' ? 'bg-zinc-500/10 text-zinc-500 border-2 border-zinc-500/20' :
                          theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-2 border-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-2 border-zinc-200'
                        }`}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-4xl"
              >
                <div className={`p-8 rounded-3xl border-4 shadow-2xl ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                  <div className="flex items-center justify-between mb-12">
                    <div>
                      <h2 className="text-4xl font-black tracking-tighter uppercase">Welcome,  {kioskUser.name}</h2>
                      <p className="text-xl text-zinc-500 font-bold mt-2">{kioskUser.callsign}</p>
                    </div>
                    <button 
                      onClick={() => {
                        setKioskUser(null);
                        setKioskPin('');
                      }}
                      className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest border-2 transition-all ${theme === 'dark' ? 'border-zinc-800 hover:bg-zinc-800' : 'border-zinc-200 hover:bg-zinc-100'}`}
                    >
                      Exit
                    </button>
                  </div>

                  {kioskActiveLog ? (
                    <div className="text-center py-12">
                      <div className="mb-8">
                        <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-emerald-500/20">
                          <Radio className="w-12 h-12 text-emerald-500" />
                        </div>
                        <h3 className="text-3xl font-black uppercase">Currently On-Air</h3>
                        <p className="text-xl text-zinc-500 font-bold mt-2">Station: {kioskActiveLog.station}</p>
                        <p className="text-lg text-zinc-400 font-mono mt-1">Started: {format(parseISO(kioskActiveLog.startTime), 'HH:mm:ss')}</p>
                      </div>
                      <button 
                        onClick={handleKioskCheckOut}
                        className="px-12 py-6 bg-red-600 hover:bg-red-500 rounded-3xl text-2xl font-black text-white shadow-2xl shadow-red-900/40 transition-all uppercase tracking-[0.2em]"
                      >
                        Check Out
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {kioskCurrentBooking ? (
                        <div className={`p-8 rounded-3xl border-4 border-emerald-500/30 bg-emerald-500/5 text-center`}>
                          <h3 className="text-2xl font-black uppercase mb-4">
                            {isBefore(parseISO(kioskCurrentBooking.startTime), new Date()) ? 'You have a booking now!' : 'You have an upcoming booking!'}
                          </h3>
                          <p className="text-lg font-bold text-zinc-400 mb-8">{kioskCurrentBooking.station} @ {format(parseISO(kioskCurrentBooking.startTime), 'HH:mm')}</p>
                          <button 
                            onClick={() => handleKioskCheckIn(kioskCurrentBooking.station)}
                            className="px-12 py-6 bg-emerald-600 hover:bg-emerald-500 rounded-3xl text-2xl font-black text-white shadow-2xl shadow-emerald-900/40 transition-all uppercase tracking-[0.2em]"
                          >
                            Check In Now
                          </button>
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-2xl font-black uppercase mb-8 text-center">No active booking. Select a station to start:</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {stations.map(s => {
                              const isOccupied = s.isBooked || s.status !== 'operational';
                              return (
                                <button
                                  key={s.id}
                                  disabled={isOccupied}
                                  onClick={() => handleKioskCheckIn(s.name)}
                                  className={`p-8 rounded-3xl border-4 text-left transition-all active:scale-95 ${
                                    isOccupied 
                                      ? 'opacity-40 cursor-not-allowed grayscale' 
                                      : theme === 'dark' ? 'bg-zinc-800 border-zinc-700 hover:border-emerald-500/50' : 'bg-zinc-50 border-zinc-200 hover:border-emerald-500/50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-4">
                                    <Radio className={`w-8 h-8 ${isOccupied ? 'text-zinc-500' : 'text-emerald-500'}`} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border-2 ${
                                      s.status === 'operational' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : 'text-red-500 border-red-500/20 bg-red-500/5'
                                    }`}>
                                      {s.status}
                                    </span>
                                  </div>
                                  <h4 className="text-2xl font-black uppercase">{s.name}</h4>
                                  <p className="text-sm font-bold text-zinc-500 mt-1">{isOccupied ? 'Currently Unavailable' : 'Available for use'}</p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        ) : activeTab === 'kiosk-admin' ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-4xl font-black tracking-tighter uppercase">Kiosk Usage Logs</h2>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsLogViewerOpen(true)}
                  className={`px-4 py-2 rounded-xl border-2 font-bold uppercase tracking-widest text-xs transition-all ${theme === 'dark' ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'border-zinc-200 hover:bg-zinc-100 text-zinc-700'}`}
                >
                  View All
                </button>
                <button 
                  onClick={fetchKioskLogs}
                  className={`p-3 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-zinc-800 hover:bg-zinc-800' : 'border-zinc-200 hover:bg-zinc-100'}`}
                  title="Refresh Logs"
                >
                  <RefreshCcw className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className={`rounded-3xl border-4 overflow-hidden ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <table className="w-full text-left">
                <thead>
                  <tr className={`border-b-4 ${theme === 'dark' ? 'border-zinc-800 bg-zinc-950/50' : 'border-zinc-200 bg-zinc-50'}`}>
                    <th className="p-6 text-xs font-black uppercase tracking-widest text-zinc-500">Operator</th>
                    <th className="p-6 text-xs font-black uppercase tracking-widest text-zinc-500">Station</th>
                    <th className="p-6 text-xs font-black uppercase tracking-widest text-zinc-500">Start Time</th>
                    <th className="p-6 text-xs font-black uppercase tracking-widest text-zinc-500">End Time</th>
                    <th className="p-6 text-xs font-black uppercase tracking-widest text-zinc-500">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {kioskLogs.slice().reverse().slice(0, 5).map(log => {
                    const start = parseISO(log.startTime);
                    const end = log.endTime ? parseISO(log.endTime) : null;
                    const duration = end ? Math.round((end.getTime() - start.getTime()) / 60000) : null;

                    return (
                      <tr key={log.id} className={`border-b-2 last:border-0 ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'}`}>
                        <td className="p-6">
                          <p className="text-lg font-black uppercase">{log.callsign}</p>
                          <p className="text-sm font-bold text-zinc-500">{log.userName}</p>
                        </td>
                        <td className="p-6">
                          <span className={`px-4 py-1.5 rounded-xl border-2 text-xs font-black uppercase ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'}`}>
                            {log.station}
                          </span>
                        </td>
                        <td className="p-6 text-sm font-mono text-zinc-400">{format(start, 'MMM d, HH:mm:ss')}</td>
                        <td className="p-6 text-sm font-mono text-zinc-400">{end ? format(end, 'MMM d, HH:mm:ss') : <span className="text-emerald-500 animate-pulse font-black uppercase">Active</span>}</td>
                        <td className="p-6">
                          {duration !== null ? (
                            <span className="text-lg font-black">{duration} <span className="text-xs text-zinc-500 uppercase">min</span></span>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {kioskLogs.length > 5 && (
                <div className={`p-4 text-center border-t-4 ${theme === 'dark' ? 'border-zinc-800 bg-zinc-950/30' : 'border-zinc-200 bg-zinc-50/50'}`}>
                  <button 
                    onClick={() => setIsLogViewerOpen(true)}
                    className={`text-xs font-black uppercase tracking-widest transition-colors ${theme === 'dark' ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                    + {kioskLogs.length - 5} More Logs
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section className={`p-8 rounded-3xl border-4 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                <h3 className="text-2xl font-black uppercase mb-6 flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-emerald-500" />
                  Today's Bookings
                </h3>
                <div className="space-y-4">
                  {bookings
                    .filter(b => isSameDay(parseISO(b.startTime), new Date()))
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map(b => (
                      <div key={b.id} className={`p-4 rounded-2xl border-2 flex items-center justify-between ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                        <div>
                          <p className="text-lg font-black uppercase">{b.callsign}</p>
                          <p className="text-xs font-bold text-zinc-500">{b.station}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-black">{format(parseISO(b.startTime), 'HH:00')}</p>
                          <p className="text-[10px] uppercase font-bold text-zinc-500">Slot</p>
                        </div>
                      </div>
                    ))}
                </div>
              </section>

              <div className="space-y-8">
                <section className={`p-8 rounded-3xl border-4 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                  <h3 className="text-2xl font-black uppercase mb-6 flex items-center gap-3">
                    <LogIn className="w-6 h-6 text-emerald-500" />
                    My Kiosk PIN
                  </h3>
                  <div className="space-y-6">
                    <p className={`text-sm ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Your 4-digit PIN is used to sign in to radio stations at the physical kiosk. Keep it private.
                    </p>
                    <div className="flex items-center gap-4">
                      <input 
                        type="password" 
                        maxLength={4}
                        placeholder="1234"
                        id="my-pin-input"
                        defaultValue={user?.pin || ''}
                        className={`w-32 px-4 py-3 rounded-xl text-center font-mono font-black border-2 tracking-[0.5em] ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`}
                      />
                      <button 
                        onClick={() => {
                          const input = document.getElementById('my-pin-input') as HTMLInputElement;
                          handleUpdateMyPin(input.value);
                        }}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-black text-white uppercase tracking-widest transition-all"
                      >
                        Update PIN
                      </button>
                    </div>
                  </div>
                </section>

                {user?.role === 'admin' && allUsers.length > 0 && (
                  <section className={`p-8 rounded-3xl border-4 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                    <h3 className="text-2xl font-black uppercase mb-6 flex items-center gap-3">
                      <User className="w-6 h-6 text-blue-500" />
                      User PIN Management
                    </h3>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                      {allUsers.map(u => (
                        <div key={u.id} className={`p-4 rounded-2xl border-2 flex items-center justify-between ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                          <div>
                            <p className="text-lg font-black uppercase">{u.callsign}</p>
                            <p className="text-xs font-bold text-zinc-500">{u.name}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <input 
                              type="password" 
                              maxLength={4}
                              placeholder="PIN"
                              id={`pin-input-${u.id}`}
                              className={`w-24 px-3 py-2 rounded-xl text-center font-mono font-black border-2 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}
                            />
                            <button 
                              onClick={() => {
                                const input = document.getElementById(`pin-input-${u.id}`) as HTMLInputElement;
                                handleUpdatePin(u.id, input.value);
                                input.value = '';
                              }}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-black text-white uppercase tracking-widest transition-all"
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'admin' ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-4xl font-black tracking-tighter uppercase">Admin Panel</h2>
              <div className="flex items-center gap-4">
                <button 
                  onClick={fetchUsers}
                  className={`p-3 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-zinc-800 hover:bg-zinc-800' : 'border-zinc-200 hover:bg-zinc-100'}`}
                >
                  <RefreshCcw className="w-6 h-6" />
                </button>
              </div>
            </div>

            <section className={`p-8 rounded-3xl border-4 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <h3 className="text-2xl font-black uppercase mb-6">Station Status</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {stations.map(s => (
                  <div key={s.id} className={`p-6 rounded-2xl border-2 flex items-center justify-between ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${s.status === 'out-of-service' ? 'bg-zinc-500' : 'bg-emerald-500'}`} />
                      <span className="text-lg font-black uppercase">{s.name}</span>
                    </div>
                    <select 
                      value={s.status} 
                      onChange={(e) => handleUpdateStationStatus(s.id, e.target.value)}
                      className={`text-xs font-black uppercase rounded-xl px-4 py-2 outline-none border-2 transition-all ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'}`}
                    >
                      <option value="operational">Operational</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="out-of-service">Out of Service</option>
                    </select>
                  </div>
                ))}
              </div>
            </section>

            <section className={`p-8 rounded-3xl border-4 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black uppercase">Usage Data & Export</h3>
                <ShieldCheck className="w-8 h-8 text-emerald-500 opacity-50" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-6 rounded-2xl border-2 ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
                  <h4 className="text-lg font-black uppercase mb-2">Calendar Bookings</h4>
                  <p className="text-xs text-zinc-500 mb-4 font-bold">Export all scheduled radio time records as a CSV file for auditing.</p>
                  <button 
                    onClick={downloadBookingsCSV}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20"
                  >
                    <Download className="w-4 h-4" /> Export Bookings CSV
                  </button>
                </div>
                <div className={`p-6 rounded-2xl border-2 ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
                  <h4 className="text-lg font-black uppercase mb-2">Kiosk Access Logs</h4>
                  <p className="text-xs text-zinc-500 mb-4 font-bold">Export all physical kiosk sign-in session records as a CSV file.</p>
                  <button 
                    onClick={() => {
                      if (kioskLogs.length === 0) fetchKioskLogs();
                      downloadLogsCSV();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20"
                  >
                    <Download className="w-4 h-4" /> Export Kiosk Logs CSV
                  </button>
                </div>
              </div>
            </section>

            <section className={`p-8 rounded-3xl border-4 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <h3 className="text-2xl font-black uppercase mb-6">User Management</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className={`border-b-4 ${theme === 'dark' ? 'border-zinc-800 bg-zinc-950/50' : 'border-zinc-200 bg-zinc-50'}`}>
                      <th className="p-6 text-xs font-black uppercase tracking-widest text-zinc-500">Callsign</th>
                      <th className="p-6 text-xs font-black uppercase tracking-widest text-zinc-500">Name</th>
                      <th className="p-6 text-xs font-black uppercase tracking-widest text-zinc-500">Role</th>
                      <th className="p-6 text-xs font-black uppercase tracking-widest text-zinc-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y-2 ${theme === 'dark' ? 'divide-zinc-800' : 'divide-zinc-200'}`}>
                    {allUsers.map(u => (
                      <tr key={u.id}>
                        <td className="p-6 font-mono font-black text-lg">{u.callsign}</td>
                        <td className="p-6 font-bold">{u.name}</td>
                        <td className="p-6">
                          <span className={`px-4 py-1 rounded-xl text-[10px] font-black uppercase border-2 ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : theme === 'dark' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-6">
                          {u.id !== user?.id && (
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => handleUpdateRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                                className="text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
                              >
                                {u.role === 'admin' ? 'Demote' : 'Promote'}
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(u.id)}
                                className="text-xs font-black uppercase tracking-widest text-red-500/70 hover:text-red-500 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </motion.div>
        ) : null}
      </main>

      {/* Success Calendar Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className={`relative w-full max-w-md border rounded-3xl shadow-2xl p-8 text-center ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
            >
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Booking Confirmed!</h3>
              <p className={`text-sm mb-8 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Your booking for <strong>{showSuccessModal.station}</strong> on {format(parseISO(showSuccessModal.startTime), 'MMMM d, HH:00')} has been successfully saved.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => downloadICS(showSuccessModal)}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold transition-all text-white shadow-lg shadow-emerald-900/20"
                >
                  <Download className="w-5 h-5" /> Add to Calendar
                </button>
                <button 
                  onClick={() => setShowSuccessModal(null)}
                  className={`w-full py-4 rounded-2xl font-bold transition-all ${theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'}`}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAuthModalOpen(false)} className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`relative w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar border rounded-2xl shadow-2xl p-8 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <div className="text-center mb-8">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 border overflow-hidden ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}`}>
                  <img 
                    src={caraLogoImage}
                    alt="CARA Logo" 
                    className="w-full h-full object-contain p-2"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h3 className="text-2xl font-bold">VE6AO Login</h3>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>{authMode === 'login' ? 'Access your radio bookings' : 'Create an account to start'}</p>
              </div>

              {error && (
                <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Callsign</label>
                  <input required type="text" value={authForm.callsign} onChange={e => setAuthForm({...authForm, callsign: e.target.value.toUpperCase()})} className={`w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-500/50 outline-none ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`} placeholder="VE6XXX" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Password</label>
                  <input required type="password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className={`w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-500/50 outline-none ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`} placeholder="••••••••" />
                </div>

                {authMode === 'register' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Full Name</label>
                      <input required type="text" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className={`w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-500/50 outline-none ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`} placeholder="John Doe" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Email Address</label>
                      <input required type="email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className={`w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-500/50 outline-none ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`} placeholder="john@example.com" />
                    </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">License Class</label>
                        <select value={authForm.license} onChange={e => setAuthForm({...authForm, license: e.target.value})} className={`w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-500/50 outline-none ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}>
                          {LICENSE_CLASSES.map(lc => <option key={lc} value={lc}>{lc}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center justify-between">
                          Kiosk PIN (4 Digits)
                          <span className="text-[10px] font-normal lowercase text-zinc-500">For radio station sign-in</span>
                        </label>
                        <input 
                          required 
                          type="text" 
                          maxLength={4} 
                          pattern="\d{4}"
                          value={authForm.pin} 
                          onChange={e => setAuthForm({...authForm, pin: e.target.value.replace(/\D/g, '')})} 
                          className={`w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-500/50 outline-none ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`} 
                          placeholder="1234" 
                        />
                      </div>
                    </motion.div>
                )}

                <button type="submit" className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold shadow-lg shadow-black/40 transition-all mt-4 text-white border border-zinc-700">
                  {authMode === 'login' ? 'Login' : 'Create Account'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-sm text-zinc-400 hover:text-zinc-300 font-medium">
                  {authMode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Booking Details Modal */}
      <AnimatePresence>
        {isDetailsModalOpen && selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDetailsModalOpen(false)} className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`relative w-full max-w-md border rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <div className={`p-6 border-b flex items-center justify-between ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}`}>
                <div>
                  <h3 className="text-xl font-bold">Booking Details</h3>
                  <p className={`text-sm flex items-center gap-1.5 mt-1 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <Radio className="w-3.5 h-3.5" />
                    {selectedBooking.station}
                  </p>
                </div>
                <button onClick={() => setIsDetailsModalOpen(false)} className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Operator</label>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold border border-zinc-700">
                        {selectedBooking.callsign.substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{selectedBooking.callsign}</p>
                        <p className="text-[10px] text-zinc-500">{selectedBooking.name}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Time Slot</label>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-zinc-400" />
                      <p className="text-sm font-medium">
                        {format(parseISO(selectedBooking.startTime), 'MMM d, HH:00')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Mode</label>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-zinc-400" />
                      <p className="text-sm font-medium">{selectedBooking.mode}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">License</label>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-zinc-400" />
                      <p className="text-sm font-medium">{selectedBooking.license}</p>
                    </div>
                  </div>
                </div>

                {selectedBooking.notes && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Notes / Activity</label>
                    <div className={`p-3 rounded-lg text-sm italic ${theme === 'dark' ? 'bg-zinc-950 text-zinc-400' : 'bg-zinc-50 text-zinc-600'}`}>
                      "{selectedBooking.notes}"
                    </div>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  {(selectedBooking.userId === user?.id || user?.role === 'admin') ? (
                    <button 
                      onClick={() => {
                        handleCancelBooking(selectedBooking.id);
                        setIsDetailsModalOpen(false);
                      }}
                      className="flex-1 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-sm font-bold transition-colors border border-red-500/20"
                    >
                      Cancel Booking
                    </button>
                  ) : (
                    <button 
                      onClick={() => setIsDetailsModalOpen(false)}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'}`}
                    >
                      Close
                    </button>
                  )}
                  <button 
                    onClick={() => downloadICS(selectedBooking)}
                    className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-bold text-white shadow-lg shadow-black/40 border border-zinc-700 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Export
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Booking Modal */}
      <AnimatePresence>
        {isModalOpen && selectedSlotDate && selectedHours.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsModalOpen(false); setSelectedHours([]); setSelectedSlotDate(null); }} className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`relative w-full max-w-lg max-h-[90vh] flex flex-col border rounded-3xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <div className={`p-6 border-b flex items-center justify-between ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}`}>
                <div>
                  <h3 className="text-xl font-bold">New Radio Booking</h3>
                  <div className={`text-sm flex flex-col gap-1 mt-1 ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    <p className="flex items-center gap-1.5 font-bold uppercase tracking-tight">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {format(selectedSlotDate, 'EEEE, MMMM d')}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      Slots: {selectedHours.map(h => `${h.toString().padStart(2, '0')}:00`).join(', ')}
                    </p>
                  </div>
                </div>
                <button onClick={() => { setIsModalOpen(false); setSelectedHours([]); setSelectedSlotDate(null); }} className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}><X className="w-5 h-5" /></button>
              </div>

              <div className="overflow-y-auto custom-scrollbar flex-1">
                {error && (
                  <div className="mx-6 mt-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                
                <form onSubmit={handleBookingSubmit} className="p-6 space-y-4">
                {/* Time Selection Menu */}
                <div className={`p-4 rounded-2xl border-2 mb-4 ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3 block">Adjust Booking Time</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-zinc-500">Starting At</label>
                      <select 
                        value={Math.min(...selectedHours)} 
                        onChange={(e) => {
                          const newStart = parseInt(e.target.value);
                          const duration = Math.max(...selectedHours) - Math.min(...selectedHours) + 1;
                          const newHours = Array.from({ length: duration }, (_, i) => newStart + i).filter(h => h < 24);
                          setSelectedHours(newHours);
                        }}
                        className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-zinc-500">Duration (Hours)</label>
                      <select 
                        value={Math.max(...selectedHours) - Math.min(...selectedHours) + 1}
                        onChange={(e) => {
                          const newDuration = parseInt(e.target.value);
                          const start = Math.min(...selectedHours);
                          const newHours = Array.from({ length: newDuration }, (_, i) => start + i).filter(h => h < 24);
                          setSelectedHours(newHours);
                        }}
                        className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
                      >
                        {[1, 2, 3, 4, 6, 8, 12].map(d => (
                          <option key={d} value={d}>{d} {d === 1 ? 'Hour' : 'Hours'}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2"><User className="w-3 h-3" /> Full Name</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-500/50 outline-none ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Radio className="w-3 h-3" /> Callsign</label>
                    <input required type="text" value={formData.callsign} onChange={e => setFormData({ ...formData, callsign: e.target.value.toUpperCase() })} className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-500/50 outline-none ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Mail className="w-3 h-3" /> Email Address</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-500/50 outline-none ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2"><ShieldCheck className="w-3 h-3" /> License Class</label>
                    <select value={formData.license} onChange={e => setFormData({ ...formData, license: e.target.value })} className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-500/50 outline-none ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                      {LICENSE_CLASSES.map(lc => <option key={lc} value={lc}>{lc}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Clock className="w-3 h-3" /> Operating Mode</label>
                    <select value={formData.mode} onChange={e => setFormData({ ...formData, mode: e.target.value })} className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-500/50 outline-none ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                      {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2"><MapPin className="w-3 h-3" /> Station Selection</label>
                    <select value={formData.station} onChange={e => setFormData({ ...formData, station: e.target.value })} className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-500/50 outline-none ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                      {stations.map(s => {
                        const isAnySlotBooked = selectedHours.some(h => isSlotBooked(selectedSlotDate, h, s.name));
                        const isOutOfService = s.status === 'out-of-service';
                        return (
                          <option key={s.id} value={s.name} disabled={isAnySlotBooked || isOutOfService}>
                            {s.name} {isAnySlotBooked ? '(Slot Taken)' : isOutOfService ? '(Out of Service)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2"><CalendarIcon className="w-3 h-3" /> Recurring</label>
                    <select value={formData.recurring} onChange={e => setFormData({ ...formData, recurring: parseInt(e.target.value) })} className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-500/50 outline-none ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                      <option value={1}>None</option>
                      <option value={2}>Weekly (2 weeks)</option>
                      <option value={4}>Weekly (4 weeks)</option>
                      <option value={8}>Weekly (8 weeks)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">Notes / Activity</label>
                  <textarea 
                    value={formData.notes} 
                    onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-500/50 outline-none min-h-[80px] resize-none ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}
                    placeholder="e.g. Testing new digital interface, participating in contest..."
                  />
                </div>

                {formData.mode === 'Remote' && formData.license !== 'Advanced' && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-400 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p>Remote operation requires an Advanced license class.</p>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => { setIsModalOpen(false); setSelectedHours([]); setSelectedSlotDate(null); }} className={`flex-1 px-4 py-2.5 border rounded-xl text-sm font-bold transition-colors ${theme === 'dark' ? 'border-zinc-800 hover:bg-zinc-800' : 'border-zinc-200 hover:bg-zinc-100'}`}>Cancel</button>
                  <button type="submit" disabled={loading || (formData.mode === 'Remote' && formData.license !== 'Advanced')} className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-white shadow-lg shadow-black/40 border border-zinc-700">
                    {loading ? 'Booking...' : selectedHours.length > 1 ? `Confirm ${selectedHours.length} Slots` : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Health Report Modal */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReportModalOpen(false)} className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className={`relative w-full max-w-md border rounded-3xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
            >
              <div className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Report Problem</h3>
                    <p className="text-sm text-zinc-500 font-bold">Help keep VE6AO stations operational</p>
                  </div>
                </div>

                <form onSubmit={handleReportSubmit} className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Affected Station</label>
                    <select 
                      value={reportStation?.id || ''} 
                      onChange={e => setReportStation(stations.find(s => s.id === e.target.value) || null)}
                      className={`w-full border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500/50 outline-none appearance-none transition-all ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}
                    >
                      {stations.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Issue Severity</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['low', 'medium', 'high'] as const).map(sev => (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => setReportForm({ ...reportForm, severity: sev })}
                          className={`py-2 text-[10px] font-black uppercase tracking-widest rounded-lg border-2 transition-all ${
                            reportForm.severity === sev
                              ? (sev === 'low' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 
                                 sev === 'medium' ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20' : 
                                 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20')
                              : (theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700' : 'bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300')
                          }`}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-2 italic">* High severity will mark station as Maintenance automatically.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Problem Description</label>
                    <textarea 
                      required
                      value={reportForm.description}
                      onChange={e => setReportForm({ ...reportForm, description: e.target.value })}
                      placeholder="e.g. Broken microphone cable, High SWR on 20m, Computer won't boot..."
                      className={`w-full border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500/50 outline-none transition-all min-h-[120px] resize-none ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setIsReportModalOpen(false)} className={`flex-1 px-4 py-3 border rounded-xl text-xs font-black uppercase tracking-widest transition-all ${theme === 'dark' ? 'border-zinc-800 hover:bg-zinc-800' : 'border-zinc-200 hover:bg-zinc-100'}`}>Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-red-900/20">Submit Report</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Log Viewer Modal */}
      <AnimatePresence>
        {isLogViewerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsLogViewerOpen(false)} className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`relative w-full max-w-5xl max-h-[90vh] flex flex-col border rounded-3xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <div className={`p-6 border-b flex items-center justify-between ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}`}>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Full Kiosk Logs</h3>
                  <p className={`text-sm mt-1 font-bold ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {kioskLogs.length} total records
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={downloadLogsCSV}
                    className={`px-4 py-2 rounded-xl border-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${theme === 'dark' ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-zinc-200 hover:bg-zinc-100 text-zinc-700'}`}
                  >
                    <Download className="w-4 h-4" /> Export CSV
                  </button>
                  <button onClick={() => setIsLogViewerOpen(false)} className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}><X className="w-6 h-6" /></button>
                </div>
              </div>

              <div className="overflow-y-auto custom-scrollbar flex-1 p-6">
                <table className="w-full text-left">
                  <thead className="sticky top-0 z-10 backdrop-blur-md">
                    <tr className={`border-b-4 ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900/90' : 'border-zinc-200 bg-white/90'}`}>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-zinc-500">Operator</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-zinc-500">Station</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-zinc-500">Start Time</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-zinc-500">End Time</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-zinc-500">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kioskLogs.slice().reverse().map(log => {
                      const start = parseISO(log.startTime);
                      const end = log.endTime ? parseISO(log.endTime) : null;
                      const duration = end ? Math.round((end.getTime() - start.getTime()) / 60000) : null;

                      return (
                        <tr key={log.id} className={`border-b-2 last:border-0 ${theme === 'dark' ? 'border-zinc-800/50 hover:bg-zinc-800/30' : 'border-zinc-100 hover:bg-zinc-50'}`}>
                          <td className="p-4">
                            <p className="text-base font-black uppercase">{log.callsign}</p>
                            <p className="text-xs font-bold text-zinc-500">{log.userName}</p>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-lg border-2 text-[10px] font-black uppercase ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'}`}>
                              {log.station}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-mono text-zinc-500">{format(start, 'MMM d, HH:mm:ss')}</td>
                          <td className="p-4 text-xs font-mono text-zinc-500">{end ? format(end, 'MMM d, HH:mm:ss') : <span className="text-emerald-500 animate-pulse font-black uppercase">Active</span>}</td>
                          <td className="p-4">
                            {duration !== null ? (
                              <span className="text-sm font-black">{duration} <span className="text-[10px] text-zinc-500 uppercase">min</span></span>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      `}</style>
    </div>
  );
}
