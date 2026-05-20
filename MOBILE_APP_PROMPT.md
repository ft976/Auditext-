# Mobile App Generation Prompt: Auditext

Below is the highly detailed, comprehensive prompt you can use to generate the exact same application in a native mobile development environment (like React Native/Expo or Flutter).

***

**System / Context:**
You are an expert mobile app developer. I need you to build a production-ready, highly polished mobile application called "Auditext" – a professional-grade Text-to-Speech (TTS) studio that bridges multiple industry-leading AI voice providers into a single, unified interface. 

**Tech Stack:**
- **Framework:** React Native with Expo (or Flutter, adjust as needed).
- **Styling:** Nativewind (Tailwind for React Native) or equivalent.
- **Backend/Services:** Firebase (Authentication and Firestore).
- **Icons:** Lucide-react-native.
- **Audio Playback:** Expo-av.

**Core Mechanisms & Logic:**

1. **Authentication & Data Synchronization:**
   - Implement Firebase Authentication (Google Sign-In). 
   - Implement a generic "Local First" approach. If the user is unauthenticated, save session history and settings (provider API keys, selected voices) locally using `AsyncStorage`.
   - If the user logs in, synchronize the local history to Firebase Firestore and fetch any existing history. Update history in real-time using Firestore `onSnapshot`.

2. **API Key & Provider Management:**
   - The app must support 5 providers: Google Gemini, OpenAI, ElevenLabs, Deepgram, and Cartesia.
   - Users need a Settings screen (or Bottom Sheet) where they can input their secure API keys for these providers. Keys must be handled securely and kept in local storage.
   - Mechanism: When a user enters a key, trigger a "Verify Key" API endpoint (or direct SDK call) to ensure the key is valid before saving it. Show validation UI (green check for valid, red error for invalid).

3. **Text-to-Speech Generation Engine:**
   - Implement a unified `/api/tts` logic that takes: `text`, `voice`, `emotion`, `language`, `provider`, and `apiKeys`.
   - Depending on the selected provider, route the TTS synthesis request appropriately.
   - Handle audio buffering/playback. When the audio buffer is returned, play it immediately using the device's native audio player engine.
   - Support Play, Pause, Resume, and Stop mechanisms.
   - Support playback speed control (slider from 0.5x to 2.0x).
   - Support downloading/saving the generated audio file to the device's local file system.

4. **UI/UX & Components (Mobile First Layout):**
   - **Themeing:** Implement a forced dark mode or system-aware toggle (Dark/Light). Use a clean, slate/charcoal dark theme with primary accent colors.
   - **Header:** Fixed top navigation bar. Title "Auditext" with an animated audio wave icon. A button to open Settings, and a button to open History.
   - **Main Script Input:** A large, multiline text input area for the user to type the script. Include a character counter or quote randomizer for empty states.
   - **Controls Section (Cards/Bottom Sheets):**
     - **Voice Model:** A horizontal scrollable list of voice profiles (Nova, Shimmer, Echo, Fable, Onyx, Alloy). Each should have an avatar, name, and gender badge.
     - **Emotion & Tone:** A grid of selectable emotion chips (Neutral, Happy, Serious, Sad, Excited).
     - **Language:** A dropdown or native picker for language selection (English, Spanish, French, etc.).
   - **Playback Bar (Sticky Bottom):** A sticky bottom control bar containing the main "Generate & Play" button, along with Pause/Stop buttons when audio is active. Also include the playback speed slider here.
   - **History Screen:** A separate screen or full-screen modal showing a list of past generations. Each item displays the text snippet, used provider, voice, emotion, and an inline play button. Include "Swipe to delete" functionality for items.

5. **State Management:**
   - Use React Context (e.g., `StudioContext`) to manage the current text, selected voice, emotion, language, speed, and raw audio buffer state globally so that mini-players or different screens stay synchronized.
   - Maintain a `status` state: "idle", "loading", "playing", "paused", "error".

6. **Design Details & Polish:**
   - Use smooth spring animations for layout transitions, button presses, and modal openings (using `react-native-reanimated`).
   - Use Haptic Feedback (e.g., `expo-haptics`) when a user selects a voice, emotion, or initiates playback.
   - Ensure the UI feels spacious with large, tap-friendly touch targets (min 44x44 points).
   - Do not display raw error logs; show user-friendly toast messages (e.g., "API Key invalid", "Failed to generate audio").

**Execution Steps for the AI:**
First, initialize the Expo project and necessary configurations. Second, implement the Firebase Auth and Firestore contexts. Third, build the UI components natively following the design system outlined. Fourth, implement the audio player and API integrations. Ensure perfect alignment, padding, and mobile-native scrolling physics.
