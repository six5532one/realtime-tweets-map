var AWS = require('aws-sdk');
AWS.config.region = "us-east-1";
var ddb = new AWS.DynamoDB();
var showDbInsertionStatus = function(error, data)  {
    if (error)  {
        console.log(error);
    }   else    {
        console.log("successfully inserted item into DynamoDB");
    }
};

// set up web server and socket
var express = require('express'),
    app = express();
// inform Express where your template files are
app.set('views', __dirname + '/tpl');
// inform Express which template engine to use
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);

var http = require('http'),
    httpServer = http.createServer(app);
var io = require('socket.io').listen(httpServer);

// instantiate twitter API client
var twitter = require('twitter');
var twit = new twitter({
    consumer_key: 'YOUR_TWITTER_CONSUMER_KEY',
    consumer_secret: 'YOUR_TWITTER_CONSUMER_SECRET',
    access_token_key: 'YOUR_TWITTER_ACCESS_TOKEN',
    access_token_secret: 'YOUR_TWITTER_ACCESS_TOKEN_SECRET'});

var keywords = ["cute", "hate", "poverty"];
var stream = null;

// register a route
app.get('/', function(req, res) {
    console.log('route');
    res.render("keyword", {keywordOptions :keywords});
});

httpServer.listen(process.env.PORT || 8081);
// inform Express where to look for resources for front end logic
app.use(express.static(__dirname + '/public'));

// event handler for successful socket.io connection
// `socket` param refers to client socket
io.sockets.on('connection', function(socket)    {
    // bind listener for the client's message that it is ready to 
    // receive pushed data
    socket.on("client ready", function()    {
        console.log("client said they're ready");
        var containsKeyword = function(strings, keyword)    {
            for (var tweetTokenIter=0; tweetTokenIter<strings.length; tweetTokenIter++)   {
                if (strings[tweetTokenIter].toLowerCase() === keyword)
                    return true;
            }
            return false;
        };

        var dbQueryHandler = function(keyword)  {
            console.log('db handler for ' + keyword); 
            var scanParams={TableName:keyword, AttributesToGet:['lat','lng']};
            var response = ddb.scan(scanParams, function(error, data) {
                var numDbItems = 0;
                var dbResults = [];
                if (error) {console.log(error);}
                else {
                    numDbItems = data.Count;
                }
                console.log('sending over ' + numDbItems + ' items to client');
                for (var dbItemsIter=0; dbItemsIter<numDbItems; dbItemsIter++)    {
                    dbResults.push({
                        "lat": Number(data.Items[dbItemsIter].lat.N),
                        "lng": Number(data.Items[dbItemsIter].lng.N)
                    });
                }   // copy all the DB items to local data structure
                console.log("scanned items from this table: " + this.request.params.TableName);
                io.sockets.emit(this.request.params.TableName + 'DbResults', dbResults);
            });
        };           

        var twitApiHandler = function(data)    {
            if (data.coordinates)   {
                if (data.coordinates !== null)  {
                    //console.log(data);
                    var tweetMsg = {
                        "lat": data.coordinates.coordinates[0],
                        "lng": data.coordinates.coordinates[1],
                        "text": data.text};
                    console.log(tweetMsg);
                    // multiplex
                    for (var keywordIter=0; keywordIter<keywords.length; keywordIter++)   {
                        var kw = keywords[keywordIter];
                        if (containsKeyword(data.text.split(" "), kw))    {
                            io.sockets.emit(kw, tweetMsg);
                            // write to appropriate db tables
                            var item = {"text": {"S": tweetMsg.text},
                                        "lng": {"N": tweetMsg.lng.toString()},
                                        "lat": {"N": tweetMsg.lat.toString()}};
                            ddb.putItem({"TableName":kw, "Item":item}, showDbInsertionStatus);
                        }
                    }
                }
            }
        };

        // check if stream is open already
        // Twitter API has a cap on the number of streams app can open
        // so do not open one stream per connection
        if (stream === null)    {
            twit.stream('statuses/filter', {track: keywords.join(',')}, function(s)    {
                stream = s;
                stream.on('data', twitApiHandler);
            });
        }
        // listen for clients to request DB results
        for (var keywdIter=0; keywdIter<keywords.length; keywdIter++)
            socket.on(keywords[keywdIter], function(kw) {dbQueryHandler(kw);});
    });
    // after binding listener for client acknowledgement, 
    // the server signals client that the connection succeeded 
    // and it is ready to push data
   socket.emit("connected");
});
