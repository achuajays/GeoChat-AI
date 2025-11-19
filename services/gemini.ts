import { GoogleGenAI, Tool, GenerateContentResponse } from "@google/genai";
import { GeoLocation, Message, GroundingChunk } from "../types";

// We use gemini-2.5-flash as requested for robust tool use (Search/Maps)
const MODEL_NAME = "gemini-2.5-flash";

let aiClient: GoogleGenAI | null = null;

const getClient = () => {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiClient;
};

const COORDINATE_REGEX = /\{\{LAT:(-?\d+\.?\d*),\s*LNG:(-?\d+\.?\d*)\}\}/;

export const sendMessageToGemini = async (
  chatHistory: Message[],
  userLocation: GeoLocation | null
): Promise<Message> => {
  const ai = getClient();

  // Convert history to format expected by SDK
  // We only take the last few messages to keep context but avoid token limits/confusion
  const historyContext = chatHistory
    .slice(-10)
    .map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

  const tools: Tool[] = [
    { googleSearch: {} },
    { googleMaps: {} },
  ];

  const systemInstruction = `
You are GeoChat, an intelligent map-based assistant.
You have access to real-time Google Maps data and Google Search.
Use these tools to answer questions about locations, places, navigation, and local events.

IMPORTANT:
1. If you identify a specific location that is the main subject of your answer (e.g. "The Eiffel Tower", or a specific restaurant), you MUST append its coordinates to the VERY END of your response in this hidden format: {{LAT:12.3456, LNG:-78.9012}}.
2. Do not show this coordinate tag to the user in the text, it is for the map system.
3. If there are multiple locations, choose the most relevant one for the map center.
4. Always be helpful, concise, and polite.
5. Format your response with Markdown.
`;

  // Setup configuration with tools and location
  // Validate userLocation before sending to avoid invalid data
  const isValidUserLoc = userLocation && !isNaN(userLocation.lat) && !isNaN(userLocation.lng);

  const config: any = {
    tools: tools,
    systemInstruction: systemInstruction,
    toolConfig: isValidUserLoc
      ? {
          retrievalConfig: {
            latLng: {
              latitude: userLocation.lat,
              longitude: userLocation.lng,
            },
          },
        }
      : undefined,
  };

  try {
    // We use generateContent for a stateless-like request with history manually managed 
    // To ensure we update location every turn, we'll use `generateContent` with the full conversation history as the 'contents'.
    
    const contents = [
        ...historyContext
    ];

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      config: config,
    });

    const text = response.text || "I couldn't find an answer for that.";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;

    // Parse coordinates if present
    let suggestedLocation: GeoLocation | undefined;
    const match = text.match(COORDINATE_REGEX);
    let cleanText = text;

    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);

      if (!isNaN(lat) && !isNaN(lng)) {
        suggestedLocation = { lat, lng };
      }
      
      // Remove the technical tag from the display text
      cleanText = text.replace(match[0], '').trim();
    }

    // Parse related locations from grounding chunks (Google Maps)
    let relatedLocations: GeoLocation[] = [];
    if (groundingChunks) {
        groundingChunks.forEach(chunk => {
            if (chunk.maps?.uri) {
                // Extract coords from URI. 
                // Google Maps grounding URIs often contain !3dLAT!4dLNG or similar patterns
                const mapsMatch = chunk.maps.uri.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
                if (mapsMatch) {
                    const lat = parseFloat(mapsMatch[1]);
                    const lng = parseFloat(mapsMatch[2]);
                    if (!isNaN(lat) && !isNaN(lng)) {
                        relatedLocations.push({ lat, lng });
                    }
                }
            }
        });
    }

    return {
      id: crypto.randomUUID(),
      role: 'model',
      text: cleanText,
      groundingChunks,
      suggestedLocation,
      relatedLocations: relatedLocations.length > 0 ? relatedLocations : undefined,
      timestamp: Date.now(),
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to connect to GeoChat AI.");
  }
};