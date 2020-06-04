const http = require('http');
const server = http.createServer((req, res) => {
  console.log('request received');
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('X-Foo', 'bar');
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(`<html maaa=a >
  <head>
    <style>
      #container{
        height:300px;
        width: 700px;
        display:flex;
        background-color:rgb(255,255,255);
      }
      #container #myid{
        width:200px;
        height:100px;
        background-color:rgb(255,0,0)
      }
      #container .c1{
        width: 100px;
        background-color:rgb(0,255,0)
      }
      #container > .a {
        width:50px;
        height: 150px;
        background-color:rgb(0,0,255);
      }
      .b {
        width:70px;
        background-color:rgb(222,122,255);
        align-self: stretch;
      }
    </style>
  </head>
  <body>
    <div id="container">
      <div id="myid"></div>
      <div class="c1"></div>
      <div class='a'></div>
      <div class='a'></div>
      <div class='b'></div>
    </div>
  </body>

</html>`);
});

server.listen(8088);
