
var TinyC5Utils = {
    
    /**
     * Gets imagedata from given image
     * 
     * @param image Image   Image object
     * @param filterAlphaValues boolean If set to true, the return value does not contain any alpha values
     * 
     * @return array
     */
    getImagedataFromImage: function( image, filterAlphaValues ) {
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
}