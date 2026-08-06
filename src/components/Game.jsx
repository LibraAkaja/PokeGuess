import { useEffect, useRef, useState } from "react";
import fetchPokemon, { fetchPokemonDetails, fetchEvolutionChain } from "../utils/fetchPokemon";
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

const ROUND_BUFFER_SIZE = 2;
const SLOW_ROUND_THRESHOLD_MS = 1500;
const TELEMETRY_SAMPLE_SIZE = 30;
const TELEMETRY_LOG_EVERY_ROUNDS = 5;
const MIN_ROUND_BUFFER_SIZE = 2;
const MAX_ROUND_BUFFER_SIZE = 4;
const MIN_SLOW_ROUND_THRESHOLD_MS = 1000;
const MAX_SLOW_ROUND_THRESHOLD_MS = 2400;
const STARTUP_PREFETCH_HEAD_COUNT = 36;
const STARTUP_PREFETCH_RANDOM_COUNT = 24;
const STARTUP_PREFETCH_BATCH_SIZE = 6;
const STARTUP_IMAGE_PREFETCH_COUNT = 24;
const ROUND_TIME_BONUS_MULTIPLIER = 10;

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

const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const average = (values = []) => {
    if (!values.length) return 0;
    const sum = values.reduce((acc, value) => acc + value, 0);
    return sum / values.length;
};

const runInBatches = async (items, batchSize, worker, shouldStop = () => false) => {
    if (!Array.isArray(items) || !items.length) return;
    const size = Math.max(1, batchSize);
    for (let i = 0; i < items.length; i += size) {
        if (shouldStop()) return;
        const batch = items.slice(i, i + size);
        await Promise.allSettled(batch.map((item) => worker(item)));
    }
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
    const roundQueueRef = useRef([]);
    const queueFillRunningRef = useRef(false);
    const pendingRoundPromisesRef = useRef(new Map());
    const imageReadyCacheRef = useRef(new Map());
    const pendingImageLoadRef = useRef(new Map());
    const pokemonMetaCacheRef = useRef(new Map());
    const evolutionEntriesCacheRef = useRef(new Map());
    const evolutionCandidatesCacheRef = useRef(new Map());
    const audioGuardRef = useRef({ src: null, locked: false });
    const preloadHintLinkRef = useRef(null);
    const telemetryRef = useRef({
        roundBuildMs: [],
        imagePrepMs: [],
        roundsServed: 0,
        bufferHits: 0,
        bufferMisses: 0,
        adaptiveFallbackHits: 0,
        queuedRounds: 0
    });
    const runtimeBufferSizeRef = useRef(ROUND_BUFFER_SIZE);
    const runtimeThresholdMsRef = useRef(SLOW_ROUND_THRESHOLD_MS);
    const telemetryEnabled = import.meta.env.DEV;

    useEffect(() => {
        livesRef.current = lives;
        roundCountRef.current = roundCount;
        panelRef.current = panel;
        roundLoadingRef.current = roundLoading;
    }, [lives, roundCount, panel, roundLoading]);

    const isPlaying = panel === 'playing';
    const sessionLength = SESSION_OPTIONS[sessionMode];
    const hasQuestionData = options.length > 0 && Boolean(answer);
    const timersActive = isPlaying && !roundLoading && imgLoaded && hasQuestionData;
    const roundTimer = useTimer(10, () => handleTimeoutRef.current?.(), timersActive);
    const sessionTimer = useTimer(sessionLength, () => endGameRef.current?.(), timersActive && sessionLength !== Infinity);
    const handleCountdownComplete = () => {
        setCountdownActive(false);
        if (soundOn) {
            const startAudio = new Audio(gameStartAudio);
            startAudio.play().catch(() => {});
        }
        setPanel('playing');
        setTimeout(() => {
            void fillRoundBuffer(roundTokenRef.current);
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

    useEffect(() => {
        handleTimeoutRef.current = handleTimeout;
        endGameRef.current = endGame;
    });

    useEffect(() => {
        fetchPokemon().then(setPokemonList);
    },[]);

    const startSession = () => {
        setScore(0);
        setLives(5);
        setRoundCount(0);
        setQuestionText("Who's that Pokémon?");
        setImgLoaded(false);
        setImage(null);
        setFallbackImage(null);
        setOptions([]);
        setAnswer(null);
        lastTimeoutRoundRef.current = -1;
        roundTokenRef.current += 1;
        roundLoadingRef.current = false;
        sessionQuestionHistoryRef.current = [];
        roundQueueRef.current = [];
        queueFillRunningRef.current = false;
        pendingRoundPromisesRef.current.clear();
        pokemonMetaCacheRef.current.clear();
        evolutionEntriesCacheRef.current.clear();
        evolutionCandidatesCacheRef.current.clear();
        telemetryRef.current = {
            roundBuildMs: [],
            imagePrepMs: [],
            roundsServed: 0,
            bufferHits: 0,
            bufferMisses: 0,
            adaptiveFallbackHits: 0,
            queuedRounds: 0
        };
        runtimeBufferSizeRef.current = ROUND_BUFFER_SIZE;
        runtimeThresholdMsRef.current = SLOW_ROUND_THRESHOLD_MS;
        roundTimer.reset(10);
        sessionTimer.reset(SESSION_OPTIONS[sessionMode]);
    };

    const pushTelemetrySample = (bucket, value) => {
        if (!telemetryEnabled || typeof value !== 'number' || Number.isNaN(value)) {
            return;
        }

        bucket.push(value);
        if (bucket.length > TELEMETRY_SAMPLE_SIZE) {
            bucket.shift();
        }
    };

    const logTelemetrySummary = () => {
        if (!telemetryEnabled) return;
        const t = telemetryRef.current;
        if (!t.roundsServed || t.roundsServed % TELEMETRY_LOG_EVERY_ROUNDS !== 0) {
            return;
        }

        const bufferTotal = t.bufferHits + t.bufferMisses;
        const bufferHitRate = bufferTotal ? (t.bufferHits / bufferTotal) * 100 : 0;
        const fallbackRate = t.roundsServed ? (t.adaptiveFallbackHits / t.roundsServed) * 100 : 0;

        console.info('[PokeGuess telemetry]', {
            roundsServed: t.roundsServed,
            bufferHitRate: `${bufferHitRate.toFixed(1)}%`,
            adaptiveFallbackRate: `${fallbackRate.toFixed(1)}%`,
            avgRoundBuildMs: Number(average(t.roundBuildMs).toFixed(1)),
            avgImagePrepMs: Number(average(t.imagePrepMs).toFixed(1)),
            queuedRounds: t.queuedRounds,
            currentBufferSize: runtimeBufferSizeRef.current,
            currentThresholdMs: runtimeThresholdMsRef.current
        });
    };

    const tuneRuntimeSettings = () => {
        if (!telemetryEnabled) return;
        const t = telemetryRef.current;
        if (!t.roundsServed || t.roundsServed % TELEMETRY_LOG_EVERY_ROUNDS !== 0) {
            return;
        }

        const avgBuildMs = average(t.roundBuildMs);
        const bufferTotal = t.bufferHits + t.bufferMisses;
        const bufferHitRate = bufferTotal ? (t.bufferHits / bufferTotal) * 100 : 0;
        const fallbackRate = t.roundsServed ? (t.adaptiveFallbackHits / t.roundsServed) * 100 : 0;

        let nextThreshold = runtimeThresholdMsRef.current;
        let nextBufferSize = runtimeBufferSizeRef.current;

        if (fallbackRate > 20 || avgBuildMs > 1400 || bufferHitRate < 45) {
            nextThreshold = Math.min(MAX_SLOW_ROUND_THRESHOLD_MS, nextThreshold + 150);
            nextBufferSize = Math.min(MAX_ROUND_BUFFER_SIZE, nextBufferSize + 1);
        } else if (fallbackRate < 8 && avgBuildMs < 900 && bufferHitRate > 75) {
            nextThreshold = Math.max(MIN_SLOW_ROUND_THRESHOLD_MS, nextThreshold - 100);
            nextBufferSize = Math.max(MIN_ROUND_BUFFER_SIZE, nextBufferSize - 1);
        }

        const changed = nextThreshold !== runtimeThresholdMsRef.current || nextBufferSize !== runtimeBufferSizeRef.current;
        runtimeThresholdMsRef.current = nextThreshold;
        runtimeBufferSizeRef.current = nextBufferSize;

        if (changed) {
            console.info('[PokeGuess tuning]', {
                currentBufferSize: runtimeBufferSizeRef.current,
                currentThresholdMs: runtimeThresholdMsRef.current,
                fallbackRate: `${fallbackRate.toFixed(1)}%`,
                bufferHitRate: `${bufferHitRate.toFixed(1)}%`,
                avgBuildMs: Number(avgBuildMs.toFixed(1))
            });
        }
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

    const setImagePreloadHint = (url) => {
        if (!url || typeof document === 'undefined') return;

        if (!preloadHintLinkRef.current) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
            preloadHintLinkRef.current = link;
        }

        if (preloadHintLinkRef.current.href !== url) {
            preloadHintLinkRef.current.href = url;
        }
    };

    const preloadSprite = async (url) => {
        if (!url) return false;

        if (imageReadyCacheRef.current.get(url)) {
            return true;
        }

        if (pendingImageLoadRef.current.has(url)) {
            return pendingImageLoadRef.current.get(url);
        }

        const loadPromise = new Promise((resolve) => {
            const img = new Image();
            let settled = false;

            const complete = (ok) => {
                if (settled) return;
                settled = true;
                if (ok) {
                    imageReadyCacheRef.current.set(url, true);
                }
                resolve(ok);
            };

            img.onload = () => complete(true);
            img.onerror = () => complete(false);
            img.src = url;

            if (img.complete) {
                complete(Boolean(img.naturalWidth));
            }
        });

        pendingImageLoadRef.current.set(url, loadPromise);

        try {
            return await loadPromise;
        } finally {
            if (pendingImageLoadRef.current.get(url) === loadPromise) {
                pendingImageLoadRef.current.delete(url);
            }
        }
    };

    const prepareRoundImage = async (roundData) => {
        if (!roundData) return null;
        const start = nowMs();

        const primary = roundData.image || null;
        const fallback = roundData.fallbackImage || null;

        const primaryReady = await preloadSprite(primary);
        if (primaryReady) {
            return {
                ...roundData,
                image: primary,
                fallbackImage: fallback,
                imagePrepared: true,
                imagePrepMs: nowMs() - start
            };
        }

        const fallbackReady = await preloadSprite(fallback);
        if (fallbackReady) {
            return {
                ...roundData,
                image: fallback,
                fallbackImage: fallback,
                imagePrepared: true,
                imagePrepMs: nowMs() - start
            };
        }

        const resolved = primary || fallback;
        return {
            ...roundData,
            image: resolved,
            fallbackImage: fallback || primary || null,
            imagePrepared: false,
            imagePrepMs: nowMs() - start
        };
    };

    useEffect(() => {
        if (!pokemonList.length) return;

        let cancelled = false;
        const isCancelled = () => cancelled;

        const warmup = async () => {
            const head = pokemonList.slice(0, Math.min(STARTUP_PREFETCH_HEAD_COUNT, pokemonList.length));
            const randomPool = shuffleArray(pokemonList).slice(0, Math.min(STARTUP_PREFETCH_RANDOM_COUNT, pokemonList.length));
            const warmupTargets = [];
            const seen = new Set();

            for (const pokemon of [...head, ...randomPool]) {
                const key = pokemon?.url || pokemon?.name;
                if (!key || seen.has(key)) continue;
                seen.add(key);
                warmupTargets.push(pokemon);
            }

            await runInBatches(
                warmupTargets,
                STARTUP_PREFETCH_BATCH_SIZE,
                async (pokemon) => {
                    if (isCancelled()) return;
                    await fetchPokemonDetails(pokemon).catch(() => null);
                },
                isCancelled
            );

            const imageTargets = warmupTargets.slice(0, Math.min(STARTUP_IMAGE_PREFETCH_COUNT, warmupTargets.length));
            await runInBatches(
                imageTargets,
                STARTUP_PREFETCH_BATCH_SIZE,
                async (pokemon) => {
                    if (isCancelled()) return;
                    const id = getIdFromUrl(pokemon.url);
                    const { official, dream } = getPokemonImage(id);
                    await preloadSprite(official);
                    await preloadSprite(dream);
                    preloadPokemonImage(id);
                },
                isCancelled
            );
        };

        void warmup();

        return () => {
            cancelled = true;
        };
    }, [pokemonList]);

    const getPokemonMeta = async (pokemon) => {
        const key = pokemon?.url || pokemon?.name;
        if (!key) return null;

        if (pokemonMetaCacheRef.current.has(key)) {
            return pokemonMetaCacheRef.current.get(key);
        }

        const detail = await fetchPokemonDetails(pokemon).catch(() => null);
        const meta = {
            name: pokemon?.name || '',
            detail,
            type: detail?.types?.[0] ?? pokemon?.types?.[0] ?? 'normal',
            generationName: detail?.species?.generation?.name ?? 'generation-i',
            abilities: detail?.abilities ?? [],
            evolutionChainUrl: detail?.species?.evolution_chain?.url ?? null,
        };

        pokemonMetaCacheRef.current.set(key, meta);
        return meta;
    };

    const getEvolutionEntriesForChain = async (chainUrl) => {
        if (!chainUrl) return [];

        if (evolutionEntriesCacheRef.current.has(chainUrl)) {
            return evolutionEntriesCacheRef.current.get(chainUrl);
        }

        try {
            const data = await fetchEvolutionChain(chainUrl);
            const entries = [];
            const visit = (node, parent = null) => {
                entries.push({
                    name: node?.species?.name,
                    parent: parent?.species?.name ?? null,
                    children: (node?.evolves_to ?? []).map((child) => child?.species?.name).filter(Boolean)
                });
                (node?.evolves_to ?? []).forEach((child) => visit(child, node));
            };
            visit(data?.chain);
            evolutionEntriesCacheRef.current.set(chainUrl, entries);
            return entries;
        } catch (error) {
            console.warn('Evolution chain lookup failed.', error);
            evolutionEntriesCacheRef.current.set(chainUrl, []);
            return [];
        }
    };

    const buildEvolutionCandidates = async (questionType) => {
        if (evolutionCandidatesCacheRef.current.has(questionType)) {
            return evolutionCandidatesCacheRef.current.get(questionType);
        }

        const candidates = [];
        const shuffledCandidates = shuffleArray(pokemonList);
        for (const pokemon of shuffledCandidates) {
            const meta = await getPokemonMeta(pokemon);
            const chainUrl = meta?.evolutionChainUrl;
            if (!chainUrl) continue;

            const entries = await getEvolutionEntriesForChain(chainUrl);
            if (!entries.length) continue;

            for (const entry of entries) {
                if (!entry?.name) continue;

                if (questionType === 'evolved') {
                    if (!entry.children?.length) continue;
                    const correctName = entry.children[0];
                    candidates.push({
                        pokemon,
                        entryName: entry.name,
                        correctName,
                        prompt: `Which Pokémon is the evolved form of ${capitalizeText(entry.name)}?`,
                        uniqueKey: `${questionType}:${entry.name}:${correctName}`
                    });
                } else {
                    if (!entry.parent) continue;
                    const correctName = entry.parent;
                    candidates.push({
                        pokemon,
                        entryName: entry.name,
                        correctName,
                        prompt: `Which Pokémon is the pre-evolved form of ${capitalizeText(entry.name)}?`,
                        uniqueKey: `${questionType}:${entry.name}:${correctName}`
                    });
                }
            }
        }

        const deduped = [];
        const seen = new Set();
        for (const item of candidates) {
            if (seen.has(item.uniqueKey)) continue;
            seen.add(item.uniqueKey);
            deduped.push(item);
        }

        evolutionCandidatesCacheRef.current.set(questionType, deduped);
        return deduped;
    };

    const getModeForRound = (roundNumber) => {
        if (gameType !== 'mix') return gameType;
        const mixedModes = ['name', 'type', 'generation', 'ability', 'evolution'];
        return mixedModes[(roundNumber - 1) % mixedModes.length];
    };

    const buildRoundData = async (roundNumber) => {
        const roundBuildStart = nowMs();
        const selectedMode = getModeForRound(roundNumber);
        const evolutionQuestionKind = roundNumber % 2 === 0 ? 'evolved' : 'pre-evolved';

        try {
            let roundData = null;
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

            const prepared = await prepareRoundImage({
                ...roundData,
                mode: roundData.mode || selectedMode
            });

            return {
                ...prepared,
                buildMs: nowMs() - roundBuildStart,
                adaptiveFallbackUsed: false
            };
        } catch (error) {
            console.error('Unable to generate a round.', error);
            const fallbackData = await fallbackRound();
            const prepared = await prepareRoundImage({
                ...fallbackData,
                mode: fallbackData.mode || 'name'
            });

            return {
                ...prepared,
                buildMs: nowMs() - roundBuildStart,
                adaptiveFallbackUsed: false
            };
        }
    };

    const buildRoundDataOnce = async (roundNumber) => {
        if (pendingRoundPromisesRef.current.has(roundNumber)) {
            return pendingRoundPromisesRef.current.get(roundNumber);
        }

        const promise = buildRoundData(roundNumber);
        pendingRoundPromisesRef.current.set(roundNumber, promise);

        try {
            return await promise;
        } finally {
            if (pendingRoundPromisesRef.current.get(roundNumber) === promise) {
                pendingRoundPromisesRef.current.delete(roundNumber);
            }
        }
    };

    const getRoundDataWithAdaptiveFallback = async (roundNumber) => {
        const primaryPromise = buildRoundDataOnce(roundNumber)
            .then((data) => ({ timedOut: false, data }))
            .catch(() => ({ timedOut: false, data: null }));

        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve({ timedOut: true }), runtimeThresholdMsRef.current);
        });

        const raceResult = await Promise.race([primaryPromise, timeoutPromise]);
        if (!raceResult?.timedOut) {
            return raceResult?.data ?? null;
        }

        const quickFallback = await fallbackRound();
        const preparedFallback = await prepareRoundImage({
            ...quickFallback,
            mode: quickFallback.mode || 'name'
        });

        if (telemetryEnabled) {
            telemetryRef.current.adaptiveFallbackHits += 1;
        }

        return {
            ...preparedFallback,
            buildMs: runtimeThresholdMsRef.current,
            adaptiveFallbackUsed: true
        };
    };

    const pullBufferedRound = (roundNumber) => {
        const index = roundQueueRef.current.findIndex((entry) => entry.roundNumber === roundNumber);
        if (index < 0) return null;
        const [entry] = roundQueueRef.current.splice(index, 1);
        return entry?.data ?? null;
    };

    async function fillRoundBuffer(sessionToken = roundTokenRef.current) {
        if (queueFillRunningRef.current || panelRef.current !== 'playing') {
            return;
        }

        queueFillRunningRef.current = true;
        try {
            while (
                sessionToken === roundTokenRef.current
                && panelRef.current === 'playing'
                && roundQueueRef.current.length < runtimeBufferSizeRef.current
            ) {
                const lastQueuedRound = roundQueueRef.current.length
                    ? roundQueueRef.current[roundQueueRef.current.length - 1].roundNumber
                    : roundCountRef.current;
                const nextRoundNumber = lastQueuedRound + 1;
                const data = await buildRoundDataOnce(nextRoundNumber);

                if (sessionToken !== roundTokenRef.current || panelRef.current !== 'playing') {
                    return;
                }

                if (!data || nextRoundNumber <= roundCountRef.current) {
                    continue;
                }

                const alreadyQueued = roundQueueRef.current.some((entry) => entry.roundNumber === nextRoundNumber);
                if (!alreadyQueued) {
                    roundQueueRef.current.push({ roundNumber: nextRoundNumber, data });
                    setImagePreloadHint(data?.image || data?.fallbackImage || '');
                    if (telemetryEnabled) {
                        telemetryRef.current.queuedRounds += 1;
                    }
                }
            }
        } finally {
            queueFillRunningRef.current = false;
        }
    }

    async function startNewRound() {
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
        setQuestionText('Loading question...');
        roundTimer.reset(10);
        const currentToken = roundToken;

        try {
            let roundData = pullBufferedRound(nextRound);
            const usedBuffer = Boolean(roundData);
            if (!roundData) {
                roundData = await getRoundDataWithAdaptiveFallback(nextRound);
            }

            if (roundToken !== roundTokenRef.current || panelRef.current !== 'playing') {
                return null;
            }

            setCurrentQuestionType(roundData.mode || getModeForRound(nextRound));
            setOptions(roundData.options || []);
            setAnswer(roundData.answer || null);
            const activeImage = roundData.image || roundData.fallbackImage || null;
            setImage(activeImage);
            setFallbackImage(roundData.fallbackImage || null);
            if (activeImage) {
                setImagePreloadHint(activeImage);
            }
            setQuestionText(roundData.questionText || "Who's that Pokémon?");
            setImageAlt(roundData.imageAlt || 'Pokémon');
            if (roundData.imagePrepared || !activeImage) {
                setImgLoaded(true);
            }
            roundLoadingRef.current = false;
            setRoundLoading(false);
            if (roundData.image) {
                preloadRandomImages();
            }

            if (telemetryEnabled) {
                const t = telemetryRef.current;
                t.roundsServed += 1;
                if (usedBuffer) {
                    t.bufferHits += 1;
                } else {
                    t.bufferMisses += 1;
                }
                pushTelemetrySample(t.roundBuildMs, roundData.buildMs);
                pushTelemetrySample(t.imagePrepMs, roundData.imagePrepMs);
                tuneRuntimeSettings();
                logTelemetrySummary();
            }

            void fillRoundBuffer(currentToken);
            return roundData;
        } catch (error) {
            console.error('Unable to generate a round.', error);
            if (roundToken !== roundTokenRef.current || panelRef.current !== 'playing') {
                return null;
            }
            const fallbackData = await fallbackRound();
            setCurrentQuestionType('name');
            setOptions(fallbackData.options || []);
            setAnswer(fallbackData.answer || null);
            const fallbackActiveImage = fallbackData.image || fallbackData.fallbackImage || null;
            setImage(fallbackActiveImage);
            setFallbackImage(fallbackData.fallbackImage || null);
            setQuestionText(fallbackData.questionText || "Who's that Pokémon?");
            setImageAlt(fallbackData.imageAlt || 'Pokémon');
            if (!fallbackActiveImage) {
                setImgLoaded(true);
            }
            roundLoadingRef.current = false;
            setRoundLoading(false);
            void fillRoundBuffer(currentToken);
            return fallbackData;
        }
    }

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
        const meta = await getPokemonMeta(correctPokemon);
        const correctType = meta?.type ?? 'normal';
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
        const meta = await getPokemonMeta(chosenPokemon);
        const generationName = meta?.generationName ?? 'generation-i';
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
        const abilityPool = ['blaze', 'torrent', 'overgrow', 'static', 'levitate', 'pressure', 'intimidate', 'swarm', 'run-away', 'adaptability', 'flame-body', 'cute-charm'];
        const meta = await getPokemonMeta(chosenPokemon);
        const abilities = meta?.abilities ?? [];
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
        const candidates = await buildEvolutionCandidates(questionType);
        if (!candidates.length) return null;

        const available = candidates.filter((candidate) => !sessionQuestionHistoryRef.current.includes(candidate.uniqueKey));
        const pool = available.length ? available : candidates;
        const selected = pool[Math.floor(Math.random() * pool.length)];
        if (!selected?.pokemon || !selected?.correctName) return null;

        const chosenPokemon = selected.pokemon;
        const correctName = selected.correctName;

        const uniqueKey = selected.uniqueKey;
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
            questionText: selected.prompt,
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
            const remainingSeconds = Math.max(0, Number(roundTimer.time) || 0);
            const timeBonus = remainingSeconds * ROUND_TIME_BONUS_MULTIPLIER;
            setScore((s) => s + 100 + timeBonus);
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
            const guard = audioGuardRef.current;
            if (guard.src === a && guard.locked) {
                return;
            }
            const aud = new Audio(a);
            aud.play().catch(() => {});
            guard.src = a;
            guard.locked = true;
            setTimeout(() => {
                if (audioGuardRef.current.src === a) {
                    audioGuardRef.current.locked = false;
                }
            }, 300);
        } catch {
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
                                if (fallbackImage && e.target.src !== fallbackImage) {
                                    e.target.src = fallbackImage;
                                    return;
                                }
                                // Unblock timers if both primary and fallback images fail.
                                setImgLoaded(true);
                            }}
                            onLoad={(e) => {
                                setImgLoaded(true);
                                e.target.classList.add('loaded');
                            }}
                            style={{display: imgLoaded ? 'block' : 'none', filter: currentQuestionType === 'name' ? 'brightness(0)' : 'none'}}
                        />
                    </div>
                    <h3 className="question-text">{questionText}</h3>
                    <Options playAudio={playAudio} options={options} onGuess={handleGuess} disabled={roundLoading}/>
                </div>
            </div>
        </div>
    );

};

export default Game;