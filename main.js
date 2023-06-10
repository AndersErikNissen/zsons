"use strict";
/*
  Layouts
  - Graph
  - Bar chart
    - Stacked on top of each other
    - Stacked beside each other, grouped for each number (So "events", would all be beside each other, then "meetings" and so on)
  - Backlog: Pie chart
  - Difference between two array (Like LoL gold difference)

  The data comes from and array of inputs [[name,value]...]

  We want to end up with
    An array of objects with:
    - Name
    - All the values

    Global data:
    - The highest number and the ones in between

  Check for changes to current inputs or new ones with "slotchanged".
*/

class Infograph extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this._template().content.cloneNode(true));
  }
  
  connectedCallback() {
    this.dataFromForm = this.shadowRoot.querySelector('slot[name="data"]').assignedNodes()[0];
    this.coreData = this.data;
    this.upgradeData();

    this.buildSVG();
    console.log("Data", this.data)
    console.log("Core", this.core)
    console.log(this.layout)
  }

  _style() {
    return `
      #content {
        background-color: purple;
      }
    `;
  }

  _template() {
    const template = document.createElement('template');

    template.innerHTML = `
      <style>${this._style()}</style>
      <div class="hidden">
        <slot name="data" />
      </div>
      <div id="svg"></div>
    `;

    return template;
  }

  _addContent() {
    // Good to know to use .shadowRoot, but it might make more sense to just add the content to the template itself ;) 
    var content = this.shadowRoot.querySelector('#content');

    content.innerHTML = "<span>This is some NICE, content!</span>"
  }

  get aspect() {
    var aspect = Number(this.getAttribute('aspect'));
    if (aspect === 0) return 1;
    return isNaN(aspect) ? 1 : aspect;
  }

  get layout() {
    var layoutTypes = ['wavy','buddy','towery','spikey'];
    var attributeLayout = this.getAttribute('layout');
    var check = layoutTypes.find(layout => layout === attributeLayout) ;

    return check ? check : 'towery';
  }

  /**
   * @param {array} array - Array of data to compare, to set the core values 
   */
  set coreData(array) {
    var maxValue = Math.max.apply(null, array.map(obj => obj.values).flat());

    if (this.layout === 'towery') {
      var maxValue = Math.max.apply(null, array.map( obj => {
        var combinedValues = 0;
        obj.values.forEach( value => combinedValues += value);
        return combinedValues;
      }));
    }

    if(isNaN(maxValue)) return;

    const getMaxNumber = nr => {
      var length = String(nr).length;
      if (nr < 0) length--;

      var base = 10 ** length;
      var max = base;
      var minus = base / 10;

      while(nr % max === nr) {
        max = max - minus;
      }

      if (nr < 0) max * -1;

      return max * 2;
    };

    var max = getMaxNumber(maxValue);
    var half = max / 2;

    var amountOfXs = Math.max.apply(null, array.map(obj => obj.values.length));
    var xCordinates = [];

    for(let i = 0; i < amountOfXs; i++) {
      var pushValue = ((max * this.aspect) / amountOfXs) * i;
      if (i === (amountOfXs - 1)) {
        pushValue = max * this.aspect;
      }

      xCordinates.push(pushValue);
    }

    console.log("x",xCordinates)
    
    this.setAttribute('max', max);
    this.setAttribute('half', half);

    this.core = {
      max: max,
      half: half,
      svg_width: max * this.aspect,
      x_amount: amountOfXs,
      x_cordinates: xCordinates,
      min: 0
    };
  }

  /**
   * @param {node} form - Proviode a <form> node, to set the data that needs to be handled by the CE.
   */
  set dataFromForm(form) {
    var 
      formattedArray = [],
      data = form.tagName === 'FORM' 
        ? new FormData(form).entries() 
        : false;

    if (!data) return;

    for (const [name, value] of data) {
      var i = formattedArray.findIndex( existingObject => existingObject.name === name);
      var obj = i === -1 
        ? {
            name: name,
            label: name.charAt(0).toUpperCase() + name.slice(1),
            values: []
          }
        : formattedArray[i];
  
      if(!isNaN(Number(value))) obj.values.push(Number(value));
      if (i === -1) formattedArray.push(obj);
    }

    this.data = formattedArray;
  }
  
  upgradeData() {
    this.data.forEach( obj => {
      var combinedValues = 0;
      obj.compared_percentages = [];
      obj.total_percentages = [];
      obj.values.forEach(nr => combinedValues += nr);
      obj.values.forEach(nr => {
        var percentages = [(nr / combinedValues) * 100, (nr / this.core.max) * 100];

        // Help from: https://stackoverflow.com/questions/11832914/how-to-round-to-at-most-2-decimal-places-if-necessary/18358056#18358056
        var rounded = percentages.map( perNr => +(Math.round(perNr + "e+2") + "e-2"));

        obj.compared_percentages.push(rounded[0] + "%");
        obj.total_percentages.push(rounded[1] + "%");
      });

      obj.percentage = ((combinedValues / this.core.max) * 100) + "%";
    });
  }

  createGradient(name, stops, units) {
    var gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.id = name;

    // Add gradientUnits
    for (const property in units) {
      gradient.setAttribute(property, units[property]);
    }

    stops.forEach(stop => {
      var stopElement = document.createElementNS('http://www.w3.org/2000/svg', 'stop');

      for (const property in stop) {
        stopElement.setAttribute(property, stop[property]);
      }

      gradient.appendChild(stopElement);
    });

    return gradient;
  }

  buildSVG() {
    var graphSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    var width = this.core.svg_width;
    var height = this.core.max;

    graphSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    graphSvg.setAttribute('width', width);
    graphSvg.setAttribute('height', height);

    var createLine = (x, y) => {
      return ' L' + x + ' ' + (this.core.max - y);
    };

    var createCurve = (x, y) => {
      /*
      Use X from start point on x1
        And y1 should maybe be + 10 or something
      */
     var y1 = ;
     return `
      C 0 ${y1}
     `;

      return ' C 0 ' + startCurve + ', ' + endCurve + ', ' + x + ' ' + (this.core.max - y);
    }


    this.data.forEach(obj => {
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      var fullPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      var pathString = 'M0 ' + (this.core.max - obj.values[0]);
      var lastX = this.core.x_cordinates.slice(-1);
      var lastY = obj.values.slice(-1);

      // Add lines for each value
      obj.values.forEach((value, i) => {
        pathString += createLine(this.core.x_cordinates[i], value);
      });

      // If the value amount is less than the max, then create a horizontal line to the end of the SVG.
      if (this.core.x_amount > obj.values.length) {
        pathString += createLine(lastX, lastY);
      }

      // Complete path along the bottom of the SVG
      var fullPathString = pathString;

      fullPathString += ' L' + lastX + ' ' + height;
      fullPathString += ' L' + 0 + ' ' + height + ' Z';
      
      path.setAttribute('d', pathString);
      path.setAttribute('fill', 'transparent');
      path.setAttribute('stroke', 'black')

      fullPath.setAttribute('d', fullPathString);
      fullPath.setAttribute('fill', 'url(#test-gradient)');
      fullPath.setAttribute('stroke', 'transparent');

      graphSvg.append(fullPath, path);
    });

     // Styling
     var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
     var gradientConfig = [
       {
         offset: '0%',
         'stop-color': 'red'
       },
       {
         offset: '100%',
         'stop-color': 'red',
         'stop-opacity': 0
       }
     ];

    var gradientUnits = {
      'x1': 0,
      'x2': 0,
      'y1': 0,
      'y2': 1
    };
     
     defs.appendChild(this.createGradient('test-gradient', gradientConfig, gradientUnits));
     graphSvg.appendChild(defs);


    this.shadowRoot.querySelector('#svg').appendChild(graphSvg);
  }

}

customElements.define('aenother-infograph', Infograph);