const detailCache = new Map();
const speciesCache = new Map();
const evolutionChainCache = new Map();

const getPokemonId = (pokemonOrUrl) => {
    const value = typeof pokemonOrUrl === 'string' ? pokemonOrUrl : pokemonOrUrl?.url ?? '';
    const match = value.match(/\/pokemon\/(\d+|[^/]+)\/?$/);
    return match ? match[1] : '';
};

const fetchPokemon = async () => {
    const cached = localStorage.getItem('pokemonList');
    if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.length > 0 && Array.isArray(parsed[0].types) && typeof parsed[0].types[0] === 'string') {
            return parsed;
        }
    }

    const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1000');
    const data = await res.json();
    const detailed = await Promise.all(data.results.map(async (p) => {
        const detailRes = await fetch(p.url);
        const detail = await detailRes.json();
        const types = detail.types && detail.types.length > 0 ? detail.types.map(t => t.type.name) : ['normal'];
        return {
            name: p.name,
            url: p.url,
            types,
            id: getPokemonId(p.url),
        };
    }));

    localStorage.setItem('pokemonList', JSON.stringify(detailed));
    return detailed;
};

const fetchPokemonDetails = async (pokemon) => {
    const key = typeof pokemon === 'string' ? pokemon : pokemon?.url ?? '';
    if (!key || detailCache.has(key)) {
        return detailCache.get(key);
    }

    const detailRes = await fetch(key);
    const detail = await detailRes.json();
    const speciesRes = await fetch(detail.species?.url);
    const species = await speciesRes.json();

    const payload = {
        ...detail,
        species,
        id: detail.id ?? getPokemonId(key),
        types: detail.types?.map((entry) => entry.type.name) ?? ['normal'],
        abilities: detail.abilities?.map((entry) => entry.ability?.name).filter(Boolean) ?? [],
        sprite: detail.sprites?.other?.['official-artwork']?.front_default ?? null,
    };

    detailCache.set(key, payload);
    return payload;
};

const fetchEvolutionChain = async (chainUrl) => {
    if (!chainUrl) return null;
    if (evolutionChainCache.has(chainUrl)) {
        return evolutionChainCache.get(chainUrl);
    }

    const response = await fetch(chainUrl);
    const data = await response.json();
    evolutionChainCache.set(chainUrl, data);
    return data;
};

const preloadPokemonDetails = async (pokemonEntries = [], count = 12) => {
    const limited = pokemonEntries.slice(0, Math.max(0, count));
    if (!limited.length) return [];
    return Promise.allSettled(limited.map((pokemon) => fetchPokemonDetails(pokemon)));
};

const fetchSpeciesDetails = async (speciesUrl) => {
    if (!speciesUrl) return null;
    if (speciesCache.has(speciesUrl)) {
        return speciesCache.get(speciesUrl);
    }

    const res = await fetch(speciesUrl);
    const species = await res.json();
    speciesCache.set(speciesUrl, species);
    return species;
};

export {
    fetchPokemonDetails,
    fetchEvolutionChain,
    preloadPokemonDetails,
    fetchSpeciesDetails,
};

export default fetchPokemon;