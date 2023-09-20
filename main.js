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
        --animation-timing: 0.5s ease-in;
      }

      #svg {
        
      }

      text {
        font-size: 12px;
        font-family: sans-serif;
      }
      @media (min-width: 1024px) {text { font-size: 16px; }}

      .yarn-group circle {
        transition: r var(--animation-timing), transform var(--animation-timing);
      }

      :host([running]) .yarn-group circle {
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
      
      .yarnLine {
        transition: stroke-dashoffset var(--animation-timing);
      }
      
      :host([running]) .yarnLine {
        stroke-dashoffset: 0;
      }

      /* Paths */
      .blink {
        fill: cyan;
        transition: fill 300ms linear;
      }
      


      </style>
      
      <slot id="form" name="form"></slot>
      <slot id="json" name="json"></slot>
    `;
  }

  // Utility functions
  round(nr) {return Math.round((nr * Math.pow(10, 2)) * (1 + Number.EPSILON)) / Math.pow(10, 2);};

  setAttributes(el, attrs) { Object.keys(attrs).forEach(key => el.setAttribute(key, attrs[key])); };

  createElement(elementType, attrs = {}, content) {
    var element = document.createElementNS('http://www.w3.org/2000/svg', elementType);
    this.setAttributes(element, attrs);
    if (content) element.textContent = content;
    return element;
  };

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
  };

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
    if (ceilingValue === heighestValue || aTenth * 8 <= heighestValue) ceilingValue += aTenth * 2;
    
    return { ceiling_value: ceilingValue, heighest_value: heighestValue };
  }

  createGradient = (gradientArray, gradientName, userSpace = false) => {
    let gradientElement = this.createElement('linearGradient', {x1:0, x2:0, y1:0, y2: '100%', id: 'gradientColor-' + gradientName});
    if (userSpace) gradientElement.setAttribute('gradientUnits', 'userSpaceOnUse');
    gradientArray.forEach(gradientObject => gradientElement.appendChild(this.createElement('stop', gradientObject)));
    return gradientElement;
  }

  get getCore() {
    const LIST_OF_CORES = {
      default: {
        sizes: {
          details: /** Used for visual elements like circles */ 9,
          dynamicSpacing: /** Use static/dynamic spacing */ 0.03,
        },
        colors: {
          main: /** Used for things like fonts */ '#000',
          secondary: '#93DC93',
          gradient: [{'stop-color':'#93DC93', 'offset': '0%'},{'stop-color':'#93DC93', 'offset': '100%', 'stop-opacity': 0}],
          gradientName: 'mainGradient',
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
      ...(combinedValues && { combined_value: combinedValues }),
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

  buildSVGAreas(leftLabels = [], bottomLabel = false, combinedValue) {
    var leftRulers = leftLabels.map(label => this.svg.appendChild(Object.assign(document.createElementNS('http://www.w3.org/2000/svg','text'), { textContent: label })).getBBox());
    var bottomRuler = bottomLabel && this.svg.appendChild(Object.assign(document.createElementNS('http://www.w3.org/2000/svg','text'), { textContent: bottomLabel })).getBBox() || { width: 0, height: 0 };
    var containerPadding = this.core.sizes.staticSpacing && {x: this.core.sizes.staticSpacing, y: this.core.sizes.staticSpacing } || this.core.sizes.dynamicSpacing && {x: this.settings.width * this.core.sizes.dynamicSpacing, y: this.settings.height * this.core.sizes.dynamicSpacing } || {x: 0, y: 0};
    
    var combinedValueRuler = this.svg.appendChild( this.createElement('text', { 'style': 'font-size: 12px;' }, combinedValue));
    var combinedValueFontSize = 12;
    
    /* Get the font-size to get the combined value to take up 1/3 of the given space */ 
    while(combinedValueRuler.getBBox().width < (this.settings.width / 3)) { combinedValueFontSize++; combinedValueRuler.style.fontSize = combinedValueFontSize + 'px'; }

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
      combined_value: { font: combinedValueFontSize, width: combinedValueRuler.getBBox().width, height: combinedValueRuler.getBBox().height },
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
    
    var combinedValue = data.map(obj => obj.combined_value).reduce((accumulation, current) =>  accumulation + current );
    var amountOfValues = Math.max.apply(null, data.map(obj => obj.amount_of_values));

    var labelsLeft = { heighest: this.valueFormatter(ceilingValue) + ' ' + this.settings.value_label, middle: this.valueFormatter(ceilingValue / 2) + ' ' + this.settings.value_label }; 
    // Longest bottom label 
    var allBottomLabelLengths = data.map(obj => obj.label ? obj.label.length : obj.labels ? obj.labels.map(label => label.length) : []).flat();
    var allBottomLabels = data.map(obj => obj.label ? obj.label : obj.labels ? obj.labels.map(label => label) : []).flat();
    var longestBottomLabel = Math.max.apply(null, allBottomLabelLengths);
    var bottomLabel = allBottomLabels.find(label => label.length === longestBottomLabel);
    
    this.buildSVGAreas([labelsLeft.heighest, labelsLeft.middle], bottomLabel, combinedValue);
    this.data = data;

    // Adding settings created from the data provided
    Object.assign(this.settings, {
      heighest_value: this.getCeilingValue(data).heighest_value,
      combined_value: combinedValue,
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
    var combinedValueHeight = this.cordinates.padding.y + this.cordinates.combined_value.height;
    var graphHeight = this.settings.height - this.cordinates.left.height - combinedValueHeight - this.cordinates.padding.y - this.cordinates.bottom.height - this.cordinates.padding.y;
    var graphBottom = this.cordinates.left.height  + combinedValueHeight + graphHeight;
    var stripeWidth = this.settings.width / data.amount_of_values;

    var combineValueDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    var combineValueY = combinedValueHeight * 0.75;
    combineValueDefs.append(
      this.createElement('path', { 'd': `M 0 ${combineValueY} H ${this.cordinates.combined_value.width} ${combineValueY}`, 'id': 'yarnPath-combinedValue' }), 
      this.createElement('path', { 'd': `M ${this.cordinates.combined_value.width + this.cordinates.padding.x} ${combineValueY} H ${this.settings.width} ${combineValueY}`, 'id': 'yarnPath-valueLabel' })
    );
    this.svg.appendChild(combineValueDefs);

    /* Combined value */ this.svg.append(this.createElementStack(['text','textPath'], [{},{ 'style': 'font-size: ' + this.cordinates.combined_value.font + 'px;', 'fill': this.core.colors.main, 'href': '#yarnPath-combinedValue' }], ['', this.settings.combined_value]));
    /* Combined value label */this.svg.append(this.createElementStack(['text','textPath'], [{},{ 'style': 'font-size: ' + (this.cordinates.combined_value.font / 3) + 'px;', 'fill': this.core.colors.main, 'href': '#yarnPath-valueLabel' }], ['', this.settings.value_label]));
    data.values.forEach((value,i) => {
      var x = (stripeWidth * i) + (stripeWidth / 2);
      var cordinateFromPercentage = (graphHeight / 100) * percentageValues[i];
      var valueLabel = this.valueFormatter(value) + ' ' + this.settings.value_label;
      var valueLabelY = graphBottom - cordinateFromPercentage - this.core.sizes.details - this.cordinates.padding.y;
      var bottomLabel = this.settings.use_labels && this.settings.labels.bottom[i];
      var bottomLabelY = graphBottom + this.cordinates.padding.y;
      
      var group = this.createElement('g', { 'class': 'yarn-group' });
      /* Hover stripe */ group.appendChild(this.createElement('rect', { 'class': 'yarn-hoverStripe', 'fill': 'transparent', 'y': combinedValueHeight, 'x': x - this.core.sizes.details, 'width': this.core.sizes.details * 2, 'height': graphHeight + this.cordinates.left.height + this.cordinates.padding.y + this.cordinates.bottom.height }));
      
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
      
      // Graph elements
      group.appendChild(this.createElement('circle', { 'fill': this.core.colors.secondary, 'style': '--yarn-peak:-' + cordinateFromPercentage + 'px;--hover-circle:' + (this.core.sizes.details * 1.2) + 'px;', 'cx': x, 'cy': graphBottom, 'r': this.core.sizes.details }))
      group.appendChild(this.createElement('path', { 'class': 'yarnLine', 'stroke': this.core.colors.secondary, 'd': 'M ' + x + ' ' + graphBottom + ' v -' + cordinateFromPercentage, 'stroke-dasharray': cordinateFromPercentage, 'stroke-dashoffset': cordinateFromPercentage, 'stroke-width': '1', 'fill': 'none' }));

      this.svg.appendChild(group);
    });
  }

  buildPath(type) {
    let 
      animationTiming = 100,
      data = this.data[0],
      ceilingValue = this.getCeilingValue([data]).ceiling_value,
      strokeWidth = 3;
    
      /* Value hover elements */
    let 
      valueTextElements = data.values.map(value => {
        let text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.textContent = value;
        return text;
      }),
      valueTextGroup = this.createElement('g', { style: 'opacity: 0;' })
    valueTextGroup.append(...valueTextElements);
    this.svg.appendChild(valueTextGroup);
    let valueLabelObjects = valueTextElements.map((ele, i) => {
      return {
        value: data.values[i],
        height: Math.ceil(ele.getBBox().height) + 10,
        width: Math.ceil(ele.getBBox().width) + 20,
      }
    });
    valueTextGroup.remove();

    let reserveXSpace = Math.ceil(Math.max.apply(null,valueLabelObjects.map(obj => obj.width)) / 2);

    let
      labelY = this.cordinates.left.height * 1.1,
      graphHeight = this.settings.height - labelY - this.cordinates.padding.y,
      graphWidth = this.settings.width - (reserveXSpace * 2),
      graphXOffset = reserveXSpace,
      graphBottom = labelY + graphHeight - this.core.sizes.details,
      groove = graphWidth / (data.amount_of_values - 1),
      getY = value => graphBottom - ((graphHeight / 100) * ((value / ceilingValue) * 100)),
    
      cordinates = data.values.map((value,i,arr) => {  
        return { 
          x: (i * groove) + graphXOffset, x1: ((Math.max(0, (i - 1)) + 0.4) * groove) + graphXOffset, x2: (Math.max(0, i - 0.4) * groove) + graphXOffset,
          y: getY(value), y1: graphBottom - ((graphHeight / 100) * ((arr[Math.max(0, i - 1)] / ceilingValue) * 100)), y2: getY(value) 
        }
      }),

      mainPathString = cordinates.map((cordinates,i) => [
        i === 0 && 'M' || i === 1 && type === 'river' && 'C' || type === 'river' && 'S' || 'L',
        ...(i == 1 && type === 'river' && [cordinates.x1 + ',' + cordinates.y1] || []),
        ...(i !== 0 && type === 'river' && [cordinates.x2 + ',' + cordinates.y2] || []),
        cordinates.x + ',' + cordinates.y
      ].join(" ")).join(" "),
      mainPathBackgroundString = mainPathString + `L ${graphXOffset + graphWidth},${labelY + graphHeight} L ${graphXOffset},${labelY + graphHeight} Z`; 
    
    this.svg.append(
      this.createElement('path', { d: mainPathBackgroundString, stroke: 'transparent', 'stroke-width': strokeWidth, fill: `url(#gradientColor-${this.core.colors.gradientName})` }),
      this.createElement('path', { d: mainPathString, stroke: this.core.colors.secondary, fill: 'none', 'stroke-width': strokeWidth }),
    );
    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    defs.append(
      this.createGradient(this.core.colors.gradient, this.core.colors.gradientName),
      this.createGradient([{'stop-color': this.core.colors.main, offset: '0%', 'stop-opacity': 1},{'stop-color': this.core.colors.main, offset: '95%', 'stop-opacity': 0}], 'mainStick', true),
    );

    let animationPaths = [];
    for(let i = 0; i < (data.amount_of_values -1); i++) {
      let currentCordinates = cordinates[i];
      let nextCordinates = cordinates[i + 1];
      
      let startAt = 'M ' + currentCordinates.x + ',' + currentCordinates.y;
      let moveTo = ` L ${nextCordinates.x},${nextCordinates.y}`;
      if (type === 'river') moveTo = ` C ${nextCordinates.x1},${nextCordinates.y1} ${nextCordinates.x2},${nextCordinates.y2} ${nextCordinates.x},${nextCordinates.y}`;
      animationPaths.push(this.createElement('path', { d: startAt + moveTo, fill: 'none', stroke: 'none' }));
    }
    
    let 
      animationPathLengths = animationPaths.map(path => path.getTotalLength()),
      animationObjects = animationPaths.map((path,i) => Object.assign({},{ node: path, pathLength: animationPathLengths[i] })),
      mainCircle = this.createElement('circle', { x: 0, y: 0, r: this.core.sizes.details / 2, fill: 'transparent' }),
      secondaryCircle = this.createElement('circle', { x: 0, y: 0, r: (strokeWidth + 1) / 2, fill: 'transparent' }),
      mainStickString = `M 0,${labelY + graphHeight} L 0,${labelY}`,
      mainStick = this.createElement('path', { d: mainStickString, id: 'mainStick', 'stroke-width': 2, stroke: 'transparent', fill: 'none' });

    /* Main valueLabel */
    let
      createTriangleD = (degs,height,x,y) => {
        let corner = Math.tan(degs * (Math.PI / 180)) * height;
        return `M ${x},${y} L ${x - corner},${y - height} L ${x + corner},${y - height} Z`;
      },
      mainLabelText = this.createElement('text', { x: 0, y: 0, fill: 'transparent', 'text-anchor': 'middle', 'dominant-baseline': 'central' }),
      mainLabelRect = this.createElement('rect', { x: 0, y: 0, width: 0, height: 0, fill: 'transparent' }),
      mainLabelTriangle = this.createElement('path', { fill: 'transparent' });
      
    this.svg.append(mainStick, mainCircle, secondaryCircle, ...animationPaths, defs, mainLabelRect, mainLabelTriangle, mainLabelText);

    /* Train station */
    let 
      previousHoverIndex = 0,
      train = Promise.resolve(),
      trainCart = async (currentIndex) => {
        if (currentIndex === previousHoverIndex) return currentIndex;
        let animateLeft = currentIndex < previousHoverIndex;
        let matchingIndex = animateLeft ? currentIndex : currentIndex - 1;
        let { pathLength, node } = animationObjects[matchingIndex];

        let lastTimestamp, animationId;
        let msDistance = pathLength / animationTiming;
        let traversedDistance = 0;

        return await new Promise (resolve => {
          let animation = timestamp => {
            if (traversedDistance === pathLength) {
              cancelAnimationFrame(animationId);
              previousHoverIndex = currentIndex;
              resolve();
            } else {
              if (lastTimestamp === undefined) lastTimestamp = timestamp; /* Set the first timestamp */
              let elapsedTime = timestamp - lastTimestamp;
              let distance = traversedDistance + (elapsedTime * msDistance);
              let cordinates = node.getPointAtLength(animateLeft ? Math.max(0, pathLength - distance) : Math.min(pathLength, distance));
    
              mainCircle.setAttribute('cx', cordinates.x);
              mainCircle.setAttribute('cy', cordinates.y);
              secondaryCircle.setAttribute('cx', cordinates.x);
              secondaryCircle.setAttribute('cy', cordinates.y);
              mainStick.setAttribute('d', `M ${cordinates.x},${labelY + graphHeight} L ${cordinates.x},${cordinates.y}`);

              let valueLabelObject = valueLabelObjects[currentIndex];
              mainLabelText.textContent = valueLabelObject.value;
              this.setAttributes(mainLabelText, { x: cordinates.x, y: cordinates.y - (valueLabelObject.height / 2) - 15 });
              this.setAttributes(mainLabelRect, { x: cordinates.x - (valueLabelObject.width / 2), y: cordinates.y - valueLabelObject.height - 15, ry: valueLabelObject.height / 2, width: valueLabelObject.width, height: valueLabelObject.height });
              mainLabelTriangle.setAttribute('d', createTriangleD(45, 6, cordinates.x,cordinates.y - 10));
    
              traversedDistance = Math.min(distance, pathLength);
              lastTimestamp = timestamp;
    
              animationId = window.requestAnimationFrame(animation);

            }
          }

          window.requestAnimationFrame(animation);
        });
      };

    let hoverArea = this.createElement('rect', { 
      fill: 'transparent', 
      x: 0, y: labelY - this.cordinates.padding.y, 
      width: this.settings.width, height: graphHeight + (this.cordinates.padding.y * 2) 
    });
    hoverArea.addEventListener('mouseleave', () => {
      activeHoverArea = false;
      previousHoverIndex = 0;
      mainCircle.setAttribute('fill', 'transparent');
      mainStick.setAttribute('stroke', 'transparent');
      mainLabelRect.setAttribute('fill', 'transparent');
      mainLabelText.setAttribute('fill', 'transparent');
      mainLabelTriangle.setAttribute('fill', 'transparent');
    });

    let activeHoverArea = false;
    let allHoverGrooves = this.createElement('g', { fill: 'transparent' });
    allHoverGrooves.append(
      ...cordinates.map((crds, i, arr) => {
        let hoverGroove = this.createElement('rect', {
          class: 'hoverGroove',
          x: graphXOffset + (i === 0 ? 0 : groove * i - (groove / 2)),
          y: labelY,
          width: groove / (i === 0 && 2 || i === arr.length - 1 && 2 || 1),
          height: graphHeight,
          fill: 'transparent',
        });

        /* On first hover - Place circle */ 
        hoverGroove.addEventListener('mouseover', () => {
          if (!activeHoverArea) {
            activeHoverArea = true;
            mainStick.setAttribute('d', `M ${crds.x},${labelY + graphHeight} L ${crds.x},${crds.y}`);
            mainStick.setAttribute('stroke', 'url(#gradientColor-mainStick)');

            mainCircle.setAttribute('fill', this.core.colors.main);
            mainCircle.setAttribute('cx', crds.x);
            mainCircle.setAttribute('cy', crds.y);
            secondaryCircle.setAttribute('fill', this.core.colors.secondary);
            secondaryCircle.setAttribute('cx', crds.x);
            secondaryCircle.setAttribute('cy', crds.y);
            mainLabelRect.setAttribute('fill', this.core.colors.main);
            mainLabelText.setAttribute('fill', this.core.colors.secondary);
            
            let valueLabelObject = valueLabelObjects[i];
            mainLabelText.textContent = valueLabelObject.value;
            this.setAttributes(mainLabelText, { fill: this.core.colors.secondary, x: crds.x, y: crds.y - (valueLabelObject.height / 2) - 15 });
            this.setAttributes(mainLabelRect, { fill: this.core.colors.main, x: crds.x - (valueLabelObject.width / 2), y: crds.y - valueLabelObject.height - 15, ry: valueLabelObject.height / 2, width: valueLabelObject.width, height: valueLabelObject.height });
            mainLabelTriangle.setAttribute('fill', this.core.colors.main);
            mainLabelTriangle.setAttribute('d', createTriangleD(45,6,crds.x, crds.y - 10 ));

            previousHoverIndex = i;
            return;
          }

          train = train.then(() => trainCart(i));
        });

        return hoverGroove;
      })
    );
    this.svg.append(hoverArea, allHoverGrooves);
  }

  renderSVGContent() {
    switch(this.settings.type) {
      case 'yarn':
        this.buildYarns()
        break;
      case 'river':
      case 'mountain':
        this.buildPath(this.settings.type)
        break;
    }

    this.setAttribute('running','');
    setTimeout(()=> {
    }, 5000)
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

    this.renderSVGContent();

    console.log("%c this.data ","color: blue; background-color: orange",this.data)
    console.log("%c this.settings ","color: white; background-color: grey",this.settings)
    console.log("%c this.core ","color: white; background-color: red",this.core)
  }
}

customElements.define('aenother-infograph', Infograph);
