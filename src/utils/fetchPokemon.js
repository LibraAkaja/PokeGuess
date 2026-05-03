const fetchPokemon = async() => {
    const cached = localStorage.getItem("pokemonList");
    if (cached) {
        const parsed = JSON.parse(cached);
        // Check if the data has the new format (types as array of strings)
        if (parsed.length > 0 && Array.isArray(parsed[0].types) && typeof parsed[0].types[0] === 'string') {
            return parsed;
        }
        // If old format, refetch
        console.log('Old pokemon data format detected, refetching...');
    }
    const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1000");
    const data = await res.json();
    const detailed = await Promise.all(data.results.map(async (p) => {
        const detailRes = await fetch(p.url);
        const detail = await detailRes.json();
        const types = detail.types && detail.types.length > 0 ? detail.types.map(t => t.type.name) : ['normal'];
        return {
            name: p.name,
            url: p.url,
            types: types
        };
    }));
    localStorage.setItem("pokemonList", JSON.stringify(detailed));
    return detailed;
    // [{name: "pikachu", url: "https://pokeapi.co/api/v2/pokemon/{id or name}/", types: ["electric"]}, ...]
};

export default fetchPokemon;