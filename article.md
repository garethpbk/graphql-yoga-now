# Deploying graphql-yoga with Now 2.0

[graphql-yoga](https://github.com/prisma/graphql-yoga) makes it easy to get a lightweight, fully-featured GraphQL server up and running. Zeit's [Now](https://zeit.co/now) offers a cloud deployment platform that utilizes serverless infrastructure to power your applications. Let's look at how to these can be combined to deploy a GraphQL server that takes advantage of some of Now's features, as well as noting some potential pitfalls.

This tutorial assumes some familiarity with GraphQL, but it's ok if you've never built a server before, we'll go over the one we're deploying briefly.

Sidenote: this article grew out of my difficulties porting a server that worked flawlessly on Now 1.0 to Now 2.0, and as such is not really about using serverless with graphql-yoga.

## Prerequisites

If you haven't used Now before, install the [Now Desktop](https://zeit.co/download) application and register a Now account. Run `now -v` to make sure it worked - it'll print a version number (13.1.2 at time of writing).

We will deploy a very basic `graphql-yoga` server that 1) connects to the [PokéAPI](https://pokeapi.co/) and 2) returns a list of pokemon or some info about a single pokemon. Clone the server repo: `git clone https://github.com/garethpbk/graphql-yoga-now.git`

## GraphQL Server

In the cloned directory run `yarn` to install dependencies and then `yarn start` to, surprise, start the server. Navigate your browser to [http://localhost:4000](http://localhost:4000) and you should see the [GraphQL Playground](https://github.com/prisma/graphql-playground) IDE open up. `graphl-yoga` includes this awesome tool to explore your server by default.

In _schema.graphql_ there are three types: `PokemonList` which is made up of `ShortPokemon` with just a name and url, and `LongPokemon` with more information. The root `Query` type registers two resolvers, one to return a list of `ShortPokemon` and one to return a single `LongPokemon`. Play around in GraphQL Playground with queries like these:

```
query GET_ALL_POKEMON {
  allPokemon(limit: 30) {
    pokemon {
      name
      url
    }
  }
}
```

```
query GET_SINGLE_POKEMON {
  pokemon(id: 140) {
    id
    name
    height
    weight
    frontImage
    backImage
  }
}
```

## Deploying with Now

The exciting part, time to make our pokemon server available to the world. Create a new file at the root of the project called `now.json` - this is a configuration file that tells Now how to build our project.

First specify that you want to use Now 2.0

```
{
  "version": 2
}
```

(Once upon a time Now was a different platform that used a container-based deployment approach; Now 2.0 shifted this drastically to a serverless model. If you try using version 1 on an account that was made after 2.0 came out, you'll see a "please use Now 2.0" message and it'll fail.)

Next tell Now exactly _how_ to build the project using the `builds` key

```
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.js",
      "use": "@now/node-server"
    }
  ]
}
```

This is where the magic happens. Now "builders" take the code specified in `src` and turn it into a serverless "lambda" function.

Since our server is a Node.js server, we want to use a Node.js builder. Here is a gotcha - Now's documentation recommends using the `@now/node` builder for Node.js functions, but because this one isn't written for serverless, the `@now/node-server` builder is the one we want.

The last thing we need are route definitions that tell HTTP requests where to point to

```
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.js",
      "use": "@now/node-server"
    }
  ],
  "routes": [
    {
      "src": "/*",
      "dest": "src/index.js
    }
  ]
}
```
