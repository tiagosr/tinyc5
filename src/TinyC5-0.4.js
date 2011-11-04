/**
 * TinyC5
 * 
 * Version 0.4
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
 * @param args  Object  Can have the following properties
 * 
 */
function TinyC5( args ) {
    //////////////////////////////////////////////////////////////////////////////////////
    // Private variables
    //////////////////////////////////////////////////////////////////////////////////////

    var _canvas, _context, _params, _container, _buffer, _outputCanvas, _outputContext,
    _width, _height, _scale, _debug, _isRunning = false, _fullscreen = false,
    _startTime = 0, _loopTimeout, _fps = 1000 / 60, _alpha = 255;

    // FPS Stats
    var _time = Date.now(), _timeLastFrame = _time, _timeLastSecond = _time,
    _statsFps = 0, _frames = 0, _timeDelta = 0;
    
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

    var _stats = function() {
        _time = Date.now();
        _timeDelta = _time - _timeLastFrame;
        _timeLastFrame = _time;

        _frames++;

        if ( _time > _timeLastSecond + 1000 ) {
            _statsFps = Math.round( ( _frames * 1000 ) / ( _time - _timeLastSecond ) );
            _timeLastSecond = _time;
            _frames = 0;
            // @todo Outputting via console is pretty lame and slow
            if ( _debug ) console.log( _statsFps + ' FPS' );
        }
    }

    var _loop = function() {
        _stats();
        if ( _isRunning ) {
            self.update();
            _render();
            _loopTimeout = _requestAnimFrame( _loop, _fps );
        } else {
            _cancelRequestAnimFrame( _loopTimeout );
        }
    };
    
    //////////////////////////////////////////////////////////////////////////////////////
    // Public methods
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
        while( i < len ) {
            this.pixels[i] = pixels[i++];
        }
        
        return true;
    }
    
    //////////////////////////////////////////////////////////////////////////////////////
    // Utils
    //////////////////////////////////////////////////////////////////////////////////////
    
    // Declare namespace
    this.Utils = {};
    
    /**
     * Gets imagedata from given image
     * 
     * @param image Image   Image object
     * @param filterAlphaValues boolean If set to true, the return value does not contain any alpha values
     * 
     * @return array
     */
    this.Utils.getImagedataFromImage = function( image, filterAlphaValues ) {
        // Declare vars & params
        var imgData = null;
        var filterAlphaValues = filterAlphaValues || false;
        
        // If image is invalid
        if ( !image || !image.width || !image.height ) {
            // Return null
            return imgData;
        } else {
            // Create canvas to draw image on to get its data
            var imgCanvas = document.createElement( 'canvas' );
            imgCanvas.setAttribute( 'width', image.width );
            imgCanvas.setAttribute( 'height', image.height );
            imgCanvas.getContext( '2d' ).drawImage(image, 0, 0);
            imgData = imgCanvas.getContext( '2d' ).getImageData(0, 0, image.width, image.height).data;
            delete imgCanvas;
            
            // If we should filter out alpha
            if ( filterAlphaValues ) {
                var rgbOnly = [];
                var rgbCnt = 0;
                // Filter out alphas
                for( var i=0; i < imgData.length; i++ ){
                    if ( 0 != ((i+1) % 4) ) {
                        rgbOnly[rgbCnt] = imgData[i];
                        rgbCnt++;
                    }
                }
                imgData = rgbOnly;
            }
        }
        
        return imgData;
    }
        
    //////////////////////////////////////////////////////////////////////////////////////
    // Setup
    //////////////////////////////////////////////////////////////////////////////////////
   
    // Setting params
    _params     = args || {};
    _scale      = _params.scale || 1;
    _width      = _params.width || 320;
    _height     = _params.height || 200;
    _alpha      = _params.alpha || 255;
    _fullscreen = _params.fullscreen || false;
    _debug      = _params.debug || false;
    _container  = _params.container || document.getElementsByTagName( 'body' )[0];

    // Setting up canvas
    _canvas     = document.createElement( 'canvas' );
    _canvas.setAttribute( 'width', _width );
    _canvas.setAttribute( 'height', _height );
    _context    = _canvas.getContext( '2d' );  
    _buffer     = _context.createImageData( _width, _height );
    
    // Preset alpha value
    for( var i = 3; i < _buffer.data.length; i += 4 ){
        _buffer.data[i] = _alpha;
    }
    
    // Reference buffer.data to pixels property
    this.pixels = _buffer.data;    
    
    // Create outupt canvas to document
    _outputCanvas = document.createElement( 'canvas' );                
    _outputCanvas.setAttribute( 'width', _width * _scale );
    _outputCanvas.setAttribute( 'height', _height * _scale );                
    _outputContext = _outputCanvas.getContext( '2d' );
        
    //////////////////////////////////////////////////////////////////////////////////////
    // Set constants
    //////////////////////////////////////////////////////////////////////////////////////    
    
    this.WIDTH          = _width;
    this.HEIGHT         = _height;
    this.VERSION        = 0.4;
    
    //////////////////////////////////////////////////////////////////////////////////////
    // Finalize initialization
    //////////////////////////////////////////////////////////////////////////////////////    
    
    // Set fullscreen
    this.setFullscreen( _fullscreen );
    
    // Add output canvas to domtree
    _container.appendChild( _outputCanvas );
};