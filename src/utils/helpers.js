const shuffleArray = (array) => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

const getRandomOptions = (list, count = 4) => {
    const shuffled = shuffleArray(list);
    const unique = [];
    const seen = new Set();

    for (const item of shuffled) {
        if (!seen.has(item.name) && unique.length < count) {
            seen.add(item.name);
            unique.push(item);
        }
    }

    return unique;
};

const types = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];

const getRandomTypes = (count = 4, exclude = []) => {
    const availableTypes = types.filter((type) => !exclude.includes(type));
    if (availableTypes.length === 0) {
        return types.slice(0, Math.min(count, types.length));
    }
    return shuffleArray(availableTypes).slice(0, Math.min(count, availableTypes.length));
};

const buildOptionSet = (correct, pool = [], count = 4, valueSelector = (item) => {
    if (typeof item === 'string') return item;
    if (item?.value) return item.value;
    return item?.name ?? '';
}) => {
    if (!Array.isArray(pool) || pool.length === 0) {
        return [];
    }

    const normalizedCorrect = String(valueSelector(correct)).toLowerCase();
    const optionPool = pool.filter((option) => {
        const optionValue = String(valueSelector(option)).toLowerCase();
        return optionValue && optionValue !== normalizedCorrect;
    });

    const shuffled = shuffleArray(optionPool);
    const built = [correct];
    const seen = new Set([normalizedCorrect]);

    for (const option of shuffled) {
        if (built.length >= count) break;
        const optionValue = String(valueSelector(option)).toLowerCase();
        if (seen.has(optionValue)) continue;
        built.push(option);
        seen.add(optionValue);
    }

    while (built.length < count && optionPool.length > 0) {
        const fallback = optionPool[Math.floor(Math.random() * optionPool.length)];
        const fallbackValue = String(valueSelector(fallback)).toLowerCase();
        if (!seen.has(fallbackValue)) {
            built.push(fallback);
            seen.add(fallbackValue);
        }
    }

    return shuffleArray(built);
};

const capitalizeText = (text = '') => {
    if (typeof text !== 'string' || text.length === 0) {
        return '';
    }

    return text.charAt(0).toUpperCase() + text.slice(1);
};

export default getRandomOptions;
export { shuffleArray, getRandomTypes, buildOptionSet, capitalizeText };