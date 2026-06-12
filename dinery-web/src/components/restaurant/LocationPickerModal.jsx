import React, { useState, useEffect, useRef } from 'react';

const STADIA_API_KEY = '2e776aa9-479d-420b-9eeb-70b6c5082869';

export default function LocationPickerModal({ isOpen, onClose, initialLocation, initialAddress, onLocationSelected }) {
  const [selectedLocation, setSelectedLocation] = useState(
    initialLocation || { lat: 60.1699, lng: 24.9384 }
  );
  const [selectedAddress, setSelectedAddress] = useState(initialAddress || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Initialize map when modal opens
  useEffect(() => {
    if (!isOpen || !mapRef.current) return;

    // Prevent double initialization
    if (mapInstanceRef.current) {
      console.log('Map already initialized, skipping...');
      return;
    }

    const loadLeaflet = async () => {
      try {
        // Add Leaflet CSS
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        // Load Leaflet JS
        if (!window.L) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        // Wait for Leaflet to be ready
        await new Promise(resolve => setTimeout(resolve, 100));

        const L = window.L;
        if (!L) {
          console.error('Leaflet failed to load');
          return;
        }

        // Double-check map isn't already initialized
        if (mapInstanceRef.current) {
          console.log('Map was initialized during loading, skipping...');
          return;
        }

        console.log('Initializing map...');

        // Remove any existing map container content
        if (mapRef.current) {
          mapRef.current.innerHTML = '';
          mapRef.current._leaflet_id = null;
        }

        // Initialize map
        mapInstanceRef.current = L.map(mapRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
        }).setView([selectedLocation.lat, selectedLocation.lng], 13);

        // Add tile layer
        L.tileLayer(
          `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png?api_key=${STADIA_API_KEY}`,
          {
            attribution: '© Stadia Maps',
            maxZoom: 20,
          }
        ).addTo(mapInstanceRef.current);

        // Add marker
        const orangeIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            width: 40px;
            height: 40px;
            background-color: #FF9800;
            border: 3px solid white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          ">
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(45deg);
              width: 12px;
              height: 12px;
              background-color: white;
              border-radius: 50%;
            "></div>
          </div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
        });

        markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], {
          icon: orangeIcon,
          draggable: true,
        }).addTo(mapInstanceRef.current);

        // Handle marker drag
        markerRef.current.on('dragend', async (e) => {
          const { lat, lng } = e.target.getLatLng();
          setSelectedLocation({ lat, lng });
          await reverseGeocode(lat, lng);
        });

        // Handle map click
        mapInstanceRef.current.on('click', async (e) => {
          const { lat, lng } = e.latlng;
          setSelectedLocation({ lat, lng });
          markerRef.current.setLatLng([lat, lng]);
          await reverseGeocode(lat, lng);
        });

        console.log('Map initialized successfully');
      } catch (error) {
        console.error('Error loading map:', error);
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };

    loadLeaflet();

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      if (mapInstanceRef.current) {
        try {
          console.log('Cleaning up map...');
          mapInstanceRef.current.remove();
        } catch (e) {
          console.error('Error removing map:', e);
        }
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen]); // Only depend on isOpen

  // Update marker when location changes
  useEffect(() => {
    if (markerRef.current && !isSearching) {
      markerRef.current.setLatLng([selectedLocation.lat, selectedLocation.lng]);
    }
  }, [selectedLocation, isSearching]);

  // Search location with debouncing
  const searchLocation = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set a new timeout for debouncing
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);

      try {
        const response = await fetch(
          `https://api.stadiamaps.com/geocoding/v1/search?text=${encodeURIComponent(query)}&api_key=${STADIA_API_KEY}&size=10`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const results = data.features.map((feature) => ({
            label: feature.properties.label || 'Unknown',
            name: feature.properties.name || '',
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0],
          }));
          setSearchResults(results);
          setShowResults(true);
        } else {
          setSearchResults([]);
          setShowResults(true);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        setShowResults(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Reverse geocode (get address from coordinates)
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.stadiamaps.com/geocoding/v1/reverse?point.lat=${lat}&point.lon=${lng}&api_key=${STADIA_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const address = data.features[0].properties.label || 'Unknown location';
        setSelectedAddress(address);
        setSearchQuery(address);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  // Select location from search results
  const selectLocation = (result) => {
    const newLocation = { lat: result.lat, lng: result.lng };
    
    // Update all state
    setSelectedLocation(newLocation);
    setSelectedAddress(result.label);
    setSearchQuery(result.label);
    setShowResults(false);
    setSearchResults([]);

    // Update map and marker with animation
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([result.lat, result.lng], 15, {
        duration: 1.5
      });
      markerRef.current.setLatLng([result.lat, result.lng]);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.trim().length >= 2) {
      searchLocation(value);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  // Handle confirm
  const handleConfirm = () => {
    onLocationSelected(selectedLocation, selectedAddress);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Select Location</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Bar with HIGHER Z-INDEX */}
        <div className="px-6 py-4 border-b border-gray-200 relative z-[80]">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search for a location..."
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent bg-white"
              autoComplete="off"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <div className="animate-spin h-5 w-5 border-2 border-[#FF9800] border-t-transparent rounded-full"></div>
              </div>
            )}
            {searchQuery && !isSearching && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowResults(false);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* Search Results Dropdown - HIGHEST Z-INDEX */}
            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-2xl max-h-64 overflow-y-auto z-[100]">
                {searchResults.length > 0 ? (
                  searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => selectLocation(result)}
                      className="w-full px-4 py-3 text-left hover:bg-orange-50 border-b border-gray-100 last:border-b-0 transition-colors flex items-start gap-3"
                    >
                      <svg className="h-5 w-5 text-[#FF9800] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div className="flex-1 text-left">
                        {result.name && (
                          <div className="font-semibold text-gray-900">{result.name}</div>
                        )}
                        <div className="text-sm text-gray-600">{result.label}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-gray-500 text-sm">
                    No locations found. Try a different search.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Map with LOWER Z-INDEX */}
        <div className="flex-1 relative z-[10]">
          <div ref={mapRef} className="w-full h-full min-h-[400px]"></div>
        </div>

        {/* Selected Location Info */}
        {selectedAddress && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 relative z-[20]">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-[#FF9800] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-500">Selected Location:</div>
                <div className="text-gray-900 font-medium">{selectedAddress}</div>
                <div className="text-sm text-gray-500 font-mono mt-1">
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 relative z-[20]">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-6 py-3 bg-[#FF9800] text-white rounded-lg font-semibold hover:bg-[#e07d20] transition-colors"
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}