function Triangulate(options) {
    if (typeof options === 'undefined') options = {};

    function getDefault(_option, _default) {
        return (typeof _option !== 'undefined') ? _option : _default;
    }

    this.options = {
        format: getDefault(options.format, 'svg'),
        numSteps: getDefault(options.numSteps, 10)
    };
}

if (typeof module !== 'undefined' && module.exports)
{
    d3 = require("d3");

    XMLSerializer = require("xmldom").XMLSerializer;

    module.exports = Triangulate;
}

Triangulate.Result = function(options, width, height) {
    /* Options */
    this.options = options;
    this.width = width;
    this.height = height;
    this.imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // x    var serializer = new XMLSerializer();
    // this.svgString = serializer.serializeToString(this.svg);

    /* Objects & Calls */
    this.triangles = this.generateTriangles();
    this.colors = this.generateColors();
    this.Paint();
    this.svg = this.generateSVG();
};

Triangulate.prototype.generate = function(width, height, imageData) {
    return new Triangulate.Result(this.options, width, height, imageData);
};

Triangulate.Result.prototype.getPoints = function() {
    var points = [];
    var i = this.width * this.height;
    while (--i >= 0) {
        points[i] = new jsfeat.point2d_t(0, 0, 0, 0);
    }
    var img_u8 = new jsfeat.matrix_t(this.width, this.height, jsfeat.U8_t | jsfeat.C1_t);

    /* jsfeat processing */
    jsfeat.imgproc.grayscale(this.imageData.data, img_u8.data);
    jsfeat.imgproc.box_blur_gray(img_u8, img_u8, 2, 0);
    jsfeat.yape06.laplacian_threshold = option_selectors.laplace_thresh|0;
    jsfeat.yape06.min_eigen_value_threshold = option_selectors.eigen_thresh|0;
    var numPoints = jsfeat.yape06.detect(img_u8, points);
    var data_u32 = new Uint32Array(this.imageData.data.buffer);

    /* Process Points */
    // Convert points into jsfeat-acceptable input and remove random points
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    var delaunay_points = [];
    for (var j = 0; j < numPoints; ++j) {
        if (getRandomInt(0, 1000) > 500) continue;
        delaunay_points.push( [points[j].x, points[j].y] );
    }

    // Add random corners
    var numSteps = option_selectors.num_steps|0;
    var width_step = this.width/numSteps;
    var height_step = this.height/numSteps;
    var avgStep = (width_step + height_step)/2;
    var deviation = option_selectors.deviation|0;
    var delta = 0;
    for (var width = 0; width < this.width; width = width + width_step ) {
        do { delta = getRandomInt(-deviation/2, deviation/2) + width } while(delta < 0 || delta >= this.width);
        delaunay_points.push( [delta, 0] );
        delaunay_points.push( [delta, this.height-1] );
    }
    for (var height = 0; height < this.height; height = height + height_step) {
        do { delta = getRandomInt(-deviation/2, deviation/2) + height } while(delta < 0 || delta >= this.height);
        delaunay_points.push( [0, delta] );
        delaunay_points.push( [this.width-1, delta] );
    }
    delaunay_points.push( [0, 0] );
    delaunay_points.push( [this.width, 0] );
    delaunay_points.push( [0, this.height] );
    delaunay_points.push( [this.width, this.height] );

    // Add random point noise
    var x = -1;
    var y = -1;
    for (i = 0; i < this.width; i = i + avgStep) {
        for (j = 0; j < this.height; j = j + avgStep) {
            do { x = getRandomInt(-deviation, deviation) + i } while(x < 0 || x >= this.width);
            do { y = getRandomInt(-deviation, deviation) + j } while(y < 0 || y >= this.height);
            // console.log(x, y);
            delaunay_points.push( [x, y] );
        }
    }
    /*
    function render_points(corners, count, img, step) {
        var pix = (0xff << 24) | (0x00 << 16) | (0xff << 8) | 0x00;
        for(var i=0; i < count; ++i)
        {
            var x = corners[i].x;
            var y = corners[i].y;
            var off = (x + y * step);
            img[off] = pix;
            img[off-1] = pix;
            img[off+1] = pix;
            img[off-step] = pix;
            img[off+step] = pix;
        }
    }
    // Display points of interest on context
    render_points(points, numPoints, data_u32, this.width);
    */

    context.putImageData(this.imageData, 0, 0);

    return delaunay_points;
};

Triangulate.Result.prototype.generateTriangles = function() {
    var points = this.getPoints();
    return d3.geom.delaunay(points);
};

Triangulate.Result.prototype.generateColors = function() {
    // Generates a random point inside a given triangle
    var genPoint = function(x, y, z) {
        var a, b;
        var rand1 = Math.random();
        var rand2 = Math.random();
        a = (1 - Math.sqrt(rand1)) * x[0]
            + (Math.sqrt(rand1) * (1 - rand2)) * y[0]
            + (Math.sqrt(rand1) * rand2) * z[0];
        b = (1 - Math.sqrt(rand1)) * x[1]
            + (Math.sqrt(rand1) * (1 - rand2)) * y[1]
            + (Math.sqrt(rand1) * rand2) * z[1];
        return [Math.round(a), Math.round(b)];
    };

    var triangles = this.triangles;
    var colors = [];
    var colorData;
    var x, y, z, point;
    var r, g, b;
    var sample_points = option_selectors.num_color_sample_points|0;

    triangles.forEach(function(element, index, array) {
        x = element[0];
        y = element[1];
        z = element[2];
        r = 0;
        g = 0;
        b = 0;
        for (var i = 0; i < sample_points; ++i) {
            point = genPoint(x, y, z);
            colorData = context.getImageData(point[0], point[1], 1, 1).data;
            r += colorData[0];
            g += colorData[1];
            b += colorData[2];
        }
        colors.push([Math.round(r/sample_points),
                     Math.round(g/sample_points),
                     Math.round(b/sample_points)]);
    });

    return colors;
};

Triangulate.Result.prototype.Paint = function() {
    var color, colorString;
    var colors = this.colors;
    this.triangles.forEach(function(element, index, array) {
        color = colors[index];
        colorString = "rgb("+String(color[0])+ "," + String(color[1]) + "," + String(color[2]) + ")";

        context.strokeStyle = colorString;
        context.fillStyle = colorString;
        context.beginPath();
        context.moveTo(element[0][0], element[0][1]);
        context.lineTo(element[1][0], element[1][1]);
        context.lineTo(element[2][0], element[2][1]);
        context.closePath();
        context.fill();
    });
};

Triangulate.Result.prototype.generateSVG = function() {

};