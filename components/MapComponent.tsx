import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { GeoLocation } from '../types';
import L from 'leaflet';
import WeatherWidget from './WeatherWidget';
import { 
  CloudSun, Share2, Layers, Crosshair, Compass, Navigation, 
  Ruler, Maximize, XCircle, Utensils, Trees, Bed, Video 
} from 'lucide-react';

// Fix for default marker icons in React Leaflet
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapComponentProps {
  userLocation: GeoLocation | null;
  targetLocation: GeoLocation | null;
  onLocationSelect: (loc: GeoLocation) => void;
  onTriggerChat: (text: string) => void;
  onClearTarget: () => void;
  relatedLocations?: GeoLocation[];
}

// Helper to validate coordinates strictly
const isValidLocation = (loc: any): loc is GeoLocation => {
  return (
    loc !== null &&
    loc !== undefined &&
    typeof loc === 'object' &&
    typeof loc.lat === 'number' &&
    !Number.isNaN(loc.lat) &&
    isFinite(loc.lat) &&
    typeof loc.lng === 'number' &&
    !Number.isNaN(loc.lng) &&
    isFinite(loc.lng)
  );
};

// Component to fly to target location when it changes
const MapUpdater: React.FC<{ targetLocation: GeoLocation | null, relatedLocations?: GeoLocation[] }> = ({ targetLocation, relatedLocations }) => {
  const map = useMap();
  
  useEffect(() => {
    // Filter out any potential invalid locations to prevent Leaflet crashing
    const validRelated = relatedLocations?.filter(isValidLocation) || [];

    // If we have multiple related locations, fit bounds to show all
    if (validRelated.length > 0) {
       // Map to array format [lat, lng]
       const points = validRelated.map(l => [l.lat, l.lng] as [number, number]);
       
       // If target exists and is valid, include it
       if (isValidLocation(targetLocation)) {
         points.push([targetLocation.lat, targetLocation.lng]);
       }
       
       if (points.length > 0) {
           const bounds = L.latLngBounds(points);
           if (bounds.isValid()) {
             map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true, duration: 1.5 });
           }
       }
       return;
    }

    // Otherwise fly to single target
    if (isValidLocation(targetLocation)) {
      map.flyTo([targetLocation.lat, targetLocation.lng], 15, {
        duration: 2,
      });
    }
  }, [targetLocation, relatedLocations, map]);

  return null;
};

// Helper for Recenter Logic
const MapRecenter: React.FC<{ trigger: number, location: GeoLocation | null }> = ({ trigger, location }) => {
    const map = useMap();
    useEffect(() => {
        if (trigger > 0 && isValidLocation(location)) {
            map.flyTo([location.lat, location.lng], 16, { duration: 1.5 });
        }
    }, [trigger, location, map]);
    return null;
};

// Component to handle clicks on map
const LocationSelector: React.FC<{ onSelect: (loc: GeoLocation) => void }> = ({ onSelect }) => {
    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;
            if (typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng)) {
                onSelect({ lat, lng });
            }
        },
    });
    return null;
};

// Custom Marker that changes icon based on weather
const WeatherMarker: React.FC<{ position: GeoLocation }> = ({ position }) => {
  const [weatherCode, setWeatherCode] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!isValidLocation(position)) return;

    const fetchIconWeather = async () => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${position.lat}&longitude=${position.lng}&current=weather_code`
        );
        if (response.ok) {
          const data = await response.json();
          if (isMounted && data.current) {
            setWeatherCode(data.current.weather_code);
          }
        }
      } catch (e) {
        console.warn("Failed to fetch weather for marker icon");
      }
    };

    fetchIconWeather();
    return () => { isMounted = false; };
  }, [position.lat, position.lng]);

  const icon = useMemo(() => {
    if (weatherCode === null) return DefaultIcon;

    let emoji = '🌤️';
    let bgClass = 'bg-gray-400';
    
    if (weatherCode === 0) { 
        emoji = '☀️'; 
        bgClass = 'bg-amber-400'; 
    } else if (weatherCode >= 1 && weatherCode <= 3) { 
        emoji = '☁️'; 
        bgClass = 'bg-blue-300'; 
    } else if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) { 
        emoji = '🌧️'; 
        bgClass = 'bg-blue-500'; 
    } else if ((weatherCode >= 71 && weatherCode <= 77) || (weatherCode >= 85 && weatherCode <= 86)) { 
        emoji = '❄️'; 
        bgClass = 'bg-cyan-300'; 
    } else if (weatherCode >= 95) { 
        emoji = '⛈️'; 
        bgClass = 'bg-indigo-600'; 
    }

    const html = `
      <div class="relative group">
        <div class="${bgClass} w-10 h-10 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xl z-10 relative">
          ${emoji}
        </div>
        <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 shadow-sm z-0"></div>
      </div>
    `;

    return L.divIcon({
      className: 'bg-transparent border-none',
      html: html,
      iconSize: [40, 46],
      iconAnchor: [20, 46],
      popupAnchor: [0, -46]
    });
  }, [weatherCode]);

  if (!isValidLocation(position)) return null;

  return (
    <Marker position={[position.lat, position.lng]} icon={icon}>
      <Popup className="min-w-[280px]">
        <div className="font-semibold text-gray-800 border-b border-gray-100 pb-1 mb-1">Location Details</div>
        <div className="mt-3">
          <WeatherWidget lat={position.lat} lng={position.lng} />
        </div>
      </Popup>
    </Marker>
  );
};

// Secondary markers for related locations (search results)
const RelatedMarker: React.FC<{ position: GeoLocation, index: number }> = ({ position, index }) => {
    const icon = useMemo(() => {
        const html = `
          <div class="relative group">
            <div class="bg-orange-500 text-white w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center font-bold text-xs z-10 relative">
              ${index + 1}
            </div>
            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 shadow-sm z-0"></div>
          </div>
        `;
        return L.divIcon({
            className: 'bg-transparent border-none',
            html: html,
            iconSize: [32, 38],
            iconAnchor: [16, 38],
            popupAnchor: [0, -38]
        });
    }, [index]);

    if (!isValidLocation(position)) return null;

    return <Marker position={[position.lat, position.lng]} icon={icon} />;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
    userLocation, 
    targetLocation, 
    onLocationSelect, 
    onTriggerChat,
    onClearTarget,
    relatedLocations 
}) => {
  const [isWeatherOpen, setIsWeatherOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [distanceMsg, setDistanceMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Default to London if no location known initially
  const defaultPosition: [number, number] = [51.505, -0.09];
  
  const center: [number, number] = isValidLocation(userLocation) 
    ? [userLocation.lat, userLocation.lng] 
    : defaultPosition;

  const activeTarget = isValidLocation(targetLocation) 
    ? targetLocation 
    : (isValidLocation(userLocation) ? userLocation : null);
    
  // Prepare valid related locations once for rendering
  const validRelatedLocations = useMemo(() => 
    relatedLocations?.filter(isValidLocation) || [], 
  [relatedLocations]);

  // --- Action Handlers ---

  const handleShareLocation = async () => {
    if (!isValidLocation(userLocation)) {
       alert("Waiting for your GPS location...");
       return;
    }
    
    const url = `https://www.google.com/maps/search/?api=1&query=${userLocation.lat},${userLocation.lng}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Current Location',
          text: 'I am here:',
          url: url
        });
      } catch (err) {
        console.debug('Share cancelled');
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert('Location link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
  };

  const handleToggleLayer = () => {
    setMapStyle(prev => prev === 'street' ? 'satellite' : 'street');
  };

  const handleRecenter = () => {
    if (isValidLocation(userLocation)) {
        setRecenterTrigger(prev => prev + 1);
    } else {
        alert("User location not available yet.");
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
        containerRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const handleDirections = () => {
    if (!isValidLocation(userLocation) || !isValidLocation(targetLocation)) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${targetLocation.lat},${targetLocation.lng}`;
    window.open(url, '_blank');
  };

  const handleMeasureDistance = () => {
    if (isValidLocation(userLocation) && isValidLocation(targetLocation)) {
        // Haversine Formula
        const R = 6371; // km
        const dLat = (targetLocation.lat - userLocation.lat) * Math.PI / 180;
        const dLon = (targetLocation.lng - userLocation.lng) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(targetLocation.lat * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c;
        
        setDistanceMsg(`${d.toFixed(1)} km`);
        setTimeout(() => setDistanceMsg(null), 3000);
    } else {
        setDistanceMsg("Need 2 points");
        setTimeout(() => setDistanceMsg(null), 2000);
    }
  };

  const handleQuickExplore = (query: string) => {
    setIsExploreOpen(false);
    const context = targetLocation ? "around the selected location" : "around here";
    onTriggerChat(`Find ${query} ${context}`);
  };

  return (
    <div ref={containerRef} className="h-full w-full relative z-0 group">
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        {/* Tile Layer Toggle */}
        {mapStyle === 'street' ? (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
        ) : (
            <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
        )}
        
        {/* User Location Marker */}
        {isValidLocation(userLocation) && (
          <Marker position={[userLocation.lat, userLocation.lng]} title="My Location">
            <Popup>
              <div className="font-semibold text-indigo-600">Your Location</div>
            </Popup>
          </Marker>
        )}

        {/* Target Location Marker */}
        {isValidLocation(targetLocation) && (
           <WeatherMarker position={targetLocation} />
        )}

        {/* Related Locations (Search Results) */}
        {validRelatedLocations.map((loc, idx) => (
            <RelatedMarker key={`${loc.lat}-${loc.lng}-${idx}`} position={loc} index={idx} />
        ))}

        <MapUpdater targetLocation={activeTarget} relatedLocations={validRelatedLocations} />
        <MapRecenter trigger={recenterTrigger} location={userLocation} />
        <LocationSelector onSelect={onLocationSelect} />
      </MapContainer>
      
      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2 pointer-events-auto">
        
        {/* 1. Share Button */}
        <button
            onClick={handleShareLocation}
            className="p-3 rounded-full shadow-lg bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
            title="Share My Location"
            aria-label="Share Location"
        >
            <Share2 size={20} aria-hidden="true" />
        </button>

        {/* 2. Layer Toggle */}
        <button
            onClick={handleToggleLayer}
            className={`p-3 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 ${mapStyle === 'satellite' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            title="Switch Map Style"
            aria-label="Toggle Satellite View"
        >
            <Layers size={20} aria-hidden="true" />
        </button>

        {/* 3. Fullscreen */}
        <button
            onClick={handleFullscreen}
            className="p-3 rounded-full shadow-lg bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 hidden md:flex"
            title="Toggle Fullscreen"
            aria-label="Toggle Fullscreen"
        >
            <Maximize size={20} aria-hidden="true" />
        </button>

        {/* 4. Clear Target (Only if target exists) */}
        {targetLocation && (
            <button
                onClick={onClearTarget}
                className="p-3 rounded-full shadow-lg bg-white text-red-500 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200"
                title="Clear Target Pin"
                aria-label="Clear Map Target"
            >
                <XCircle size={20} aria-hidden="true" />
            </button>
        )}
      </div>

      {/* Bottom Right Controls (Action Group) */}
      <div className="absolute bottom-24 right-4 md:bottom-8 md:right-4 z-[1000] flex flex-col items-end gap-2 pointer-events-auto">
        
        {/* 5. Directions (Only if target exists) */}
        {targetLocation && userLocation && (
             <button
                onClick={handleDirections}
                className="p-3 rounded-full shadow-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 animate-in zoom-in"
                title="Get Directions"
                aria-label="Get Directions"
            >
                <Navigation size={20} aria-hidden="true" />
            </button>
        )}

        {/* 6. Distance Ruler */}
        <div className="relative flex items-center">
            {distanceMsg && (
                <div className="absolute right-full mr-2 bg-black/75 text-white text-xs px-2 py-1 rounded whitespace-nowrap animate-in fade-in slide-in-from-right-2">
                    {distanceMsg}
                </div>
            )}
            <button
                onClick={handleMeasureDistance}
                className="p-3 rounded-full shadow-lg bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                title="Measure Distance"
                aria-label="Measure Distance"
            >
                <Ruler size={20} aria-hidden="true" />
            </button>
        </div>

        {/* 7. Explore Menu */}
        <div className="relative">
            {isExploreOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 p-1 flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 origin-bottom-right">
                    {[
                        { label: 'Restaurants', icon: <Utensils size={16} /> },
                        { label: 'Parks', icon: <Trees size={16} /> },
                        { label: 'Hotels', icon: <Bed size={16} /> },
                        { label: 'Sights', icon: <Video size={16} /> }
                    ].map(item => (
                        <button
                            key={item.label}
                            onClick={() => handleQuickExplore(item.label)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors text-left w-full"
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            )}
            <button
                onClick={() => setIsExploreOpen(!isExploreOpen)}
                className={`p-3 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 ${isExploreOpen ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                title="Explore Nearby"
                aria-label="Explore Nearby Places"
                aria-expanded={isExploreOpen}
                aria-haspopup="menu"
            >
                <Compass size={20} aria-hidden="true" />
            </button>
        </div>

        {/* Weather Toggle */}
        <button
            onClick={() => setIsWeatherOpen(!isWeatherOpen)}
            className={`p-3 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 ${isWeatherOpen ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            title="Toggle Weather"
            aria-label="Toggle Weather"
            aria-expanded={isWeatherOpen}
        >
            <CloudSun size={20} aria-hidden="true" />
        </button>

        {/* Weather Floating Card */}
        {isWeatherOpen && activeTarget && isValidLocation(activeTarget) && (
            <div 
                role="dialog"
                className="absolute bottom-0 right-14 bg-white p-2 rounded-xl shadow-xl border border-gray-100 w-[300px] animate-in fade-in slide-in-from-right-5 origin-bottom-right"
            >
                 <div className="flex justify-between items-center px-2 pb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {activeTarget === targetLocation ? 'Target Location' : 'My Location'}
                    </span>
                 </div>
                 <WeatherWidget lat={activeTarget.lat} lng={activeTarget.lng} />
            </div>
        )}

        {/* 8. Recenter (Floating separately below) */}
         <button
            onClick={handleRecenter}
            className="mt-2 p-3 rounded-full shadow-lg bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
            title="Recenter Map"
            aria-label="Recenter Map to User Location"
        >
            <Crosshair size={20} aria-hidden="true" />
        </button>
      </div>
      
      <div 
        role="status"
        className="absolute bottom-6 left-6 z-[500] bg-white/90 backdrop-blur p-2 rounded-lg shadow-lg text-xs text-gray-600 pointer-events-none"
      >
        {isValidLocation(userLocation) ? "GPS Active" : "Locating..."}
      </div>
    </div>
  );
};

export default MapComponent;