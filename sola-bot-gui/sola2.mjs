// Import the node-fetch polyfill
import fetch, { Headers, Request, Response } from 'node-fetch';

// Assign fetch polyfills to global scope if not already defined
if (!globalThis.fetch) {
  globalThis.fetch = fetch;
  globalThis.Headers = Headers;
  globalThis.Request = Request;
  globalThis.Response = Response;
}

import { gql, GraphQLClient } from 'graphql-request';

// Define the GraphQL client pointing to the API URL
const endpoint = 'https://graph.sola.day/v1/graphql';
const client = new GraphQLClient(endpoint);



// Introspection query to fetch details about the 'events' type
const introspectionQuery = gql`
  {
    __type(name: "groups") {
      fields {
        name
        type {
          name
          kind
          ofType {
            name
            kind
          }
        }
        args {
          name
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
    }
  }
`;

// Function to fetch and display schema details
async function fetchSchemaDetails() {
  try {
    const data = await client.request(introspectionQuery);
    console.log(JSON.stringify(data, null, 2)); // Improved logging for nested objects
    return data;
  } catch (error) {
    console.error('Error fetching schema details:', error);
  }
}

// Execute the introspection query to understand the 'events' structure
const schemaDetails = await fetchSchemaDetails();