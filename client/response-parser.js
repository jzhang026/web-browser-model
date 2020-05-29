class ResponseParser {
  constructor() {
    this.WAITING_STATUS_LINE = 0;
    this.WAITING_STATUS_LINE_END = 1;
    this.WAITING_HEADER_NAME = 2;
    this.WAITING_HEADER_SPACE = 3;
    this.WAITING_HEADER_VALUE = 4;
    this.WAITING_HEADER_LINE_END = 5;
    this.WAITING_HEADER_BLOCK_END = 6;
    this.WAITING_BODY = 7;

    this.currentStatus = this.WAITING_STATUS_LINE;
    this.statusLine = '';
    this.headers = {};
    this.headerName = '';
    this.headerValue = '';
    this.bodyParser = null;
  }
  receive(string) {
    for (let i = 0; i < string.length; i++) {
      this.receiveCharacter(string.charAt(i));
      if (this.currentStatus === this.WAITING_BODY) {
      }
    }
  }
  receiveCharacter(char) {
    // headers["Transfer-Encoding"]: chunked
    switch (this.currentStatus) {
      case this.WAITING_STATUS_LINE:
        return this.parseStatusLine(char);
      case this.WAITING_STATUS_LINE_END:
        if (char == '\n') this.currentStatus = this.WAITING_HEADER_NAME;
        break;
      case this.WAITING_HEADER_NAME:
        return this.parseHeaderName(char);
      case this.WAITING_HEADER_SPACE:
        if (char == ' ') this.currentStatus = this.WAITING_HEADER_VALUE;
        break;
      case this.WAITING_HEADER_VALUE:
        return this.parseHeaderValue(char);
      case this.WAITING_HEADER_LINE_END:
        if (char === '\n') this.currentStatus = this.WAITING_HEADER_NAME;
        break;
      case this.WAITING_HEADER_BLOCK_END:
        if (char === '\n') {
          this.currentStatus = this.WAITING_BODY;
          if (this.headers['Transfer-Encoding'] === 'chunked') {
            this.bodyParser = new ChunkedBodyParser();
          }
        }
        break;
      case this.WAITING_BODY:
        return this.bodyParser.receive(char);
    }
  }
  parseStatusLine(char) {
    if (char === '\r') {
      this.currentStatus = this.WAITING_STATUS_LINE_END;
    } else {
      this.statusLine += char;
    }
  }
  parseHeaderName(char) {
    if (char == '\r') {
      this.currentStatus = this.WAITING_HEADER_BLOCK_END;
    } else if (char !== ':') {
      this.headerName += char;
    } else {
      this.currentStatus = this.WAITING_HEADER_SPACE;
    }
  }
  parseHeaderValue(char) {
    if (char !== '\r') {
      this.headerValue += char;
    } else {
      this.currentStatus = this.WAITING_HEADER_LINE_END;
      this.headers[this.headerName] = this.headerValue;
      this.headerName = '';
      this.headerValue = '';
    }
  }
  get statusCode() {
    let code = this.statusLine.match(/\s(\d{3})\s/)[1];
    return +code;
  }
  get statusText() {
    let statusText = this.statusLine.match(/\s(\w*)$/)[1];
    return statusText;
  }
  get body() {
    return this.bodyParser.body;
  }
}

class ChunkedBodyParser {
  constructor() {
    this.WAITING_CHUNK_SIZE = 0;
    this.WAITING_CHUNK_SIZE_END = 1;
    this.WAITING_CONTENT = 2;
    this.WAITING_CONTENT_END = 3;
    this.CHUNKED_BODY_END = 4;

    this.contentLine = '';
    this.chunked = [];
    this.currentStatus = this.WAITING_CHUNK_SIZE;
    this.currentChunkLength = 0;
  }
  receive(char) {
    switch (this.currentStatus) {
      case this.WAITING_CHUNK_SIZE:
        if (char !== '\r') {
          this.currentChunkLength =
            this.currentChunkLength * 16 + parseInt(char, 16);
        } else {
          if (this.currentChunkLength === 0) {
            this.currentStatus = this.FINISHED_BODY_PARSE;
          } else {
            this.currentStatus = this.WAITING_CHUNK_SIZE_END;
          }
        }
        break;
      case this.WAITING_CHUNK_SIZE_END:
        if (char === '\n') this.currentStatus = this.WAITING_CONTENT;
        break;
      case this.WAITING_CONTENT:
        if (this.currentChunkLength === 0) {
          if (char === '\r') {
            this.chunked.push(this.contentLine);
            this.contentLine = '';
            this.currentStatus = this.WAITING_CONTENT_END;
          }
        } else {
          this.currentChunkLength--;
          this.contentLine += char;
        }
        break;
      case this.WAITING_CONTENT_END:
        if (char === '\n') this.currentStatus = this.WAITING_CHUNK_SIZE;
        break;
      case this.FINISHED_BODY_PARSE:
        return;
    }
  }
  get body() {
    return this.chunked.join('');
  }
}

module.exports = ResponseParser;
