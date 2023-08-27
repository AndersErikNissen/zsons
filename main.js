"use strict";

class Infograph extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
      <style>
      :host {
        width: 100%;
        height: 100%;
        display: block;

        /* Variables */
        --animation-timing: 0.3s ease-in;
      }

      #svg {
        
      }
      
      text {
        font-size: 16px;
        font-family: sans-serif;
      }

      path {
        stroke-color: black;
      }

      .yarn-group circle {
        transition: r var(--animation-timing), transform var(--animation-timing);
        transform: translateY(var(--yarn-peak));
      }

      .yarn-group circle,
      .yarn-group text,
      .yarn-group path {
        pointer-events: none;
      }

      .yarn-hoverStripe {
        cursor: pointer;
      }

      .yarn-hoverStripe:hover ~ circle {
        r: var(--hover-circle);
      }
      
      .yarn-valueLabel {
        opacity: 0;
        transition: opacity var(--animation-timing);
      }

      .yarn-hoverStripe:hover ~ .yarn-valueLabel {
        opacity: 1;
      }
      
      </style>
      
      <slot id="form" name="form"></slot>
      <slot id="json" name="json"></slot>
    `;
  }

  // Utility functions
  round(nr) {return Math.round((nr * Math.pow(10, 2)) * (1 + Number.EPSILON)) / Math.pow(10, 2);}
  setAttributes(el, attrs) { Object.keys(attrs).forEach(key => el.setAttribute(key, attrs[key])); }
  createElement(elementType, attrs = {}, content) {
    var element = document.createElementNS('http://www.w3.org/2000/svg', elementType);
    this.setAttributes(element, attrs);
    if (content) element.textContent = content;
    return element;
  }
  createElementStack(elementTypeArray, attributeObjectArray, contentArray = []) {
    var elementArray = [];
    // Create backwards array of elements (Setting all the given attributes)
    for(let i = (elementTypeArray.length - 1); i > -1; i--) { 
      var element = document.createElementNS('http://www.w3.org/2000/svg', elementTypeArray[i]); 
      element.textContent = contentArray[i];
      Object.keys(attributeObjectArray[i]).forEach(key => element.setAttribute(key, attributeObjectArray[i][key])); 
      elementArray.push(element); }
    // Append element 1 to 2, 2 to 3 etc
    elementArray.forEach((element,i) => { if (i !== (elementArray.length - 1)) elementArray[i + 1].appendChild(element) }); 
    return elementArray[elementArray.length - 1]; // Return the furthest out element
  }
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

  get getCore() {
    const LIST_OF_CORES = {
      default: {
        sizes: {
          details: /** Used for visual elements like circles */ 10,
          dynamicSpacing: /** Use static/dynamic spacing */ 0.05,
        },
        colors: {
          main: /** Used for things like fonts */ '#000',
          secondary: '#D90368',
          list: ["#F0FAF0","#D1F0D1","#B2E6B2","#93DC93","#74D274","#56C856","#3CB93C","#329A32","#287B28","#1E5C1E"],
        },
      }
    }
    let coreAttribute = this.hasAttribute('core') ? this.getAttribute('core').toLowerCase() : 'default';
    return Object.entries(LIST_OF_CORES).find(key => key === coreAttribute) ? LIST_OF_CORES[coreAttribute] : LIST_OF_CORES.default;
  }

  get collectAllAttributes() {
    if (this.hasAttributes()) {
      var 
        allowedTypes = ['river','mountain','tower','yarn'],
        hasAllowedType = allowedTypes.find(type => type === this.getAttribute('type').toLowerCase());

      return {
        ...(hasAllowedType && { type: this.getAttribute('type') }),
        use_labels: this.hasAttribute('labels') ? true : false,
        value_label: this.hasAttribute('value-label') ? this.getAttribute('value-label') : '',
        vertical_labels: this.getAttribute('labels').toLowerCase() === 'vertical' ? true : false,
        aspect: isNaN(Number(this.getAttribute('aspect'))) ? false : Number(this.getAttribute('aspect')),
        format_labels: this.hasAttribute('format-labels') ? true : false,
      }
    }
    return {};
  }

  /**
   * @param {object} attributes - All the attributes from the element.
   */
  set mapAttributes(attributes) {
    // Add missing default settings
    var defaultSettings = { type: 'river', use_labels: false, vertical_labels: false, aspect: false, theme: 'default', format_labels: false, value_label: '' }
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
    var containerPadding = this.core.sizes.staticSpacing && {x: this.core.sizes.staticSpacing, y: this.core.sizes.staticSpacing } || this.core.sizes.dynamicSpacing && {x: this.settings.width * this.core.sizes.dynamicSpacing, y: this.settings.height * this.core.sizes.dynamicSpacing } || {x: 0, y: 0};

    // Left label area
    var leftWidth = this.settings.use_labels && Math.ceil(Math.max.apply(null, leftRulers.map(rect => rect.width))) || 0;
    var leftHeight = this.settings.use_labels && Math.ceil(Math.max.apply(null, leftRulers.map(rect => rect[ this.settings.vertical_labels ? 'width' : 'height' ]))) || 0;
    var leftX = containerPadding.x;
    var leftY = containerPadding.y;
    
    // Bottom label area
    var bottomHeight = this.settings.use_labels && Math.ceil(bottomRuler[ this.settings.vertical_labels ? 'width' : 'height' ]) || 0; // Use width if labels will be displayed vertically.
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

    /* Clean up the rulers */ this.svg.innerHTML = '';
  }

  /** @param {array} data - List of data to gather information from */
  set buildData(data) {
    var ceilingValue = this.getCeilingValue(data).ceiling_value;

    // For each value get the percentage based on the ceiling value
    data.forEach(obj => obj.percentage_values = obj.values.map(value => this.round((value / ceilingValue) * 100)));
    
    var amountOfValues = Math.max.apply(null, data.map(obj => obj.amount_of_values));

    var labelsLeft = { heighest: this.valueFormatter(ceilingValue) + ' ' + this.settings.value_label, middle: this.valueFormatter(ceilingValue / 2) + ' ' + this.settings.value_label }; 
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
    var graphHeight = this.settings.height - topHeight - this.cordinates.padding.y - this.cordinates.bottom.height - this.cordinates.padding.y;
    var graphBottom = topHeight + graphHeight;
    var stripeWidth = this.settings.width / data.amount_of_values;


    /**
     * #######################
     * LAV STOR TOTAL VALUE!!!
     * #######################
     */

    data.values.forEach((value,i) => {
      var x = (stripeWidth * i) + (stripeWidth / 2);
      var cordinateFromPercentage = (graphHeight / 100) * percentageValues[i];
      var valueLabel = this.valueFormatter(value) + ' ' + this.settings.value_label;
      var valueLabelY = graphBottom - cordinateFromPercentage - this.cordinates.padding.y;
      var bottomLabel = this.settings.use_labels && this.settings.labels.bottom[i];
      var bottomLabelY = graphBottom + this.cordinates.padding.y;
      
      var group = this.createElement('g', { 'class': 'yarn-group' });
      /* Hover stripe */ group.appendChild(this.createElement('rect', { 'class': 'yarn-hoverStripe', 'fill': 'transparent', 'y': 0, 'x': x - this.core.sizes.details, 'width': this.core.sizes.details * 2, 'height': this.settings.height }));
      
      if (this.settings.vertical_labels && this.settings.use_labels) {
        // Bottom label
        group.append(this.createElementStack(['defs','path'], [{},{ 'd': `M ${x} ${this.settings.height} V ${bottomLabelY}`, 'id': 'label-path-' + i}]));
        group.append(this.createElementStack(['text','textPath'], [{},{ 'fill': this.core.colors.main, 'dominant-baseline': 'central', 'text-anchor': 'end', 'startOffset': '100%', 'href': '#label-path-' + i }], ['', bottomLabel]));
        
        // Value label
        group.append(this.createElement('text', { 'class': 'yarn-valueLabel', 'fill': this.core.colors.main, 'dominant-baseline': 'central', 'transform': `rotate( -90 ${x} ${valueLabelY})`, 'x': x, 'y': valueLabelY }, valueLabel));
      } else if (this.settings.use_labels) {
        /* Bottom label */ group.append(this.createElement('text', { 'fill': this.core.colors.main, 'x': x, 'y': bottomLabelY, 'text-anchor': 'middle', 'dominant-baseline': 'hanging' }, bottomLabel))
        /* Value label */ group.append(this.createElement('text', { 'class': 'yarn-valueLabel', 'fill': this.core.colors.main, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'x': x, 'y': valueLabelY }, valueLabel));
      }

      group.appendChild(this.createElement('circle', { 'fill': this.core.colors.secondary, 'style': '--yarn-peak:-' + cordinateFromPercentage + 'px;--hover-circle:' + (this.core.sizes.details * 1.2) + 'px;', 'cx': x, 'cy': graphBottom, 'r': this.core.sizes.details }))
      group.appendChild(this.createElement('path', { 'stroke': this.core.colors.secondary, 'd': 'M ' + x + ' ' +graphBottom + ' v -' + cordinateFromPercentage, 'stroke-dasharray': '0%', 'stroke-dashoffset': '0%', 'stroke-width': '1', 'fill': 'none' }));

      this.svg.appendChild(group);
    });
  }
  
  connectedCallback() {
    // Startup
    this.mapAttributes = this.collectAllAttributes;
    this.core = this.getCore;
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
