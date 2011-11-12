/**
 * TinyC5
 * 
 * Version 0.6
 * 
 * Small library to create pixel manipulation effects which run in the browser (canvas).
 * This library is inspired by such great libraries like tinyPTC/Pixeltoaster.
 * 
 * If you create something cool using this library or you have any questions, feedback 
 * don't hesitate to drop me a line at:
 * 
 * http://www.dbfinteractive.com/forum/index.php?topic=5397.0
 * 
 * benny!schuetz !n 2o11 
 *  
 * Disclaimer
 * THIS SOFTWARE IS PROVIDED "AS IS" AND ANY EXPRESSED OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, 
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. 
 * IN NO EVENT SHALL THE REGENTS OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, 
 * OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, 
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, 
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 */

//
// Polyfills:
// 
// - requestAnimFrame
// - cancelAnimFrame
//
// Refer to: http://notes.jetienne.com/2011/05/18/cancelRequestAnimFrame-for-paul-irish-requestAnimFrame.html
//

window.cancelRequestAnimFrame = ( function() {
    return window.cancelAnimationFrame              ||
        window.webkitCancelRequestAnimationFrame    ||
        window.mozCancelRequestAnimationFrame       ||
        window.oCancelRequestAnimationFrame         ||
        window.msCancelRequestAnimationFrame        ||
        clearTimeout
} )();


window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame   || 
        window.webkitRequestAnimationFrame || 
        window.mozRequestAnimationFrame    || 
        window.oRequestAnimationFrame      || 
        window.msRequestAnimationFrame     || 
        function(/* function */ callback, /* DOMElement */ element){
            return window.setTimeout(callback, 1000 / 60);
        };
})();

/**
 * Constructor
 * 
 * @param args  Object  Can have the following properties:
 *                      width           integer     PixelBuffer width (Default 320)
 *                      height          integer     PixelBuffer height (Default 200)
 *                      scale           integer     Scalefactor (Default 1)
 *                      fullscreen      boolean     Fullscreen mode (Default false)
 *                      bgColor         object      Background color (Default is { r: 0, g: 0, b: 0, a: 255 }
 *                      container       HTML elem   HTML container for the canvas. (Default body)
 *                      title           string      Document's title (Default 'TinyC5')
 *                      smoothing       boolean     false (default) optimize for speed, true: optimize for quality
 *                      captureMouse    boolean     false (default) mouse capturing is off, true: mouse capturing is on               
 */
function TinyC5( args ) {
    //////////////////////////////////////////////////////////////////////////////////////
    // Private variables
    //////////////////////////////////////////////////////////////////////////////////////

    var _canvas, _context, _params, _container, _buffer, _outputCanvas, _outputContext,
    _width, _height, _scaleX, _scaleY, _isRunning = false, _fullscreen = false, _startTime = 0, 
    _loopTimeout, _fps = 1000 / 60, _bgColor, _title, _smoothing = false, _captureMouse = false;

    // CSS styles variables for fullscreen mode
    var _fullscreenBodyCss, _origBodyCss, _fullscreenCanvasCss, _origCanvasCss;
    _fullscreenBodyCss      = 'margin: 0px;padding: 0px;border:none;height: 100%;width: 100%;';
    _origBodyCss            = '';
    _fullscreenCanvasCss    = 'margin: 0px;padding: 0px;border:none;height: 100%;width: 100%;';
    _fullscreenCanvasCss   += 'position: fixed;left: 0px;top: 0px;right: 0px;bottom: 0px;z-index:10000;';
    _origCanvasCss          = '';
    
    // Local reference
    var self = this;      

    //////////////////////////////////////////////////////////////////////////////////////
    // Member variables/properties
    //////////////////////////////////////////////////////////////////////////////////////

    this.pixels = null;
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseClick = false;

    //////////////////////////////////////////////////////////////////////////////////////
    // Private methods
    //////////////////////////////////////////////////////////////////////////////////////
    
    // Make local references for faster access
    var _requestAnimFrame = requestAnimFrame;
    var _cancelRequestAnimFrame = cancelRequestAnimFrame;
    
    var _render = function() {
        _context.putImageData( _buffer, 0, 0 );
        _outputContext.drawImage( _canvas, 0, 0, _outputCanvas.width, _outputCanvas.height );
    };

    var _loop = function() {
        if ( _isRunning ) {
            self.update();
            _render();
            self.postUpdate();
            self.mouseClick = false;
            _loopTimeout = _requestAnimFrame( _loop, _fps );
        } else {
            _cancelRequestAnimFrame( _loopTimeout );
        }
    };
    
    var _detectBrowserEngine = function() {
        // RegEx for browser engine
	var rwebkit = /(webkit)[ \/]([\w.]+)/,
        ropera = /(opera)(?:.*version)?[ \/]([\w.]+)/,
	rmsie = /(msie) ([\w.]+)/,
	rmozilla = /(mozilla)(?:.*? rv:([\w.]+))?/;
                
        var ua = window.navigator.userAgent.toLowerCase();

        var match = rwebkit.exec( ua ) ||
                ropera.exec( ua ) ||
                rmsie.exec( ua ) ||
                ua.indexOf("compatible") < 0 && rmozilla.exec( ua ) ||
                [];
            
        // Map browser engine to TinyC5 constants
        switch( match[1] ) {
            case 'mozilla':
                self.BROWSER_ENGINE = self.BROWSER_ENGINE_MOZILLA;
                break;
            case 'msie':
                self.BROWSER_ENGINE = self.BROWSER_ENGINE_MSIE;
                break;
            case 'webkit':
            case 'safari':
                self.BROWSER_ENGINE = self.BROWSER_ENGINE_WEBKIT;
                break;
            case 'opera':
                self.BROWSER_ENGINE = self.BROWSER_ENGINE_OPERA;
                break;
            default:
                self.BROWSER_ENGINE = self.BROWSER_ENGINE_UNKNOWN;
                break;
        }
    }
    
    var _updateScaleValues = function() {
        _scaleX = window.innerWidth /_width;        
        _scaleY = window.innerHeight / _height;
        
        this.VIEW_WIDTH     = Math.floor( _width * _scaleX );
        this.VIEW_HEIGHT    = Math.floor( _height * _scaleY );
    }
    

    //////////////////////////////////////////////////////////////////////////////////////
    // Browser depending method fills
    //////////////////////////////////////////////////////////////////////////////////////

    /**
     * Default version of TinyC5.clearPixels()
     * 
     * @param bgColor   Utils.Color     Background color
     * 
     * @return array    Cleared pixels array
     */
    var _clearPixelsDefault = function( color ) {
        // Loop over every pixel and set it to background color
        var pixels = this.pixels;
        var l = this.pixels.length/4;
        var i = 0;
        var bgColor = color || _bgColor;
        while (l--)
        {
            pixels[i++] = bgColor.r;
            pixels[i++] = bgColor.g;
            pixels[i++] = bgColor.b;
            pixels[i++] = bgColor.a;
        }
        
        return this.pixels;
    }

    /**
     * TinyC5.clearPixels() version using FillRect to clear canvas.
     * 
     * Currently used for:
     * - MSIE
     * 
     * @param bgColor   Utils.Color     Background color
     * 
     * @return array    Cleared pixels array
     */
    var _clearPixelsFillRect = function( color ) {
        // Use fillrect
        // Note: No need to set fillcolor since it is already set during initialization
        _context.fillRect( 0, 0, _width, _height );
        _buffer = _context.getImageData( 0, 0, _width, _height );        
        this.pixels = _buffer.data;
        
        return this.pixels;
    }

    //////////////////////////////////////////////////////////////////////////////////////
    // Public methods
    //////////////////////////////////////////////////////////////////////////////////////

    /**
     * Inits
     * 
     * @param args  Object  Can have the following properties
     */
    this.init = function( args ) {
        // If an old _outputCanvas exists
        if ( _container && _outputCanvas ) {
            // Remove it
            _container.removeChild( _outputCanvas );
        }
        
        // Setting params
        _params         = args || {};
        _scaleX         = _params.scale || 1;
        _scaleY         = _params.scale || 1;
        _width          = _params.width || 320;
        _height         = _params.height || 200;
        _fullscreen     = !_params.fullscreen || false;
        _bgColor        = _params.bgColor || this.color( 0, 0, 0 );
        _container      = _params.container || document.getElementsByTagName( 'body' )[0];
        _title          = _params.title || 'TinyC5';
        _smoothing      = !_params.smoothing || false;
        _captureMouse   = !_params.captureMouse || false;

        // Setting up canvas
        _canvas     = document.createElement( 'canvas' );
        _canvas.setAttribute( 'width', _width );
        _canvas.setAttribute( 'height', _height );
        _context    = _canvas.getContext( '2d' );
        _context.fillStyle = "rgba(" + _bgColor.r + "," + _bgColor.g + "," + _bgColor.b + "," + _bgColor.a +")";
        _buffer     = _context.createImageData( _width, _height );    

        // Set pixels to default background color
        var i = 0, l = _buffer.data.length;
        while (l--)
        {
            _buffer.data[i++] = _bgColor.r;
            _buffer.data[i++] = _bgColor.g;
            _buffer.data[i++] = _bgColor.b;
            _buffer.data[i++] = _bgColor.a;
        }

        // Reference buffer.data to pixels property
        this.pixels = _buffer.data;

        // Update values of constants
        this.WIDTH          = _width;
        this.HEIGHT         = _height;
        this.VIEW_WIDTH     = _width * _scaleX;
        this.VIEW_HEIGHT    = _height * _scaleY;

        // Create outupt canvas to document
        _outputCanvas = document.createElement( 'canvas' );                
        _outputCanvas.setAttribute( 'width', _width * _scaleX );
        _outputCanvas.setAttribute( 'height', _height * _scaleY );                
        _outputContext = _outputCanvas.getContext( '2d' );

        // Add output canvas to domtree
        _container.appendChild( _outputCanvas );

        // Set smoothing
        this.setSmoothing( _params.smoothing );
        
        // Set mouse capturing
        this.setCaptureMouse( _params.captureMouse );

        // Set fullscreen
        this.setFullscreen( _params.fullscreen );

        // Set window title
        document.title = _title;                
    }

    /**
     * Start the update/render loop
     * 
     * @return void
     */
    this.start = function() {
        _isRunning = true;
        _startTime = Date.now();
        _loop();
    }

    /**
     * Stop the update/render loop
     * 
     * @return void
     */
    this.stop = function() {
        _isRunning = false;
    }
    
    /**
     * Window onResize handler. Only called if application is in fullscreen mode.
     * 
     * @param e Event
     * 
     * @return void
     */
    this.onResize = function(e) {
        _updateScaleValues();
    }
    
    /**
     * Enable/disable fullscreen mode
     * 
     * @param fullscreen    boolean     true = Fullscreen, else normal mode
     * 
     * @return void
     */
    this.setFullscreen = function( fullscreen ) {
        if ( fullscreen == _fullscreen ) {
            return;
        }
        if ( fullscreen ) {
            _fullscreen = true;
            var body = document.getElementsByTagName( 'body' )[0];
            _origBodyCss = body.getAttribute( 'style' );
            _origCanvasCss = _outputCanvas.getAttribute( 'style' );
            body.setAttribute( 'style', _fullscreenBodyCss );
            _outputCanvas.setAttribute( 'style', _fullscreenCanvasCss );
            _updateScaleValues();
            window.addEventListener( 'resize', this.onResize, false );
        } else {
            window.removeEventListener( 'resize', this.onResize, false );
            _fullscreen = false;
            var body = document.getElementsByTagName( 'body' )[0];
            body.setAttribute( 'style', _origBodyCss );
            _outputCanvas.setAttribute( 'style', _origCanvasCss );
            _origBodyCss = '';
            _origCanvasCss = '';
            _scaleX = Math.floor( _outputCanvas.getAttribute( 'width' )/ _width );
            _scaleY = Math.floor( _outputCanvas.getAttribute( 'height' )/ _height );            
        }
    }
    
    /**
     * Returns fullscreen state
     * 
     * @return boolean  true, if TinyC5 is shown in fullscreen mode
     *                  else false
     */
    this.isFullscreen = function() {
        return _fullscreen;
    }
    
    /**
     * Sets smoothing for image rendering
     * 
     * Note:
     * Currently this feature is not supported by most browsers when it comes
     * to canvas rendering.
     * 
     * @param smoothing     boolean     true, optimize for quality, else optimize for speed (default)
     * 
     * @return void
     */
    this.setSmoothing = function( smoothing ) {        
        if ( smoothing == _smoothing ) return;
        _smoothing = smoothing;
        var style = _outputCanvas.style;
        
        // Optimize for quality
        if ( _smoothing ) {
            if ( _outputContext.mozImageSmoothingEnabled )  _outputContext.mozImageSmoothingEnabled = true;
            style.setProperty("image-rendering", "optimizeQuality", "important");
            style.setProperty("-ms-interpolation-mode", "bicubic", "important");
        } else {
            // Optimize for speed
            if ( _outputContext.mozImageSmoothingEnabled )  _outputContext.mozImageSmoothingEnabled = false;
            style.setProperty("image-rendering", "optimizeSpeed", "important");
            style.setProperty("image-rendering", "-moz-crisp-edges", "important");
            style.setProperty("image-rendering", "-webkit-optimize-contrast", "important");
            style.setProperty("image-rendering", "optimize-contrast", "important");
            style.setProperty("-ms-interpolation-mode", "nearest-neighbor", "important");        
        }
    }
    
    /**
     * Returns smoothing state
     * 
     * @return boolean  true, smoothing is on (optimize for quality),
     *                  false, smoothing is off (optimize for speed),
     */
    this.isSmoothing = function() {
        return _smoothing;
    }
    
    /**
     * Event listener for mouse movement
     * 
     * @param e     Event
     * 
     * @return void
     */
    this.onMouseMove = function( e ) {
        var t = e.target, w = self.VIEW_WIDTH, h = self.VIEW_HEIGHT, mx = 0, my = 0;
        mx = e.pageX - t.offsetLeft - t.clientLeft;
        my = e.pageY - t.offsetTop - t.clientTop;
        mx = ~~(mx/_scaleX);
        my = ~~(my/_scaleY);

        // MinMax mouseX
        mx = w ^ ((mx ^ w) & -(mx < w)); 
        mx = 0 ^ ((0 ^ mx) & -(0 < mx)); 

        // MinMax mouseY
        my = h ^ ((my ^ h) & -(my < h)); 
        my = 0 ^ ((0 ^ my) & -(0 < my)); 

        // Update properties
        self.mouseX = mx;
        self.mouseY = my;        
    }    
    
    /**
     * Event handler for click event
     * 
     * @param e     Event
     * 
     * @return void
     */
    this.onMouseClick = function ( e ) {
        self.mouseClick = true;
    }
    
    /**
     * Set capture mouse state
     * 
     * @param captureMouse  boolean     true, activate mouse capturing, false deactivate
     * 
     * @return void
     */
    this.setCaptureMouse = function( captureMouse ) {
        if ( captureMouse == _captureMouse ) return;
        _captureMouse = captureMouse;
        if ( _captureMouse ) {
            _outputCanvas.addEventListener( 'mousemove', self.onMouseMove, false );
            _outputCanvas.addEventListener( 'click', self.onMouseClick, false );
        } else {
            _outputCanvas.removeEventListener( 'mousemove', self.onMouseMove, false );
            _outputCanvas.removeEventListener( 'click', self.onMouseClick, false );
        }
    }
    
    /**
     * Getter for capture mouse state
     * 
     * @return boolean  true, if mouse capturing is on, else false
     */
    this.isCaptureMouse = function() {
        return _captureMouse;
    }
    
    /**
     * Getter for canvas
     * 
     * @return Canvas DOM element
     */
    this.getCanvas = function() {
        return _outputCanvas;
    }
    
    /**
     * Returns elapsed time in milliseconds since the application TinyC5.start was called.
     * 
     * @return Integer
     */
    this.getTime = function() {
        return Date.now() - _startTime;
    }
    
    /**
     * Creates a color object
     * 
     * @param red   integer     Red value (0-255)
     * @param blue  integer     Blue value (0-255)
     * @param green integer     green value (0-255)
     * @param alpha integer     (optional) Alpha value (0-255). Default is 255.
     * 
     * @return Object   { r: redValue,
     *                    g: greenValue,
     *                    b: blueValue,
     *                    a: alphaValue }
     */
    this.color = function( red, green, blue, alpha ) {
        if ( alpha ) {
            return {r: red, g: green, b: blue, a:alpha};
        } else {
            return {r: red, g: green, b: blue, a: 255};
        }
    }
    
    /**
     * Copies given array of pixel data to internal pixel data
     * 
     * Note: 
     * Use this function instead of assigning arrays of pixels to TinyC5.pixels within your main program. The pixeldata
     * attribute varies from browser to browser and is not standarized yet. 
     * 
     * @param   pixels  Array   [ RED, GREEN, BLUE, ALPHA, ... ]
     * 
     * @return boolean  Return false, if copying is not possible, else true
     */
    this.copyPixels = function( pixels ) {
        if ( this.pixels.length != pixels.length ) {
            return false;
        }
        
        // Copy pixel by pixel
        // @todo Optimize this browser dependant, e.g. Firefox seems to allow direct assigning
        var len = pixels.length, i=0;
        while(len--) {
            this.pixels[i] = pixels[i++];
        }
        
        return true;
    }
    
    //////////////////////////////////////////////////////////////////////////////////////
    // Interface methods - intended to be overwritten
    //////////////////////////////////////////////////////////////////////////////////////
    
    /**
     * Update method
     * This method is intended to be overwritten
     * 
     * @return void
     */
    this.update = function() {        
        // overwrite this function with your own stunning effect
        // manipulate the TinyC5.pixels property
    }
    
    /**
     * Post update method is called after the pixels array is rendered.
     * Overwrite this method if you want perform any post processing/draw actions
     * on top of the pixels.
     * 
     * @return void
     */
    this.postUpdate = function() {
        // Overwrite if you like
    }

    //////////////////////////////////////////////////////////////////////////////////////
    // Detect browser engine
    //////////////////////////////////////////////////////////////////////////////////////    

    // Possible values for BROWSER_ENGINE constant
    this.BROWSER_ENGINE_MSIE    = 'msie';
    this.BROWSER_ENGINE_WEBKIT  = 'webkit';
    this.BROWSER_ENGINE_SAFARI  = 'safari';
    this.BROWSER_ENGINE_OPERA   = 'opera';
    this.BROWSER_ENGINE_MOZILLA = 'mozilla';
    this.BROWSER_ENGINE_UNKNOWN = 'unknown';        

    this.BROWSER_ENGINE = this.BROWSER_ENGINE_UNKNOWN;
    
    _detectBrowserEngine();   
    
    //////////////////////////////////////////////////////////////////////////////////////
    // Setting browser dependent code
    //////////////////////////////////////////////////////////////////////////////////////    
    
    // ClearPixels
    this.clearPixels = ( this.BROWSER_ENGINE === this.BROWSER_ENGINE_MSIE ) ? _clearPixelsFillRect : _clearPixelsDefault;
    
    //////////////////////////////////////////////////////////////////////////////////////
    // Set constants
    //////////////////////////////////////////////////////////////////////////////////////    
    
    this.VERSION        = 0.6;
    
    //////////////////////////////////////////////////////////////////////////////////////
    // Finalize initialization
    //////////////////////////////////////////////////////////////////////////////////////        
    
    this.init( args );    
};