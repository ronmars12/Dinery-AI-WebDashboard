// src/components/reservation-software/ReservationModal.jsx
import React, { useState, useEffect } from 'react';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firestore } from '../../firebase';
import { FiX, FiTrash2, FiSave, FiUser, FiPhone, FiMail, FiClock, FiUsers } from 'react-icons/fi';

const ReservationModal = ({ reservation, onClose }) => {
  const [formData, setFormData] = useState({
      customer_name: reservation.customer_name || '',
      customer_email: reservation.customer_email || '',
      customer_phone: reservation.customer_phone || '',
      number_of_guests: reservation.number_of_guests || 2,
      reservation_date: reservation.reservation_date?.toDate?.() || new Date(),
      ServiceType_Reservation: reservation.ServiceType_Reservation || 'dine-in',
      status: reservation.status || 'pending',
      special_requests: reservation.special_requests || '',
      // Support all offer field variants from mobile + web
      claimed_offer: reservation.claimed_offer || reservation.offer_name || reservation.offerName || '',
      claimed_offer_id: reservation.claimed_offer_id || reservation.offer_id || reservation.offerId || '',
      discount_percent:
        reservation.claimed_offer_discount_percent ||
        reservation.discount_percent ||
        reservation.offer_discount_percent ||
        reservation.discountPercent || 0,
      duration_minutes: reservation.duration_minutes || 75,
      from_time: reservation.from_time || '',
      to_time: reservation.to_time || '',
      source: reservation.source || '',
    });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [liveReservation, setLiveReservation] = useState(reservation);

  const refreshReservation = async () => {
    try {
      const { getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db, 'reservations', reservation.id));
      if (snap.exists()) {
        setLiveReservation({ id: snap.id, ...snap.data() });
      }
    } catch (e) {
      console.error('Failed to refresh reservation:', e);
    }
  };

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      status: liveReservation.status || prev.status,
      reservation_date: liveReservation.reservation_date?.toDate?.() || new Date(liveReservation.reservation_date) || prev.reservation_date,
    }));
  }, [liveReservation]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    if (!reservation.restaurant_id) return;
    const col = reservation.restaurant_collection || 'restaurants';
    import('firebase/firestore').then(({ doc: fsDoc, getDoc }) => {
      getDoc(fsDoc(firestore, col, reservation.restaurant_id, 'reservationSettings', 'config'))
        .then(snap => { if (snap.exists()) setSettings(snap.data()); })
        .catch(e => console.warn('Could not load settings:', e));
    });
  }, [reservation.restaurant_id]);
  const [tables, setTables] = useState([]);
  const isMultiTable = Array.isArray(reservation.table_ids) && reservation.table_ids.length > 1;
  const [selectedTableIds, setSelectedTableIds] = useState(
    Array.isArray(reservation.table_ids) && reservation.table_ids.length > 0
      ? reservation.table_ids
      : reservation.table_id ? [reservation.table_id] : []
  );
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => { setToast(null); onClose(); }, 1800);
  };
  useEffect(() => {
    if (!reservation.restaurant_id) return;
    const collectionName = reservation.restaurant_collection || 'restaurants';
    import('firebase/firestore').then(({ collection, getDocs }) => {
      getDocs(collection(db, collectionName, reservation.restaurant_id, 'tables'))
        .then(snap => {
          const data = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(t => t.online !== false)
            .sort((a, b) => (a.name > b.name ? 1 : -1));
          setTables(data);
        })
        .catch(e => console.warn('Could not load tables:', e));
    });
  }, [reservation.restaurant_id]);
  const db = firestore; 
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateTimeChange = (e) => {
    const { name, value } = e.target;
    const newDate = new Date(formData.reservation_date);
    
    if (name === 'date') {
      const [year, month, day] = value.split('-');
      newDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else if (name === 'time') {
      const [hours, minutes] = value.split(':');
      newDate.setHours(parseInt(hours), parseInt(minutes));
    }
    
    setFormData(prev => ({
      ...prev,
      reservation_date: newDate
    }));
  };

  const getAssignedTableIds = () => {
  if (Array.isArray(reservation.table_ids) && reservation.table_ids.length > 0) {
    return reservation.table_ids;
  }

  return reservation.table_id ? [reservation.table_id] : [];
  };

  const clearAssignedTables = async () => {
    const tableIds = getAssignedTableIds();

    if (!tableIds.length || !reservation.restaurant_id) return;

    const collectionName = reservation.restaurant_collection || 'restaurants';

    await Promise.all(
      tableIds.map(tid =>
        updateDoc(doc(db, collectionName, reservation.restaurant_id, 'tables', tid), {
          current_status: null,
          reserved_by: null,
          reserved_date: null,
          reserved_guests: null,
          reserved_duration_minutes: null,
          reserved_source: null,
          updated_at: serverTimestamp(),
        }).catch(e => console.warn('Could not clear table status:', tid, e))
      )
    );
  };

const handleSave = async () => {
    try {
      setSaving(true);
      console.log('💾 Saving reservation:', reservation.id);

    const reservationRef = doc(db, 'reservations', reservation.id);
      const selectedTables = tables.filter(t => selectedTableIds.includes(t.id));
      const tableFields = {
        table_id:         selectedTableIds[0] || null,
        table_name:       selectedTables[0]?.name || '',
        table_ids:        selectedTableIds,
        table_names:      selectedTables.map(t => t.name),
        combination_id:   selectedTableIds.length > 1 ? (reservation.combination_id || null) : null,
        combination_name: selectedTableIds.length > 1 ? (reservation.combination_name || null) : null,
      };

      await updateDoc(reservationRef, {
        ...formData,
        reservation_date: formData.reservation_date,
        from_time: formData.from_time,
        to_time: formData.to_time,
        duration_minutes: formData.duration_minutes,
        meal_status: formData.meal_status || null,
        ...tableFields,
        updated_at: serverTimestamp(),
      });

      const oldTableIds = reservation.table_ids?.length
        ? reservation.table_ids
        : reservation.table_id ? [reservation.table_id] : [];
      const removedIds = oldTableIds.filter(id => !selectedTableIds.includes(id));
      if (removedIds.length) {
        const col = reservation.restaurant_collection || 'restaurants';
        await Promise.all(removedIds.map(tid =>
          updateDoc(doc(db, col, reservation.restaurant_id, 'tables', tid), {
            current_status: null, reserved_by: null, reserved_date: null,
            reserved_guests: null, updated_at: serverTimestamp(),
          }).catch(() => {})
        ));
      }
      const clearedStatuses = ['cancelled', 'completed'];

      if (clearedStatuses.includes(formData.status)) {
        await clearAssignedTables();
      }

      console.log('✅ Reservation updated successfully');
      showToast('Reservation saved successfully!');
    } catch (error) {
      console.error('❌ Error updating reservation:', error);
      alert('Failed to update reservation: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this reservation?')) {
      return;
    }

    try {
      setDeleting(true);
      console.log('🗑️ Deleting reservation:', reservation.id);

    const reservationRef = doc(db, 'reservations', reservation.id);
          await deleteDoc(reservationRef);
          await clearAssignedTables();
          console.log('✅ Reservation deleted successfully');
      showToast('Reservation deleted successfully!', 'delete');
    } catch (error) {
      console.error('❌ Error deleting reservation:', error);
      alert('Failed to delete reservation: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const formatDateForInput = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeForInput = (date) => {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getMealStatusConfig = (mealStatus) => {
    const map = {
      'arrived':        { color: '#ef4444', label: 'Arrived', icon: '🔴' },
      'food_delivered': { color: '#3b82f6', label: 'Food', icon: '🔵' },
      'dessert':        { color: '#8b5cf6', label: 'Dessert', icon: '🟣' },
      'bill_delivered': { color: '#eab308', label: 'Bill', icon: '🟡' },
      'table_cleared':  { color: '#84cc16', label: 'Cleared', icon: '🟢' },
      'no_show':        { color: '#000000', label: 'No Show', icon: '⚫' },
      'clear_out':      { color: '#6b7280', label: 'Clear Out', icon: '⚪' },
    };
    return map[mealStatus?.toLowerCase()] || null;
  };

  const getEffectiveDuration = (guestCount) => {
    const def = settings?.defaultReservationDuration || 75;
    if (!settings?.useGuestBasedDuration || !settings?.guestDurationRules?.length) return def;
    const match = settings.guestDurationRules.find(
      r => guestCount >= (r.minGuests || 1) && guestCount <= (r.maxGuests || 99)
    );
    return match ? match.duration : def;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white font-semibold text-sm transition-all animate-bounce-in ${
          toast.type === 'delete' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          <span className="text-xl">{toast.type === 'delete' ? '🗑️' : '✅'}</span>
          {toast.message}
        </div>
      )}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">
                Edit Booking #{reservation.id.slice(0, 8)}
              </h3>
              <p className="text-green-100 text-sm mt-1">
                {new Date(reservation.created_at?.toDate?.() || reservation.created_at).toLocaleString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">

          {/* ── Pending Request Banner ── */}
          {(liveReservation.change_request || liveReservation.cancel_reason || liveReservation.modification_summary) && (
          <div className={`mb-6 rounded-2xl border-2 overflow-hidden ${
            approvalStatus === 'approved' ? 'border-green-300 bg-green-50' :
            approvalStatus === 'rejected' ? 'border-gray-300 bg-gray-50' :
            liveReservation.cancel_reason ? 'border-purple-300 bg-purple-50' :
            liveReservation.modification_summary ? 'border-blue-300 bg-blue-50' :
            'border-blue-300 bg-blue-50'
          }`}>
            <div className={`px-4 py-2 flex items-center gap-2 ${
              approvalStatus === 'approved' ? 'bg-green-500' :
              approvalStatus === 'rejected' ? 'bg-gray-500' :
              liveReservation.cancel_reason ? 'bg-purple-600' :
              liveReservation.modification_summary ? 'bg-blue-500' :
              'bg-blue-500'
            }`}>
              <span className="text-white text-xs font-bold uppercase tracking-wider">
                {approvalStatus === 'approved' ? '✅ Approved Successfully' :
                approvalStatus === 'rejected' ? '✗ Request Rejected' :
                liveReservation.cancel_reason ? '✕ Cancellation Request' :
                liveReservation.modification_summary ? '✏️ Customer Modified Booking' :
                '! Change Request'}
              </span>
              {!approvalStatus && !liveReservation.modification_summary && (
                <span className="ml-auto text-white/70 text-xs">Awaiting your approval</span>
              )}
              {liveReservation.modification_summary && !liveReservation.cancel_reason && (
                <span className="ml-auto text-white/70 text-xs">
                  {liveReservation.modified_at?.toDate
                    ? liveReservation.modified_at.toDate().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : ''}
                </span>
              )}
            </div>
            <div className="px-4 py-3 flex items-start justify-between gap-4">
              <div className="flex-1">
                {approvalStatus === 'approved' ? (
                  <p className="text-sm font-semibold text-green-700">
                    ✅ The request has been approved and the customer has been notified by email.
                  </p>
                ) : approvalStatus === 'rejected' ? (
                  <p className="text-sm font-semibold text-gray-600">
                    ✗ The request has been rejected. Reservation remains unchanged.
                  </p>
                ) : liveReservation.modification_summary && !liveReservation.cancel_reason ? (
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-1">Customer updated their booking:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {liveReservation.modification_summary.split(' · ').map((change, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full">
                          {change.startsWith('Date') ? '📅' : change.startsWith('Time') ? '🕐' : change.startsWith('Guests') ? '👥' : '✏️'} {change}
                        </span>
                      ))}
                    </div>
                  <button
                    onClick={async () => {
                      try {
                        const { doc: fsDoc, updateDoc: fsUpdate } = await import('firebase/firestore');
                        await fsUpdate(fsDoc(firestore, 'reservations', reservation.id), {
                          modification_summary: null,
                          modified_at: null,
                        });
                        await refreshReservation();
                      } catch (e) {
                        console.error('Dismiss error:', e);
                      }
                    }}
                    className="mt-2 text-[10px] text-gray-400 hover:text-gray-600 transition-colors">
                    Dismiss
                  </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-800 mb-1">
                      {liveReservation.cancel_reason ? 'Customer wants to cancel:' : 'Customer requested:'}
                    </p>
                    <p className="text-sm text-gray-600">{liveReservation.change_request || liveReservation.cancel_reason}</p>
                    {liveReservation.requested_date && (
                      <p className="text-xs text-blue-600 font-semibold mt-1">
                        📅 Requested new date/time: {(() => {
                          const d = liveReservation.requested_date?.toDate?.() || new Date(liveReservation.requested_date);
                          const hours = String(d.getHours()).padStart(2, '0');
                          const minutes = String(d.getMinutes()).padStart(2, '0');
                          return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ${hours}:${minutes}`;
                        })()}
                      </p>
                    )}
                  </>
                )}
              </div>
               {!approvalStatus && !liveReservation.modification_summary && !liveReservation.cancel_reason && (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    disabled={approvalStatus === 'loading'}
                    onClick={async () => {
                      try {
                        setApprovalStatus('loading');
                        const approvalUpdate = {
                          status: reservation.cancel_reason ? 'cancelled' : 'confirmed',
                          change_request: null,
                          cancel_reason: null,
                          updated_at: new Date(),
                        };
                        if (liveReservation.requested_date) {
                          const reqDate = liveReservation.requested_date?.toDate?.() || new Date(liveReservation.requested_date);
                          approvalUpdate.reservation_date = reqDate;
                          approvalUpdate.time = reqDate.toISOString();
                          approvalUpdate.requested_date = null;
                          approvalUpdate.requested_time = null;
                        }
                        await updateDoc(doc(db, 'reservations', reservation.id), approvalUpdate);
                        if (reservation.customer_email) {
                          const sendEmailFn = httpsCallable(getFunctions(), 'sendEmail');
                          const isCancel = !!liveReservation.cancel_reason;
                          const reqDate = liveReservation.requested_date?.toDate?.() || null;
                          await sendEmailFn({
                            to: reservation.customer_email,
                            subject: isCancel
                              ? `Reservation Cancelled – ${reservation.restaurant_name}`
                              : `Reservation Updated – ${reservation.restaurant_name}`,
                            html: `
                              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
                                <h2 style="color:${isCancel ? '#7c3aed' : '#22c55e'};">
                                  ${isCancel ? 'Reservation Cancelled ✕' : 'Your Reservation Has Been Updated ✅'}
                                </h2>
                                <p>Hi ${reservation.customer_name?.split(' ')[0] || 'there'},</p>
                                <p>${isCancel
                                  ? `Your cancellation request for <strong>${reservation.restaurant_name}</strong> has been approved.`
                                  : `Your change request for <strong>${reservation.restaurant_name}</strong> has been approved.`
                                }</p>
                                ${reqDate && !isCancel ? `
                                  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                                    <tr><td style="padding:8px 0;color:#888;">New Date</td><td style="padding:8px 0;"><strong>${reqDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong></td></tr>
                                    <tr><td style="padding:8px 0;color:#888;">New Time</td><td style="padding:8px 0;"><strong>${String(reqDate.getHours()).padStart(2, '0')}:${String(reqDate.getMinutes()).padStart(2, '0')}</strong></td></tr>
                                   </table>
                                ` : ''}
                                <p style="color:#888;font-size:12px;margin-top:24px;">— ${reservation.restaurant_name}</p>
                              </div>
                            `,
                          }).catch(e => console.warn('Email failed:', e));
                        }
                        setApprovalStatus('approved');
                        await refreshReservation();
                      } catch (e) {
                        console.error('Approve error:', e);
                        setApprovalStatus(null);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-green-500 hover:bg-green-600 transition-all disabled:opacity-50">
                    {approvalStatus === 'loading' ? '...' : '✓ Approve'}
                  </button>
                  <button
                    disabled={approvalStatus === 'loading'}
                    onClick={async () => {
                      try {
                        setApprovalStatus('loading');
                        await updateDoc(doc(db, 'reservations', reservation.id), {
                          change_request: null,
                          cancel_reason: null,
                          requested_date: null,
                          requested_time: null,
                          status: 'confirmed',
                          updated_at: new Date(),
                        });
                        setApprovalStatus('rejected');
                        await refreshReservation();
                      } catch (e) {
                        console.error('Reject error:', e);
                        setApprovalStatus(null);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-50">
                    {approvalStatus === 'loading' ? '...' : '✗ Reject'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div className="space-y-4 flex flex-col">
              <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Customer Information
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FiUser className="w-4 h-4 text-orange-500" />
                  Customer Name *
                </label>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FiMail className="w-4 h-4 text-orange-500" />
                  Email
                </label>
                <input
                  type="email"
                  name="customer_email"
                  value={formData.customer_email}
                  onChange={handleChange}
                  className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
                  placeholder="john@example.com"
                />
              </div>

               <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FiPhone className="w-4 h-4 text-orange-500" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={handleChange}
                  className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
                  placeholder="+1 234 567 8900"
                />
              </div>

              {reservation.customer_birthday && (() => {
                const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                const parts = reservation.customer_birthday.split('-');
                const monthIdx = parseInt(parts[0]) - 1;
                const day = parseInt(parts[1]);
                const display = (!isNaN(monthIdx) && !isNaN(day) && monthIdx >= 0 && monthIdx < 12)
                  ? `${MONTHS[monthIdx]} ${day}`
                  : reservation.customer_birthday;
                return (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      🎂 Birthday
                    </label>
                    <div className="w-full rounded-lg border-2 border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2">
                      <span className="text-sm font-semibold text-amber-800">{display}</span>
                      <span className="ml-auto text-xs text-amber-500 font-medium">Customer provided</span>
                    </div>
                  </div>
                );
              })()}

        {tables.length > 0 && (
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Table Assignment
                    {selectedTableIds.length > 1 && (
                      <span className="ml-2 text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                        ⛓ {selectedTableIds.length} tables selected
                      </span>
                    )}
                  </label>
                  <div className="border-2 border-gray-200 rounded-xl p-2.5 overflow-y-auto" style={{ maxHeight: 220 }}>
                    <p className="text-xs text-gray-400 mb-2">Click to toggle · select multiple tables</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {tables.map(t => {
                        const isSelected = selectedTableIds.includes(t.id);
                        const cap = t.maxCapacity || t.capacity || 0;
                        const guestFit = cap >= (formData.number_of_guests || 1);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setSelectedTableIds(prev =>
                                prev.includes(t.id)
                                  ? prev.filter(id => id !== t.id)
                                  : [...prev, t.id]
                              );
                            }}
                            title={`${t.name} · Cap. ${cap}`}
                            className={`relative rounded-lg px-1 py-2.5 text-xs font-bold transition-all border-2 flex flex-col items-center gap-0.5 ${
                              isSelected
                                ? 'bg-[#fe8a24] border-[#fe8a24] text-white shadow-md scale-105'
                                : guestFit
                                ? 'bg-green-50 border-green-300 text-green-800 hover:border-green-500 hover:bg-green-100'
                                : 'bg-orange-50 border-orange-200 text-orange-700 hover:border-orange-400'
                            }`}
                          >
                            <span className="leading-tight">{t.name}</span>
                            <span className={`text-[10px] font-normal leading-tight ${isSelected ? 'text-white/80' : 'opacity-60'}`}>
                              ({cap})
                            </span>
                            {!guestFit && !isSelected && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-400 rounded-full" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> fits guests
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> too small
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedTableIds([])}
                        className="ml-auto text-[10px] text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Clear all
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Reservation Details */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Reservation Details
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formatDateForInput(formData.reservation_date)}
                  onChange={handleDateTimeChange}
                  required
                  className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FiClock className="w-4 h-4 text-orange-500" />
                  Time (24-hour format) *
                </label>
                <div className="flex items-center gap-2">
                  {/* From */}
                <div className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 focus-within:border-orange-500 transition-colors">
                  <p className="text-xs text-gray-400 mb-1">From</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="HH:MM"
                    maxLength={5}
                    value={formData.from_time || formatTimeForInput(formData.reservation_date)}
                    onChange={(e) => {
                        let val = e.target.value.replace(/[^0-9:]/g, '');
                        if (val.length === 2 && !val.includes(':')) val = val + ':';
                        if (/^\d{2}:\d{2}$/.test(val)) {
                          const duration = getEffectiveDuration(formData.number_of_guests || 2);
                          const [fh, fm] = val.split(':').map(Number);
                          const totalMins = fh * 60 + fm + duration;
                          const th = Math.floor(totalMins / 60) % 24;
                          const tm = totalMins % 60;
                          const newToTime = `${String(th).padStart(2,'0')}:${String(tm).padStart(2,'0')}`;
                          setFormData(prev => ({
                            ...prev,
                            from_time: val,
                            to_time: newToTime,
                            duration_minutes: duration,
                          }));
                          handleDateTimeChange({ target: { name: 'time', value: val } });
                        } else {
                          setFormData(prev => ({ ...prev, from_time: val }));
                        }
                      }}
                    className="text-sm font-semibold text-gray-800 focus:outline-none w-full bg-transparent"
                  />
                </div>
                {/* To */}
                <div className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 focus-within:border-orange-500 transition-colors">
                  <p className="text-xs text-gray-400 mb-1">To</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="HH:MM"
                    maxLength={5}
                    value={(() => {
                      if (formData.to_time) return formData.to_time;
                      const d = new Date(formData.reservation_date);
                      const duration = formData.duration_minutes || 75;
                      const end = new Date(d.getTime() + duration * 60000);
                      return `${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`;
                    })()}
                    onChange={(e) => {
                      let val = e.target.value.replace(/[^0-9:]/g, '');
                      if (val.length === 2 && !val.includes(':')) val = val + ':';
                      if (/^\d{2}:\d{2}$/.test(val)) {
                        const fromVal = formData.from_time || formatTimeForInput(formData.reservation_date);
                        const [th, tm] = val.split(':').map(Number);
                        const [fh, fm] = fromVal.split(':').map(Number);
                        const newDuration = Math.max(15, (th * 60 + tm) - (fh * 60 + fm));
                        setFormData(prev => ({ ...prev, to_time: val, duration_minutes: newDuration }));
                      } else {
                        setFormData(prev => ({ ...prev, to_time: val }));
                      }
                    }}
                    className="text-sm font-semibold text-gray-800 focus:outline-none w-full bg-transparent"
                  />
                </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">Use 24-hour format (e.g., 14:30 for 2:30 PM)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FiUsers className="w-4 h-4 text-orange-500" />
                  Number of Guests *
                </label>
               <input
                    type="number"
                    name="number_of_guests"
                    value={formData.number_of_guests}
                    onChange={(e) => {
                      const guests = parseInt(e.target.value) || 1;
                      const newDuration = getEffectiveDuration(guests);
                      const fromVal = formData.from_time;
                      let newToTime = formData.to_time;
                      if (fromVal && /^\d{2}:\d{2}$/.test(fromVal)) {
                        const [fh, fm] = fromVal.split(':').map(Number);
                        const totalMins = fh * 60 + fm + newDuration;
                        const th = Math.floor(totalMins / 60) % 24;
                        const tm = totalMins % 60;
                        newToTime = `${String(th).padStart(2,'0')}:${String(tm).padStart(2,'0')}`;
                      }
                      setFormData(prev => ({
                        ...prev,
                        number_of_guests: guests,
                        duration_minutes: newDuration,
                        to_time: newToTime,
                      }));
                    }}
                    min={1}
                    max={999}
                    required
                    className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
                  />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Type
                </label>
                <select
                  name="ServiceType_Reservation"
                  value={formData.ServiceType_Reservation}
                  onChange={handleChange}
                  className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="dine-in">Dine-In</option>
                  <option value="takeaway">Takeaway</option>
                  <option value="delivery">Delivery</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
      
            {/* Special Requests - Full Width */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Requests
              </label>
              <textarea
                name="special_requests"
                value={formData.special_requests}
                onChange={handleChange}
                rows="3"
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="Any special requests or dietary requirements..."
              />
            </div>

      {/* Selected Menu Items */}
          {reservation.selected_menu_items?.length > 0 && (
            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                🍽️ Pre-selected Menu Items
              </h4>
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl overflow-hidden">
                <div className="divide-y divide-orange-100">
                  {reservation.selected_menu_items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        {item.qty > 1 && (
                          <span className="text-xs font-bold bg-[#fe8a24] text-white px-2 py-0.5 rounded-full">
                            ×{item.qty}
                          </span>
                        )}
                        <span className="text-sm font-semibold text-gray-800">{item.name}</span>
                      </div>
                      {item.price && (
                        <span className="text-sm font-bold text-[#fe8a24]">
                          {item.qty > 1
                            ? `${(parseFloat(item.price) * item.qty).toFixed(0)},-`
                            : `${item.price},-`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 bg-orange-100 border-t border-orange-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-orange-700">
                    {reservation.selected_menu_items.reduce((s, i) => s + (i.qty || 1), 0)} items selected
                  </span>
                  {reservation.selected_menu_items.some(i => i.price) && (
                    <span className="text-sm font-bold text-[#fe8a24]">
                      Total: {reservation.selected_menu_items.reduce((s, i) =>
                        s + (parseFloat(i.price) || 0) * (i.qty || 1), 0
                      ).toFixed(0)},-
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Offer Information */}
          {(formData.claimed_offer || formData.source) && (
                <div className="md:col-span-2 space-y-3">

                  {/* Source badge */}
                  {formData.source && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Booking Source:</span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        formData.source === 'mobile_app'
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : formData.source === 'reservation_link'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {formData.source === 'mobile_app' ? 'Mobile App' :
                        formData.source === 'reservation_link' ? '🔗 Reservation Link' :
                        formData.source}
                      </span>
                    </div>
                  )}

                 {/* Offer block */}
                {formData.claimed_offer && (
                  <div className="relative bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5 overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
                    <div className="absolute bottom-0 left-0 w-20 h-20 bg-orange-100 rounded-full translate-y-1/2 -translate-x-1/2 opacity-50" />

                    <div className="relative flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-amber-400 rounded-xl flex items-center justify-center shadow-md">
                        <span className="text-2xl">🏷️</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-amber-900 text-sm uppercase tracking-wide">
                            Offer Applied
                          </h4>
                          {reservation.coupon_confirmed && (
                            <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">
                              ✓ Confirmed
                            </span>
                          )}
                          {formData.source === 'mobile_app' && (
                            <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full font-medium">
                              Mobile
                            </span>
                          )}
                        </div>

                        <p className="text-amber-800 font-semibold text-base mb-3">
                          {formData.claimed_offer}
                        </p>

                        <div className="flex flex-wrap gap-3">
                          {formData.discount_percent > 0 && (
                            <div className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-xl px-3 py-1.5 shadow-sm">
                              <span className="text-amber-500 font-bold text-lg">%</span>
                              <div>
                                <p className="text-xs text-gray-500 leading-none">Discount</p>
                                <p className="text-sm font-bold text-gray-900">{formData.discount_percent}% off</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            <FiTrash2 className="w-5 h-5" />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              <FiSave className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationModal;