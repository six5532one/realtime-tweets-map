window.onload = function()  {
    var socket = io.connect('/');
    //var socket = io.connect('http://localhost:8081');
    var submitBtn = document.getElementById("submit");
    var content = document.getElementById("content");
    var keywords = ["cute", "hate", "poverty"];
    var userInputs = [];
    for (var kwInputIter=0; kwInputIter<keywords.length; kwInputIter++)
        userInputs.push(document.getElementById(keywords[kwInputIter]));

    var content = document.getElementById("content");
    // TODO describe MVC objects
    var allPinsToDisplay = new google.maps.MVCArray();

    // render map tiles
    var mapProperties = {
        zoom: 3,
        disableAutoPan: true,
        mapTypeId: google.maps.MapTypeId.ROADMAP
        };
    var map = new google.maps.Map(document.getElementById('mapCanvas'), mapProperties);
    var heatmap = new google.maps.visualization.HeatmapLayer({
        data: allPinsToDisplay,
        radius: 25});    
    var userLoc;
    var browserSupportFlag = false; 

    // attempt W3C Geolocation
    if (navigator.geolocation)  {
        browserSupportFlag = true;
        navigator.geolocation.getCurrentPosition(function(position) {
            userLoc = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            map.setCenter(userLoc);
            console.log('outside handler. num elements in allPinsToDisplay: ');
            console.log(allPinsToDisplay.getLength());
            heatmap.setMap(map);
        });
    }
    else    {
        console.log("no geolocation support");
        // NYC is the center of the universe
        userLoc = new google.maps.LatLng(40.69847032728747, -73.9514422416687);
        map.setCenter(userLoc);
        heatmap.setMap(map);
    }

    var tweetHandler = function(tweet)  { 
        if (tweet.lat && tweet.lng)   { 
            console.log("lat: " + tweet.lat);
            console.log("long: " + tweet.lng);
            // display new pin on map momentarily
            var tweetLoc = new google.maps.LatLng(tweet.lng, tweet.lat);
            var marker = new google.maps.Marker({
                map: map,
                position: tweetLoc
            });
            setTimeout(function()   {
                marker.setMap(null);
            }, 600);
            // update heat map
            allPinsToDisplay.push(tweetLoc);
            // display tweet text
            content.innerHTML = tweet.text;
        }   else    {
            console.log("no geo coordinates");
        }
        console.log(tweet.text);
    };

    var dbResultsHandler = function(results)  {
        console.log('bind dbResults handler');
        console.log('num elements in allPinsToDisplay: ');
        console.log(allPinsToDisplay.getLength());
        // only display these results the first time they're pushed
        if (allPinsToDisplay.getLength() === 0)  {
            // add all the locations to stateful data structure
            for (var dbResultIter=0; dbResultIter<results.length; dbResultIter++) {
                if (results[dbResultIter].lat && results[dbResultIter].lng)
                    allPinsToDisplay.push(new google.maps.LatLng(results[dbResultIter].lng, results[dbResultIter].lat));
            }
            console.log('check if successfully added all results from db to MVCArray');
            console.log('num elements in allPinsToDisplay: ');
            console.log(allPinsToDisplay.getLength());
        }
    };

    submitBtn.onclick = function()  {
        var anyKwSelected = false;
        for (var selectedInputIter=0; selectedInputIter<userInputs.length; selectedInputIter++) {
            if (userInputs[selectedInputIter].checked)
                anyKwSelected = true;
        }
        if (!(anyKwSelected))
            alert("Select a keyword!");
        else    {
            // clear DB results for new kw search 
            allPinsToDisplay.clear();
            // remove all kw specific listeners
            for (var kwIter=0; kwIter<keywords.length; kwIter++)    {
                socket.removeListener(keywords[kwIter], tweetHandler);
                socket.removeListener(keywords[kwIter] + "DbResults", dbResultsHandler);
            }

            for (var userInputIter=0; userInputIter<userInputs.length; userInputIter++)  {
                if (userInputs[userInputIter].checked)   {
                    console.log("bind all listeners for user input " + userInputIter); 
                    // bind listener for db results after querying tweets that mention this kw
                    socket.on(keywords[userInputIter] + 'DbResults', dbResultsHandler);
                    // bind listener for kw
                    socket.on(keywords[userInputIter], tweetHandler);
                    // request DB results for this kw
                    socket.emit(userInputs[userInputIter].value, userInputs[userInputIter].value);
                }
            }
        }
    };
 
    socket.on("connected", function(r)  {
        console.log("i am the client and I'm ready to receive messages");
        socket.emit("client ready");
    });
}
