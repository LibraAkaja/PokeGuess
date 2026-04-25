// Cache for loaded images to avoid re-fetching
const imageCache = new Map();

const getPokemonImage = (id) => {
    if (imageCache.has(id)) {
        return imageCache.get(id);
    }

    const official = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
    const dream = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/${id}.svg`;

    const images = { official, dream };

    imageCache.set(id, images);

    return images;
};

export const preloadPokemonImage = (id) => {
    const { official, dream } = getPokemonImage(id);

    // Preload official artwork first
    const img = new Image();
    img.src = official;

    // Preload dream world as fallback
    const fallbackImg = new Image();
    fallbackImg.src = dream;
};

export default getPokemonImage;