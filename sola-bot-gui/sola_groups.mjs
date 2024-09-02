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

// Define the GraphQL query for a specific group by ID
const query = gql`
  query ($groupId: bigint!) {
    groups(where: {id: {_eq: $groupId}}) {
      username
      id
      events_count
      about
      image_url
    }
  }
`;

// Function to fetch and display a specific group by ID
async function fetchGroupById(groupId) {
  try {
    const variables = { groupId };
    const data = await client.request(query, variables);
    console.log(data);
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Call the function to fetch a specific group by ID
const groupId = 1925; // Replace with the actual group ID you want to query
const buffer = await fetchGroupById(groupId);



console.log(buffer.groups[0].image_url)
