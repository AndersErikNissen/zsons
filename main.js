"use strict";

class Infograph extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.themes = { oldschool: ["#0c1618","#004643","#faf4d3","#d1ac00","#f6be9a","#f4d6cc","#004643","#f4b860","#922d50","#501537"], history: ["#04151f","#183a37","#efd6ac","#c44900","#432534","#cc5803", "#12100e", "#efd6ac", "#30321c", "#4a4b2f"], bubblegum: ["#8fbfe0","#7c77b9","#1d8a99","#0bc9cd","#14fff7","#8b80f9","#cfbff7","#dd7373","#0bc9cd","#f9f5e3"], wise: ["#5d737e","#55505c","#d4f4dd","#fe5f55","#fb5012","#f9ada0","#f9627d","#d4f4dd","#613f75","#426a5a"], default: ["#F0FAF0","#D1F0D1","#B2E6B2","#93DC93","#74D274","#56C856","#3CB93C","#329A32","#287B28","#1E5C1E"] };


    this.shadowRoot.innerHTML = `
      <style>
      :host {
        width: 100%;
        height: 100%;
        display: block;
      }
      
      text {
        font-size: 12px;
      }
      </style>
      
      <slot id="form" name="form"></slot>
      <slot id="json" name="json"></slot>
    `;
  }

  round(nr) {return Math.round((nr * Math.pow(10, 2)) * (1 + Number.EPSILON)) / Math.pow(10, 2);}

  get collectAllAttributes() {
    if (this.hasAttributes()) {
      var 
        allowedTypes = ['river','mountain',''],
        hasAllowedType = allowedTypes.find(type => type === this.getAttribute('type')),
        hasAllowedTheme = this.hasAttribute('theme') && this.themes.hasOwnProperty((this.getAttribute('theme').toLowerCase()));

      return {
        ...(hasAllowedType && { type: this.getAttribute('type') }),
        ...(hasAllowedTheme && { theme: this.getAttribute('theme').toLowerCase() }),
        labels: this.hasAttribute('labels') ? true : false,
        aspect: isNaN(Number(this.getAttribute('aspect'))) ? false : Number(this.getAttribute('aspect'))
      }
    }
    return {};
  }

  /**
   * @param {object} attributes - All the attributes from the element.
   */
  set mapAttributes(attributes) {
    // Add missing default settings
    var defaultSettings = { type: 'river', labels: true, aspect: false, theme: 'default' }
    for (const key in attributes) { if(!attributes[key]) attributes[key] = defaultSettings[key] };

    // Info from Custom Element
    var rect = this.getBoundingClientRect();
    attributes.width = rect.width;
    attributes.height = attributes.aspect ? rect.width * attributes.aspect : rect.height;

    this.settings = attributes;
  }
  
  /*
  _template() {
    const template = document.createElement('template');
    
    template.innerHTML = `
      <slot id="form" name="form"></slot>
      <slot id="json" name="json"></slot>
      <svg width="${this.dimensions.width}" height="${this.dimensions.height}" id="svg"></svg>
    `;
    
    return template;
  }

  get nodeData() {
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
    if (attribute === 2) ratio = 0.2;
    if (attribute === 3) ratio = 0.3;
    if (attribute === 4) ratio = 0.4;
    if (attribute === 5) ratio = 0.5;
    if (attribute === 6) ratio = 0.6;
 
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
 
    //var themeName = 'default' && this.hasAttribute('theme') && themes.hasOwnProperty(this.getAttribute('theme').toLowerCase()) ? ;
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
  */

  validateData(obj) {
    var 
      label = obj.label && typeof obj.label === 'string' && obj.label,
      values = obj.values && Array.isArray(obj.values) && obj.values;
    if (values) {
      values = values.filter(value => isNaN(Number(value)) ? false : Number(value));
      var 
        heighestValue = Math.max.apply(null, values),
        combinedValues = values.reduce((accumulation, current) => accumulation + current),
        amountOfValues = values.length;
    }

    var validated = {
      ...(label && { label: label}),
      ...(values && { values: values }),
      ...(heighestValue && { heighest_value: heighestValue }),
      ...(combinedValues && { heighest_combined_value: combinedValues }),
      ...(amountOfValues && { amount_of_values: amountOfValues }),
    };
    
    if (Object.entries(validated).length > 0) return validated;
  }

  get JSONData() {
    var 
      JSONData = this.shadowRoot.querySelector('#json').assignedNodes()[0].tagName === 'SCRIPT' && this.shadowRoot.querySelector('#json').assignedNodes()[0],
      parsedJSON = [];
    try { 
      parsedJSON = JSON.parse(JSONData.innerHTML); 
      if (!Array.isArray(parsedJSON)) parsedJSON = [];
    } catch(e) {};

    var validatedJSON = parsedJSON.filter(dataObj => this.validateData(dataObj));

    return validatedJSON.length > 0 ? validatedJSON : [];
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
      var length = String(Math.abs(nr)).length;

      var part = (10 ** length) * 0.1;
      var adjustetMax = part;

      while (adjustetMax % nr === adjustetMax) {
       adjustetMax += part;
      }

      return nr < 0 ? adjustetMax * -1 : adjustetMax; // Return negative number if nr is negative.
    };

    var max = getMaxNumber(maxValue);
    var mid = max / 2;
    var amountOfXs = Math.max.apply(null, array.map(obj => obj.values.length));
    var xCordinates = [];

    var maxLabel = max;
    var midLabel = mid;
    var afterLabel = '';

    var formatLabels = () => {
      if (max > 999) {
        maxLabel = max / 10e2;
        afterLabel = 'K'

        if (max > (10e5 - 1)) {
          afterLabel = 'M'
          maxLabel = max / 10e5;
        };

        if (max > (10e8 - 1) && afterLabel !== 'M') {
          afterLabel = 'B'
          maxLabel = max / 10e8;
        };

        midLabel = (maxLabel / 2) + afterLabel;
        maxLabel = maxLabel + afterLabel;
      }
    };
    formatLabels();

    var cordinates = () => {
      var longestYLabel = '';
      array.map(obj => obj.label).forEach(label => {if (label.length > longestYLabel.length) longestYLabel = label});

      var xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      xLabel.textContent = maxLabel;
      xLabel.id = "xLabel";
      var yLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      yLabel.textContent = longestYLabel;
      yLabel.id = "yLabel";

      this.svg.append(xLabel, yLabel);
      var svgXLabel = this.svg.querySelector('#xLabel').getBBox();
      var svgYLabel = this.svg.querySelector('#yLabel').getBBox();

      var spacer = 20;

      // Areas
      var returnObj = {
        graphArea: {x: Math.ceil(svgXLabel.width) + spacer, y: this.nodeData.height - (Math.ceil(svgYLabel.height) + spacer)},
        xArea: {width: Math.ceil(svgXLabel.width), height: Math.ceil(svgXLabel.height)},
        yArea: {width: Math.ceil(svgYLabel.width), height: Math.ceil(svgYLabel.height)} 
      };

      this.svg.querySelector('#xLabel').remove();
      this.svg.querySelector('#yLabel').remove();
      return returnObj;
    }

    var xFragment = (this.nodeData.width - cordinates().graphArea.x) / (amountOfXs - 1);
    var ratio = xFragment * this.curveRatio;
    for(let i = 0; i < amountOfXs; i++) {
      
      var x = cordinates().graphArea.x + (xFragment * i);  
      if (i === (amountOfXs - 1)) x = this.nodeData.width;
      var x1 = (xFragment * (i - 1)) + ratio;
      var x2 = x - ratio;

      xCordinates.push({
        x: this.turnToTwoDigits(x),
        x1: this.turnToTwoDigits(x1),
        x2: this.turnToTwoDigits(x2)
      });
    }
    
    this.setAttribute('max', max);
    this.setAttribute('mid', mid);

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
      max_label: maxLabel,
      mid: mid,
      mid_label: midLabel,
      min: 0,
      after_label: afterLabel,
      cordinates: cordinates().graphArea,
      x_label_area: cordinates().xArea,
      y_label_area: cordinates().yArea,
      x_amount: amountOfXs,
      x_cordinates: xCordinates,
      unique_colors: [...new Set(collectedColors.flat())],
    };
  }

  /**
   * @param {array} array - Go over the array and use the data to generate new data
   */
  set upgradedData(array) {
    this.core.data = array.map( obj => {
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
      obj.y_cordinates = obj.values.map(value => this.turnToTwoDigits((this.core.max - value) * (this.core.cordinates.y / this.core.max)));
      while(obj.y_cordinates.length !== this.core.x_amount) {
        obj.y_cordinates.push(obj.y_cordinates[obj.y_cordinates.length - 1]);
      }

      return obj;
    });
  }

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
          'stop-opacity': 0.2
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

  createPaths(data, parentLoopIndex, addFilled = true) {
    console.log(data)
    //var yCordinates = dataObject.values;
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    var Ys = data.y_cordinates;
    var string = '';

    var wavy = (xObj,i) => {
      if (i === 0) {
        string += `M ${xObj.x} ${Ys[i]}`;
      } else {
        string += ` S ${xObj.x2} ${Ys[i]}, ${xObj.x} ${Ys[i]}`;
      }
    };
    var spikey = (xObj,i) => { string += `${i === 0 ? 'M' : 'L'} ${xObj.x} ${Ys[i]}`};

    switch(this.layout) {
      case 'wavy':
        this.core.x_cordinates.forEach((x,i) => wavy(x,i));
        break;
      case 'spikey':
        this.core.x_cordinates.forEach((x,i) => spikey(x,i));
        break;
    }

    var colorIndex = parentLoopIndex % (this.buildInColors.fill.length - 1);
    var strokeColor = (data.colors || {}).outline || this.buildInColors.fill[colorIndex];
    var fillColor = this.buildInColors.fill[colorIndex];


    if (data.hasOwnProperty('colors')) {
      if (data.colors.hasOwnProperty('fill')) {
        fillColor = typeof data.colors.fill === 'string' ? data.colors.fill : data.colors.fill[0];
      }
    }

    path.setAttribute('d', string);
    path.setAttribute('stroke', strokeColor);
    path.setAttribute('fill', 'transparent');
    path.setAttribute('stroke-width', '2px');

    if (!addFilled) return [path];
    console.log(this.core.cordinates)
    string += ` L ${this.nodeData.width} ${this.core.cordinates.y} L ${this.core.cordinates.x} ${this.core.cordinates.y} Z`;
    var filledPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    filledPath.setAttribute('d', string);
    filledPath.setAttribute('fill', `url(#gradient-color-${fillColor.replace('#','')})`);
    filledPath.setAttribute('stroke', 'transparent');
    return [filledPath, path];
  }

  addLabels() {
    var cordinates = [0, this.core.cordinates.y / 2, this.core.cordinates.y];
    var baseline = ['hanging','middle','auto'];
    [this.core.max_label,this.core.mid_label, this.core.min].forEach((nr,i) => {
      var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      //text.setAttribute('inline-size',this.core.x_label_area.width + 'px');
      text.setAttribute('text-anchor', 'start');
      text.style.inlineSize = this.core.x_label_area.width + 'px';
      text.setAttribute('x', 0);
      text.setAttribute('y',cordinates[i]);
      text.setAttribute('dominant-baseline', baseline[i]);
      text.textContent = nr;
      this.svg.appendChild(text);
    });

    // Y labels 
    // Simple one for now
    console.log(this.core.x_amount)
    for (let i = 0; i < this.core.x_amount; i++) {
      var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = i;
      text.setAttribute('x', this.core.x_cordinates[i].x);
      text.setAttribute('y', this.nodeData.height);
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('dominant-baseline', 'auto');
      this.svg.appendChild(text);
    }

  }

  addCherries() {

  }

  buildSVG() {
    var graphGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    graphGroup.id = 'graphGroup';
    this.core.data.forEach((dataObj,i) => graphGroup.append(...this.createPaths(dataObj,i)));
    
    // CLipping path
    this.svg.innerHTML += `<clipPath id="graph-clip-path">
      <rect y="0" x="${this.core.cordinates.x}" width="${this.nodeData.width - this.core.cordinates.x}" height="${this.core.cordinates.y}" />
    </clipPath>`;

    graphGroup.setAttribute('clip-path', 'url(#graph-clip-path)');


    this.addLabels();
    this.svg.append(this.buildGradients(), graphGroup);
  }
  
  connectedCallback() {
    // Startup
    this.mapAttributes = this.collectAllAttributes;
    this.shadowRoot.innerHTML += `
      <svg viewBox="0 0 ${this.settings.width} ${this.settings.height}" xmlns="http://www.w3.org/2000/svg" width="${this.settings.width}" height="${this.settings.height}" id="svg"></svg>
    `;
    this.svg = this.shadowRoot.querySelector('#svg');

    console.log(this.JSONData)
    //this.shadowRoot.appendChild(this._template().content.cloneNode(true));
    //this.coreData = this.data;
    //this.upgradedData = this.data;

    //this.buildSVG();

    //console.log("Core", this.core)
    //console.log("Up Data", this.core.data)
  }
}

customElements.define('aenother-infograph', Infograph);