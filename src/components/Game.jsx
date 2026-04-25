import { useEffect, useRef, useState } from "react";
import fetchPokemon from "../utils/fetchPokemon";
import getPokemonImage, { preloadPokemonImage } from "../utils/getPokemonImage";
import getRandomOptions, { getRandomTypes } from "../utils/helpers";
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
    const [panel, setPanel] = useState('home');
    const [gameType, setGameType] = useState('name');
    const [currentQuestionType, setCurrentQuestionType] = useState('name');
    const [currentPokemonName, setCurrentPokemonName] = useState('');
    const [roundCount, setRoundCount] = useState(0);
    
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
    
    const roundTimer = useTimer(10, () => handleTimeoutRef.current(), !gameOver && panel === 'playing');
    const sessionTimer = useTimer(
        SESSION_OPTIONS[sessionMode],
        () => endGameRef.current(),
        !gameOver && panel === 'playing' && SESSION_OPTIONS[sessionMode] !== Infinity
    );
    const countdownTimer = useTimer(3, () => { setPanel('playing'); startNewRound(); }, panel === 'countdown');

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
        setPanel('gameOver');
        if(scoreRef.current > highScoreRef.current){
            setHighScore(scoreRef.current);
        }
    };

    handleTimeoutRef.current = handleTimeout;
    endGameRef.current = endGame;

    useEffect(() => {
        fetchPokemon().then(setPokemonList);
    },[]);

    // Preload some Pokemon images when data is loaded
    useEffect(() => {
        if (pokemonList.length > 0) {
            // Preload first 10 Pokemon images for better initial performance
            setTimeout(() => {
                for (let i = 0; i < Math.min(10, pokemonList.length); i++) {
                    const id = getIdFromUrl(pokemonList[i].url);
                    preloadPokemonImage(id);
                }
            }, 2000); // Delay to not interfere with initial page load
        }
    }, [pokemonList]);

    const startSession = () => {
        setScore(0);
        setLives(5);
        setGameOver(false);
        setRoundCount(0);
        roundTimer.reset(10);
        sessionTimer.reset(SESSION_OPTIONS[sessionMode]);
    };

    const startNewRound = () => {
        setRoundCount(r => r+1);
        const isType = gameType === 'type' || (gameType === 'mix' && roundCount % 2 !== 0);
        setCurrentQuestionType(isType ? 'type' : 'name');
        if(!isType){
            const opts = getRandomOptions(pokemonList, 4);
            const correct = opts[Math.floor(Math.random() * opts.length)];
            setOptions(opts);
            setAnswer(correct);
            const id = getIdFromUrl(correct.url);
            const { official, dream } = getPokemonImage(id);

            // Use official artwork as primary (more reliable and faster)
            setImage(official);
            setFallbackImage(dream);
            setImgLoaded(false);

            // Preload images for next rounds to improve performance
            setTimeout(() => {
                // Preload a few random Pokemon for upcoming rounds
                for (let i = 0; i < 3; i++) {
                    const randomPokemon = pokemonList[Math.floor(Math.random() * pokemonList.length)];
                    const randomId = getIdFromUrl(randomPokemon.url);
                    preloadPokemonImage(randomId);
                }
            }, 1000);
        } else {
            const randomTypes = getRandomTypes(3);
            const correctPokemon = pokemonList[Math.floor(Math.random() * pokemonList.length)];
            const correctType = correctPokemon.types[0];
            setCurrentPokemonName(correctPokemon.name);
            setAnswer(correctType);
            setOptions([...randomTypes, correctType].sort(() => 0.5 - Math.random()));
            setImage(null);
        }
        roundTimer.reset(10);
    };

    const handleGuess = (pokemon) => {
        if (gameOverRef.current) return;
        const correct = currentQuestionType === 'name' ? (pokemon.name === answer.name) : (pokemon === answer);
        if (correct) {
            setScore((s) => s + 100);
        } else {
            handleWrong();
        }
        startNewRound();
    };

    if(!pokemonList.length) {
        return (
            <div className="game-container">
                <div className="game-panel">
                    <h2>Loading Pokémon...</h2>
                    <div className="loading-text">Please wait...</div>
                </div>
            </div>
        );
    }

    if(panel === 'home'){
        return (
            <div className="game-container">
                <div className="game-panel home-panel">
                    <h1 className="panel-title">PokéGuess</h1>
                    <p className="subtitle">Begin the Pokémon quiz!</p>
                    <p style={{color:"black"}}>Choose your game mode:</p>
                    <div className="options-container">
                        <button className="option-button" onClick={() => {setGameType('name'); setPanel('sessionMode')}}>Name</button>
                        <button className="option-button" onClick={() => {setGameType('type'); setPanel('sessionMode')}}>Type</button>
                        <button className="option-button" onClick={() => {setGameType('mix'); setPanel('sessionMode')}}>Combined</button>
                    </div>
                </div>
            </div>
        );
    }

    if(panel === 'sessionMode'){
        return (
            <div className="game-container">
                <div className="game-panel">
                    <h2 className="panel-title">Choose Session Mode</h2>
                    <div className="options-container">
                        <button className="option-button" onClick={() => {setSessionMode('1 min'); setPanel('start')}}>1 min</button>
                        <button className="option-button" onClick={() => {setSessionMode('2 min'); setPanel('start')}}>2 min</button>
                        <button className="option-button" onClick={() => {setSessionMode('Endless'); setPanel('start')}}>Endless</button>
                    </div>
                </div>
            </div>
        );
    }

    if(panel === 'start'){
        return (
            <div className="game-container">
                <div className="game-panel">
                    <h2 className="panel-title">Ready?</h2>
                    <button className="start-button" onClick={() => {startSession(); setPanel('countdown'); countdownTimer.reset(3);}}>START</button>
                </div>
            </div>
        );
    }

    if(panel === 'countdown'){
        return (
            <div className="game-container">
                <div className="game-panel">
                    <h2 className="panel-title">Starting in...</h2>
                    <div className="countdown">{countdownTimer.time}</div>
                </div>
            </div>
        );
    }

    if(panel === 'gameOver'){
        return (
            <div className="game-container">
                <div className="game-panel game-over-content">
                    <h1 className="game-over-title">Game Over!</h1>
                    <div className="final-stats">
                        <div className="score-label">Final Score</div>
                        <div className="final-score">{score}</div>
                        <div className="score-label">High Score</div>
                        <div className="final-score">{highScore}</div>
                    </div>
                    <button className="play-again-button" onClick={() => setPanel('home')}>Play Again</button>
                </div>
            </div>
        );
    }

    // panel === 'playing'
    return(
        <div className="game-container">
            <div className="game-panel playing-panel">
                <div className="game-stats-section">
                    <Scoreboard score={score} highScore={highScore}/>
                    <div className="timer">
                        <Timer label="Session" time={sessionTimer.time}/>
                        <Timer label="Round" time={roundTimer.time}/>
                    </div>
                    <Lives lives={lives}/>
                </div>

                <div className="game-content-section">
                    {currentQuestionType === 'name' ? (
                        <>
                            <div className="pokemon-image">
                                {!imgLoaded && <div className="loading-text">Loading...</div>}
                                <img
                                    src={image}
                                    alt="pokemon"
                                    loading="eager"
                                    onError={(e) => {
                                        if (e.target.src !== fallbackImage) {
                                            e.target.src = fallbackImage;
                                        }
                                    }}
                                    onLoad={(e) => {
                                        setImgLoaded(true);
                                        e.target.classList.add('loaded');
                                    }}
                                    style={{display: imgLoaded ? 'block' : 'none'}}
                                />
                            </div>
                            <h3 className="question-text">Who's that Pokémon?</h3>
                        </>
                    ) : (
                        <h3 className="question-text">What type is <strong>{currentPokemonName}</strong>?</h3>
                    )}
                    <Options options={options} onGuess={handleGuess}/>
                </div>
            </div>
        </div>
    );

};

export default Game;