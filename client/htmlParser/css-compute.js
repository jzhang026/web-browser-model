const css = require('css');

let rules = [];
function addCSSRules(text) {
  const ast = css.parse(text);
  rules.push(...ast.stylesheet.rules);
}
function specificity(selectorStr) {
  const weight = [0, 0, 0, 0];
  const selectors = selectorStr.split(' ');
  for (let selector of selectors) {
    const type = selector.charAt(0);
    switch (type) {
      case '#':
        weight[1] += 1;
        break;
      case '.':
        weight[2] += 1;
        break;
      default:
        weight[3] += 1;
    }
  }
  return weight;
}
function compare(existing, current) {
  const length = Math.min(existing.length, current.length);
  let i = 0;
  while (i < length) {
    if (existing[i] - current[i]) {
      return existing[i] - current[i];
    }
    i++;
  }
  return 0;
}
function match(element, selectors) {
  if (!element || selectors.length === 0) return false;
  let currentElement = element;

  let i = selectors.length - 1;
  let currentSelector = selectors[i];

  while (i >= 0 && currentElement) {
    let currentElementParent = currentElement.parent;
    let immediaSiblings = currentElementParent
      ? currentElementParent.children.filter((element) => element.tagName)
      : [];
    switch (currentSelector) {
      case '>':
        return match(currentElementParent, selectors.slice(0, i));

      case '~':
        return immediaSiblings
          .slice(0, currentElement.nthChild)
          .some((element) => match(element, selectors.slice(0, i)));

      case '+':
        return match(
          immediaSiblings[currentElement.nthChild - 1],
          selectors.slice(0, i)
        );
      default:
        const type = currentSelector.charAt(0);
        let attribute;
        switch (type) {
          case '#':
            attribute = currentElement.attributes.find(
              (attr) => attr.name === 'id'
            );
            if (
              attribute &&
              attribute.value === currentSelector.replace('#', '')
            )
              currentSelector = selectors[--i];
            break;
          case '.':
            attribute = currentElement.attributes.find(
              (attr) => attr.name === 'class'
            );
            if (
              attribute &&
              attribute.value === currentSelector.replace('.', '')
            )
              currentSelector = selectors[--i];
            break;
          default:
            if (currentElement.tagName == currentSelector)
              currentSelector = selectors[--i];
        }
        if (i === selectors.length - 1) return false;
        if (!['>', '~', '+'].includes(currentSelector)) {
          currentElement = currentElement.parent;
        }
    }
  }
  if (i < 0) return true;
  return false;
}
function computeCss(element, stack) {
  const parents = stack.slice().reverse();
  element.computedStyle = element.computedStyle || {};
  for (const rule of rules) {
    if (match(element, rule.selectors[0].split(' '))) {
      const weight = specificity(rule.selectors[0]);
      const computedStyle = element.computedStyle;
      for (let declaration of rule.declarations) {
        let properties = computedStyle[declaration.property] || {};
        computedStyle[declaration.property] = properties;
        if (
          !properties.specificity ||
          compare(properties.specificity, weight) <= 0
        ) {
          properties.value = declaration.value;
          properties.specificity = weight;
        }
      }
    }
  }
}
module.exports = { computeCss, addCSSRules };
