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
    console.log("Node data",this.nodeData)
    this.coreData = this.data;
    this.upgradeData();

    this.createColors = this.gatherColors;
    this.buildSVG();
    console.log("Data", this.data)
    console.log("Core", this.core)
  }

  _style() {
    return `
      :host {
        width: 50vw;
        display: block;
        min-height: 200px;
        height: 100%;
      }

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
        <slot id="form" name="form" />
      </div>
      <div id="svg"></div>
      <slot id="json" name="json" />
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
    if (aspect === 0) return false;
    return isNaN(aspect) ? false : aspect;
  }
  
  get nodeData() {
    console.log("this", this)
    var rect = this.getBoundingClientRect();
    var width = rect.width;
    var height = this.aspect ? this.aspect * width : rect.height; 
    return {
      width: width,
      height: height
    }
  }

  get layout() {
    var layoutTypes = ['wavy','buddy','towery','spikey'];
    var attributeLayout = this.getAttribute('layout');
    var check = layoutTypes.find(layout => layout === attributeLayout) ;

    return check ? check : 'towery';
  }

  get curveRatio() {
    var attribute = isNaN(Number(this.getAttribute('curve-level'))) ? 1 : Number(this.getAttribute('curve-level'));
    var ratio = 1;

    if (attribute === 1) ratio = 0.1;
    if (attribute === 2) ratio = 0.5;

    return ratio;
  }

  get buildInColors() {
    // Theme generated with help from https://coolors.co
    var themes = {
      oldschool: ["#0c1618","#004643","#faf4d3","#d1ac00","#f6be9a","#f4d6cc","#004643","#f4b860","#922d50","#501537"],
      history: ["#04151f","#183a37","#efd6ac","#c44900","#432534","#cc5803", "#12100e", "#efd6ac", "#30321c", "#4a4b2f"],
      bubblegum: ["#8fbfe0","#7c77b9","#1d8a99","#0bc9cd","#14fff7","#8b80f9","#cfbff7","#dd7373","#0bc9cd","#f9f5e3"],
      wise: ["#5d737e","#55505c","#d4f4dd","#fe5f55","#fb5012","#f9ada0","#f9627d","#d4f4dd","#613f75","#426a5a"],
      default: ["#F0FAF0","#D1F0D1","#B2E6B2","#93DC93","#74D274","#56C856","#3CB93C","#329A32","#287B28","#1E5C1E"]
    };

    var themeName = 'default';
    if (this.hasAttribute('theme')) {
      var attributeValue = this.getAttribute('theme').toLowerCase();

      if (themes.hasOwnProperty(attributeValue)) {
        themeName = attributeValue;
      }
    }

    return {
      outline: "#EEEEEE",
      fill: themes[themeName]
    }
  }

  get data() {
    var data = [];
    var validJSON = false;
    var formNode = this.shadowRoot.querySelector('#form').assignedNodes()[0];
    var jsonNode = this.shadowRoot.querySelector('#json').assignedNodes()[0];

    if (formNode && formNode.tagName !== 'FORM') formNode = false;
    if (jsonNode && jsonNode.tagName !== 'SCRIPT') jsonNode = false;
    
    if (jsonNode) {
       try {
        validJSON = JSON.parse(jsonNode.innerHTML);
      } catch(e) {
        console.error('The provided JSON is not valid', e);
        jsonNode = false;
      }
      
      if (validJSON) {
        if (Array.isArray(validJSON)) {
          validJSON.forEach(obj => {
            if (typeof obj === 'object') {
              if (!obj.hasOwnProperty('label')) return;
              if (!obj.hasOwnProperty('values')) return;
              if (!Array.isArray(obj.values)) return;
              if (!obj.values.length > 0) return;

              var returnObject = {
                label: obj.label,
                values: obj.values.filter(value => {
                  if (!isNaN(Number(value))) {
                    return Number(value);
                  }
                })
              };

              if (returnObject.values.length === 0) return;

              // Validate the colors object
              var validColorObj = {};

              if (obj.hasOwnProperty('colors')) {
                if (typeof obj.colors === 'object') {
                  
                  
                  if (obj.colors.hasOwnProperty('outline')) {
                    if (typeof obj.colors.outline === 'string') {
                      if (obj.colors.outline.match(/^#?[a-fA-F0-9]{6}$/)) {
                        validColorObj.outline = obj.colors.outline.charAt(0) === '#' 
                          ? obj.colors.outline 
                          : '#' + obj.colors.outline;;
                      }
                    }
                  }
                }

                if (obj.colors.hasOwnProperty('fill')) {
                  if (typeof obj.colors.fill === 'string') {
                    if (obj.colors.fill.match(/^#?[a-fA-F0-9]{6}$/)) {
                      validColorObj.fill = obj.colors.fill.charAt(0) === '#' 
                        ? obj.colors.fill 
                        : '#' + obj.colors.fill;
                    };
                  }

                  if (Array.isArray(obj.colors.fill) && !validColorObj.hasOwnProperty('fill')) {
                    var validatedColors = [];
                    obj.colors.fill.forEach(color => {
                      if (typeof color !== 'string') return;

                      if (color.match(/^#?[a-fA-F0-9]{6}$/)) {
                        validatedColors.push(color.charAt(0) === '#' 
                          ? color 
                          : "#" + color
                        );
                      }
                    });
                    if (validatedColors.length > 0) validColorObj.fill = validatedColors;
                  }
                }

                
                if (validColorObj.hasOwnProperty('outline') || validColorObj.hasOwnProperty('fill')) {
                  returnObject.colors = validColorObj;
                }
              };
              
              data.push(returnObject);
            }
          });
        }
      }
    }
    
    // If we have a <form> and no data have been added to our data-variable.
    if (formNode && data.length === 0) {
      var validForm = new FormData(formNode).entries();
      
      for (const [name, value] of validForm) {
        var i = data.findIndex( existingObject => existingObject.name === name);
        
        // If the object doesn't exists then add it.
        var obj = i === -1 
        ? {
          name: name,
          label: name.charAt(0).toUpperCase() + name.slice(1),
          values: []
        }
        : data[i];
        
        if(!isNaN(Number(value))) obj.values.push(Number(value));
        if (i === -1) data.push(obj);
      }
    }
    
    return data.length > 0 ? data : false;
  }

  turnToTwoDigits(nr) {
    return +(Math.round(nr + "e+2") + "e-2");
  }

  /**
   * @param {array} array - Array of data to compare, to set the core values.
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
    var SVGWidth = this.nodeData.width;
    var amountOfXs = Math.max.apply(null, array.map(obj => obj.values.length));
    var xCordinates = [];

    for(let i = 0; i < amountOfXs; i++) {
      var xBase = SVGWidth / (amountOfXs - 1);
      var ratio = xBase * this.curveRatio
      var x = xBase * i;
      
      var x1 = (xBase * (i - 1)) + ratio;
      var x2 = x - ratio;
      if (i === (amountOfXs - 1)) x = SVGWidth;

      var returnObj = {
        x: this.turnToTwoDigits(x),
        x1: this.turnToTwoDigits(x1),
        x2: this.turnToTwoDigits(x2)
      };

      xCordinates.push(returnObj);
    }
    
    this.setAttribute('max', max);
    this.setAttribute('half', half);

    // Set unique colors
    var collectedColors = [];
    array.forEach(item => {
      if (item.hasOwnProperty('colors')) {
        if (item.colors.hasOwnProperty('fill')) {
          collectedColors.push(item.colors.fill);
        }
      }
    });

    this.core = { 
      max: max,
      half: half,
      svg_width: SVGWidth,
      x_amount: amountOfXs,
      x_cordinates: xCordinates,
      unique_colors: [...new Set(collectedColors.flat())],
      min: 0
    };
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
        var rounded = percentages.map(perNr => this.turnToTwoDigits(perNr));

        obj.compared_percentages.push(rounded[0] + "%");
        obj.total_percentages.push(rounded[1] + "%");
      });

      obj.percentage = ((combinedValues / this.core.max) * 100) + "%";
    });
  }
  
  /**
   * SVG methods
   */

  buildGradients() {
    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    var createGradient = (color) => {
      var gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      gradient.id = 'gradient-color-' + color.replace('#','');
      gradient.setAttribute('x1', 0);
      gradient.setAttribute('x2', 0);
      gradient.setAttribute('y1', 0);
      gradient.setAttribute('y2', 1);
  
      [
        {
          offset: '0%',
          'stop-color': color
        },
        {
          offset: '100%',
          'stop-color': color,
          'stop-opacity': 0
        }
      ].forEach(config => {
        var stopElement = document.createElementNS('http://www.w3.org/2000/svg', 'stop');

        for (const key in config) {
          stopElement.setAttribute(key, config[key]);
        }
  
        gradient.appendChild(stopElement);
      });

      defs.appendChild(gradient);
    }

    var allUniqueColors = [...new Set(this.buildInColors.fill.concat(this.core.unique_colors).flat())];
    allUniqueColors.forEach(color => createGradient(color));

    return defs;
  }

  createPaths(dataObject, otherLoopIndex, addFilled = true) {
    var yCordinates =dataObject.values;
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    var lastX = this.core.x_cordinates[this.core.x_cordinates.length - 1].x;
    var lastY = this.core.max - yCordinates.slice(-1);
    var string = '';

    yCordinates.forEach((y, i) => {
      var xObj = this.core.x_cordinates[i];
      var correctY = this.core.max - y;
      var nextString = `M ${xObj.x} ${this.core.max - y}`;
 
      // If not the first
      if (i !== 0) {
        var previousY = this.core.max - yCordinates[i - 1];

        if (this.layout == 'wavy') {
          nextString = ` C ${xObj.x1} ${previousY}, ${xObj.x2} ${correctY}, ${xObj.x} ${correctY}`
        }
        
        if (this.layout == 'spikey') {
          nextString = ` L ${xObj.x} ${correctY}`;
        }
      }

      string += nextString;
    });

    // If the data is shorter than the larges finish the path with a line across horizontally.
    if (this.core.x_amount > yCordinates.length) {
      string += `L ${lastX} ${lastY}`;
    }

    // Find the correct colors
    var colorIndex = otherLoopIndex % (this.buildInColors.fill.length - 1);
    var strokeColor = this.buildInColors.fill[colorIndex];
    var fillColor = this.buildInColors.fill[colorIndex];

    if (dataObject.hasOwnProperty('colors')) {
      if (dataObject.colors.hasOwnProperty('outline')) {
        strokeColor = dataObject.colors.outline;
      }

      if (dataObject.colors.hasOwnProperty('fill')) {
        fillColor = typeof dataObject.colors.fill === 'string' ? dataObject.colors.fill : dataObject.colors.fill[0];
      }
    } 
    
    path.setAttribute('d', string);
    path.setAttribute('stroke', strokeColor);
    path.setAttribute('fill', 'transparent');
    path.setAttribute('stroke-width', '2px');
    
    // Return if no need for a filled background
    if (!addFilled) return [path];
    
    var SVGHeight = this.core.max;
    string += ` L ${lastX} ${SVGHeight} L 0 ${SVGHeight} Z`;
    
    var filledPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    filledPath.setAttribute('d', string);
    filledPath.setAttribute('fill', 'url(#gradient-color-' + fillColor.replace('#','') + ')')
    filledPath.setAttribute('stroke', 'transparent');

    return [filledPath, path];
  }

  /**
   * 
   * 
   * NEXT THING!!!
   * 
   * Setup up things like the gradient (maybe have a couple of options, should it be tranparent or full color)?
   * Have option for full of the same color
   * Turn on/off the option to have a filled background
   */

  buildMarkers(width,height) {
    // Add valuta (Can be $ or USD etc)
    // Use max to calculate the space needed
    // Add some extra spacing between the markers and the graph
    // Calculate the placements on the markers
    // Surround the markers with a <g>
    // Style the markers

    // Calculate the space
    var rulerSVG = document.createElementNS('http://www.w3.org/2000/svg','svg');
    rulerSVG.classList.add('ruler-svg')
    rulerSVG.setAttribute('viewBox', `0 0 ${width} ${height}`);
    rulerSVG.setAttribute('width', width);
    rulerSVG.setAttribute('height', height);
    rulerSVG.style.opacity = '0';
    
    var ruler = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    ruler.textContent = this.core.max + 'USD';
    rulerSVG.appendChild(ruler);
    this.shadowRoot.appendChild(rulerSVG);
    
    var rulerElement = this.shadowRoot.querySelector('.ruler-svg text');
    var rulerWidth = Math.ceil(rulerElement.getBBox().width + (width * 0.05));
    var rulerHeight = Math.ceil(rulerElement.getBBox().height);
    
    rulerElement.remove();
  

    console.log("RUler",rulerWidth,rulerHeight)

    var maxMarker = {

    };

    var minMarker = {

    };

    // Amount to add the all x-data to make room.

  }

  buildSVG() {
    var graphSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    var width = this.core.svg_width;
    var height = this.nodeData.height;

    graphSVG.setAttribute('viewBox', `0 0 ${width} ${height}`);
    graphSVG.setAttribute('width', width);
    graphSVG.setAttribute('height', height);

    this.buildMarkers(width,height);

    this.data.forEach((obj, i) => {
      this.createPaths(obj, i, true).forEach(path => graphSVG.appendChild(path));
    })

     graphSVG.appendChild(this.buildGradients());


    this.shadowRoot.querySelector('#svg').appendChild(graphSVG);
  }

}

customElements.define('aenother-infograph', Infograph);