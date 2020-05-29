const ResponseParser = require('./response-parser');

let httpRequestStream =
  'HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nDate: Mon, 23 Dec 2020 06:05:19 GMT\r\nConnection: keep-alive\r\nTransfer-Encoding: chunked\r\n\r\n26\r\n<html><body> Hello World</body></html>\r\n0';
let responseParser;
beforeEach(() => {
  responseParser = new ResponseParser();
  responseParser.receive(httpRequestStream);
});
describe('response parser', () => {
  it('can parse status line', () => {
    expect(responseParser.statusLine).toEqual('HTTP/1.1 200 OK');
    expect(responseParser.statusCode).toBe(200);
    expect(responseParser.statusText).toEqual('OK');
  });

  it('can parse response headers', () => {
    expect(responseParser.headers).toEqual({
      'Content-Type': 'text/html',
      Date: 'Mon, 23 Dec 2020 06:05:19 GMT',
      Connection: 'keep-alive',
      'Transfer-Encoding': 'chunked',
    });
  });

  it('can parse chunked body', () => {
    expect(responseParser.body).toEqual(
      '<html><body> Hello World</body></html>'
    );
  });
});
