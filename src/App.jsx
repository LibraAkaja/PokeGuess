import Game from './components/Game.jsx';
import GameLogo from './assets/PokeGame.png';

function App() {

  return (
    <>
      {/* Background Decorations */}
      <div className="bg-decoration bg-pokeball-1"></div>
      <div className="bg-decoration bg-pokeball-2"></div>
      <div className="bg-decoration bg-star-1"></div>
      <div className="bg-decoration bg-star-2"></div>
      <div className="bg-decoration bg-star-3"></div>
      <div className="bg-decoration bg-star-4"></div>
      <div className="bg-decoration bg-star-5"></div>
      <div className="bg-decoration bg-flame-1"></div>
      <div className="bg-decoration bg-flame-2"></div>
      
      <img src={GameLogo} className='game-logo'/>
      <Game/>

      <footer className='game-footer'>
        <div className='footer-content'>
          <p className='footer-main'>
            Powered by{" "}
            <a href='https://pokeapi.co/' target='_blank' rel='noopener noreferrer'>PokéAPI</a>
          </p>
          <p className='footer-secondary'>Pokémon © Nintendo / Game Freak / Creatures Inc.</p>
          <p className='footer-note'>Not affiliated with or endorsed by Nintendo, Game Freak, or Creatures Inc.</p>
        </div>
      </footer>
    </>
  )
}

export default App;
