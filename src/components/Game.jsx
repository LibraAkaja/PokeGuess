import { useEffect, useRef, useState } from "react";
import fetchPokemon, { fetchPokemonDetails, fetchEvolutionChain, preloadPokemonDetails } from "../utils/fetchPokemon";
import getPokemonImage, { preloadPokemonImage } from "../utils/getPokemonImage";
import getRandomOptions, { shuffleArray, buildOptionSet, capitalizeText } from "../utils/helpers";
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

const MODE_LABELS = {
    name: 'Name',
    type: 'Typing',
    generation: 'Generation Match',
    ability: 'Ability',
    evolution: 'Evolution',
    mix: 'Hybrid Mix'
};

const getOptionValue = (option) => {
    if (typeof option === 'string') return option;
    if (option?.value) return String(option.value);
    if (option?.name) return String(option.name);
    if (option?.label) return String(option.label);
    return '';
};

const formatGenerationName = (generationName = '') => {
    if (!generationName) return 'Generation I';
    const match = generationName.match(/generation-(\d+)/);
    if (match) {
        return `Generation ${Number(match[1]).toString().toUpperCase()}`;
    }
    return generationName
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
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
    const [highScore, setHighScore] = useLocalStorage("highScore", 0);
    const [panel, setPanel] = useState('home');
    const [gameType, setGameType] = useState('name');
    const [currentQuestionType, setCurrentQuestionType] = useState('name');
    const [currentPokemonName, setCurrentPokemonName] = useState('');
    const [questionText, setQuestionText] = useState("Who's that Pokémon?");
    const [roundCount, setRoundCount] = useState(0);
    const [countdownActive, setCountdownActive] = useState(false);
    const [soundOn, setSoundOn] = useState(false);
    const [roundLoading, setRoundLoading] = useState(false);
    const [imageAlt, setImageAlt] = useState('Pokémon');
    
    const livesRef = useRef(lives);
    const roundCountRef = useRef(roundCount);
    const panelRef = useRef(panel);
    const handleTimeoutRef = useRef();
    const endGameRef = useRef();
    const lastTimeoutRoundRef = useRef(-1);
    const roundTokenRef = useRef(0);
    const preloadTimeoutRef = useRef(null);
    const roundLoadingRef = useRef(false);
    const sessionQuestionHistoryRef = useRef([]);

    useEffect(() => {
        livesRef.current = lives;
        roundCountRef.current = roundCount;
        panelRef.current = panel;
        roundLoadingRef.current = roundLoading;
    }, [lives, roundCount, panel, roundLoading]);

    const isPlaying = panel === 'playing';
    const sessionLength = SESSION_OPTIONS[sessionMode];
    const roundTimer = useTimer(10, () => handleTimeoutRef.current?.(), isPlaying);
    const sessionTimer = useTimer(sessionLength, () => endGameRef.current?.(), isPlaying && sessionLength !== Infinity);
    const handleCountdownComplete = () => {
        setCountdownActive(false);
        if (soundOn) {
            const startAudio = new Audio(gameStartAudio);
            startAudio.play().catch(() => {});
        }
        setPanel('playing');
        setTimeout(() => {
            void startNewRound();
        }, 50);
    };

    const countdownTimer = useTimer(3, handleCountdownComplete, panel === 'home' && countdownActive);

    const handleWrong = () => {
        const nextLives = livesRef.current <= 1 ? 0 : livesRef.current - 1;
        setLives(nextLives);
        if (nextLives <= 0) {
            endGameRef.current();
            return false;
        }
        return true;
    }; 

    const handleTimeout = () => {
        const currentRound = roundCountRef.current;
        if (lastTimeoutRoundRef.current === currentRound) return;
        lastTimeoutRoundRef.current = currentRound;
        if (panelRef.current !== 'playing' || roundLoadingRef.current) return;
        const shouldContinue = handleWrong();
        if (shouldContinue) {
            void startNewRound();
        }
    };

    const endGame = () => {
        setPanel('gameOver');
        if (score > highScore) {
            setHighScore(score);
        }
    };

    handleTimeoutRef.current = handleTimeout;
    endGameRef.current = endGame;

    useEffect(() => {
        fetchPokemon().then(setPokemonList);
    },[]);

    useEffect(() => {
        if (pokemonList.length > 0) {
            void preloadPokemonDetails(pokemonList, 16);
            setTimeout(() => {
                for (let i = 0; i < Math.min(10, pokemonList.length); i++) {
                    const id = getIdFromUrl(pokemonList[i].url);
                    preloadPokemonImage(id);
                }
            }, 1500);
        }
    }, [pokemonList]);

    const startSession = () => {
        setScore(0);
        setLives(5);
        setRoundCount(0);
        setQuestionText("Who's that Pokémon?");
        lastTimeoutRoundRef.current = -1;
        roundTokenRef.current += 1;
        roundLoadingRef.current = false;
        sessionQuestionHistoryRef.current = [];
        roundTimer.reset(10);
        sessionTimer.reset(SESSION_OPTIONS[sessionMode]);
    };

    const preloadRandomImages = () => {
        if (preloadTimeoutRef.current) {
            clearTimeout(preloadTimeoutRef.current);
        }
        preloadTimeoutRef.current = setTimeout(() => {
            for (let i = 0; i < 3; i++) {
                const randomPokemon = pokemonList[Math.floor(Math.random() * pokemonList.length)];
                const randomId = getIdFromUrl(randomPokemon.url);
                preloadPokemonImage(randomId);
            }
        }, 500);
    };

    const fallbackRound = async () => {
        const fallbackOptions = getRandomOptions(pokemonList, 4);
        const fallbackAnswer = fallbackOptions[Math.floor(Math.random() * fallbackOptions.length)] ?? pokemonList[0];
        const id = getIdFromUrl(fallbackAnswer.url);
        const { official, dream } = getPokemonImage(id);
        return {
            options: fallbackOptions.map((pokemon) => ({
                value: pokemon.name,
                label: capitalizeText(pokemon.name),
                name: pokemon.name
            })),
            answer: {
                value: fallbackAnswer.name,
                label: capitalizeText(fallbackAnswer.name),
                name: fallbackAnswer.name
            },
            image: official,
            fallbackImage: dream,
            questionText: "Who's that Pokémon?",
            imageAlt: fallbackAnswer.name,
            subjectName: fallbackAnswer.name,
            mode: 'name'
        };
    };

    const startNewRound = async () => {
        if (panelRef.current !== 'playing' || roundLoadingRef.current) {
            return null;
        }

        const nextRound = roundCountRef.current + 1;
        const roundToken = roundTokenRef.current + 1;
        roundTokenRef.current = roundToken;
        setRoundCount(nextRound);
        roundLoadingRef.current = true;
        setRoundLoading(true);
        setImgLoaded(false);
        setImage(null);
        setFallbackImage(null);
        setOptions([]);
        setAnswer(null);
        setCurrentPokemonName('');
        setQuestionText('Loading question...');
        roundTimer.reset(10);

        const selectedMode = gameType === 'mix'
            ? ['name', 'type', 'generation', 'ability', 'evolution'][((nextRound - 1) % 5)]
            : gameType;

        try {
            let roundData = null;
            const evolutionQuestionKind = nextRound % 2 === 0 ? 'evolved' : 'pre-evolved';
            switch (selectedMode) {
                case 'type':
                    roundData = await buildTypeRound();
                    break;
                case 'generation':
                    roundData = await buildGenerationRound();
                    break;
                case 'ability':
                    roundData = await buildAbilityRound();
                    break;
                case 'evolution':
                    roundData = await buildEvolutionRound(evolutionQuestionKind);
                    break;
                case 'name':
                default:
                    roundData = await buildNameRound();
                    break;
            }

            if (!roundData) {
                roundData = await fallbackRound();
            }

            if (roundToken !== roundTokenRef.current || panelRef.current !== 'playing') {
                return null;
            }

            setCurrentQuestionType(roundData.mode || selectedMode);
            setCurrentPokemonName(roundData.subjectName || '');
            setOptions(roundData.options || []);
            setAnswer(roundData.answer || null);
            setImage(roundData.image || null);
            setFallbackImage(roundData.fallbackImage || null);
            setQuestionText(roundData.questionText || "Who's that Pokémon?");
            setImageAlt(roundData.imageAlt || 'Pokémon');
            roundLoadingRef.current = false;
            setRoundLoading(false);
            if (roundData.image) {
                preloadRandomImages();
            }
            return roundData;
        } catch (error) {
            console.error('Unable to generate a round.', error);
            if (roundToken !== roundTokenRef.current || panelRef.current !== 'playing') {
                return null;
            }
            const fallbackData = await fallbackRound();
            setCurrentQuestionType('name');
            setCurrentPokemonName(fallbackData.subjectName || '');
            setOptions(fallbackData.options || []);
            setAnswer(fallbackData.answer || null);
            setImage(fallbackData.image || null);
            setFallbackImage(fallbackData.fallbackImage || null);
            setQuestionText(fallbackData.questionText || "Who's that Pokémon?");
            setImageAlt(fallbackData.imageAlt || 'Pokémon');
            roundLoadingRef.current = false;
            setRoundLoading(false);
            return fallbackData;
        }
    };

    const buildNameRound = async () => {
        const opts = getRandomOptions(pokemonList, 4);
        const correct = opts[Math.floor(Math.random() * opts.length)] ?? pokemonList[0];
        const id = getIdFromUrl(correct.url);
        const { official, dream } = getPokemonImage(id);

        return {
            options: opts.map((pokemon) => ({
                value: pokemon.name,
                label: capitalizeText(pokemon.name),
                name: pokemon.name
            })),
            answer: {
                value: correct.name,
                label: capitalizeText(correct.name),
                name: correct.name
            },
            image: official,
            fallbackImage: dream,
            questionText: "Who's that Pokémon?",
            imageAlt: correct.name,
            subjectName: correct.name,
            mode: 'name'
        };
    };

    const buildTypeRound = async () => {
        if (!pokemonList.length) return null;
        const correctPokemon = pokemonList[Math.floor(Math.random() * pokemonList.length)];
        const detail = await fetchPokemonDetails(correctPokemon).catch(() => null);
        const correctType = detail?.types?.[0] ?? correctPokemon?.types?.[0] ?? 'normal';
        const typePool = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'].filter((type) => type !== correctType);
        const typeOptions = buildOptionSet(
            { value: correctType, label: capitalizeText(correctType) },
            typePool.slice(0, 8).map((type) => ({ value: type, label: capitalizeText(type) })),
            4,
            (item) => item?.value ?? item?.name ?? ''
        );
        const id = getIdFromUrl(correctPokemon.url);
        const { official, dream } = getPokemonImage(id);
        return {
            options: typeOptions,
            answer: { value: correctType, label: capitalizeText(correctType) },
            image: official,
            fallbackImage: dream,
            questionText: `What type is ${capitalizeText(correctPokemon.name)}?`,
            imageAlt: correctPokemon.name,
            subjectName: correctPokemon.name,
            mode: 'type'
        };
    };

    const buildGenerationRound = async () => {
        if (!pokemonList.length) return null;
        const chosenPokemon = pokemonList[Math.floor(Math.random() * pokemonList.length)];
        const detail = await fetchPokemonDetails(chosenPokemon).catch(() => null);
        const generationName = detail?.species?.generation?.name ?? 'generation-i';
        const correctLabel = formatGenerationName(generationName);
        const generationPool = ['Generation I', 'Generation II', 'Generation III', 'Generation IV', 'Generation V', 'Generation VI', 'Generation VII', 'Generation VIII', 'Generation IX'].filter((label) => label !== correctLabel);
        const options = buildOptionSet(
            { value: correctLabel, label: correctLabel },
            generationPool.map((label) => ({ value: label, label })),
            4,
            (item) => item?.value ?? item?.name ?? ''
        );
        const id = getIdFromUrl(chosenPokemon.url);
        const { official, dream } = getPokemonImage(id);
        return {
            options,
            answer: { value: correctLabel, label: correctLabel },
            image: official,
            fallbackImage: dream,
            questionText: `Which generation does ${capitalizeText(chosenPokemon.name)} belong to?`,
            imageAlt: chosenPokemon.name,
            subjectName: chosenPokemon.name,
            mode: 'generation'
        };
    };

    const buildAbilityRound = async () => {
        if (!pokemonList.length) return null;
        const chosenPokemon = pokemonList[Math.floor(Math.random() * pokemonList.length)];
        const detail = await fetchPokemonDetails(chosenPokemon).catch(() => null);
        const abilityPool = ['blaze', 'torrent', 'overgrow', 'static', 'levitate', 'pressure', 'intimidate', 'swarm', 'run-away', 'adaptability', 'flame-body', 'cute-charm'];
        const abilities = detail?.abilities ?? [];
        const correctAbility = abilities[0] ?? abilityPool[Math.floor(Math.random() * abilityPool.length)];
        const extraPool = [...new Set([...abilityPool, ...(abilities.filter(Boolean))])];
        const options = buildOptionSet(
            { value: correctAbility, label: capitalizeText(correctAbility) },
            extraPool.filter((ability) => ability !== correctAbility).map((ability) => ({ value: ability, label: capitalizeText(ability) })),
            4,
            (item) => item?.value ?? item?.name ?? ''
        );
        const id = getIdFromUrl(chosenPokemon.url);
        const { official, dream } = getPokemonImage(id);
        return {
            options,
            answer: { value: correctAbility, label: capitalizeText(correctAbility) },
            image: official,
            fallbackImage: dream,
            questionText: `Ability of ${capitalizeText(chosenPokemon.name)} is?`,
            imageAlt: chosenPokemon.name,
            subjectName: chosenPokemon.name,
            mode: 'ability'
        };
    };

    const buildEvolutionRound = async (questionKind = 'evolved') => {
        if (!pokemonList.length) return null;

        const questionType = questionKind === 'pre-evolved' ? 'pre-evolved' : 'evolved';
        const shuffledCandidates = shuffleArray(pokemonList);
        let selectedEntry = null;
        let chosenPokemon = null;
        let prompt = '';
        let correctName = '';

        for (const pokemon of shuffledCandidates) {
            const detail = await fetchPokemonDetails(pokemon).catch(() => null);
            const evolutionChainUrl = detail?.species?.evolution_chain?.url;
            if (!evolutionChainUrl) continue;

            try {
                const data = await fetchEvolutionChain(evolutionChainUrl);
                const entries = [];
                const visit = (node, parent = null) => {
                    entries.push({
                        name: node?.species?.name,
                        parent: parent?.species?.name ?? null,
                        children: (node?.evolves_to ?? []).map((child) => child?.species?.name).filter(Boolean)
                    });
                    (node?.evolves_to ?? []).forEach((child) => visit(child, node));
                };
                visit(data.chain);

                const matchingEntry = entries.find((entry) => {
                    if (questionType === 'evolved') return entry.children?.length > 0;
                    return Boolean(entry.parent);
                });

                if (!matchingEntry) continue;

                const uniqueKey = `${questionType}:${matchingEntry.name}:${questionType === 'evolved' ? matchingEntry.children[0] : matchingEntry.parent}`;
                if (sessionQuestionHistoryRef.current.includes(uniqueKey)) continue;

                chosenPokemon = pokemon;
                selectedEntry = matchingEntry;
                if (questionType === 'evolved') {
                    correctName = matchingEntry.children[0];
                    prompt = `Which Pokémon is the evolved form of ${capitalizeText(matchingEntry.name)}?`;
                } else {
                    correctName = matchingEntry.parent;
                    prompt = `Which Pokémon is the pre-evolved form of ${capitalizeText(matchingEntry.name)}?`;
                }
                break;
            } catch (error) {
                console.warn('Evolution chain lookup failed.', error);
            }
        }

        if (!chosenPokemon || !selectedEntry || !correctName) return null;

        const uniqueKey = `${questionType}:${selectedEntry.name}:${correctName}`;
        sessionQuestionHistoryRef.current.push(uniqueKey);
        if (sessionQuestionHistoryRef.current.length > 8) {
            sessionQuestionHistoryRef.current.shift();
        }

        const optionPool = pokemonList
            .map((pokemon) => pokemon.name)
            .filter((name) => name !== correctName)
            .slice(0, 24);
        const options = buildOptionSet(
            { value: correctName, label: capitalizeText(correctName) },
            optionPool.map((name) => ({ value: name, label: capitalizeText(name) })),
            4,
            (item) => item?.value ?? item?.name ?? ''
        );

        const id = getIdFromUrl(chosenPokemon.url);
        const { official, dream } = getPokemonImage(id);
        return {
            options,
            answer: { value: correctName, label: capitalizeText(correctName) },
            image: official,
            fallbackImage: dream,
            questionText: prompt,
            imageAlt: chosenPokemon.name,
            subjectName: chosenPokemon.name,
            mode: 'evolution'
        };
    };

    const handleGuess = (selectedOption) => {
        if (panelRef.current !== 'playing' || roundLoadingRef.current) return;
        const correctValue = getOptionValue(answer).toLowerCase();
        const selectedValue = getOptionValue(selectedOption).toLowerCase();
        const isCorrect = correctValue === selectedValue;
        if (isCorrect) {
            setScore((s) => s + 100);
        } else {
            const shouldContinue = handleWrong();
            if (!shouldContinue) return;
        }
        void startNewRound();
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
        if (!soundOn) return;
        try {
            const now = Date.now();
            if (!playAudio.last) playAudio.last = { src: null, ts: 0 };
            const last = playAudio.last;
            if (last.src === a && now - last.ts < 300) {
                return;
            }
            const aud = new Audio(a);
            aud.play().catch(() => {});
            playAudio.last = { src: a, ts: now };
        } catch (e) {
            // ignore audio errors
        }
    };

    if(panel === 'home'){
        return (
            <div className="game-container">
                <div className="game-panel home-panel decorative-panel">
                    <img src={soundIcon} alt="Sound Icon" className="sound-icon" style={{width:'31px', position:'absolute', top:'10px', right:'10px', cursor:'pointer', filter: soundOn ? 'none' : 'grayscale(100%)'}} onClick={() => setSoundOn(!soundOn)}/>
                    <h1 className="panel-title">PokéGuess</h1>
                    <p className="subtitle">Let the Pokémon quiz begin!</p>

                    <div className="home-section">
                        <label className="select-label" htmlFor="game-mode-select">Game mode</label>
                        <select
                            id="game-mode-select"
                            className="select-input"
                            value={gameType}
                            disabled={countdownActive}
                            onChange={(event) => { setGameType(event.target.value); playAudio(mouseClickAudio); }}
                        >
                            <option value="name">Name</option>
                            <option value="type">Typing</option>
                            <option value="generation">Generation Match</option>
                            <option value="ability">Ability</option>
                            <option value="evolution">Evolution</option>
                            <option value="mix">Hybrid Mix</option>
                        </select>
                    </div>

                    <div className="home-section">
                        <label className="select-label" htmlFor="session-mode-select">Session mode</label>
                        <select
                            id="session-mode-select"
                            className="select-input"
                            value={sessionMode}
                            disabled={countdownActive}
                            onChange={(event) => { setSessionMode(event.target.value); playAudio(mouseClickAudio); }}
                        >
                            <option value="1 min">1 min</option>
                            <option value="2 min">2 min</option>
                            <option value="Endless">Endless</option>
                        </select>
                    </div>

                    <div className="home-section">
                        <button className="start-button decorative-button" disabled={countdownActive} onMouseEnter={() => playAudio(mouseHoverAudio)} onClick={() => {startSession(); setCountdownActive(true); countdownTimer.reset(3); playAudio(mouseClickAudio);}}>START</button>
                    </div>

                    {countdownActive && (
                        <>
                            <div className="countdown">Starting in {countdownTimer.time}</div>
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
                    <div className="game-over-actions">
                        <button
                            className="play-again-button decorative-button"
                            onMouseEnter={() => playAudio(mouseHoverAudio)}
                            onClick={() => {
                                startSession();
                                setPanel('home');
                                setCountdownActive(true);
                                countdownTimer.reset(3);
                                playAudio(mouseClickAudio);
                            }}
                        >
                            Play Again
                        </button>
                        <button
                            className="play-again-button decorative-button"
                            onMouseEnter={() => playAudio(mouseHoverAudio)}
                            onClick={() => {
                                setPanel('home');
                                setCountdownActive(false);
                                playAudio(mouseClickAudio);
                            }}
                        >
                            Main Menu
                        </button>
                    </div>
                </div>
            </div>
        );
    }

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
                            alt={imageAlt}
                            loading="eager"
                            className={''}
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
                    <h3 className="question-text">{questionText}</h3>
                    <Options soundOn={soundOn} playAudio={playAudio} options={options} onGuess={handleGuess} disabled={roundLoading}/>
                </div>
            </div>
        </div>
    );

};

export default Game;