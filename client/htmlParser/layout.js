const defaultFlexContainerStyle = {
  flexDirection: 'row',
  alignItems: 'stretch',
  justifyContent: 'flex-start',
  flexWrap: 'nowrap',
  alignContent: 'center',
};
function layout(element) {
  if (!element.computedStyle) return;
  const containerStyle = getStyle(element);
  if (containerStyle.display !== 'flex') return;
  const items = element.children
    .filter((e) => e.type === `element`)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  ['width', 'height'].forEach((size) => {
    if (containerStyle[size] === 'auto' || containerStyle[size] === '')
      containerStyle[size] = null;
  });

  // assign default style property for flex container
  for (let prop in defaultFlexContainerStyle) {
    if (!containerStyle[prop] || containerStyle[prop] === 'auto') {
      containerStyle[prop] = defaultFlexContainerStyle[prop];
    }
  }

  let mainSize,
    mainStart,
    mainEnd,
    mainSign,
    mainBase,
    crossSize,
    crossStart,
    crossEnd,
    crossSign,
    crossBase;

  //  left to right in ltr; right to left in rtl
  if (containerStyle.flexDirection === 'row') {
    // main axis
    mainSize = 'width';
    mainStart = 'left';
    mainEnd = 'right';
    mainSign = 1;
    mainBase = 0;

    // cross axis
    crossSize = 'height';
    crossStart = 'top';
    crossEnd = 'bottom';
  }
  // right to left in ltr; left to right in rtl
  if (containerStyle.flexDirection === 'row-reverse') {
    mainSize = 'width';
    mainStart = 'right';
    mainEnd = 'left';
    mainSign = -1;
    mainBase = containerStyle.width;

    crossSize = 'height';
    crossStart = 'top';
    crossEnd = 'bottom';
  }

  // same as row but top to bottom
  if (containerStyle.flexDirection === 'column') {
    mainSize = 'height';
    mainStart = 'top';
    mainEnd = 'bottom';
    mainSign = 1;
    mainBase = 0;

    crossSize = 'width';
    crossStart = 'left';
    crossEnd = 'right';
  }
  // same as row-reverse but bottom to top
  if (containerStyle.flexDirection === 'column-reverse') {
    mainSize = 'height';
    mainStart = 'bottom';
    mainEnd = 'top';
    mainSign = -1;
    mainBase = containerStyle.height;

    crossSize = 'width';
    crossStart = 'left';
    crossEnd = 'right';
  }

  // By default, flex items will all try to fit onto one line
  if (containerStyle.flexWrap === 'wrap-reverse') {
    let temp = crossStart;
    crossStart = crossEnd;
    crossEnd = temp;
    crossSign = -1;
  } else {
    crossBase = 0;
    crossSign = 1;
  }

  let isAutoMainSize = false;
  if (!containerStyle[mainSize]) {
    // auto sizing
    containerStyle[mainSize] = 0;
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      let itemStyle = getStyle(item);
      if (itemStyle[mainSize] !== null || itemStyle[mainSize] !== void 0)
        containerStyle[mainSize] =
          containerStyle[mainSize] + itemStyle[mainSize];
    }
    isAutoMainSize = true;
  }

  const flexLine = [];
  const flexLines = [];
  flexLines.push(flexLine);
  let mainSpace = containerStyle[mainSize];
  let crossSpace = 0;

  for (let i = 0; i < items.length; i++) {
    let item = items[i];
    let itemStyle = getStyle(item);

    if (itemStyle[mainSize] === null) {
      itemStyle[mainSize] = 0;
    }

    if (itemStyle.flex) {
      flexLine.push(item);
    } else if (containerStyle.flexWrap === 'nowrap' && isAutoMainSize) {
      mainSpace -= itemStyle[mainSize];
      if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== void 0) {
        // final line height is decided by the heighest inline item
        crossSpace = Math.max(crossSpace, itemStyle[crossSize]);
      }
      flexLine.push(item);
    } else {
      if (itemStyle[mainSize] > containerStyle[mainSize]) {
        itemStyle[mainSize] = containerStyle[mainSize];
      }
      if (mainSpace < itemStyle[mainSize]) {
        flexLine.mainSpace = mainSpace;
        flexLine.crossSpace = crossSpace;

        flexLine = [item];
        flexLines.push(flexLine);

        mainSpace = containerStyle[mainSize];
        crossSpace = 0;
      } else {
        flexLine.push(item);
      }
      if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== void 0) {
        crossSpace = Math.max(crossSpace, itemStyle[crossSize]);
      }
      mainSpace -= itemStyle[mainSize];
    }
  }
  flexLine.mainSpace = mainSpace;

  // cross space
  if (containerStyle.flexWrap === 'nowrap' || isAutoMainSize) {
    flexLine.crossSpace = containerStyle[crossSize] || crossSpace;
  } else {
    flexLine.crossSpace = crossSpace;
  }

  if (mainSpace < 0) {
    // shrink flex items with a scale
    const scale =
      containerStyle[mainSize] / (containerStyle[mainSize] - mainSpace);
    const currentMain = mainBase;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemStyle = getStyle(item);

      if (itemStyle.flex) {
        itemStyle[mainSize] = 0;
      }

      itemStyle[mainSize] = itemStyle[mainSize] * scale;

      itemStyle[mainStart] = currentMain;
      itemStyle[mainEnd] =
        itemStyle[mainStart] + mainSign * itemStyle[mainSize];
      currentMain = itemStyle[mainEnd];
    }
  } else {
    flexLines.forEach(function (items) {
      const mainSpace = items.mainSpace;
      let flexTotal = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemStyle = getStyle(item);

        if (itemStyle.flex !== null && itemStyle.flex !== void 0) {
          flexTotal += itemStyle.flex;
          continue;
        }
      }

      if (flexTotal > 0) {
        // flexible items
        let currentMain = mainBase;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const itemStyle = getStyle(item);

          if (itemStyle.flex) {
            itemStyle[mainSize] = (mainSpace / flexTotal) * itemStyle.flex;
          }
          itemStyle[mainStart] = currentMain;
          itemStyle[mainEnd] =
            itemStyle[mainStart] + mainSign * itemStyle[mainSize];
          currentMain = itemStyle[mainEnd];
        }
      } else {
        let currentMain, gap;

        if (containerStyle.justifyContent === 'flex-start') {
          currentMain = mainBase;
          gap = 0;
        }
        if (containerStyle.justifyContent === 'flex-end') {
          currentMain = mainSpace * mainSign + mainBase;
          gap = 0;
        }
        if (containerStyle.justifyContent === 'center') {
          currentMain = (mainSpace / 2) * mainSign + mainBase;
          gap = 0;
        }
        if (containerStyle.justifyContent === 'space-between') {
          gap = (mainSpace / (items.length - 1)) * mainSign;
          currentMain = mainBase;
        }
        if (containerStyle.justifyContent === 'space-around') {
          gap = (mainSpace / items.length) * mainSign;
          currentMain = gap / 2 + mainBase;
        }
        if (containerStyle.justifyContent === 'space-evenly') {
          gap = (mainSpace / (items.length + 1)) * mainSign;
          currentMain = gap + mainBase;
        }
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const itemStyle = getStyle(item);
          itemStyle[mainStart] = currentMain;
          itemStyle[mainEnd] =
            itemStyle[mainStart] + mainSign * itemStyle[mainSize];
          currentMain = itemStyle[mainEnd] + gap;
        }
      }
    });
  }
  // compute the cross axis size
  crossSpace = 0;
  if (!containerStyle[crossSize]) {
    // no crossSize means auto sizing
    crossSpace = 0;
    containerStyle[crossSize] = 0;
    for (let i = 0; i < flexLines.length; i++) {
      containerStyle[crossSize] =
        containerStyle[crossSize] + flexLines[i].crossSpace;
    }
  } else {
    crossSpace = containerStyle[crossSize];
    for (let i = 0; i < flexLines.length; i++) {
      crossSpace -= flexLines[i].crossSpace;
    }
  }

  if (containerStyle.flexWrap === 'wrap-reverse') {
    crossBase = containerStyle[crossSize];
  } else {
    crossBase = 0;
  }

  let lineSize = containerStyle[crossSize] / flexLines.length;

  let gap;

  if (containerStyle.alignContent === 'flex-start') {
    crossBase += 0;
    gap = 0;
  }
  if (containerStyle.alignContent === 'flex-end') {
    crossBase += crossSign * crossSpace;
    gap = 0;
  }
  if (containerStyle.alignContent === 'center') {
    crossBase += (crossSign * crossSpace) / 2;
    gap = 0;
  }
  if (containerStyle.alignContent === 'space-between') {
    crossBase += 0;
    gap = crossSpace / (flexLines.length - 1);
  }
  if (containerStyle.alignContent === 'space-around') {
    gap = crossSpace / flexLines.length;
    crossBase += (crossSign * step) / 2;
  }
  if (containerStyle.alignContent === 'stretch') {
    crossBase += 0;
    gap = 0;
  }

  flexLines.forEach(function (items) {
    let lineCrossSize =
      containerStyle.alignContent === 'stretch'
        ? items.crossSpace + crossSpace / flexLines.length
        : items.crossSpace;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemStyle = getStyle(item);

      const align = itemStyle.alignSelf || containerStyle.alignItems;
      if (itemStyle[crossSize] === null) {
        itemStyle[crossSize] = align === 'stretch' ? lineCrossSize : 0;
      }

      if (align === 'flex-start') {
        itemStyle[crossStart] = crossBase;
        itemStyle[crossEnd] =
          itemStyle[crossStart] + crossSign * itemStyle[crossSize];
      }

      if (align === 'flex-end') {
        itemStyle[crossEnd] = crossBase + crossSign * lineCrossSize;
        itemStyle[crossStart] =
          itemStyle[crossEnd] - crossSign * itemStyle[crossSize];
      }

      if (align === 'center') {
        itemStyle[crossStart] =
          crossBase + (crossSign * (lineCrossSize - itemStyle[crossSize])) / 2;
        itemStyle[crossEnd] =
          itemStyle[crossStart] + crossSign * itemStyle[crossSize];
      }

      if (align === 'stretch') {
        itemStyle[crossStart] = crossBase;
        itemStyle[crossEnd] =
          crossBase +
          crossSign *
            (itemStyle[crossSize] !== null && itemStyle[crossSize] !== void 0
              ? itemStyle[crossSize]
              : lineCrossSize);

        itemStyle[crossSize] =
          crossSign * (itemStyle[crossEnd] - itemStyle[crossStart]);
      }
    }
    crossBase += crossSign * (lineCrossSize + gap);
  });
}
function camelize(str) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/(\s|\-)+/g, '');
}

function getStyle(element) {
  if (!element.style) element.style = {};

  for (let prop in element.computedStyle) {
    let camelized = camelize(prop);
    element.style[camelized] = element.computedStyle[prop].value;

    if (element.style[camelized].toString().match(/px$/)) {
      element.style[camelized] = parseInt(element.style[camelized]);
    }

    if (element.style[camelized].toString().match(/^[0-9\.]+$/)) {
      element.style[camelized] = parseInt(element.style[camelized]);
    }
  }

  return element.style;
}

module.exports = layout;
