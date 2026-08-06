# PokéGuess 🎮

An interactive Pokémon quiz built with React and Vite. The game presents a variety of question types and session modes, and tracks score, lives, and high score progress across sessions.

![PokéGuess Banner](/src/assets/PokeGame.png)

## ✨ Features

### 🎯 Game Modes
- **Name**: Guess the Pokémon from its image
- **Type**: Identify the Pokémon's primary type
- **Generation**: Choose the generation the Pokémon belongs to
- **Ability**: Select the Pokémon's main ability
- **Evolution**: Find the evolved or pre-evolved form
- **Hybrid Mix**: Rotates through name, type, generation, ability, and evolution questions

### ⏱️ Session Options
- **1 Minute**: Fast-paced challenge
- **2 Minutes**: Extended gameplay
- **Endless**: Play until lives run out

### 🏆 Game Features
- **Scoring System**: Earn 100 points per correct answer plus a time bonus (`remaining round seconds × 10`)
- **Lives System**: 5 lives with penalty for wrong answers
- **High Score Tracking**: Persistent local storage
- **Round Timer**: 10 seconds per question, pauses while question/image is still loading
- **Session Timer**: Time-based gameplay modes, also pauses during loading states
- **Responsive Design**: Optimized for desktop and mobile

### 🎨 User Experience
- **Smooth Animations**: Engaging visual transitions
- **Buffered Round Pipeline**: Prepares upcoming rounds in advance for faster transitions
- **Decode-Aware Image Preloading**: Ensures at least one sprite source is ready before a round is presented
- **Adaptive Slow-Network Fallback**: Uses fast fallback rounds if generation exceeds latency threshold
- **Startup Warmup**: Staged prefetch with bounded concurrency to reduce early-round lag
- **Sound Effects**: Hover and click audio feedback
- **Responsive Controls**: Button-driven UI with touch-friendly layout
- **Accessibility**: Simple, readable overlays and clear feedback

## 🌐 Live Demo

👉 https://poke-guess-game.vercel.app

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/LibraAkaja/PokeGuess.git
   cd PokeGuess
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 🛠️ Tech Stack

- **Frontend Framework**: React 19
- **Build Tool**: Vite
- **Styling**: CSS with custom properties
- **API**: PokéAPI (https://pokeapi.co/)
- **State Management**: React hooks
- **Data Persistence**: Local Storage
- **Web App Support**: Manifest metadata and icons

## 🧠 Key Concepts

- React state management with hooks
- Custom timer implementation using `useEffect`, `useRef`
- Local storage persistence
- Optimized asset loading and preconnect hints
- Dynamic game state handling
- Fallback image handling strategy

## ⚡ Latency Handling Architecture

- **Loading-aware timers**: Round/session timers stop while round data or sprite is not ready.
- **Prepared queue**: Upcoming rounds are generated and buffered ahead of time.
- **Session caches**: Metadata and evolution candidate caches reduce repeated work within a play session.
- **Adaptive thresholding**: Slow-round fallback threshold and buffer depth are auto-tuned at runtime.
- **Sprite readiness gating**: Primary and fallback sprites are preloaded; round becomes active when a usable image is ready.
- **Network warmup**: DNS-prefetch and preconnect are enabled for API and sprite hosts.
- **Dev telemetry**: Console metrics report build latency, image prep latency, fallback rate, and buffer hit rate.

### Dev Telemetry Notes

- Telemetry logs are emitted in development mode only.
- Summary logs appear periodically and include runtime tuning state.
- These logs help tune latency thresholds for different network conditions.

## 📁 Project Structure

```
PokeGuess/
├── public/
│   ├── favicon files
│   └── site.webmanifest
├── src/
│   ├── assets/
│   │   └── PokeGame.png
│   ├── components/
│   │   ├── Game.jsx          # Main game component
│   │   ├── Timer.jsx         # Timer display
│   │   ├── Lives.jsx         # Lives counter
│   │   ├── Options.jsx       # Answer options
│   │   └── Scoreboard.jsx    # Score display
│   ├── hooks/
│   │   ├── useTimer.jsx      # Timer logic
│   │   └── useLocalStorage.jsx # Local storage hook
│   ├── styles/
│   │   ├── game.css          # Game-specific styles
│   │   ├── globals.css       # Global styles
│   │   ├── responsive.css    # Responsive design
│   │   └── animations.css    # Animations
│   ├── utils/
│   │   ├── fetchPokemon.js   # API data fetching
│   │   ├── getPokemonImage.js # Image handling
│   │   └── helpers.js        # Utility functions
│   ├── App.jsx               # Root component
│   └── main.jsx              # Application entry
├── package.json
├── vite.config.js
└── README.md
```

## 🎮 How to Play

1. **Choose Game Mode**: Select from Name, Type, Generation, Ability, Evolution, or Hybrid Mix
2. **Select Session**: Pick 1 minute, 2 minutes, or Endless
3. **Start Playing**:
   - Answer questions within 10 seconds
   - Correct answers: +100 points + time bonus (`remaining round seconds × 10`)
   - Wrong answers: Lose one life
   - Game ends when lives reach zero or the session timer expires
4. **Game Over Options**: Restart with the same settings or return to the main menu to choose new modes
5. **Beat Your High Score**: Try to top your best run!

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Quality

The project uses:
- **ESLint** for code linting
- **React Compiler** for optimized builds
- **Modern JavaScript** (ES6+)

## 🌐 API Usage

PokéGuess uses the [PokeAPI](https://pokeapi.co/) to fetch Pokémon data:

- **Data Source**: `https://pokeapi.co/api/v2/pokemon?limit=1000`
- **Images**: Official artwork and dream world sprites
- **Caching**: Local storage and in-memory session caches for faster repeated round generation
- **Delivery Optimizations**: DNS-prefetch/preconnect for PokéAPI and sprite CDN hosts

## 📱 Progressive Web App

This project includes a web app manifest and icons for installable metadata. There is no service worker configured in this repository, so offline caching is not currently enabled.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **PokeAPI** for providing comprehensive Pokémon data
- **Pokémon Company** for the amazing franchise
- **React Community** for excellent documentation and tools
- **RealFaviconGenerator** (https://realfavicongenerator.net/) for favicon generation
- **TextStudio** (https://textstudio.com/) for banner and logo design
- **Game Sounds** Pokémon Games, [Pixabay](https://pixabay.com/)

## ⚠️ Disclaimer

This project uses data from PokeAPI (https://pokeapi.co/).
Pokémon and Pokémon character names are trademarks of Nintendo, Game Freak, and The Pokémon Company.
This project is for educational and non-commercial purposes only.

## 📞 Support

If you have any questions or issues, please open an issue on GitHub.

---

**Made with ❤️ for Pokémon fans worldwide**