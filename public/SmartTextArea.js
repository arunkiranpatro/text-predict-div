var SmartTextArea = (function() {
    /* Private variables */
    var _timer,
       _smartTextArea, /*Current Text Element */
       _charCounterSpanEle, /* span.char-counter-value  - character counter node*/
       _predictTextSpanEle, /* span.predict-text - predict node */
       _predictText = "",
       _currentText = "",
       _maxCharacters = 0,
       _charactersLeft = 0,
       _predictTextLength = 0,
       _currentTextLength = 0;
 
    /* Private functions */
    var _updateElement = function(node) {
       _smartTextArea = _predictTextSpanEle = _charCounterSpanEle = null;
       _maxCharacters = _currentTextLength = _predictTextLength = _charactersLeft = 0;
       _predictText = _currentText = "";
       if (node) {
          _smartTextArea = node;
          _predictTextSpanEle = _smartTextArea.querySelector('span.predict-text');
          _maxCharacters = _smartTextArea.getAttribute('data-maxchars');
          _maxCharacters = parseInt(_maxCharacters)
          _currentText = _smartTextArea.textContent;
          _currentTextLength = parseInt(_currentText.length);
          if (_predictTextSpanEle) {
             _predictText = _predictTextSpanEle.textContent;
             _predictTextLength = parseInt(_predictText.length);
          }
          if (_maxCharacters) {
             _charCounterSpanEle = _smartTextArea.parentNode.querySelector('span.char-counter-value');
             if (_charCounterSpanEle) {
                _charactersLeft = _maxCharacters - _currentTextLength + _predictTextLength;
                _charactersLeft = parseInt(_charactersLeft);
             }
          }
       }
    };
    /* Displays predicted text*/
    var _displayPrediction = function(resultJSON) {
       /*removes previous predictions */
       _removePredictHtmlElement(_predictTextSpanEle);
       _predictTextSpanEle = document.createElement('span');
       _predictTextSpanEle.classList.add('predict-text');
       _predictTextSpanEle.contentEditable = false;
       /* assign response text from the service*/
       var num_predictions = parseInt(resultJSON.num_predictions);
       if (num_predictions === 1 ){
         _predictTextSpanEle.innerHTML = resultJSON.predictions[0];
       } 
       var tempPredictText = _predictTextSpanEle.textContent;
       var tempPredictTextLength = tempPredictText.length;
       if (_maxCharacters) {
          if (parseInt(tempPredictTextLength) >= parseInt(_charactersLeft)) {
             return false;
          }
       }
       var currTarget = _getCurrentTarget(_smartTextArea);
       currTarget.appendChild(_predictTextSpanEle);
       _updateElement(_smartTextArea);
 
 
    };
 
    /* Gets predicted text from the service */
    var _getPredictions = function(event) {
       var paramsObj = {
          "input": _smartTextArea.textContent,
          "multiple_predictions":false
       }
       var paramsStr = JSON.stringify(paramsObj);
       var successCallback = function(res) {
          _displayPrediction(res);
       }
       var failureCallback = function(resultJSON) {
          console.log("Error getting the result JSON " + resultJSON);
       }
       $.ajax({
         async: true,
         type: "POST",
         url: "/predict",
         data: paramsStr,
         contentType: "application/json; charset=utf-8",
         dataType: "json",
         success: successCallback
     });
    };
 
    /* removes existing predicted span elements*/
    var _removePredictHtmlElement = function(node) {
       /*Check if span.predict-text exists*/
       if (node)
          node.remove();
       _updateCounter(_smartTextArea);
    };
 
    /* creates range element to help focus*/
    var _createRange = function(node, chars, range) {
       if (!range) {
          range = document.createRange()
          range.selectNode(node);
          range.setStart(node, 0);
       }
       if (chars.count === 0) {
          range.setEnd(node, chars.count);
       } else if (node && chars.count > 0) {
          if (node.nodeType === Node.TEXT_NODE) {
             if (node.textContent.length < chars.count) {
                chars.count -= node.textContent.length;
             } else {
                range.setEnd(node, chars.count);
                chars.count = 0;
             }
          } else {
             for (var lp = 0; lp < node.childNodes.length; lp++) {
                range = _createRange(node.childNodes[lp], chars, range);
                if (chars.count === 0) {
                   break;
                }
             }
          }
       }
       return range;
    };
 
    /* Sets focus to end */
    var _focusToEnd = function(node) {
       var selection = window.getSelection();
       var range = _createRange(node.parentNode, {
          count: node.textContent.length
       });
       if (range) {
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
       }
    };
 
    /* Copies typed text to hidden element */
    var _copyTextToHidden = function(node) {
       var inputHiddenEle = node.parentNode.querySelector('input.pp-text-predictor-value');
       inputHiddenEle.value = _currentText.trim();
    };
 
    var _getCaretPosition = function(node) {
       var range = window.getSelection().getRangeAt(0);
       var preCaretRange = range.cloneRange();
       preCaretRange.selectNodeContents(node);
       preCaretRange.setEnd(range.endContainer, range.endOffset);
       var caretOffset = preCaretRange.toString().length;
       return caretOffset;
    };
 
    var _getCurrentTarget = function(node) {
       var currRange = window.getSelection().getRangeAt(0);
       var currTarget = currRange.startContainer.parentElement;
       return currTarget;
    };
 
    var _disableCtrlKey = function(event) {
       if (event.ctrlKey || event.metaKey) {
          switch (event.keyCode) {
             case 66: //ctrl+B or ctrl+b
             case 98:
                event.preventDefault();
                break;
             case 73: //ctrl+I or ctrl+i
             case 105:
                event.preventDefault();
                break;
             case 85: //ctrl+U or ctrl+u
             case 117:
                event.preventDefault();
                break;
          }
       }
    };
 
    var _updateCounter = function(node) {
       _updateElement(node);
       if (_charCounterSpanEle) {
          _charCounterSpanEle.innerHTML = _charactersLeft;
       }
 
    }
 
    return {
       // A public variable
       // A public function utilizing privates
 
       init: function(node) {
 
          _updateElement(node);
 
       },
 
       /* Called on keydown */
       predictText: function(event) {
          var caretPosition,
             currTarget,
             tempPredictText,
             tempPredictTextLength,
             currTargetText;
 
          this.init(event.target);
 
          /* if user is typing the same text in predicted text do nothing*/
          if (_predictText !== "" && event.key === _predictText.charAt(0)) {
             _predictTextSpanEle.innerHTML = _predictText.substring(1);
             this.updateCharCounter(event);
             return false;
          }
          switch (event.keyCode) {
             case 32:
                /*Key code for space*/
                /*remove existing prediction*/
                _removePredictHtmlElement(_predictTextSpanEle);
                this.updateCharCounter(event);
                /*Get cursor position*/
                caretPosition = _getCaretPosition(_smartTextArea);
                /*Predict only at end of sentence*/
                if (_currentText.length > 0 && caretPosition >= _currentText.length) {
                   if (_timer) {
                      clearTimeout(_timer);
                      _timer = setTimeout(function() {
                         _getPredictions(event);
                         _timer = void 0;
                      }, 300);
                   } else {
                      _getPredictions(event);
                      _timer = setTimeout(function() {
                         _timer = void 0;
                      }, 300);
                   }
 
                }
                break;
             case 39:
             case 9:
                /*Key code for tab*/
                if (_predictTextSpanEle) {
                   tempPredictText = _predictTextSpanEle.textContent;
                   tempPredictTextLength = parseInt(tempPredictText.length);
                   if (_maxCharacters) {
                      if (tempPredictTextLength >= _charactersLeft) {
                         event.preventDefault();
                         return false;
                      }
 
                   }
                   _removePredictHtmlElement(_predictTextSpanEle);
                   currTarget = _getCurrentTarget(_smartTextArea);
                   currTargetText = currTarget.textContent;
                   currTarget.innerHTML = currTargetText + tempPredictText;
                   /*Move the cursor to the last*/
                   _focusToEnd(_smartTextArea);
                   this.updateCharCounter(event);
                   /* prevent tab to focus next elment*/
                   event.preventDefault();
 
                }
                break;
             case 20:
                /*Key code for capslock*/
                break;
             case 16:
                /*Key code for shift*/
                break;
             case 13:
                /*key code for enter*/
                _removePredictHtmlElement(_predictTextSpanEle);
                event.preventDefault();
                break;
             default:
                /* remove span elements*/
                _removePredictHtmlElement(_predictTextSpanEle);
                _disableCtrlKey(event);
                this.updateCharCounter(event);
          }
 
       },
 
       /* Called on blur */
       copyTextToHidden: function(event) {
          this.init(event.target);
          if (_smartTextArea) {
             _removePredictHtmlElement(_predictTextSpanEle);
             _copyTextToHidden(_smartTextArea);
          }
       },
 
       /* called on keyup*/
       updateCharCounter: function(event) {
          var keycode = event.keyCode;
          var printable =
             (keycode > 47 && keycode < 58) || // number keys
             keycode === 32 || keycode === 13 || // spacebar & return key(s) (if you want to allow carriage returns)
             (keycode > 64 && keycode < 91) || // letter keys
             (keycode > 95 && keycode < 112) || // numpad keys
             (keycode > 185 && keycode < 193) || // ;=,-./` (in order)
             (keycode > 218 && keycode < 223); // [\]' (in order)
          _updateCounter(event.target);
          if (_maxCharacters) {
            _charCounterSpanEle.parentNode.classList.remove("warning");
             if (printable && !(event.ctrlKey || event.metaKey) && _charactersLeft <= 0) {
                event.preventDefault();
                _charCounterSpanEle.parentNode.classList.add("warning");
             }
          }
 
       }
    };
 })();