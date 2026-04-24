const getRandomOptions = (list, count = 4) => {
    const shuffled = [...list].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

export default getRandomOptions;