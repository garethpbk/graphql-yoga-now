require('now-env');
const axios = require('axios');

const QueryResolver = {
  allPokemon: async (_, args) => {
    const { limit } = args;

    const allPokemonRes = await axios(`${process.env.API_BASE_URL}?limit=${limit}`);

    const {
      data: { results: pokemon },
    } = allPokemonRes;

    return {
      pokemon,
    };
  },

  pokemon: async (_, args) => {
    const { id } = args;

    const pokemonRes = await axios(`${process.env.API_BASE_URL}/${id}`);

    const {
      data: {
        height,
        weight,
        species: { name },
        sprites: { back_default, front_default },
      },
    } = pokemonRes;

    return {
      id,
      name,
      height,
      weight,
      backImage: back_default,
      frontImage: front_default,
    };
  },
};

module.exports = {
  ...QueryResolver,
};
