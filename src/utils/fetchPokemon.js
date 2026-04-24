const fetchPokemon = async() => {
    const cached = localStorage.getItem("pokemonList");
    if (cached) {
        return JSON.parse(cached);
    }
    const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=100000");
    const data = await res.json();
    localStorage.setItem("pokemonList", JSON.stringify(data.results));
    return data.results;
    // [{name: "pikachu", url: "https://pokeapi.co/api/v2/pokemon/{id or name}/"}, ...]
};

export default fetchPokemon;