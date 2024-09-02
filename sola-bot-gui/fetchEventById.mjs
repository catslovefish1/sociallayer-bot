import { gql, GraphQLClient } from 'graphql-request';
import fetch, { Headers, Request, Response } from 'node-fetch';

// Assign fetch polyfills to global scope if not already defined
if (!globalThis.fetch) {
  globalThis.fetch = fetch;
  globalThis.Headers = Headers;
  globalThis.Request = Request;
  globalThis.Response = Response;
}

const endpoint = 'https://graph.sola.day/v1/graphql';
const client = new GraphQLClient(endpoint, {
  headers: {
    'Content-Type': 'application/json',
  }
});

// async function fetchEventById(groupId) {
//   const currentDate = new Date().toISOString();
//   const query = gql`
//     query FetchEvents($groupId: Int!, $currentDate: timestamp!) {
//       events(where: {
//         _and: [
//           {group_id: {_eq: $groupId}},
//           {start_time: {_gt: $currentDate}}
//         ]
//       }) {
//         id
//         title
//         start_time
//         end_time
//         location
//         participants_count
//         cover_url
//         group_id
//         external_url
//         owner {
//           username
//         }
//         participants {
//           profile {
//             username
//           }
//         }
//       }
//     }`;

//   const variables = {
//     groupId: groupId,
//     currentDate: currentDate.split('.')[0] + 'Z' // Adjust the ISO string to remove fractional seconds if necessary
//   };

//   try {
//     const data = await client.request(query, variables);
//     console.log(data);
//     return data;
//   } catch (error) {
//     console.error('Error fetching events:', error);
//   }
// }

sd

async function fetchEventById(groupId) {
  const currentDate = new Date().toISOString();
  const query = gql`
    query FetchEvents($groupId: Int!, $currentDate: timestamp!) {
      events(where: {
        _and: [
          {group_id: {_eq: $groupId}},
          {start_time: {_gt: $currentDate}}
        ]
      },
      order_by: {start_time: asc},
      limit: 10
      )
      
      {
    
        title
        location
        start_time
        end_time
        id
      }
    }`;

  const variables = {
    groupId: groupId,
    currentDate: currentDate.split('.')[0] + 'Z'  // Adjust the ISO string to remove fractional seconds if necessary
  };

  try {
    const data = await client.request(query, variables);
    return data;
  } catch (error) {
    console.error('Error fetching events:', error);
  }
}



(async () => {
  const eventData = await fetchEventById(3452); // Replace 3409 with actual group ID
  console.log(eventData);
})();


export { fetchEventById };