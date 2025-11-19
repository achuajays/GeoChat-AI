# 🌍 GeoChat AI

**GeoChat AI** is an advanced, interactive map-based chatbot that bridges the gap between conversational AI and real-time geospatial data. Powered by **Google Gemini 2.5 Flash**, it leverages Google Search and Google Maps Grounding to provide accurate, location-aware responses, real-time weather data, and navigation tools.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react)
![Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-8E75B2.svg)
![Leaflet](https://img.shields.io/badge/Map-Leaflet-199900.svg)

## 🚀 Features

### 🧠 AI & Grounding
*   **Gemini 2.5 Flash Integration:** Uses Google's high-performance model for low-latency responses.
*   **Google Search & Maps Grounding:** The AI doesn't just hallucinate; it queries real-time Google data to find places, reviews, and specific coordinates.
*   **Context Awareness:** The AI knows where you are on the map. Searching for "restaurants" returns results based on your current viewport or target location.

### 🗺️ Interactive Map System
*   **Dynamic Map Control:** The AI drives the map. When you ask about a location, the map automatically flies to it.
*   **Multi-Location Rendering:** Search results (e.g., "parks near me") are parsed from the AI's reasoning and plotted as numbered pins on the map.
*   **Satellite & Street Views:** Toggle between OpenStreetMap and Esri World Imagery satellite layers.
*   **Navigation Tools:**
    *   **Distance Ruler:** Calculate straight-line distance between your location and a target using the Haversine formula.
    *   **Directions:** One-click link to Google Maps navigation.
    *   **Share Location:** Native Web Share API integration to send coordinates to friends.

### 🌦️ Real-Time Weather
*   **Hyper-local Weather:** Click any location to see current temperature, wind, humidity, pressure, and precipitation chance.
*   **Dynamic Markers:** Map pins change their icon (Sun, Cloud, Rain, Snow) based on the live weather code of that specific location.
*   **Powered by Open-Meteo:** No API key required for weather data.

### 💾 User Experience
*   **Session Management:** Create new chats, browse history, and restore previous map contexts.
*   **Local Persistence:** Chat history is saved to `localStorage` so you never lose a conversation.
*   **Markdown Support:** Rich text rendering for AI responses, including source citations.
*   **Responsive Design:** Fully functional on Mobile (with collapsible map view) and Desktop (split-screen).

---

## 🛠️ Technical Architecture

The application is built as a Single Page Application (SPA) using **React 19** and **TypeScript**.

### Core Stack
*   **Frontend Framework:** React 19
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (Utility-first styling)
*   **Map Engine:** Leaflet & React-Leaflet
*   **Icons:** Lucide React

### AI & Data Layer
*   **SDK:** `@google/genai` (Official Google GenAI SDK)
*   **Model:** `gemini-2.5-flash`
*   **Tools Used:** `googleSearch`, `googleMaps`
*   **Weather API:** Open-Meteo (REST API)

### Data Flow
1.  **User Input:** User types a query ("Show me weather in Tokyo").
2.  **Context Assembly:** The app bundles the chat history + the user's current map coordinates (`toolConfig.retrievalConfig`).
3.  **AI Processing:** Gemini processes the request. If it needs data, it uses the `googleSearch` or `googleMaps` tool.
4.  **Response Parsing:**
    *   **Text:** Rendered as Markdown.
    *   **Grounding Chunks:** URLs for Google Maps sources are parsed to extract specific Lat/Lng coordinates.
    *   **Hidden Tags:** The system prompt instructs Gemini to append specific target coordinates (if found) in a hidden format (`{{LAT:x, LNG:y}}`), which the frontend intercepts to trigger map animations.

---

## 📦 Installation & Setup

### Prerequisites
*   Node.js (v18 or higher recommended)
*   A Google AI Studio API Key (Get one [here](https://aistudio.google.com/))

### 1. Clone the Repository
```bash
git clone https://github.com/achuajays/GeoChat-AI.git
cd GeoChat-AI
```

### 2. Install Dependencies
*Note: If running in a standard local environment, ensure you have a `package.json` setup for React + Vite. If using the provided code which utilizes CDN imports, you may run it via a simple HTTP server.*

**For standard React/Vite setup:**
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory and add your Google API key:

```env
API_KEY=your_google_ai_studio_api_key_here
```

> **Security Note:** Never commit your `.env` file to GitHub. Ensure it is in your `.gitignore`.

### 4. Run the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

---

## 📖 Usage Guide

1.  **Location Access:** Allow the browser to access your location for the best experience.
2.  **Chatting:**
    *   Type "Take me to Paris" -> The map flies to Paris.
    *   Type "What is the weather there?" -> The weather widget updates.
    *   Type "Find Italian restaurants nearby" -> Pins appear on the map.
3.  **Map Controls:**
    *   **Share Icon:** Copies location link or opens native share sheet.
    *   **Layers Icon:** Toggles Satellite view.
    *   **Compass Icon:** Opens "Explore" menu for quick searches (Hotels, Parks, etc.).
    *   **Ruler Icon:** Measures distance from you to the target pin.
    *   **Cloud Icon:** Toggles the detailed weather card.

---

## 🤝 Contributing

Contributions are welcome!

1.  Fork the project.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Repository:** [https://github.com/achuajays/GeoChat-AI.git](https://github.com/achuajays/GeoChat-AI.git)
