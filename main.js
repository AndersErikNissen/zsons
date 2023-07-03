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
    //this.dataFromForm = this.shadowRoot.querySelector('slot[name="data"]').assignedNodes()[0];
    this.coreData = this.data;
    this.upgradeData();

    this.createColors = this.gatherColors;
    console.log("Colors", this.buildInColors)
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
    if (aspect === 0) return 1;
    return isNaN(aspect) ? 1 : aspect;
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
    var SVGWidth = max * this.aspect;
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
    

    this.core = { 
      max: max,
      half: half,
      svg_width: SVGWidth,
      x_amount: amountOfXs,
      x_cordinates: xCordinates,
      min: 0
    };
  }

  /**
   * Utility methods
   */

  turnToTwoDigits(nr) {
    return +(Math.round(nr + "e+2") + "e-2");
  }

  _getColors(object) {

  }
  
  /**
   * SVG methods
   */

  buildGradients(name, stops, units) {

    var gradientConfig = [
      {
        offset: '0%',
        'stop-color': this.colors.fill_one
      },
      {
        offset: '100%',
        'stop-color': this.colors.fill_two,
        'stop-opacity': 1
      }
    ];
    
    var gradientUnits = {
      'x1': 0,
      'x2': 0,
      'y1': 0,
      'y2': 1
    };
    defs.appendChild(this.createGradient('test-gradient', gradientConfig, gradientUnits));
    
    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    var createGradient = (color) => {
      var gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      gradient.setAttribute('x1', 0);
      gradient.setAttribute('x2', 0);
      gradient.setAttribute('y1', 0);
      gradient.setAttribute('y2', 1);
  
      [
        {
          offset: '0%',
          'stop-color': color,
          'stop-opacity': 0
        },
        {
          offset: '100%',
          'stop-color': color
        }
      ].forEach(config => {
        var stopElement = document.createElementNS('http://www.w3.org/2000/svg', 'stop');

        for (const key in config) {
          stopElement.setAttribute(key, stop[key]);
        }
  
        gradient.appendChild(stopElement);
      });

      defs.appendChild(gradient);
    }

    this.buildInColors.fill.forEach(fill => createGradient(fill));

    // Create gradient for each buildIn
    // Create gradient for each color given in the data
    
    // How to name them?
    // Call gradient-color

    // Dont build if they already exists

    // Does gradient with the name exist?
    // Create gradient
    // Add x1,x2,y1,y2
    // Create stops
      // 0% and 100%


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

  createPath(dataObject, otherLoopIndex, addFilled = true) {
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

    // Find the correct color
    var colorIndex = this.buildInColors.fill.length - (otherLoopIndex % this.buildInColors.fill.length);
    var strokeColor = this.buildInColors.fill[colorIndex];
    if (dataObject.hasOwnProperty('colors')) strokeColor = dataObject.colors.outline;
    
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
    filledPath.setAttribute('fill', 'url(#test-gradient)')
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


  /**
   * Main methods
   */
  
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


  buildSVG() {
    var graphSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    var width = this.core.svg_width;
    var height = this.core.max;

    graphSVG.setAttribute('viewBox', `0 0 ${width} ${height}`);
    graphSVG.setAttribute('width', width);
    graphSVG.setAttribute('height', height);

    this.data.forEach((obj, i) => {
      this.createPath(obj, i, true).forEach(path => graphSVG.appendChild(path));
    })

     // Styling
     var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
     var gradientConfig = [
       {
         offset: '0%',
         'stop-color': this.colors.fill_one
       },
       {
         offset: '100%',
         'stop-color': this.colors.fill_two,
         'stop-opacity': 1
       }
     ];

    var gradientUnits = {
      'x1': 0,
      'x2': 0,
      'y1': 0,
      'y2': 1
    };
     
     defs.appendChild(this.createGradient('test-gradient', gradientConfig, gradientUnits));
     graphSVG.appendChild(defs);


    this.shadowRoot.querySelector('#svg').appendChild(graphSVG);
  }

}

customElements.define('aenother-infograph', Infograph);