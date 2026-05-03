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
import mouseHoverAudio from "../assets/Hover-Btn.WAV";
import mouseClickAudio from "../assets/Mouse-Click.WAV";
import gameStartAudio from "../assets/session-start.mp3";
import soundIcon from "../assets/PokeSound.png";

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
    const [homeStep, setHomeStep] = useState('selectGameType'); // 'selectGameType', 'selectSession', 'ready', 'countdown'
    const [soundOn, setSoundOn] = useState(false);
    
    const scoreRef = useRef(score);
    const gameOverRef = useRef(gameOver);
    const highScoreRef = useRef(highScore);
    const livesRef = useRef(lives);
    const roundCountRef = useRef(roundCount);
    const timeoutLockRef = useRef(false);
    const handleTimeoutRef = useRef();
    const endGameRef = useRef();
    const lastTimeoutRoundRef = useRef(-1);

    useEffect(() => {
        scoreRef.current = score;
        gameOverRef.current = gameOver;
        highScoreRef.current = highScore;
        livesRef.current = lives;
        roundCountRef.current = roundCount;
    }, [score, gameOver, highScore, lives, roundCount]);

    const capitalize = (text = '') => text.charAt(0).toUpperCase() + text.slice(1);
    
    const roundTimer = useTimer(10, () => handleTimeoutRef.current(), !gameOver && panel === 'playing');
    const sessionTimer = useTimer(
        SESSION_OPTIONS[sessionMode],
        () => endGameRef.current(),
        !gameOver && panel === 'playing' && SESSION_OPTIONS[sessionMode] !== Infinity
    );
    const countdownTimer = useTimer(3, () => { setPanel('playing'); startNewRound(); }, panel === 'home' && homeStep === 'countdown');

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
        const currentRound = roundCountRef.current;
        if(lastTimeoutRoundRef.current === currentRound) return; // Prevent multiple timeouts for the same round
        lastTimeoutRoundRef.current = currentRound;
        if (gameOverRef.current) return;
        handleWrong();
        if (livesRef.current > 1) {
            startNewRound();
        }
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
        const nextRound = roundCountRef.current + 1;
        setRoundCount(nextRound);
        const isType = gameType === 'type' || (gameType === 'mix' && nextRound % 2 === 0);
        setCurrentQuestionType(isType ? 'type' : 'name');

        if(!isType){
            const opts = getRandomOptions(pokemonList, 4);
            const correct = opts[Math.floor(Math.random() * opts.length)];
            setOptions(opts);
            setAnswer(correct);
            const id = getIdFromUrl(correct.url);
            const { official, dream } = getPokemonImage(id);

            setImage(official);
            setFallbackImage(dream);
            setImgLoaded(false);

            setTimeout(() => {
                for (let i = 0; i < 3; i++) {
                    const randomPokemon = pokemonList[Math.floor(Math.random() * pokemonList.length)];
                    const randomId = getIdFromUrl(randomPokemon.url);
                    preloadPokemonImage(randomId);
                }
            }, 1000);
        } else {
            const correctPokemon = pokemonList[Math.floor(Math.random() * pokemonList.length)];
            const correctType = correctPokemon?.types?.[0];
            if (!correctType || typeof correctType !== 'string') {
                console.warn('Invalid pokemon data for type question, falling back to name question');
                const opts = getRandomOptions(pokemonList, 4);
                const correct = opts[Math.floor(Math.random() * opts.length)];
                setOptions(opts);
                setAnswer(correct);
                setCurrentQuestionType('name');
                const id = getIdFromUrl(correct.url);
                const { official, dream } = getPokemonImage(id);
                setImage(official);
                setFallbackImage(dream);
                setImgLoaded(false);
                return;
            }
            setCurrentPokemonName(correctPokemon.name);
            setAnswer(correctType);
            const randomTypes = getRandomTypes(3, [correctType]);
            setOptions([...randomTypes, correctType].sort(() => 0.5 - Math.random()));
            const id = getIdFromUrl(correctPokemon.url);
            const { official, dream } = getPokemonImage(id);
            setImage(official);
            setFallbackImage(dream);
            setImgLoaded(false);
        }
        roundTimer.reset(10);
    };

    const handleGuess = (selectedOption) => {
        if (gameOverRef.current || timeoutLockRef.current) return;
        const correct = currentQuestionType === 'name' ? (selectedOption.name === answer.name) : (selectedOption === answer);
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
                <div className="game-panel decorative-panel">
                    <h2>Loading Pokémon...</h2>
                    <div className="loading-text">Please wait...</div>
                </div>
            </div>
        );
    }

    const playAudio = (a) => {
        const aud = new Audio(a);
        soundOn? aud.play(): null;
    };

    if(panel === 'home'){
        return (
            <div className="game-container">
                <div className="game-panel home-panel decorative-panel">
                    <img src={soundIcon} alt="Sound Icon" className="sound-icon" style={{width:'31px', position:'absolute', top:'10px', right:'10px', cursor:'pointer', filter: soundOn ? 'none' : 'grayscale(100%)'}} onClick={() => setSoundOn(!soundOn)}/>
                    <h1 className="panel-title">PokéGuess</h1>
                    <p className="subtitle">Let the Pokémon quiz begin!</p>
                    
                    {homeStep === 'selectGameType' && (
                        <>
                            <p style={{color:"black"}}>Choose your game mode:</p>
                            <div className="options-container">
                                <button className="option-button decorative-button" onMouseOver={() => playAudio(mouseHoverAudio)} onClick={() => {setGameType('name'); setHomeStep('selectSession'); playAudio(mouseClickAudio);}}>Name</button>
                                <button className="option-button decorative-button" onMouseOver={() => playAudio(mouseHoverAudio)} onClick={() => {setGameType('type'); setHomeStep('selectSession'); playAudio(mouseClickAudio);}}>Type</button>
                                <button className="option-button decorative-button" onMouseOver={() => playAudio(mouseHoverAudio)} onClick={() => {setGameType('mix'); setHomeStep('selectSession'); playAudio(mouseClickAudio);}}>Mixed</button>
                            </div>
                        </>
                    )}
                    
                    {homeStep === 'selectSession' && (
                        <>
                            <h2 className="panel-title">Choose Session Mode</h2>
                            <div className="options-container">
                                <button className="option-button decorative-button" onMouseOver={() => playAudio(mouseHoverAudio)} onClick={() => {setSessionMode('1 min'); setHomeStep('ready'); playAudio(mouseClickAudio)}}>1 min</button>
                                <button className="option-button decorative-button" onMouseOver={() => playAudio(mouseHoverAudio)} onClick={() => {setSessionMode('2 min'); setHomeStep('ready'); playAudio(mouseClickAudio);}}>2 min</button>
                                <button className="option-button decorative-button" onMouseOver={() => playAudio(mouseHoverAudio)} onClick={() => {setSessionMode('Endless'); setHomeStep('ready'); playAudio(mouseClickAudio);}}>Endless</button>
                            </div>
                            <button className="back-button" onMouseOver={() => playAudio(mouseHoverAudio)} onClick={() => {setHomeStep('selectGameType'); playAudio(mouseClickAudio)}}>← Back</button>
                        </>
                    )}
                    
                    {homeStep === 'ready' && (
                        <>
                            <h2 className="panel-title">Ready?</h2>
                            <button className="start-button decorative-button" onMouseOver={() => playAudio(mouseHoverAudio)} onClick={() => {startSession(); setHomeStep('countdown'); countdownTimer.reset(3); playAudio(mouseClickAudio);}}>START</button>
                            <button className="back-button" onMouseOver={() => playAudio(mouseHoverAudio)} onClick={() => {setHomeStep('selectSession'); playAudio(mouseClickAudio);}}>← Back</button>
                        </>
                    )}
                    
                    {homeStep === 'countdown' && (
                        <>
                            <h2 className="panel-title">Starting in...</h2>
                            <div className="countdown decorative-countdown">{countdownTimer.time}</div>{countdownTimer.time === 0? playAudio(gameStartAudio) : null}
                        </>
                    )}
                </div>
            </div>
        );
    }

    if(panel === 'gameOver'){
        return (
            <div className="game-container">
                <div className="game-panel game-over-content decorative-panel">
                    <h1 className="game-over-title">Game Over!</h1>
                    <div className="final-stats">
                        <div className="score-label">Final Score</div>
                        <div className="final-score">{score}</div>
                        <div className="score-label">High Score</div>
                        <div className="final-score">{highScore}</div>
                    </div>
                    <button className="play-again-button decorative-button" onMouseOver={() => playAudio(mouseHoverAudio)} onClick={() => {setPanel('home'); setHomeStep('selectGameType'); playAudio(mouseClickAudio);}}>Play Again</button>
                </div>
            </div>
        );
    }

    // panel === 'playing'
    return(
        <div className="game-container">
            <div className="game-panel playing-panel decorative-panel">
                <div className="game-stats-section">
                    <Scoreboard score={score} highScore={highScore}/>
                    <div className="timer">
                        <Timer label="Session" time={sessionTimer.time}/>
                        <Timer label="Round" time={roundTimer.time}/>
                    </div>
                    <Lives lives={lives}/>
                </div>

                <div className="game-content-section">
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
                            style={{display: imgLoaded ? 'block' : 'none', filter: currentQuestionType === 'name' ? 'brightness(0)' : 'none'}}
                        />
                    </div>
                    {currentQuestionType === 'name' ? (
                        <h3 className="question-text">Who's that Pokémon?</h3>
                    ) : (
                        <h3 className="question-text">What type is <strong>{capitalize(currentPokemonName)}</strong>?</h3>
                    )}
                    <Options soundOn={soundOn} playAudio={playAudio} options={options} onGuess={handleGuess}/>
                </div>
            </div>
        </div>
    );

};

export default Game;