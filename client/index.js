const net = require('net');
const ResponseParser = require('./response-parser');
class Request {
  constructor(options) {
    this.method = options.method || 'GET';
    this.host = options.headers.host;
    this.path = options.path || '/';
    this.port = options.port || 80;
    this.body = options.body || {};
    this.headers = options.headers || {};
    if (!this.headers['Content-Type']) {
      this.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    if (this.headers['Content-Type'] === 'application/json') {
      this.bodyText = JSON.stringify(this.body);
    } else if (
      this.headers['Content-Type'] === 'application/x-www-form-urlencoded'
    ) {
      this.bodyText = Object.keys(this.body)
        .map((key) => `${key}=${encodeURIComponent(this.body[key])}`)
        .join('&');
    }
    this.headers['Content-Length'] = this.bodyText.length;
  }

  toString() {
    let request = [
      `${this.method} ${this.path} HTTP/1.1\r\n`,
      ...Object.keys(this.headers).map(
        (key) => `${key}: ${this.headers[key]}\r\n`
      ),
      '\r\n',
      `${this.bodyText}\r\n`,
    ];
    return request.join('');
  }

  send() {
    return new Promise((resolve, reject) => {
      if (this.connection) {
        this.connection.write(this.toString());
      } else {
        this.connection = net.createConnection(
          {
            host: this.host,
            port: this.port,
          },
          () => {
            this.connection.write(this.toString());
          }
        );
      }

      this.connection.on('data', (data) => {
        let responseParser = new ResponseParser();
        responseParser.receive(data.toString());
        const { statusCode, statusText, headers, body } = responseParser;
        let response = {
          statusCode,
          statusText,
          headers,
          body,
        };
        resolve(response);
        this.connection.end();
      });
    });
  }
}

class Response {}
void (async function () {
  let request = new Request({
    method: 'GET',
    port: '8088',
    headers: { host: 'localhost' },
    body: { name: 'adrian' },
  });
  let res = await request.send();
  console.log(JSON.stringify(res, null, 2));
})();
