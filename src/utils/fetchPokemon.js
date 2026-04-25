const fetchPokemon = async() => {
    const cached = localStorage.getItem("pokemonList");
    if (cached) {
        return JSON.parse(cached);
    }
    const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1000");
    const data = await res.json();
    const detailed = await Promise.all(data.results.map(async (p) => {
        const detailRes = await fetch(p.url);
        const detail = await detailRes.json();
        return {
            name: p.name,
            url: p.url,
            types: detail.types.map(t => t.type.name)
        };
    }));
    localStorage.setItem("pokemonList", JSON.stringify(detailed));
    return detailed;
    // [{name: "pikachu", url: "https://pokeapi.co/api/v2/pokemon/{id or name}/", types: ["electric"]}, ...]
};

export default fetchPokemon;