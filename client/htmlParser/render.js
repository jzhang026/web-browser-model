const images = require('images');

function render(viewport, element) {
  if (element.style) {
    const img = images(element.style.width, element.style.height);

    if (element.style['background-color']) {
      let color = element.style['background-color'] || 'rgb(0,0,0)';
      let match = color.match(/rgb\((\d+),\s*(\d*),\s*(\d+)\)/);

      img.fill(Number(match[1]), Number(match[2]), Number(match[3]), 1);

      viewport.draw(img, element.style.left || 0, element.style.top || 0);
    }
  }

  if (element.children) {
    for (let child of element.children) {
      render(viewport, child);
    }
  }
}

module.exports = render;
