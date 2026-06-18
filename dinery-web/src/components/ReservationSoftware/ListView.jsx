// src/components/reservation-software/ListView.jsx
import React, { useState } from 'react';
import { 
  FiChevronLeft, FiChevronRight, FiUser, FiPhone, FiMail, 
  FiClock, FiUsers, FiCalendar, FiMessageSquare, FiFilter,
  FiArrowRight, FiTag, FiPercent, FiX, FiSearch
} from 'react-icons/fi';

const ListView = ({ 
  reservations, 
  selectedDate, 
  onDateChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onReservationClick, 
}) => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('time');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Responsive detection
  const isMobile = window.innerWidth < 640;

  const getSourceBadge = (source) => {
    if (source === 'mobile_app') {
      return (
        <span className="px-1.5 sm:px-3 py-0.5 rounded-full text-[8px] sm:text-xs font-semibold border bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-0.5 sm:gap-1">
          📱
          <span className="hidden xs:inline">Mobile</span>
        </span>
      );
    }
    return null;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      confirmed: { 
        bg: 'bg-green-50', 
        text: 'text-green-700', 
        border: 'border-green-200',
        label: 'Confirmed' 
      },
      pending: { 
        bg: 'bg-orange-50', 
        text: 'text-orange-700', 
        border: 'border-orange-200',
        label: 'Pending' 
      },
      cancelled: { 
        bg: 'bg-red-50', 
        text: 'text-red-700', 
        border: 'border-red-200',
        label: 'Cancelled' 
      },
      completed: { 
        bg: 'bg-blue-50', 
        text: 'text-blue-700', 
        border: 'border-blue-200',
        label: 'Completed' 
      },
    };

    const config = statusConfig[status?.toLowerCase()] || statusConfig.pending;
    
    return (
      <span className={`px-1.5 sm:px-3 py-0.5 rounded-full text-[8px] sm:text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
        {config.label}
      </span>
    );
  };

  const filteredReservations = reservations.filter(reservation => {
    const resDate = reservation.reservation_date?.toDate?.() || new Date(reservation.reservation_date);

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (resDate < start) return false;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (resDate > end) return false;
    }

    if (filterStatus !== 'all' && reservation.status?.toLowerCase() !== filterStatus) {
      return false;
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const customerName = (reservation.customer_name || '').toLowerCase();
      const customerEmail = (reservation.customer_email || '').toLowerCase();
      const customerPhone = (reservation.customer_phone || '').toLowerCase();
      const serviceType = (reservation.ServiceType_Reservation || '').toLowerCase();
      
      return customerName.includes(term) || 
             customerEmail.includes(term) || 
             customerPhone.includes(term) || 
             serviceType.includes(term);
    }
    
    return true;
  });

  const sortedReservations = [...filteredReservations].sort((a, b) => {
    switch (sortBy) {
      case 'time':
        const dateA = a.reservation_date?.toDate?.() || new Date(a.reservation_date);
        const dateB = b.reservation_date?.toDate?.() || new Date(b.reservation_date);
        return dateA - dateB;
      case 'time-desc':
        const dateADesc = a.reservation_date?.toDate?.() || new Date(a.reservation_date);
        const dateBDesc = b.reservation_date?.toDate?.() || new Date(b.reservation_date);
        return dateBDesc - dateADesc;
      case 'name':
        return (a.customer_name || '').localeCompare(b.customer_name || '');
      case 'guests':
        return (b.number_of_guests || 0) - (a.number_of_guests || 0);
      case 'guests-asc':
        return (a.number_of_guests || 0) - (b.number_of_guests || 0);
      default:
        return 0;
    }
  });

  const formatTime = (date) => {
    const d = date?.toDate?.() || new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    const d = date?.toDate?.() || new Date(date);
    return d.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTimeRange = (date, duration) => {
    const start = date?.toDate?.() || new Date(date);
    const end = new Date(start.getTime() + (duration || 120) * 60000);
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  // Get date range text
  const getDateRangeText = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start.toDateString() === end.toDateString()) {
        return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return '';
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      
      {/* ─── Search and Filters Bar ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 py-2 sm:py-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Search Input */}
          <div className="flex-1 min-w-[120px] sm:min-w-[200px] relative">
            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder={isMobile ? "Search..." : "Search by name, email, phone..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-800 transition-all text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <FiX className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>

          {/* Filter Toggle - Mobile */}
          <button
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            className={`p-1.5 sm:p-2 rounded-lg border transition-all ${
              isFilterVisible || filterStatus !== 'all' || sortBy !== 'time'
                ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400'
                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <FiFilter className="w-4 h-4" />
          </button>

          {/* Filters - Desktop always visible, Mobile toggleable */}
          <div className={`flex items-center gap-2 ${isMobile ? (isFilterVisible ? 'flex w-full mt-1' : 'hidden') : 'flex'}`}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-[10px] sm:text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-800 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-[10px] sm:text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-800 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="time">Time ↑</option>
              <option value="time-desc">Time ↓</option>
              <option value="name">Name</option>
              <option value="guests">Most</option>
              <option value="guests-asc">Least</option>
            </select>

            {/* Date Range Display */}
            {getDateRangeText() && (
              <span className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 truncate max-w-[150px] sm:max-w-[250px] ml-auto">
                {getDateRangeText()}
              </span>
            )}

            {/* Count */}
            <span className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg ml-auto">
              <span className="text-[10px] sm:text-sm font-semibold text-orange-700 dark:text-orange-400 whitespace-nowrap">
                {sortedReservations.length}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ─── Reservations List ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6">
        {sortedReservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
              <FiCalendar className="w-8 h-8 sm:w-12 sm:h-12 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">
              No reservations found
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-md">
              {searchTerm 
                ? `No results matching "${searchTerm}"`
                : filterStatus !== 'all' 
                  ? `No ${filterStatus} reservations for this date.`
                  : 'No reservations scheduled for this date.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:gap-3 md:gap-4">
            {sortedReservations.map((reservation) => (
              <div
                key={reservation.id}
                onClick={() => onReservationClick(reservation)}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-orange-400 dark:hover:border-orange-600 hover:shadow-md dark:hover:shadow-gray-800 cursor-pointer transition-all duration-200 overflow-hidden"
              >
                {/* Status Bar */}
                <div className={`h-1 ${
                  reservation.status?.toLowerCase() === 'confirmed' ? 'bg-green-500' :
                  reservation.status?.toLowerCase() === 'pending' ? 'bg-orange-500' :
                  reservation.status?.toLowerCase() === 'cancelled' ? 'bg-red-500' :
                  reservation.status?.toLowerCase() === 'completed' ? 'bg-blue-500' :
                  'bg-gray-500'
                }`} />

                <div className="p-3 sm:p-4 md:p-5">
                  <div className="flex items-start gap-2 sm:gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 dark:bg-orange-900/50 border border-orange-200 dark:border-orange-700 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FiUser className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header: Name + Badges */}
                      <div className="flex flex-wrap items-start justify-between gap-1 sm:gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {reservation.customer_name || 'Guest'}
                            </h3>
                            {getStatusBadge(reservation.status)}
                            {getSourceBadge(reservation.source)}
                          </div>
                          {reservation.ServiceType_Reservation && (
                            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 inline-block">
                              {reservation.ServiceType_Reservation}
                            </span>
                          )}
                        </div>
                        
                        {/* Arrow - hidden on very small screens */}
                        <div className="hidden xs:flex flex-shrink-0 ml-2">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg flex items-center justify-center">
                            <FiArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600 dark:text-orange-400" />
                          </div>
                        </div>
                      </div>

                      {/* Details Grid - Responsive */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2 md:gap-3 mt-2 sm:mt-3">
                        {/* Date */}
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <FiCalendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[8px] sm:text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">Date</p>
                            <p className="text-[9px] sm:text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                              {formatDate(reservation.reservation_date)}
                            </p>
                          </div>
                        </div>

                        {/* Time */}
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <FiClock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                          <div>
                            <p className="text-[8px] sm:text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">Time</p>
                            <p className="text-[9px] sm:text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                              {formatTime(reservation.reservation_date)}
                            </p>
                          </div>
                        </div>

                        {/* Guests */}
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <FiUsers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                          <div>
                            <p className="text-[8px] sm:text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">Guests</p>
                            <p className="text-[9px] sm:text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                              {reservation.number_of_guests}
                            </p>
                          </div>
                        </div>

                        {/* Phone - hide on smallest screens */}
                        {reservation.customer_phone && (
                          <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 col-span-2 sm:col-span-1">
                            <FiPhone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[8px] sm:text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">Phone</p>
                              <a 
                                href={`tel:${reservation.customer_phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[9px] sm:text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors truncate block"
                              >
                                {reservation.customer_phone}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Special Requests */}
                      {reservation.special_requests && (
                        <div className="mt-2 sm:mt-3 flex items-start gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
                          <FiMessageSquare className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                          <p className="text-[9px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-400 italic truncate">
                            "{reservation.special_requests}"
                          </p>
                        </div>
                      )}

                      {/* Offer Badge */}
                      {reservation.claimed_offer && (
                        <div className="mt-1.5 sm:mt-2 inline-flex flex-wrap items-center gap-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg">
                          <FiTag className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-600 dark:text-orange-400" />
                          <span className="text-[8px] sm:text-xs font-medium text-orange-700 dark:text-orange-400 truncate max-w-[80px] sm:max-w-[150px]">
                            {reservation.claimed_offer}
                          </span>
                          {reservation.discount_percent > 0 && (
                            <span className="text-[7px] sm:text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-white dark:bg-gray-700 border border-orange-200 dark:border-orange-700 px-1 sm:px-1.5 py-0.5 rounded">
                              -{reservation.discount_percent}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Footer Stats ────────────────────────────────────────────────────── */}
      {sortedReservations.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-3 sm:px-6 py-1.5 sm:py-2.5 bg-white dark:bg-gray-800 flex flex-wrap items-center justify-between gap-1 sm:gap-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[9px] sm:text-xs">
            {['pending', 'confirmed', 'completed', 'cancelled'].map((status) => {
              const count = sortedReservations.filter(r => r.status?.toLowerCase() === status).length;
              if (count === 0) return null;
              
              const colors = {
                pending: 'bg-orange-500',
                confirmed: 'bg-green-500',
                completed: 'bg-blue-500',
                cancelled: 'bg-red-500'
              };
              
              return (
                <div key={status} className="flex items-center gap-0.5 sm:gap-1">
                  <div className={`w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 ${colors[status]} rounded-full`}></div>
                  <span className="text-[8px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium capitalize hidden xs:inline">{status}</span>
                  <span className="text-[9px] sm:text-xs text-gray-800 dark:text-gray-200 font-bold">{count}</span>
                </div>
              );
            })}
          </div>
          
          <div className="text-[9px] sm:text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-1.5 sm:px-2.5 py-0.5 rounded-lg whitespace-nowrap">
            Total: {sortedReservations.reduce((sum, r) => sum + (r.number_of_guests || 0), 0)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ListView;