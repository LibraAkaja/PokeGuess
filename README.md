# PokéGuess 🎮

A modern, interactive Pokémon guessing game built with React that tests your Pokémon knowledge through multiple challenging game modes.

![PokéGuess Banner](https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png)

## ✨ Features

### 🎯 Game Modes
- **Name Mode**: Guess the Pokémon from its image
- **Type Mode**: Identify the Pokémon's type
- **Combined Mode**: Mix of both name and type questions

### ⏱️ Session Options
- **1 Minute**: Fast-paced challenge
- **2 Minutes**: Extended gameplay
- **Endless**: Unlimited playtime

### 🏆 Game Features
- **Scoring System**: Earn 100 points per correct answer
- **Lives System**: 5 lives with penalty for wrong answers
- **High Score Tracking**: Persistent local storage
- **Round Timer**: 10 seconds per question
- **Session Timer**: Time-based gameplay modes
- **Responsive Design**: Optimized for all devices

### 🎨 User Experience
- **Smooth Animations**: Engaging visual feedback
- **Optimized Image Loading**: Instant rendering using direct sprite URLs
- **Progressive Web App**: Installable on mobile devices
- **Offline Support**: Cached Pokémon data
- **Accessibility**: Keyboard and touch-friendly

## 🌐 Live Demo

👉 https://your-deployment-link.vercel.app

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
- **PWA Features**: Service Worker ready

## 🧠 Key Concepts

- React state management with hooks
- Custom timer implementation using `useEffect`, `useRef`
- Local storage persistence
- Optimized asset loading (no redundant API calls)
- Dynamic game state handling
- Fallback image handling strategy

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

1. **Choose Game Mode**: Select between Name, Type, or Combined
2. **Select Session**: Pick 1 minute, 2 minutes, or endless mode
3. **Start Playing**:
   - Answer questions within 10 seconds
   - Correct answers: +100 points
   - Wrong answers: Lose a life
   - Game ends when time runs out or lives reach zero
4. **Beat Your High Score**: Try to achieve the highest score!

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
- **Caching**: Local storage for improved performance

## 📱 Progressive Web App

PokéGuess is a PWA with:
- **Web App Manifest**: Installable on mobile devices
- **Responsive Icons**: Optimized for all screen sizes
- **Offline Data**: Cached Pokémon information
- **Fast Loading**: Optimized images and preloading

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

## ⚠️ Disclaimer

This project uses data from PokeAPI (https://pokeapi.co/).
Pokémon and Pokémon character names are trademarks of Nintendo, Game Freak, and The Pokémon Company.
This project is for educational and non-commercial purposes only.

## 📞 Support

If you have any questions or issues, please open an issue on GitHub.

---

**Made with ❤️ for Pokémon fans worldwide**