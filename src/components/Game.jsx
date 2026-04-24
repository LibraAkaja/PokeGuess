import { useEffect, useRef, useState } from "react";
import fetchPokemon from "../utils/fetchPokemon";
import getPokemonImage from "../utils/getPokemonImage";
import getRandomOptions from "../utils/helpers";
import useLocalStorage from "../hooks/useLocalStorage";
import useTimer from "../hooks/useTimer";
import Timer from "./Timer";
import Lives from "./Lives";
import Options from "./Options";
import Scoreboard from "./Scoreboard";
import getIdFromUrl from "../utils/getIdFromUrl";

const SESSION_OPTIONS = {
    "1 min": 60,
    "2 min": 120,
    Endless: Infinity
};

const Game = () => {
    const [pokemonList, setPokemonList] = useState([]);
    const [image, setImage] = useState(null);
    const [fallbackImage, setFallbackImage] = useState(null);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [options, setOptions] = useState([]);
    const [answer, setAnswer] = useState(null);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(5);
    const [sessionMode, setSessionMode] = useState("1 min");
    const [gameOver, setGameOver] = useState(false);
    const [highScore, setHighScore] = useLocalStorage("highScore", 0);
    
    const scoreRef = useRef(score);
    const gameOverRef = useRef(gameOver);
    const highScoreRef = useRef(highScore);
    const handleTimeoutRef = useRef();
    const endGameRef = useRef();

    useEffect(() => {
        scoreRef.current = score;
        gameOverRef.current = gameOver;
        highScoreRef.current = highScore;
    }, [score, gameOver, highScore]);
    
    const roundTimer = useTimer(10, () => handleTimeoutRef.current(), !gameOver);
    const sessionTimer = useTimer(
        SESSION_OPTIONS[sessionMode],
        () => endGameRef.current(),
        !gameOver && SESSION_OPTIONS[sessionMode] !== Infinity
    );

    const handleWrong = () => {
        setLives((l) => {
            if (l <= 1) {
                endGameRef.current();
                return 0;
            }
            return l - 1;
        });
    };

    const handleTimeout = () => {
        handleWrong();
        startNewRound();
    };

    const endGame = () => {
        setGameOver(true);
        if(scoreRef.current > highScoreRef.current){
            setHighScore(scoreRef.current);
        }
    };

    handleTimeoutRef.current = handleTimeout;
    endGameRef.current = endGame;

    useEffect(() => {
        fetchPokemon().then(setPokemonList);
    },[]);

    useEffect(() => {
        if(pokemonList.length) startGame();
    },[pokemonList]);

    const startGame = () => {
        setScore(0);
        setLives(5);
        setGameOver(false);
        roundTimer.reset(10);
        sessionTimer.reset(SESSION_OPTIONS[sessionMode]);
        startNewRound();
    };

    const startNewRound = () => {
        const opts = getRandomOptions(pokemonList, 4);
        const correct = opts[Math.floor(Math.random() * opts.length)]; // change required
        setOptions(opts);
        setAnswer(correct);
        const id = getIdFromUrl(correct.url);
        const { dream, official } = getPokemonImage(id);
        setImage(dream);
        setFallbackImage(official);
        setImgLoaded(false);
        roundTimer.reset(10);
    };

    const handleGuess = (pokemon) => {
        if (gameOverRef.current) return;
        if (pokemon.name === answer.name) {
            setScore((s) => s + 100);
        } else {
            handleWrong();
        }
        startNewRound();
    };

    if(!pokemonList.length) return <h2>Loading...</h2>

    return(
        <div>
            <div>
                <select value={sessionMode} onChange={(e) => setSessionMode(e.target.value)}>
                    {Object.keys(SESSION_OPTIONS).map((mode) => (
                        <option key={mode} value={mode}>{mode}</option>
                    ))}
                </select>
                <button onClick={startGame}>Start Game</button>
            </div>

            <Scoreboard score={score} highScore={highScore}/>
            <Lives lives={lives}/>
            <Timer label="Session" time={sessionTimer.time}/>
            <Timer label="Round" time={roundTimer.time}/>
            
            {!imgLoaded && <p>Loading image...</p>}
            <img src={image} alt="pokemon" style={{width:"150px", margin:"20px"}} 
            onError={(e) => {
                if (e.target.src !== fallbackImage) {
                    e.target.src = fallbackImage;
                }
            }}/>
            
            {!gameOver ? (
                <>
                    <h2>Who's that Pokemon?</h2>
                    <Options options={options} onGuess={handleGuess}/>
                </>
            ) : (
                <>
                    <h2>Game Over!</h2>
                    <button onClick={startGame}>Play Again</button>
                </>
            )}
        </div>
    );

};

export default Game;