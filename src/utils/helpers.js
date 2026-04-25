const getRandomOptions = (list, count = 4) => {
    const shuffled = [...list].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

const types = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];

const getRandomTypes = (count = 4) => {
    const shuffled = [...types].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

export default getRandomOptions;
export { getRandomTypes };