import Game from './components/Game.jsx';
import GameLogo from './assets/PokeGame.png';

function App() {

  return (
    <>
      <img src={GameLogo} className='game-logo'/>
      <Game/>
    </>
  )
}

export default App;
