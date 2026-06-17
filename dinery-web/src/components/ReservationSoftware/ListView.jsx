// src/components/reservation-software/ListView.jsx
import React, { useState } from 'react';
import { 
  FiChevronLeft, FiChevronRight, FiUser, FiPhone, FiMail, 
  FiClock, FiUsers, FiCalendar, FiMessageSquare, FiFilter,
  FiArrowRight, FiTag, FiPercent
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

  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getSourceBadge = (source) => {
    if (source === 'mobile_app') {
      return (
        <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold border bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-0.5 sm:gap-1">
          Mobile App
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
      <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
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

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with date range pickers */}
      <div className="bg-white border-b border-gray-300 px-3 sm:px-6 py-2 sm:py-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-6">
          <div className="flex items-center gap-1 sm:gap-2">
            <FiCalendar className="w-3 h-3 sm:w-4 sm:h-4 text-[#fe8a24]" />
            <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">FROM</span>
            <input
              type="date"
              value={formatDateForInput(startDate)}
              onChange={(e) => {
                const d = new Date(e.target.value);
                onStartDateChange(d);
              }}
              className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-200 rounded-xl text-[10px] sm:text-sm focus:outline-none focus:border-[#fe8a24] bg-gray-50 w-[100px] sm:w-auto"
            />
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">TO</span>
            <input
              type="date"
              value={formatDateForInput(endDate)}
              min={formatDateForInput(startDate)}
              onChange={(e) => {
                const d = new Date(e.target.value);
                onEndDateChange(d);
              }}
              className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-200 rounded-xl text-[10px] sm:text-sm focus:outline-none focus:border-[#fe8a24] bg-gray-50 w-[100px] sm:w-auto"
            />
          </div>
          {startDate && endDate && (
            <span className="text-[10px] sm:text-sm text-gray-500 truncate max-w-[200px] sm:max-w-none">
              {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-300 px-3 sm:px-6 py-2 sm:py-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex-1 min-w-[120px] sm:min-w-[200px]">
            <input
              type="text"
              placeholder={window.innerWidth < 640 ? "Search..." : "Search by name, email, phone..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-xs sm:text-sm bg-white"
            />
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <FiFilter className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-lg text-[10px] sm:text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 bg-white max-w-[80px] sm:max-w-none"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-[10px] sm:text-sm font-medium text-gray-700 hidden xs:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-lg text-[10px] sm:text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 bg-white max-w-[100px] sm:max-w-none"
            >
              <option value="time">Time ↑</option>
              <option value="time-desc">Time ↓</option>
              <option value="name">Name</option>
              <option value="guests">Most</option>
              <option value="guests-asc">Least</option>
            </select>
          </div>

          <div className="bg-orange-50 border border-orange-300 px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-lg ml-auto">
            <span className="text-[10px] sm:text-sm font-semibold text-orange-700 whitespace-nowrap">
              {sortedReservations.length} {window.innerWidth < 640 ? '' : 'reservation' + (sortedReservations.length !== 1 ? 's' : '')}
            </span>
          </div>
        </div>
      </div>

      {/* Reservations List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {sortedReservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-orange-100 border border-orange-300 rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
              <FiCalendar className="w-8 h-8 sm:w-12 sm:h-12 text-orange-600" />
            </div>
            <h3 className="text-base sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
              No reservations found
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 max-w-md">
              {searchTerm 
                ? `No results matching "${searchTerm}"`
                : filterStatus !== 'all' 
                  ? `No ${filterStatus} reservations for this date.`
                  : 'No reservations scheduled for this date.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {sortedReservations.map((reservation) => (
              <div
                key={reservation.id}
                onClick={() => onReservationClick(reservation)}
                className="bg-white border border-gray-300 rounded-xl hover:border-orange-400 hover:shadow-md cursor-pointer transition-all duration-200 overflow-hidden"
              >
                {/* Status Bar */}
                <div className={`h-1 ${
                  reservation.status?.toLowerCase() === 'confirmed' ? 'bg-green-500' :
                  reservation.status?.toLowerCase() === 'pending' ? 'bg-orange-500' :
                  reservation.status?.toLowerCase() === 'cancelled' ? 'bg-red-500' :
                  reservation.status?.toLowerCase() === 'completed' ? 'bg-blue-500' :
                  'bg-gray-500'
                }`} />

                <div className="p-3 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-orange-100 border border-orange-300 rounded-xl flex items-center justify-center flex-shrink-0">
                          <FiUser className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-xl font-semibold text-gray-900 truncate max-w-[150px] sm:max-w-none">
                            {reservation.customer_name || 'Guest'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                            {getStatusBadge(reservation.status)}
                            {getSourceBadge(reservation.source)}
                            {reservation.ServiceType_Reservation && (
                              <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-gray-100 border border-gray-300 rounded-full text-[10px] sm:text-xs font-medium text-gray-700">
                                {window.innerWidth < 640 && reservation.ServiceType_Reservation.length > 8 
                                  ? reservation.ServiceType_Reservation.slice(0, 6) + '…' 
                                  : reservation.ServiceType_Reservation}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
                        {/* Date */}
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-100 border border-orange-300 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FiCalendar className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[8px] sm:text-xs font-medium text-gray-500 uppercase">Date</p>
                            <p className="text-[10px] sm:text-sm font-semibold text-gray-900 truncate max-w-[80px] sm:max-w-none">
                              {formatDate(reservation.reservation_date)}
                            </p>
                          </div>
                        </div>

                        {/* Time */}
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-100 border border-orange-300 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FiClock className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[8px] sm:text-xs font-medium text-gray-500 uppercase">Time</p>
                            <p className="text-[10px] sm:text-sm font-semibold text-gray-900">
                              {formatTime(reservation.reservation_date)}
                            </p>
                            <p className="text-[8px] sm:text-xs text-gray-600 hidden sm:block">
                              {formatTimeRange(reservation.reservation_date, reservation.duration_minutes)}
                            </p>
                          </div>
                        </div>

                        {/* Guests */}
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-100 border border-orange-300 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FiUsers className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-[8px] sm:text-xs font-medium text-gray-500 uppercase">Guests</p>
                            <p className="text-[10px] sm:text-sm font-semibold text-gray-900">
                              {reservation.number_of_guests}
                            </p>
                          </div>
                        </div>

                        {/* Phone */}
                        {reservation.customer_phone && (
                          <div className="flex items-start gap-2 sm:gap-3 col-span-2 sm:col-span-1">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-100 border border-orange-300 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FiPhone className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[8px] sm:text-xs font-medium text-gray-500 uppercase hidden sm:block">Phone</p>
                              <a 
                                href={`tel:${reservation.customer_phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] sm:text-sm font-semibold text-gray-900 hover:text-orange-600 transition-colors truncate block max-w-[80px] sm:max-w-[150px]"
                              >
                                {reservation.customer_phone}
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Email */}
                        {reservation.customer_email && (
                          <div className="flex items-start gap-2 sm:gap-3 col-span-2 sm:col-span-1">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-100 border border-orange-300 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FiMail className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[8px] sm:text-xs font-medium text-gray-500 uppercase hidden sm:block">Email</p>
                              <a 
                                href={`mailto:${reservation.customer_email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] sm:text-sm font-semibold text-gray-900 hover:text-orange-600 transition-colors truncate block max-w-[80px] sm:max-w-[200px]"
                              >
                                {reservation.customer_email}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Special Requests */}
                      {reservation.special_requests && (
                        <div className="mt-2 sm:mt-4 flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 border border-gray-300 rounded-lg">
                          <FiMessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] sm:text-sm text-gray-700 italic truncate max-w-[200px] sm:max-w-none">
                            "{reservation.special_requests}"
                          </p>
                        </div>
                      )}

                      {/* Offer Badge */}
                      {reservation.claimed_offer && (
                        <div className="mt-2 sm:mt-3 inline-flex flex-wrap items-center gap-1 sm:gap-2 bg-orange-50 border border-orange-300 px-2 sm:px-3 py-1 sm:py-2 rounded-lg">
                          <FiTag className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />
                          <span className="text-[10px] sm:text-sm font-semibold text-orange-700 truncate max-w-[120px] sm:max-w-none">
                            {reservation.claimed_offer}
                          </span>
                          {reservation.discount_percent > 0 && (
                            <div className="flex items-center gap-0.5 sm:gap-1 bg-white border border-orange-300 px-1.5 sm:px-2 py-0.5 rounded">
                              <FiPercent className="w-2 h-2 sm:w-3 sm:h-3 text-orange-600" />
                              <span className="text-[8px] sm:text-xs font-bold text-orange-600">
                                {reservation.discount_percent}% OFF
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Arrow Icon */}
                    <div className="ml-2 sm:ml-6 flex-shrink-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 border border-orange-300 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                        <FiArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {sortedReservations.length > 0 && (
        <div className="border-t border-gray-300 px-3 sm:px-6 py-2 sm:py-3 bg-white flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-6 text-[10px] sm:text-sm">
            <span className="text-[8px] sm:text-xs font-semibold text-gray-700 uppercase hidden xs:inline">Summary:</span>
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
                <div key={status} className="flex items-center gap-1 sm:gap-2">
                  <div className={`w-2 h-2 sm:w-3 sm:h-3 ${colors[status]} rounded-full border border-gray-300`}></div>
                  <span className="text-[10px] sm:text-sm text-gray-700 font-medium capitalize hidden xs:inline">{status}</span>
                  <span className="text-[10px] sm:text-sm text-gray-900 font-bold">{count}</span>
                </div>
              );
            })}
          </div>
          
          <div className="text-[10px] sm:text-sm text-gray-600 bg-gray-100 border border-gray-300 px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-lg whitespace-nowrap">
            Total: {sortedReservations.reduce((sum, r) => sum + (r.number_of_guests || 0), 0)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ListView;