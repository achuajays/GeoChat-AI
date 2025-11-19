import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, GroundingChunk } from '../types';
import { MapPin, Link as LinkIcon, User, Bot } from 'lucide-react';

interface ChatBubbleProps {
  message: Message;
}

const GroundingSourceCard: React.FC<{ chunk: GroundingChunk }> = ({ chunk }) => {
  if (chunk.maps) {
    const { maps } = chunk;
    return (
      <a 
        href={maps.uri} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block mt-2 p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors group"
      >
        <div className="flex items-start gap-3">
          <div className="bg-blue-500 p-1.5 rounded-full text-white mt-0.5 group-hover:scale-110 transition-transform">
            <MapPin size={14} />
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 text-sm">{maps.title}</h4>
            <p className="text-xs text-blue-700 mt-1 truncate max-w-[200px]">View on Google Maps</p>
          </div>
        </div>
      </a>
    );
  }

  if (chunk.web) {
    const { web } = chunk;
    return (
      <a 
        href={web.uri} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block mt-2 p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors group"
      >
        <div className="flex items-start gap-3">
          <div className="bg-gray-500 p-1.5 rounded-full text-white mt-0.5 group-hover:scale-110 transition-transform">
            <LinkIcon size={14} />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm">{web.title}</h4>
            <p className="text-xs text-gray-500 mt-1">Google Search Source</p>
          </div>
        </div>
      </a>
    );
  }
  
  return null;
};

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isModel = message.role === 'model';

  return (
    <div className={`flex w-full mb-6 ${isModel ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${isModel ? 'flex-row' : 'flex-row-reverse'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${isModel ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'}`}>
          {isModel ? <Bot size={18} /> : <User size={18} />}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
          <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed ${
            isModel 
              ? 'bg-white text-gray-800 border border-gray-100 rounded-tl-none' 
              : 'bg-indigo-600 text-white rounded-tr-none'
          }`}>
             {isModel ? (
                <ReactMarkdown 
                  className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0"
                  components={{
                    a: ({node, ...props}) => <a {...props} className="text-indigo-600 underline hover:text-indigo-800" target="_blank" rel="noreferrer" />
                  }}
                >
                  {message.text}
                </ReactMarkdown>
             ) : (
               <p>{message.text}</p>
             )}
          </div>

          {/* Grounding Sources (Model Only) */}
          {isModel && message.groundingChunks && message.groundingChunks.length > 0 && (
            <div className="mt-3 w-full grid grid-cols-1 gap-2">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Sources</div>
              {message.groundingChunks.map((chunk, idx) => (
                <GroundingSourceCard key={idx} chunk={chunk} />
              ))}
            </div>
          )}
          
          <span className="text-[10px] text-gray-400 mt-1 px-1">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
