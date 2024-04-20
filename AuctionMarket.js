/*
This query is creating a model of the auction market in Madden. I've added all the players in the game into a market
in memory. 

*/
import { MongoClient } from 'mongodb';
import { createClient } from 'redis';


async function getAllPlayers(){

    const filter = {};
    const projection = {
        'Name': 1,
        'Xbox_price': 1
      };
    const sort = {
        'Overall': -1
    };

    const client = await MongoClient.connect(
        'mongodb://localhost:27017/'
    );
    const coll = client.db('Project3').collection('players');
    const cursor = coll.find(filter, { sort });
    const result = await cursor.toArray();
    await client.close();

    return result;
}
async function getOwnedPlayers(){
    
    const filter = {};
    const sort = {
        'Overall': -1
    };

    const client = await MongoClient.connect(
        'mongodb://localhost:27017/'
    );

    const owned_coll = client.db('Project3').collection('ownedPlayers');
    const owned_cursor = owned_coll.find(filter, { sort });
    const owned_result = await owned_cursor.toArray();
    await client.close();


    
    return owned_result;
}

//An array of all the players sorted by Overall
const players = await getAllPlayers();

//An array of all the players owned by the user
const ownedPlayers = await getOwnedPlayers();

console.log(`There are ${players.length} players in the game`)
console.log(`There are ${ownedPlayers.length} players owned by the user`)

//Creating Redis Client
const RedisClient = createClient();
RedisClient.on('error', err => console.log('Redis Client Error', err));
await RedisClient.connect();
await RedisClient.flushAll();


//Adds all players onto the market
for (let i = 0; i < players.length; ++i) {
    const res = await RedisClient.zIncrBy('Market Players', 1, players[i].Name)
}

for (let i = 0; i < ownedPlayers.length; ++i) {
    const res = await RedisClient.zIncrBy('Roster', 1, ownedPlayers[i].Name)
}

//Orders all the players that are on the market
const marketPlayers = await RedisClient.zRange('Market Players', 0, -1, {
    REV: 1,
    WITHSCORES: 1
})

//Prints out the number of players on the market along with all their names.
console.log(`There are ${marketPlayers.length} players on the market`)
//console.log('Rankings', marketPlayers)


//Creating a set of players that the user has recently viewed
await RedisClient.zIncrBy(`Viewed History`, 4, players[5].Name)
await RedisClient.zIncrBy(`Viewed History`, 1, players[10].Name)
await RedisClient.zIncrBy(`Viewed History`, 5, players[15].Name)
await RedisClient.zIncrBy(`Viewed History`, 2, players[20].Name)
await RedisClient.zIncrBy(`Viewed History`, 2, players[10].Name)

const mostViewedPlayers = await RedisClient.zRange(`Viewed History`, 0, -1, {
    REV : 1,
    WITHSCORES: 1
})

console.log(`Viewed Players`, mostViewedPlayers)

//Ends connection
await RedisClient.disconnect();