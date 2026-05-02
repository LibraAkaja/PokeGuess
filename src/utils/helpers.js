const getRandomOptions = (list, count = 4) => {
    const shuffled = [...list].sort(() => 0.5 - Math.random());
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
    const availableTypes = types.filter(type => !exclude.includes(type));
    if (availableTypes.length === 0) {
        // If no types available, return some default types
        return types.slice(0, Math.min(count, types.length));
    }
    const shuffled = [...availableTypes].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, availableTypes.length));
};

export default getRandomOptions;
export { getRandomTypes };