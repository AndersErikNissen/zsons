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

      #svg {
        background-color: red;
      }
      
      text {
        font-size: 16px;
        font-family: sans-serif;
      }

      path {
        stroke-color: black;
      }

      .yarn-group circle {
        transition: r 0.3s ease-in, transform 0.3s ease-in;
        transform: translateY(var(--yarn-peak));
      }

      .yarn-group:hover circle {
        r: 12px;
      }

      .yarn-value,
      .yarn-label {
        transform: translate(100%, -50%) rotate(-90deg);
        dominant-baseline: middle;
      }

      </style>
      
      <slot id="form" name="form"></slot>
      <slot id="json" name="json"></slot>
    `;
  }

  // Utility functions
  round(nr) {return Math.round((nr * Math.pow(10, 2)) * (1 + Number.EPSILON)) / Math.pow(10, 2);}
  setAttributes(el, attrs) { Object.keys(attrs).forEach(key => el.setAttribute(key, attrs[key])); }
  valueFormatter = nr => { 
    // Depending on length of label return a different format
    if (!this.settings.format_labels) return nr;
    switch(Number(String(nr).length)) { 
      case 1: case 2: case 3: return nr; 
      case 4: case 5: case 6: return nr / 1E3 + 'K'; 
      case 7: case 8: case 9: return nr / 1E6 + 'M'; 
      default: return nr / 1E9 + 'B' } 
  };
  getCeilingValue(data) {
    // Get heighest value and ceiling value
    var heighstValueName = this.settings.type && this.settings.type === 'tower' && 'heighest_combined_value' || 'heighest_value';
    var heighestValue = Math.max.apply(null,data.map(obj => obj[heighstValueName]));
    // Create ceilingValue
    var aTenth = Math.pow(10, Number(String(heighestValue).length)) / 10;
    var ceilingValue = aTenth;
    while (ceilingValue % heighestValue === ceilingValue) { ceilingValue += aTenth };
    // Add overhead if too close
    if (ceilingValue === heighestValue || (ceilingValue - (aTenth / 4)) <= heighestValue) ceilingValue += aTenth;
    
    return { ceiling_value: ceilingValue, heighest_value: heighestValue };
  }

  get collectAllAttributes() {
    if (this.hasAttributes()) {
      var 
        allowedTypes = ['river','mountain','tower','yarn'],
        hasAllowedType = allowedTypes.find(type => type === this.getAttribute('type').toLowerCase()),
        hasAllowedTheme = this.hasAttribute('theme') && this.themes.hasOwnProperty((this.getAttribute('theme').toLowerCase()));

      return {
        ...(hasAllowedType && { type: this.getAttribute('type') }),
        ...(hasAllowedTheme && { theme: this.getAttribute('theme').toLowerCase() }),
        use_labels: this.hasAttribute('labels') ? this.getAttribute('labels').toLowerCase() : false,
        aspect: isNaN(Number(this.getAttribute('aspect'))) ? false : Number(this.getAttribute('aspect')),
        format_labels: this.hasAttribute('format-labels') ? true : false
      }
    }
    return {};
  }

  /**
   * @param {object} attributes - All the attributes from the element.
   */
  set mapAttributes(attributes) {
    // Add missing default settings
    var defaultSettings = { type: 'river', use_labels: false, aspect: false, theme: 'default', format_labels: false }
    for (const key in defaultSettings) { if(attributes[key]) defaultSettings[key] = attributes[key] };

    // Info from Custom Element
    var rect = this.getBoundingClientRect();
    defaultSettings.width = rect.width;
    defaultSettings.height = defaultSettings.aspect ? rect.width * defaultSettings.aspect : rect.height;

    this.settings = defaultSettings;
  }

  validateData(obj) {
    var 
      label = obj.label && typeof obj.label === 'string' && obj.label,
      labels = obj.labels && Array.isArray(obj.labels) && !obj.labels.some(label => typeof label !== 'string') && obj.labels,
      validatedValues = obj.values && obj.values.filter(value => isNaN(Number(value)) ? false : Number(value)),
      values = validatedValues && Array.isArray(obj.values) && validatedValues.length > 0 && validatedValues,
      heighestValue = values && Math.max.apply(null, values) || false,
      combinedValues = values && values.reduce((accumulation, current) => accumulation + current) || false,
      amountOfValues = values && values.length || false,
      amountOfLabels = labels && labels.length || false;

    // Only allow one type of label/labels  
    if (labels && label) label = false;

    var validated = {
      ...(label && { label: label}),
      ...(labels && { labels: labels}),
      ...(values && { values: values }),
      ...(heighestValue && { heighest_value: heighestValue }),
      ...(combinedValues && { heighest_combined_value: combinedValues }),
      ...(amountOfValues && { amount_of_values: amountOfValues }),
      ...(amountOfLabels && { amount_of_labels: amountOfLabels })
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

    var validatedJSON = parsedJSON.map(dataObj => this.validateData(dataObj));

    return validatedJSON.length > 0 ? validatedJSON : [];
  }

  buildSVGAreas(leftLabels = [], bottomLabel = false) {
    var leftRulers = leftLabels.map(label => this.svg.appendChild(Object.assign(document.createElementNS('http://www.w3.org/2000/svg','text'), { textContent: label })).getBBox());
    var bottomRuler = bottomLabel && this.svg.appendChild(Object.assign(document.createElementNS('http://www.w3.org/2000/svg','text'), { textContent: bottomLabel })).getBBox() || { width: 0, height: 0 };
    // General rules
    var paddingAmount = 0.05;
    var containerPadding = {x: this.settings.width * paddingAmount, y: this.settings.height * paddingAmount};

    // Left label area
    var leftWidth = this.settings.use_labels && Math.ceil(Math.max.apply(null, leftRulers.map(rect => rect.width))) || 0;
    var leftHeight = this.settings.use_labels && Math.ceil(Math.max.apply(null, leftRulers.map(rect => rect[ this.settings.use_labels === 'vertical' ? 'width' : 'height' ]))) || 0;
    var leftX = containerPadding.x;
    var leftY = containerPadding.y;
    
    // Bottom label area
    var bottomHeight = this.settings.use_labels && Math.ceil(bottomRuler[ this.settings.use_labels === 'vertical' ? 'width' : 'height' ]) || 0; // Use width if labels will be displayed vertically.
    var bottomWidth = this.settings.width - (containerPadding.x * 2);
    var bottomY = this.settings.height - bottomHeight - containerPadding.y;
    var bottomX = containerPadding.x;
    
    // Graph area
    var graphX = leftWidth + containerPadding.x + (leftWidth > 0 ? containerPadding.x : 0);
    var graphY = containerPadding.y;
    var graphWidth = this.settings.width - graphX - containerPadding.x;
    var graphHeight = this.settings.height - bottomHeight - (containerPadding.y * this.settings.use_labels ? 3 : 2);

    this.cordinates = {
      padding: containerPadding,
      left: { x: leftX, y: leftY, width: leftWidth, height: leftHeight },
      bottom: { x: bottomX, y: bottomY, width: bottomWidth, height: bottomHeight },
      graph: { x: graphX, y: graphY, width: graphWidth, height: graphHeight }
    };

    this.svg.innerHTML = ''; // Clean up the rulers
  }

  /**
   * @param {array} data - List of data to gather information from
   */
  set buildData(data) {
    var ceilingValue = this.getCeilingValue(data).ceiling_value;

    // For each value get the percentage based on the ceiling value
    data.forEach(obj => obj.percentage_values = obj.values.map(value => this.round((value / ceilingValue) * 100)));
    
    var amountOfValues = Math.max.apply(null, data.map(obj => obj.amount_of_values));

    var labelsLeft = { heighest: this.valueFormatter(ceilingValue), middle: this.valueFormatter(ceilingValue / 2) }; 
    // Longest bottom label 
    var allBottomLabelLengths = data.map(obj => obj.label ? obj.label.length : obj.labels ? obj.labels.map(label => label.length) : []).flat();
    var allBottomLabels = data.map(obj => obj.label ? obj.label : obj.labels ? obj.labels.map(label => label) : []).flat();
    var longestBottomLabel = Math.max.apply(null, allBottomLabelLengths);
    var bottomLabel = allBottomLabels.find(label => label.length === longestBottomLabel);
    
    this.buildSVGAreas([labelsLeft.heighest, labelsLeft.middle], bottomLabel);
    this.data = data;

    // Adding settings created from the data provided
    Object.assign(this.settings, {
      heighest_value: this.getCeilingValue(data).heighest_value,
      amount_of_values: amountOfValues,
      ceiling: ceilingValue,
      labels: {
        left: labelsLeft,
        bottom: [...new Set(data.map(obj => obj.label || obj.labels || [] ).flat())]
      }
    });
  }

  buildYarns() {
    var data = this.data[0];
    var ceilingValue = this.getCeilingValue([data]).ceiling_value;
    var percentageValues = data.values.map(value => (value / ceilingValue) * 100);
    var topHeight = this.cordinates.padding.y + this.cordinates.left.height;
    var graphHeight = this.settings.height - topHeight - this.cordinates.padding.y - this.cordinates.bottom.height;
    var graphBottom = topHeight + graphHeight;
    var stripeWidth = this.settings.width / data.amount_of_values;

    // For testing
    this.svg.innerHTML = `
      <rect y="${topHeight}" class="test" style="fill: pink; opacity: 0.5;" height="${graphHeight}" width="${this.settings.width}" />
      <rect y="${this.cordinates.padding.y}" class="test" style="fill: green; opacity: 0.5;" height="${this.cordinates.left.height}" width="${this.settings.width}" />
      <rect y="${graphBottom + this.cordinates.padding.y}" class="test" style="fill: purple; opacity: 0.5;" height="${this.cordinates.bottom.height}" width="${this.settings.width}" />
    `;

    data.values.forEach((value,i) => {
      var x = (stripeWidth * i) + (stripeWidth / 2);
      var cordinateFromPercentage = (graphHeight / 100) * percentageValues[i];
      var peakY = topHeight + cordinateFromPercentage;
      var bottomLabel = this.settings.use_labels && this.settings.labels.bottom[i];

      this.svg.innerHTML += `
        <g class="yarn-group">
          <text class="yarn-value" x="${x}" y="${peakY - (this.cordinates.padding.y / 2)}">${this.valueFormatter(value)}</text>
          <circle style="--yarn-peak:-${cordinateFromPercentage}px;" cx="${x}" cy="${graphBottom}" r="8" />
          <path d="M ${x} ${graphBottom} v -${cordinateFromPercentage}" 
            stroke-dasharray="0%"
            stroke-dashoffset="0%"
            stroke-width="1"
            stroke="black"
          />
          ${bottomLabel ? `<text class="yarn-label" x="${x}" y="${graphBottom + this.cordinates.padding.y}">${bottomLabel}</text>` : ''}
        </g>
      `;
    });
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
      <svg id="svg" viewBox="0 0 ${this.settings.width} ${this.settings.height}" xmlns="http://www.w3.org/2000/svg" width="${this.settings.width}" height="${this.settings.height}"></svg>
    `;
    this.svg = this.shadowRoot.querySelector('#svg');

    this.buildData = this.JSONData;

    this.buildYarns();

    console.log("%c this.data ","color: blue; background-color: orange",this.data)
    console.log("%c this.settings ","color: white; background-color: grey",this.settings)
    //this.shadowRoot.appendChild(this._template().content.cloneNode(true));
    //this.coreData = this.data;
    //this.upgradedData = this.data;

    //this.buildSVG();

    //console.log("Core", this.core)
    //console.log("Up Data", this.core.data)
  }
}

customElements.define('aenother-infograph', Infograph);