# Deploying graphql-yoga with Now 2.0

[graphql-yoga](https://github.com/prisma/graphql-yoga) makes it easy to get a lightweight, fully-featured GraphQL server up and running. Zeit's [Now](https://zeit.co/now) offers a cloud deployment platform that utilizes serverless infrastructure to power your applications. Let's look at how to these can be combined to deploy a GraphQL server that takes advantage of some of Now's features, as well as noting some potential pitfalls.

This tutorial assumes some familiarity with GraphQL, but it's ok if you've never built a server before, we'll briefly go over the one we're deploying.

This article grew out of my difficulties porting a server that worked flawlessly on Now 1.0 to Now 2.0, and as such is not really about using serverless with graphql-yoga, rather how you can make a normal graphql-yoga server work with Now 2.0.

Final code is available for reference here: [https://github.com/garethpbk/graphql-yoga-now/tree/now](https://github.com/garethpbk/graphql-yoga-now/tree/now)

## Prerequisites

If you haven't used Now before, install the [Now Desktop](https://zeit.co/download) application and register a Now account. Run `now -v` to make sure it worked - it'll print a version number (13.1.2 at time of writing).

We will deploy a very basic `graphql-yoga` server that 1) connects to the [PokéAPI](https://pokeapi.co/) and 2) returns a list of pokemon or some info about a single pokemon. Clone the server repo: `git clone https://github.com/garethpbk/graphql-yoga-now.git`

## GraphQL Server

In the cloned directory run `yarn` to install dependencies and then `yarn start` to, surprise, start the server. Navigate your browser to [http://localhost:4000](http://localhost:4000) and you should see the [GraphQL Playground](https://github.com/prisma/graphql-playground) IDE open up. `graphl-yoga` includes this awesome tool by default to explore your server.

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

## Preparing for Deployment

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
      "src": "./*",
      "dest": "src/index.js
    }
  ]
}
```

All traffic is directed to the endpoint exposed by the server.

One last thing before we try deploying: create a file called _.nowignore_ at the root and add node*modules. This tells Now to not directly upload the node_modules folder, as it builds them during deployment itself. It's just like *.gitignore\_.

## Deploying with Now

Ok, all the pieces are in place, let's do it! Type `now` in the terminal and watch as your project is built before your eyes. When it's done you'll see a "Success! Deployment ready" message. Open up the link it gives you and...oh no, what happened? **HTTP ERROR 500**!?

If you look at the build log from the [online Now dashboard](https://zeit.co/dashboard/) you'll see this error message:

```
Error: No schema found for path: /var/task/user/src/schema.graphql
```

In other words, it can't find our schema, and without a schema a GraphQL Server isn't very useful. The issue comes from how the builders change path references, compared to how it works on your computer. Luckily it's an easy fix; open up _index.js_ and find the server instance:

```
const server = new GraphQLServer({
  typeDefs: './src/schema.graphql',
  resolvers,
});
```

All we have to do is change the `typeDefs` property from the relative path to one using `__dirname`:

```
const server = new GraphQLServer({
  typeDefs: __dirname + '/schema.graphql',
  resolvers,
});
```

The builders now know where to look for the schema. Run `now` again and this time, opening up the link should navigate to the familiar GraphQL Playground interface.

That's it! Your `graphql-yoga` server is now available in the cloud, accessible to anyone with an internet connection. Pretty cool.

## Adding Environment Variables

As a bonus, let's see how to use environment variables with Now 2.0, for all those API keys and such we'd rather keep secret. Zeit has a package for using `process.env` variables locally in development that mirrors how it's done on a Now deployment:

```
yarn add now-env
```

Create a new file called _now-secrets.json_ at the project root. As an example we'll make the PokéAPI url an environment variable, so add this:

```
{
  "@pokemon-api-base-url": "https://pokeapi.co/api/v2/pokemon"
}
```

In _now.json_ add an "env" field, which is where we will specify what's available in `process.env`:

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
      "src": "../*",
      "dest": "src/index.js"
    }
  ],
  "env": {
    "API_BASE_URL": "@pokemon-api-base-url"
  }
}
```

Lastly we will use this in the query resolver; open up _src/resolvers/query.js_ and add `require('now-env')` to the top of the file, then replace the two API calls with the environment variable:

Before:

```
const allPokemonRes = await axios(`https://pokeapi.co/api/v2/pokemon?limit=${limit}`);
```

After:

```
const allPokemonRes = await axios(`${process.env.API_BASE_URL}?limit=${limit}`);
```

Before:

```
const pokemonRes = await axios(`https://pokeapi.co/api/v2/pokemon/${id}`);
```

After:

```
const pokemonRes = await axios(`${process.env.API_BASE_URL}/${id}`);
```

Run `yarn start` and you should see the server working fine locally, with the API url coming from an environment variable now. Note that in a real project you'll probably want to add _now-secrets.json_ to your _.gitignore_ list.

Next add the secret to your Now account:

```
now secret add pokemon-api-base-url https://pokeapi.co/api/v2/pokemon
```

Type `now` one more time, and the server will be deployed using the environment variable. Keep in mind that Now secrets are tied to your _account_ and not a specific _project_ or _deployment_ - I recommend naming your secrets with specifics, e.g. "pokemon-api-base-url" instead of "api-base-url" as the same secret can be used in multiple projects.

## Wrap Up

That concludes this tutorial! The main difficulties I faced in moving a `graphql-yoga` server from Now 1.0 to Now 2.0 were understanding how to set up builds, routes, the schema path, and environment variables; hopefully you've now got a handle on how to work with them all.

Keep an eye out for part 2: a core feature of Now 2.0 is monorepo support, meaning you can configure one _now.json_ at a project's root that allows for deployment of multiple servers and front-ends (even in different languages!) - I'm planning on following this article up with an example of deploying a front-end for this server in the same repo.
