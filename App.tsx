import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GeoLocation, Message, ChatSession } from './types';
import { sendMessageToGemini } from './services/gemini';
import MapComponent from './components/MapComponent';
import ChatBubble from './components/ChatBubble';
import { Send, MapPin, Navigation, Loader2, AlertCircle, Trash2, Menu, Plus, MessageSquare, X } from 'lucide-react';

// Helper to strictly validate locations when loading from storage
const isValidStoredLoc = (loc: any): boolean => {
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

const App: React.FC = () => {
  // --- State ---
  const [userLocation, setUserLocation] = useState<GeoLocation | null>(null);
  const [targetLocation, setTargetLocation] = useState<GeoLocation | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Session Management ---

  // Initialize Sessions from LocalStorage (with migration support)
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const savedSessions = localStorage.getItem('geochat_sessions');
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions);
        if (Array.isArray(parsedSessions)) {
            // Sanitize loaded data to prevent crashes from old corrupted state
            return parsedSessions.map((s: ChatSession) => ({
                ...s,
                messages: s.messages.map(m => ({
                    ...m,
                    suggestedLocation: isValidStoredLoc(m.suggestedLocation) ? m.suggestedLocation : undefined,
                    relatedLocations: m.relatedLocations?.filter(isValidStoredLoc)
                }))
            }));
        }
      }
      
      // Migration: Check for old single-history format
      const oldHistory = localStorage.getItem('geochat_history');
      if (oldHistory) {
        const msgs = JSON.parse(oldHistory);
        if (msgs && Array.isArray(msgs) && msgs.length > 0) {
           // Sanitize migrated messages too
           const sanitizedMsgs = msgs.map((m: Message) => ({
             ...m,
             suggestedLocation: isValidStoredLoc(m.suggestedLocation) ? m.suggestedLocation : undefined,
             relatedLocations: m.relatedLocations?.filter(isValidStoredLoc)
           }));

           const migratedSession: ChatSession = {
             id: crypto.randomUUID(),
             title: 'Restored Chat',
             messages: sanitizedMsgs,
             updatedAt: Date.now()
           };
           return [migratedSession];
        }
      }
    } catch (e) {
      console.error("Failed to load sessions", e);
    }
    return [];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // The active messages being displayed. 
  // We keep this in state for fast UI updates, then sync to sessions.
  const [messages, setMessages] = useState<Message[]>([]);

  // Ensure there is always an active session
  useEffect(() => {
    if (sessions.length === 0 && !currentSessionId) {
      createNewSession();
    } else if (sessions.length > 0 && !currentSessionId) {
      // Load most recent
      const mostRecent = sessions.sort((a, b) => b.updatedAt - a.updatedAt)[0];
      loadSession(mostRecent.id);
    }
  }, []); // Run once on mount logic essentially

  // Save sessions to LocalStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
        localStorage.setItem('geochat_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Sync active messages back to the current session object
  useEffect(() => {
    if (!currentSessionId) return;

    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        // Check if we need to update the title (if it's the default New Chat)
        let newTitle = session.title;
        if (session.title === 'New Chat' && messages.length > 1) {
           // Find first user message
           const firstUserMsg = messages.find(m => m.role === 'user');
           if (firstUserMsg) {
             newTitle = firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
           }
        }
        return {
          ...session,
          messages: messages,
          title: newTitle,
          updatedAt: Date.now()
        };
      }
      return session;
    }));
  }, [messages, currentSessionId]);


  // --- Actions ---

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [{
        id: 'welcome',
        role: 'model',
        text: "Hello! I'm GeoChat. I can help you find places, check detailed information, and navigate using Google Maps data. Where are we heading today?",
        timestamp: Date.now(),
      }],
      updatedAt: Date.now()
    };

    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages(newSession.messages);
    setTargetLocation(null); // Reset map target for new chat
    setIsSidebarOpen(false);
  };

  const loadSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      
      // Try to restore the last map target from this conversation
      const lastLocMsg = [...session.messages].reverse().find(m => m.suggestedLocation);
      if (lastLocMsg && lastLocMsg.suggestedLocation && isValidStoredLoc(lastLocMsg.suggestedLocation)) {
        setTargetLocation(lastLocMsg.suggestedLocation);
      } else {
        setTargetLocation(null);
      }
      
      setIsSidebarOpen(false);
    }
  };

  const deleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // Prevent clicking the session item
    if (window.confirm("Delete this chat?")) {
      const newSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(newSessions);
      
      // If we deleted the active session, switch to another or create new
      if (sessionId === currentSessionId) {
         if (newSessions.length > 0) {
            loadSession(newSessions[0].id);
         } else {
            createNewSession();
         }
      }
    }
  };

  // --- Location & Map ---

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.error("Error getting location:", error)
      );
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  // Extract related locations from the latest model message
  const relatedLocations = useMemo(() => {
    const lastModelMsg = [...messages].reverse().find(m => m.role === 'model');
    return lastModelMsg?.relatedLocations;
  }, [messages]);

  // --- Handlers ---

  const handleSendMessage = async (textOverride?: string) => {
    // Allow textOverride to support Quick Actions from Map
    const textToSend = typeof textOverride === 'string' ? textOverride : input;
    
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: textToSend.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsLoading(true);
    
    // If this was triggered from map (mobile), ensure we switch back to chat to see response
    if (textOverride && isMobileMapOpen) {
        setIsMobileMapOpen(false);
    }

    try {
      const currentHistory = [...messages, userMsg];
      // Use the latest known location (target or user) to ground the search nearby
      // If user asks "restaurants nearby" while looking at Tokyo, we want Tokyo results.
      const contextLocation = targetLocation || userLocation;
      
      const response = await sendMessageToGemini(currentHistory, contextLocation);
      
      setMessages((prev) => [...prev, response]);

      if (response.suggestedLocation && isValidStoredLoc(response.suggestedLocation)) {
        setTargetLocation(response.suggestedLocation);
      }
    } catch (error) {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'model',
        text: "I'm having trouble connecting to my map data right now. Please try again.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleManualLocationSelect = (loc: GeoLocation) => {
    // When user clicks map, just update the target
    setTargetLocation(loc);
  };
  
  const handleClearTarget = () => {
    setTargetLocation(null);
  }

  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden font-sans text-gray-900">
      
      {/* Left Panel: Chat Interface & Sidebar Container */}
      <section 
        aria-label="Chat Interface"
        className={`
        relative flex flex-col h-full bg-white shadow-xl z-10 transition-all duration-300 ease-in-out
        ${isMobileMapOpen ? 'hidden md:flex md:w-[400px] lg:w-[450px]' : 'flex w-full md:w-[400px] lg:w-[450px]'}
      `}>
        
        {/* Header */}
        <header className="h-16 border-b border-gray-100 flex items-center px-4 justify-between bg-white shrink-0 z-20 relative">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title="Chat History"
              aria-label={isSidebarOpen ? "Close History" : "Open History"}
              aria-expanded={isSidebarOpen}
            >
              <Menu size={22} aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                <Navigation size={18} fill="currentColor" aria-hidden="true" />
                </div>
                <h1 className="font-bold text-lg tracking-tight text-gray-800 hidden sm:block">GeoChat AI</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={createNewSession}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title="New Chat"
              aria-label="Start New Chat"
            >
              <Plus size={20} aria-hidden="true" />
              <span className="hidden sm:inline">New Chat</span>
            </button>

            <button 
                onClick={() => setIsMobileMapOpen(true)}
                className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg ml-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                title="View Map"
                aria-label="Switch to Map View"
            >
                <MapPin size={20} aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* History Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            role="dialog"
            aria-label="Chat History Sidebar"
            className="absolute top-16 left-0 w-full h-[calc(100%-4rem)] bg-white/95 backdrop-blur-sm z-30 border-r border-gray-200 flex flex-col animate-in slide-in-from-left-5 duration-200"
          >
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                <span className="font-semibold text-gray-700">Chat History</span>
                <button 
                    onClick={() => setIsSidebarOpen(false)} 
                    className="p-1 hover:bg-gray-100 rounded-full text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Close History"
                >
                    <X size={20} aria-hidden="true" />
                </button>
             </div>
             <div className="flex-1 overflow-y-auto p-2" role="list">
                {sessions.sort((a, b) => b.updatedAt - a.updatedAt).map(session => (
                    <button 
                        key={session.id}
                        onClick={() => loadSession(session.id)}
                        role="listitem"
                        className={`
                            w-full text-left group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all mb-1 border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500
                            ${currentSessionId === session.id ? 'bg-indigo-50 border-indigo-100 shadow-sm' : 'hover:bg-gray-50'}
                        `}
                    >
                        <div className={`p-2 rounded-lg ${currentSessionId === session.id ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                            <MessageSquare size={18} aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className={`text-sm font-medium truncate ${currentSessionId === session.id ? 'text-indigo-900' : 'text-gray-700'}`}>
                                {session.title}
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {new Date(session.updatedAt).toLocaleDateString()} • {new Date(session.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                        </div>
                        <div
                            role="button"
                            tabIndex={0} 
                            onClick={(e) => deleteSession(e, session.id)}
                            onKeyDown={(e) => { if(e.key === 'Enter') deleteSession(e as any, session.id) }}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
                            title="Delete Chat"
                            aria-label={`Delete chat ${session.title}`}
                        >
                            <Trash2 size={16} aria-hidden="true" />
                        </div>
                    </button>
                ))}
             </div>
          </div>
        )}

        {/* Messages Area */}
        <div 
            className="flex-1 overflow-y-auto p-4 scrollbar-hide bg-slate-50"
            role="log"
            aria-live="polite"
            aria-atomic="false"
        >
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          {isLoading && (
             <div className="flex w-full mb-6 justify-start">
               <div className="flex max-w-[75%] gap-3 flex-row">
                 <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shadow-sm text-white">
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                 </div>
                 <div className="flex items-center">
                   <span className="text-sm text-gray-400 animate-pulse">Thinking & searching maps...</span>
                 </div>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100 shrink-0 z-20">
           <div className="relative flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about a place..."
                aria-label="Chat Input"
                className="w-full bg-transparent border-none focus:ring-0 text-sm md:text-base resize-none max-h-32 py-1 placeholder:text-gray-400"
                rows={1}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                aria-label="Send Message"
                className="mb-0.5 p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"
              >
                <Send size={18} aria-hidden="true" />
              </button>
           </div>
           <div className="text-[10px] text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
             <AlertCircle size={10} aria-hidden="true" />
             <span>Using Gemini 2.5 Flash • Google Maps & Search Grounding</span>
           </div>
        </div>
      </section>

      {/* Right Panel: Map */}
      <section 
        aria-label="Interactive Map"
        className={`
        relative flex-1 h-full bg-gray-200
        ${isMobileMapOpen ? 'block' : 'hidden md:block'}
      `}>
        <MapComponent 
          userLocation={userLocation} 
          targetLocation={targetLocation}
          onLocationSelect={handleManualLocationSelect}
          onTriggerChat={handleSendMessage}
          onClearTarget={handleClearTarget}
          relatedLocations={relatedLocations}
        />

        {/* Mobile Back Button for Map */}
        <button
          onClick={() => setIsMobileMapOpen(false)}
          aria-label="Return to Chat"
          className="md:hidden absolute top-4 left-4 z-[1000] bg-white text-gray-800 p-3 rounded-full shadow-lg hover:bg-gray-50 font-medium text-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <div className="bg-indigo-100 p-1 rounded-full">
            <Navigation size={14} className="text-indigo-600 rotate-180" aria-hidden="true" /> 
          </div>
          Back to Chat
        </button>
        
        {/* Coordinates Overlay */}
        {targetLocation && (
          <div 
            role="status"
            className="absolute top-16 left-4 md:top-4 md:left-4 z-[1000] bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-lg border border-gray-200/50 max-w-[200px] transition-all animate-in fade-in slide-in-from-top-2"
          >
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Target</div>
            <div className="text-sm font-mono text-indigo-600">
              {targetLocation.lat.toFixed(4)}, {targetLocation.lng.toFixed(4)}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default App;