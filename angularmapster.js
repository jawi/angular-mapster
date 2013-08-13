'use strict'

var app = angular.module('angularMapster', []);
var ctrl = app.controller('areaCtrl', ['$scope', function ($scope) {
	$scope.hdc = {};
}]);
app.directive('hotspotinteraction', ['$compile', '$timeout', function($compile, $timeout) {
    return {
        restrict : 'E',
        replace : true,
        scope : {},
        transclude : true,
        template : '<div><div class="hotspotinteraction" data-ng-transclude><map id="{{mapId}}" name="{{mapId}}"></map></div><div class="error-message" data-ng-bind="error"></div></div>',
        controller : [ '$scope', '$element', '$attrs', function($scope, $element, $attrs) {
        	$scope.mapId = "map" + new Date().getTime();
        	$scope.hdc = {};

            var generateId = function(prefix) {
            	var id = $scope.elemCount++;
            	return prefix + id;
            }
        	
            var areaDone;

            return {
                hotspotscope : $scope,
                responseid : $attrs.responseidentifier,
                areaDone : areaDone,
                multiple : $attrs.cardinality.toLowerCase() != "single",
                addAreaElement : function(key) {
                    var mapElement = $element.find("map");
                    mapElement.append(key);
                }
            };
        } ],
        link : function(scope, element, attrs, ctrl) { 
            var object = element.find("object");
            var src = object.attr("data");
            var responseid = attrs.responseidentifier;

            var minChoices = parseInt(attrs.minchoices) || 0;
            var maxChoices = parseInt(attrs.maxchoices) || Number.MAX_VALUE;
            maxChoices = (maxChoices == 0) ? Number.MAX_VALUE : maxChoices;

            var replacement = '<img src="' + src + '" usemap="#' + scope.mapId + '" id="img_' + scope.mapId + '"/><canvas id="can_' + scope.mapId + '"></canvas>';
            var compiled = $compile(replacement)(scope);
            // attach an onload() callback on the img tag...
            compiled[0].onload = function() {
            	var can = compiled[1];

        		// place the canvas in front of the image
        		can.style.zIndex = 1;

        		// position it over the image
        		can.style.left = this.offsetLeft + 'px';
        		can.style.top = this.offsetTop + 'px';

        		// make same size as the image
        		can.setAttribute('width', this.clientWidth + 'px');
        		can.setAttribute('height', this.clientHeight + 'px');

        		// get it's context
        		var hdc = can.getContext('2d');

        		// set the 'default' values for the colour/width of fill/stroke operations
        		hdc.fillStyle = 'red';
        		hdc.strokeStyle = 'red';
        		hdc.lineWidth = 4;
        		
        		ctrl.hotspotscope.canvas = can;
        		ctrl.hotspotscope.hdc = hdc;
        		ctrl.hotspotscope.img = compiled[0];
            };
            object.replaceWith(compiled);
        }
    }
}]);
app.directive('hotspotchoice', ['$parse', '$timeout', function($parse, $timeout) {
	return {
        restrict : 'E',
        replace : true,
        scope : {},
        transclude : true,
        template : '<area href="#" data-ng-click="addAnswer()"></area>',
        require : "^hotspotinteraction",
        link : function(scope, element, attrs, ctrl) {
            scope.local = {
                    answer : {}
            };
            ctrl.addAreaElement(element);

            scope.multiple = ctrl.multiple;

            var clicked;
            var initialStart = true

        	var drawPoly = function(coordStr, hdc) {
        		var mCoords = coodStr.split(',');
        		var i, n;
        		n = mCoords.length;

        		hdc.beginPath();
        		hdc.moveTo(mCoords[0], mCoords[1]);
        		for (i = 2; i < n; i += 2) {
        			hdc.lineTo(mCoords[i], mCoords[i + 1]);
        		}
        		hdc.lineTo(mCoords[0], mCoords[1]);
        		hdc.fillStyle = fillColor;
        		hdc.fill();
        		hdc.strokeColor = strokeColor;
        		hdc.stroke();
        	}
        	var drawRect = function(coordStr, hdc) {
        		var mCoords = coordStr.split(',');
        		var left = mCoords[0] - 0;
        		var top = mCoords[1] - 0;
        		var right = mCoords[2] - 0;
        		var bot = mCoords[3] - 0;
        		hdc.strokeRect(left, top, right - left, bot - top);
        		hdc.fillRect(left + 1, top + 1, right - left - 1, bot - top - 1);
        	}
        	var clearRect = function(canvas) {
        		var hdc = canvas.getContext('2d');
        		hdc.clearRect(0, 0, canvas.width, canvas.height);
        	}
        	var getAverageRGB = function(context, canvas, imgEl) {
        	    var blockSize = 5; // only visit every 5 pixels
        	    var defaultRGB = {r:0, g:0, b:0};
        	    var data, width, height,
        	        i = -4,
        	        length,
        	        rgb = {r:0,g:0,b:0},
        	        count = 0;

        	    if (!context) {
        	        return defaultRGB;
        	    }

        	    height = canvas.height = imgEl.naturalHeight || imgEl.offsetHeight || imgEl.height;
        	    width = canvas.width = imgEl.naturalWidth || imgEl.offsetWidth || imgEl.width;

        	    context.drawImage(imgEl, 0, 0);

        	    try {
        	        data = context.getImageData(0, 0, width, height);
        	    } catch(e) {
        	        /* security error, img on diff domain */
        	        return defaultRGB;
        	    } finally {
            		var hdc = canvas.getContext('2d');
        	    	hdc.clearRect(0, 0, width, height);
        	    }
        	    
        	    length = data.data.length;
        	    while ((i += blockSize * 4) < length) {
        	        var r = data.data[i];
        	        var g = data.data[i+1];
        	        var b = data.data[i+2];
        	        var a = data.data[i+3];
        	        // If pixel is mostly opaque and not white
        	        if (a >= 125) {
        	            if (!(r > 250 && g > 250 && b > 250)) {
                	        rgb.r += data.data[i];
                	        rgb.g += data.data[i+1];
                	        rgb.b += data.data[i+2];
                	        ++count;
        	            }
        	        }
        	    }
        	    
        	    // ~~ used to floor values
        	    rgb.r = ~~(rgb.r/count);
        	    rgb.g = ~~(rgb.g/count);
        	    rgb.b = ~~(rgb.b/count);
        	    
        	    return rgb;
        	}
        	var determineContrastColor = function(canvas, hdc, imgEl) {
				var rgb = getAverageRGB(hdc, canvas, imgEl);
            	var hsl = tinycolor(rgb).toHsl();
            	hsl.l *= 0.3;
            	var c1 = tinycolor(hsl).toRgbString();
            	hdc.strokeColor = c1;
            	hsl.a = 0.45;
            	var c2 = tinycolor(hsl).toRgbString();
            	hdc.fillStyle = c2;
        	}
        	
            // Will be fired when a user clicks on the element
            // It will set the answer
            scope.addAnswer = function(e) {
            	var id = attrs.identifier;
            	
            	var hdc = ctrl.hotspotscope.hdc;
            	var canvas = ctrl.hotspotscope.canvas;
            	
            	determineContrastColor(canvas, hdc, ctrl.hotspotscope.img);
				clearRect(canvas, hdc);

            	switch (attrs.shape) {
	            	case 'polygon':
	            	case 'poly':
	            		drawPoly(attrs.coords, hdc);
	            		break;
	            	case 'rect':
	            		drawRect(attrs.coords, hdc);
	            		break;
	           		default:
	           			console.log("Unknown shape: " + attrs.shape);
	            		break;
            	}

                if (scope.multiple) {
                    var indexOf = scope.local.answer.indexOf(id);
                    var selected = indexOf >= 0;

                    if (selected) {
                        clicked = true;
                        scope.local.answer.splice(indexOf, 1);
                    } else {
                        initialStart = false;
                        scope.local.answer.push(id);
                    }
                } else {
                    if (scope.local.answer === id) {
                        clicked = true;
                        scope.local.answer = null;
                    } else {
                        initialStart = false;
                        scope.local.answer = id;
                    }
                }

            	console.log("answer: " + scope.local.answer);
            }
        }		
	}
}]);

