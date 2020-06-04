const { computeCss, addCSSRules } = require('./css-compute');
const EOF = Symbol('EOF');

let currentState = null;
let currentToken = null;
let currentAttributeName = null;
let currentAttributeValue = null;
let currentTextNode = null;
let stack = [{ type: 'document', children: [], childLength: 0 }];
const TOKEN_TYPE = {
  TEXT: 'text',
  START_TAG: 'startTag',
  END_TAG: 'endTag',
  END_OF_FILE: EOF,
};

const nameOtherThanAttribute = ['type', 'tagName', 'isSelfClosing'];

function emit(token) {
  let top = stack[stack.length - 1];
  switch (token.type) {
    case TOKEN_TYPE.START_TAG:
      if (currentAttributeName !== null) {
        token[currentAttributeName] = currentAttributeValue;
        currentAttributeName = null;
        currentAttributeValue = null;
      }
      const element = {
        type: 'element',
        children: [],
        childLength: 0,
        attributes: Object.keys(token)
          .filter((key) => !nameOtherThanAttribute.includes(key))
          .map((key) => ({
            name: key,
            value: token[key],
          })),
        tagName: token.tagName,
        parent: top,
        nthChild: top.childLength++,
      };
      computeCss(element, stack);
      top.children.push(element);
      !token.isSelfClosing && stack.push(element);
      currentTextNode = null;
      break;

    case TOKEN_TYPE.END_TAG:
      if (top.tagName != token.tagName) {
        throw new Error(
          `<${top.tagName}> and </${token.tagName}> is not match`
        );
      }
      if (token.tagName === 'style') {
        addCSSRules(top.children[0].content);
      }
      stack.pop();
      currentTextNode = null;
      break;
    case TOKEN_TYPE.TEXT:
      if (!currentTextNode) {
        top.children.push(
          (currentTextNode = currentTextNode || {
            type: TOKEN_TYPE.TEXT,
            content: '',
          })
        );
      }
      currentTextNode.content += token.content;
      break;
    case TOKEN_TYPE.END_OF_FILE:
      break;
    default:
      console.warn('an unknown token emitted\n', token);
  }
}

function data(c) {
  switch (c) {
    case '<':
      return tagOpen;
    case TOKEN_TYPE.END_OF_FILE:
      emit({
        type: TOKEN_TYPE.END_OF_FILE,
      });
      break;
    case '\u0000':
    default:
      emit({
        type: TOKEN_TYPE.TEXT,
        content: c,
      });
      return data;
  }
}
module.exports.data = data;

function tagOpen(c) {
  if (c.match(/^[a-zA-Z]$/)) {
    currentToken = {
      type: TOKEN_TYPE.START_TAG,
      tagName: '',
    };
    return tagName(c);
  }
  switch (c) {
    case '\u0021': // ! exclamation mark
    case '\u002F': // Solidus '/'
      return endTagOpen;
    case EOF:
      emit({
        type: TOKEN_TYPE.TEXT,
        content: '',
      });
      emit({
        type: TOKEN_TYPE.END_OF_FILE,
      });
      break;
    default:
      emit({
        type: TOKEN_TYPE.TEXT,
        content: '<',
      });
      return data;
  }
}
function endTagOpen(c) {
  if (c.match(/^[a-zA-Z]$/)) {
    currentToken = {
      type: TOKEN_TYPE.END_TAG,
      tagName: '',
    };
    return tagName(c);
  }
  switch (c) {
    case '\u003E': // greater than sign >
      return data;
    case EOF:
      emit({
        type: TOKEN_TYPE.TEXT,
        content: '<',
      });
      emit({
        type: TOKEN_TYPE.TEXT,
        content: '/',
      });
      emit({
        type: TOKEN_TYPE.END_OF_FILE,
      });
      break;
    default:
      // This is an invalid-first-character-of-tag-name parse error.
      // Create a comment token whose data is the empty string. Reconsume in the bogus comment state.
      return;
  }
}

function tagName(c) {
  if (c.match(/^[a-zA-Z]$/)) {
    currentToken.tagName += c.toLowerCase();
    return tagName;
  }
  switch (c) {
    case '\t': // tab
    case '\n': // line feed (LF)
    case '\f': // Form Feed (FF)
    case '\u0020': // space
      return beforeAttributeName;
    case '\u002F': // solidus '/'
      return selfClosingStartTag;
    case '>':
      emit(currentToken);
      return data;
    default:
      return tagName;
  }
}
function beforeAttributeName(c) {
  if (currentAttributeName !== null) {
    currentToken[currentAttributeName] = currentAttributeValue;
    currentAttributeName = null;
    currentAttributeValue = null;
  }
  switch (c) {
    case '\t': // tab
    case '\n': // line feed (LF)
    case '\f': // Form Feed (FF)
    case '\u0020': // space
      return beforeAttributeName;
    case '\u002F': // solidus '/'
    case '\u003E': // greater-than sign '>'
    case TOKEN_TYPE.END_OF_FILE:
      return afterAttributeName(c);
    case '\u003D': // equals sign '='
      // This is an unexpected-equals-sign-before-attribute-name parse error.
      currentAttributeName = '=';
      currentAttributeValue = '';
      return attributeName;
    default:
      currentAttributeName = '';
      currentAttributeValue = '';
      return attributeName(c);
  }
}
function afterAttributeName(c) {
  switch (c) {
    case '\t': // tab
    case '\n': // line feed (LF)
    case '\f': // Form Feed (FF)
    case '\u0020': // space
      return afterAttributeName;
    case '\u002F': // solidus (/)
      return selfClosingStartTag;
    case '\u003D': // equals sign (=)
      return beforeAttributeValue;
    case '\u003E': // Greater than sign (>)
      emit(currentToken);
      return data;
    case TOKEN_TYPE.END_OF_FILE:
      // This is an eof-in-tag parse error.
      emit({
        type: TOKEN_TYPE.END_OF_FILE,
      });
      break;
    default:
      currentAttributeName = '';
      currentAttributeValue = '';
      return attributeName(c);
  }
}

function attributeName(c) {
  if (c.match(/^[a-zA-Z]$/)) {
    currentAttributeName += c.toLowerCase();
    return attributeName;
  }
  switch (c) {
    case '\t': // tab
    case '\n': // line feed (LF)
    case '\f': // Form Feed (FF)
    case '\u0020': // space
    case '\u002F': // solidus (/)
    case '\u003E': // Greater than sign (>)
    case TOKEN_TYPE.END_OF_FILE:
      return afterAttributeName(c);
    case '\u003D': // equals sign (=)
      return beforeAttributeValue;
    case '\u0000': // null
      // This is an unexpected-null-character parse error
      currentAttributeName += '\uFFFD';
      return attributeName;
    case '\u0022': // quotation mark "
    case '\u0027': // apostrophe '
    case '\u003C': // less than sign (<)
    //This is an unexpected-character-in-attribute-name parse error.Treat it as per the "anything else" entry below.
    default:
      currentAttributeName += c;
      return attributeName;
  }
}

function beforeAttributeValue(c) {
  switch (c) {
    case '\t': // tab
    case '\n': // line feed (LF)
    case '\f': // Form Feed (FF)
    case '\u0020': // space
      return beforeAttributeValue;
    case '\u0022': // quotation mark "
      return doubleQuotedAttributeValue;
    case '\u0027': // apostrophe '
      return singleQuotedAttributeValue;
    case '\u003E': // greater than sign (>)
      // This is a missing-attribute-value parse error.
      emit(currentToken);
      return data;
    default:
      return attributeValueUnquoted(c);
  }
}

function doubleQuotedAttributeValue(c) {
  switch (c) {
    case '\u0022': // quotation mark "
      return afterQuptedAttributeValue;
    case '\u0000':
      // This is an unexpected-null-character parse error
      currentAttributeValue += '\uFFFD';
      return doubleQuotedAttributeValue;
    case TOKEN_TYPE.END_OF_FILE:
      emit({
        type: TOKEN_TYPE.END_OF_FILE,
      });
      break;
    default:
      currentAttributeValue += c;
      return doubleQuotedAttributeValue;
  }
}

function singleQuotedAttributeValue(c) {
  switch (c) {
    case '\u0027': // apostrophe (')
      return afterQuptedAttributeValue;
    case '\u0000':
      // This is an unexpected-null-character parse error
      currentAttributeValue += '\uFFFD';
      return singleQuotedAttributeValue;
    case TOKEN_TYPE.END_OF_FILE:
      emit({
        type: TOKEN_TYPE.END_OF_FILE,
      });
      break;
    default:
      currentAttributeValue += c;
      return singleQuotedAttributeValue;
  }
}
function afterQuptedAttributeValue(c) {
  switch (c) {
    case '\t': // tab
    case '\n': // line feed (LF)
    case '\f': // Form Feed (FF)
    case '\u0020': // space
      return beforeAttributeName;
    case '\u002F': //SOLIDUS (/)
      return selfClosingStartTag;
    case '\u003E': // GREATER-THAN SIGN (>)
      emit(currentToken);
      return data;
    case TOKEN_TYPE.END_OF_FILE:
      emit({
        type: TOKEN_TYPE.END_OF_FILE,
      });
      break;
    default:
      // This is a missing-whitespace-between-attributes parse error.
      return beforeAttributeName(c);
  }
}

function attributeValueUnquoted(c) {
  switch (c) {
    case '\t': // tab
    case '\n': // line feed (LF)
    case '\f': // Form Feed (FF)
    case '\u0020': // space
      return beforeAttributeName;
    case '\u003E': // (>)
      emit(currentToken);
      return data;
    case '\u0000':
      // This is an unexpected-null-character parse error
      currentAttributeValue += '\uFFFD';
      return singleQuotedAttributeValue;
    case TOKEN_TYPE.END_OF_FILE:
      emit({
        type: TOKEN_TYPE.END_OF_FILE,
      });
      break;
    //Below case all are unexpected-character-in-unquoted-attribute-value parse errors.
    case '\u0022': // QUOTATION MARK (")
    case '\u0027': // APOSTROPHE (')
    case '\u003C': // LESS-THAN SIGN (<)
    case '\u003D': // EQUALS SIGN (=)
    case '\u0060': // GRAVE ACCENT (`)
    default:
      currentAttributeValue += c;
      return attributeValueUnquoted;
  }
}
function selfClosingStartTag(c) {
  if (c == '>') {
    currentToken.isSelfClosing = true;
    emit(currentToken);
    return data;
  }
}

module.exports.parseHTML = function parseHTML(html) {
  let state = data;

  for (let c of html) {
    currentState = state;
    state = state(c);
  }
  state = state(EOF);

  return stack[0];
};
