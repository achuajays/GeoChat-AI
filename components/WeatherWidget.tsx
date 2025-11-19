import React, { useEffect, useState } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Loader2, Droplets, Umbrella, Gauge } from 'lucide-react';

interface WeatherData {
  temperature: number;
  windSpeed: number;
  weatherCode: number;
  humidity: number;
  pressure: number;
  precipChance: number;
}

interface WeatherWidgetProps {
  lat: number;
  lng: number;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ lat, lng }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch current conditions + hourly precipitation probability to calculate current chance
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,surface_pressure&hourly=precipitation_probability&timezone=auto&forecast_days=1`
        );
        
        if (!response.ok) throw new Error('Weather data unavailable');
        
        const data = await response.json();
        
        // Get current hour index for precipitation probability
        const currentHour = new Date().getHours();
        const currentPrecipChance = data.hourly?.precipitation_probability?.[currentHour] ?? 0;

        setWeather({
          temperature: data.current.temperature_2m,
          windSpeed: data.current.wind_speed_10m,
          weatherCode: data.current.weather_code,
          humidity: data.current.relative_humidity_2m,
          pressure: data.current.surface_pressure,
          precipChance: currentPrecipChance,
        });
      } catch (err) {
        setError('Failed to load weather');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [lat, lng]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 text-gray-400 bg-white/50 rounded-xl border border-slate-100">
        <Loader2 size={18} className="animate-spin mr-2" />
        <span className="text-xs font-medium">Forecasting...</span>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="p-3 text-xs text-red-400 bg-red-50 rounded-lg border border-red-100">
        {error || 'No weather data available'}
      </div>
    );
  }

  // WMO Weather interpretation codes
  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="text-amber-500" size={32} />;
    if (code >= 1 && code <= 3) return <Cloud className="text-gray-400" size={32} />;
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain className="text-blue-500" size={32} />;
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return <CloudSnow className="text-cyan-400" size={32} />;
    return <Cloud className="text-gray-400" size={32} />;
  };

  const getWeatherDescription = (code: number) => {
    if (code === 0) return "Clear Sky";
    if (code >= 1 && code <= 3) return "Partly Cloudy";
    if (code >= 45 && code <= 48) return "Foggy";
    if (code >= 51 && code <= 55) return "Drizzle";
    if (code >= 56 && code <= 57) return "Freezing Drizzle";
    if (code >= 61 && code <= 65) return "Rain";
    if (code >= 66 && code <= 67) return "Freezing Rain";
    if (code >= 71 && code <= 75) return "Snow Fall";
    if (code >= 77) return "Snow Grains";
    if (code >= 80 && code <= 82) return "Rain Showers";
    if (code >= 85 && code <= 86) return "Snow Showers";
    if (code >= 95) return "Thunderstorm";
    return "Overcast";
  };

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header: Main Temp & Icon */}
      <div className="p-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex flex-col">
          <span className="text-3xl font-bold text-slate-800 tracking-tight">{Math.round(weather.temperature)}°</span>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">{getWeatherDescription(weather.weatherCode)}</span>
        </div>
        <div className="p-2 bg-white rounded-full shadow-sm border border-slate-100">
            {getWeatherIcon(weather.weatherCode)}
        </div>
      </div>
      
      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-px bg-slate-100">
        <div className="bg-white p-3 flex flex-col justify-center items-center text-center group">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1 group-hover:text-blue-500 transition-colors">
                <Wind size={14} />
                <span className="text-[10px] font-semibold uppercase">Wind</span>
            </div>
            <span className="text-sm font-bold text-slate-700">{weather.windSpeed} <span className="text-[10px] font-normal text-slate-400">km/h</span></span>
        </div>

        <div className="bg-white p-3 flex flex-col justify-center items-center text-center group">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1 group-hover:text-blue-500 transition-colors">
                <Droplets size={14} />
                <span className="text-[10px] font-semibold uppercase">Humidity</span>
            </div>
            <span className="text-sm font-bold text-slate-700">{weather.humidity}<span className="text-[10px] font-normal text-slate-400">%</span></span>
        </div>

        <div className="bg-white p-3 flex flex-col justify-center items-center text-center group">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1 group-hover:text-blue-500 transition-colors">
                <Gauge size={14} />
                <span className="text-[10px] font-semibold uppercase">Pressure</span>
            </div>
            <span className="text-sm font-bold text-slate-700">{Math.round(weather.pressure)} <span className="text-[10px] font-normal text-slate-400">hPa</span></span>
        </div>

        <div className="bg-white p-3 flex flex-col justify-center items-center text-center group">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1 group-hover:text-blue-500 transition-colors">
                <Umbrella size={14} />
                <span className="text-[10px] font-semibold uppercase">Precip</span>
            </div>
            <span className="text-sm font-bold text-slate-700">{weather.precipChance}<span className="text-[10px] font-normal text-slate-400">%</span></span>
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;