// Import the node-fetch polyfill
import fetch, { Headers, Request, Response } from 'node-fetch';

// Assign fetch polyfills to global scope if not already defined
if (!globalThis.fetch) {
  globalThis.fetch = fetch;
  globalThis.Headers = Headers;
  globalThis.Request = Request;
  globalThis.Response = Response;
}

// queryGraphQL.mjs
import { gql, GraphQLClient } from 'graphql-request';

// Define the GraphQL client pointing to the API URL
const endpoint = 'https://graph.sola.day/v1/graphql';
const client = new GraphQLClient(endpoint);

// Define the GraphQL query
const query = gql`
{
  groups(where: {events_count: {_gt: 50}}, order_by: {events_count: asc}) {
    username
    id
    events_count
    image_url
  }
}`;

// Function to fetch and display groups
async function fetchGroups() {
  try {
    const data = await client.request(query);
    // console.log(data);
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

const buffer = await fetchGroups();

console.log(buffer);

// Call the function to fetch groups
export { fetchGroups };
