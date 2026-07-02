// src/components/ReservationLinks/FeedbackPage.jsx
//
// Public route: /feedback/:reservationId
// Matches the routing pattern of PublicReservationPage / ManageReservationPage.
// Guest lands here from the Thank You email survey link, rates their visit,
// writes to the `feedback` collection, then sees the review funnel
// (Google/TripAdvisor prompt if average >= threshold, polite thanks if not).

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "../../firebase";
import logo from "../../assets/dinery-logo.png";

// ── Star input ───────────────────────────────────────────────────────────────

function StarInput({ value, onChange, label }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="mb-6">
      <p className="text-sm font-semibold text-gray-700 mb-2">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <svg
              className={`w-9 h-9 ${
                s <= (hover || value) ? "text-[#fe8a24]" : "text-gray-200"
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const { reservationId } = useParams();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reservation, setReservation] = useState(null);
  const [settings, setSettings] = useState(null);
  const [restaurantName, setRestaurantName] = useState("");

  const [foodRating, setFoodRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [atmosphereRating, setAtmosphereRating] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [comments, setComments] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const resSnap = await getDoc(doc(firestore, "reservations", reservationId));
        if (!resSnap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const resData = resSnap.data();
        setReservation({ id: resSnap.id, ...resData });

        const restaurantId = resData.restaurant_id;

        // Restaurant name
        let rDoc = await getDoc(doc(firestore, "restaurants", restaurantId));
        if (!rDoc.exists()) rDoc = await getDoc(doc(firestore, "TestRestaurant", restaurantId));
        if (rDoc.exists()) setRestaurantName(rDoc.data().name || "");

        // CRM settings (survey questions, review threshold, links)
        const settingsSnap = await getDoc(doc(firestore, "crm_settings", restaurantId));
        setSettings(settingsSnap.exists() ? settingsSnap.data() : {});
      } catch (e) {
        console.error("Feedback page load error:", e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    if (reservationId) load();
  }, [reservationId]);

  const surveyQuestions = settings?.surveyQuestions || {
    food: true,
    service: true,
    atmosphere: true,
    overall: true,
    comments: true,
  };

  const canSubmit =
    (!surveyQuestions.food || foodRating > 0) &&
    (!surveyQuestions.service || serviceRating > 0) &&
    (!surveyQuestions.atmosphere || atmosphereRating > 0) &&
    (!surveyQuestions.overall || overallRating > 0);

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError("Please rate all the questions before submitting.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await addDoc(collection(firestore, "feedback"), {
        restaurantId: reservation.restaurant_id,
        customerId: reservation.created_by_uid || null,
        reservationId: reservation.id,
        email: reservation.customer_email || "",
        foodRating: surveyQuestions.food ? foodRating : null,
        serviceRating: surveyQuestions.service ? serviceRating : null,
        atmosphereRating: surveyQuestions.atmosphere ? atmosphereRating : null,
        overallRating: surveyQuestions.overall ? overallRating : null,
        comments: surveyQuestions.comments ? comments.trim() : "",
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (e) {
      console.error("Feedback submit error:", e);
      setError("Something went wrong submitting your feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Average + threshold for review funnel ─────────────────────────────────
  const ratingsGiven = [
    surveyQuestions.food ? foodRating : null,
    surveyQuestions.service ? serviceRating : null,
    surveyQuestions.atmosphere ? atmosphereRating : null,
    surveyQuestions.overall ? overallRating : null,
  ].filter((v) => v !== null);

  const average =
    ratingsGiven.length > 0
      ? ratingsGiven.reduce((s, v) => s + v, 0) / ratingsGiven.length
      : 0;

  const threshold = parseFloat(settings?.reviewThreshold || "4.5");
  const isPositive = average >= threshold;

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#fe8a24]" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-700 font-semibold">We couldn't find this reservation</p>
          <p className="text-gray-400 text-sm mt-1">The link may have expired or is no longer valid.</p>
        </div>
      </div>
    );
  }

  // ── Post-submit: review funnel ──────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md w-full p-8 text-center">
          <img src={logo} alt="" className="w-14 h-14 mx-auto mb-5 rounded-full" />

          {isPositive ? (
            <>
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Thank you for your feedback!</h2>
              <p className="text-sm text-gray-500 mb-6">We are delighted that you enjoyed your visit. Would you consider sharing your experience publicly?</p>
              <div className="flex flex-col gap-3">
                {settings?.googleReviewUrl && (
                  <a
                    href={settings.googleReviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 rounded-xl bg-[#fe8a24] text-white text-sm font-semibold hover:bg-[#e07a1f] transition-colors"
                  >
                    Leave a Google Review
                  </a>
                )}
                {settings?.tripAdvisorUrl && (
                  <a
                    href={settings.tripAdvisorUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Leave a TripAdvisor Review
                  </a>
                )}
                {!settings?.googleReviewUrl && !settings?.tripAdvisorUrl && (
                  <p className="text-xs text-gray-400">Thanks again for your visit!</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-[#fe8a24]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Thank you for your feedback</h2>
              <p className="text-sm text-gray-500">Your comments are important to us and help us improve our restaurant experience. We appreciate you taking the time to share your thoughts.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Survey form ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <img src={logo} alt="" className="w-14 h-14 mx-auto mb-4 rounded-full shadow-sm" />
          <h1 className="text-xl font-bold text-gray-900">How was your visit?</h1>
          <p className="text-sm text-gray-500 mt-1">
            {restaurantName ? `Tell us about your experience at ${restaurantName}` : "Tell us about your experience"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {error && (
            <div className="mb-5 px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          {surveyQuestions.food && (
            <StarInput value={foodRating} onChange={setFoodRating} label="Food Quality" />
          )}
          {surveyQuestions.service && (
            <StarInput value={serviceRating} onChange={setServiceRating} label="Service" />
          )}
          {surveyQuestions.atmosphere && (
            <StarInput value={atmosphereRating} onChange={setAtmosphereRating} label="Atmosphere" />
          )}
          {surveyQuestions.overall && (
            <StarInput value={overallRating} onChange={setOverallRating} label="Overall Experience" />
          )}
          {surveyQuestions.comments && (
            <div className="mb-2">
              <p className="text-sm font-semibold text-gray-700 mb-2">Additional Comments <span className="text-gray-400 font-normal">(optional)</span></p>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                placeholder="Tell us more about your experience…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24] focus:border-transparent resize-none"
              />
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            className="w-full mt-4 py-3 rounded-xl bg-[#fe8a24] text-white text-sm font-semibold hover:bg-[#e07a1f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting…" : "Submit Feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}