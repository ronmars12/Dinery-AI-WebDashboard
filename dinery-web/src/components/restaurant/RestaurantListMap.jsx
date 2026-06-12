import React, { useState, useEffect, useRef } from "react";

const GOOGLE_API_KEY = "AIzaSyCUASd5tq-_JzpWMPxAhkGtDWFDUCnmfK4";

export default function RestaurantSelectField({ form, setForm }) {
  const [userLatLng, setUserLatLng] = useState(null);
  const [placeResults, setPlaceResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const inputRef = useRef();

  // Get user's location when switching to select mode
  useEffect(() => {
    if (form.nameInputMethod === "select") {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLatLng({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          alert("Failed to get location: " + err.message);
          setLoading(false);
        }
      );
    } else {
      setUserLatLng(null);
      setPlaceResults([]);
      setQuery("");
      setDropdownVisible(false);
    }
  }, [form.nameInputMethod]);

  // Fetch restaurants nearby when we have user location (and on query change)
  useEffect(() => {
    if (form.nameInputMethod !== "select" || !userLatLng) return;

    setLoading(true);

    let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${userLatLng.lat},${userLatLng.lng}&radius=3000&type=restaurant&key=${GOOGLE_API_KEY}`;

    if (query.length > 0) {
      // If user types, use textsearch to filter names
      url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        query
      )}&location=${userLatLng.lat},${userLatLng.lng}&radius=3000&type=restaurant&key=${GOOGLE_API_KEY}`;
    }

    fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`)
      .then((res) => res.json())
      .then((data) => {
        setPlaceResults(
          (data.results || []).map((r) => ({
            place_id: r.place_id,
            name: r.name,
            address: r.vicinity || r.formatted_address || "",
          }))
        );
        setDropdownVisible(true);
      })
      .catch(() => setPlaceResults([]))
      .finally(() => setLoading(false));
  }, [userLatLng, query, form.nameInputMethod]);

  // Dropdown select handler
  const handleSelect = (rest) => {
    setForm((prev) => ({
      ...prev,
      name: rest.name,
      Location: rest.address,
    }));
    setQuery(rest.name);
    setDropdownVisible(false);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setDropdownVisible(true);
        }}
        onFocus={() => setDropdownVisible(true)}
        placeholder="Type to search nearby restaurants"
        className="w-full rounded-lg border border-[#23272f]/20 px-3 py-2.5 text-sm bg-[#f4f8f3] focus:border-[#fe8a24] focus:ring-2 focus:ring-[#fe8a24]/30 transition-all"
        disabled={form.nameInputMethod !== "select" || loading || !userLatLng}
      />
      {dropdownVisible && form.nameInputMethod === "select" && (
        <div className="absolute left-0 right-0 z-20 bg-white border border-[#23272f]/20 shadow-lg rounded-b-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-2 text-sm text-[#23272f]/60">
              Getting location & loading...
            </div>
          ) : placeResults.length === 0 ? (
            <div className="px-4 py-2 text-sm text-[#23272f]/60">
              No restaurants found nearby.
            </div>
          ) : (
            placeResults.map((rest) => (
              <div
                key={rest.place_id}
                className="px-4 py-2 hover:bg-[#fe8a24]/10 cursor-pointer"
                onClick={() => handleSelect(rest)}
              >
                <div className="font-medium">{rest.name}</div>
                <div className="text-xs text-gray-500">{rest.address}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
