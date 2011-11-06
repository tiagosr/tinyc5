/**
 * TinyC5
 * 
 * Version 0.5
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
Changelog

[list]
[li]Added project to google code. Make your checkout [url=https://code.google.com/p/tinyc5/]here[/url][/li]
[li]Replaced _alpha params property with bgColor property[/li]
[li]Separated utility functions to its own object TinyC5Utils. TinyC5 core does not depend on TinyC5Utils.[/li]
[li]Added TinyC5.color() method that created a simple property color object[/li]
[li]Added TinyC5.clearPixels() method for setting all pixels to a specified color.[/li]
[li]Added Jim's fantastic rubber duck demo to the official examples. Thanks Jim.[li]
[li]Added TinyC5.init() method which maps the constructor.[/li]
[li]Renamed examples.[/li]
[/list]

 * 
 *   * 
 */


// @todo Add params scaleQuality
// @todo Add setter for scaleQuality
// @todo Add getter for scaleQuality
// @todo Add title to params to set for window title
// @todo Remove stats from code. 
// @todo Add screenshot taking to Utils
// @todo Add public rendering engine property

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
 * @param args  Object  Can have the following properties
 */
function TinyC5( args ) {
    //////////////////////////////////////////////////////////////////////////////////////
    // Private variables
    //////////////////////////////////////////////////////////////////////////////////////

    var _canvas, _context, _params, _container, _buffer, _outputCanvas, _outputContext,
    _width, _height, _scale, _isRunning = false, _fullscreen = false, _startTime = 0, 
    _loopTimeout, _fps = 1000 / 60, _bgColor, _title;

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
            _loopTimeout = _requestAnimFrame( _loop, _fps );
        } else {
            _cancelRequestAnimFrame( _loopTimeout );
        }
    };

    //////////////////////////////////////////////////////////////////////////////////////
    // Browser depending methods fills
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
     * - IE
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
        _params     = args || {};
        _scale      = _params.scale || 1;
        _width      = _params.width || 320;
        _height     = _params.height || 200;
        _fullscreen = _params.fullscreen || false;
        _bgColor    = _params.bgColor || this.color( 0, 0, 0 );
        _container  = _params.container || document.getElementsByTagName( 'body' )[0];
        _title      = _params.title || 'TinyC5';

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

        // Update values of public
        this.WIDTH          = _width;
        this.HEIGHT         = _height;        

        // Create outupt canvas to document
        _outputCanvas = document.createElement( 'canvas' );                
        _outputCanvas.setAttribute( 'width', _width * _scale );
        _outputCanvas.setAttribute( 'height', _height * _scale );                
        _outputContext = _outputCanvas.getContext( '2d' );

        // Add output canvas to domtree
        _container.appendChild( _outputCanvas );

        // Set fullscreen
        this.setFullscreen( _fullscreen );
        
        // Set window title
        document.title = _title;
    }


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
        } else {
            _fullscreen = false;
            var body = document.getElementsByTagName( 'body' )[0];
            body.setAttribute( 'style', _origBodyCss );
            _outputCanvas.setAttribute( 'style', _origCanvasCss );
            _origBodyCss = '';
            _origCanvasCss = '';
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
    // Setting browser dependent code
    //////////////////////////////////////////////////////////////////////////////////////    
    
    // ClearPixels
    this.clearPixels = _clearPixelsFillRect; //_clearPixelsDefault;    
    
    //////////////////////////////////////////////////////////////////////////////////////
    // Set constants
    //////////////////////////////////////////////////////////////////////////////////////    
    
    this.WIDTH          = _width;
    this.HEIGHT         = _height;
    this.VERSION        = 0.5;
    
    //////////////////////////////////////////////////////////////////////////////////////
    // Finalize initialization
    //////////////////////////////////////////////////////////////////////////////////////        
    
    this.init( args );
};