// Create data from <form>
var formNode = this.shadowRoot.querySelector('#form').assignedNodes()[0];
if (formNode && formNode.tagName !== 'FORM') formNode = false;

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

  // Data validation
  var data = () => {
    var data = [];
    var validJSON = false;
    
    var jsonNode = this.shadowRoot.querySelector('#json').assignedNodes()[0];
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
    
    return data.length > 0 ? data : false;
  }
