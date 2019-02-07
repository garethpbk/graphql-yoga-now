const axios = require('axios');

const QueryResolver = {
  allPokemon: async (_, args) => {
    const { limit } = args;

    const allPokemonRes = await axios(`https://pokeapi.co/api/v2/pokemon?limit=${limit}`);

    const {
      data: { results: pokemon },
    } = allPokemonRes;

    return {
      pokemon,
    };
  },

  pokemon: async (_, args) => {
    const { id } = args;

    const pokemonRes = await axios(`https://pokeapi.co/api/v2/pokemon/${id}`);

    const {
      data: {
        species: { name },
      },
    } = pokemonRes;

    return {
      id,
      name,
    };
  },
};

module.exports = {
  ...QueryResolver,
};
