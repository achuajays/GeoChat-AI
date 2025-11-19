export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
  maps?: {
    uri?: string;
    title?: string;
    placeAnswerSources?: {
        reviewSnippets?: {
            reviewText: string;
        }[]
    }
  };
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  groundingChunks?: GroundingChunk[];
  timestamp: number;
  suggestedLocation?: GeoLocation; // Parsed from response for map interaction
  relatedLocations?: GeoLocation[]; // Additional locations found in grounding
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}