
Check out the [video demo](https://vimeo.com/121641331) !
===================================================

This app uses Node.js, Express and Socket.io to track tweets in the Twitter 
Streaming API for multiple keywords. Tweet events are pushed over the 
bidirectional socket to clients that subscribe to the keyword.

The UI displays radio buttons that a user can use to select the keyword to search for. 
When a radio button is selected and the user clicks the "Submit" button to confirm their 
selected keyword, preexisting listeners on the client's socket are removed and 
only a listener for this most recently selected keyword is bound to that client's socket. 
When a user submits a new keyword selection, a database results listener is also bound 
to the client that waits for the server to return items in the database that match the keyword. On each Tweet event, the server writes the geo coordinates to an AWS DynamoDB table corresponding to the keyword it filtered for.

This is the first project I've written in Javascript and I didn't have enough time before the deadline to learn best Javascript practices. So, I acknowledge this repository is probably littered with examples of bad Javascript style and how not to use Node.js. I treated this project more as an opportunity to learn about different realtime communication mechanisms -- how they're implemented and how to leverage them. You can read about my learnings here:
https://medium.com/@emchenNYC/real-time-messaging-1f1f5771db8d
